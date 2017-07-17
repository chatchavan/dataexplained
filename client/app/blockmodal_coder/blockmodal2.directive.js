'use strict';

angular.module('rationalecapApp')
  .directive('blockmoda2l', () => ({
    templateUrl: 'components/blockmodal2/blockmodal2.html',
    restrict: 'E',
    controller: 'BlockModal2Controller',
    controllerAs: 'bmodal'
  }));
