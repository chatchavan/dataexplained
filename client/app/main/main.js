'use strict';

angular.module('rationalecapApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('main', {
        url: '/?survey',
        templateUrl: 'app/main/main.html',
        controller: 'MainController',
        controllerAs: 'main'
      });
  });
