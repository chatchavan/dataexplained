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

  click(option) {
    if (option.title === 'Logout') {
      console.log('logout');
      this.StorageUtil.removeSStorage('user', this.user);
      let iframeEl = document.getElementById('ide-iframe');
      iframeEl.src = iframeEl.src;
      this.deleteAllCookies();
      this.$state.reload();
    }
  }

  deleteAllCookies() {
    var cookies = document.cookie.split(";");
    console.log('cookies', cookies);

    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=34.253.169.17";
    }

  }


}

angular.module('rationalecapApp')
  .controller('NavbarController', NavbarController);
