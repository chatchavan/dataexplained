(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('FinishCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, $state, $q, Auth, Util, StorageUtil, LogUtil, BlockUtil, ModalService) {

    var vm = this;
    vm.loglist = $stateParams.loglist;
    vm.dbLogs = $stateParams.dbLogs;
    vm.blockList = $stateParams.blockList;


    vm.init = init;
    vm.showInfo = showInfo;
    vm.removeLog = removeLog;
    vm.editBlock = editBlock;
    vm.confirmBlocks = confirmBlocks;
    vm.goBack = goBack;
    vm.dragDrop = dragDrop;
    vm.dragEnd = dragEnd;
    vm.dragEndLog = dragEndLog;
    vm.checkAllItems = checkAllItems;

    //=========INIT=========

    vm.init();

    function init() {

      vm.user = Util.checkUserStep(2);

      //CHECK LISTS
      if (!vm.blockList || !vm.loglist || !vm.dbLogs) {
        $http.get('/api/blocks/' + vm.user).then(response => {
          if (response.data.length > 0) {
            vm.blockList = response.data;
            getDbLogs().then(function () {
              createItemList();
            }, function () {
              $state.go('^.main');
            });
          }
        }, (err) => {
          //file does not exist yet
          $state.go('^.main');
          console.log('error fetching blocks', err);
        });
      }

      else {
        vm.loglist = LogUtil.markLogs(vm.loglist, vm.dbLogs);
        vm.user = StorageUtil.retrieveSStorage('user');
        createItemList();
      }
    }

    //=========CONTROLLER=========

    function getDbLogs() {
      let deferred = $q.defer();
      $http.get('/api/logs/file/'+vm.user).then(response => {
        vm.dbLogs = response.data.dbLogs;
        let fileLogs = response.data.fileLogs;
        vm.loglist = LogUtil.formatLogs(fileLogs.split('\n'), vm.dbLogs);
        deferred.resolve();
      }, (err) => {
        //file does not exist yet
        console.log('error fetching blocks', err);
        deferred.reject();
      });
      return deferred.promise;
    }

    function createItemList() {
      vm.itemlist = [];
      vm.loglist = vm.loglist ? vm.loglist : [];

      for (let i = 0; i < vm.loglist.length; i++) {
        if (!vm.loglist[i].used) {
          vm.itemlist.push(vm.loglist[i]);
          vm.itemlist[vm.itemlist.length - 1].title = vm.loglist[i].log;
          vm.itemlist[vm.itemlist.length - 1].timestamp = new Date(Number(vm.loglist[i].timestamp));

        }
      }

      for (let b in vm.blockList) {
        vm.blockList[b].renderedContent = vm.blockList[b].content.length > 0 ? vm.blockList[b].content.split('\\n') : [];
        // vm.blockList[b].renderedContent = vm.blockList[b].content.split('\\n');
      }
      vm.itemlist = vm.itemlist.concat(vm.blockList);
      vm.itemlist.sort(function (a, b) {
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      console.log('itemlist', vm.itemlist);
    }

    function showInfo() {
      let text = ['See the corresponding log-statements of each block by clicking on the block title.', 'If you think an associated log-statement does not fit to the respective block, you can remove it from that block by clicking on the \'X\' symbol next to it.', 'Unassigned log-statements are marked in red. To assign them to a block, expand the desired block and drag&drop the log-statement to the desired position in the expanded area.', 'To edit a block, klick on the edit symbol next to the block title.', 'In order to proceed to the next step, each log-statement needs to be assigned to a block, and no block must be empty.'];
      ModalService.showModal({
        templateUrl: "app/custommodal/custommodal.html",
        controller: "CustomModalController",
        inputs: {
          title: 'Rearrange Log-statements',
          text: text,
          actionText1: 'Ok',
          actionText2: undefined
        }
      }).then(function (modal) {
        modal.element.modal();
        modal.close.then(result => {
        });
      });
    }

    function removeLog(line, block) {
      console.log('removing ' + line + ' from block ' + block._id);

      let logEntries = vm.dbLogs.filter(function (item) {
        return item.block === block._id && item.log === line;
      });

      console.log(logEntries);
      //console.log(block.content.split('\\n').length > 1);


      if (logEntries.length > 0) {
        $http.post('/api/logs/delete', {user: vm.user, logId: logEntries[0]._id, blockId: block._id}).then(response => {
          if (response.data) {
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

    function createBlock(drop) {

      if (drop && drop.item && drop.destItem && drop.index !== undefined) {
        let selection = [drop.destItem];
        if (drop.index === 0) {
          selection.unshift(drop.item); //add item at beginning
        }
        else {
          selection.push(drop.item); //add item at end
        }
        BlockUtil.createBlock(selection, vm.loglist, vm.dbLogs, vm.user).then(function (success) {
          vm.blockList = success.blockList;
          vm.loglist = success.loglist;
          vm.dbLogs = success.dbLogs;
          vm.init();
        });
      }

    }

    function editBlock(block) {

      ModalService.showModal({
        templateUrl: "app/blockmodal2/blockmodal2.html",
        controller: "BlockModal2Controller",
        inputs: {
          title: "Edit block",
          edit: 'finish',
          block: block,
          content: undefined,
        }
      }).then(function (modal) {
        modal.element.modal();
        modal.close.then(result => {
          if (result === 'deleteBlock') {
            BlockUtil.deleteBlock(block, vm.user, vm.loglist).then(function (success) {
              vm.blockList = success.blockList;
              vm.loglist = success.loglist;
              vm.dbLogs = success.dbLogs;
              vm.init();
            });
          }
          else if (result === 'showFilesDiff') {
            Util.showFilesDiff(block, vm.user);
          }
          else if(result && result.title){
            let newBlock = BlockUtil.createBlockString(result, undefined);
            BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function (success) {
              vm.block = success.block;
              vm.loglist = success.loglist;
              vm.init();
            });
          }
        });
      });
    }

    function confirmBlocks() {
      Auth.setUserStep(3);
      $state.go('^.graph', {'blocks': vm.blockList});
    }

    function goBack() {
      Auth.setUserStep(1);
      $state.go('^.main');
    }

    function dragEnd(originIndex, list) {
      if (list && list.length > 0) {
        if (vm.drop && vm.drop.index < originIndex) {
          list.splice(originIndex + 1, 1);
        }
        else {
          list.splice(originIndex, 1);
        }
      }

      vm.drop = undefined;

      // console.log('itemlist', vm.itemlist);
    }

    function dragEndLog(originIndex, list) {
      if (vm.drop && vm.drop.destItem && vm.drop.index !== undefined && vm.drop.item) {

        if (!vm.drop.loglog) {

          let newBlock = vm.drop.destItem;
          // console.log('originIndex '+ originIndex, 'list', list);
          console.log(vm.drop.item, newBlock);
          newBlock.renderedContent[vm.drop.index] = vm.drop.item.log;
          if (newBlock.content.length > 0) {
            let content = newBlock.content.split('\\n');
            content.splice(vm.drop.index, 0, vm.drop.item.log);
            newBlock.content = content.join('\\n');
          }
          else {
            newBlock.content = vm.drop.item.log;
          }

          if (new Date(vm.drop.item.timestamp).getTime() > new Date(newBlock.timestamp).getTime()) {
            newBlock.timestamp = vm.drop.item.timestamp;
          }


          $http.post('/api/logs', {user: vm.user, log: vm.drop.item, blockId: vm.drop.destItem._id}).then(response => {
            vm.dbLogs = response.data;
            console.log('new dblogs', vm.dbLogs);
            //delete vm.drop.destItem.renderedContent
            console.log('update BLOCK', vm.loglist, vm.dbLogs);
            BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function (success) {
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
        else {
          //loglog
          if (!areSameLogs(vm.drop.destItem, vm.drop.item)) {
            createBlock(vm.drop);
          }
        }
      }

    }

    function dragDrop(index, item, destItem, loglog) {
      // console.log('drag drop', index, destItem);
      vm.drop = {item: item, destItem: destItem, index: index, loglog: loglog};
    }


    function checkAllItems() {
      if (!vm.itemlist) {
        return false;
      }

      for (let i = 0; i < vm.itemlist.length; i++) {
        if (vm.itemlist[i].log || !vm.itemlist[i].content || vm.itemlist[i].content.length <= 0) {
          return false;
        }
      }

      return true;
    }

    function areSameLogs(logItem1, logItem2) {
      return logItem1.log === logItem2.log && new Date(logItem1.timestamp).getTime() === new Date(logItem2.timestamp).getTime();
    }


//check if all logs used + no block without content

  }
})();
