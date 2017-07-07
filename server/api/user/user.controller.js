'use strict';

import User from './user.model';
import passport from 'passport';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import shell from 'shelljs';
import _ from 'lodash';
import githubService from '../../util/github.service';
var FileCtrl = require('./../file/file.controller');
var Block = require('./../block/block.model');
var BlockCtrl = require('./../block/block.controller');
var LogCtrl = require('./../log/log.controller');
var fs = require('fs');
var csv = require('csv-express');


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
    console.log('ERROR', err);
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

export function indexAdmin(req, res) {
  User.find({}, '-salt -password')
    .then(users => {
      let users2 = [];

      var onComplete = function() {
        return res.status(200).json(users2);
      };

      var tasksToGo = users.length;
        users.forEach(function(i) {
            let userObject = i.toObject();
            getLastLogDate(userObject.username, function(history){
              userObject.history = history;
              users2.push(userObject);
                if (--tasksToGo === 0) {
                  // No tasks left, good to go
                  onComplete();
                }
            });
        });

    })
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
  shell.exec('sudo chown '+username+' /home/'+username+'/rstudio-workspace');

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
            if(!u){
              res.status(404).end();
            }
            else if(!errFind){
              u.finished = false;
              u.surveyDone = false;
              u.step = 1;
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
 * Set "finished" of user
 */
export function setFinished(req, res, next) {
  var userId = req.user._id;
  var finished = req.params.finished;

  User.findByIdAsync(userId, '-salt -password')
    .then(user => {
      if (!user) {
        return res.status(404).end();
      }
      delete user._id;
      user.finished = finished;
      user.save(function (err) {
        if (err) {
          console.log('could not save user in setFinished '+user, err);
          return res.status(500).end();
        }
        else {
          console.log('successfully updated user '+user.username+' in setFinished to '+ finished);
          return res.status(200).json(user);
        }
      });
    })
    .catch(err => next(err));
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
  //var userId = req.user._id;

  // console.log('userId', userId);

  // User.findOneAsync({ _id: userId }, '-salt -password')
  //   .then(user => {
  //     if (!user) {
  //       return res.status(401).end();
  //     }
  //     user.surveyDone = true;
  //     user.save(function (err) {
  //       if (err) { return handleError(res, err); }
  //       return res.send(user);
  //     });
  //   })
  //   .catch(err => next(err));

  let user = req.body.username;
  console.log('updating survey for user '+ user);

  User.findOne({'username': user}).exec(function (errFind, u){

    if(u && !errFind){
      u.surveyDone = true;
      u.save(function (err) {
        if (err) {
          console.log('could not update survey for user '+user+' in db');
        }
        else{
          console.log('survey for user '+user+' successfully updated in db');
        }
        return res.send(u);
      });
    }
    else if(!u){
      console.log('user not found, try via auth-id');
      if(req.user && req.user._id){
        User.findOneAsync({ _id: req.user._id }, '-salt -password')
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
      else{
        console.log('no auth-id found');
        return res.status(404).end();
      }
    }
    else{
      return res.status(500).send(errFind ? errFind : 'error updating survey');
    }

  });
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
 * Export all Blocks data of a user
 */
export function csv(req, res) {
  let user = req.body;
  let withContent = req.params.content;
  let users = [];

  let userData = {
    username: user.username,
    surveyDone: user.surveyDone,
    finished: user.finished,
    step: user.step
  };

  Block.findOne({'user': user.username}).exec(function (err, b) {

    if (err || !b) {
      return res.status(404).end();
    }

    for(let i = 0; i < b.blocks.length; i++){
      //
      // //Block Title
      // userData['Block '+(i+1)+' Title'] = b.blocks[i].title;
      //
      // //Block Goal
      // userData['Block '+(i+1)+' Goal'] = b.blocks[i].goal;
      //
      // //Block Criteria
      // userData['Block '+(i+1)+' Criteria'] = b.blocks[i].criteria;
      //
      // //Block Preconditions
      // userData['Block '+(i+1)+' Preconditions'] = b.blocks[i].preconditions;
      //
      // if(withContent === 'true'){
      //   //Block Content
      //   userData['Block '+(i+1)+' Content'] = b.blocks[i].content;
      // }


       //Block Title
       userData['Block '+(i+1)+' Title'] = replaceNewLines(b.blocks[i].title);

       //Block Goal
       userData['Block '+(i+1)+' Goal'] = replaceNewLines(b.blocks[i].goal);

       //Block Criteria
       userData['Block '+(i+1)+' Criteria'] = replaceNewLines(b.blocks[i].criteria);

       //Block Preconditions
       userData['Block '+(i+1)+' Preconditions'] = replaceNewLines(b.blocks[i].preconditions);

       if(withContent === 'true'){
       //Block Content
       userData['Block '+(i+1)+' Content'] = replaceNewLines(b.blocks[i].content);
       }

    }

    users.push(userData);
    res.csv(users, true);
  });}


/**
 * Export all Blocks of all users
 */
export function csvAll(req, res) {
  let withContent = req.params.content;
  let users = [];


  Block.find({}).exec(function (err, blocks) {

    if (err || !blocks) {
      return res.status(404).end();
    }

    let headerRow = [];




    for (let i = 0; i < blocks.length; i++) {

        let userBlock = blocks[i];
        let userData = {
          username: userBlock.user,
        };
        headerRow = pushToArrayUnique(headerRow, 'username');

      for(let j = 0; j < userBlock.blocks.length; j++){



          //Block Title
          let blockTitleKey = 'Block ' + (j + 1) + ' Title';
          let blockTitle = userData[blockTitleKey];
          let blockTitleContent = replaceNewLines(userBlock.blocks[j].title);
          if(!blockTitle){
            blockTitle = [blockTitleContent];
          }
          else{
            blockTitle.push(blockTitleContent);
          }
          userData[blockTitleKey] = blockTitle;
          headerRow = pushToArrayUnique(headerRow, blockTitleKey);

          //Block Goal
          let blockGoalKey = 'Block ' + (j + 1) + ' Goal';
          let blockGoal = userData[blockGoalKey];
          let blockGoalContent = replaceNewLines(userBlock.blocks[j].goal);
          if(!blockGoal){
            blockGoal = [blockGoalContent];
          }
          else{
            blockGoal.push(blockGoalContent);
          }
          userData[blockGoalKey] = blockGoal;
          headerRow = pushToArrayUnique(headerRow, blockGoalKey);
          let currentIndex = headerRow.indexOf(blockGoalKey);


          //Block Alternatives
          let blockAlternatives = userBlock.blocks[j].alternatives;
          if(blockAlternatives && blockAlternatives.length > 0){
            for(let a = 0; a < blockAlternatives.length; a++){

              //Alternative Title
              if(blockAlternatives[a].title){
                let blockAlternativeTitleKey = 'Block ' + (j + 1) + ' Alternative '+ (a+1) + ': Title';
                let blockAlternativeTitle = userData[blockAlternativeTitleKey];
                let blockAlternativeTitleContent = replaceNewLines(blockAlternatives[a].title);
                if(!blockAlternativeTitle){
                  blockAlternativeTitle = [blockAlternativeTitleContent];
                }
                else{
                  blockAlternativeTitle.push(blockAlternativeTitleContent);
                }
                userData[blockAlternativeTitleKey] = blockAlternativeTitle;
                headerRow = pushToArrayUnique(headerRow, blockAlternativeTitleKey, (++currentIndex));
              }



              //Alternative Pro
              if(blockAlternatives[a].pro) {
                let blockAlternativeProKey = 'Block ' + (j + 1) + ' Alternative ' + (a + 1) + ': Pro';
                let blockAlternativePro = userData[blockAlternativeProKey];
                let blockAlternativeProContent = replaceNewLines(blockAlternatives[a].pro);

                if (!blockAlternativePro) {
                  blockAlternativePro = [blockAlternativeProContent];
                }
                else {
                  blockAlternativePro.push(blockAlternativeProContent);
                }
                userData[blockAlternativeProKey] = blockAlternativePro;
                headerRow = pushToArrayUnique(headerRow, blockAlternativeProKey, (++currentIndex));
              }

              //Alternative Contra
              if(blockAlternatives[a].contra) {
                let blockAlternativeContraKey = 'Block ' + (j + 1) + ' Alternative ' + (a + 1) + ': Contra';
                let blockAlternativeContra = userData[blockAlternativeContraKey];
                let blockAlternativeContraContent = replaceNewLines(blockAlternatives[a].contra);
                if (!blockAlternativeContra) {
                  blockAlternativeContra = [blockAlternativeContraContent];
                }
                else {
                  blockAlternativeContra.push(blockAlternativeContraContent);
                }
                userData[blockAlternativeContraKey] = blockAlternativeContra;
                headerRow = pushToArrayUnique(headerRow, blockAlternativeContraKey, (++currentIndex));
              }

            }
          }

          //Block Criteria
          let blockCriteriaKey = 'Block ' + (j + 1) + ' Criteria';
          let blockCriteria = userData[blockCriteriaKey];
          let blockCriteriaContent = replaceNewLines(userBlock.blocks[j].criteria);
          if(!blockCriteria){
            blockCriteria = [blockCriteriaContent];
          }
          else{
            blockCriteria.push(blockCriteriaContent);
          }
          userData[blockCriteriaKey] = blockCriteria;
          headerRow = pushToArrayUnique(headerRow, blockCriteriaKey);


          //Block Preconditions
          let blockPreconditionsKey = 'Block ' + (j + 1) + ' Preconditions';
          let blockPreconditions = userData[blockPreconditionsKey];
          let blockPreconditionsContent = replaceNewLines(userBlock.blocks[j].preconditions);
          if(!blockPreconditions){
            blockPreconditions = [blockPreconditionsContent];
          }
          else{
            blockPreconditions.push(blockPreconditionsContent);
          }
          userData[blockPreconditionsKey] = blockPreconditions;
          headerRow = pushToArrayUnique(headerRow, blockPreconditionsKey);


          if (withContent === 'true') {
            //Block Content
            let blockContentKey = 'Block ' + (j + 1) + ' Content';
            let blockContent = userData[blockContentKey];
            let blockContentContent = replaceNewLines(userBlock.blocks[j].content);
            if(!blockContent){
              blockContent = [blockContentContent];
            }
            else{
              blockContent.push(blockContentContent);
            }
            userData[blockContentKey] = blockContent;
            headerRow = pushToArrayUnique(headerRow, blockContentKey);

          }
        }
        users.push(userData);
      }

    let headerObject = {};
    for(let r = 0; r < headerRow.length; r++){
      headerObject[headerRow[r]] = '';
    }
    users.unshift(headerObject);

      res.csv(users, true);
    })};

/**
 * Authentication callback
 */
export function authCallback(req, res, next) {
  res.redirect('/');
}

export function getUserPackages(req, res){

  User.findAsync({}, '-salt -password')
    .then(u => {

      let users = [];
      let headerRow = [];
      let counter = 0;


      for(let j = u.length-1; j >= 0; j--){

        let user = u[j].username;
        let userData = {
          username: user,
        };
        let userPackages = [];
        headerRow = pushToArrayUnique(headerRow, 'username');

        let userPackageNr = 0;

        let rHistory = config.env === 'development' ? './history_database' : '/home/'+user+'/.rstudio/history_database';

        fs.readFile(rHistory, 'utf8', function (err,data) {

          if(!err) {
            let fileLogs = data.toString().split('\n');
            fileLogs.splice(fileLogs.length - 1, 1); //remove empty last line
            if (fileLogs && fileLogs.length >= 0) {
              for (var i = fileLogs.length - 1; i >= 0; i--) {
                let match = fileLogs[i].match(new RegExp(/library\((.*?)\)/));
                if (match !== null && match.length > 1 && !userPackages.includes(''+[match[1]])) {
                  let column = 'Package '+(++userPackageNr);
                  userData[column] = match[1];
                  headerRow = pushToArrayUnique(headerRow, column);
                  userPackages.push(''+match[1]);
                }
              }
            }

          }

          counter++;
          if(counter >= u.length){
            let headerObject = {};
            for(let r = 0; r < headerRow.length; r++){
              headerObject[headerRow[r]] = '';
            }
            users.unshift(headerObject);

            res.csv(users, true);
            return;
          }
        });
        users.push(userData);

      }

    })
    .catch(handleError(res));

}

function getLastLogDate(user, cb){

  let rHistory = config.env === 'development' ? './history_database' : '/home/'+user+'/.rstudio/history_database';

  fs.readFile(rHistory, 'utf8', function (err,data) {
    if (err) {
      return cb('Not logged in to Rstudio yet');
    }
    else{
      let fileLogs = data.toString().split('\n');
      fileLogs.splice(fileLogs.length-1,1); //remove empty last line
      let lastLogDate = 'N/A';
      if(fileLogs && fileLogs.length>=0){
        for(var i = fileLogs.length-1; i >= 0; i--){
          let lastLog = fileLogs[i];
          if(lastLog && lastLog.length > 0){
            let ts = lastLog.substr(0, lastLog.indexOf(':'));
            if(ts && ts.length > 0){
              lastLogDate = new Date(parseInt(ts));
              break;
            }
          }

        }

      }
      return cb(lastLogDate)
    }

  });
}

//===========HELPER FUNCTIONS===========

function replaceNewLines(text){
  if(!text){
    return text;
  }
  else{
    return text.replace(/[\r\n]/g, "\"\\n\"");
  }
}

function pushToArrayUnique(arr, key, index){
  if(arr.indexOf(key) === -1){
    if(index === undefined || index > arr.length){
      arr.push(key);
    }
    else{
      arr.splice(index, 0, key);
    }
  }
  return arr;
}

