'use strict';

angular.module('rationalecapApp')
  .directive('navbar', () => ({
    templateUrl: 'components/navbar/navbar.html',
    restrict: 'E',
    scope: {
      user: '<'
    },
    controller: 'NavbarController',
    controllerAs: 'nav'
  }));
