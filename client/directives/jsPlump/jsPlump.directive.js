(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .directive('jsPlump', JsPlumb);

  function JsPlumb() {
    var directive = {
      template: '<div class="state-machine canvas-wide jtk-surface jtk-surface-nopan" id="canvas"></div>',
      restrict: 'EA',
      scope: {
        plumplist : '=',
        instance : '=',
        user : '<',
        json : '<'
      },
      controller: ['$scope', 'ModalService', 'Util', 'BlockUtil', controller],
      controllerAs: 'vm'
    };

    return directive;
  }

  function controller($scope, ModalService, Util, BlockUtil) {


    $scope.leftMargin = 60; //in px


    // --- INIT ---
    init();

    function init(){

      // scope.plumpList = [];
      // scope.plumpList.push({name: "NODE 1", id: "id1"});
      // scope.plumpList.push({name: "NODE 2", id: "id2"});
      // scope.plumpList.push({name: "NODE 3", id: "id3"});
      // scope.plumpList.push({name: "NODE 4", id: "id4"});
      // scope.plumpList.push({name: "NODE 5", id: "id5"});
      // scope.plumpList.push({name: "NODE 6", id: "id6"});


      jsPlumb.ready(function () {

        // setup some defaults for jsPlumb.
        $scope.instance = jsPlumb.getInstance({
          Endpoint: ["Dot", {radius: 2}],
          Connector:"StateMachine",
          HoverPaintStyle: {stroke: "#FF0000", strokeWidth: 2 },
          ConnectionOverlays: [
            [ "Arrow", {
              location: 1,
              id: "arrow",
              length: 14,
              foldback: 0.8
            } ],
            // [ "Label", { label: "FOO", id: "label", cssClass: "aLabel" }]
          ],
          Container: "canvas"
        });

        $scope.instance.registerConnectionType("basic", { anchor:"Continuous", connector:"StateMachine" });

        window.jsp = $scope.instance;

        var canvas = document.getElementById("canvas");

        if($scope.json){
          // var flowChart = JSON.parse(json);
          $scope.plumplist = $scope.json.nodes;
          $scope.marginTop = getPxValue($scope.json.marginTop)+50;
        }

        for(var i = 0; i < $scope.plumplist.length; i++){
          var p = $scope.plumplist[i];
          if(!$scope.json){
            document.getElementById("canvas").appendChild(createPlump(p.name, p.id, p.id+'action'));
          }
          else {
            document.getElementById("canvas").appendChild(createPlump(p.name, p.blockId, p.blockId+'action'));
            repositionElement($scope.marginTop, p.blockId, p.positionX, p.positionY);
          }

        }


        var windows = jsPlumb.getSelector(".state-machine .w");

        // bind a click listener to each connection; the connection is deleted. you could of course
        // just do this: jsPlumb.bind("click", jsPlumb.detach), but I wanted to make it clear what was
        // happening.
        $scope.instance.bind("click", function (c) {
          $scope.instance.detach(c);
        });

        // bind a connection listener. note that the parameter passed to this function contains more than
        // just the new connection - see the documentation for a full list of what is included in 'info'.
        // this listener sets the connection's internal
        // id as the label overlay's text.
        $scope.instance.bind("connection", function (info) {
          // info.connection.getOverlay("label").setLabel('');
          // info.connection.hideOverlays();

        });

        // bind a double click listener to "canvas"; add new node when this occurs.
        jsPlumb.on(canvas, "dblclick", function(e) {
          let src = event.target || event.srcElement;
          editBlock(src);
        });
        //
        // initialise element as connection targets and source.
        //
        var initNode = function(el) {

          // initialise draggable elements.
          $scope.instance.draggable(el);

          $scope.instance.makeSource(el, {
            filter: ".ep",
            anchor: "Continuous",
            connectorStyle: { stroke: "#5c96bc", strokeWidth: 2, outlineStroke: "transparent", outlineWidth: 4 },
            connectionType:"basic",
            extract:{
              "action":"the-action"
            },
            maxConnections: 5,
            onMaxConnections: function (info, e) {
              alert("Maximum connections (" + info.maxConnections + ") reached");
            }
          });

          $scope.instance.makeTarget(el, {
            dropOptions: { hoverClass: "dragHover" },
            anchor: "Continuous",
            allowLoopback: true
          });

        };

        // suspend drawing and initialise.
        $scope.instance.batch(function () {
          for (var i = 0; i < windows.length; i++) {
            initNode(windows[i], true);
            if(i > 0){
              windows[i].style.left = 2*$scope.leftMargin+windows[i-1].offsetWidth+ getPxValue(windows[i-1].style.left) + "px";
              if(!$scope.json){
                $scope.instance.connect({ source: windows[i-1].id, target: windows[i].id, type:"basic" });
              }
            }
            else{
              windows[i].style.left = $scope.leftMargin+'px';
            }

          }

          if($scope.json && $scope.json.connections){
            console.log($scope.json.connections);
            for(let i = 0; i < $scope.json.connections.length; i++){
              $scope.instance.connect({ source: $scope.json.connections[i].pageSourceId, target: $scope.json.connections[i].pageTargetId, type:"basic" });
            }
          }
        });





        jsPlumb.fire("jsPlumbDemoLoaded", $scope.instance);
        // that.saveFlowchart(instance);
      });
    }



    // --- CONTROLLER ---

    function repositionElement(marginTop, id, posX, posY){
      let el = $('#'+id);
      el.css('left', posX);
      el.css('top', posY+marginTop);
      jsPlumb.repaint(id);
    }

    function createPlump(text, id, action){
      var wDiv = document.createElement('div');
      wDiv.id = id;
      wDiv.className = 'w';
      wDiv.innerText = text;
      var epDiv = document.createElement('div');
      epDiv.setAttribute('action', action);
      epDiv.className = 'ep';
      wDiv.appendChild(epDiv);
      return wDiv;
    }

    function getPxValue(element){
      if(!element || element.length <= 0){
        return 0;
      }

      return Number(element.substr(0, element.length-2));
    }

    function editBlock (block){
      console.log('block clicked', block.id);

      let b = undefined;

      for (let i = 0; i < $scope.plumplist.length; i++){
        if($scope.plumplist[i].id === block.id){
          b = $scope.plumplist[i].block;
        }
      }
      if(b){
        // let select = this.selection;
        ModalService.showModal({
          templateUrl: "app/blockmodal2/blockmodal2.html",
          controller: "BlockModal2Controller",
          inputs: {
            title: "Edit block",
            edit: 'jsplumb',
            block: b,
            content: undefined,
            jsplumb: true,
          }
        }).then(function(modal) {
          modal.element.modal();
          modal.close.then(result => {
            if(result === 'showFilesDiff'){
              Util.showFilesDiff(b, $scope.user);
            }
            else if(result){
              updateBlock(result);
            }
          });
        });
      }

    }

    function updateBlock (newBlock) {
      BlockUtil.updateBlock(newBlock, $scope.user, undefined, undefined).then(function(success){
        let blocks = success.blockList;
        if(blocks){
          $scope.plumplist = [];
          for(var i = 0; i < blocks.length; i++){
            $scope.plumplist.push({name: blocks[i].title, id: blocks[i]._id, block: blocks[i]});
            if(blocks[i]._id === newBlock._id){
              let el = document.getElementById(newBlock._id);
              el.childNodes[0].nodeValue = blocks[i].title;
            }

          }

          $scope.instance.setSuspendDrawing(false, true);
          // $scope.instance.batch();

        }

      });
    }



  }
})();