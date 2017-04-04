'use strict';

(function() {

class MainController {

  constructor(Auth, $http, StorageUtil, Util, $interval, $timeout, $state, ModalService, LogUtil, BlockUtil) {

    this.Auth = Auth;
    this.$http = $http;
    this.$timeout = $timeout;
    this.$interval = $interval;
    this.$state = $state;
    this.Util = Util;
    this.StorageUtil = StorageUtil;
    this.ModalService = ModalService;
    this.BlockUtil = BlockUtil;
    this.LogUtil = LogUtil;

    this.user = undefined;
    this.selectFocus = false;
    this.userDefined = false;
    this.selection = '';
    this.blockList = [];
    this.loglist = [];
    this.dbLogs = [];
    this.displayPanel = false;

    this.rStudioEndpoint = this.Util.getRStudioUri();
    this.logThreshold = 2;
    this.logWarningShowed = false;

    this.init();

  }

  //=========INIT=========


  init(){
    if(!this.Auth.isLoggedIn()){
      this.$state.go('^.login');
    }
    else{
      this.user = this.Auth.getCurrentUser().username;
      if(this.user){
        this.StorageUtil.saveSStorage('user',this.user);
        this.userDefined = true;
        this.startPolling();
      }
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


  //=========LOGS=========e

  pollLogs(){
    this.$http.get('/api/logs/file/'+this.user).then(response => {
      let fileLogs = response.data.fileLogs;
      this.dbLogs = response.data.dbLogs;
      if(!this.selectFocus) {
        let tempLogList = this.LogUtil.formatLogs(fileLogs.split('\n'), this.dbLogs);
        if(tempLogList.length > this.loglist.length){
          this.logWarningShowed = false;
        }
        this.loglist = tempLogList;
        this.checkLogs(this.loglist);
      }
    }, (err) => {
      console.log(err);
    });
  }

  checkLogs(logList){
    if(logList){
      let unusedLogs = logList.filter(function(item){
        return !item.used;
      });
      if(unusedLogs.length > this.logThreshold && !this.logWarningShowed){
        this.logWarningShowed = true;
        let actionText1 = 'Ok';
        let text = ['Please create a new block.'];

        this.ModalService.showModal({
          templateUrl: "app/custommodal/custommodal.html",
          controller: "CustomModalController",
          inputs: {
            title: 'More than '+this.logThreshold +' logs are not assigned to a block.',
            text: text,
            actionText1: actionText1,
            actionText2: undefined
          }
        }).then(function(modal) {
          modal.element.modal();
          modal.close.then(result => {
          });
        });
      }
      else if(unusedLogs.length <= this.logThreshold){
        this.logWarningShowed = false;
      }

    }
    else{
      this.logWarningShowed = false;
    }

  }

  //=========BLOCKS=========
  getAllBlocks(){


    this.$http.get('/api/blocks/'+this.user).then(response => {
      if(response.data.length > 0){
        console.log('got all blocks', response.data);
        this.blockList = response.data;
        this.loglist = this.LogUtil.markLogs(this.loglist, this.dbLogs);
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
      let content = that.BlockUtil.createBlockString({}, select);

      this.ModalService.showModal({
        templateUrl: "app/blockmodal2/blockmodal2.html",
        controller: "BlockModal2Controller",
        inputs: {
          title: "Add a new block",
          edit: undefined,
          block: undefined,
          content: content,
          jsplumb: false
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close.then(result => {
          if(result){
            that.saveBlock(that.BlockUtil.createBlockString(result, select), select);
          }
        });
      });
    }

  }

  editBlock(block){
    let that = this;

    this.ModalService.showModal({
      templateUrl: "app/blockmodal2/blockmodal2.html",
      controller: "BlockModal2Controller",
      inputs: {
        title: "Edit block",
        edit: 'edit',
        block: block,
        content: undefined,
        jsplumb: false
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
        else if(result === 'showFilesDiff'){
          that.Util.showFilesDiff(block, that.user);
        }
        else if(result){
          that.updateBlock(result);
        }
      });
    });
  }

  updateBlock(newBlock) {
    let that = this;
    this.BlockUtil.updateBlock(newBlock, this.user, this.loglist, this.dbLogs).then(function(success){
      that.blockList = success.blockList;
      that.loglist = success.loglist;
    });
  }


  deleteBlock(block){
    let that = this;
    this.BlockUtil.deleteBlock(block, this.user, this.loglist).then(function(success){
      console.log('success', success);
      that.blockList = success.blockList;
      that.loglist = success.loglist;
      that.dbLogs = success.dbLogs;
    });
  }




  saveBlock(newBlock, selection) {
    console.log('saving new block', newBlock, selection);
    this.Util.showLoadingModal('Saving new Block...');

    this.$http.post('/api/blocks', {block: newBlock, user: this.user, selection: selection }).then(response => {
      console.log('response', response);
        if(response.data){
          this.blockList = response.data.blockList;
          this.dbLogs = response.data.dbLogs;
          this.loglist = this.LogUtil.markLogs(this.loglist, this.dbLogs);
          this.saveFiles(newBlock.timestamp);
        }
        else{
          this.Util.hideModal('processing-modal');
        }
      }, (err) => {
      this.Util.hideModal('processing-modal');
      console.log(err);
      });

  }


  //=========FILES=========

  loadFiles(block){
    console.log(block);
    if(block && block.timestamp){
      this.Util.showLoadingModal('Restoring Workspace...');
      this.$http.get('/api/files/'+this.user+'/'+block.timestamp).then(response => {
        console.log('files replaced', response.data);
        this.Util.hideModal('processing-modal');

      }, (err) => {
        //file does not exist yet
        console.log('error loading files', err);
        this.Util.hideModal('processing-modal');
      });
    }

  }

  saveFiles(timestamp){
    if(!timestamp){
      timestamp = '';
    }
    console.log('saving files with timestamp: '+ timestamp);
    this.$http.post('/api/files', {user: this.user, timestamp: timestamp }).then(response => {
      this.Util.hideModal('processing-modal');
      console.log('response', response);
      if(response.data){
        console.log('files saved', response.data);
      }
    }, (err) => {
      this.Util.hideModal('processing-modal');
      console.log(err);
    });
  }



  //=========FINISH ANALYSIS=========
  finishAnalysis(){

    var that = this;

      let actionText1 = 'Yes';
      let actionText2 = 'No';


    this.ModalService.showModal({
      templateUrl: "app/custommodal/custommodal.html",
      controller: "CustomModalController",
      inputs: {
        title: "Finish Analysis",
        text: ['Please confirm that you have finished analysis'],
        actionText1: actionText1,
        actionText2: actionText2
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(result => {
        if(result === actionText1){

          that.$http.post('/api/logs/finish', {logs: that.loglist, user: that.user }).then(response => {
            console.log('response', response);
            if(response.data){
              that.$state.go('^.finish', {'loglist': that.loglist, 'dbLogs': response.data.logs, 'blockList': that.blockList});
            }
            else{
            }
          }, (err) => {
            console.log(err);
          });



        }
      });
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
