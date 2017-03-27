'use strict';



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

exports.formatLogs = formatLogs;

