'use strict';

(function() {

class MainController {

  constructor($http, StorageUtil, $sce, $interval,  ModalService, LogUtil, BlockUtil) {
    this.user = undefined;
    this.selectFocus = false;
    this.userDefined = false;
    this.$http = $http;
    this.$interval = $interval;
    // this.$route = $route;
    this.StorageUtil = StorageUtil;
    this.ModalService = ModalService;
    this.BlockUtil = BlockUtil;
    this.LogUtil = LogUtil;
    this.selection = '';
    this.blockList = [];

    this.rStudioEndpoint = $sce.trustAsResourceUrl('http://34.251.106.133:8787');
    //this.rStudioEndpoint = $sce.trustAsResourceUrl('http://192.168.56.101:8787');

    this.init();

  }

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
    // this.getAllBlocks();
    // this.$interval(this.pollLogs.bind(this), 5000);
  }

  saveBlock(newBlock) {
    // var bs = this.BlockUtil.encodeBlock(this.blockList);
    console.log('saving new block', newBlock.blockString);
      this.$http.post('/api/blocks', {block: newBlock, user: this.user }).then(response => {
        console.log('response', response);
        if(response.data){
          this.blockList = this.BlockUtil.decodeBlock(response.data);
          this.saveFiles(newBlock.timestamp);
        }
      });

  }

  pollLogs(){
      this.$http.get('/api/logs/'+this.user).then(response => {
        let log = response.data.content;
        if(!this.selectFocus) {
          this.loglist = this.LogUtil.formatLogs(log.split("\n"));
        }
      });
  }

  filesIndex(){
    this.$http.get('/api/files').then(response => {
      console.log('filesindex-response', response);
    });
  }

  getAllBlocks(){

    this.$http.get('/api/blocks/'+this.user).then(response => {
      if(response.data.length > 0){
        this.blockList = this.BlockUtil.decodeBlock(response.data);
        console.log(this.blockList);
      }
    }, (err) => {
      //file does not exist yet
      console.log('error fetching blocks', err);
    });
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
    });
  }

  loadFiles(block){
    console.log(block);
    if(block && block.timestamp){
      this.$http.get('/api/files/'+this.user+'/'+block.timestamp).then(response => {
        if(response.data.length > 0){
          console.log(response.data);
          // this.$route.reload();
          $window.location.reload();
        }
      }, (err) => {
        //file does not exist yet
        console.log('error loading files', err);
      });
    }

  }


  createBlock(){

    if(this.selection && this.selection.length > 0){
      var that = this;
      let select = this.selection;

      this.ModalService.showModal({
        templateUrl: "app/blockmodal/blockmodal.html",
        controller: "BlockModalController",
        inputs: {
          title: "Add a new block"
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
