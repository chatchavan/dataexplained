'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalController', function($scope, $element, title, close) {

    // var vm = this;
    // $scope.block = {
    //   title : null,
    //   age : null
    // };

    $scope.title = title;

    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function(form) {
      console.log(form.$valid);
      form.$setSubmitted();
      console.log(form.$valid);
      if(form.$valid){
        close($scope.block, 500); // close, but give 500ms for bootstrap to animate
      }
    };

    //  This cancel function must use the bootstrap, 'modal' function because
    //  the doesn't have the 'data-dismiss' attribute.
    $scope.cancel = function() {

      //  Manually hide the modal.
      $element.modal('hide');

      //  Now call close, returning control to the caller.
      close(undefined, 500); // close, but give 500ms for bootstrap to animate
    };

});
