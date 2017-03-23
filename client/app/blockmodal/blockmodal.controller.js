'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalController', function($scope, $element, title, close, block, content, edit) {

    $scope.title = title;
    $scope.edit = edit;
    $scope.block = block;
    if(!$scope.block){
      $scope.block = {};
      $scope.block.alternatives = [{}];
      // $scope.block.alternativesContra = [{}];
    }
    if($scope.block.content){
      $scope.renderedContent = $scope.block.content.split('\\n');
    }
    else if(content){
      $scope.renderedContent = content.content.split('\\n');;
    }

    console.log(' $scope.renderedContent',  $scope.renderedContent);
    console.log('editing block', $scope.block);


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

    $scope.addAlternative = function(){
      $scope.block.alternatives.push({});
    };

    $scope.spliceAlternative = function(){
      if($scope.block.alternatives.length > 1){
        $scope.block.alternatives.splice($scope.block.alternatives.length-1, 1);
      }

    };

});
