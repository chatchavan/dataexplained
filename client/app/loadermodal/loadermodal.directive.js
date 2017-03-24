'use strict';

angular.module('rationalecapApp')
  .directive('loadermodal', () => ({
    templateUrl: 'components/loadermodal/loadermodal.html',
    restrict: 'E',
    controller: 'LoaderModalController',
    controllerAs: 'lmodal'
  }));
