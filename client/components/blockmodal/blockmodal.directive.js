'use strict';

angular.module('rationalecapApp')
  .directive('blockmodal', () => ({
    templateUrl: 'components/blockmodal/blockmodal.html',
    restrict: 'E',
    controller: 'BlockModalController',
    controllerAs: 'bmodal'
  }));
