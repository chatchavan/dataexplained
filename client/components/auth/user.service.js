'use strict';

(function() {

function UserResource($resource) {
  return $resource('/api/users/:id/:controller', {
    id: '@_id'
  }, {
    changePassword: {
      method: 'PUT',
      params: {
        controller:'password'
      }
    },
    setSurveyDone: {
      method: 'PUT',
      params: {
        id:'me',
        controller:'survey'
      }
    },
    get: {
      method: 'GET',
      params: {
        id:'me'
      }
    }
  });
}

angular.module('rationalecapApp.auth')
  .factory('User', UserResource);

})();
