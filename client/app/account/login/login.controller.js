'use strict';

class LoginController {
  //start-non-standard
  user = {};
  errors = {};
  submitted = false;
  //end-non-standard

  constructor(Auth, $state) {
    this.Auth = Auth;
    this.$state = $state;
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
