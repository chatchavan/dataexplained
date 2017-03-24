'use strict';

(function() {

class MainController {

  constructor($http, StorageUtil, Util, $interval, $timeout, ModalService, LogUtil, BlockUtil) {
    this.user = undefined;
    this.selectFocus = false;
    this.userDefined = false;
    this.$http = $http;
    this.$timeout = $timeout;
    this.$interval = $interval;
    this.Util = Util;
    this.StorageUtil = StorageUtil;
    this.ModalService = ModalService;
    this.BlockUtil = BlockUtil;
    this.LogUtil = LogUtil;
    this.selection = '';
    this.blockList = [];
    this.displayPanel = false;

    this.rStudioEndpoint = this.Util.getRStudioUri();

    this.init();

  }

  //=========INIT=========


  init(){
    this.user = this.StorageUtil.retrieveSStorage('user');
    console.log('retrieved user from sessionstorage', this.user);
    if(this.user){
      this.userDefined = true;
      this.startPolling();
    }

  }

  setUser(){
    this.StorageUtil.saveSStorage('user',this.user);
    this.userDefined = true;
    this.startPolling();
  }

  startPolling(){
    this.pollLogs();
    this.getAllBlocks();
    this.$interval(this.pollLogs.bind(this), 5000);
  }

  testIndex(){
    this.$http.get('/api/files/').then(response => {
      let diff = response.data.data;
      var diff2htmlUi = new Diff2HtmlUI({diff: diff});
      diff2htmlUi.draw('#line-by-line', {inputFormat: 'diff', showFiles: true, matching: 'none'});
      diff2htmlUi.highlightCode('#line-by-line');
    }, (err) => {
      console.log(err);
    });

  }

  //=========LOGS=========

  pollLogs(){
    this.$http.get('/api/logs/'+this.user).then(response => {
      let log = response.data.content;
      if(!this.selectFocus) {
        this.loglist = this.LogUtil.formatLogs(log.split("\n"), this.blockList);
      }
    }, (err) => {
      console.log(err);
    });
  }

  //=========BLOCKS=========
  getAllBlocks(){


    this.$http.get('/api/blocks/'+this.user).then(response => {
      if(response.data.length > 0){
        console.log('got all blocks', response.data);
        this.blockList = response.data;
        this.loglist = this.LogUtil.markLogs(this.loglist, this.blockList);
      }
    }, (err) => {
      //file does not exist yet
      console.log('error fetching blocks', err);
    });
  }

  createBlock(){

    if(this.selection && this.selection.length > 0){
      var that = this;
      let select = this.selection;
      let content = that.BlockUtil.createBlock({}, select);

      this.ModalService.showModal({
        templateUrl: "app/blockmodal2/blockmodal2.html",
        controller: "BlockModal2Controller",
        inputs: {
          title: "Add a new block",
          edit: false,
          block: undefined,
          content: content
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close.then(result => {
          if(result){
            that.saveBlock(that.BlockUtil.createBlock(result, select));
          }
        });
      });
    }

  }

  editBlock(block){
    var that = this;
    let select = this.selection;

    this.ModalService.showModal({
      templateUrl: "app/blockmodal/blockmodal.html",
      controller: "BlockModalController",
      inputs: {
        title: "Edit block",
        edit: true,
        block: block,
        content: undefined
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(result => {
        if(result === 'loadFiles'){
          that.loadFiles(block);
        }
        else if(result === 'deleteBlock'){
          that.deleteBlock(block);
        }
        else if(result){
          that.updateBlock(that.BlockUtil.createBlock(result, select));
        }
      });
    });
  }

  updateBlock(newBlock) {
    console.log('updating block', newBlock);
    this.Util.showLoadingModal('Updating Block...');

    this.$http.put('/api/blocks', {block: newBlock, user: this.user }).then(response => {
      this.hideModal('processing-modal');
      console.log('response', response);
      if(response.data.length > 0){
        this.blockList = response.data;
        this.loglist = this.LogUtil.markLogs(this.loglist, this.blockList);
      }

    }, (err) => {
      this.hideModal('processing-modal');
      console.log(err);
    });

  }


  deleteBlock(block){
    var that = this;
    let actionText1 = 'Yes';
    let actionText2 = 'No';

    this.ModalService.showModal({
      templateUrl: "app/custommodal/custommodal.html",
      controller: "CustomModalController",
      inputs: {
        title: "Delete block",
        text: 'Do you really want to delete this block?',
        actionText1: actionText1,
        actionText2: actionText2
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(result => {
        if(result === actionText1){
          that.Util.showLoadingModal('Deleting Block...');

          that.$http.delete('/api/blocks/'+that.user+'/'+block._id).then(response => {
            that.hideModal('processing-modal');
            if(response.data){
              console.log('response.data', response.data);
              that.blockList = response.data;
              console.log('that.blockList', that.blockList);
              that.loglist = that.LogUtil.markLogs(that.loglist, that.blockList);

            }
          }, (err) => {
            that.hideModal('processing-modal');
            console.log('error deleting block', err);
          });

        }
      });
    });
  }




  saveBlock(newBlock) {
    console.log('saving new block', newBlock);
    this.Util.showLoadingModal('Saving new Block...');

    this.$http.post('/api/blocks', {block: newBlock, user: this.user }).then(response => {
      console.log('response', response);
        if(response.data){
          this.blockList = response.data;
          this.loglist = this.LogUtil.markLogs(this.loglist, this.blockList);
          this.saveFiles(newBlock.timestamp);
        }
        else{
          this.hideModal('processing-modal');
        }
      }, (err) => {
      this.hideModal('processing-modal');
      console.log(err);
      });

  }


  //=========FILES=========

  loadFiles(block){
    console.log(block);
    if(block && block.timestamp){
      this.Util.showLoadingModal('Restoring Workspace...');
      this.$http.get('/api/files/'+this.user+'/'+block.timestamp).then(response => {
        console.log('files replaced');
        this.hideModal('processing-modal');

      }, (err) => {
        //file does not exist yet
        console.log('error loading files', err);
        this.hideModal('processing-modal');
      });
    }

  }

  saveFiles(timestamp){
    if(!timestamp){
      timestamp = '';
    }
    console.log('saving files with timestamp: '+ timestamp);
    this.$http.post('/api/files', {user: this.user, timestamp: timestamp }).then(response => {
      this.hideModal('processing-modal');
      console.log('response', response);
      if(response.data){
        console.log('files saved', response.data);
      }
    }, (err) => {
      console.log(err);
    });
  }




  //=========HELPER FUNCTIONS=========

  hideModal(id){

    this.$timeout(function(){
      let modal = document.getElementById(id);
      let modalBack = document.getElementsByClassName('modal-backdrop')[0];

      if(modal && modalBack){
        modal.remove();
        modalBack.remove();
      }
      $('body').removeClass('modal-open');
    },500);


  }

  arraysEqual(arr1, arr2) {
    if(!arr1 || arr2){
      return false;
    }
    if(arr1.length !== arr2.length)
      return false;
    for(var i = arr1.length; i--;) {
      if(arr1[i].log !== arr2[i].log || arr1[i].timestamp !== arr2[i].timestamp)
        return false;
    }
    return true;
  }

}

angular.module('rationalecapApp')
  .controller('MainController', MainController);

})();
