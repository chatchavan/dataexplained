(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('SurveyCtrl', SurveyCtrl);

  function SurveyCtrl($http) {

    var vm = this;
    vm.init = init;

    vm.init();

    function init(){
      $http.get('/api/configurations/env').then(response => {
        vm.env = response.data;
      }, (err) => {
        console.log(err);
      });
    }

  }
})();
