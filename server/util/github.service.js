'use strict';

var mongoose = require('mongoose');
var config = require('../config/environment');
var GitHubApi = require("github");
var File = require('../api/file/file.model');
var fs = require('fs');
var Octokat = require('octokat');


let m_repo;
let m_filesToCommit = [];
let m_currentBranch = {};
let m_newCommit = {};


function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
  };
}

function authGithub() {
  var github = new GitHubApi();
  github.authenticate({
    type: "basic",
    username: config.github.user,
    password: config.github.password
  });
  return github;
}

function getContent(owner, repo, path, ref, cbSuccess, cbError) {
  let github = authGithub();
  let params = {
    owner: owner,
    repo: repo,
    path: path
  };
  if (ref) {
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

function createFile(user, timestamp, file, content, withReference, res) {
  let github = authGithub();
  github.repos.createFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY CREATED');
    if (withReference) {
      createReference(user, re.data.commit.sha, content, timestamp, res);
    }
    else {
      return res.status(200).json(content);
    }
  }, (err) => {
    console.log('file could not be created');
    console.log(err);
    return handleError(res);

  });
}

function updateFile(user, timestamp, sha, file, content, withReference, res) {
  let github = authGithub();
  file.sha = sha;
  github.repos.updateFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY UPDATED');
    // return base64.decode(re.data.content);
    if (withReference) {
      createReference(user, re.data.commit.sha, content, timestamp, res);
    }
    else {
      return res.status(200).json(content);
    }

  }, (err) => {
    console.log('file could not be updated');
    console.log(err);
    return handleError(res);
  });
}

function createReference(user, commitSha, content, timestamp, res) {
  let github = authGithub();
  let newRef = 'refs/heads/' + timestamp;
  console.log('creating reference: ' + newRef);


  github.gitdata.createReference({
    owner: config.github.user,
    repo: 'blocks',
    sha: commitSha,
    ref: newRef
  }).then((re) => {
    console.log('reference created', re);
    createOrUpdateUserFiles(user, newRef, timestamp);
    return res.status(200).json(content);

  }, (err) => {
    //file does not exist yet
    console.log('could not create reference', err);
    return handleError(res);
  });

  // return res.status(200).json(content);

}

function createOrUpdateUserFiles(user, ref, timestamp) {

  let newRef = {
    timestamp: timestamp,
    ref: ref
  };

  File.findOne({'user': user}).exec(function (err, file) {

    if (err || !file) {
      console.log('Something is wrong with finding the files');
      console.log(err);
      let f = {
        user: user,
        commits: [newRef]
      };
      File.create(f, function (err, result) {
        if (err) {
          console.log('could not create file', err);
        }
        else {
          console.log('file cerated', result);
        }
      });
    }
    else {
      console.log('file from user exits');
      file.commits.push(newRef);
      file.save(function (err) {
        if (err) {
          console.log('could not save/update file', err);
        }
        else {
          console.log('file in mongodb updated');
        }
      });
    }

  });
}

function updateDirectory(message, dir, user, res) {

  let octo = new Octokat({
    token: config.github.token
  });
  m_repo = octo.repos(config.github.user, 'blocks');

  fs.readdir(dir, function (err, filenames) {

    if (err) {
      console.log('err in readdir', err);
      return handleError(res);
    }

    var datas = [];

    for (let i = filenames.length - 1; i >= 0; i--) {

      if (filenames[i] && !filenames[i].endsWith('.zip')) {

        console.log('reading file: ' + filenames[i]);
        fs.readFile(dir + '/' + filenames[i], 'utf8', function (err, data) {
            if (err) {
              console.log('err in readfile', err);
              return handleError(res);
            }

            datas.push({path: user + '/' + filenames[i], content: data});

            if (i <= 0) {
              return pushFiles(message, datas, res);
            }
          }
        );
      }
      else {
        filenames.splice(i, 1);
      }
    }
  });


}

function pushFiles(message, files, res) {
  return fetchHead()
    .then(() => getCurrentTreeSHA())
    .then(() => createFiles(files))
    .then(() => createTree())
    .then(() => createCommit(message))
    .then((commit) => updateHead(commit))
    .then(() => {
      console.log('files pushed');
      return res.status(200).end()
    })
    .catch((e) => {
      console.error(e);
      return handleError(res);
    });
}


function fetchHead() {
  return m_repo.git.refs.heads('master').fetch()
    .then((ref) => {
      m_currentBranch.commitSHA = ref.object.sha;
    });
}

function getCurrentTreeSHA() {
  return m_repo.git.trees(m_currentBranch.commitSHA).fetch()
    .then((tree) => {
      m_currentBranch.treeSHA = tree.sha;
    });
}

function createFiles(files) {
  let promises = [];
  for (let i = 0; i < files.length; i++) {
    promises.push(createFile(files[i]));
  }
  return Promise.all(promises);
}

function createFile(file) {
  return m_repo.git.blobs.create({
    content: file.content,
    encoding: 'utf-8'
  })
    .then((blob) => {
      m_filesToCommit.push({
        sha: blob.sha,
        path: file.path,
        mode: '100644',
        type: 'blob'
      });
    });

}

function createTree() {
  return m_repo.git.trees.create({
    tree: m_filesToCommit,
    base_tree: m_currentBranch.treeSHA
  })
    .then((tree) => {
      m_newCommit.treeSHA = tree.sha;
    });
}

function createCommit(message) {
  return m_repo.git.commits.create({
    message: message,
    tree: m_newCommit.treeSHA,
    parents: [
      m_currentBranch.commitSHA
    ]
  });
}

function updateHead(commit) {
  return m_repo.git.refs.heads('master').update({
    sha: commit.sha
  });
}

exports.updateDirectory = updateDirectory;
exports.authGithub = authGithub;
exports.getContent = getContent;
exports.createFile = createFile;
exports.updateFile = updateFile;
exports.createReference = createReference;
