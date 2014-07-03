'use strict';

// Wrapper to abstract over using touch events or mouse events.
var sliderTests = function (description, startEvent, moveEvent, endEvent) {
  xdescribe('uiSlider with ' + description + ' events', function () {

    // declare these up here to be global to all tests
    var scope, $compile, element;


    /**
     * UTILS
     */

    function appendTemplate(tpl) {
      element = angular.element(tpl);
      angular.element(document.body).append(element);
      $compile(element)(scope);
    }

    beforeEach(function () {
      this.addMatchers({
        toBeBetween: function (rangeFloor, rangeCeiling) {
          if (rangeFloor > rangeCeiling) {
            var temp = rangeFloor;
            rangeFloor = rangeCeiling;
            rangeCeiling = temp;
          }
          return this.actual > rangeFloor && this.actual < rangeCeiling;
        }
      });
    });

    /**
     * TESTS
     */

    beforeEach(module('ui.slider'));

    // inject in angular constructs. Injector knows about leading/trailing underscores and does the right thing
    // otherwise, you would need to inject these into each test
    beforeEach(inject(function (_$rootScope_, _$compile_) {
      scope = _$rootScope_.$new();
      $compile = _$compile_;
    }));

    describe('require', function () {
      it('requestAnimationFrame', function () {
        expect(window.requestAnimationFrame).toBeDefined();
      });
      it('cancelAnimationFrame', function () {
        expect(window.cancelAnimationFrame).toBeDefined();
      });
    });

    afterEach(function () {
      if (element) element.remove();
    });

    describe('native behaviour', function () {

      var element_bb, $thumb, thumb_left_pos, thumb_bb;

      function defaultBefore(html) {
        appendTemplate(html || '<div ui-slider></div>');
        scope.$digest();

        // Explicit element width
        _jQuery(element).width(234);

        spyOn(window, 'requestAnimationFrame').andCallFake(function (fct) {
          fct();
        });
        element_bb = element[0].getBoundingClientRect();
        $thumb = _jQuery(element[0]).find('.ui-slider-thumb');
        thumb_bb = $thumb[0].getBoundingClientRect();
        // Yeah... don't trust the browser... it can return a float number...
        thumb_left_pos = Math.ceil(thumb_bb.left);
      }

      afterEach(function () {
        if (element) {
          element.remove();
        }
      });

      describe('the thumb', function () {
        beforeEach(defaultBefore);
        it('should be at the start (initially)', function () {
          expect(window.requestAnimationFrame).not.toHaveBeenCalled();
          expect($thumb.position().left).toEqual(0);
        });

        it('should stay at the start when clicking on it', function () {

          // Click on the slider left
          browserTrigger(element, startEvent, { x: element_bb.left });
          browserTrigger(element, endEvent);
          thumb_bb = $thumb[0].getBoundingClientRect();

          expect(window.requestAnimationFrame).toHaveBeenCalled();
          expect(Math.ceil(thumb_bb.left)).toEqual(thumb_left_pos);


          // Click on the thumb left
          browserTrigger(element, startEvent, { x: Math.ceil(thumb_bb.left) });
          browserTrigger(element, endEvent);
          thumb_bb = $thumb[0].getBoundingClientRect();

          expect(window.requestAnimationFrame).toHaveBeenCalled();
          expect(Math.ceil(thumb_bb.left)).toEqual(thumb_left_pos);
        });

        it('should go to the middle of the slider', function () {
          browserTrigger(element, startEvent, { x: element_bb.width / 2 + element_bb.left });
          browserTrigger(element, endEvent);
          thumb_bb = $thumb[0].getBoundingClientRect();

          expect(window.requestAnimationFrame).toHaveBeenCalled();
          expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(Math.floor(element_bb.width / 2));
        });

        it('should go to the end of the slider', function () {
          browserTrigger(element, startEvent, { x: element_bb.width + element_bb.left });
          browserTrigger(element, endEvent);
          thumb_bb = $thumb[0].getBoundingClientRect();

          expect(window.requestAnimationFrame).toHaveBeenCalled();
          expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(element_bb.width);
        });

        it('should follow the ' + description, function () {
          browserTrigger(element, startEvent, { x: element_bb.left | 0 });

          // Start at the middle of the thumb
          var thumbMiddle = Math.ceil(thumb_bb.width / 2),
          // FIXME : the actual step processing as a tolerance of some pixels...
            tolerance = Math.ceil(element_bb.width / 50)
            ;
          for (var i = thumbMiddle; i < element_bb.width; ++i) {
            browserTrigger(element, moveEvent, { x: i + element_bb.left});
            thumb_bb = $thumb[0].getBoundingClientRect();
            // FIXME : the actual step processing as a tolerance of some pixels...
            //expect( Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(i);
            expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toBeBetween(i - tolerance, i + tolerance);
          }

          browserTrigger(document.body, endEvent);
        });

        it('should not follow the ' + description + ' before ' + startEvent, function () {
          expect(Math.ceil(thumb_bb.left)).toEqual(thumb_left_pos); // Obvious...

          browserTrigger(element, moveEvent, { x: Math.random() * element_bb.width });
          browserTrigger(element, endEvent);
          thumb_bb = $thumb[0].getBoundingClientRect();

          expect(window.requestAnimationFrame).not.toHaveBeenCalled();
          expect(Math.ceil(thumb_bb.left)).toEqual(thumb_left_pos);
        });

        it('should not follow the ' + description + ' after ' + startEvent, function () {
          browserTrigger(element, startEvent, { x: element_bb.width + element_bb.left });
          browserTrigger(element, endEvent);

          // Move after the end event
          browserTrigger(element, moveEvent, { x: Math.random() * element_bb.width });
          browserTrigger(element, endEvent);
          thumb_bb = $thumb[0].getBoundingClientRect();

          expect(window.requestAnimationFrame).toHaveBeenCalled();
          expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(element_bb.width);
        });
      });


      /**
       * TEST NG-MODEL HERE
       */
      it('should update the model', function () {
        defaultBefore('<div ui-slider ng-model="foo"></div>');

        scope.$apply(function () {
          scope.foo = 50;
        });

        thumb_bb = $thumb[0].getBoundingClientRect();
        expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(Math.round(element_bb.width / 2));

        browserTrigger(element, startEvent, { x: element_bb.width + element_bb.left });
        browserTrigger(element, endEvent);

        expect(scope.foo).toBe(100);
      });

      it('should not move cause max == min', function () {
        defaultBefore('<div ui-slider max="0" min="0"></div>');
        browserTrigger(element, startEvent, { x: element_bb.width + element_bb.left});
        browserTrigger(element, endEvent);
        thumb_bb = $thumb[0].getBoundingClientRect();

        expect(window.requestAnimationFrame).toHaveBeenCalled();
        expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(0);
      });

      it('should not move cause max < min', function () {
        defaultBefore('<div ui-slider max="0" min="10"></div>');
        browserTrigger(element, startEvent, { x: element_bb.width + element_bb.left});
        browserTrigger(element, endEvent);
        thumb_bb = $thumb[0].getBoundingClientRect();

        expect(window.requestAnimationFrame).toHaveBeenCalled();
        expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(0);
      });

      it('should move between -50 and 50', function () {
        defaultBefore('<div ui-slider min="-50" max="50" ng-model="foo"></div>');
        browserTrigger(element, startEvent, { x: element_bb.left | 0 });

        for (var i = thumb_bb.left; i < element_bb.width / 3; ++i) {
          browserTrigger(element, moveEvent, { x: i + element_bb.left});
          // 0 <= the thumb left < element.width
          expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toBeBetween(0 - 1, element_bb.width);
          expect(scope.foo).toBeBetween(-50, 50);
        }

        browserTrigger(document.body, endEvent);
      });


      it('should use a static step', function () {
        defaultBefore('<div ui-slider  ng-model="foo" step="25"></div>');
        browserTrigger(element, startEvent, { x: element_bb.left | 0 });
        expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(0);

        browserTrigger(element, moveEvent, { x: element_bb.width / 2 + element_bb.left});
        thumb_bb = $thumb[0].getBoundingClientRect();
        expect(scope.foo).toEqual(50);
        expect(Math.ceil(thumb_bb.left) - thumb_left_pos).toEqual(element_bb.width / 2);

        browserTrigger(element, moveEvent, { x: element_bb.width / 2.5 + element_bb.left});
        thumb_bb = $thumb[0].getBoundingClientRect();
        expect(scope.foo).toEqual(25);

        // FIXME: Phantom have a pixel of difference...
        //expect( Math.ceil(thumb_bb.left) - thumb_left_pos ).toEqual( Math.round(element_bb.width / 4) );

        browserTrigger(document.body, endEvent);
      });


    });


  });
};


sliderTests('touch', 'touchstart', 'touchmove', 'touchend');
sliderTests('mouse', 'mousedown', 'mousemove', 'mouseup');