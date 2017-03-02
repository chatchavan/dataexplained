/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/things              ->  index
 * POST    /api/things              ->  create
 * GET     /api/things/:id          ->  show
 * PUT     /api/things/:id          ->  update
 * DELETE  /api/things/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
var Thing = require('./thing.model');
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

// Gets a list of Things
export function index(req, res) {
  // Thing.findAsync()
  //   .then(responseWithResult(res))
  //   .catch(handleError(res));

  fs.readFile('./history_database', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    console.log(data);
        var result = {'content': data.toString()};
        // responseWithResult(result);
    return res.status(200).json(result);
  });


}

// Gets a single Thing from the DB
export function show(req, res) {
  Thing.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Creates a new Thing in the DB
export function create(req, res) {
  // Thing.createAsync(req.body)
  //   .then(responseWithResult(res, 201))
  //   .catch(handleError(res));

  // fs.writeFile(pathlocal, "Hey there!", function(err) {
  //   if(err) {
  //     return console.log(err);
  //   }
  //   console.log("The file was saved!");
  //
  //
  //
  //
  // })

  var content = req.body.block;


  var github = new GitHubApi();
  github.authenticate({
    type: "basic",
    username: config.github.user,
    password: config.github.password
  });

  var file = {
    owner: config.github.user,
    repo: 'blocks',
    path: 'block.txt',
    message: 'auto commit',
    content: base64.encode(content)
  };

  github.repos.getContent({
    owner: config.github.user,
    repo: 'blocks',
    path: 'block.txt'
  }).then((re) => {

    //file does exist
    let sha = re.data.sha;
    console.log('sha', sha);
    updateFile(github,sha, file);

  }, (err) => {
    //file does not exist yet
    console.log('file does not exist yet, creating new one');
    // console.log('errror', err)
    createFile(github, file);
  });

  return '';


}

// Updates an existing Thing in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  Thing.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Deletes a Thing from the DB
export function destroy(req, res) {
  Thing.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}


///HELPER FUNCTIONS
function createFile(github, file){
  github.repos.createFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY CREATED');
    console.log(re);
  }, (err) => {
    console.log('file could not be created');
    console.log(err);

  });
}


function updateFile(github, sha, file){
  file.sha = sha;
  github.repos.updateFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY UPDATED');
  }, (err) => {
    console.log('file could not be updated');
    console.log(err);
  });
}
