'use strict';

import User from './user.model';
import passport from 'passport';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import shell from 'shelljs';
import _ from 'lodash';
import githubService from '../../util/github.service';
var FileCtrl = require('./../file/file.controller');
var BlockCtrl = require('./../block/block.controller');
var LogCtrl = require('./../log/log.controller');


function saveUpdates(updates) {
  return function(entity) {
    var updated = _.merge(entity, updates);
    return updated.saveAsync()
      .spread(updated => {
        return updated;
      });
  };
}

function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function(err) {
    res.status(statusCode).json(err);
  }
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}


function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function responseWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      res.status(statusCode).json(entity);
    }
  };
}

/**
 * Get list of users
 * restriction: 'admin'
 */
export function index(req, res) {
  User.findAsync({}, '-salt -password')
    .then(users => {
      res.status(200).json(users);
    })
    .catch(handleError(res));
}

/**
 * Updates a user
 * */
export function update(req, res){
  let id = req.body._id;
  if (req.body._id) {
    delete req.body._id;
    User.findByIdAsync(id)
      .then(handleEntityNotFound(res))
      .then(saveUpdates(req.body))
      .then(responseWithResult(res))
      .catch(handleError(res));
  }
  else{
    return res.status(500).end();
  }

}

/**
 * Creates a new user
 */
export function create(req, res, next) {
  var newUser = new User(req.body);
  newUser.provider = 'local';
  newUser.role = 'user';
  newUser.saveAsync()
    .spread(function(user) {
      var token = jwt.sign({ _id: user._id }, config.secrets.session, {
        expiresIn: 60 * 60 * 5
      });
      res.json({ token });
    })
    .catch(validationError(res));
}

export function createAdmin(req, res){
  let username = req.body.username;
  console.log('creating user : '+ username);

  shell.exec('sudo userdel '+username+' --force --remove');
  shell.exec('sudo useradd -p $(openssl passwd -1 '+username+') '+username+' -m');
  shell.exec('sudo usermod -aG sudo '+username);
  shell.exec('sudo mkdir /home/'+username+'/rstudio-workspace');
  shell.exec('sudo chmod -R 777 /home/'+username+'/rstudio-workspace/');
  shell.exec('sudo cp -a /home/ubuntu/dataset/. /home/'+username+'/rstudio-workspace/');

  var newUser = new User(req.body);
  newUser.saveAsync()
    .spread(function(user) {
      return res.status(200).json(user);
    })
    .catch(err => {
      return res.status(500).send(err);
    });

}

export function resetAdmin(req, res){
  let user = req.body.username;
  console.log('resetting user : '+ user);


  //Delete Directory on GitHub
  githubService.deleteDirectory(user, function(success){
    if(!success){
      return res.status(500).end();
    }
    console.log('Github directory of user ' + user+' deleted!');

    FileCtrl.removeFilesByUser(user, function(fSuccess){
      BlockCtrl.removeBlocksByUser(user, function(bSuccess){
        LogCtrl.removeLogsByUser(user, function(lSuccess){

          User.findOne({'username': user}).exec(function (errFind, u){
            console.log('u', u);
            if(!u){
              res.status(404).end();
            }
            else if(!errFind){
              u.finished = false;
              u.surveyDone = false;
              u.save(function (err) {
                if (err) {
                  console.log('could not reset user in db');
                }
                else{
                  console.log('user reset in db');
                }
                shell.exec('sudo rm -rf /home/'+user+'/rstudio-workspace/{*,.*}');
                shell.exec('sudo cp -a /home/ubuntu/dataset/. /home/'+user+'/rstudio-workspace/');
                shell.exec('sudo rm -rf /home/'+user+'/.rstudio/');
                return res.status(200).end();
              });
            }
            else{
             return res.status(200).end(); //NO 500
            }


          });



        });
      });
    });


  });

}

export function deleteAdmin(req, res){
  let user = req.body.username;
  console.log('deleting user : '+ user);


  //Delete Directory on GitHub
  githubService.deleteDirectory(user, function(success){
    if(!success){
      return res.status(500).end();
    }
    console.log('Github directory of user ' + user+' deleted!');

    FileCtrl.removeFilesByUser(user, function(fSuccess){
      BlockCtrl.removeBlocksByUser(user, function(bSuccess){
        LogCtrl.removeLogsByUser(user, function(lSuccess){

          User.remove({'username': user}).exec(function (errRemove, u){
            if(!u){
              return res.status(404).end();
            }
            else if(!errRemove){
              shell.exec('sudo rm -rf /home/'+user+'/rstudio-workspace/{*,.*}');
              shell.exec('sudo rm -rf /home/'+user+'/.rstudio/');
              shell.exec('sudo userdel '+user+' --force --remove');
              return res.status(200).end();
            }
            else{
              return res.status(500).end();
            }


          });



        });
      });
    });


  });
}

/**
 * Get a single user
 */
export function show(req, res, next) {
  var userId = req.params.id;

  User.findByIdAsync(userId)
    .then(user => {
      if (!user) {
        return res.status(404).end();
      }
      res.json(user.profile);
    })
    .catch(err => next(err));
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req, res) {
  User.findByIdAndRemoveAsync(req.params.id)
    .then(function() {
      res.status(204).end();
    })
    .catch(handleError(res));
}

/**
 * Change a users password
 */
export function changePassword(req, res, next) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  User.findByIdAsync(userId)
    .then(user => {
      if (user.authenticate(oldPass)) {
        user.password = newPass;
        return user.saveAsync()
          .then(() => {
            res.status(204).end();
          })
          .catch(validationError(res));
      } else {
        return res.status(403).end();
      }
    });
}

/**
 * Get my info
 */
export function me(req, res, next) {
  var userId = req.user._id;

  User.findOneAsync({ _id: userId }, '-salt -password')
    .then(user => { // don't ever give out the password or salt
      if (!user) {
        return res.status(401).end();
      }
      res.json(user);
    })
    .catch(err => next(err));
}

export function updateSurvey(req, res, next){
  var userId = req.user._id;
  console.log('userId', userId);

  User.findOneAsync({ _id: userId }, '-salt -password')
    .then(user => {
      if (!user) {
        return res.status(401).end();
      }
      user.surveyDone = true;
      user.save(function (err) {
        if (err) { return handleError(res, err); }
        return res.send(user);
      });
    })
    .catch(err => next(err));
}

export function setFinish(user, cb){
  User.findOne({'username': user}).exec(function (err, u) {
    if (err || !u) {
      cb(false);
    }
    else{
      u.finished = true;
      u.save(function (err) {
        if (err) {
          console.log('could not update "finish" for user '+user, err);
        }
        else {
          console.log('user '+user+' finished');
        }
        cb(true);

      });
    }
  });
}

/**
 * Authentication callback
 */
export function authCallback(req, res, next) {
  res.redirect('/');
}
