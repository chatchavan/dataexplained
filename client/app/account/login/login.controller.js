'use strict';

class LoginController {
  //start-non-standard
  user = {};
  errors = {};
  submitted = false;
  //end-non-standard

  constructor(Auth, $state, StorageUtil) {
    this.Auth = Auth;
    this.$state = $state;
    this.StorageUtil = StorageUtil;
  }

  login(form) {
    this.submitted = true;

    if (form.$valid) {
      this.Auth.login({
        username: this.user.username,
        password: this.user.password
      })
      .then(() => {
        // Logged in, redirect to home
        this.StorageUtil.saveSStorage('user',this.user.username);
        if(this.Auth.isAdmin()){
          this.$state.go('admin');
        }
        else{
          this.$state.go('^.main');
        }
      })
      .catch(err => {
        this.errors.other = err.message;
      });
    }
  }
}

angular.module('rationalecapApp')
  .controller('LoginController', LoginController);
