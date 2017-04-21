'use strict';

angular.module('rationalecapApp')
  .directive('labelmodal', () => ({
    templateUrl: 'components/labelmodal/labelmodal.html',
    restrict: 'E',
    controller: 'LabelModalController',
    controllerAs: 'vm'
  }));
