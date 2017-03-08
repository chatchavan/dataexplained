'use strict';

(function () {


  function UtilService($window) {
    var StorageUtil = {

      saveSStorage(key, value){
        return $window.sessionStorage.setItem(key,value);
      },

      retrieveSStorage(key){
        return $window.sessionStorage.getItem(key);
      },

      removeSStorage(key){
        return $window.sessionStorage.removeItem(key);
      }

    };

    return StorageUtil;
  }

  angular.module('rationalecapApp.util')
    .factory('StorageUtil', UtilService);

})();
