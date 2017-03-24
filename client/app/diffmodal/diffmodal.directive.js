'use strict';

angular.module('rationalecapApp')
  .directive('diffmodal', () => ({
    templateUrl: 'components/diffmodal/diffmodal.html',
    restrict: 'E',
    controller: 'DiffModalController',
    controllerAs: 'dmodal'
  }));
