'use strict';

var backend = '';
var port = '';

if(document.location.hostname === 'localhost') {
  backend = 'http://localhost';
  port = '9000';
}else{
  backend = 'http://dataexplained.org';
  port = '80';
}

angular.module('rationalecapApp', [
  'rationalecapApp.constants',
  'rationalecapApp.auth',
  'rationalecapApp.util',
  'rationalecapApp.admin',
  'ngCookies',
  'ngResource',
  'ngMessages',
  'ngSanitize',
  'ngMaterial',
  'ui.router',
  'ui.bootstrap',
  'ui.sortable',
  'dndLists',
  'angularModalService',
  'validation.match',
  'bootstrap-tagsinput',
  'ngTagsInput'
])
  .config(function($urlRouterProvider, $locationProvider) {
    $urlRouterProvider
      .otherwise(function ($injector, $location) {

        if ($location.url() === '/readme') {
          window.open('https://s3-eu-west-1.amazonaws.com/dataexplained/README.rtf', '_self');
        }
        else {
          return '/';
        }
      });

    $locationProvider.html5Mode(true);
  })
  .constant('constants', {
    'backendUrl' : (function(){return backend})(),
    'backendPort' : (function(){return port})()
  })
  .run(function($rootScope, $window, User, $http, constants, StorageUtil){

    //CONNECT SOCKET FOR LIVE-METRICS
    var socket = io.connect(constants.backendUrl+':'+constants.backendPort);

    $rootScope.$on('$stateChangeSuccess', function (ev, to, toParams, from, fromParams) {

      var interval = setInterval(function(){
        console.log('readyState', document.readyState);
        if (document.readyState === 'complete') {
          $window.scrollTo(0, 0);
          clearInterval(interval);
        }
      }, 100);


      if(to && to.name === 'main' && toParams.survey){
        //update user surveyDone = true
        //let u = Auth.getCurrentUser();
        //let user = StorageUtil.retrieveSStorage('user');

        $http.put('/api/users/me/survey', {'username' : toParams.survey}).then(response => {
          console.log('user surveyDone updated');
        }, (err) => {
          console.log('user surveyDone update FAILED', err);
        });

        // User.setSurveyDone({ id: u._id }, {user : user}
        // , function() {
        //   console.log('user surveyDone updated');
        // }, function(err) {
        //     console.log('user surveyDone update FAILED', err);
        // })
      }
    });


  });
