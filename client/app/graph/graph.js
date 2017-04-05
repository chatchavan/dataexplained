'use strict';

angular.module('rationalecapApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('graph', {
        url: '/graph',
        templateUrl: 'app/graph/graph.html',
        controller: 'GraphCtrl',
        controllerAs: 'vm',
        params: {
          blocks : null,
          finished: null
        }
      });
  });
