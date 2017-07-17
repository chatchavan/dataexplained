'use strict';

angular.module('rationalecapApp')
  .controller('ExplanationModalController', function($scope, $element, close, explanation) {

    $scope.explanation = explanation ? explanation : '';

    $scope.close = function(form) {
      $element.modal('hide');
      close($scope.explanation, 500); // close, but give 500ms for bootstrap to animate
    };


    $scope.cancel = function(form) {
      $element.modal('hide');
      close(undefined, 500); // close, but give 500ms for bootstrap to animate
    };

  });
