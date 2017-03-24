'use strict';

angular.module('rationalecapApp')
  .controller('LoaderModalController', function($scope, $element, text, close) {

    $scope.text = text;
    $('#processing-modal').click(function(e) {
      e.stopPropagation();
    });
    $scope.close = function() {
      $element.modal('hide');
      close({}, 500); // close, but give 500ms for bootstrap to animate
    };


  });
