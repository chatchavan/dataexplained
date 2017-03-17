'use strict';

class NavbarController {
  //start-non-standard
  menu = [
    // {'title': 'Home',
    // 'state': 'main'},
    // {'title': 'Logout'}
  ];

  isCollapsed = true;
  //end-non-standard

  constructor($scope, $state, StorageUtil) {
    this.user = $scope.user;
    this.$state = $state;
    this.StorageUtil = StorageUtil;
  }

  click(option){
    if(option.title === 'Logout'){
      console.log('logout');
      this.StorageUtil.removeSStorage('user',this.user);
      let iframeEl = document.getElementById('ide-iframe');
      iframeEl.src = iframeEl.src;
      this.$state.reload();
    }
  }
}

angular.module('rationalecapApp')
  .controller('NavbarController', NavbarController);
