'use strict';

angular.module('rationalecapApp')
  .controller('CustomModalController', function($scope, $element, $sce, title, close, text, actionText1, actionText2, actionText3, actionText4) {

    $scope.title = title;
    $scope.text = text;
    $scope.actionText1 = actionText1;
    $scope.actionText2 = actionText2;
    if(actionText3){
      $scope.actionText3 = actionText3;
    }
    if(actionText4){
      $scope.actionText4 = actionText4;
    }


    $scope.trustAsHtml = function(string) {
      return $sce.trustAsHtml(string);
    };

    $scope.close = function(form) {
        $element.modal('hide');
        close($scope.actionText1, 500); // close, but give 500ms for bootstrap to animate
    };

    $scope.action3 = function(form) {
      $element.modal('hide');
      close($scope.actionText3, 500); // close, but give 500ms for bootstrap to animate
    };

    $scope.action4 = function(form) {
      $element.modal('hide');
      close($scope.actionText4, 500); // close, but give 500ms for bootstrap to animate
    };

    $scope.cancel = function(form) {
      $element.modal('hide');
      close($scope.actionText2, 500); // close, but give 500ms for bootstrap to animate
    };

  });
