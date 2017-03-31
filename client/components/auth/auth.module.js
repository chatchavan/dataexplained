'use strict';

angular.module('rationalecapApp.auth', [
  'rationalecapApp.constants',
  'rationalecapApp.util',
  'ngCookies',
  'ui.router'
])
  .config(function($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
  });
