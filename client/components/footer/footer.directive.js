'use strict';

angular.module('rationalecapApp')
  .directive('footer', function () {
    return {
      templateUrl: 'components/footer/footer.html',
      restrict: 'E',
      scope:{
        faq: '<'
      },
      link: function(scope, element) {
        element.addClass('footer');
      },
      controller: function ($scope, $state) {
        $scope.goFaq = function(){
          console.log('goFaq', $state.current.name);
          $state.go('^.faq', {'prevState': $state.current.name});
        }
      }
    };
  });
