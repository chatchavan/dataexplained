(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('FinishCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, $state, Util, StorageUtil, LogUtil, BlockUtil, ModalService) {

    var vm = this;
    vm.loglist = $stateParams.loglist ? $stateParams.loglist : [];
    vm.dbLogs = $stateParams.dbLogs ? $stateParams.dbLogs : [];
    vm.blockList = $stateParams.blockList ? $stateParams.blockList : [];


    vm.init = init;
    vm.removeLog = removeLog;
    vm.editBlock = editBlock;
    vm.confirmBlocks = confirmBlocks;
    vm.dragDrop = dragDrop;
    vm.dragEnd = dragEnd;
    vm.dragEndLog = dragEndLog;

    //=========INIT=========

    vm.init();

    function init() {
      vm.loglist = LogUtil.markLogs(vm.loglist, vm.dbLogs);
      console.log('loglist', vm.loglist, 'blocklist', vm.blockList, 'dbLogs', vm.dbLogs);
      vm.user = StorageUtil.retrieveSStorage('user');

      vm.itemlist = [];
      vm.loglist = vm.loglist ? vm.loglist : [];

      for(let i = 0; i < vm.loglist.length; i++){
        if(!vm.loglist[i].used){
          vm.itemlist.push(vm.loglist[i]);
          vm.itemlist[vm.itemlist.length-1].title = vm.loglist[i].log;
          vm.itemlist[vm.itemlist.length-1].timestamp = new Date(Number(vm.loglist[i].timestamp));

        }
      }

      for(let b in vm.blockList){
          // vm.blockList[b].renderedContent = vm.blockList[b].content.length > 0 ? vm.blockList[b].content.split('\\n') : undefined;
        vm.blockList[b].renderedContent = vm.blockList[b].content.split('\\n');
      }
      vm.itemlist = vm.itemlist.concat(vm.blockList);
      vm.itemlist.sort(function(a,b){
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      console.log('itemlist', vm.itemlist);


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

    function removeLog(line, block){
      console.log('removing ' + line +' from block ' + block._id);

      let logEntries = vm.dbLogs.filter(function(item){
        return item.block === block._id && item.log === line;
      });

      console.log(logEntries);
      //console.log(block.content.split('\\n').length > 1);


      if(logEntries.length > 0){
        $http.post('/api/logs/delete',{user: vm.user, logId: logEntries[0]._id, blockId: block._id}).then(response => {
          if(response.data){
            console.log('dbLogs now', vm.dbLogs, response.data.dbLogs);
            vm.dbLogs = response.data.dbLogs;
            vm.blockList = response.data.blockList;
            vm.init();
            // vm.blockList = response.data;
            // vm.loglist = LogUtil.formatLogs(log.split("\n"), vm.blockList);
            console.log('log deleted');
          }
        }, (err) => {
          //file does not exist yet
          console.log('error deleting log', err);
        });
      }

    }

    function editBlock(block){

      ModalService.showModal({
        templateUrl: "app/blockmodal2/blockmodal2.html",
        controller: "BlockModal2Controller",
        inputs: {
          title: "Edit block",
          edit: true,
          block: block,
          content: undefined,
          filesHistory: false,
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close.then(result => {
          if(result === 'deleteBlock'){
            BlockUtil.deleteBlock(block, vm.user, vm.loglist).then(function(success){
              vm.blockList = success.blockList;
              vm.loglist = success.loglist;
              vm.dbLogs = success.dbLogs;
              // vm.init();
            });
          }
          else if(result === 'showFilesDiff'){
            Util.showFilesDiff(block, vm.user);
          }
          else if(result){
            let newBlock = BlockUtil.createBlockString(result, undefined);
            BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function(success){
              vm.block = success.block;
              vm.loglist = success.loglist;
              // vm.init();
            });
          }
        });
      });
    }

    function confirmBlocks(){
      $state.go('^.graph', {'blocks': vm.blockList});

    }

    function dragEnd(originIndex, list){
      if(list && list.length > 0){
        if(vm.drop && vm.drop.index < originIndex){
          list.splice(originIndex+1, 1);
        }
        else{
          list.splice(originIndex, 1);
        }
      }

      vm.drop = undefined;

        console.log('itemlist', vm.itemlist);
    }

    function dragEndLog(originIndex, list){
      console.log('originIndex '+ originIndex, 'list', list);
      console.log(vm.drop.destItem.renderedContent);
      if(vm.drop && vm.drop.destItem && vm.drop.index){
        vm.drop.destItem.renderedContent[vm.drop.index] = vm.drop.item.log;
        let content = vm.drop.destItem.content.split('\\n');
        content.splice(vm.drop.index, 0, vm.drop.item.log);
        vm.drop.destItem.content = content.join('\\n');

        //delete vm.drop.destItem.renderedContent
        let newBlock = BlockUtil.createBlockString(vm.drop.destItem, undefined);
        BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function(success){
          console.log('success');
          // let block = success.block;
          vm.loglist = success.loglist;

          $http.get('/api/blocks/'+vm.user).then(response => {
            if(response.data.length > 0){
              vm.blockList = response.data;

              vm.init();
            }
          }, (err) => {
            //file does not exist yet
            console.log('error fetching blocks', err);
          });

        });

      }
      console.log('vm.drop', vm.drop);
      // vm.itemlist.splice(originIndex, 1);
        // if(vm.drop && vm.drop.index < originIndex){
        //   list.splice(originIndex+1, 1);
        // }
        // else{
        //   list.splice(originIndex, 1);
        // }

      vm.drop = undefined;

      console.log('itemlist', vm.itemlist);
    }

    function dragDrop(index, item, destItem){
      console.log('drag drop', index, destItem);
      vm.drop = {item: item, destItem: destItem, index: index};
    }


//check if all logs used + no block without content

  }
})();
