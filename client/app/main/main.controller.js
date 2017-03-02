'use strict';

(function() {

class MainController {

  constructor($http, $sce) {
    this.$http = $http;
    this.awesomeThings = [];
    this.selection = '';
    this.blockPrefix = "//startBlock";
    this.blockSuffix = "//endBlock";

    this.rStudioEndpoint = $sce.trustAsResourceUrl('http://34.251.167.94:8787');
    // this.rStudioEndpoint = $sce.trustAsResourceUrl('http://130.60.157.118:8787');
    this.log = 'sdfsdfs';

    // $http.get('/api/things').then(response => {
    //   this.awesomeThings = response.data;
    // });
  }

  addThing(block) {
    // if (this.newThing) {
      this.$http.post('/api/things', { block: block });
      this.newThing = '';
    // }
  }

  readFile(){
    this.$http.get('/api/things').then(response => {
      this.log = response.data.content;
      this.loglist = this.formatLogs(this.log.split("\n"));
      console.log('yeah', this.log);
    });
  }

  deleteThing(thing) {
    this.$http.delete('/api/things/' + thing._id);
  }

  createBlock(){
    console.log(this.selection);
    let block = this.blockPrefix;
    for(let i = 0; i < this.selection.length; i++){
      block += '\\n'+this.selection[i].timestamp + ':'+ this.selection[i].log;
    }
    block += '\\n'+this.blockSuffix;
    console.log(block);
    this.addThing(block);
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
