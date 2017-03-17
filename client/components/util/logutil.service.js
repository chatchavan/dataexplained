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
      },

      markLogs(logList, blocks){
        for(var i = 0; i < logList.length; i++){
          logList[i].used = false;

          for(var j=0; j < blocks.length; j++){

            for(var k=0; k < blocks[j].contentRaw.length; k++){
              if(logList[i].timestamp === blocks[j].contentRaw[k].timestamp && logList[i].log === blocks[j].contentRaw[k].content){
                logList[i].used = true;
                break;
              }
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
