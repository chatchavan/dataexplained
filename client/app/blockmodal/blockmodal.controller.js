'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalController', function($scope, $element, title, close, block, edit) {

    $scope.title = title;
    $scope.block = block;
    $scope.edit = edit;
    $scope.renderedContent = $scope.block.content.split('\\n');


    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function(form) {
      console.log(form.$valid);
      form.$setSubmitted();
      console.log(form.$valid);
      if(form.$valid){
        $element.modal('hide');
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

    $scope.loadFiles = function(){
      $element.modal('hide');
      close('loadFiles', 500);
    };

    $scope.deleteBlock = function(){
      $element.modal('hide');
      close('deleteBlock', 500);
    };

});
