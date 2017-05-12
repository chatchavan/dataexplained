'use strict';

angular.module('rationalecapApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('faq', {
        url: '/faq',
        templateUrl: 'app/faq/faq.html',
        controller: 'FaqCtrl',
        controllerAs: 'vm',
        params: {
          prevState : null
        }
      });
  });
