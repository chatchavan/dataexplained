'use strict';

angular.module('rationalecapApp')
  .controller('BlockModal2Controller', function($scope, $element, title, close, block, content, edit) {

    $scope.title = title;
    $scope.edit = edit;
    $scope.block = block;
    $scope.list = ["one", "two", "thre", "four", "five", "six"];

    if(!$scope.block){
      $scope.block = {};
      $scope.block.alternatives = [{}];
      // $scope.block.alternativesContra = [{}];
    }
    $scope.renderedContent_temp = [];
    if($scope.block.content){
      $scope.renderedContent_temp = $scope.block.content.split('\\n');
    }
    else if(content){
      $scope.renderedContent_temp = content.content.split('\\n');
    }

    $scope.renderedContent = [];
    for(var i = 0; i < $scope.renderedContent_temp.length; i++){
      $scope.renderedContent.push({id: i, content: $scope.renderedContent_temp[i]});
    }

    $scope.step = 1;
    console.log('setting step 1');
    console.log(' $scope.renderedContent',  $scope.renderedContent);
    console.log('editing block', $scope.block);


    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function(form) {
      if(form){
        form.$setSubmitted();
        if(form.$valid){
          $element.modal('hide');
          close($scope.block, 500); // close, but give 500ms for bootstrap to animate
        }
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

    $scope.showDiff = function(){
      $element.modal('hide');
      close('showFilesDiff', 500);
    };

    $scope.saveBlock = function(form){
      $element.modal('hide');
      close({'saveBlock' : form}, 500);
    };

    $scope.addAlternative = function(){
      $scope.block.alternatives.push({});
    };

    $scope.spliceAlternative = function(){
      if($scope.block.alternatives.length > 1){
        $scope.block.alternatives.splice($scope.block.alternatives.length-1, 1);
      }

    };

    $scope.increaseStep = function(form){
      if(form.$valid){
        $scope.step++;
        form.$setPristine();
      }
      else{
        form.$setSubmitted();
      }
    };

    $scope.decreaseStep = function(){
      $("#back-btn").focus();
      $scope.step--;
    };

    $scope.textAreaAdjust = function(id) {
      let element = document.getElementById(id);
      // let scrollHeight = element.scrollHeight;
      // console.log('scrollheight', scrollHeight);
      //
      // element.style.height = 'auto';
      // element.style.height = (25+scrollHeight)+'px';

      element.style.height = (element.scrollHeight > element.clientHeight) ? (element.scrollHeight)+"px" : "60px";


    };

  });
