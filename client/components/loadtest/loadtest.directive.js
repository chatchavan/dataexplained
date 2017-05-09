'use strict';

angular.module('rationalecapApp')
  .directive('loadtest', () => ({
    templateUrl: 'components/loadtest/loadtest.html',
    restrict: 'E',
    controller: 'LoadTestController',
    controllerAs: 'vm'
  }));
