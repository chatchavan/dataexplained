'use strict';

class LoginController {
  //start-non-standard
  user = {};
  errors = {};
  submitted = false;
  //end-non-standard

  constructor(Auth, $state, StorageUtil, $http) {
    this.Auth = Auth;
    this.$state = $state;
    this.StorageUtil = StorageUtil;
    this.$http = $http;

    this.checkSession();
  }

  checkSession(){
   let user = this.StorageUtil.retrieveSStorage('user');
   if(user){
     this.doLogin(user, user);
   }

  }

  login(form) {
    this.submitted = true;

    if (form.$valid) {
      this.doLogin(this.user.username, this.user.password);
    }
  }

  doLogin(username, password){
    this.Auth.login({
      username: username,
      password: password
    })
      .then((u) => {
        // Logged in, redirect to home
        this.StorageUtil.saveSStorage('user',this.user.username);
        if(this.Auth.isAdmin()){
          this.$state.go('admin');
        }
        else if(u.finished){
          this.$state.go('^.graph', {'finished': true});
        }
        else if(u.surveyDone){
          this.$state.go('^.main');
        }
        else{
          this.$http.get('/api/configurations/').then(response => {
            let survey = true;
            if(response.data && response.data.length>0){
              survey = response.data[0].survey;
            }
            else if(response.data && response.data.survey !== undefined){
              survey = response.data.survey;
            }
            if(survey){
              this.$state.go('^.survey');
            }
            else{
              this.$state.go('^.main');
            }
          }, (err) => {
            console.log('error getting configuration: ', err);
            this.$state.go('^.survey');
          });
        }
      })
      .catch(err => {
        this.errors.other = err.message;
      });
  }
}

angular.module('rationalecapApp')
  .controller('LoginController', LoginController);
