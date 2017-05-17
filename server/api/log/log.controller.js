/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/logs              ->  index
 * POST    /api/logs              ->  create
 * GET     /api/logs/:id          ->  show
 * PUT     /api/logs/:id          ->  update
 * DELETE  /api/logs/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
var Log = require('./log.model');
var Block = require('./../block/block.model');
var BlockCtrl = require('./../block/block.controller');
var fs = require('fs');
var config = require('../../config/environment');
var logUtil = require('../../util/logutil.service');


function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
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

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function saveUpdates(updates) {
  return function(entity) {
    var updated = _.merge(entity, updates);
    return updated.saveAsync()
      .spread(updated => {
        return updated;
      });
  };
}

function removeEntity(res) {
  return function(entity) {
    if (entity) {
      return entity.removeAsync()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

// Gets a list of Logs
export function index(req, res) {
  let user = req.params.user;

  let rHistory = config.env === 'development' ? './history_database' : '/home/'+user+'/.rstudio/history_database';

  fs.readFile(rHistory, 'utf8', function (err,data) {
    if (err) {
      console.log('no user history found for user '+user,err);
      return res.status(404).send(err);
    }
    var result = {'content': data.toString()};
    return res.status(200).json(result);
  });
}

// Get logs of user from DB
export function show(req, res) {
  let user = req.params.user;

  Log.findOne({'user': user}).exec(function (err, logs) {

    if (err || !logs) {
      return res.status(404).end();
    }
    else {
      return res.status(200).json(logs.logs);
      //blocks for user already exist
    }

  });
}

// Get logs of user from history-file
export function showFromFile(req, res) {
  let user = req.params.user;

  if(!user){
    return res.status(400).end();
  }
  else{
    let rHistory = config.env === 'development' ? './history_database' : '/home/'+user+'/.rstudio/history_database';

    fs.readFile(rHistory, 'utf8', function (err,data) {
      if (err) {
        return res.status(404).send(err);
      }

      Log.findOne({'user': user}).exec(function (err, logs) {

        var result = {'fileLogs': data.toString()};

        if (!err && logs) {
          result.dbLogs = logs.logs;
        }
        return res.status(200).json(result);

      });

    });
  }


}

export function showFromDb(req, res){
  let user = req.user;
  if(!user || ! user.username){
    return res.status(404).end();
  }
  else{
    getLogsByUser(user.username, function(logs){
      return logs ? res.status(200).json({'dbLogs' : logs}) : res.status(404).end();
    });
  }

}

//create new log for given blockId
export function create(req, res){
  let blockId = req.body.blockId;
  let user = req.body.user;
  let log = req.body.log;

  createOrUpdateLogs(user, blockId, [log], function(dbLogs){
    if(!dbLogs){
      return res.status(500).end();
    }
    else{
      return res.status(200).json(dbLogs);
    }

  });
}

//Compare and update (sync) complete loglist with db
export function finish(req, res){
  let logs = req.body.logs;
  let user = req.body.user;

  if(!user || !logs){
    return res.status(500).end();
  }

  Log.findOne({'user': user}).exec(function (err, l) {

    if(err || !l){
      return res.status(500).end();
    }

    return res.status(200).json(l);





  });


}

export function destroy(req, res){
  let logId = req.body.logId;
  console.log('deleting log', logId);
  let user = req.body.user;
  let blockId = req.body.blockId;

  Log.findOne({'user': user}).exec(function (err, l) {

    if(err || !l){
      return res.status(404).end();
    }

    let logsCopy = clone(l.logs);
    let log;
    let latestLog;

    for (let i = l.logs.length - 1; i >= 0; i--) {
      if(l.logs[i]._id.toHexString() === logId){
        log = l.logs[i];//.log;
        l.logs.splice(i, 1);
        delete l._id;
      }
      else if(l.logs[i].block.toHexString() === blockId){
        if(!latestLog || new Date(latestLog.timestamp).getTime() < new Date(l.logs[i].timestamp).getTime()){
          latestLog = l.logs[i];
        }
      }
    }

    l.save(function (err) {
      if (err) {
        console.log('could not delete log '+logId, err);
        return res.status(201).json({dbLogs: logsCopy});
      }
      else {
        BlockCtrl.stripLogFromBlockContent(user, blockId, log, latestLog, function(blocks){
          if(!blocks){
            return res.status(200).json({dbLogs: l.logs});
          }
          else{
            return res.status(200).json({dbLogs: l.logs, blockList: blocks});
          }
        });
      }
    });




  });

  // Thing.findByIdAsync(req.params.id)
  //   .then(handleEntityNotFound(res))
  //   .then(removeEntity(res))
  //   .catch(handleError(res));

  // return entity.removeAsync()
  //   .then(() => {
  //     res.status(204).end();
  //   });


}


//HELPER FUNCTIONS
export function getLogsByUser(user, cb){
  console.log('get Logs for user ' + user);

  if(!user){
    cb();
  }
  else{
    Log.findOne({ 'user': user }).exec(function (err, logs) {

      //creating first entry for user
      if (err || !logs) {
        cb();
      }
      else{
        cb(logs);
      }

    });
  }
}

export function removeLogsByUser(user, cb){

  Log.remove({'user': user}).exec(function (errFind, files){
    if(errFind) {
      cb(false);
    }
    else{
      console.log('User ' + user+ ' deleted from Log DB');
      cb(true);
    }
  });
}

export function createOrUpdateLogs(user, blockId, selection, cb) {

  if(!blockId || !user || !selection){
    console.log('cb(false)', blockId, user, selection);
    cb();
  }

  else{


    for(let i = 0; i < selection.length; i++){
      selection[i].block = blockId;
    }

    Log.findOne({'user': user}).exec(function (err, logs) {

      //creating first entry for user
      if (err || !logs) {

        // for(var i = 0; i < newLogs.length; i++){
        //   let date1 = new Date(Number(newLogs[i].timestamp));
        //
        //   for(var j = 0; j < selection.length; j++){
        //     let date2 = new Date(Number(selection[j].timestamp));
        //
        //     if(newLogs[i].log === selection[j].log && date1.getTime() === date2.getTime()){
        //       newLogs[i].block = blockId;
        //     }
        //
        //   }
        // }


        let l = {
          user: user,
          logs: selection
        };

        Log.create(l, function (err, result) {
          if (err) {
            console.log('could not create log-entry for user '+user, err);
            cb();
          }
          else {
            console.log('new log entry created');
            cb(result.logs);
          }
        });
      }


      //blocks for user already exist
      else {

        console.log('logs.logs', logs.logs);
        console.log('SELECTION', selection);
        logs.logs.push.apply(logs.logs, selection);
        logs.save(function (err) {
          if (err) {
            console.log('could not save/update logs for user '+user, err);
            cb(logs.logs);
          }
          else {
            console.log('new logs entry in added');
            cb(logs.logs);
          }
        });
      }

    });
  }


}

export function deleteLogs(user, blockId, cb){

  Log.findOne({'user': user}).exec(function (err, l) {

    if(err || !l || !blockId){
      cb();
    }
    if (!err && l) {
      //blocks for user already exist
      for (let i = l.logs.length - 1; i >= 0; i--) {
        if(l.logs[i].block.toHexString() === blockId){
          l.logs.splice(i, 1);
          delete l._id;
          // delete l.logs[i]._id;
          // l.logs[i].block = undefined;
          // break;
        }
      }

      l.save(function (err) {
        if (err) {
          console.log('could not delete log-block assignment for blockId '+blockId, err);
          cb(l.logs);
        }
        else {
          console.log('log-block assignment deleted');
          cb(l.logs);
        }
      });
    }

  });
}

// function isSameLog(log1, log2){
//   if(!log1 || !log2){
//     return false;
//   }
//   let date2 = new Date(Number(log2.timestamp));
//   // console.log('isSameLog:');
//   // console.log('log1.log', log1.log, 'log2.log', log2.log, log1.log === log2.log);
//   // console.log('log1.timestamp.getTime()', log1.timestamp.getTime(), 'date2.getTime()', date2.getTime(), log1.timestamp.getTime() === date2.getTime());
//   // console.log('log1.used', log1.used, 'log2.used', log2.used, log1.used === log2.used);
//
//   return (log1.log === log2.log && log1.timestamp.getTime() === date2.getTime());
// }
//
//

// function tagLogs(dbLogs, selection, blockId){
//
//   if(dbLogs && selection){
//     for(var i = 0; i < dbLogs.length; i++){
//       for(var j = 0; j < selection.length; j++){
//         if(isSameLog(dbLogs[i], selection[j])){
//           dbLogs[i].block = blockId;
//         }
//       }
//     }
//   }
//
//   return dbLogs;
//
// }

function clone(obj) {
  if (null == obj || "object" != typeof obj) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
}
