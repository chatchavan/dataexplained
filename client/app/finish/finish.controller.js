(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('FinishCtrl', FinishCtrl);

  function FinishCtrl($stateParams, $http, $state, $q, $timeout, Auth, Util, StorageUtil, LogUtil, BlockUtil, ModalService) {

    var vm = this;
    vm.loglist = $stateParams.loglist;
    vm.dbLogs = $stateParams.dbLogs;
    vm.blockList = $stateParams.blockList;
    vm.checkedList = [];
    vm.collapsed = [];


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
    vm.checkItem = checkItem;
    //=========INIT=========

    vm.init();

    function init() {
      Util.hideModal('processing-modal');
      saveCollapsed();
      vm.user = Util.checkUserStep(2);

      //CHECK LISTS
      if (!vm.blockList || !vm.loglist || !vm.dbLogs) {
        $http.get('/api/blocks/user').then(response => {
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

      loadCollapsed();
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

    function checkItem(item, index, unChecked){
      let element = {block: item, index: index, log: item.renderedContent[index]};
      if(unChecked){
        let index = arrayObjectIndexOf(vm.checkedList, element);
        if(index > -1){
          vm.checkedList.splice(index, 1);
        }
      }
      else{
        vm.checkedList.push(element);
      }
    }

    function removeLog(line, logIndex, block, norefresh) {

      let logEntries = vm.dbLogs.filter(function (item) {
        return item.block === block._id && item.log === line;
      });



      if (logEntries.length > 0) {
        $http.post('/api/logs/delete', {user: vm.user, logId: logEntries[0]._id, blockId: block._id, logIndex: logIndex}).then(response => {
          if (response.data && !norefresh) {
            vm.dbLogs = response.data.dbLogs;
            vm.blockList = response.data.blockList;
            vm.init();
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


    // function onDragstart(list, event){
    //   list.dragging = true;
    //   if (event.dataTransfer.setDragImage) {
    //     var img = new Image();
    //     img.src = 'assets/images/content-copy.png';
    //     event.dataTransfer.setDragImage(img, 0, 0);
    //   }
    // }

    function dragEnd(originIndex, originItem) {

      let originList = originItem.renderedContent;
      let blocksToUpdate = [];
      let newBlock = vm.drop.destItem;



      if(vm.checkedList.length <= 0){
        //SINGLE DRAG&DROP

        if(originItem._id === vm.drop.destItem._id){
          //same block
          if (originList && originList.length > 0) {
            if (vm.drop && vm.drop.index < originIndex) {
              originList.splice(originIndex + 1, 1);
            }
            else {
              originList.splice(originIndex, 1);
            }
          }
          originItem.content = originList.join('\\n');
          newBlock = originItem;
          updateBlock(newBlock, function(success){
            vm.blockList = success.blockList;
            vm.loglist = success.loglist;

            vm.init();
          });
        }
        else{
          //different block
          newBlock.renderedContent.splice(vm.drop.index, 1);
          shiftLog(originItem.renderedContent[originIndex], originIndex, vm.drop.index, originItem, newBlock);
          vm.checkedList.length = 0;
          vm.drop = undefined;
          return;
        }

      }
      else{

        //MULTIPLE DRAG& DROP

        for(var i = 0; i < vm.checkedList.length; i++){
          vm.checkedList[i].block.renderedContent[vm.checkedList[i].index] = undefined;
        }

        for(var i =0; i < vm.checkedList.length; i++){
          let rContent = vm.checkedList[i].block.renderedContent;
          for(var j= rContent.length -1; j >= 0; j--){
            if(rContent[j] === undefined){
              rContent.splice(j,1);
            }
          }
          vm.checkedList[i].block.content =  vm.checkedList[i].block.renderedContent.join('\\n');
          if (!blocksToUpdate.filter(function(b) { return b._id === vm.checkedList[i].block._id; }).length > 0) {
            blocksToUpdate.push(vm.checkedList[i].block);
          }
        }

        newBlock.renderedContent.splice(vm.drop.index, 1);

        for(var i = 0; i < vm.checkedList.length; i++){
          newBlock.renderedContent.splice(vm.drop.index+i, 0, vm.checkedList[i].log);
        }

        newBlock.content = newBlock.renderedContent.join('\\n');
      }


      let updates = 0;
      for(var k=0; k< blocksToUpdate.length; k++){
        updates++;
        updateBlock(blocksToUpdate[k], function(){
          updates--;
         if(updates === 0){
           updateBlock(newBlock, function(success){
               vm.blockList = success.blockList;
               vm.loglist = success.loglist;
               vm.drop = undefined;

               vm.init();
           });
         }
       });
      }

      vm.checkedList.length = 0;
      vm.drop = undefined;

    }

    function dragEndLog(originIndex, list) {
      if (vm.drop && vm.drop.destItem && vm.drop.index !== undefined && vm.drop.item) {

        if (!vm.drop.loglog) {

          let newBlock = vm.drop.destItem;
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

          updateData(vm.drop, newBlock, true);

        }
        else {
          //loglog
          if (vm.drop.itemListIndexOrigin !== originIndex) {
            createBlock(vm.drop);
          }
        }
      }

    }

    function updateData(vmdrop, newBlock, reload){
      $http.post('/api/logs', {user: vm.user, log: vmdrop.item, blockId: vmdrop.destItem._id}).then(response => {
        vm.dbLogs = response.data;
        BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function (success) {
          if(reload){
            vm.blockList = success.blockList;
            vm.loglist = success.loglist;
            vm.drop = undefined;

            vm.init();
          }
        });

      }, (err) => {
        console.log(err);
      });
    }

    function updateBlock(newBlock, cb){
      BlockUtil.updateBlock(newBlock, vm.user, vm.loglist, vm.dbLogs).then(function (success) {
        cb(success);
      });
    }

    function shiftLog(log, originLogIndex, destLogIndex, originBlock, destBlock){

      let logEntries = vm.dbLogs.filter(function (item) {
        return item.block === originBlock._id && item.log === log;
      });

      if (logEntries.length > 0) {
        Util.showLoadingModal('Updating Blocks...');
        $http.put('/api/logs/shift', {user: vm.user, logEntry: logEntries[0], originLogIndex: originLogIndex,
          destLogIndex: destLogIndex, originBlockId: originBlock._id, destBlockId: destBlock._id}).then(response => {
          Util.hideModal('processing-modal');
          if(response.data){
            vm.blockList = response.data.blockList ? response.data.blockList : vm.blockList;
            vm.dbLogs = response.data.dbLogs ? response.data.dbLogs : vm.dbLogs;
            vm.init();
          }

        }, (err) => {
          Util.hideModal('processing-modal');
          console.log('shift error', err);
        });
      }

    }

    function updateLog(destBlock, log){
      $http.post('/api/logs', {user: vm.user, log: log, blockId: destBlock._id}).then(response => {
        vm.dbLogs = response.data;
      }, (err) => {
        console.log(err);
      });
    }

    function dragDrop(index, item, destItem, loglog, itemListIndexOrigin) {
      vm.drop = {item: item, destItem: destItem, index: index, loglog: loglog, itemListIndexOrigin: itemListIndexOrigin};
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

    function saveCollapsed(){
      vm.collapsed = [];
      $('[id^="collapse_"]').each(function(e) {
        let el = $(this);
        if(el.hasClass('panel-collapse') && el.hasClass('out') && el.hasClass('fade') && el.hasClass('collapse')
            && el.hasClass('in')){
          vm.collapsed.push(this.id);
        }
      });

    }

    function loadCollapsed(){
      $('[id^="collapse_"]').each(function(e) {
        let el = $(this);
        if(vm.collapsed.indexOf(this.id) > -1){
          var id = this.id;
          $timeout(function(){
              $("#"+id).collapse('show');
          }, 500);
        }

      });

    }


    function arrayObjectIndexOf(myArray, object) {
      for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i]['block'] === object.block && myArray[i]['index'] === object.index) return i;
      }
      return -1;
    }



//check if all logs used + no block without content

  }
})();
