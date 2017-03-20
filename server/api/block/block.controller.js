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

var blockPrefix = '//startBlock\\n';
var blockSuffix = '//endBlock\\n';


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

  githubService.getContent(config.github.user, 'blocks',  user+'/blocks.txt',
    function(re){
      //file does exist
      let blockString = base64.decode(re.data.content);
      let ids = getBlocksFromBlockString(blockString);
      getBlocksByIds(user, ids, function(blocks){
        if(!blocks){
          return res.status(404).end();
        }
        return res.status(200).json(blocks);
      });


    },
    function(err){
      //file does not exist
      return res.status(200).json({});
    });


}

// Creates a new Block in the DB
export function create(req, res) {
  let block = req.body.block;
  let blockString = block.blockString;
  let user = req.body.user;
  console.log('creating block', blockString);


  var file = {
    owner: config.github.user,
    repo: 'blocks',
    path: user+'/blocks.txt',
    message: 'auto commit'
  };

  githubService.getContent(config.github.user, file.repo, file.path,
    function(re){
        let sha = re.data.sha;
        let oldContent = base64.decode(re.data.content);
        // file.content = base64.encode(newContent);
        createOrUpdateBlocks(user, block, function(updatedBlock, userBlocks){
          if(!updatedBlock || userBlocks){
            return res.status(500).end();
          }
          oldContent+= blockPrefix+updatedBlock._id+'\\n'+blockSuffix;
          file.content = base64.encode(oldContent);

          githubService.updateFile(sha, file, userBlocks, res);
        });

    },
    function(err){
        console.log('file does not exist yet, creating new one');
      createOrUpdateBlocks(user, block, function (createdBlock, userBlocks){
        console.log('created new list with block', createdBlock);
        if(!createdBlock || userBlocks){
          return res.status(500).end();
        }
        file.content = base64.encode(blockPrefix+createdBlock._id+'\\n/'+blockSuffix);

        githubService.createFile(file, userBlocks, res);
      });

    });

}

// Updates an existing Block in the DB
export function update(req, res) {
  let block = req.body.block;
  let blockCopy = clone(block);
  console.log('updating block', block);
  let user = req.body.user;

  Block.findOne({'user': user}).exec(function (err, b) {

    if (err || !b) {
      //creating first entry for user
      return res.status(404).end();
    }
    else {
      for(var i = 0; i < b.blocks.length; i++){
        if(b.blocks[i]._id.toHexString() === block._id){
              delete b.blocks[i]._id;
              b.blocks[i].title = block.title;
              b.blocks[i].goal = block.goal;
              b.blocks[i].alternatives = block.alternatives;
              b.blocks[i].criteria = block.criteria;
              b.blocks[i].preconditions = block.preconditions;
              b.blocks[i].content = block.content;

        }
      }
      b.save(function (err) {
        if (err) {
          console.log('could not save/update block for user '+user, err);
          return res.status(200).json(blockCopy);


        }
        else {
          console.log('block updated');
          return res.status(200).json(block);
        }
      });


    }

  });

}

// Deletes a Block from the DB (send new BlockString without oldBlock -> hardUpdate)
export function destroy(req, res) {
  let blockId = req.params.blockId;;
  console.log('deleting block', blockId);
  let user = req.params.user;

  var file = {
    owner: config.github.user,
    repo: 'blocks',
    path: user+'/blocks.txt',
    message: 'auto commit - delete',
  };

  githubService.getContent(config.github.user, file.repo, file.path,
    function(re){
      let sha = re.data.sha;
      let oldContent = base64.decode(re.data.content);
      deleteBlock(user, blockId, function(userBlocks){
        if(userBlocks){
          let newContent = base64.encode(deleteBlockFromBlockString(blockId, oldContent));
          file.content = newContent;
          if(newContent && newContent.length > 0){
            githubService.updateFile(sha, file, userBlocks, res);
          }
          else{
            githubService.deleteFile(sha, file, userBlocks, res);
          }

        }
        else{
          return res.status(500).end();
        }


      });

    },
    function(err){
      console.log('block does not exist: ', err);
      return res.status(404).end();

    });


}


//HELPER FUNCTIONS
function createOrUpdateBlocks(user, newBlock, cb) {

  Block.findOne({'user': user}).exec(function (err, block) {

    if (err || !block) {
      //creating first entry for user
      let b = {
        user: user,
        blocks: [newBlock]
      };
      Block.create(b, function (err, result) {
        if (err) {
          console.log('could not create block-entry for user '+user, err);
          cb();
        }
        else {
          console.log('new block entry created');
          cb(result.blocks[0],result.blocks);
        }
      });
    }
    else {
      //blocks for user already exist
      block.blocks.push(newBlock);
      block.save(function (err) {
        if (err) {
          console.log('could not save/update block for user '+user, err);
          cb();
        }
        else {
          console.log('new block entry in added');
          cb(block.blocks[block.blocks.length-1], block.blocks);
        }
      });
    }

  });
}
function deleteBlock(user, blockId, cb) {

  Block.findOne({'user': user}).exec(function (err, b) {

    if (err || !b) {
      cb();
    }
    else {
      //blocks for user already exist
      for(var i = 0; i < b.blocks.length; i++){
        if(b.blocks[i]._id.toHexString() === blockId){
          b.blocks.splice(i,1);
          break;

        }
      }
      b.save(function (err) {
        if (err) {
          console.log('could not delete block for user '+user, err);
          cb();
        }
        else {
          console.log('block entry deleted');
          cb(b.blocks);
        }
      });
    }

  });
}


function clone(obj) {
  if (null == obj || "object" != typeof obj) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
}

function getBlocksByIds(user, ids, cb){

  Block.findOne({'user': user}).exec(function (err, b) {

    if (err || !b) {
      //creating first entry for user
      return cb();
    }
    else {
      let blocks =[];
      for(var i = 0; i < b.blocks.length; i++){
        let index = ids.indexOf(b.blocks[i]._id.toHexString());
        if(index > -1){
          blocks.push(b.blocks[i]);
        }
      }
      return cb(blocks);

    }

  });

}


function getBlocksFromBlockString(blockString){


  var split = blockString.split('\\n');
  var ids = [];

  for(let i = 0; i < split.length; i++){
      let indexPrefix = split[i].indexOf(blockPrefix);
      let indexSuffix = split[i].indexOf(blockSuffix);
     if(indexPrefix < 0 && indexSuffix  < 0 && split[i].length > 0){
      ids.push(split[i]);
    }
  }
  return ids;
}

function deleteBlockFromBlockString(blockId, blockString){
  let blockS = blockPrefix+blockId+'\\n/'+blockSuffix;
  let index= blockString.indexOf(blockS);
  if(index >= 0){
    blockString = blockString.substr(0,index) + blockString.substr(index+blockS.length);
  }
  return blockString;
}
