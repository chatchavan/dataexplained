'use strict';

class NavbarController {
  //start-non-standard
  menu = [{
    'title': 'Home',
    'state': 'main'
  }];

  isCollapsed = true;
  //end-non-standard

  constructor($scope) {
    this.user = $scope.user;
  }
}

angular.module('rationalecapApp')
  .controller('NavbarController', NavbarController);
