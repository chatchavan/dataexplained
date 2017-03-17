/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/files              ->  index
 * POST    /api/files              ->  create
 * GET     /api/files/:id          ->  show
 * PUT     /api/files/:id          ->  update
 * DELETE  /api/files/:id          ->  destroy
 */

'use strict';

import _ from "lodash";
var File = require('./file.model');
var fs = require('fs');
var config = require('../../config/environment');
var githubService = require('../../util/github.service');
var GitHubApi = require("github");
var base64 = require('js-base64').Base64;
var async = require('async');
var JSZip = require("jszip");


function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
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

function handleEntityNotFound(res) {
  return function (entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function saveUpdates(updates) {
  return function (entity) {
    var updated = _.merge(entity, updates);
    return updated.saveAsync()
      .spread(updated => {
        return updated;
      });
  };
}

function removeEntity(res) {
  return function (entity) {
    if (entity) {
      return entity.removeAsync()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

// Gets a list of Files
export function index(req, res) {
  File.findAsync()
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Load new files in filesystem
export function show(req, res) {
  let user = req.params.user;
  let timestamp = req.params.timestamp;

  let rScripts = config.env === 'development' ? './rstudio-workspace/' : '/home/' + user + '/rstudio-workspace/';

  console.log('getting files for '+user+' at '+timestamp);

  getCommitByTimestamp(user, timestamp, function(commit){
    if(!commit){
      return res.status(404).send('no commit found for timestamp ' + timestamp);
    }
    githubService.restoreFiles(user, commit)
      .then((files) => {
        if(files === undefined){
          return res.status(404).send('could not find files on github');
        }

        removeFiles(rScripts);

        for (let i = 0; i < files.length; i++) {
          let filename = files[i].fileName;
          console.log('writing file '+ filename);
          if(filename !== 'blocks.txt'){
            fs.writeFile(rScripts + filename, files[i].content, {mode: '0o777'},  function (err) {
              if(!err){
                console.log("The file was saved!", rScripts + filename);
                fs.chmod(rScripts + filename, '777')
              }
              else{
                console.log('error writing file: ', err);
              }
              if (i == files.length - 1) {
                return res.status(200).end();
              }
            });
          }

        }
      });
  });



}

// Creates a new File in the DB
export function create(req, res) {
  let user = req.body.user;
  let timestamp = req.body.timestamp;
  if (user === undefined) {
    console.log('user undefined');
    return res.status(404).send('user undefined - could not create new file');

  }
  if(timestamp == undefined){
    timestamp = new Date().getTime();
  }

  let message = 'block-commit_'+timestamp;

    let rScripts = config.env === 'development' ? './rstudio-workspace' : '/home/' + user + '/rstudio-workspace';

    return githubService.updateDirectory(message, rScripts, user, timestamp, res);
}

// Updates an existing File in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  File.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Deletes a File from the DB
export function destroy(req, res) {
  File.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}


//HELPER FUNCTIONS

function getCommitByTimestamp(user, timestamp, callback){
  File.findOne({'user': user}).exec(function (errFind, files){
      if(errFind) {callback(undefined); return; }

      for(let commit in files.commits){
        if(files.commits[commit].timestamp === timestamp){
          callback(files.commits[commit].commit);
          return;
        }
      }
      callback(undefined);
     });
}

function removeFiles(dirPath){
  try {
    var files = fs.readdirSync(dirPath);
  }
  catch(e) {
    return;
  }
  if (files.length > 0){
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile()){
        fs.unlinkSync(filePath);
      }
      else{
        removeFiles(filePath);
      }
    }
  }

  // fs.rmdirSync(dirPath);
}
