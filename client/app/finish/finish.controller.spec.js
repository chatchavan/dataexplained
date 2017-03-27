'use strict';

describe('Controller: FinishCtrl', function () {

  // load the controller's module
  beforeEach(module('rationalecapApp'));

  var FinishCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    FinishCtrl = $controller('FinishCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
