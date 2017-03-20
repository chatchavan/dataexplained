'use strict';

angular.module('rationalecapApp', [
  'rationalecapApp.constants',
  'rationalecapApp.util',
  'ngCookies',
  'ngResource',
  'ngMessages',
  'ngSanitize',
  'ui.router',
  'ui.bootstrap',
  'angularModalService'
])
  .config(function($urlRouterProvider, $locationProvider) {
    $urlRouterProvider
      .otherwise('/');

    $locationProvider.html5Mode(true);
  });
