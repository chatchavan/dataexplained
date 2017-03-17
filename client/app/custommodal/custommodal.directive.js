'use strict';

angular.module('rationalecapApp')
  .directive('custommodal', () => ({
    templateUrl: 'components/custommodal/custommodal.html',
    restrict: 'E',
    controller: 'CustomModalController',
    controllerAs: 'cmodal'
  }));
