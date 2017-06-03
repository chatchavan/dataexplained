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
        plumbList : '=',
        instance : '=',
        user : '<',
        json : '<',
        autosave: '&'
      },
      controller: ['$scope', 'ModalService', 'Util', 'BlockUtil', controller],
      controllerAs: 'vm'
    };

    return directive;
  }

  function controller($scope, ModalService, Util, BlockUtil) {


    $scope.leftMargin = 60; //in px
    $scope.hoverPaintStyle = {stroke: "#009900", strokeWidth: 2 };
    $scope.defaultPaintStyle = {stroke: "rgb(92, 150, 188)", strokeWidth: 2};


    // --- INIT ---
    init();

    function init(){

      // scope.plumbList = [];
      // scope.plumbList.push({name: "NODE 1", id: "id1"});
      // scope.plumbList.push({name: "NODE 2", id: "id2"});
      // scope.plumbList.push({name: "NODE 3", id: "id3"});
      // scope.plumbList.push({name: "NODE 4", id: "id4"});
      // scope.plumbList.push({name: "NODE 5", id: "id5"});
      // scope.plumbList.push({name: "NODE 6", id: "id6"});


      jsPlumb.ready(function () {

        // setup some defaults for jsPlumb.
        $scope.instance = jsPlumb.getInstance({
          Endpoint: ["Dot", {radius: 2}],
          Connector:"StateMachine",
          PaintStyle: $scope.defaultPaintStyle,
          HoverPaintStyle: $scope.hoverPaintStyle,
          ConnectionOverlays: [
            [ "Arrow", {
              location: 1,
              id: "arrow",
              length: 14,
              foldback: 0.8
            } ],
            [ "Label", {
                label: "", id: "label", cssClass: "aLabel",
                events:{
                  dblclick:function(labelOverlay, originalEvent) {
                    labelOverlay.component.locked = true;
                    editLabel(labelOverlay.component, true);

                  }
                }
              }
            ]
          ],
          Container: "canvas"
        });

        $scope.instance.registerConnectionType("basic", { anchor:"Continuous", connector:"StateMachine" });

        window.jsp = $scope.instance;

        var canvas = document.getElementById("canvas");

        if($scope.json && $scope.json.nodes.length > 0){
          $scope.marginTop = getPxValue($scope.json.marginTop);
        }

        for(var i = 0; i < $scope.plumbList.length; i++){
          var p = $scope.plumbList[i];
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
        $scope.instance.bind("dblclick", function (c) {
          if(!c.locked){
            delete $scope.instance.selectedConnection;
            $scope.instance.detach(c);
          }
        });
        $scope.instance.bind("click", function (c) {

          if($scope.instance.selectedConnection){
            $scope.instance.selectedConnection.setPaintStyle($scope.defaultPaintStyle);
          }
          c.setPaintStyle($scope.hoverPaintStyle);
          $scope.instance.selectedConnection = c;
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
              if(!$scope.json){
                windows[i].style.left = 2*$scope.leftMargin+windows[i-1].offsetWidth+ getPxValue(windows[i-1].style.left) + "px";
                let connection = $scope.instance.connect({ source: windows[i-1].id, target: windows[i].id, type:"basic" });
                connection.getOverlay("label").hide();
              }
            }
            else{
              windows[i].style.left = $scope.leftMargin+'px';
            }

          }

          if($scope.json && $scope.json.connections){
            for(let i = 0; i < $scope.json.connections.length; i++){
              let connection = $scope.instance.connect({ source: $scope.json.connections[i].pageSourceId, target: $scope.json.connections[i].pageTargetId, type:"basic" });
              if(connection){
                if(!!$scope.json.connections[i].label){
                  connection.getOverlay("label").setLabel($scope.json.connections[i].label);
                }
                else{
                  connection.getOverlay("label").hide();
                }
              }

            }
          }
        });





        jsPlumb.fire("jsPlumbDemoLoaded", $scope.instance);

        // bind a connection listener. note that the parameter passed to this function contains more than
        // just the new connection - see the documentation for a full list of what is included in 'info'.
        // this listener sets the connection's internal
        // id as the label overlay's text.
        $scope.instance.bind("connection", function (info) {
          editLabel(info.connection, false);
        });


        // that.saveFlowchart(instance);

        $('html').keyup(function(e){
          if(e.keyCode === 46 || e.keyCode === 8) { //46 = DELETE, 8 = Backspace
            deleteConnection($scope.instance.selectedConnection);
            delete $scope.instance.selectedConnection;
          }
        });


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

    function editLabel(connection, edit){

      ModalService.showModal({
        templateUrl: "app/labelmodal/labelmodal.html",
        controller: "LabelModalController",
        inputs: {
          label: connection.getOverlay("label").label,
          edit: edit
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close.then(result => {
          connection.locked = false;
          if(result === 'delete'){
            connection.getOverlay("label").hide();
            save();
          }
          else if(result){
            connection.getOverlay("label").setLabel(result);
            save();
            // connection.hideOverlays();
          }
          else if(!edit){
            deleteConnection(connection);
          }
        });
      });
    }

    function deleteConnection(connection){
      jsPlumb.detach(connection, {
        fireEvent: false, //fire a connection detached event?
        forceDetach: false //override any beforeDetach listeners
      });
      save();
    }

    function editBlock (block){

      let b = undefined;

      for (let i = 0; i < $scope.plumbList.length; i++){
        if($scope.plumbList[i].id === block.id || $scope.plumbList[i].blockId === block.id){
          b = $scope.plumbList[i].block;
          break;
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
            else if(result && result.saveBlock){
              updateBlock(result.saveBlock);
            }
          });
        });
      }

    }

    function updateBlock (newBlock) {
      BlockUtil.updateBlock(newBlock, $scope.user, undefined, undefined).then(function(success){
        let blocks = success.blockList;
        if(blocks){
          $scope.plumbList = [];
          for(var i = 0; i < blocks.length; i++){
            $scope.plumbList.push({name: blocks[i].title, id: blocks[i]._id, block: blocks[i]});
            if(blocks[i]._id === newBlock._id){
              let el = document.getElementById(newBlock._id);
              el.childNodes[0].nodeValue = blocks[i].title;
            }

          }

          $scope.instance.setSuspendDrawing(false, true);
          save();
          // $scope.instance.batch();

        }

      });
    }

    function save(){
      if($scope.autosave){
        $scope.autosave();
      }
    }



  }
})();
