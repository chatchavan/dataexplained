'use strict';

angular.module('rationalecapApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('survey', {
        url: '/survey',
        templateUrl: 'app/survey/survey.html',
        controller: 'SurveyCtrl',
        controllerAs: 'survey'
      });
  });
