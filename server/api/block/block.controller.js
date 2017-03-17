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
var githubService = require('../../util/github.service');
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

  githubService.getContent(config.github.user, 'blocks',  user+'/blocks.txt', undefined,
    function(re){
      //file does exist
      return res.status(200).json(base64.decode(re.data.content));
    },
    function(err){
      //file does not exist
      return res.status(200).json({});
    });


}

// Creates a new Block in the DB
export function create(req, res) {
  let content = req.body.block.blockString;
  let user = req.body.user;
  let timestamp = req.body.block.timestamp;

  var file = {
    owner: config.github.user,
    repo: 'blocks',
    path: user+'/blocks.txt',
    message: 'auto commit',
    content: base64.encode(content)
  };

  githubService.getContent(config.github.user, file.repo, file.path, undefined,
    function(re){
        let sha = re.data.sha;
        let newContent = base64.decode(re.data.content)+'\\n'+ content;
        file.content = base64.encode(newContent);
        githubService.updateFile(sha, file, newContent, res);
    },
    function(err){
        console.log('file does not exist yet, creating new one');
        githubService.createFile(file, content, res);
    });

}

// Updates an existing Block in the DB
export function update(req, res) {
  let content = req.body.blockString;
  let user = req.body.user;

  var file = {
    owner: config.github.user,
    repo: 'blocks',
    path: user+'/blocks.txt',
    message: 'auto commit (update Block)',
    content: base64.encode(content)
  };

  githubService.getContent(config.github.user, file.repo, file.path, undefined,
    function(re){
      let sha = re.data.sha;
      githubService.updateFile(sha, file, content, res);
    },
    function(err){
      console.log('file does not exist yet, coudl not update');
      return handleError(res);
    });
}

// Deletes a Block from the DB (send new BlockString without oldBlock -> hardUpdate)
export function destroy(req, res) {
  Block.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
