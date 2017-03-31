'use strict';

angular.module('rationalecapApp')
  .directive('jsPlump', function () {
    return {
      template: '<div class="state-machine canvas-wide jtk-surface jtk-surface-nopan" id="canvas"></div>',
      restrict: 'EA',
      scope: {
        plumplist : '=',
        instance : '=',
        json : '<'
      },
      link: function (scope, element, attrs) {
        console.log(scope.plumplist);
        let leftMargin = 60; //in px


        init(scope.json);

        function init(json) {

          // scope.plumpList = [];
          // scope.plumpList.push({name: "NODE 1", id: "id1"});
          // scope.plumpList.push({name: "NODE 2", id: "id2"});
          // scope.plumpList.push({name: "NODE 3", id: "id3"});
          // scope.plumpList.push({name: "NODE 4", id: "id4"});
          // scope.plumpList.push({name: "NODE 5", id: "id5"});
          // scope.plumpList.push({name: "NODE 6", id: "id6"});


          jsPlumb.ready(function () {

            // setup some defaults for jsPlumb.
            scope.instance = jsPlumb.getInstance({
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

            scope.instance.registerConnectionType("basic", { anchor:"Continuous", connector:"StateMachine" });

            window.jsp = scope.instance;

            var canvas = document.getElementById("canvas");

            if(json){
              // var flowChart = JSON.parse(json);
              scope.plumplist = json.nodes;
              scope.marginTop = getPxValue(json.marginTop)+50;
            }

            for(var i = 0; i < scope.plumplist.length; i++){
              var p = scope.plumplist[i];
              if(!json){
                document.getElementById("canvas").appendChild(createPlump(p.name, p.id, p.id+'action'));
              }
              else {
                document.getElementById("canvas").appendChild(createPlump(p.name, p.blockId, p.blockId+'action'));
                repositionElement(scope.marginTop, p.blockId, p.positionX, p.positionY);
              }

            }
            console.log('document', document.getElementById("canvas"));


            var windows = jsPlumb.getSelector(".state-machine .w");

            console.log('windows', windows);
            // bind a click listener to each connection; the connection is deleted. you could of course
            // just do this: jsPlumb.bind("click", jsPlumb.detach), but I wanted to make it clear what was
            // happening.
            scope.instance.bind("click", function (c) {
              scope.instance.detach(c);
            });

            // bind a connection listener. note that the parameter passed to this function contains more than
            // just the new connection - see the documentation for a full list of what is included in 'info'.
            // this listener sets the connection's internal
            // id as the label overlay's text.
            scope.instance.bind("connection", function (info) {
              // info.connection.getOverlay("label").setLabel('');
              // info.connection.hideOverlays();

            });

            // bind a double click listener to "canvas"; add new node when this occurs.
            jsPlumb.on(canvas, "dblclick", function(e) {
              // newNode(e.offsetX, e.offsetY);
            });
            //
            // initialise element as connection targets and source.
            //
            var initNode = function(el) {

              // initialise draggable elements.
              scope.instance.draggable(el);

              scope.instance.makeSource(el, {
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

              scope.instance.makeTarget(el, {
                dropOptions: { hoverClass: "dragHover" },
                anchor: "Continuous",
                allowLoopback: true
              });

            };

            var newNode = function(x, y) {
              var d = document.createElement("div");
              var id = jsPlumbUtil.uuid();
              d.className = "w";
              d.id = id;
              d.innerHTML = id.substring(0, 7) + "<div class=\"ep\"></div>";
              d.style.left = x + "px";
              d.style.top = y + "px";
              scope.instance.getContainer().appendChild(d);
              initNode(d);
              return d;
            };

            // suspend drawing and initialise.
            scope.instance.batch(function () {
              for (var i = 0; i < windows.length; i++) {
                initNode(windows[i], true);
                if(i > 0){
                  windows[i].style.left = 2*leftMargin+windows[i-1].offsetWidth+ getPxValue(windows[i-1].style.left) + "px";
                  if(!json){
                    scope.instance.connect({ source: windows[i-1].id, target: windows[i].id, type:"basic" });
                  }
                }
                else{
                  windows[i].style.left = leftMargin+'px';
                }

              }

              if(json && json.connections){
                console.log(json.connections);
                for(let i = 0; i < json.connections.length; i++){
                  scope.instance.connect({ source: json.connections[i].pageSourceId, target: json.connections[i].pageTargetId, type:"basic" });
                }
              }
              // and finally, make a few connections
              // instance.connect({ source: "opened", target: "phone1", type:"basic" });
              // instance.connect({ source: "phone1", target: "phone1", type:"basic" });
              // instance.connect({ source: "phone1", target: "inperson", type:"basic" });
              //
              // instance.connect({
              //   source:"phone2",
              //   target:"rejected",
              //   type:"basic"
              // });
            });





            jsPlumb.fire("jsPlumbDemoLoaded", scope.instance);
            // that.saveFlowchart(instance);
          });
        }

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

      }

    };
  });
