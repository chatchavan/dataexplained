'use strict';

(function () {

  class AdminController {
    constructor($scope, Auth, User, LogUtil, Util, BlockUtil, ModalService, $http, $timeout, $state) {
      // Use the User $resource to fetch all users
      let that = this;
      this.$scope = $scope;
      this.Auth = Auth;
      // this.currentUser = {};
      Auth.getCurrentUser(function(user){
        if(user.role === 'admin' || user.role === 'admin-light'){
          that.currentUser = user;
          that.init();
        }
        else{
          $state.go('^.main');
        }
      });
      this.User = User;
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
      this.displayUsers = true;
      this.loadTest = false;

      this.sort = {
        column: 'username',
        descending: false
      };




    }

    toggleStepDisable(event) {
      let id = '' + event.target.id;
      let user = id.substring(id.indexOf('_') + 1, id.length);
      let element = $("#" + id);
      let readOnly = element.prop('readonly');
      element.prop('readonly', !readOnly);
      if (!readOnly) {
        for (var i = 0; i < this.users.length; i++) {
          if (this.users[i].username === user) {
            this.users[i].step = element.val();
            this.updateUser(this.users[i]);
            break;
          }
        }
      }
    }

    init() {

      this.initUsersAndBlocks();

      this.$http.get('/api/configurations/').then(response => {
        if (response.data && response.data.length > 0) {
          this.configSurvey = response.data[0].survey;
        }
        else if (response.data && response.data.survey !== undefined) {
          this.configSurvey = response.data.survey;
        }
        else {
          this.configSurvey = true;
        }
      }, (err) => {
        console.log('error getting configuration: ', err);
      });

    }

    isAdmin(){
      return this.currentUser.role === 'admin';
    }

    isAdminLight(){
      return this.currentUser.role === 'admin-light';
    }

    initUsersAndBlocks() {
      this.BlockUtil.getAllBlocksAdmin().then(blocks => {
        this.blocks = blocks;
      });

      this.$http.get('/api/users/admin/all').then(response => {
        console.log('admin all users', response);
        if (response.data) {
          this.users = response.data;
        }

      }, (err) => {
        console.log('error getting configuration: ', err);
      });
    }

    setSurvey() {
      this.$http.post('/api/configurations/', {survey: this.configSurvey}).then(response => {
        if (response.data && response.data.length > 0) {
          this.configSurvey = response.data[0].survey;
        }
        else if (response.data && response.data.survey !== undefined) {
          this.configSurvey = response.data.survey;
        }
        else {
          this.configSurvey = !this.configSurvey;
        }
      }, (err) => {
        console.log('error getting configuration: ', err);
      });
    }

    logout() {
      this.Auth.logout();
      this.$state.go('^.login');
    }

    goAnalysis() {
      this.$state.go('^.main');
    }

    displayAllUsers() {
      this.resetView();
      this.initUsersAndBlocks();
      this.searchUser = undefined;
      this.displayUsers = true;
    }

    toggleSurvey(user) {
      user.surveyDone = !user.surveyDone;
      this.updateUser(user);
    }

    toggleFinished(user) {
      user.finished = !user.finished;
      this.updateUser(user);
    }

    updateUser(user) {
      this.$http.put('/api/users/', user).then(response => {
        console.log('response', response);
      }, (err) => {
        console.log('error updating user: ', err);
      });
    }


    updateCoder(newBlockId, noCodes, allCodes) {
      if(!this.currentUser.codedBlocks && !noCodes){
        this.currentUser.codedBlocks = [newBlockId];
      }
      else if(this.currentUser.codedBlocks.indexOf(newBlockId) < 0 && !noCodes){
        this.currentUser.codedBlocks.push(newBlockId);
      }
      else if(this.currentUser.codedBlocks.indexOf(newBlockId) > 0 && noCodes){
        this.currentUser.codedBlocks.splice(this.currentUser.codedBlocks.indexOf(newBlockId), 1);
      }

      if(!noCodes && allCodes.length > 0){
        this.$http.put('/api/configurations/codes', {'allCodes' : allCodes, 'coder' : this.currentUser}).then(response => {
          if(response && response.data){
            this.currentUser = response.data;
          }
        }, (err) => {
          console.log('error updating configuration codes: ', err);
        });
      }


    }




    deleteUser(user) {
      if (user.username) {
        this.resetView(true);
        this.Auth.deleteUserAdmin({
          username: user.username
        })
          .then(() => {
            // Account created, redirect to home
            this.textCallback = 'User "' + user.username + '" deleted.';
            this.initUsersAndBlocks();
          })
          .catch(err => {
            this.textCallback = 'Error deleting user "' + user.username + '": ';

            // Update validity of form fields that match the mongoose errors
            angular.forEach(err.errors, (error, field) => {
              this.textCallback += error.message + ' ';
            });
          });
      }
    }

    showHistory() {
      console.log('showHistory for ' + this.searchUser);
      if (this.searchUser) {
        this.$http.get('/api/logs/history/' + this.searchUser).then(response => {
          console.log('response', response);
          if (response.data) {
            this.resetView();
            let history = response.data.join("\r\n");
            this.historyCallback = history.replace(/\n/ig, '<br>');
          }
        }, (err) => {
          this.resetView();
          this.historyNotFound = true;
        });
      }
    }

    showWorkflow() {
      if (this.searchUser) {
        let that = this;
        let itemlistCopy = this.itemlist;
        this.resetView();
        this.$http.get('/api/blocks/admin/' + this.searchUser).then(response => {
          if (response.data.blocks && response.data.blocks.plumb) {

            let tempJson = JSON.parse(response.data.blocks.plumb);
            let element = document.getElementById('admin-container');
            var style = element.currentStyle || window.getComputedStyle(element);

            // console.log("Current height: " + style.height, tempJson);
            tempJson.marginTop = style.height;
            tempJson.user = that.searchUser;
            if(that.isAdminLight()){
              tempJson.codeList = that.currentUser.codedBlocks;
            }
            this.noWorkflow = false;
            this.plumbJson = tempJson;
            this.plumbList = tempJson.nodes;

          }
          else {
            this.noWorkflow = true;
          }
        }, (err) => {
          this.resetView();
          this.itemlist = itemlistCopy;
          this.userNotFound = true;
        });
      }


    }

    showBlocks() {
      if (this.searchUser) {
        this.$http.get('/api/blocks/admin/' + this.searchUser).then(response => {
          console.log('response', response);
          if (response.data && response.data.blocks && response.data.dbLogs) {
            this.resetView();
            this.createItemList(response.data.blocks.blocks, response.data.dbLogs);
          }
        }, (err) => {
          this.resetView();
          this.userNotFound = true;
        });
      }
    }

    createUser() {
      if (this.searchUser) {

        let that = this;
        let actionText1 = 'Normal User';
        let actionText2 = 'Coder';

        this.ModalService.showModal({
          templateUrl: "app/custommodal/custommodal.html",
          controller: "CustomModalController",
          inputs: {
            title: "Create User",
            text: ['What kind of user do you want to create?'],
            actionText1: actionText1,
            actionText2: actionText2,
            actionText3: undefined,
            actionText4: undefined
          }
        }).then(function (modal) {
          modal.element.modal();
          modal.close.then(result => {
            let role = result === actionText2 ? 'admin-light' : 'user';

            that.resetView(true);
            that.Auth.createUserAdmin({
              username: that.searchUser,
              password: that.searchUser,
              role: role
            })
              .then(() => {
                // Account created, redirect to home
                that.textCallback = 'User "' + that.searchUser + '" created.';
                that.initUsersAndBlocks();
              })
              .catch(err => {
                console.log('err', err);
                that.textCallback = 'Error creating User "' + that.searchUser + '": ';

                // Update validity of form fields that match the mongoose errors
                angular.forEach(err.errors, (error, field) => {
                  that.textCallback += error.message + ' ';
                });
              });


          });
        });

      }
    }

    resetUser(user) {
      if (user.username) {
        this.resetView(true);
        this.Auth.resetUserAdmin({
          username: user.username
        })
          .then(() => {
            // Account created, redirect to home
            this.textCallback = 'User "' + user.username + '" reset.';
            this.initUsersAndBlocks();
          })
          .catch(err => {
            this.textCallback = 'Error resetting user "' + user.username + '": ';

            // Update validity of form fields that match the mongoose errors
            angular.forEach(err.errors, (error, field) => {
              this.textCallback += error.message + ' ';
            });
          });
      }
    }

    downloadWorkflow() {
      let top = 0;
      let left = 0;

      $(".w").each(function (index) {
        let position = $(this).position();
        if (position.top > top) {
          top = position.top;
        }
        if (position.left > left) {
          left = position.left;
        }
      });
      let node = document.getElementById('plumb-container');

      // console.log('plumb-container', 'width: '+left+'px; height: '+top+'px;');
      // let h = (top+100)/document.documentElement.clientHeight * 100;
      node.style.width = left > 0 ? (left + 300) + 'px' : node.style.width;
      node.style.height = '300vh';

      // console.log(node.style.height, node.style.width);

      let that = this;
      domtoimage.toPng(node)
        .then(function (dataUrl) {
          console.log('dataUrl', dataUrl);
          let img = new Image();
          img.src = dataUrl;
          var hiddenElement = document.createElement('a');

          hiddenElement.href = dataUrl;
          hiddenElement.target = '_blank';
          hiddenElement.download = 'workflow_' + that.searchUser + '.png';
          hiddenElement.click();
        })
        .catch(function (error) {
          console.error('oops, something went wrong!', error);
        });
    }

    exportUsers() {
      let that = this;

      let actionText11 = 'Block-wise';
      let actionText12 = 'User-wise';
      let actionText21 = 'Yes';
      let actionText22 = 'No';

      this.ModalService.showModal({
        templateUrl: "app/custommodal/custommodal.html",
        controller: "CustomModalController",
        inputs: {
          title: "Export all users",
          text: ['Which format do you want to export the users?'],
          actionText1: actionText11,
          actionText2: actionText12,
          actionText3: undefined,
          actionText4: undefined
        }
      }).then(function (modal) {
        modal.element.modal();
        modal.close.then(result1 => {

          that.ModalService.showModal({
            templateUrl: "app/custommodal/custommodal.html",
            controller: "CustomModalController",
            inputs: {
              title: "Export all users",
              text: ['Do you want to include the content (code) of the blocks?'],
              actionText1: actionText21,
              actionText2: actionText22,
              actionText3: undefined,
              actionText4: undefined
            }
          }).then(function (modal) {
            modal.element.modal();
            modal.close.then(result2 => {
              let blockWise = result1 === actionText11;
              let blockContent = result2 === actionText21;
              that.$http.get('api/users/csvAll/' + blockWise + '/' + blockContent).then(content => {
                console.log('content', content);
                var hiddenElement = document.createElement('a');

                hiddenElement.href = 'data:attachment/csv,' + encodeURI(content.data);
                hiddenElement.target = '_blank';
                hiddenElement.download = blockWise ? 'allUsers_blockwise.csv' : 'allUsers.csv';
                hiddenElement.click();
              }, (err) => {
                console.log('error exporting user');
              });


            });
          });

        });
      });

    }

    exportUserDetail(){
      let that = this;
      let actionText1 = 'Packages';
      let actionText2 = 'Activity';

      this.ModalService.showModal({
        templateUrl: "app/custommodal/custommodal.html",
        controller: "CustomModalController",
        inputs: {
          title: "Export User Detail",
          text: ['What kind of user details do you want to export?'],
          actionText1: actionText1,
          actionText2: actionText2,
          actionText3: undefined,
          actionText4: undefined
        }
      }).then(function (modal) {
        modal.element.modal();
        modal.close.then(result => {
          that.$http.get('api/users/admin/user'+result).then(content => {
            console.log('content', content);
            var hiddenElement = document.createElement('a');

            hiddenElement.href = 'data:attachment/csv,' + encodeURI(content.data);
            hiddenElement.target = '_blank';
            hiddenElement.download = 'allUsers_'+result+'.csv';
            hiddenElement.click();
          }, (err) => {
            console.log('error exporting user '+result);
          });


        });
      });
    }

    exportCodes(){

      let actionText1 = 'Code-wise';
      let actionText2 = 'Code-wise Detail';
      let actionText3 = 'Block-wise';
      let actionText4 = 'Code Matrix';
      let that = this;

      this.ModalService.showModal({
        templateUrl: "app/custommodal/custommodal.html",
        controller: "CustomModalController",
        inputs: {
          title: "Export Codes",
          text: ['What format do you want to export the codes?'],
          actionText1: actionText1,
          actionText2: actionText2,
          actionText3: actionText3,
          actionText4: actionText4
        }
      }).then(function (modal) {
        modal.element.modal();
        modal.close.then(result => {
          let method = 'codeWise';
          if(result === actionText2){
            method = 'codeWise-Detail';
          }
          else if(result === actionText3){
            method = 'blockWise';
          }
          else if(result === actionText4){
            method = 'matrix';
          }

          that.$http.get('api/users/admin/codes/'+method).then(content => {
            console.log('content', content);
            var hiddenElement = document.createElement('a');

            hiddenElement.href = 'data:attachment/csv,' + encodeURI(content.data);
            hiddenElement.target = '_blank';
            hiddenElement.download = 'codes_'+method+'.csv';
            hiddenElement.click();
          }, (err) => {
            console.log('error exporting codes');
          });


        });
      });




    }

    exportCsv(user) {
      if (user) {

        let that = this;

        let actionText11 = 'User-wise';
        let actionText12 = 'Block-wise';
        let actionText21 = 'Yes';
        let actionText22 = 'No';

        this.ModalService.showModal({
          templateUrl: "app/custommodal/custommodal.html",
          controller: "CustomModalController",
          inputs: {
            title: "Export User " + user.username,
            text: ['Which format do you want to export the user?'],
            actionText1: actionText11,
            actionText2: actionText12,
            actionText3: undefined,
            actionText4: undefined
          }
        }).then(function (modal) {
          modal.element.modal();
          modal.close.then(result1 => {

            that.ModalService.showModal({
              templateUrl: "app/custommodal/custommodal.html",
              controller: "CustomModalController",
              inputs: {
                title: "Export User " + user.username,
                text: ['Do you want to include the content (code) of the blocks?'],
                actionText1: actionText21,
                actionText2: actionText22,
                actionText3: undefined,
                actionText4: undefined
              }
            }).then(function (modal) {
              modal.element.modal();
              modal.close.then(result2 => {
                let blockWise = result1 === actionText12;
                let blockContent = result2 === actionText21;
                that.$http.post('api/users/csv/' + blockWise + '/' + blockContent, user).then(content => {
                  console.log('content', content);
                  var hiddenElement = document.createElement('a');

                  hiddenElement.href = 'data:attachment/csv,' + encodeURI(content.data);
                  hiddenElement.target = '_blank';
                  hiddenElement.download = user.username + '.csv';
                  hiddenElement.download = blockWise ? user.username + '_blockwise.csv' : user.username + '.csv';

                  hiddenElement.click();
                }, (err) => {
                  console.log('error exporting user');
                });


              });
            });


          });
        });

      }
    }


    resetView(table) {
      this.plumbJson = undefined;
      this.itemlist = undefined;
      this.noWorkflow = false;
      this.userNotFound = false;
      this.historyNotFound = false;
      this.textCallback = false;
      this.historyCallback = false;
      if (!table) {
        this.displayUsers = false;
      }
    }


    createItemList(blockList, dbLogs) {
      this.blockList = blockList;
      this.dbLogs = dbLogs;
      this.loglist = this.LogUtil.markLogs(this.loglist, this.dbLogs);

      this.itemlist = [];
      this.loglist = this.loglist ? this.loglist : [];

      for (let i = 0; i < this.loglist.length; i++) {
        if (!this.loglist[i].used) {
          this.itemlist.push(this.loglist[i]);
          this.itemlist[this.itemlist.length - 1].title = this.loglist[i].log;
          this.itemlist[this.itemlist.length - 1].timestamp = new Date(Number(this.loglist[i].timestamp));

        }
      }

      for (let b in this.blockList) {
        this.blockList[b].renderedContent = this.blockList[b].content.length > 0 ? this.blockList[b].content.split('\\n') : [];
      }
      this.itemlist = this.itemlist.concat(this.blockList);
      this.itemlist.sort(function (a, b) {
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      console.log('itemlist', this.itemlist);
    }


    editBlock(block) {

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
      }).then(function (modal) {
        modal.element.modal();
        modal.close.then(result => {
          if (result === 'deleteBlock') {
            that.BlockUtil.deleteBlock(block, that.searchUser, that.loglist).then(function (success) {
              that.blockList = success.blockList;
              that.loglist = success.loglist;
              that.dbLogs = success.dbLogs;
            });
          }
          else if (result === 'showFilesDiff') {
            that.Util.showFilesDiff(block, that.searchUser);
          }
          else if (result && result.title) {
            let newBlock = that.BlockUtil.createBlockString(result, undefined);
            that.BlockUtil.updateBlock(newBlock, that.searchUser, that.loglist, that.dbLogs).then(function (success) {
              that.block = success.block;
              that.loglist = success.loglist;
            });
          }
        });
      });
    }

    /**
     * Return nr. of blocks added in last session for user
     */
    getLastBlockProgress(user) {
      let counter = 0;
      let total = 0;
      if (!user.lastLogin) {
        return 'N/A';
      }
      for (var i = 0; i < this.blocks.length; i++) {
        if (this.blocks[i].user === user.username) {

          let userblocks = this.blocks[i].blocks;
          total = userblocks.length;
          for (var j = 0; j < userblocks.length; j++) {
            if (userblocks[j].timestamp > user.lastLogin) {
              counter++;
            }
          }
          return counter + ' (' + total + ')';
        }
      }

      return 'N/A';
    }

    getCodingProgress(user){
      for(let i = 0; i < this.blocks.length; i++){
        if(this.blocks[i].user === user.username){
          let counter = 0;
          let blocks = this.blocks[i].blocks;

          if(!this.blocks[i].plumb){
            user.progress = 0;
            return 'No workflow found - user not finished'
          }

          for(let j = 0; j < blocks.length; j++){

            let block = blocks[j];
            if(!block.blockCodes){
              break;
            }
            else{

              for(let k=0; k < block.blockCodes.length; k++){
                let blockCode = block.blockCodes[k];
                if(blockCode.coder === this.currentUser.username && blockCode.codes.length > 0){
                  counter++;
                  break;
                }
              }

            }


          }

          user.progress = counter/blocks.length;
          return counter+'/'+blocks.length;
        }
      }
      user.progress = 0;
      return 'No blocks found';
    }

    sortTable(column) {
      console.log('sort by', column);
      var sort = this.sort;

      if (sort.column === column) {
        sort.descending = !sort.descending;
      } else {
        sort.column = column;
        sort.descending = false;
      }
    }


  }

  angular.module('rationalecapApp.admin')
    .controller('AdminController', AdminController);

})();
