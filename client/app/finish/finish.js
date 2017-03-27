'use strict';

angular.module('rationalecapApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('finish', {
        url: '/finish',
        templateUrl: 'app/finish/finish.html',
        controller: 'FinishCtrl',
        controllerAs: 'vm',
        params: {
          loglist : null,
          dbLogs: null,
          blockList: null
        }
      });
  });
