'use strict';

describe('Directive: jsPlump', function () {

  // load the directive's module
  beforeEach(module('rationalecapApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<js-plump></js-plump>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the jsPlump directive');
  }));
});
