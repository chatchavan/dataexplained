(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('GraphCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, $state, StorageUtil, ModalService) {

    var vm = this;
    vm.instance = undefined;
    vm.plumpList = [];
    vm.blocks = $stateParams.blocks;
    vm.exported = $stateParams.finished;
    console.log('vm.exported', vm.exported);


    vm.init = init;
    vm.finish = finish;
    vm.goBack = goBack;
    vm.showInfo = showInfo;

    //=========INIT=========

    if(!vm.exported){
      vm.init();
    }

    function init() {
      if(!vm.blocks){
        $state.go('^.main');
      }
      vm.user = StorageUtil.retrieveSStorage('user');

      // console.log('vm.blocks', vm.blocks);
      if(vm.blocks){
        for(var i = 0; i < vm.blocks.length; i++){
          vm.plumpList.push({name: vm.blocks[i].title, id: vm.blocks[i]._id, block: vm.blocks[i]});
        }
      }

      // vm.plumpList.push({name: "NODE 2 NODE 2 NODE 2 NODE 2", id: "id2"});
      // vm.plumpList.push({name: "NODE 3", id: "id3"});
      // vm.plumpList.push({name: "NODE 4", id: "id4"});
      // vm.plumpList.push({name: "NODE 5 NODE 2 NODE 2", id: "id5"});
      // vm.plumpList.push({name: "NODE 6", id: "id6"});
    }

    //=========CONTROLLER=========

    function showInfo(){
      let text = ['Connect Blocks by dragging arrows from the yellow marker to another block.',
        'Please indicate a label/description for your newly created arrow.',
        'You can <span style="font-weight: bold">delete an arrow</span style="font-weight: bold"> by double-clicking on it or select the arrow with a single click and press delete/backspace.',
        'To <span style="font-weight: bold">edit or delete the label</span>, double-click on it.',
        'To <span style="font-weight: bold">edit a block</span>, double-click on the respective box.'];
      ModalService.showModal({
        templateUrl: "app/custommodal/custommodal.html",
        controller: "CustomModalController",
        inputs: {
          title: 'Reconstruct Workflow',
          text: text,
          actionText1: 'Ok',
          actionText2: undefined
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close.then(result => {
        });
      });
    }

    function finish(){
      let plumb = saveFlowchart(vm.instance);

      $http.post('/api/blocks/plumb', {user: vm.user, plumb: plumb}).then(response => {
        if(response.data){
          console.log('export success', response.data);
          vm.exported = true;
        }
      }, (err) => {
        console.log('error exporting plumb', err);
      });

    }

    function goBack(){
      var that = this;

      let actionText1 = 'Yes, I understand';
      let actionText2 = 'Stay on this page';


      ModalService.showModal({
        templateUrl: "app/custommodal/custommodal.html",
        controller: "CustomModalController",
        inputs: {
          title: "Edit Blocks",
          text: ['Please be aware that the graphical arrangement of your blocks will be lost when going back to the previous step.'],
          actionText1: actionText1,
          actionText2: actionText2
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close.then(result => {
          if(result === actionText1){
            $http.post('/api/blocks/plumb/delete', {user: vm.user});
            that.Auth.setUserStep(2);
            $state.go('^.finish');
          }
        });
      });
    }

    function saveFlowchart(instance){

       var nodes = [];
      $(".w").each(function (idx, elem) {
        var $elem = $(elem);
        var endpoints = jsPlumb.getEndpoints($elem.attr('id'));
        let nodeId = $elem.attr('id');

        nodes.push({
          blockId: nodeId,
          name: document.getElementById(nodeId).innerText,
          nodetype: $elem.attr('data-nodetype'),
          positionX: parseInt($elem.css("left"), 10),
          positionY: parseInt($elem.css("top"), 10)
        });
      });
      var connections = [];
      $.each(instance.getAllConnections(), function (idx, connection) {

        // console.log('connection', connection);

        connections.push({
          connectionId: connection.id,
          pageSourceId: connection.sourceId,
          pageTargetId: connection.targetId,
          label: connection.getOverlay("label").labelText,
          anchors: $.map(connection.endpoints, function(endpoint) {

            return [[endpoint.anchor.x,
              endpoint.anchor.y,
              endpoint.anchor.getOrientation(endpoint)[0],
              endpoint.anchor.getOrientation(endpoint)[1],
              // endpoint.anchor.offsets[0],
              // endpoint.anchor.offsets[1]]];
              endpoint.anchor.getCurrentLocation({element : {id: endpoint.id}})]];

          })
        });
      });

      var flowChart = {};
      flowChart.nodes = nodes;
      flowChart.connections = connections;
      flowChart.numberOfElements = nodes.length;
      return JSON.stringify(flowChart);

    }



    // function loadFlowChart(flowChartJson) {
    //
    //   flowChartJson = vm.json;
    //   console.log(vm.json);
    //
    //   var flowChart = JSON.parse(flowChartJson);
    //   var nodes = flowChart.nodes;
    //   $.each(nodes, function( index, elem ) {
    //     console.log('nodeType', elem.nodetype);
    //     repositionElement(elem.blockId, elem.positionX, elem.positionY)
    //   });
    //
    //   var connections = flowChart.connections;
    //   $.each(connections, function (index, elem) {
    //     var connection1 = jsPlumb.connect({
    //       source: elem.pageSourceId,
    //       target: elem.pageTargetId,
    //       type: 'basic',
    //       anchors:["Right", "Continuous"],
    //       // stroke: '#5c96bc'
    //       paintStyle: { stroke: "#5c96bc", strokeWidth: 2, outlineStroke: "transparent", outlineWidth: 4 },
    //     });
    //
    //   });
    // }


  }
})();
