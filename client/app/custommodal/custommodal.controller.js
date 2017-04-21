'use strict';

angular.module('rationalecapApp')
  .controller('CustomModalController', function($scope, $element, $sce, title, close, text, actionText1, actionText2) {

    $scope.title = title;
    $scope.text = text;
    $scope.actionText1 = actionText1;
    $scope.actionText2 = actionText2;

    $scope.trustAsHtml = function(string) {
      return $sce.trustAsHtml(string);
    };

    $scope.close = function(form) {
        $element.modal('hide');
        close($scope.actionText1, 500); // close, but give 500ms for bootstrap to animate
    };

    $scope.cancel = function(form) {
      $element.modal('hide');
      close($scope.actionText2, 500); // close, but give 500ms for bootstrap to animate
    };

  });
