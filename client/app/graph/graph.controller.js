(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('GraphCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, StorageUtil) {

    var vm = this;
    vm.plumpList = [];
    vm.blocks = $stateParams.blocks ? $stateParams.blocks : [];


    vm.init = init;



    //=========INIT=========

    vm.init();

    function init() {
      vm.user = StorageUtil.retrieveSStorage('user');

      console.log('vm.blocks', vm.blocks);
      for(var i = 0; i < vm.blocks.length; i++){
        vm.plumpList.push({name: vm.blocks[i].title, id: vm.blocks[i]._id});
      }
      // vm.plumpList.push({name: "NODE 2", id: "id2"});
      // vm.plumpList.push({name: "NODE 3", id: "id3"});
      // vm.plumpList.push({name: "NODE 4", id: "id4"});
      // vm.plumpList.push({name: "NODE 5", id: "id5"});
      // vm.plumpList.push({name: "NODE 6", id: "id6"});
    }



  }
})();
