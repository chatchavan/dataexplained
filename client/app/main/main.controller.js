'use strict';

(function() {

class MainController {

  constructor($http, StorageUtil, Util, $interval,  ModalService, LogUtil, BlockUtil) {
    this.user = undefined;
    this.selectFocus = false;
    this.userDefined = false;
    this.$http = $http;
    this.$interval = $interval;
    this.StorageUtil = StorageUtil;
    this.ModalService = ModalService;
    this.BlockUtil = BlockUtil;
    this.LogUtil = LogUtil;
    this.selection = '';
    this.blockList = [];

    this.rStudioEndpoint = Util.getRStudioUri();

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

      this.ModalService.showModal({
        templateUrl: "app/blockmodal/blockmodal.html",
        controller: "BlockModalController",
        inputs: {
          title: "Add a new block",
          edit: false,
          block: undefined
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
        block: block
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
    this.$http.put('/api/blocks', {block: newBlock, user: this.user }).then(response => {
      console.log('response', response);
      if(response.data.length > 0){
        this.blockList = response.data;
        this.loglist = this.LogUtil.markLogs(this.loglist, this.blockList);
      }

    }, (err) => {
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

          that.$http.delete('/api/blocks/'+that.user+'/'+block._id).then(response => {
            if(response.data){
              console.log('response.data', response.data);
              that.blockList = response.data;
              console.log('that.blockList', that.blockList);
              that.loglist = that.LogUtil.markLogs(that.loglist, that.blockList);

            }
          }, (err) => {
            console.log('error deleting block', err);
          });

        }
      });
    });
  }




  saveBlock(newBlock) {
    console.log('saving new block', newBlock);
      this.$http.post('/api/blocks', {block: newBlock, user: this.user }).then(response => {
        console.log('response', response);
        if(response.data){
          this.blockList = response.data;
          this.loglist = this.LogUtil.markLogs(this.loglist, this.blockList);
          this.saveFiles(newBlock.timestamp);
        }
      }, (err) => {
        console.log(err);
      });

  }


  //=========FILES=========

  loadFiles(block){
    console.log(block);
    if(block && block.timestamp){
      this.$http.get('/api/files/'+this.user+'/'+block.timestamp).then(response => {
        if(response.data.length > 0){
          console.log(response.data);
          $window.location.reload();
        }
      }, (err) => {
        //file does not exist yet
        console.log('error loading files', err);
      });
    }

  }

  saveFiles(timestamp){
    if(!timestamp){
      timestamp = '';
    }
    console.log('saving files with timestamp: '+ timestamp);
    this.$http.post('/api/files', {user: this.user, timestamp: timestamp }).then(response => {
      console.log('response', response);
      if(response.data){
        console.log('files saved', response.data);
      }
    }, (err) => {
      console.log(err);
    });
  }




  //=========HELPER FUNCTIONS=========

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
