'use strict';

(function () {


  function UtilService() {
    var LogUtil = {

      /**
       * process Logs from RStudio (143789794:My log action) and save it in logList-Array
       * */
      formatLogs(fileLogs, dbLogs){
        if(!fileLogs){
          return fileLogs;
        }

        fileLogs.splice(fileLogs.length-1,1); //remove empty last line
        for (let log in fileLogs) {
          let l = fileLogs[log];
          fileLogs[log] = {
            'timestamp': l.substr(0, l.indexOf(':')),
            'log': l.substr(l.indexOf(':') + 1, l.length)
          };
        }

        return LogUtil.markLogs(fileLogs, dbLogs);
      },

      markLogs(logList, dbLogs){
        if(!logList || !dbLogs){
          return logList;
        }

        for(var i = 0; i < logList.length; i++){
          logList[i].used = false;

          for(var j=0; j < dbLogs.length; j++){
            let logTime = Number(logList[i].timestamp);
            let dbLogTime = new Date(dbLogs[j].timestamp).getTime();
            if(logTime === dbLogTime && logList[i].log === dbLogs[j].log){
              logList[i].used = true;
              break;
            }
          }

        }
        return logList;
      }

    };

    return LogUtil;
  }

  angular.module('rationalecapApp.util')
    .factory('LogUtil', UtilService);

})();
