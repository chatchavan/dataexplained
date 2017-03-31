(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('FinishCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, $state, Util, StorageUtil, LogUtil, BlockUtil, ModalService) {

    var vm = this;
    vm.loglist = $stateParams.loglist;
    vm.dbLogs = $stateParams.dbLogs;
    vm.blockList = $stateParams.blockList;


    vm.init = init;
    vm.removeLog = removeLog;
    vm.editBlock = editBlock;
    vm.confirmBlocks = confirmBlocks;
    vm.dragDrop = dragDrop;
    vm.dragEnd = dragEnd;
    vm.dragEndLog = dragEndLog;
    vm.checkAllItems = checkAllItems;

    //=========INIT=========

    vm.init();

    function init() {
      if(!vm.loglist|| !vm.blockList || !vm.dbLogs){
        $state.go('^.main');
      }
      else{
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
          vm.blockList[b].renderedContent = vm.blockList[b].content.length > 0 ? vm.blockList[b].content.split('\\n') : [];
          // vm.blockList[b].renderedContent = vm.blockList[b].content.split('\\n');
        }
        vm.itemlist = vm.itemlist.concat(vm.blockList);
        vm.itemlist.sort(function(a,b){
          // Turn your strings into dates, and then subtract them
          // to get a value that is either negative, positive, or zero.
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
        console.log('itemlist', vm.itemlist);
      }
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

        // console.log('itemlist', vm.itemlist);
    }

    function dragEndLog(originIndex, list){
      if(vm.drop && vm.drop.destItem && vm.drop.index !== undefined && vm.drop.item){
        let newBlock = vm.drop.destItem;
        // console.log('originIndex '+ originIndex, 'list', list);
        console.log(vm.drop.item, newBlock);
        newBlock.renderedContent[vm.drop.index] = vm.drop.item.log;
        if(newBlock.content.length>0){
          let content = newBlock.content.split('\\n');
          content.splice(vm.drop.index, 0, vm.drop.item.log);
          newBlock.content = content.join('\\n');
        }
        else{
          newBlock.content = vm.drop.item.log;
        }

        if(new Date(vm.drop.item.timestamp).getTime() > new Date(newBlock.timestamp).getTime()){
          newBlock.timestamp = vm.drop.item.timestamp;
        }


        $http.post('/api/logs', {user: vm.user, log: vm.drop.item, blockId: vm.drop.destItem._id}).then(response => {
          vm.dbLogs = response.data;
          console.log('new dblogs', vm.dbLogs);
          //delete vm.drop.destItem.renderedContent
          console.log('update BLOCK', vm.loglist, vm.dbLogs);
          BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function(success){
            console.log('success', success);
            vm.blockList = success.blockList;
            vm.loglist = success.loglist;
            vm.drop = undefined;

            // vm.itemlist.splice(originIndex, 1);
            // if(vm.drop && vm.drop.index < originIndex){
            //   list.splice(originIndex+1, 1);
            // }
            // else{
            //   list.splice(originIndex, 1);
            // }

            vm.init();


          });

        }, (err) => {
          console.log(err);
        });



      }

    }

    function dragDrop(index, item, destItem){
      // console.log('drag drop', index, destItem);
      vm.drop = {item: item, destItem: destItem, index: index};
    }


    function checkAllItems(){
      if(!vm.itemlist){
        return false;
      }

      for(let i = 0; i < vm.itemlist.length; i++){
        if(vm.itemlist[i].log || !vm.itemlist[i].content || vm.itemlist[i].content.length <=0){
          return false;
        }
      }

      return true;
    }




//check if all logs used + no block without content

  }
})();
