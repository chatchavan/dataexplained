'use strict';

(function() {

class MainController {

  constructor($http, LocalStorageUtil, $sce, $interval, ModalService, LogUtil, BlockUtil) {
    this.user = undefined;
    this.selectFocus = false;
    this.userDefined = false;
    this.$http = $http;
    this.$interval = $interval;
    this.LocalStorageUtil = LocalStorageUtil;
    this.ModalService = ModalService;
    this.BlockUtil = BlockUtil;
    this.LogUtil = LogUtil;
    this.selection = '';
    this.blockList = [];
    this.blockPrefix = BlockUtil.getBlockPrefix();
    this.blockSuffix = BlockUtil.getBlockSuffix();

    this.rStudioEndpoint = $sce.trustAsResourceUrl('http://34.251.106.133:8787');
    //this.rStudioEndpoint = $sce.trustAsResourceUrl('http://192.168.56.101:8787');

    this.init();

  }

  focus(){
    console.log('focus');
  }

  blur(){
    console.log('blur');
  }

  init(){
    this.user = this.LocalStorageUtil.retrieve('user');
    console.log('retrieved user from localstorage', this.user);
    if(this.user){
      this.userDefined = true;
      this.startPolling();
    }

  }

  setUser(){
    this.LocalStorageUtil.save('user',this.user);
    this.userDefined = true;
    this.startPolling();
  }

  startPolling(){
    this.pollLogs();
    this.getAllBlocks();
    this.$interval(this.pollLogs.bind(this), 5000);
  }

  saveBlock(blockString) {
    // var bs = this.BlockUtil.encodeBlock(this.blockList);
    console.log('saving new block', blockString);
      // this.$http.post('/api/blocks', {blockString: blockString, user: this.user }).then(response => {
      //   console.log('response', response);
      //   if(response.data){
      //     this.blockList = this.BlockUtil.decodeBlock(response.data);
      //   }
      // });
  }

  pollLogs(){
      this.$http.get('/api/logs',{params: {user: this.user}}).then(response => {
        let log = response.data.content;
        if(!this.selectFocus) {
          this.loglist = this.LogUtil.formatLogs(log.split("\n"));
        }
      });
  }

  getAllBlocks(){
    console.log('get all blocks');

    this.$http.get('/api/blocks/'+this.user).then(response => {
      console.log('response', response);
      if(response.data.length > 0){
        this.blockList = this.BlockUtil.decodeBlock(response.data);
        console.log(this.blockList);
      }
    }, (err) => {
      //file does not exist yet
      console.log('error fetching blocks', err);
    });
  }


  createBlock(){
    console.log(this.selection);
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
