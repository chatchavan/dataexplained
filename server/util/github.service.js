'use strict';

var mongoose = require('mongoose');
var config = require('../config/environment');
var GitHubApi = require("github");
var File = require('../api/file/file.model');
var fs = require('fs');
var Octokat = require('octokat');
var base64 = require('js-base64').Base64;



let m_repo;
let m_filesToCommit = [];
let m_filesToRestore = [];
let m_currentBranch = {};
let m_newCommit = {};


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

function createFile(file, content, res) {
  let github = authGithub();
  github.repos.createFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY CREATED');
      return res.status(200).json(content);
  }, (err) => {
    console.log('file could not be created:', err);
    return res.status(500).send('error in creating file' + err);


  });
}

function updateFile(sha, file, content, res) {
  let github = authGithub();
  file.sha = sha;
  github.repos.updateFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY UPDATED');
      return res.status(200).json(content);

  }, (err) => {
    console.log('file could not be updated', err);
    return res.status(500).send('error while updating file' + err);
  });
}


function createOrUpdateUserFiles(user, commit, timestamp, res) {

  let newRef = {
    timestamp: timestamp,
    commit: commit
  };

  File.findOne({'user': user}).exec(function (err, file) {

    if (err || !file) {
      //creating first entry for user
      let f = {
        user: user,
        commits: [newRef]
      };
      File.create(f, function (err, result) {
        if (err) {
          console.log('could not create file', err);
          // console.log(err);
          return res.status(500).send('error in creating file for user'+ user+':' + err);
        }
        else {
          console.log('new file entry created');
          return res.status(200).end();
        }
      });
    }
    else {
      //files for user already exist
      file.commits.push(newRef);
      file.save(function (err) {
        if (err) {
          console.log('could not save/update file', err);
          return res.status(500).send('error in saving/updating file for user'+ user+':' + err);
        }
        else {
          console.log('new file in added');
          return res.status(200).end();
        }
      });
    }

  });
}

function updateDirectory(message, dir, user, timestamp, res) {

  let octo = new Octokat({
    token: config.github.token
  });
  m_repo = octo.repos(config.github.user, 'blocks');

  fs.readdir(dir, function (err, filenames) {

    if (err) {
      console.log('err in readdir', err);
      return res.status(500).send('error in readdir:' + err);
    }

    var datas = [];
    var blocksIndex = filenames.indexOf('blocks.txt');    // <-- Not supported in <IE9
    if (blocksIndex !== -1) {
      filenames.splice(blocksIndex, 1);
    }

    for (let i = filenames.length - 1; i >= 0; i--) {
        console.log('reading file: ' + filenames[i]);
        fs.readFile(dir + '/' + filenames[i], 'utf8', function (err, data) {
            if (err) {
              console.log('err in readfile', err);
              return res.status(500).send('error in readfile:' + err);
            }
            datas.push({path: user + '/' + filenames[i], content: data});

            if (i <= 0) {
              return pushFiles(message, datas, user, timestamp, res);
            }
          }
        );
    }
  });


}

function restoreFiles(user, commit){

  m_filesToRestore = [];

  let octo = new Octokat({
    token: config.github.token
  });
  m_repo = octo.repos(config.github.user, 'blocks');

  return getTreeBySha(commit)
    .then((re) => getUserTreeFromTree(re.tree, user))
    .then((tree) => getFiles(tree))
    .then((r) => {
      if(r === undefined){
        return undefined;
      }
      return m_filesToRestore;
    });

}

function getTreeBySha(sha){
  return m_repo.git.trees(sha).fetch();
}
function getUserTreeFromTree(tree, user){
  for(let entry in tree){
    if(tree[entry].path === user){
      return getTreeBySha(tree[entry].sha);
    }
  }
  return undefined;
}

function getFiles(treeObject){
   if(!treeObject || !treeObject.tree){
      return undefined;
    }
    else{
     let promises = [];
     let tree = treeObject.tree;
     for (let i = 0; i < tree.length; i++) {
       promises.push(getFile(tree[i]));
     }
     return Promise.all(promises);
    }

}

function getFile(file){
  if(file.type === 'blob'){
    let gh = authGithub();
    return gh.gitdata.getBlob({owner: config.github.user, repo: 'blocks', sha: file.sha})
      .then((blob) => {
          let content = base64.decode(blob.data.content);
            m_filesToRestore.push({fileName: file.path , content: content});
      });

    // return m_repo.git.blobs(file.sha).read()
    //   .then((blob) => {
    //     m_filesToRestore.push({fileName: file.path , content: blob});
    //   });
  }
  else{
    return undefined;
  }

}

function pushFiles(message, files, user, timestamp, res) {
  m_newCommit = {};
  m_filesToCommit = [];
  return fetchHead()
    .then(() => getCurrentTreeSHA())
    .then(() => createFilesSilent(files))
    .then(() => createTree())
    .then(() => createCommit(message))
    .then((commit) => updateHead(commit))
    .then((head) => {
      return createOrUpdateUserFiles(user, m_newCommit.treeSHA, timestamp, res);
      //head.object.sh
      // return res.status(200).end()
    })
    .catch((e) => {
      console.error(e);
      return res.status(500).send('error while pushing files:' + e);

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

function createFilesSilent(files) {
  let promises = [];
  for (let i = 0; i < files.length; i++) {
    promises.push(createFileSilent(files[i]));
  }
  return Promise.all(promises);
}

function createFileSilent(file) {
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
exports.restoreFiles = restoreFiles;
