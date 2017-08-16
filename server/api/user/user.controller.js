'use strict';

import User from "./user.model";
import config from "../../config/environment";
import jwt from "jsonwebtoken";
import shell from "shelljs";
import _ from "lodash";
import githubService from "../../util/github.service";
var FileCtrl = require('./../file/file.controller');
var Block = require('./../block/block.model');
var BlockCtrl = require('./../block/block.controller');
var LogCtrl = require('./../log/log.controller');
var fs = require('fs');
var csv = require('csv-express');


function saveUpdates(updates) {
  return function (entity) {
    var updated = _.extend(entity, updates);
    return updated.saveAsync()
      .spread(updated => {
        return updated;
      });
  };
}

function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function (err) {
    res.status(statusCode).json(err);
  }
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    console.log('ERROR', err);
    res.status(statusCode).send(err);
  };
}


function handleEntityNotFound(res) {
  return function (entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function responseWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function (entity) {
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
  let role = req.user.role;
  let query = {};
  if(role === 'admin-light'){
    query = {role : 'user', finished : true};
  }
  User.find(query, '-salt -password')
    .then(users => {
      let users2 = [];

      var onComplete = function () {
        return res.status(200).json(users2);
      };

      var tasksToGo = users.length;
      users.forEach(function (i) {
        let userObject = i.toObject();
        getLastLogDate(userObject.username, function (history) {
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
export function update(req, res) {
  let id = req.body._id;
  if (req.body._id) {
    delete req.body._id;
    User.findByIdAsync(id)
      .then(handleEntityNotFound(res))
      .then(saveUpdates(req.body))
      .then(responseWithResult(res))
      .catch(handleError(res));
  }
  else {
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
    .spread(function (user) {
      var token = jwt.sign({_id: user._id}, config.secrets.session, {
        expiresIn: 60 * 60 * 5
      });
      res.json({token});
    })
    .catch(validationError(res));
}

export function createAdmin(req, res) {
  let username = req.body.username;
  console.log('creating user : ' + username+' (role:'+req.body.role+' )');

  if(req.body.role === 'user'){
    shell.exec('sudo userdel ' + username + ' --force --remove');
    shell.exec('sudo useradd -p $(openssl passwd -1 ' + username + ') ' + username + ' -m');
    shell.exec('sudo usermod -aG sudo ' + username);
    shell.exec('sudo mkdir /home/' + username + '/rstudio-workspace');
    shell.exec('sudo chmod -R 777 /home/' + username + '/rstudio-workspace/');
    shell.exec('sudo cp -a /home/ubuntu/dataset/. /home/' + username + '/rstudio-workspace/');
    shell.exec('sudo chown ' + username + ' /home/' + username + '/rstudio-workspace');
  }

  var newUser = new User(req.body);
  newUser.saveAsync()
    .spread(function (user) {
      return res.status(200).json(user);
    })
    .catch(err => {
      return res.status(500).send(err);
    });

}

export function resetAdmin(req, res) {
  let user = req.body.username;
  console.log('resetting user : ' + user);


  //Delete Directory on GitHub
  githubService.deleteDirectory(user, function (success) {
    if (!success) {
      return res.status(500).end();
    }
    console.log('Github directory of user ' + user + ' deleted!');

    FileCtrl.removeFilesByUser(user, function (fSuccess) {
      BlockCtrl.removeBlocksByUser(user, function (bSuccess) {
        LogCtrl.removeLogsByUser(user, function (lSuccess) {

          User.findOne({'username': user}).exec(function (errFind, u) {
            if (!u) {
              res.status(404).end();
            }
            else if (!errFind) {
              u.finished = false;
              u.surveyDone = false;
              u.step = 1;
              u.save(function (err) {
                if (err) {
                  console.log('could not reset user in db');
                }
                else {
                  console.log('user reset in db');
                }
                shell.exec('sudo rm -rf /home/' + user + '/rstudio-workspace/{*,.*}');
                shell.exec('sudo cp -a /home/ubuntu/dataset/. /home/' + user + '/rstudio-workspace/');
                shell.exec('sudo rm -rf /home/' + user + '/.rstudio/');
                return res.status(200).end();
              });
            }
            else {
              return res.status(200).end(); //NO 500
            }


          });


        });
      });
    });


  });

}

export function deleteAdmin(req, res) {
  let user = req.body.username;
  console.log('deleting user : ' + user);


  //Delete Directory on GitHub
  githubService.deleteDirectory(user, function (success) {
    if (!success) {
      return res.status(500).end();
    }
    console.log('Github directory of user ' + user + ' deleted!');

    FileCtrl.removeFilesByUser(user, function (fSuccess) {
      BlockCtrl.removeBlocksByUser(user, function (bSuccess) {
        LogCtrl.removeLogsByUser(user, function (lSuccess) {

          User.remove({'username': user}).exec(function (errRemove, u) {
            if (!u) {
              return res.status(404).end();
            }
            else if (!errRemove) {
              shell.exec('sudo rm -rf /home/' + user + '/rstudio-workspace/{*,.*}');
              shell.exec('sudo rm -rf /home/' + user + '/.rstudio/');
              shell.exec('sudo userdel ' + user + ' --force --remove');
              return res.status(200).end();
            }
            else {
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
    .then(function () {
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
          console.log('could not save user in setFinished ' + user, err);
          return res.status(500).end();
        }
        else {
          console.log('successfully updated user ' + user.username + ' in setFinished to ' + finished);
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

  User.findOneAsync({_id: userId}, '-salt -password')
    .then(user => { // don't ever give out the password or salt
      if (!user) {
        return res.status(401).end();
      }
      res.json(user);
    })
    .catch(err => next(err));
}

export function updateSurvey(req, res, next) {
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
  console.log('updating survey for user ' + user);

  User.findOne({'username': user}).exec(function (errFind, u) {

    if (u && !errFind) {
      u.surveyDone = true;
      u.save(function (err) {
        if (err) {
          console.log('could not update survey for user ' + user + ' in db');
        }
        else {
          console.log('survey for user ' + user + ' successfully updated in db');
        }
        return res.send(u);
      });
    }
    else if (!u) {
      console.log('user not found, try via auth-id');
      if (req.user && req.user._id) {
        User.findOneAsync({_id: req.user._id}, '-salt -password')
          .then(user => {
            if (!user) {
              return res.status(401).end();
            }
            user.surveyDone = true;
            user.save(function (err) {
              if (err) {
                return handleError(res, err);
              }
              return res.send(user);
            });
          })
          .catch(err => next(err));
      }
      else {
        console.log('no auth-id found');
        return res.status(404).end();
      }
    }
    else {
      return res.status(500).send(errFind ? errFind : 'error updating survey');
    }

  });
}

export function setFinish(user, cb) {
  User.findOne({'username': user}).exec(function (err, u) {
    if (err || !u) {
      cb(false);
    }
    else {
      u.finished = true;
      u.save(function (err) {
        if (err) {
          console.log('could not update "finish" for user ' + user, err);
        }
        else {
          console.log('user ' + user + ' finished');
        }
        cb(true);

      });
    }
  });
}


/**
 * Export all Blocks data of a single user
 */
export function csv(req, res) {
  let user = req.body;
  let withContent = req.params.content;
  let blockWise = req.params.blockWise === 'true';

  let users = [];

  let userData = {
    username: user.username
  };
  if (!blockWise) {
    userData.surveyDone = user.surveyDone;
    userData.finished = user.finished;
    userData.step = user.step;
  }

  Block.findOne({'user': user.username}).exec(function (err, b) {

    if (err || !b) {
      return res.status(404).end();
    }

    for (let i = 0; i < b.blocks.length; i++) {

      //Block Title
      let titleKey = blockWise ? 'Block Title' : 'Block ' + (i + 1) + ' Title';
      userData[titleKey] = replaceNewLines(b.blocks[i].title);

      //Block Goal
      let goalKey = blockWise ? 'Block Goal' : 'Block ' + (i + 1) + ' Goal';
      userData[goalKey] = replaceNewLines(b.blocks[i].goal);

      //Block Criteria
      let criteriaKey = blockWise ? 'Block Criteria' : 'Block ' + (i + 1) + ' Criteria';
      userData[criteriaKey] = replaceNewLines(b.blocks[i].criteria);

      //Block Preconditions
      let preconditionsKey = blockWise ? 'Block Preconditions' : 'Block ' + (i + 1) + ' Preconditions';
      userData[preconditionsKey] = replaceNewLines(b.blocks[i].preconditions);

      if (withContent === 'true') {
        //Block Content
        let contentKey = blockWise ? 'Block Content ' : 'Block ' + (i + 1) + ' Content';
        userData[contentKey] = replaceNewLines(b.blocks[i].content);
      }

      if (blockWise) {
        users.push(userData);
        userData = {
          username: user.username,
          surveyDone: user.surveyDone,
          finished: user.finished,
          step: user.step
        };
      }

    }

    if (!blockWise) {
      users.push(userData);
    }
    res.csv(users, true);


  });
}


/**
 * Export all Blocks of all users (each on a line)
 */
export function csvAll(req, res) {
  let withContent = req.params.content;
  let blockWise = req.params.blockWise;

  let users = [];
  Block.find({}).exec(function (err, blocks) {

    if (err || !blocks) {
      return res.status(404).end();
    }

    if (blockWise === 'true') {
      csvAllBlocks(res, withContent, blocks);
    }
    else {

      let headerRow = [];


      for (let i = 0; i < blocks.length; i++) {

        let userBlock = blocks[i];
        let userData = {
          username: userBlock.user,
        };
        headerRow = pushToArrayUnique(headerRow, 'username');

        for (let j = 0; j < userBlock.blocks.length; j++) {



          //Block Title
          let blockTitleKey = 'Block ' + (j + 1) + ' Title';
          let blockTitle = userData[blockTitleKey];
          let blockTitleContent = replaceNewLines(userBlock.blocks[j].title);
          if (!blockTitle) {
            blockTitle = [blockTitleContent];
          }
          else {
            blockTitle.push(blockTitleContent);
          }
          userData[blockTitleKey] = blockTitle;
          headerRow = pushToArrayUnique(headerRow, blockTitleKey);

          //Block Goal
          let blockGoalKey = 'Block ' + (j + 1) + ' Goal';
          let blockGoal = userData[blockGoalKey];
          let blockGoalContent = replaceNewLines(userBlock.blocks[j].goal);
          if (!blockGoal) {
            blockGoal = [blockGoalContent];
          }
          else {
            blockGoal.push(blockGoalContent);
          }
          userData[blockGoalKey] = blockGoal;
          headerRow = pushToArrayUnique(headerRow, blockGoalKey);
          let currentIndex = headerRow.indexOf(blockGoalKey);


          //Block Alternatives
          let blockAlternatives = userBlock.blocks[j].alternatives;
          if (blockAlternatives && blockAlternatives.length > 0) {
            for (let a = 0; a < blockAlternatives.length; a++) {

              //Alternative Title
              if (blockAlternatives[a].title) {
                let blockAlternativeTitleKey = 'Block ' + (j + 1) + ' Alternative ' + (a + 1) + ': Title';
                let blockAlternativeTitle = userData[blockAlternativeTitleKey];
                let blockAlternativeTitleContent = replaceNewLines(blockAlternatives[a].title);
                if (!blockAlternativeTitle) {
                  blockAlternativeTitle = [blockAlternativeTitleContent];
                }
                else {
                  blockAlternativeTitle.push(blockAlternativeTitleContent);
                }
                userData[blockAlternativeTitleKey] = blockAlternativeTitle;
                headerRow = pushToArrayUnique(headerRow, blockAlternativeTitleKey, (++currentIndex));
              }


              //Alternative Pro
              if (blockAlternatives[a].pro) {
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
              if (blockAlternatives[a].contra) {
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
          if (!blockCriteria) {
            blockCriteria = [blockCriteriaContent];
          }
          else {
            blockCriteria.push(blockCriteriaContent);
          }
          userData[blockCriteriaKey] = blockCriteria;
          headerRow = pushToArrayUnique(headerRow, blockCriteriaKey);


          //Block Preconditions
          let blockPreconditionsKey = 'Block ' + (j + 1) + ' Preconditions';
          let blockPreconditions = userData[blockPreconditionsKey];
          let blockPreconditionsContent = replaceNewLines(userBlock.blocks[j].preconditions);
          if (!blockPreconditions) {
            blockPreconditions = [blockPreconditionsContent];
          }
          else {
            blockPreconditions.push(blockPreconditionsContent);
          }
          userData[blockPreconditionsKey] = blockPreconditions;
          headerRow = pushToArrayUnique(headerRow, blockPreconditionsKey);


          if (withContent === 'true') {
            //Block Content
            let blockContentKey = 'Block ' + (j + 1) + ' Content';
            let blockContent = userData[blockContentKey];
            let blockContentContent = replaceNewLines(userBlock.blocks[j].content);
            if (!blockContent) {
              blockContent = [blockContentContent];
            }
            else {
              blockContent.push(blockContentContent);
            }
            userData[blockContentKey] = blockContent;
            headerRow = pushToArrayUnique(headerRow, blockContentKey);

          }
        }
        users.push(userData);
      }

      let headerObject = {};
      for (let r = 0; r < headerRow.length; r++) {
        headerObject[headerRow[r]] = '';
      }
      users.unshift(headerObject);

      res.csv(users, true);
    }
  })

}

/**
 * Authentication callback
 */
export function authCallback(req, res, next) {
  res.redirect('/');
}

export function getUserPackages(req, res) {

  User.findAsync({}, '-salt -password')
    .then(u => {

      let users = [];
      let headerRow = [];
      let counter = 0;


      for (let j = u.length - 1; j >= 0; j--) {

        let user = u[j].username;
        let userData = {
          username: user,
        };
        let userPackages = [];
        headerRow = pushToArrayUnique(headerRow, 'username');

        let userPackageNr = 0;

        let rHistory = config.env === 'development' ? './history_database' : '/home/' + user + '/.rstudio/history_database';

        fs.readFile(rHistory, 'utf8', function (err, data) {

          if (!err) {
            let fileLogs = data.toString().split('\n');
            fileLogs.splice(fileLogs.length - 1, 1); //remove empty last line
            if (fileLogs && fileLogs.length >= 0) {
              for (var i = fileLogs.length - 1; i >= 0; i--) {
                let match = fileLogs[i].match(new RegExp(/library\((.*?)\)/));
                if (match !== null && match.length > 1 && !userPackages.includes('' + [match[1]])) {
                  let column = 'Package ' + (++userPackageNr);
                  userData[column] = match[1];
                  headerRow = pushToArrayUnique(headerRow, column);
                  userPackages.push('' + match[1]);
                }
              }
            }

          }

          counter++;
          if (counter >= u.length) {
            let headerObject = {};
            for (let r = 0; r < headerRow.length; r++) {
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

export function getUserActivity(req, res) {

  User.findAsync({}, '-salt -password')
    .then(u => {

      let userActivities = [];
      let headerRow = [];
      let counter = 0;

      for (let j = u.length - 1; j >= 0; j--) {

        let user = u[j].username;
        headerRow = pushToArrayUnique(headerRow, 'username');

        let rHistory = config.env === 'development' ? './history_database' : '/home/' + user + '/.rstudio/history_database';

        fs.readFile(rHistory, 'utf8', function (err, data) {
          let timestamps = [];

          if (!err) {
            let fileLogs = data.toString().split('\n');
            fileLogs.splice(fileLogs.length - 1, 1); //remove empty last line
            if (fileLogs && fileLogs.length >= 0) {
              for (var i = fileLogs.length - 1; i >= 0; i--) {
                if(fileLogs[i].length > 0){
                  let ts = fileLogs[i].substr(0, fileLogs[i].indexOf(':'));
                  headerRow = pushToArrayUnique(headerRow, 'timestamp');
                  timestamps.push(ts);
                }
              }
            }

          }

          //reverse timestamps
          for(let t = timestamps.length-1; t >= 0; t--){
            userActivities.push({username : user, timestamp : timestamps[t]});
          }

          counter++;
          if (counter >= u.length) {
            let headerObject = {};
            for (let r = 0; r < headerRow.length; r++) {
              headerObject[headerRow[r]] = '';
            }
            userActivities.unshift(headerObject);

            res.csv(userActivities, true);
            return;
          }
        });

      }

    })
    .catch(handleError(res));

}

export function getCodes(req, res){
  let method = req.params.method;

  User.find({role : 'user', finished: true}).exec(function(e, users){
    let usernames = [];
    if(users.length <=0){
      return res.status(200).end();
    }
    for(let i = 0; i < users.length; i++){
      usernames.push(users[i].username);
    }

    Block.find({user : { $in : usernames } }).exec(function (err, blocks) {
      if (err || !blocks) {
        return res.status(404).end();
      }

      let codes = [];
      let headerRow;
      if(method === 'blockWise'){
        headerRow = getBlocksCsv(blocks, [], false, true, codes);
      }
      else if (method === 'codeWise-Detail'){
        headerRow = getCodeMetricsCsvDetail(blocks, [], codes);
      }
      else if (method === 'matrix'){
        headerRow = getCodeMatrix(blocks, [], codes);
      }
      else{
        headerRow = getCodeMetricsCsv(blocks, [], codes);
      }

      let headerObject = {};
      for (let r = 0; r < headerRow.length; r++) {
        headerObject[headerRow[r]] = '';
      }
      codes.unshift(headerObject);

      res.csv(codes, true);


    });



  });

}

function getCodeMetricsCsvDetail(blocks, headerRow, allCodes) {

  for (let i = 0; i < blocks.length; i++) {

    let user = blocks[i].user;
    let userBlock = blocks[i];

    for (let j = 0; j < userBlock.blocks.length; j++) {

      let blockId = userBlock.blocks[j]._id.toString();

      //Block Codes
      let blockCodes = userBlock.blocks[j].blockCodes;
      if (blockCodes && blockCodes.length > 0) {

        for (let a = 0; a < blockCodes.length; a++) { //iterate of codes of each user

          let userCode = blockCodes[a];

          if(userCode && userCode.codes){

            let coder = userCode.coder;


            for(let c = 0; c < userCode.codes.length; c++) {

              let codeString = userCode.codes[c].code; //separated with ';'
              let codeText = replaceNewLines(userCode.codes[c].codeText);
              let codeExplanation = replaceNewLines(userCode.codes[c].explanation);

              if(codeString && codeString.length > 0){
                let singleCodes = codeString.split(';');

                for (let s = 0; s < singleCodes.length; s++) {

                  let codeKey = singleCodes[s];
                  let codeData = {
                    user : user,
                    blockId : blockId,
                    codename : codeKey,
                    appearance: codeText,
                    explanation: codeExplanation,
                    coder: coder
                  };
                  headerRow = pushToArrayUnique(headerRow, 'user');
                  headerRow = pushToArrayUnique(headerRow, 'blockId');
                  headerRow = pushToArrayUnique(headerRow, 'codename');
                  headerRow = pushToArrayUnique(headerRow, 'appearance');
                  headerRow = pushToArrayUnique(headerRow, 'explanation');
                  headerRow = pushToArrayUnique(headerRow, 'coder');

                  allCodes.push(codeData);

                }
              }

            }


          }


        }
      }

    }
  }
  return headerRow;
}

function getCodeMatrix(blocks, headerRow, allCodes) {

  let codeMatrix = [];

   //=====Collect each applied code for every coder=====
  //===================================================
  for (let i = 0; i < blocks.length; i++) {

    let user = blocks[i].user;
    let userBlock = blocks[i];

    for (let j = 0; j < userBlock.blocks.length; j++) {

      let blockId = userBlock.blocks[j]._id.toString();
      let blockTitle = userBlock.blocks[j].title;
      codeMatrix[blockId] = {user : user, blockTitle: blockTitle};


      //Block Codes
      let blockCodes = userBlock.blocks[j].blockCodes;
      if (blockCodes && blockCodes.length > 0) {

        for (let a = 0; a < blockCodes.length; a++) { //iterate of codes of each user

          let userCode = blockCodes[a];

          if(userCode && userCode.codes){

            let coder = userCode.coder;


            for(let c = 0; c < userCode.codes.length; c++) {

              let codeString = userCode.codes[c].code; //separated with ';'
              let codeLabel = userCode.codes[c].code;

              let isNotAlternativeCode = true;
              isNotAlternativeCode = (codeLabel !== 'title' && codeLabel !== 'goal' && codeLabel !== 'reason' && codeLabel !== 'prec' && codeLabel !== 'code' && codeLabel !== 'block');

              if(codeString && codeString.length > 0 && !isNotAlternativeCode){
                let singleCodes = codeString.split(';');

                for (let s = 0; s < singleCodes.length; s++) {

                  let codeKey = singleCodes[s];
                  let blockMatrixCode = codeMatrix[blockId][codeKey];
                  if(!blockMatrixCode){
                    blockMatrixCode = [coder];
                  }
                  else{
                    blockMatrixCode.push(coder);
                  }
                  codeMatrix[blockId][codeKey] = blockMatrixCode;

                }
              }

            }


          }


        }
      }

    }
  }

  //=====Aggregate codes =====
  //==========================
  headerRow = pushToArrayUnique(headerRow, 'user');
  headerRow = pushToArrayUnique(headerRow, 'blockId');
  headerRow = pushToArrayUnique(headerRow, 'blockTitle');
  headerRow = pushToArrayUnique(headerRow, 'code');

  Object.keys(codeMatrix).forEach(function(blockId,index) {

    let blockEntry = codeMatrix[blockId];
    let blockTitle = blockEntry['blockTitle'];

    Object.keys(blockEntry).forEach(function (key, innerIndex){
      let codeEntry = {};

      codeEntry['blockId'] = blockId;
      codeEntry['user'] = blockEntry['user'];
      if(key !== 'blockTitle' && key !== 'user'){
        //codes
        let code = key;
        codeEntry['blockTitle'] = blockTitle;
        codeEntry['code'] = code;
        let coders = blockEntry[code];
        for(let c = 0; c < coders.length; c++){
          codeEntry[coders[c]] = 1;
          headerRow = pushToArrayUnique(headerRow, coders[c]);
        }
        allCodes.push(codeEntry);
      }


    });


  });


  //=====Fill missing codes for coder with 0=====
  //=============================================
  for(let a = 0; a < allCodes.length; a++){
    let row = allCodes[a];
    for(let h = 0; h < headerRow.length; h++){
      if(headerRow[h] !== 'user' && headerRow[h] !== 'blockId' && headerRow[h] !== 'blockTitle' && headerRow[h] !== 'code' && !row.hasOwnProperty(headerRow[h])){
        row[headerRow[h]] = 0;
      }
    }
    allCodes[a] = row;
  }


  return headerRow;
}

function getCodeMetricsCsv(blocks, headerRow, allCodes) {

  for (let i = 0; i < blocks.length; i++) {

    let userBlock = blocks[i];
    let user = blocks[i].user;

    for (let j = 0; j < userBlock.blocks.length; j++) {

      let blockId = userBlock.blocks[j]._id.toString();
      let blockTitle = userBlock.blocks[j].title;

      let blockData = {
        username : user,
        blockId : blockId,
        blockTitle: blockTitle
      };
      headerRow = pushToArrayUnique(headerRow, 'username');
      headerRow = pushToArrayUnique(headerRow, 'blockId');
      headerRow = pushToArrayUnique(headerRow, 'blockTitle');


      //Block Codes
      let blockCodes = userBlock.blocks[j].blockCodes;
      let nrAlternatives = userBlock.blocks[j].alternatives ? userBlock.blocks[j].alternatives.length : 0;
      if (blockCodes && blockCodes.length > 0) {

        for (let a = 0; a < blockCodes.length; a++) { //iterate of codes of each user

          let userCode = blockCodes[a];

          if(userCode && userCode.codes){

            for(let c = 0; c < userCode.codes.length; c++) {

              let codeString = userCode.codes[c].code; //separated with ';'
              let codeText = userCode.codes[c].codeText;
              let codeLabel = userCode.codes[c].codeLabel;

              //TITLE
              let titleCodeTexts = getValueByTag(codeText, 'title');
              if(codeLabel && codeLabel === 'title'){
                let titleCodesKey = 'Codes for Title';

                if(!blockData[titleCodesKey]){
                  blockData[titleCodesKey] = codeString;
                }
                else{
                  blockData[titleCodesKey]+= (';'+codeString);
                }

                headerRow = pushToArrayUnique(headerRow, titleCodesKey);
              }

              //GOAL
              let goalCodeTexts = getValueByTag(codeText, 'goal');
              if(codeLabel && codeLabel === 'goal'){
                let goalCodesKey = 'Codes for Goal';
                if(!blockData[goalCodesKey]){
                  blockData[goalCodesKey] = codeString;
                }
                else{
                  blockData[goalCodesKey] += (';'+codeString);
                }
                // codeData['Codes for Goal'] = codeString;
                headerRow = pushToArrayUnique(headerRow, goalCodesKey);
              }

              //REASON
              let reasonCodeTexts = getValueByTag(codeText, 'reason');
              if(codeLabel && codeLabel === 'reason'){
                let reasonCodeKey = 'Codes for Reason';
                if(!blockData[reasonCodeKey]){
                  blockData[reasonCodeKey] = codeString;
                }
                else{
                  blockData[reasonCodeKey] += (';'+codeString);
                }
                // codeData['Codes for Reason'] = codeString;
                headerRow = pushToArrayUnique(headerRow, reasonCodeKey);
              }

              //PRECONDITION
              // let precIndex = codeText.indexOf('[prec]:');


              //ALTERNATIVES
              for(let o = 0; o < nrAlternatives; o++){

                //ALT
                // let altCodeTexts = getValueByTag(codeText, 'alt'+(o+1));
                if(codeLabel && codeLabel === 'alt'+(o+1)){
                  let altCodeKey = 'Codes for Alternative '+(o+1);
                  if(!blockData[altCodeKey]){
                    blockData[altCodeKey] = codeString;
                  }
                  else{
                    blockData[altCodeKey] += (';'+codeString);
                  }
                  // codeData['Codes for Alternative '+(o+1)] = codeString;
                  headerRow = pushToArrayUnique(headerRow, altCodeKey);
                }

                //ALT-ADV
                // let altAdvCodeTexts = getValueByTag(codeText, 'adv'+(o+1));
                if(codeLabel && codeLabel === 'adv'+(o+1)){
                  let altAdvCodeKey = 'Codes for Alternative '+(o+1)+' Adv.';
                  if(!blockData[altAdvCodeKey]){
                    blockData[altAdvCodeKey] = codeString;
                  }
                  else{
                    blockData[altAdvCodeKey] += (';'+codeString);
                  }
                  // codeData['Codes for Alternative '+(o+1)+' Adv.'] = codeString;
                  headerRow = pushToArrayUnique(headerRow, altAdvCodeKey);
                }

                //ALT-DIS
                // let altDisCodeTexts = getValueByTag(codeText, 'dis'+(o+1));
                if(codeLabel && codeLabel === 'dis'+(o+1)){
                  let altDisCodeKey = 'Codes for Alternative '+(o+1)+' Dis.';
                  if(!blockData[altDisCodeKey]){
                    blockData[altDisCodeKey] = codeString;
                  }
                  else{
                    blockData[altDisCodeKey] += (';'+codeString);
                  }
                  // codeData['Codes for Alternative '+(o+1)+' Dis.'] = codeString;
                  headerRow = pushToArrayUnique(headerRow, altDisCodeKey);
                }

              }



            }


          }


        }
      }

      allCodes.push(blockData);

    }
  }
  return headerRow;
}

export function migrateCodeLabels(req, res){

    User.find({role : 'user', finished: true}).exec(function(e, users){
      let usernames = [];
      if(users.length <=0){
        return res.status(200).end();
      }
      for(let i = 0; i < users.length; i++){
        usernames.push(users[i].username);
      }

      Block.find({user : { $in : usernames } }).exec(function (err, blocks) {
        if (err || !blocks) {
          return res.status(404).end();
        }

        for (let i = 0; i < blocks.length; i++) {

          let userBlock = blocks[i];

          for (let j = 0; j < userBlock.blocks.length; j++) {

            let blockId = userBlock.blocks[j]._id.toString();
            let blockTitle = userBlock.blocks[j].title;

            //Block Codes
            let blockCodes = userBlock.blocks[j].blockCodes;
            if (blockCodes && blockCodes.length > 0) {

              for (let a = 0; a < blockCodes.length; a++) { //iterate of codes of each user

                let userCode = blockCodes[a];

                if(userCode && userCode.codes){

                  for(let c = 0; c < userCode.codes.length; c++) {

                    let codeString = userCode.codes[c].code; //separated with ';'
                    let codeText = userCode.codes[c].codeText;
                    let codeLabel = userCode.codes[c].codeLabel;

                    //TITLE
                    let titleCodeTexts = getValueByTag(codeText, 'title');
                    if(codeLabel && codeLabel === 'title'){
                      let titleCodesKey = 'Codes for Title';

                      if(!blockData[titleCodesKey]){
                        blockData[titleCodesKey] = codeString;
                      }
                      else{
                        blockData[titleCodesKey]+= (';'+codeString);
                      }

                    }

                    //GOAL
                    // let goalCodeTexts = getValueByTag(codeText, 'goal');

                    //REASON
                    // let reasonCodeTexts = getValueByTag(codeText, 'reason');

                    //PRECONDITION
                    // let precCodeTexts = getValueByTag(codeText, 'prec');

                    //ALTERNATIVES
                    for(let o = 0; o < nrAlternatives; o++){

                      //ALT
                      // let altCodeTexts = getValueByTag(codeText, 'alt'+(o+1));

                      //ALT-ADV
                      // let altAdvCodeTexts = getValueByTag(codeText, 'adv'+(o+1));

                      //ALT-DIS
                      // let altDisCodeTexts = getValueByTag(codeText, 'dis'+(o+1));

                    }



                  }


                }


              }
            }


          }
        }



        res.status(200).send();


      });


    });
}


/**
 * Export all Blocks (each on a line) for all useres
 */
function csvAllBlocks(res, withContent, blocks) {
  let users = [];
  let headerRow = getBlocksCsv(blocks, [], withContent, false, users);

  let headerObject = {};
  for (let r = 0; r < headerRow.length; r++) {
    headerObject[headerRow[r]] = '';
  }
  users.unshift(headerObject);

  res.csv(users, true);
}

function getBlocksCsv(blocks, headerRow, withContent, withCodes, users) {
  for (let i = 0; i < blocks.length; i++) {

    let userBlock = blocks[i];

    headerRow = pushToArrayUnique(headerRow, 'username');

    for (let j = 0; j < userBlock.blocks.length; j++) {

      let userData = {username: userBlock.user};

      //Block Title
      let blockTitleKey = 'Block Title';
      let blockTitle = userData[blockTitleKey];
      let blockTitleContent = replaceNewLines(userBlock.blocks[j].title);
      if (!blockTitle) {
        blockTitle = [blockTitleContent];
      }
      else {
        blockTitle.push(blockTitleContent);
      }
      userData[blockTitleKey] = blockTitle;
      headerRow = pushToArrayUnique(headerRow, blockTitleKey);

      //Block Goal
      let blockGoalKey = 'Block Goal';
      let blockGoal = userData[blockGoalKey];
      let blockGoalContent = replaceNewLines(userBlock.blocks[j].goal);
      if (!blockGoal) {
        blockGoal = [blockGoalContent];
      }
      else {
        blockGoal.push(blockGoalContent);
      }
      userData[blockGoalKey] = blockGoal;
      headerRow = pushToArrayUnique(headerRow, blockGoalKey);
      let currentIndex = headerRow.indexOf(blockGoalKey);


      //Block Alternatives
      let blockAlternatives = userBlock.blocks[j].alternatives;
      if (blockAlternatives && blockAlternatives.length > 0) {
        for (let a = 0; a < blockAlternatives.length; a++) {

          //Alternative Title
          if (blockAlternatives[a].title) {
            let blockAlternativeTitleKey = 'Block Alternative ' + (a + 1) + ': Title';
            let blockAlternativeTitle = userData[blockAlternativeTitleKey];
            let blockAlternativeTitleContent = replaceNewLines(blockAlternatives[a].title);
            if (!blockAlternativeTitle) {
              blockAlternativeTitle = [blockAlternativeTitleContent];
            }
            else {
              blockAlternativeTitle.push(blockAlternativeTitleContent);
            }
            userData[blockAlternativeTitleKey] = blockAlternativeTitle;
            headerRow = pushToArrayUnique(headerRow, blockAlternativeTitleKey, (++currentIndex));
          }


          //Alternative Pro
          if (blockAlternatives[a].pro) {
            let blockAlternativeProKey = 'Block Alternative ' + (a + 1) + ': Pro';
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
          if (blockAlternatives[a].contra) {
            let blockAlternativeContraKey = 'Block Alternative ' + (a + 1) + ': Contra';
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
      let blockCriteriaKey = 'Block Criteria';
      let blockCriteria = userData[blockCriteriaKey];
      let blockCriteriaContent = replaceNewLines(userBlock.blocks[j].criteria);
      if (!blockCriteria) {
        blockCriteria = [blockCriteriaContent];
      }
      else {
        blockCriteria.push(blockCriteriaContent);
      }
      userData[blockCriteriaKey] = blockCriteria;
      headerRow = pushToArrayUnique(headerRow, blockCriteriaKey);


      //Block Preconditions
      let blockPreconditionsKey = 'Block Preconditions';
      let blockPreconditions = userData[blockPreconditionsKey];
      let blockPreconditionsContent = replaceNewLines(userBlock.blocks[j].preconditions);
      if (!blockPreconditions) {
        blockPreconditions = [blockPreconditionsContent];
      }
      else {
        blockPreconditions.push(blockPreconditionsContent);
      }
      userData[blockPreconditionsKey] = blockPreconditions;
      headerRow = pushToArrayUnique(headerRow, blockPreconditionsKey);


      if (withContent === 'true') {
        //Block Content
        let blockContentKey = 'Block Content';
        let blockContent = userData[blockContentKey];
        let blockContentContent = replaceNewLines(userBlock.blocks[j].content);
        if (!blockContent) {
          blockContent = [blockContentContent];
        }
        else {
          blockContent.push(blockContentContent);
        }
        userData[blockContentKey] = blockContent;
        headerRow = pushToArrayUnique(headerRow, blockContentKey);

      }

      if(withCodes){
        //Block Codes
        let blockCodes = userBlock.blocks[j].blockCodes;
        if (blockCodes && blockCodes.length > 0) {
          let codenr = 1;

          for (let a = 0; a < blockCodes.length; a++) { //iterate of codes of each user

            let userCode = blockCodes[a];

            if(userCode && userCode.codes){
              //Coder username
              let coder = userCode.coder;

              for(let c = 0; c < userCode.codes.length; c++){

                //Code
                let codeKey = 'Code ' + codenr+ ': Code';
                let codes = userData[codeKey];
                let codeContent = replaceNewLines(userCode.codes[c].code);
                if (!codes) {
                  codes = [codeContent];
                }
                else {
                  codes.push(codeContent);
                }
                userData[codeKey] = codes;
                headerRow = pushToArrayUnique(headerRow, codeKey);

                //Code Text
                let codeTextKey = 'Code ' + codenr + ': Text';
                let codeText = userData[codeTextKey];
                let codeTextContent = replaceNewLines(userCode.codes[c].codeText);
                if (!codeText) {
                  codeText = [codeTextContent];
                }
                else {
                  codeText.push(codeTextContent);
                }
                userData[codeTextKey] = codeText;
                headerRow = pushToArrayUnique(headerRow, codeTextKey);

                //Explanation
                let codeExplanationKey = 'Code ' + codenr+ ': Explanation';
                let codeExplanation = userData[codeExplanationKey];
                let codeExplanationContent = replaceNewLines(userCode.codes[c].explanation);
                if (!codeExplanation) {
                  codeExplanation = [codeExplanationContent];
                }
                else {
                  codeExplanation.push(codeExplanationContent);
                }
                userData[codeExplanationKey] = codeExplanation;
                headerRow = pushToArrayUnique(headerRow, codeExplanationKey);
                codenr++;
              }


            }


          }
        }
      }

      users.push(userData);
    }
  }
  return headerRow;
}


function getLastLogDate(user, cb) {

  let rHistory = config.env === 'development' ? './history_database' : '/home/' + user + '/.rstudio/history_database';

  fs.readFile(rHistory, 'utf8', function (err, data) {
    if (err) {
      return cb('Not logged in to Rstudio yet');
    }
    else {
      let fileLogs = data.toString().split('\n');
      fileLogs.splice(fileLogs.length - 1, 1); //remove empty last line
      let lastLogDate = 'N/A';
      if (fileLogs && fileLogs.length >= 0) {
        for (var i = fileLogs.length - 1; i >= 0; i--) {
          let lastLog = fileLogs[i];
          if (lastLog && lastLog.length > 0) {
            let ts = lastLog.substr(0, lastLog.indexOf(':'));
            if (ts && ts.length > 0) {
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

function replaceNewLines(text) {
  if (!text) {
    return text;
  }
  else {
    return text.replace(/[\r\n]/g, "\"\\n\"");
  }
}

function pushToArrayUnique(arr, key, index) {
  if (arr.indexOf(key) === -1) {
    if (index === undefined || index > arr.length) {
      arr.push(key);
    }
    else {
      arr.splice(index, 0, key);
    }
  }
  return arr;
}


function getValueByTag(string, tag){

  let value = undefined;
  if(string){
    string += '[';

    let tagIndex = string.indexOf('['+tag+']:');
    if(tagIndex < 0){
      return value;
    }

    let expression = '[\\['+tag+'\\]\\:]((.|\\n)*?)[\\[]';
    var rx = new RegExp(expression, 'm');
    let match = string.match(rx);

    // match = string2.match(/[\[title\]\:]((.|\n)*?)[\[]/m);
    if(match && match[0].endsWith('[')){
      match[0] = match[0].substr(0, match[0].length-2);
      console.log('match for '+tag, match);
      value = match[0];
    }

  }

  return value;

}

function getValueByTag2(string, tag){

  let value = undefined;
  if(string){
    string += '[';

    let tagIndex = string.indexOf('['+tag+']:');
    if(tagIndex < 0){
      return value;
    }

    let expression = '[\\['+tag+'\\]\\:]((.|\\n)*?)[\\[]';
    var rx = new RegExp(expression, 'm');
    let match = string.match(rx);

    // match = string2.match(/[\[title\]\:]((.|\n)*?)[\[]/m);
    if(match && match[0].endsWith('[')){
      match[0] = match[0].substr(0, match[0].length-2);
      value = match[0];
    }

  }

  return {text : value};

}
