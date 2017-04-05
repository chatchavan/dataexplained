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
  'ui.router',
  'ui.bootstrap',
  'ui.sortable',
  'dndLists',
  'angularModalService',
  'validation.match'
])
  .config(function($urlRouterProvider, $locationProvider) {
    $urlRouterProvider
      .otherwise('/');

    $locationProvider.html5Mode(true);
  })
  .run(function($rootScope, User, Auth){
    $rootScope.$on('$stateChangeSuccess', function (ev, to, toParams, from, fromParams) {
      if(to && to.name === 'main' && toParams.survey){
        //update user surveyDone = true
        let u = Auth.getCurrentUser();
        User.setSurveyDone({ id: u._id }
        , function() {
          console.log('user surveyDone updated');
        }, function(err) {
            console.log('user surveyDone update FAILD', err);
        })
      }
    });
  });
