'use strict';

angular.module('rationalecapApp')
  .controller('DiffModalController', function($scope, $element, $timeout, text) {

    $scope.text = text;
    $scope.loaded = false;
    $scope.noContent = false;
    var diff2htmlUi  =  undefined;

    $scope.$watch('text', function (newValue, oldValue) {

      if(newValue){
        $timeout(function(){
          diff2htmlUi = new Diff2HtmlUI({diff: $scope.text});
          diff2htmlUi.draw('#line-by-line', {inputFormat: 'diff', showFiles: true, matching: 'none'});
          diff2htmlUi.highlightCode('#line-by-line');
          $scope.loaded = true;
        });
      }
      else{
        $scope.noContent = true;
      }

    });


    $scope.close = function() {
      $scope = $scope.$new(true);
      diff2htmlUi = undefined;
      document.getElementById("line-by-line").remove();
    };


  });
