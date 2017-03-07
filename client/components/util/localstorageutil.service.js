'use strict';

(function () {


  function UtilService($window) {
    var LocalStorageUtil = {

      save(key, value){
        return $window.localStorage.setItem(key,value);
      },

      retrieve(key){
        return $window.localStorage.getItem(key);
      },

      remove(key){
        return $window.localStorage.removeItem(key);
      }

    };

    return LocalStorageUtil;
  }

  angular.module('rationalecapApp.util')
    .factory('LocalStorageUtil', UtilService);

})();
