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
  });
