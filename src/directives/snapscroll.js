(function () {
  'use strict';

  var scopeObject = {
    snapIndex: '=?',
    snapHeight: '=?',
    snapWidth: '=?',
    snapToWidth: '=?',
    beforeSnap: '&',
    afterSnap: '&',
    snapAnimation: '=?'
  };

  var controller = ['$scope', function ($scope) {
    this.setSnapHeight = function (height) {
      $scope.snapHeight = height;
    };
    this.setSnapWidth = function (width) {
      $scope.snapWidth = width;
    };
  }];

  var isNumber = function(value) {
    return angular.isNumber(value) && !isNaN(value);
  };

  var watchSnapHW = function (scope, callback) {
    var hw = scope.snapToWidth?'snapWidth':'snapHeight';
    scope.$watch(hw, function (newHW, prevHW) {
      if (angular.isUndefined(newHW)) {
        scope[hw] = scope.defaultSnapHW;
        return;
      }
      if (!isNumber(newHW)) {
        if (isNumber(prevHW)) {
          scope[hw] = prevHW;
        } else {
          scope[hw] = scope.defaultSnapHW;
        }
        return;
      }
      if (angular.isFunction(callback)) {
        callback(newHW);
      }
    });
  };

  var watchSnapIndex = function (scope, callback) {
    scope.$watch('snapIndex', function (snapIndex, previousSnapIndex) {
      if (angular.isUndefined(snapIndex)) {
        scope.snapIndex = 0;
        return;
      }
      if (!isNumber(snapIndex)) {
        if (isNumber(previousSnapIndex)) {
          scope.snapIndex = previousSnapIndex;
        } else {
          scope.snapIndex = 0;
        }
        return;
      }
      if (snapIndex % 1 !== 0) {
        scope.snapIndex = Math.round(snapIndex);
        return;
      }
      if (scope.ignoreThisSnapIndexChange) {
        scope.ignoreThisSnapIndexChange = undefined;
        return;
      }
      if (!scope.isValid(snapIndex)) {
        scope.ignoreThisSnapIndexChange = true;
        scope.snapIndex = previousSnapIndex;
        scope.snapDirection = 0;
        return;
      }
      if (scope.beforeSnap({snapIndex: snapIndex}) === false) {
        scope.ignoreThisSnapIndexChange = true;
        scope.snapIndex = previousSnapIndex;
        return;
      }
      if (angular.isFunction(callback)) {
        if (snapIndex > previousSnapIndex) {
          scope.snapDirection = 1;
        } else if (snapIndex < previousSnapIndex) {
          scope.snapDirection = -1;
        }
        callback(snapIndex, function () {
          scope.snapDirection = 0;
          scope.afterSnap({snapIndex: snapIndex});
        });
      }
    });
  };

  var initWheelEvents = function (scope, element) {
    var onWheel,
        bindWheel,
        unbindWheel;

    onWheel = function (e) {
      var bubbleUp,
          delta;

      if (e.originalEvent) {
        e = e.originalEvent;
      }

      e.preventDefault();

      delta = Math.max(-1, Math.min(1, (e.wheelDelta || -(e[scope.snapToWidth?'deltaX':'deltaY'] || e.detail))));

      if (isNaN(delta)) {
        return;
      }

      if (delta < 0) {
        if (scope.snapDirection !== 1) {
          if (scope.snapIndex + 1 > scope.scopeIndexMax()) {
            bubbleUp = true;
          } else {
            bubbleUp = false;
            scope.$apply(function () {
              scope.snapIndex += 1;
            });
          }
        }
      } else {
        if (scope.snapDirection !== -1) {
          if (scope.snapIndex - 1 < scope.snapIndexMin()) {
            bubbleUp = true;
          } else {
            bubbleUp = false;
            scope.$apply(function () {
              scope.snapIndex -= 1;
            });
          }
        }
      }

      if (!bubbleUp) {
        e.stopPropagation();
      }
    };

    bindWheel = function () {
      element.on('wheel mousewheel onmousewheel', onWheel);
    };

    unbindWheel = function () {
      element.off('wheel mousewheel onmousewheel', onWheel);
    };

    bindWheel();
    scope.$on('$destroy', unbindWheel);
  };

  var snapscrollAsAnAttribute = ['$timeout', 'scroll', 'defaultSnapscrollScrollDelay', 'defaultSnapscrollSnapDuration', 'defaultSnapscrollBindScrollTimeout',
    function ($timeout, scroll, defaultSnapscrollScrollDelay, defaultSnapscrollSnapDuration, defaultSnapscrollBindScrollTimeout) {
      return {
        restrict: 'A',
        scope: scopeObject,
        controller: controller,
        link: function (scope, element, attributes) {
          var init,
              snapTo,
              onScroll,
              bindScroll,
              scrollBound,
              unbindScroll,
              scrollPromise,
              bindScrollPromise,
              snapToWidth = attributes.snapToWidth,
              snapEasing = attributes.snapEasing,
              scrollDelay = attributes.scrollDelay,
              snapDuration = attributes.snapDuration,

              preventSnappingAfterManualScroll = angular.isDefined(attributes.preventSnappingAfterManualScroll);

          snapTo = function (index, afterSnap) {
            var args,
                val = index * scope[snapToWidth?'snapWidth':'snapHeight'];
            if (scope.snapAnimation) {
              if (angular.isDefined(snapEasing)) {
                args = [element, val, snapToWidth, snapDuration, snapEasing];
              } else {
                args = [element, val, snapToWidth, snapDuration];
              }
            } else {
              args = [element, val, snapToWidth];
            }
            if (!preventSnappingAfterManualScroll && scrollBound) {
              unbindScroll();
            }
            scroll.to.apply(scroll, args).then(function () {
              if (angular.isFunction(afterSnap)) {
                afterSnap();
              }
              if (!preventSnappingAfterManualScroll) {
                // bind scroll after a timeout
                $timeout.cancel(bindScrollPromise);
                bindScrollPromise = $timeout(bindScroll, defaultSnapscrollBindScrollTimeout);
              }
            });
          };

          onScroll = function () {
            var snap = function () {
              var newSnapIndex = Math.round(element[0][snapToWidth? 'scrollLeft':'scrollTop'] / scope[snapToWidth?'snapWidth':'snapHeight']);
              if (scope.snapIndex === newSnapIndex) {
                snapTo(newSnapIndex);
              } else {
                scope.$apply(function () {
                  scope.snapIndex = newSnapIndex;
                });
              }
            };
            scroll.stop(element);
            if (scrollDelay === false) {
              snap();
            } else {
              $timeout.cancel(scrollPromise);
              scrollPromise = $timeout(snap, scrollDelay);
            }
          };

          bindScroll = function () {
            // if the bindScroll timeout expires while snapping is ongoing, restart the timer
            if (scope.snapDirection !== 0) {
              bindScrollPromise = $timeout(bindScroll, defaultSnapscrollBindScrollTimeout);
              return;
            }
            element.on('scroll', onScroll);
            scrollBound = true;
          };

          unbindScroll = function () {
            element.off('scroll', onScroll);
            scrollBound = false;
          };

          init = function () {
            if (scrollDelay === 'false') {
              scrollDelay = false;
            } else {
              scrollDelay = parseInt(scrollDelay, 10);
              if (isNaN(scrollDelay)) {
                scrollDelay = defaultSnapscrollScrollDelay;
              }
            }

            if (angular.isDefined(snapEasing)) {
              snapEasing = scope.$parent.$eval(snapEasing);
            }

            snapDuration = parseInt(snapDuration, 10);
            if (isNaN(snapDuration)) {
              snapDuration = defaultSnapscrollSnapDuration;
            }

            scope.$watch('snapAnimation', function (animation) {
              if (animation === undefined) {
                scope.snapAnimation = true;
              }
            });

            scope.defaultSnapHW = element[0].offsetHeight;

            scope.snapIndexMin = function () {
              return 0;
            };

            scope.scopeIndexMax = function () {
              return element.children().length - 1;
            };

            scope.isValid = function (snapIndex) {
              return snapIndex >= scope.snapIndexMin() && snapIndex <= scope.scopeIndexMax();
            };

            element.css(snapToWidth?'overflowX':'overflowY', 'auto');

            watchSnapHW(scope, function () {
              var snaps = element.children();
              if(snapToWidth){
                element.css('width', scope.snapWidth + 'px');
              } else {
                element.css('height', scope.snapHeight + 'px');
              }
              if (snaps.length) {
                angular.forEach(snaps, function (snap) {
                  if(snapToWidth){
                    angular.element(snap).css('width', scope.snapWidth + 'px');
                  } else {
                    angular.element(snap).css('height', scope.snapHeight + 'px');
                  }
                });
              }
              snapTo(scope.snapIndex);
            });

            watchSnapIndex(scope, snapTo);

            if (!preventSnappingAfterManualScroll) {
              bindScroll();
              scope.$on('$destroy', unbindScroll);
            }

            initWheelEvents(scope, element);
          };

          init();
        }
      };
    }
  ];

  angular.module('snapscroll')
    .directive('snapscroll', snapscrollAsAnAttribute);
})();
