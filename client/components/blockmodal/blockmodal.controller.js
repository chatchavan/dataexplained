'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalController', function($scope, $element, title, close) {

    $scope.block = {
      title : null,
      age : null
    };

    $scope.title = title;

    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function() {
      close($scope.block, 500); // close, but give 500ms for bootstrap to animate
    };

    //  This cancel function must use the bootstrap, 'modal' function because
    //  the doesn't have the 'data-dismiss' attribute.
    $scope.cancel = function() {

      //  Manually hide the modal.
      $element.modal('hide');

      //  Now call close, returning control to the caller.
      close({
        name: $scope.name,
        age: $scope.age
      }, 500); // close, but give 500ms for bootstrap to animate
    };

});
