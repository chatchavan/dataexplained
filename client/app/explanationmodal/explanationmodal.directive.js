'use strict';

angular.module('rationalecapApp')
  .directive('explanationmodal', () => ({
    templateUrl: 'components/explanationmodal/explanationmodal.html',
    restrict: 'E',
    controller: 'ExplanationModalController',
    controllerAs: 'vm'
  }));
