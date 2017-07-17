'use strict';

angular.module('rationalecapApp')
  .directive('blockmodal_coder', () => ({
    templateUrl: 'components/blockmodal_coder/blockmodal_coder.html',
    restrict: 'E',
    controller: 'BlockModalCoderController',
    controllerAs: 'bmodal'
  }));
