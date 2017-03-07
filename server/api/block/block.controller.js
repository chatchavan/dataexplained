/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/blocks              ->  index
 * POST    /api/blocks              ->  create
 * GET     /api/blocks/:id          ->  show
 * PUT     /api/blocks/:id          ->  update
 * DELETE  /api/blocks/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
var Block = require('./block.model');
var fs = require('fs');
var config = require('../../config/environment');
var GitHubApi = require("github");
var base64 = require('js-base64').Base64;

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

// Gets a list of Blocks
export function index(req, res) {
  return res.status(200).json({'index': 'all'});
}

// Gets a single Block from the DB
export function show(req, res) {
  let user = req.params.user;

  // //TODO get file from user
  var github = authGithub();

  github.repos.getContent({
    owner: config.github.user,
    repo: 'blocks',
    path: user+'_blocks.txt'
  }).then((re) => {
    //file does exist
    console.log('file does exist');
    return res.status(200).json(base64.decode(re.data.content));
  }, (err) => {
    //file does not exist yet
    console.log('file does not exist');
    return res.status(200).json({});
  });


}

// Creates a new Block in the DB
export function create(req, res) {
  var content = req.body.blockString;
  var user = req.body.user;


  var github = authGithub();

  var file = {
    owner: config.github.user,
    repo: 'blocks',
    path: user+'_blocks.txt',
    message: 'auto commit',
    content: base64.encode(content)
  };

  github.repos.getContent({
    owner: config.github.user,
    repo: 'blocks',
    path: user+'_blocks.txt'
  }).then((re) => {

    //file does exist
    let sha = re.data.sha;
    let newContent = base64.decode(re.data.content)+'\\n'+ content;
    file.content = base64.encode(newContent);
    console.log('sha', sha);
    updateFile(github,sha, file, newContent, res);

  }, (err) => {
    //file does not exist yet
    console.log('file does not exist yet, creating new one');
    // console.log('errror', err)
    createFile(github, file, content, res);
  });


}

// Updates an existing Block in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  Block.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Deletes a Block from the DB
export function destroy(req, res) {
  Block.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

//HELPER FUNCTIONS
function createFile(github, file, content, res){
  github.repos.createFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY CREATED');
    console.log(re);
    return res.status(200).json(content);
  }, (err) => {
    console.log('file could not be created');
    console.log(err);
    return null;

  });
}


function updateFile(github, sha, file, content, res){
  file.sha = sha;
  github.repos.updateFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY UPDATED');
    // return base64.decode(re.data.content);
    return res.status(200).json(content);

  }, (err) => {
    console.log('file could not be updated');
    console.log(err);
    return null;
  });
}

function authGithub(){
  var github = new GitHubApi();
  github.authenticate({
    type: "basic",
    username: config.github.user,
    password: config.github.password
  });
  return github;
}
