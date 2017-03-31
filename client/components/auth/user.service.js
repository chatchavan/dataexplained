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
    createAdmin: {
      method: 'POST',
      params: {
        controller:'admin'
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
