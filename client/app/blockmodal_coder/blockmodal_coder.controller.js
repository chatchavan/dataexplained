'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalCoderController', function($scope, $element, $http, $timeout, title, close, block, content, edit, allCodes, Auth, ModalService) {

    $scope.title = title;
    $scope.edit = edit;
    $scope.block = block;
    $scope.allCodes = allCodes;
    $scope.labels = ['title', 'goal'];
    $scope.blockCodesIndex = 0;
    $scope.codes = [];
    $scope.step = 1;
    $scope.errorFields = [];

    init();


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

    $scope.onTagClicked = function(tag){
      console.log('tag', tag.text);
      $http.get('/api/blocks/codeReferences/' + tag.text ).then(response => {
        let codeTexts = ['Code has not been applied at another place yet.'];

        if (response.data && response.data.length > 0) {
          codeTexts = [];
          for(let i = 0; i < response.data.length; i++){
            codeTexts.push(response.data[i]);
            if(i < response.data.length-1){
              codeTexts.push('<hr>');
            }
          }
        }

        ModalService.showModal({
          templateUrl: "app/custommodal/custommodal.html",
          controller: "CustomModalController",
          inputs: {
            title: "Code Texts",
            text: codeTexts,
            actionText1: 'Ok',
            actionText2: undefined,
            actionText3: undefined,
            actionText4: undefined
          }
        }).then(function (modal) {
          modal.element.modal();
          modal.close.then(result => {
          });
        });

      }, (err) => {
        console.log('error getting code texts', err);
      });

    };


    $scope.getLabel = function(code){
      if(code && code.codeLabel){
        return code.codeLabel;
      }
      else{
        return 'Label...';
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

          if($scope.checkFields()){
            $element.modal('hide');
            close($scope.block, 500); // close, but give 500ms for bootstrap to animate
          }
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

    $scope.checkFields = function(){

      $scope.errorFields = [];
      let errors = [];

      if(!$scope.block.blockCodes){
        return true;
      }

      let codes = $scope.block.blockCodes[$scope.blockCodesIndex].codes;
      // console.log('codes', codes);
      for(let i = 0; i < codes.length; i++){
        if(!codes[i].code){
          $scope.errorFields.push('- Code(s) for entry '+(i+1));
        }
        if(!codes[i].codeLabel){
          $scope.errorFields.push('- Label for entry '+(i+1));
        }
        if(!codes[i].codeText){
          $scope.errorFields.push('- Code-Text for entry '+(i+1));
        }
      }

      // $timeout(function(){
      //   $scope.errorFields = errors;
      // });
      // console.log('errors', $scope.errorFields);

      return $scope.errorFields.length <= 0;
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
        $scope.codes.splice(index, 1);
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

    $scope.setLabel = function(code, label){
      code.codeLabel = label;
      if(label === 'title'){
        code.codeText = $scope.block.title;
      }
      else if(label === 'goal'){
        code.codeText = $scope.block.goal;
      }
      else if(label === 'reason'){
        code.codeText = $scope.block.criteria;
      }
      else if(label === 'prec'){
        code.codeText = $scope.block.preconditions;
      }
      else if(label.startsWith('alt')){
        code.codeText = $scope.block.alternatives[Number(label.substr(3, label.length))-1].title;
      }
      else if(label.startsWith('adv')){
        code.codeText = $scope.block.alternatives[Number(label.substr(3, label.length))-1].pro;

      }
      else if(label.startsWith('dis')){
        code.codeText = $scope.block.alternatives[Number(label.substr(3, label.length))-1].contra;
      }
    };


    //========HELPER FUNCTION

    function init(){
      if(!$scope.block){
        $scope.block = {};
        $scope.block.alternatives = [{}];
      }

      for(let i = 0; i < $scope.block.alternatives.length; i++){
        $scope.labels.push('alt'+(i+1));
        $scope.labels.push('adv'+(i+1));
        $scope.labels.push('dis'+(i+1));
      }
      $scope.labels.push('reason');
      $scope.labels.push('prec');
      $scope.labels.push('code');
      $scope.labels.push('block');

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

      loadCoderCodes();
    }


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
