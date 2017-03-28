'use strict';

angular.module('rationalecapApp')
  .controller('BlockModal2Controller', function($scope, $element, title, close, block, content, edit, filesHistory) {

    $scope.title = title;
    $scope.edit = edit;
    $scope.block = block;
    $scope.filesHistory = filesHistory;
    $scope.list = ["one", "two", "thre", "four", "five", "six"];

    if(!$scope.block){
      $scope.block = {};
      $scope.block.alternatives = [{}];
      // $scope.block.alternativesContra = [{}];
    }
    if($scope.block.content){
      $scope.renderedContent = $scope.block.content.split('\\n');
    }
    else if(content){
      $scope.renderedContent = content.content.split('\\n');
    }

    $scope.step = 1;
    console.log('setting step 1');
    console.log(' $scope.renderedContent',  $scope.renderedContent);
    console.log('editing block', $scope.block);


    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function(form) {
      form.$setSubmitted();
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

    $scope.showDiff = function(){
      $element.modal('hide');
      close('showFilesDiff', 500);
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

    $(document).ready(function() {
      //Helper function to keep table row from collapsing when being sorted
      var fixHelperModified = function(e, tr) {
        var $originals = tr.children();
        var $helper = tr.clone();
        $helper.children().each(function(index)
        {
          $(this).width($originals.eq(index).width())
        });
        return $helper;
      };

      //Make diagnosis table sortable
      $("#diagnosis_list tbody").sortable({
        helper: fixHelperModified,
        stop: function(event,ui) {renumber_table('#diagnosis_list')}
      }).disableSelection();


      //Delete button in table rows
      $('table').on('click','.btn-delete',function() {
        let tableID = '#' + $(this).closest('table').attr('id');
        r = confirm('Delete this item?');
        if(r) {
          $(this).closest('tr').remove();
          renumber_table(tableID);
        }
      });

    });

//Renumber table rows
    function renumber_table(tableID) {
      $(tableID + " tr").each(function() {
        let count = $(this).parent().children().index($(this)) + 1;
        $(this).find('.priority').html(count);
      });
    }

  });
