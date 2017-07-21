'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalCoderController', function($scope, $element, title, close, block, content, edit, allCodes, Auth, ModalService) {

    $scope.title = title;
    $scope.edit = edit;
    $scope.block = block;
    $scope.allCodes = allCodes;

    if(!$scope.block){
      $scope.block = {};
      $scope.block.alternatives = [{}];
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

    $scope.blockCodesIndex = 0;
    $scope.codes = [];
    loadCoderCodes();

    $scope.step = 1;


    $scope.loadTags = function(query) {
      return $scope.allCodes.filter(function (el) {
        return el.includes(query.toLowerCase());
      });

    };

    $scope.onTagAdded = function(tag, index){
      if($scope.codes.length === index){
        $scope.codes.push([tag])
      }
      $scope.coderCodes[index].code = $scope.codes[index][0].text;
      for(let i = 1; i < $scope.codes[index].length; i++){
        $scope.coderCodes[index].code += ';'+$scope.codes[index][i].text;
      }


    };

    $scope.onTagRemoved = function(tag, index){
      if($scope.codes[index].length <= 0){
        $scope.coderCodes[index].code = undefined;
      }
      else{
        $scope.onTagAdded(tag, index);
      }

    };




    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function(form) {
      if(form){
        form.$setSubmitted();
        if(form.$valid){
          $scope.block.noCodes = $scope.coderCodes.length <= 0;
          //join all blockCodes
          let allCodes = [];
          for(let i = 0; i < $scope.codes.length; i++){
            let cs = $scope.codes[i];
            for(let j = 0; j < cs.length; j++){
              allCodes.push(cs[j].text);
            }
          }
          $scope.block.allCodes = allCodes;
          if($scope.coderCodes.length > 0){
            if(!$scope.block.blockCodes || $scope.block.blockCodes.length <= 0){
              $scope.block.blockCodes = [{'coder' : $scope.user, 'codes' : $scope.coderCodes}];
            }
            else{
              $scope.block.blockCodes[$scope.blockCodesIndex].codes = $scope.coderCodes;
            }
          }
          else if($scope.block.blockCodes && $scope.block.blockCodes[$scope.blockCodesIndex]){
            $scope.block.blockCodes.splice($scope.blockCodesIndex, 1);
          }

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

      close(undefined, 500); // close, but give 500ms for bootstrap to animate
    };



    $scope.showDiff = function(){
      $element.modal('hide');
      close('showFilesDiff', 500);
    };


    $scope.addCode = function(){
      $scope.coderCodes.push({});
    };

    $scope.deleteCode = function(index){
      if(index >= 0 && $scope.coderCodes.length > index){
        $scope.coderCodes.splice(index, 1);
      }

    };
    $scope.addExplanation = function(index){
      if(index >= 0 && $scope.coderCodes.length > index){


        let explanation = $scope.coderCodes[index].explanation;

        ModalService.showModal({
          templateUrl: "app/explanationmodal/explanationmodal.html",
          controller: "ExplanationModalController",
          inputs: {
            explanation: explanation
          }
        }).then(function(modal) {
          modal.element.modal();
          modal.close.then(result => {
            if(result && result.length > 0){
              $scope.coderCodes[index].explanation = result;
            }
          });
        });

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


    $scope.textAreaAdjust = function(id) {
      let element = document.getElementById(id);
      element.style.height = (element.scrollHeight > element.clientHeight) ? (element.scrollHeight)+"px" : "60px";

    };


    //========HELPER FUNCTION
    function loadCoderCodes(){
      let blockCodes = $scope.block.blockCodes;

      Auth.getCurrentUser(function(user){
        console.log('current user', user.username);
        $scope.user = user.username;
        if(!blockCodes || blockCodes.length <= 0){
          // $scope.coderCodes = [{'codeText' : '', 'code' : ''}];
          $scope.coderCodes = [];

          return;
        }

        for(let i = 0; i < blockCodes.length; i++){
          if(blockCodes[i].coder === user.username){
            $scope.blockCodesIndex = i;
            $scope.coderCodes = blockCodes[i].codes;
            for(let j = 0; j < $scope.coderCodes.length; j++){
              let codesArray = [];
              if($scope.coderCodes[j].code){
                codesArray = $scope.coderCodes[j].code.split(';');
              }
              let codeSet = [];
              for(let k = 0; k < codesArray.length; k++){
                codeSet.push({'text' : codesArray[k]});
              }
              $scope.codes.push(codeSet);
            }
            return;
          }
        }
        // $scope.coderCodes = [{'codeText' : '', 'code' : ''}];
        $scope.blockCodesIndex = $scope.block.blockCodes.push({coder: $scope.user, codes:[]});
        $scope.blockCodesIndex = $scope.block.blockCodes.length-1;
        $scope.coderCodes = [];
      });

    }

  });
