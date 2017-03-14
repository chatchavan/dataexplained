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
  // File.findAsync()
  //   .then(responseWithResult(res))
  //   .catch(handleError(res));
  return githubService.updateDirectory('test', './.idea', 'coldata', res);
}

// Load new files in filesystem
export function show(req, res) {
  let user = req.params.user;
  let timestamp = req.params.timestamp;
  let fileName = 'rstudio-workspace.zip';
  let ref = 'refs/heads/'+timestamp;

  let rScripts = config.env === 'development' ? './rstudio-workspace/' : '/home/' + user + '/rstudio-workspace/';

  console.log('getting files for '+user+' at '+timestamp);

 githubService.getContent(config.github.user, 'blocks', user, ref,
  function(re){
    let containsZip = false;
    for(let i = 0; i < re.data.length; i++){
      if(re.data[i].name === 'rstudio-workspace.zip'){
        containsZip = true;
        githubService.getContent(config.github.user, 'blocks', user+'/'+fileName, ref,
          function(re){
            // console.log(base64.decode(re.data.content));
            writeZipContent(re, res, rScripts);
          },
          function(err){
            //file does not exist yet
            console.log('file does not exist');
            return handleError(res);
          }
        );
      }
    }
    if(!containsZip){
      return res.status(200).end();
    }
  },
  function(err){
    //file does not exist yet
    console.log('err', err);
    return handleError(err);
  });



}

// Creates a new File in the DB
export function create(req, res) {
  let user = req.body.user;
  let timestamp = req.body.timestamp;
  if (user === undefined) {
    console.log('user undefined');
    return handleError(res);
  }
  if(timestamp == undefined){
    timestamp = new Date().getTime();
  }

  let message = 'block-commit_'+timestamp;

    let rScripts = config.env === 'development' ? './server/util' : '/home/' + user + '/rstudio-workspace';

    return githubService.updateDirectory(message, rScripts, user, res);
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

export function uploadRZip(user, file, timestamp, res) {

  githubService.getContent(config.github.user, file.repo, file.path, undefined,
    function(re){
      let sha = re.data.sha;
      githubService.updateFile(user, timestamp, sha, file, undefined, true, res);
    },
    function(err){
      console.log('file does not exist yet, creating new one');
      githubService.createFile(user, timestamp, file, undefined, true, res);
    });

}

function writeZipContent(re, res, rScripts) {
  fs.readFile(base64.decode(re.data.content), function (err, data) {
    if (err) {
      return handleError(res);
    }
    JSZip.loadAsync(data).then(function (zip) {

      let files = Object.keys(zip.files);
      if(files.length == 0){
        return res.status(200).end();
      }

      removeFiles(rScripts);

      for (let i = 0; i < files.length; i++) {
        let filename = files[i];
        zip.files[filename].async('nodebuffer').then(function (fileData) {
          console.log('writing file '+ filename);
          fs.writeFile(rScripts + filename, fileData, {mode: '0o755'},  function (err) {
            console.log("The file was saved!", rScripts + filename);
            if (i == files.length - 1) {
              return res.status(200).end();
            }
          });
        })

      }

    });
  });
}

function removeFiles(dirPath){
  try {
    var files = fs.readdirSync(dirPath);
  }
  catch(e) {
    return;
  }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile()){
        fs.unlinkSync(filePath);
        return;
      }
      else{
        removeFiles(filePath);
      }
    }
  // fs.rmdirSync(dirPath);
}

