(function () {
  'use strict';

  angular
    .module('rationalecapApp')
    .controller('FaqCtrl', FaqCtrl);

  function FaqCtrl($state, $stateParams) {

    var vm = this;

    vm.prevState = $stateParams.prevState;

    vm.goBack = goBack;

    //=========INIT=========

    vm.faqs = [
      {
        question: 'Can I log out and continue later my analysis?',
        answer: 'Yes, you can just login again, and your session will be restored! <br> As your progress is continuously saved, you can continue with your work at the very same point you suspended the application.'
      },
      {
        question: 'Where can I find the dataset for the analysis?',
        answer: 'The dataset ("edge1.1.csv") together with a description of all the variables ("Variable Description.docx") is stored in your RStudio workspace.'
      },
      {
        question: 'How do I save my work when I want to suspend my analysis?',
        answer: 'You do not need to explicitly save your work, as this will be done automatically for you.<br>You can just close your browser - easy as that! :-)'
      },
      {
        question: 'Am I somehow limited in libraries or functions I can use or install?',
        answer: 'No! You can install any libraries/packages of your preference.<br>There is also a big variety of common R-packages for analytic work already pre-installed for your use.'
      },
      {
        question: 'Where is the data and the analysis stored?',
        answer: 'Your data is periodically saved in your workspace and persisted in the database of DataExplained.'
      }
    ];

    //=========CONTROLLER=========

    function goBack() {
      if(!vm.prevState){
        $state.go('^.main');
      }
      else{
        $state.go('^.'+vm.prevState);
      }
    }


  }
})();
