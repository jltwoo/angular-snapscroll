(function () {
  'use strict';

  angular.module('snapscroll')
    .directive('fitWindowWidth', ['$window', '$timeout', 'defaultSnapscrollResizeDelay',
      function ($window, $timeout, defaultSnapscrollResizeDelay) {
        return {
          restrict: 'A',
          require: 'snapscroll',
          link: function (scope, element, attributes, snapscroll) {
            var windowElement,
                resizePromise,
                resizeDelay = attributes.resizeDelay;

            function onWindowResize() {
              if (resizeDelay === false) {
                snapscroll.setSnapWidth($window.innerWidth);
              } else {
                $timeout.cancel(resizePromise);
                resizePromise = $timeout(function () {
                  snapscroll.setSnapWidth($window.innerWidth);
                }, resizeDelay);
              }
            }

            function init() {
              if (resizeDelay === 'false') {
                resizeDelay = false;
              } else {
                resizeDelay = parseInt(resizeDelay, 10);
                if (isNaN(resizeDelay)) {
                  resizeDelay = defaultSnapscrollResizeDelay;
                }
              }

              // set initial snapWidth
              snapscroll.setSnapWidth($window.innerWidth);

              // update snapWidth on window resize
              windowElement = angular.element($window);
              windowElement.on('resize', onWindowResize);
              scope.$on('$destroy', function () {
                windowElement.off('resize');
              });
            }

            init();
          }
        };
    }]);

})();
