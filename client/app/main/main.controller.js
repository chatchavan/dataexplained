'use strict';

(function() {

class MainController {

  constructor($http, $sce, $interval, ModalService) {
    this.$http = $http;
    this.ModalService = ModalService;
    this.awesomeThings = [];
    this.selection = '';
    this.blockPrefix = "//startBlock";
    this.blockSuffix = "//endBlock";

    this.blockList = [
      {title: 'Cras justo odio'},
      {title: 'Dapibus ac facilisis in'},
      {title: 'Morbi leo risus'},
      {title: 'Porta ac consectetur ac'},
      {title: 'Vestibulum at eros'}
    ];

    this.rStudioEndpoint = $sce.trustAsResourceUrl('http://34.251.106.133:8787');
    //this.rStudioEndpoint = $sce.trustAsResourceUrl('http://192.168.56.101:8787');

    this.getAllBlocks();
    $interval(this.getAllBlocks.bind(this), 5000);

  }

  addBlock(block, blockString) {
    // if (this.newThing) {
      this.$http.post('/api/blocks', { block: block, blockString: blockString }).then(response => {
        console.log('posted block, new block-list', response.data);
      });
    // }
  }

  getAllBlocks(){
    this.$http.get('/api/blocks').then(response => {
      this.log = response.data.content;
      this.loglist = this.formatLogs(this.log.split("\n"));
      console.log('yeah', this.log);
    });
  }

  // deleteThing(thing) {
  //   this.$http.delete('/api/things/' + thing._id);
  // }

  createBlock(){
    console.log(this.selection);
    this.complexResult = '';
    var that = this;

    this.ModalService.showModal({
      templateUrl: "/components/blockmodal/blockmodal.html",
      controller: "BlockModalController",
      inputs: {
        title: "Add a new block"
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(result => {that.setResult(result);
      });
    });


  }

  setResult(block){
    //TODO display block in list
    let blockString = this.blockPrefix;
    for(let i = 0; i < this.selection.length; i++){
      blockString += '\\n'+this.selection[i].timestamp + ':'+ this.selection[i].log;
    }
    blockString += '\\n'+this.blockSuffix;
    // block.timestamp = this.selection[this.selection.length-1].timestamp;
    console.log(blockString);
    this.addBlock(block, blockString);
    // this.loglist = ("Title: " + block.title + ", age: " + block.age);
  }

  formatLogs(list){

    for(let log in list){
      let l = list[log];
      list[log] = {
        'timestamp' : l.substr(0,l.indexOf(':')),
        'log' : l.substr(l.indexOf(':')+1, l.length)
      };
    }

    return list;
  }





  //   for(let log in list){
  //     let l = list[log];
  //     list[log] = l.substr(l.indexOf(':')+1, l.length);
  //   }
  //
  //   return list;
  // }
}

angular.module('rationalecapApp')
  .controller('MainController', MainController);

})();
