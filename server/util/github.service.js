'use strict';

var mongoose = require('mongoose');
var config = require('../config/environment');
var GitHubApi = require("github");
var File = require('../api/file/file.model');


function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
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

function getContent(owner, repo, path, ref, cbSuccess, cbError){
  let github = authGithub();
  let params = {
    owner: owner,
    repo: repo,
    path: path
  };
  if(ref){
    params.ref = ref;
  }

  github.repos.getContent(params).then((re) => {
    //file does exist
    cbSuccess(re);
  }, (err) => {
    //file does not exist yet
    cbError(err);
  });

}

function createFile(user, timestamp, file, content, withReference, res){
  let github = authGithub();
  github.repos.createFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY CREATED');
    if(withReference){
      createReference(user, re.data.commit.sha, content, timestamp, res);
    }
    else{
      return res.status(200).json(content);
    }
  }, (err) => {
    console.log('file could not be created');
    console.log(err);
    return handleError(res);

  });
}

function updateFile(user, timestamp, sha, file, content, withReference, res){
  let github = authGithub();
  file.sha = sha;
  github.repos.updateFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY UPDATED');
    // return base64.decode(re.data.content);
    if(withReference){
      createReference(user, re.data.commit.sha, content, timestamp, res);
    }
    else{
      return res.status(200).json(content);
    }

  }, (err) => {
    console.log('file could not be updated');
    console.log(err);
    return handleError(res);
  });
}

function createReference(user, commitSha, content, timestamp, res){
  let github = authGithub();
  let newRef = 'refs/heads/'+timestamp;
  console.log('creating reference: '+ newRef);


  github.gitdata.createReference({
    owner: config.github.user,
    repo: 'blocks',
    sha: commitSha,
    ref: newRef
  }).then((re) => {
    console.log('reference created', re);
    createOrUpdateUserFiles(user, newRef,  timestamp);
    return res.status(200).json(content);

  }, (err) => {
    //file does not exist yet
    console.log('could not create reference', err);
    return handleError(res);
  });

  // return res.status(200).json(content);

}

function createOrUpdateUserFiles(user, ref, timestamp){

  let newRef = {
    timestamp: timestamp,
    ref: ref
  };

  File.findOne({'user': user}).exec(function(err, file){

    if(err || !file){
      console.log('Something is wrong with finding the files');
      console.log(err);
      let f = {
        user: user,
        commits : [newRef]
      };
      File.create(f, function(err, result) {
        if(err) {
          console.log('could not create file', err);
        }
        else{
          console.log('file cerated', result);
        }
      });
    }
    else{
      console.log('file from user exits');
      file.commits.push(newRef);
      file.save(function (err) {
        if(err) {
          console.log('could not save/update file', err);
        }
        else{
          console.log('file in mongodb updated');
        }
      });
    }

  });
}

exports.authGithub = authGithub;
exports.getContent = getContent;
exports.createFile = createFile;
exports.updateFile = updateFile;
exports.createReference = createReference;
