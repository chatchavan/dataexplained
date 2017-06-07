'use strict';

(function() {

class MainController {

  constructor($scope, Auth, $http, StorageUtil, Util, $interval, $timeout, $state, ModalService, LogUtil, BlockUtil) {

    this.$scope = $scope;
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

    this.rStudioEndpoint = undefined;
    this.logThreshold = 30;
    this.logThresholdExtra = 20;
    this.logWarningShowed = false;
    this.extraLogs = 0;
    this.nrLogsThresholdReached = 0;

    this.init();

  }

  //=========INIT=========


  init(){

    this.user = this.Util.checkUserStep(1);
    console.log('user', this.user);
    if(this.user){
      this.rStudioEndpoint = this.Util.getRStudioUri();
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
    let logPollInterval = this.$interval(this.pollLogs.bind(this), 1000);
    let that = this;
    this.$scope.$on('$destroy', function() {
      that.$interval.cancel(logPollInterval);
    });
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
        if(this.$state.current.name === 'main'){
          this.checkLogs(this.loglist);
        }
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
      //console.log('unusedLogs: '+unusedLogs.length, 'extraLogs: '+ this.extraLogs, 'logWarningShowed: ' +this.logWarningShowed);
      if(unusedLogs.length > this.logThreshold + this.extraLogs && !this.logWarningShowed){
        this.logWarningShowed = true;
        this.nrLogsThresholdReached = unusedLogs.length;

        if(this.extraLogs === 0){
          this.showExtraLogsModal(unusedLogs);
        }
        else{
          //force user to make blocks
          let actionText1 = 'Ok';
          let text = ['Please create a new block.'];

          let that = this;
          this.ModalService.showModal({
            templateUrl: "app/custommodal/custommodal.html",
            controller: "CustomModalController",
            inputs: {
              title: 'More than '+(this.logThreshold + this.logThresholdExtra)+' logs are not assigned to a block.',
              text: text,
              actionText1: actionText1,
              actionText2: undefined
            }
          }).then(function(modal) {
            modal.element.modal();
            modal.close.then(result => {
              that.nrLogsThresholdReached = 0;
            });
          });
        }
      }
      else if(unusedLogs.length <= this.logThreshold){
        this.logWarningShowed = false;
        this.extraLogs = 0;
      }

    }
    else{
      this.logWarningShowed = false;
      this.extraLogs = 0;
    }

  }

  showExtraLogsModal(unusedLogs){
    let text = ['You have executed '+unusedLogs.length+' commands without creating a block so far.', 'We just wanted to remind you that annotating your commands with blocks is very important for this study.'];
    let actionText1 =  undefined;
    let actionText2 = 'I got it';

    let that = this;

    this.ModalService.showModal({
      templateUrl: "app/custommodal/custommodal.html",
      controller: "CustomModalController",
      inputs: {
        title: 'More than '+this.logThreshold +' logs are not assigned to a block.',
        text: text,
        actionText1: actionText1,
        actionText2: actionText2
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(result => {
        if(result === actionText2){
          that.extraLogs = (that.nrLogsThresholdReached - that.logThreshold) + that.logThresholdExtra;
        }
        else{
          that.extraLogs = 0;
          that.nrLogsThresholdReached = 0;
        }
      });

    });
  }

  //=========BLOCKS=========
  getAllBlocks(){


    this.$http.get('/api/blocks/user').then(response => {
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
    this.$interval.cancel(this.logPollInterval);

    let that = this;
    this.BlockUtil.createBlock(this.selection, this.loglist, this.dbLogs, this.user).then(function(success){
      console.log('success', success);
      that.blockList = success.blockList;
      that.loglist = success.loglist;
      that.dbLogs = success.dbLogs;
    });
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
        else if(result && result.title){
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



  //=========FILES=========

  loadFiles(block){
    console.log(block);
    if(block && block.timestamp){
      this.Util.showLoadingModal('Restoring Workspace...');
      this.$http.get('/api/files/'+block.timestamp).then(response => {
        console.log('files replaced', response.data);
        this.Util.hideModal('processing-modal');

      }, (err) => {
        //file does not exist yet
        console.log('error loading files', err);
        this.Util.hideModal('processing-modal');
      });
    }

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
        text: ['Please confirm that you have finished your analysis.'],
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
              that.Auth.setUserStep(2);
              console.log('blockList', that.blockList);
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
