'use strict';

(function() {

class MainController {

  constructor($http, $sce, $interval) {
    this.$http = $http;
    this.awesomeThings = [];
    this.selection = '';
    this.blockPrefix = "//startBlock";
    this.blockSuffix = "//endBlock";

    this.rStudioEndpoint = $sce.trustAsResourceUrl('http://34.251.106.133:8787');
    //this.rStudioEndpoint = $sce.trustAsResourceUrl('http://192.168.56.101:8787');

    this.getAllBlocks();
    $interval(this.getAllBlocks.bind(this), 5000);

  }

  addBlock(block) {
    // if (this.newThing) {
      this.$http.post('/api/blocks', { block: block });
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
    let block = this.blockPrefix;
    for(let i = 0; i < this.selection.length; i++){
      block += '\\n'+this.selection[i].timestamp + ':'+ this.selection[i].log;
    }
    block += '\\n'+this.blockSuffix;
    console.log(block);
    this.addBlock(block);
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
