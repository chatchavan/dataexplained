'use strict';

class BlockModalController {
  //start-non-standard
  menu = [{
    'title': 'Home',
    'state': 'main'
  }];

  isCollapsed = true;
  //end-non-standard

  constructor($element, title, close) {


    this.name = null;
    this.age = null;
    this.title = title;

    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    this.close = function () {
      close({
        name: $scope.name,
        age: $scope.age
      }, 500); // close, but give 500ms for bootstrap to animate
    };

    //  This cancel function must use the bootstrap, 'modal' function because
    //  the doesn't have the 'data-dismiss' attribute.
    this.cancel = function () {

      //  Manually hide the modal.
      $element.modal('hide');

      //  Now call close, returning control to the caller.
      close({
        name: $scope.name,
        age: $scope.age
      }, 500); // close, but give 500ms for bootstrap to animate

    }
  }
}

angular.module('rationalecapApp')
  .controller('BlockModalController', BlockModalController);
