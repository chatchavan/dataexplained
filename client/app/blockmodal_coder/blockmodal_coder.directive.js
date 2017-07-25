'use strict';

angular.module('rationalecapApp')
  .directive('blockmodal_coder', () => ({
    templateUrl: 'app/modals/blockmodal_coder/blockmodal_coder.html',
    restrict: 'E',
    controller: 'BlockModalCoderController',
    controllerAs: 'bmodal'
  }));
