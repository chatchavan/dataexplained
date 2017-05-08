'use strict';

(function() {

/**
 * The Util service is for thin, globally reusable, utility functions
 */
function UtilService($window, $sce, ModalService, $timeout, $http) {
  var Util = {

    /**
     * Returns URL of RStudio-Server
     */
    getRStudioUri() {
      return $sce.trustAsResourceUrl('http://34.253.169.17:8787');
      // return $sce.trustAsResourceUrl('http://34.253.169.17:8888');
    },

    /**
     * Returns URL of JupyterHub-Server
     */
    getJupyterHubUri() {
      return $sce.trustAsResourceUrl('http://34.253.169.17:8888');
    },

    /**
     * Display loading Modal with text
     *
     * @param  {String}           text       - text to display
     *
     */
    showLoadingModal(text){
      ModalService.showModal({
        templateUrl: "app/loadermodal/loadermodal.html",
        controller: "LoaderModalController",
        inputs: {
          text: text
        }
      }).then(function(modal) {
        modal.element.modal();
        modal.close;
        // modal.close.then(result => {});
      });
    },

    /**
     * Hide Modal with id
     * */
    hideModal(id){

      $timeout(function(){
        let modal = document.getElementById(id);
        let modalBack = document.getElementsByClassName('modal-backdrop')[0];

        if(modal && modalBack){
          modal.remove();
          modalBack.remove();
        }
        $('body').removeClass('modal-open');
      },500);


    },

    /**
     * Shows differences of files from user at block-timestamp in a modal
     * */
    showFilesDiff(block, user){
      $http.get('/api/files/'+user+'/'+block.timestamp+'/diff').then(response => {
        ModalService.showModal({
          templateUrl: "app/diffmodal/diffmodal.html",
          controller: "DiffModalController",
          inputs: {
            text: response.data.data
          }
        }).then(function(modal) {
          modal.element.modal();
          modal.close.then(result => {
          });
        });

      }, (err) => {
        //file does not exist yet
        console.log('error getting diff', err);
      });

    },

    /**
     * Return a callback or noop function
     *
     * @param  {Function|*} cb - a 'potential' function
     * @return {Function}
     */
    safeCb(cb) {
      return (angular.isFunction(cb)) ? cb : angular.noop;
    },

    /**
     * Parse a given url with the use of an anchor element
     *
     * @param  {String} url - the url to parse
     * @return {Object}     - the parsed url, anchor element
     */
    urlParse(url) {
      var a = document.createElement('a');
      a.href = url;
      return a;
    },

    /**
     * Test whether or not a given url is same origin
     *
     * @param  {String}           url       - url to test
     * @param  {String|String[]}  [origins] - additional origins to test against
     * @return {Boolean}                    - true if url is same origin
     */
    isSameOrigin(url, origins) {
      url = Util.urlParse(url);
      origins = (origins && [].concat(origins)) || [];
      origins = origins.map(Util.urlParse);
      origins.push($window.location);
      origins = origins.filter(function(o) {
        return url.hostname === o.hostname &&
          url.port === o.port &&
          url.protocol === o.protocol;
      });
      return (origins.length >= 1);
    }
  };

  return Util;
}

angular.module('rationalecapApp.util')
  .factory('Util', UtilService);

})();
