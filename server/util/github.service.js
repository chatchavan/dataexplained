'use strict';

var mongoose = require('mongoose');
var config = require('../config/environment');
var GitHubApi = require("github");
var File = require('../api/file/file.model');
var fs = require('fs');
var Octokat = require('octokat');
var base64 = require('js-base64').Base64;
var blockRepo = 'blocks';



let m_repo;
let m_filesToCommit = [];
let m_filesToRestore = [];
let m_currentBranch = {};
let m_currentTempTree = {};
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

function getContent(owner, repo, path, cbSuccess, cbError) {
  let github = authGithub();
  let params = {
    owner: owner,
    repo: repo,
    path: path
  };

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

function deleteFile(sha, file, content, res) {
  let github = authGithub();
  file.sha = sha;
  github.repos.deleteFile(file).then((re) => {
    console.log('FILE SUCCESSFULLY DELETED');
    return res.status(200).json(content);

  }, (err) => {
    console.log('file could not be deleted', err);
    return res.status(500).send('error while deleting file' + err);
  });
}


function updateDirectory(message, dir, user, timestamp, res) {

  let octo = new Octokat({
    token: config.github.token
  });
  m_repo = octo.repos(config.github.user, blockRepo);

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
            datas.push({path: user + '/' + filenames[i], filename: filenames[i], content: data});

            if (i <= 0) {
              return pushFiles(message, datas, user, timestamp, res);
            }
          }
        );
    }
  });


}

function updateDirectoryTemp(message, dir, user, timestamp, res) {

  let octo = new Octokat({
    token: config.github.token
  });
  m_repo = octo.repos(config.github.user, blockRepo);

  fs.readdir(dir, function (err, filenames) {

    if (err) {
      console.log('error in reading directory'+ dir+': ', err);
      return res.status(500).send('error in reading directory'+ dir+': ' + err);
    }

    var datas = [];
    filenames = filenames.filter(function(item){
      return typeof item == 'string' && item.indexOf('s-') > -1;
    });

    for (let i = filenames.length - 1; i >= 0; i--) {

        fs.readdir(dir+'/'+filenames[i], function(err2, filenames2){
          if (err2) {
            console.log('error in reading directory'+ dir+': ', err2);
            return res.status(500).send('error in reading directory'+ dir+': ' + err2);
          }

          filenames2 = spliceFilename(filenames2, 'lock_file');

          if(filenames2.length < 1){
            console.log('no files yet to save');
            return res.status(200).end();
          }

          for(let j = filenames2.length-1; j >= 0; j--){

            let fileDirectory = dir + '/' + filenames[i]+'/'+filenames2[j];

              fs.readFile(fileDirectory, 'utf8', function (errf, data) {
                    if (errf) {
                      console.log('error in reading file'+ fileDirectory+': ', errf);
                      return res.status(500).send('error in reading directory'+ fileDirectory+': ' + errf);
                    }
                    let dataParsed =  JSON.parse(data);
                    let tempPath = dataParsed.path;

                    if(!tempPath && dataParsed.properties && dataParsed.properties.tempName){
                      tempPath = dataParsed.properties.tempName+'.R';
                    }
                    if(tempPath){
                      let filename = tempPath.replace(/^.*[\\\/]/, '');
                      datas.push({path: user + '/' + filename, filename: filename, content: dataParsed.contents});
                    }


                if (i <= 0 && j <= 0) {
                  return pushFiles(message, datas, user, timestamp, res);
                }

              });

          }

        })


    }
  });

}

function deleteDirectory(user, cb){

  let octo = new Octokat({
    token: config.github.token
  });

  m_repo = octo.repos(config.github.user, blockRepo);

  m_newCommit = {};
  m_filesToCommit = [];
  return fetchHead()
    .then(() => spliceCurrentSubTreeSha(user))
    .then(() => {
    if(m_filesToCommit.length > 0){
      createTree()
      .then(() => createCommit('delete directory of '+ user))
      .then((commit) => updateHead(commit))
      .then((head) => {
        cb(true);
      })
    }
    else{
      //user files to delete were only ones left
      console.log('user files to delete were only ones left - cannot proceed');
      cb(true);
    }
    })
    .catch((e) => {
      console.error(e);
      cb(false);

    });
}


function createOrUpdateUserFiles(user, diffUrl, commit, timestamp, res) {

  let newRef = {
    timestamp: timestamp,
    commit: commit,
    diffUrl: diffUrl
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
          return res.status(500).send('error in creating file for user '+ user+':' + err);
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
          return res.status(500).send('error in saving/updating file for user '+ user+':' + err);
        }
        else {
          console.log('new file for user '+user+' in DB added');
          return res.status(200).end();
        }
      });
    }

  });
}


function restoreFiles(user, commit){

  m_filesToRestore = [];

  let octo = new Octokat({
    token: config.github.token
  });
  m_repo = octo.repos(config.github.user, blockRepo);

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
    return gh.gitdata.getBlob({owner: config.github.user, repo: blockRepo, sha: file.sha})
      .then((blob) => {
          let content = base64.decode(blob.data.content);
            m_filesToRestore.push({fileName: file.path , content: content});
      });

  }
  else{
    return undefined;
  }

}

function pushFiles(message, files, user, timestamp, res) {
  m_newCommit = {};
  m_filesToCommit = [];
  let diffUrl = 'https://github.com/nicost71/'+blockRepo+'/commit/';
  return fetchHead()
    // .then(() => deleteFilesSilent(user, files))
    .then(() => getCurrentTreeSHA())
    .then(() => createFilesSilent(files))
    .then(() => createTree())
    .then(() => createCommit(message))
    .then((commit) => {
      diffUrl = diffUrl+commit.sha+'.diff';
      updateHead(commit);
    })
    .then((head) => {
      return createOrUpdateUserFiles(user, diffUrl, m_newCommit.treeSHA, timestamp, res);
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

function spliceCurrentSubTreeSha(user){
  return m_repo.git.trees(m_currentBranch.commitSHA).fetch()
    .then((tree) => {
    m_currentTempTree = tree;
      if(tree.tree){
        for(let i = tree.tree.length-1; i >= 0; i--){
          if(tree.tree[i].path !== user){
            m_filesToCommit.push(tree.tree[i]);
          }
        }
      }
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

function spliceFilename(filenames, name){
  var index = filenames.indexOf(name);    // <-- Not supported in <IE9
  if (index !== -1) {
    filenames.splice(index, 1);
  }
  return filenames;
}

exports.updateDirectory = updateDirectory;
exports.updateDirectoryTemp = updateDirectoryTemp;
exports.authGithub = authGithub;
exports.getContent = getContent;
exports.createFile = createFile;
exports.updateFile = updateFile;
exports.deleteFile = deleteFile;
exports.deleteDirectory = deleteDirectory;
exports.restoreFiles = restoreFiles;
