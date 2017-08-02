/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/configurations              ->  index
 * POST    /api/configurations              ->  create
 * GET     /api/configurations/:id          ->  show
 * PUT     /api/configurations/:id          ->  update
 * DELETE  /api/configurations/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
var Configuration = require('./configuration.model');
var User = require('./../user/user.model');
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

// Gets a list of Configurations
export function index(req, res) {
  Configuration.findAsync()
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Gets a single Configuration from the DB
export function show(req, res) {
  Configuration.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Gets a single Configuration from the DB
export function showEnv(req, res) {
  return res.status(200).json(config.env);
}

//Shows all codes this user has used so far
export function showCodes(req, res) {
  let coderId = req.user._id;
  User.findOne({'_id': coderId}).exec(function (errFind, user) {
    if (!user || errFind) {
      return res.status(404).end();
    }
    else{
      return res.status(200).json(user.codes);
    }
  });
}

//Shows all codes from all users (global)
export function showAllCodes(req, res){
  Configuration.find({}, function(err, conf){

    if(err || conf.length <=0){
      return res.status(404).end();
    }
    else{
      return res.status(200).json(conf[0].codes);
    }

  });
}

// Creates a new Configuration in the DB
export function create(req, res) {
  let survey = req.body.survey;
  if(survey === undefined){
    return res.status(500).end();
  }
  Configuration.find({}, function (err, configuration) {
    if (err) { return handleError(res, err); }
    if(!configuration || configuration.length < 1) {
      console.log('no config found');
      Configuration.createAsync(req.body)
        .then(responseWithResult(res, 201))
        .catch(handleError(res));
    }
    else{
      configuration[0].survey = survey;
      configuration[0].save(function (err) {
        if (err) { return handleError(res, err); }
        return res.send(configuration);
      });
    }
  });
}

export function updateCodes(req, res){
  let allCodes = req.body.allCodes; //all Codes from updated Block
  let coder = req.body.coder;

  //Update all codes (global)
  Configuration.find({}, function(err, conf){

    if(!err && conf.length > 0){

      let codes = conf[0].codes;
      for(let i = 0; i < allCodes.length; i++){
        if (codes.indexOf(allCodes[i]) === -1) {
          codes.push(allCodes[i]);
        }
      }

      delete conf[0]._id;
      conf[0].codes = codes;

      conf[0].save(function (err) {
        if (err) {
          console.log('could not update configuration codes', err);
        }

      });
    }

  });

  //Update codes from users
  let codes = coder.codes;
  for(let i = 0; i < allCodes.length; i++){
    if (codes.indexOf(allCodes[i]) === -1) {
      codes.push(allCodes[i]);
    }
  }
  coder.codes = codes;
  if(!coder._id){
    return res.status(400).end();
  }
  User.findByIdAsync(coder._id)
    .then(user => {
      if (!user) {
        console.log('could not update user with codes');
        return res.status(200).json(coder);
      }
      delete coder._id;
      let updated = _.extend(user, coder);
      return updated.saveAsync()
        .spread(updated => {
          return res.status(200).json(updated);
        });
    })
    .catch(err => res.status(500).send(err));

}

// Updates an existing Configuration in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  Configuration.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Deletes a Configuration from the DB
export function destroy(req, res) {
  Configuration.findByIdAsync(req.params.id)
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
