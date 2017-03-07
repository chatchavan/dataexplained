'use strict';

(function () {


  function UtilService() {
    var LogUtil = {

      formatLogs(logList){
        for (let log in logList) {
          let l = logList[log];
          logList[log] = {
            'timestamp': l.substr(0, l.indexOf(':')),
            'log': l.substr(l.indexOf(':') + 1, l.length)
          };
        }

        return logList;
      }


    };

    return LogUtil;
  }

  angular.module('rationalecapApp.util')
    .factory('LogUtil', UtilService);

})();
