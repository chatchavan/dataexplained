(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('FinishCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, StorageUtil, LogUtil) {

    var vm = this;
    vm.loglist = $stateParams.loglist ? $stateParams.loglist : [];
    vm.dbLogs = $stateParams.dbLogs ? $stateParams.dbLogs : [];
    vm.blockList = $stateParams.blockList ? $stateParams.blockList : [];


    vm.init = init;


    //=========INIT=========

    vm.init();

    function init() {
      vm.loglist = LogUtil.markLogs(vm.loglist, vm.dbLogs);
      vm.user = StorageUtil.retrieveSStorage('user');
      // if(vm.user){
      //
      //   $http.get('/api/logs/file/'+vm.user).then(response => {
      //     let log = response.data.content;
      //     vm.loglist = LogUtil.formatLogs(log.split("\n"), vm.blockList);
      //
      //     $http.get('/api/blocks/'+vm.user).then(response => {
      //       if(response.data.length > 0){
      //         vm.blockList = response.data;
      //         vm.loglist = LogUtil.formatLogs(log.split("\n"), vm.blockList);
      //         console.log(vm.loglist, vm.blockList);
      //       }
      //     }, (err) => {
      //       //file does not exist yet
      //       console.log('error fetching blocks', err);
      //     });
      //
      //   }, (err) => {
      //     console.log(err);
      //   });
      //
      //
      //
      // }
    }




  }
})();
