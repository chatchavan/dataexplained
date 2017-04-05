'use strict';

(function() {

class AdminController {
  constructor($scope, Auth, User, LogUtil, Util, BlockUtil, ModalService, $http, $timeout, $state) {
    // Use the User $resource to fetch all users
    this.users = User.query();
    this.$scope = $scope;
    this.Auth = Auth;
    this.LogUtil = LogUtil;
    this.Util = Util;
    this.BlockUtil = BlockUtil;
    this.ModalService = ModalService;
    this.$http = $http;
    this.$timeout = $timeout;
    this.$state = $state;

    this.plumbInstance = undefined;
    this.plumbJson = undefined;
    this.plumbList = [];
    this.searchUser = undefined;
    this.configSurvey = false;


    this.init();

  }


  init(){
    this.$http.get('/api/configurations/').then(response => {
      if(response.data && response.data.length>0){
        this.configSurvey = response.data[0].survey;
      }
      else if(response.data && response.data.survey !== undefined){
        this.configSurvey = response.data.survey;
      }
      else{
        this.configSurvey = true;
      }
    }, (err) => {
      console.log('error getting configuration: ', err);
    });
  }

  setSurvey(){
    this.$http.post('/api/configurations/', {survey: this.configSurvey}).then(response => {
      if(response.data && response.data.length>0){
        this.configSurvey = response.data[0].survey;
      }
      else if(response.data && response.data.survey !== undefined){
        this.configSurvey = response.data.survey;
      }
      else{
        this.configSurvey = !this.configSurvey;
      }
    }, (err) => {
      console.log('error getting configuration: ', err);
    });
  }

  logout(){
    this.Auth.logout();
    this.$state.go('^.login');
  }

  goAnalysis(){
    this.$state.go('^.main');
  }

  delete(user) {
    user.$remove();
    this.users.splice(this.users.indexOf(user), 1);
  }

  showWorkflow(){
    if(this.searchUser){
      let itemlistCopy = this.itemlist;
      this.resetView();
      this.$http.get('/api/blocks/admin/'+this.searchUser).then(response => {
        if(response.data.blocks && response.data.blocks.plumb){

          let tempJson = JSON.parse(response.data.blocks.plumb);
          // console.log(this.plumbJson);
          let element = document.getElementById('admin-container');
          var style = element.currentStyle || window.getComputedStyle(element);
          // var style = window.getComputedStyle(element);

          console.log("Current height: " + style.height, tempJson);
          tempJson.marginTop = style.height;
          this.noWorkflow = false;
          this.plumbJson = tempJson;

            // console.log('got block-data for user '+this.searchUser, response.data);
        }
        else{
          this.noWorkflow = true;
        }
      }, (err) => {
        this.resetView();
        this.itemlist = itemlistCopy;
        this.userNotFound = true;
      });
    }


  }

  showBlocks(){
    if(this.searchUser){
      this.$http.get('/api/blocks/admin/'+this.searchUser).then(response => {
        console.log('response', response);
        if(response.data && response.data.blocks && response.data.dbLogs){
          this.resetView();
          this.createItemList(response.data.blocks.blocks, response.data.dbLogs);
        }
      }, (err) => {
        this.resetView();
        this.userNotFound = true;
      });
    }
  }

  createUser(){
    if(this.searchUser) {
      this.resetView();
      this.Auth.createUserAdmin({
        username: this.searchUser,
        password: this.searchUser
      })
        .then(() => {
          // Account created, redirect to home
          console.log('user created!!!');
          this.textCallback = 'User "'+this.searchUser+'" created.'
        })
        .catch(err => {
          console.log('err', err);
          this.textCallback = 'Error creating User "'+this.searchUser+'": ';

          // Update validity of form fields that match the mongoose errors
          angular.forEach(err.errors, (error, field) => {
            this.textCallback += error.message+' ';
          });
        });
    }
  }

  resetUser(){
    if(this.searchUser) {
      this.resetView();
      this.Auth.resetUserAdmin({
        username: this.searchUser
      })
        .then(() => {
          // Account created, redirect to home
          this.textCallback = 'User "'+this.searchUser+'" reset.';
          console.log('user resetted!!!');
        })
        .catch(err => {
          this.textCallback = 'Error resetting user "'+this.searchUser+'": ';

          // Update validity of form fields that match the mongoose errors
          angular.forEach(err.errors, (error, field) => {
            this.textCallback += error.message+' ';
          });
        });
    }
  }



  resetView(){
    this.plumbJson = undefined;
    this.itemlist = undefined;
    this.noWorkflow = false;
    this.userNotFound = false;
    this.textCallback = false;
  }


  createItemList(blockList, dbLogs){
    this.blockList = blockList;
    this.dbLogs = dbLogs;
    this.loglist = this.LogUtil.markLogs(this.loglist, this.dbLogs);

    this.itemlist = [];
    this.loglist = this.loglist ? this.loglist : [];

    for(let i = 0; i < this.loglist.length; i++){
      if(!this.loglist[i].used){
        this.itemlist.push(this.loglist[i]);
        this.itemlist[this.itemlist.length-1].title = this.loglist[i].log;
        this.itemlist[this.itemlist.length-1].timestamp = new Date(Number(this.loglist[i].timestamp));

      }
    }

    for(let b in this.blockList){
      this.blockList[b].renderedContent = this.blockList[b].content.length > 0 ? this.blockList[b].content.split('\\n') : [];
    }
    this.itemlist = this.itemlist.concat(this.blockList);
    this.itemlist.sort(function(a,b){
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    console.log('itemlist', this.itemlist);
  }




  editBlock(block){

  let that = this;

  this.ModalService.showModal({
    templateUrl: "app/blockmodal2/blockmodal2.html",
    controller: "BlockModal2Controller",
    inputs: {
      title: "Edit block",
      edit: 'admin',
      block: block,
      content: undefined,
    }
  }).then(function(modal) {
    modal.element.modal();
    modal.close.then(result => {
      if(result === 'deleteBlock'){
        that.BlockUtil.deleteBlock(block, that.searchUser, that.loglist).then(function(success){
          that.blockList = success.blockList;
          that.loglist = success.loglist;
          that.dbLogs = success.dbLogs;
        });
      }
      else if(result === 'showFilesDiff'){
        that.Util.showFilesDiff(block, that.searchUser);
      }
      else if(result){
        let newBlock = that.BlockUtil.createBlockString(result, undefined);
        that.BlockUtil.updateBlock(newBlock, that.searchUser, that.loglist, that.dbLogs).then(function(success){
          that.block = success.block;
          that.loglist = success.loglist;
        });
      }
    });
  });
}


}

angular.module('rationalecapApp.admin')
  .controller('AdminController', AdminController);

})();
