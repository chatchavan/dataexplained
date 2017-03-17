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
var fs = require('fs');
var config = require('../../config/environment');


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

// Gets a single Log from the DB
export function show(req, res) {
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
