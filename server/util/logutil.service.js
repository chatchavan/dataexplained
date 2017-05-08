'use strict';


/**
 * Returns path log-file according to Platform
 * */

function getLogHistoryPath(platform, user, env, fs, cb){

  //=====RSTUDIO======
  if(platform === 'rstudio'){
    let history = env === 'development' ? './history_database' : '/home/'+user+'/.rstudio/history_database';
    cb(history);
  }

  //=====JUPYTER======
  else if(platform === 'jupyter'){

    if(env === 'development'){
      cb('./test.ipynb');
    }
    else {
      fs.readdir('/home/' + user + '/.jupyter/notebooks', function (err, filenames) {
        if (!err && filenames.length > 0) {
          cb(filenames[0]);
        }
        else {
          console.log('err in readdir', err);
          cb();
        }

      });
    }
  }


  //=====NONE======
  else{
    cb();
  }


}

/**
 * process Logs from RStudio (143789794:My log action) and save it in logList-Array
 * */
function formatLogs(logList){
  logList.splice(logList.length-1,1); //remove empty last line
  for (let log in logList) {
    let l = logList[log];
    logList[log] = {
      'timestamp': l.substr(0, l.indexOf(':')),
      'log': l.substr(l.indexOf(':') + 1, l.length)
    };
  }

  return logList;
}

exports.getLogHistoryPath = getLogHistoryPath;
exports.formatLogs = formatLogs;

