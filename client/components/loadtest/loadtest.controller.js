'use strict';

class LoadTestController {

  constructor($scope, $state, $http) {
    this.$state = $state;
    this.$http = $http;
  }

  test(){
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
