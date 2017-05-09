'use strict';

class LoadTestController {

  constructor($scope, $state, $http) {
    this.$state = $state;
    this.$http = $http;

    this.body = {"block":{"title":"first block","goal":"sf","criteria":"df","preconditions":"df3","timestamp":"1970-01-01T00:00:00.000Z","content":"socool <- 42","_id":"58e79f2d5d1cac15b27bbacd","alternatives":[{"title":"sdf","pro":"df","contra":"df","_id":"58e79f2d5d1cac15b27bbacf"},{"title":"fd","pro":"df","contra":"df","_id":"58e79f2d5d1cac15b27bbace"}],"renderedContent":["socool <- 42"]},"user":"coldata"};
  }

  test(){
    this.output = '';
    this.error = '';

    if(!this.methodType || !this.method){
      this.output = 'Please specify method type & path!';
    }
    else if(this.methodType.toUpperCase() === 'GET'){
      this.testGet();
    }
    else if(this.methodType.toUpperCase() === 'POST'){
      this.testPost();
    }
    else if(this.methodType.toUpperCase() === 'PUT'){
      this.testPut();
    }
  }

  testGet(){
    let now = new Date().getTime();
    for(let i = 0; i < this.nrRequests; i++){
      this.$http.get(this.method+'?ts='+now).then(response => {
        this.status = i == this.nrRequests-1 ? 'All Requests processed.' : 'Processing ' + i + ' / '+ this.nrRequests;
        if(response.data){
          this.output = JSON.stringify(response.data);
        }
      }, (err) => {
        console.log('error getting configuration: ', err);
        this.error = err;
      });
    }

  }

  testPost(){
    for(let i = 0; i < this.nrRequests; i++){
      this.$http.post(this.method, this.body).then(response => {
        this.status = i == this.nrRequests-1 ? 'All Requests processed.' : 'Processing ' + i + ' / '+ this.nrRequests;
        if(response.data){
          this.output = JSON.stringify(response.data);
        }
      }, (err) => {
        console.log('error getting configuration: ', err);
        this.error = err;
      });
    }
  }

  testPut(){
    for(let i = 0; i < this.nrRequests; i++){
      this.$http.put(this.method, this.body).then(response => {
        this.status = i == this.nrRequests-1 ? 'All Requests processed.' : 'Processing ' + i + ' / '+ this.nrRequests;
        if(response.data){
          this.output = JSON.stringify(response.data);
        }
      }, (err) => {
        console.log('error getting configuration: ', err);
        this.error = err;
      });
    }
  }

}

angular.module('rationalecapApp')
  .controller('LoadTestController', LoadTestController);
