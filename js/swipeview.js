/*!
 * SwipeView v1.0 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
var SwipeView = (function (window, document) {
	var dummyStyle = document.createElement('div').style,
		vendor = (function () {
			var vendors = 't,webkitT,MozT,msT,OT'.split(','),
				t,
				i = 0,
				l = vendors.length;

			for ( ; i < l; i++ ) {
				t = vendors[i] + 'ransform';
				if ( t in dummyStyle ) {
					return vendors[i].substr(0, vendors[i].length - 1);
				}
			}

			return false;
		})(),
		cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',

		// Style properties
		transform = prefixStyle('transform'),
		transitionDuration = prefixStyle('transitionDuration'),

		// Browser capabilities
		has3d = prefixStyle('perspective') in dummyStyle,
		hasTouch = 'ontouchstart' in window,
		hasTransform = !!vendor,
		hasTransitionEnd = prefixStyle('transition') in dummyStyle,

		// Helpers
		translateZ = has3d ? ' translateZ(0)' : '',

		// Events
		resizeEvent = 'onorientationchange' in window ? 'orientationchange' : 'resize',
		startEvent = hasTouch ? 'touchstart' : 'mousedown',
		moveEvent = hasTouch ? 'touchmove' : 'mousemove',
		endEvent = hasTouch ? 'touchend' : 'mouseup',
		cancelEvent = hasTouch ? 'touchcancel' : 'mouseup',
		transitionEndEvent = (function () {
			if ( vendor === false ) return false;

			var transitionEnd = {
					''			: 'transitionend',
					'webkit'	: 'webkitTransitionEnd',
					'Moz'		: 'transitionend',
					'O'			: 'oTransitionEnd',
					'ms'		: 'MSTransitionEnd'
				};

			return transitionEnd[vendor];
		})(),

		SwipeView = function (el, options) {
			var i,
				div,
				className,
				pageIndex;

			this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
			this.options = {
				text: null,
				numberOfPages: 3,
				snapThreshold: null,
				hastyPageFlip: false,
				loop: true
			};

			// User defined options
			for (i in options) this.options[i] = options[i];

			this.wrapper.style.overflow = 'hidden';
			this.wrapper.style.position = 'relative';

			this.masterPages = [];

			div = document.createElement('div');
			div.id = 'swipeview-slider';
			div.style.cssText = 'position:relative;top:0;height:100%;width:100%;' + cssVendor + 'transition-duration:0;' + cssVendor + 'transform:translateZ(0);' + cssVendor + 'transition-timing-function:ease-out';
			this.wrapper.appendChild(div);
			this.slider = div;

			this.refreshSize();

			for (i=-1; i<2; i++) {
				div = document.createElement('div');
				div.id = 'swipeview-masterpage-' + (i+1);
				div.style.cssText = cssVendor + 'transform:translateZ(0);position:absolute;top:0;height:100%;width:100%;top:' + i*100 + '%';
				if (!div.dataset) div.dataset = {};
				pageIndex = i == -1 ? this.options.numberOfPages - 1 : i;
				div.dataset.pageIndex = pageIndex;
				div.dataset.upcomingPageIndex = pageIndex;

				if (!this.options.loop && i == -1) div.style.visibility = 'hidden';

				this.slider.appendChild(div);
				this.masterPages.push(div);
			}

			className = this.masterPages[1].className;
			this.masterPages[1].className = !className ? 'swipeview-active' : className + ' swipeview-active';

			window.addEventListener(resizeEvent, this, false);
			this.wrapper.addEventListener(startEvent, this, false);
			this.wrapper.addEventListener(moveEvent, this, false);
			this.wrapper.addEventListener(endEvent, this, false);
			this.slider.addEventListener(transitionEndEvent, this, false);
			// in Opera >= 12 the transitionend event is lowercase so we register both events
			if ( vendor == 'O' ) this.slider.addEventListener(transitionEndEvent.toLowerCase(), this, false);

/*			if (!hasTouch) {
				this.wrapper.addEventListener('mouseout', this, false);
			}*/
		};

	SwipeView.prototype = {
		currentMasterPage: 1,
		y: 0,
		page: 0,
		pageIndex: 0,
		customEvents: [],

		onFlip: function (fn) {
			this.wrapper.addEventListener('swipeview-flip', fn, false);
			this.customEvents.push(['flip', fn]);
		},

		onMoveOut: function (fn) {
			this.wrapper.addEventListener('swipeview-moveout', fn, false);
			this.customEvents.push(['moveout', fn]);
		},

		onMoveIn: function (fn) {
			this.wrapper.addEventListener('swipeview-movein', fn, false);
			this.customEvents.push(['movein', fn]);
		},

		onTouchStart: function (fn) {
			this.wrapper.addEventListener('swipeview-touchstart', fn, false);
			this.customEvents.push(['touchstart', fn]);
		},

		destroy: function () {
			while ( this.customEvents.length ) {
				this.wrapper.removeEventListener('swipeview-' + this.customEvents[0][0], this.customEvents[0][1], false);
				this.customEvents.shift();
			}

			// Remove the event listeners
			window.removeEventListener(resizeEvent, this, false);
			this.wrapper.removeEventListener(startEvent, this, false);
			this.wrapper.removeEventListener(moveEvent, this, false);
			this.wrapper.removeEventListener(endEvent, this, false);
			this.slider.removeEventListener(transitionEndEvent, this, false);

/*			if (!hasTouch) {
				this.wrapper.removeEventListener('mouseout', this, false);
			}*/
		},

		refreshSize: function () {
			this.wrapperWidth = this.wrapper.clientWidth;
			this.wrapperHeight = this.wrapper.clientHeight;
			this.pageWidth = this.wrapperWidth;
			this.pageHeight = this.wrapperHeight;
			this.maxY = -this.options.numberOfPages * this.pageHeight + this.wrapperWidth;
			this.snapThreshold = this.options.snapThreshold === null ?
				Math.round(this.pageHeight * 0.15) :
				/%/.test(this.options.snapThreshold) ?
					Math.round(this.pageHeight * this.options.snapThreshold.replace('%', '') / 100) :
					this.options.snapThreshold;
		},

		updatePageCount: function (n) {
			this.options.numberOfPages = n;
			this.maxY = -this.options.numberOfPages * this.pageHeight + this.wrapperHeight;
		},

		goToPage: function (p) {
			var i;

			this.masterPages[this.currentMasterPage].className = this.masterPages[this.currentMasterPage].className.replace(/(^|\s)swipeview-active(\s|$)/, '');
			for (i=0; i<3; i++) {
				className = this.masterPages[i].className;
				/(^|\s)swipeview-loading(\s|$)/.test(className) || (this.masterPages[i].className = !className ? 'swipeview-loading' : className + ' swipeview-loading');
			}

			p = p < 0 ? 0 : p > this.options.numberOfPages-1 ? this.options.numberOfPages-1 : p;
			this.page = p;
			this.pageIndex = p;
			this.slider.style[transitionDuration] = '0s';
			this.__pos(-p * this.pageHeight);

			this.currentMasterPage = (this.page + 1) - Math.floor((this.page + 1) / 3) * 3;

			this.masterPages[this.currentMasterPage].className = this.masterPages[this.currentMasterPage].className + ' swipeview-active';

			if (this.currentMasterPage === 0) {
				this.masterPages[2].style.top = this.page * 100 - 100 + '%';
				this.masterPages[0].style.top = this.page * 100 + '%';
				this.masterPages[1].style.top = this.page * 100 + 100 + '%';

				this.masterPages[2].dataset.upcomingPageIndex = this.page === 0 ? this.options.numberOfPages-1 : this.page - 1;
				this.masterPages[0].dataset.upcomingPageIndex = this.page;
				this.masterPages[1].dataset.upcomingPageIndex = this.page == this.options.numberOfPages-1 ? 0 : this.page + 1;
			} else if (this.currentMasterPage == 1) {
				this.masterPages[0].style.top = this.page * 100 - 100 + '%';
				this.masterPages[1].style.top = this.page * 100 + '%';
				this.masterPages[2].style.top = this.page * 100 + 100 + '%';

				this.masterPages[0].dataset.upcomingPageIndex = this.page === 0 ? this.options.numberOfPages-1 : this.page - 1;
				this.masterPages[1].dataset.upcomingPageIndex = this.page;
				this.masterPages[2].dataset.upcomingPageIndex = this.page == this.options.numberOfPages-1 ? 0 : this.page + 1;
			} else {
				this.masterPages[1].style.top = this.page * 100 - 100 + '%';
				this.masterPages[2].style.top = this.page * 100 + '%';
				this.masterPages[0].style.top = this.page * 100 + 100 + '%';

				this.masterPages[1].dataset.upcomingPageIndex = this.page === 0 ? this.options.numberOfPages-1 : this.page - 1;
				this.masterPages[2].dataset.upcomingPageIndex = this.page;
				this.masterPages[0].dataset.upcomingPageIndex = this.page == this.options.numberOfPages-1 ? 0 : this.page + 1;
			}

			this.__flip();
		},

		next: function () {
			if (!this.options.loop && this.y == this.maxY) return;

			this.directionY = -1;
			this.y -= 1;
			this.__checkPosition();
		},

		prev: function () {
			if (!this.options.loop && this.y === 0) return;

			this.directionY = 1;
			this.y += 1;
			this.__checkPosition();
		},

		handleEvent: function (e) {
			switch (e.type) {
				case startEvent:
					this.__start(e);
					break;
				case moveEvent:
					this.__move(e);
					break;
				case cancelEvent:
				case endEvent:
					this.__end(e);
					break;
				case resizeEvent:
					this.__resize();
					break;
				case transitionEndEvent:
				case 'otransitionend':
					if (e.target == this.slider && !this.options.hastyPageFlip) this.__flip();
					break;
			}
		},


		/**
		*
		* Pseudo private methods
		*
		*/
		__pos: function (y) {
			this.y = y;
			var windowHeight = $(window).height();
			this.relativeY = (this.y/windowHeight);
			var roundedY = Math.round(this.relativeY);
			this.relativeY = 2*Math.abs(this.relativeY - roundedY);
			console.log(this.relativeY);

			var amplitude = 100;
			var period = 1/2;
			var offset = 0;
			this.slider.style[transform] = 'translate(' + amplitude * Math.sin((period*this.relativeY) + offset) + 'px,' + y + 'px)' + translateZ;
		},

		__resize: function () {
			this.refreshSize();
			this.slider.style[transitionDuration] = '0s';
			this.__pos(-this.page * this.pageHeight);
		},

		__start: function (e) {
			//e.preventDefault();

			if (this.initiated) return;

			var point = hasTouch ? e.touches[0] : e;

			this.initiated = true;
			this.moved = false;
			this.thresholdExceeded = false;
			this.startX = point.pageX;
			this.startY = point.pageY;
			this.pointX = point.pageX;
			this.pointY = point.pageY;
			this.stepsX = 0;
			this.stepsY = 0;
			this.directionY = 0;
			this.directionLocked = false;

/*			var matrix = getComputedStyle(this.slider, null).webkitTransform.replace(/[^0-9-.,]/g, '').split(',');
			this.x = matrix[4] * 1;*/

			this.slider.style[transitionDuration] = '0s';

			this.__event('touchstart');
		},

		__move: function (e) {
			if (!this.initiated) return;

			var point = hasTouch ? e.touches[0] : e,
				deltaX = point.pageX - this.pointX,
				deltaY = point.pageY - this.pointY,
				newY = this.y + deltaY,
				dist = Math.abs(point.pageY - this.startY);

			this.moved = true;
			this.pointX = point.pageX;
			this.pointY = point.pageY;
			this.directionX = deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0;
			this.directionY = deltaY > 0 ? 1 : deltaY < 0 ? -1 : 0;
			this.stepsX += Math.abs(deltaX);
			this.stepsY += Math.abs(deltaY);

			// We take a 10px buffer to figure out the direction of the swipe
			if (this.stepsX < 10 && this.stepsY < 10) {
//				e.preventDefault();
				return;
			}

			// We are scrolling horizontally, so skip SwipeView and give the control back to the browser
			if (!this.directionLocked && this.stepsX > this.stepsY) {
				this.initiated = false;
				return;
			}

			e.preventDefault();

			this.directionLocked = true;

			if (!this.options.loop && (newY > 0 || newY < this.maxY)) {
				newY = this.y + (deltaY / 2);
			}

			if (!this.thresholdExceeded && dist >= this.snapThreshold) {
				this.thresholdExceeded = true;
				this.__event('moveout');
			} else if (this.thresholdExceeded && dist < this.snapThreshold) {
				this.thresholdExceeded = false;
				this.__event('movein');
			}

/*			if (newX > 0 || newX < this.maxX) {
				newX = this.x + (deltaX / 2);
			}*/

			this.__pos(newY);
		},

		__end: function (e) {
			if (!this.initiated) return;

			var point = hasTouch ? e.changedTouches[0] : e,
				dist = Math.abs(point.pageY - this.startY);

			this.initiated = false;

			if (!this.moved) return;

			// if (!this.options.loop && (this.y > 0 || this.y < this.maxY)) {
			// 	dist = 0;
			// 	this.__event('movein');
			// }

			// Check if we exceeded the snap threshold
			if (dist < this.snapThreshold) {
				this.slider.style[transitionDuration] = Math.floor(300 * dist / this.snapThreshold) + 'ms';
				this.__pos(-this.page * this.pageHeight);
				return;
			}

			this.__checkPosition();
		},

		__checkPosition: function () {
			var pageFlip,
				pageFlipIndex,
				className;

			this.masterPages[this.currentMasterPage].className = this.masterPages[this.currentMasterPage].className.replace(/(^|\s)swipeview-active(\s|$)/, '');

			// Flip the page
			if (this.directionY > 0) {
				this.page = -Math.ceil(this.y / this.pageHeight);
				this.currentMasterPage = (this.page + 1) - Math.floor((this.page + 1) / 3) * 3;
				this.pageIndex = this.pageIndex === 0 ? this.options.numberOfPages - 1 : this.pageIndex - 1;

				pageFlip = this.currentMasterPage - 1;
				pageFlip = pageFlip < 0 ? 2 : pageFlip;
				this.masterPages[pageFlip].style.top = this.page * 100 - 100 + '%';

				pageFlipIndex = this.page - 1;
			} else {
				this.page = -Math.floor(this.y / this.pageHeight);
				this.currentMasterPage = (this.page + 1) - Math.floor((this.page + 1) / 3) * 3;
				this.pageIndex = this.pageIndex == this.options.numberOfPages - 1 ? 0 : this.pageIndex + 1;

				pageFlip = this.currentMasterPage + 1;
				pageFlip = pageFlip > 2 ? 0 : pageFlip;
				this.masterPages[pageFlip].style.top = this.page * 100 + 100 + '%';

				pageFlipIndex = this.page + 1;
			}

			// Add active class to current page
			className = this.masterPages[this.currentMasterPage].className;
			/(^|\s)swipeview-active(\s|$)/.test(className) || (this.masterPages[this.currentMasterPage].className = !className ? 'swipeview-active' : className + ' swipeview-active');

			// Add loading class to flipped page
			className = this.masterPages[pageFlip].className;
			/(^|\s)swipeview-loading(\s|$)/.test(className) || (this.masterPages[pageFlip].className = !className ? 'swipeview-loading' : className + ' swipeview-loading');

			pageFlipIndex = pageFlipIndex - Math.floor(pageFlipIndex / this.options.numberOfPages) * this.options.numberOfPages;
			this.masterPages[pageFlip].dataset.upcomingPageIndex = pageFlipIndex;		// Index to be loaded in the newly flipped page

			newY = -this.page * this.pageHeight;

			this.slider.style[transitionDuration] = Math.floor(500 * Math.abs(this.y - newY) / this.pageHeight) + 'ms';

			// Hide the next page if we decided to disable looping
			if (!this.options.loop) {
				this.masterPages[pageFlip].style.visibility = newY === 0 || newY == this.maxY ? 'hidden' : '';
			}

			if (this.y == newY) {
				this.__flip();		// If we swiped all the way long to the next page (extremely rare but still)
			} else {
				this.__pos(newY);
				if (this.options.hastyPageFlip) this.__flip();
			}
		},

		__flip: function () {
			this.__event('flip');

			for (var i=0; i<3; i++) {
				this.masterPages[i].className = this.masterPages[i].className.replace(/(^|\s)swipeview-loading(\s|$)/, '');		// Remove the loading class
				this.masterPages[i].dataset.pageIndex = this.masterPages[i].dataset.upcomingPageIndex;
			}
		},

		__event: function (type) {
			var ev = document.createEvent("Event");

			ev.initEvent('swipeview-' + type, true, true);

			this.wrapper.dispatchEvent(ev);
		}
	};

	function prefixStyle (style) {
		if ( vendor === '' ) return style;

		style = style.charAt(0).toUpperCase() + style.substr(1);
		return vendor + style;
	}

	return SwipeView;
})(window, document);