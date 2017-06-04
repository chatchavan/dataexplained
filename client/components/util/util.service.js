'use strict';

(function() {

/**
 * The Util service is for thin, globally reusable, utility functions
 */
function UtilService($window, $sce, $state, ModalService, StorageUtil, $timeout, $http, $injector) {
  var Util = {

    /**
     * Returns URL of RStudio-Server
     */
    getRStudioUri() {
      return $sce.trustAsResourceUrl('http://dataexplained.org:8787');
    },

    /**
     * Checks whether user is on right step and redirects if necessary
     * */
    checkUserStep(step){
      let auth = $injector.get('Auth');
      if(!auth.isLoggedIn()){
        $state.go('^.login');
        return null;
      }

      let u = auth.getCurrentUser();
      let user = u.username;
      console.log('saving', user);
      StorageUtil.saveSStorage('user', user);
      if (u.finished) {
        $state.go('^.graph', {'finished': true});
      }
      else if (u.step === 1 && u.step !== step) {
        $state.go('^.main');
      }
      else if (u.step === 2 && u.step !== step) {
        $state.go('^.finish');
      }
      else if (u.step === 3 && u.step !== step) {
        $state.go('^.graph');
      }
      return user;
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
      $http.get('/api/files/'+block.timestamp+'/diff').then(response => {
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
