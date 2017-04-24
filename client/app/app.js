'use strict';

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
  'validation.match'
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
  .run(function($rootScope, $window, User, Auth){
    $rootScope.$on('$stateChangeSuccess', function (ev, to, toParams, from, fromParams) {
      if(to && to.name === 'main' && toParams.survey){
        //update user surveyDone = true
        let u = Auth.getCurrentUser();
        User.setSurveyDone({ id: u._id }
        , function() {
          console.log('user surveyDone updated');
        }, function(err) {
            console.log('user surveyDone update FAILED', err);
        })
      }
    });
  });
