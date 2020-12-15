/**
 * main.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2016, Codrops
 * http://www.codrops.com
 */
;(function(window) {

	'use strict';

	// from: http://stackoverflow.com/a/21913575
	function getComputedTranslateY(obj) {
		if(!window.getComputedStyle) return;
		var style = getComputedStyle(obj),
			transform = style.transform || style.webkitTransform || style.mozTransform;
		var mat = transform.match(/^matrix3d\((.+)\)$/);
		if(mat) return parseFloat(mat[1].split(', ')[13]);
		mat = transform.match(/^matrix\((.+)\)$/);
		return mat ? parseFloat(mat[1].split(', ')[5]) : 0;
	}

	/**********************************************/
	/** https://gist.github.com/desandro/1866474 **/
	/**********************************************/
	var lastTime = 0;
	var prefixes = 'webkit moz ms o'.split(' ');
	// get unprefixed rAF and cAF, if present
	var requestAnimationFrame = window.requestAnimationFrame;
	var cancelAnimationFrame = window.cancelAnimationFrame;
	// loop through vendor prefixes and get prefixed rAF and cAF
	var prefix;
	for( var i = 0; i < prefixes.length; i++ ) {
		if ( requestAnimationFrame && cancelAnimationFrame ) {
			break;
		}
		prefix = prefixes[i];
		requestAnimationFrame = requestAnimationFrame || window[ prefix + 'RequestAnimationFrame' ];
		cancelAnimationFrame  = cancelAnimationFrame  || window[ prefix + 'CancelAnimationFrame' ] ||
		window[ prefix + 'CancelRequestAnimationFrame' ];
	}

	// fallback to setTimeout and clearTimeout if either request/cancel is not supported
	if ( !requestAnimationFrame || !cancelAnimationFrame ) {
		requestAnimationFrame = function( callback, element ) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
			var id = window.setTimeout( function() {
				callback( currTime + timeToCall );
			}, timeToCall );
			lastTime = currTime + timeToCall;
			return id;
		};

		cancelAnimationFrame = function( id ) {
			window.clearTimeout( id );
		};
	}
	/**********************************************/
	/** https://gist.github.com/desandro/1866474 **/
	/**********************************************/

	var docElem = window.document.documentElement;

	// some helper functions
	function scrollY() { return window.pageYOffset || docElem.scrollTop; }
	function extend( a, b ) {
		for( var key in b ) {
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	/**
	 * Isometric grid obj
	 */
	function IsoGrid(el, options) {
		this.isolayerEl = el;

		this.options = extend( {}, this.options );
		extend( this.options, options );

		this.gridEl = this.isolayerEl.querySelector('.grid');

		// grid items
		this.gridItems = [].slice.call(this.gridEl.querySelectorAll('.grid__item'));
		this.gridItemsTotal = this.gridItems.length;

		this.didscroll = false;

		this._init();
	}

	IsoGrid.prototype.options = {
		// static or scrollable
		type: 'static',
		// grid perspective value
		perspective: 0,
		// grid transform
		transform: '',
		// each grid item animation (for the subitems)
		stackItemsAnimation : {
			// this follows the dynamics.js (https://github.com/michaelvillar/dynamics.js) animate fn syntax
			// properties (pos is the current subitem position)
			properties : function(pos) {
				return {
					translateZ: (pos+1) * 50
				};
			},
			// animation options (pos is the current subitem position); itemstotal is the total number of subitems
			options : function(pos, itemstotal) {
				return {
					type: dynamics.bezier,
					duration: 500,
					points: [{"x":0,"y":0,"cp":[{"x":0.2,"y":1}]},{"x":1,"y":1,"cp":[{"x":0.3,"y":1}]}]
				};
			}
		},
		// callback for loaded grid
		onGridLoaded : function() { return false; }
	};

	IsoGrid.prototype._init = function() {
		var self = this;

		imagesLoaded(this.gridEl, function() {
			// initialize masonry
			self.msnry = new Masonry(self.gridEl, {
				itemSelector: '.grid__item',
				isFitWidth : true
			});

			// the isolayer div element will be positioned fixed and will have a transformation based on the values defined in the HTML (data-attrs for the isolayer div element)
			if( self.options.type === 'scrollable' ) {
				self.isolayerEl.style.position = 'fixed';
			}

			self.isolayerEl.style.WebkitTransformStyle = self.isolayerEl.style.transformStyle = 'preserve-3d';

			var transformValue = self.options.perspective != 0 ? 'perspective(' + self.options.perspective + 'px) ' + self.options.transform : self.options.transform;
			self.isolayerEl.style.WebkitTransform = self.isolayerEl.style.transform = transformValue;

			// create the div element that will force the height for scrolling
			if( self.options.type === 'scrollable' ) {
				self._createPseudoScroller();
			}

			// init/bind events
			self._initEvents();

			// effects for loading grid elements:
			if( self.options.type === 'scrollable' ) {
				new AnimOnScroll(self.gridEl, {
					minDuration : 1,
					maxDuration : 1.2,
					viewportFactor : 0
				});
			}

			// grid is "loaded" (all images are loaded)
			self.options.onGridLoaded();
			classie.add(self.gridEl, 'grid--loaded');
		});
	};


	/**
	 * Initialize/Bind events fn.
	 */
	IsoGrid.prototype._initEvents = function() {
		var self = this;

		var scrollHandler = function() {
				requestAnimationFrame(function() {
					if (!self.didscroll) {
						self.didscroll = true;
						self._scrollPage();
					}
				});
			},
			mouseenterHandler = function(ev) {
				self._expandSubItems(ev.target);
			},
			mouseleaveHandler = function(ev) {
				self._collapseSubItems(ev.target);
			};

		if( this.options.type === 'scrollable' ) {
			// update the transform (ty) on scroll
			window.addEventListener('scroll', scrollHandler, false);
			// on resize (layoutComplete for the masonry instance) recalculate height
			this.msnry.on('layoutComplete', function( laidOutItems ) {
				// reset the height of the pseudoScroller (grid´s height + additional space between the top of the rotated isolayerEl and the page)
				self.pseudoScrollerEl.style.height = self.gridEl.offsetHeight + self.isolayerEl.offsetTop * Math.sqrt(2) + 'px';
				self._scrollPage();
			});
		}

		this.gridItems.forEach(function(item) {
			item.addEventListener('mouseenter', mouseenterHandler);
			item.addEventListener('mouseleave', mouseleaveHandler);
		});
	};

	IsoGrid.prototype._expandSubItems = function(item) {
		var self = this,
			itemLink = item.querySelector('a'),
			subItems = [].slice.call(itemLink.querySelectorAll('.layer')),
			subItemsTotal = subItems.length;

		itemLink.style.zIndex = item.style.zIndex = this.gridItemsTotal;

		subItems.forEach(function(subitem, pos) {
			dynamics.stop(subitem);
			dynamics.animate(subitem, self.options.stackItemsAnimation.properties(pos), self.options.stackItemsAnimation.options(pos, subItemsTotal));
		});
	};

	IsoGrid.prototype._collapseSubItems = function(item) {
		var itemLink = item.querySelector('a');
		[].slice.call(itemLink.querySelectorAll('.layer')).forEach(function(subitem, pos) {
			dynamics.stop(subitem);
			dynamics.animate(subitem, {
				translateZ: 0 // enough to reset any transform value previously set
			}, {
				duration: 100,
				complete: function() {
					itemLink.style.zIndex = item.style.zIndex = 1;
				}
			})
		});
	};

	IsoGrid.prototype._scrollPage = function() {
		this.gridEl.style.WebkitTransform = this.gridEl.style.transform = 'translate3d(0,-' + scrollY() + 'px,0)';
		this.didscroll = false;
	};

	window.IsoGrid = IsoGrid;

})(window);

// classie

/*!
 * classie v1.0.1
 * class helper functions
 * from bonzo https://github.com/ded/bonzo
 * MIT license
 *
 * classie.has( elem, 'my-class' ) -> true/false
 * classie.add( elem, 'my-new-class' )
 * classie.remove( elem, 'my-unwanted-class' )
 * classie.toggle( elem, 'my-class' )
 */

/*jshint browser: true, strict: true, undef: true, unused: true */
/*global define: false, module: false */

( function( window ) {

'use strict';

// class helper functions from bonzo https://github.com/ded/bonzo

function classReg( className ) {
  return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
}

// classList support for class management
// altho to be fair, the api sucks because it won't accept multiple classes at once
var hasClass, addClass, removeClass;

if ( 'classList' in document.documentElement ) {
  hasClass = function( elem, c ) {
    return elem.classList.contains( c );
  };
  addClass = function( elem, c ) {
    elem.classList.add( c );
  };
  removeClass = function( elem, c ) {
    elem.classList.remove( c );
  };
}
else {
  hasClass = function( elem, c ) {
    return classReg( c ).test( elem.className );
  };
  addClass = function( elem, c ) {
    if ( !hasClass( elem, c ) ) {
      elem.className = elem.className + ' ' + c;
    }
  };
  removeClass = function( elem, c ) {
    elem.className = elem.className.replace( classReg( c ), ' ' );
  };
}

function toggleClass( elem, c ) {
  var fn = hasClass( elem, c ) ? removeClass : addClass;
  fn( elem, c );
}

var classie = {
  // full names
  hasClass: hasClass,
  addClass: addClass,
  removeClass: removeClass,
  toggleClass: toggleClass,
  // short names
  has: hasClass,
  add: addClass,
  remove: removeClass,
  toggle: toggleClass
};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( classie );
} else if ( typeof exports === 'object' ) {
  // CommonJS
  module.exports = classie;
} else {
  // browser global
  window.classie = classie;
}

})( window );


//	dynamics.min

(function(){var t,e,n,r,o,i,s,a,u,l,f,h,p,c,m,d,g,y,v,b,w,x,M,S,k,T,C,H,R,q,X,I,Y,j,z,F,G,A,O,V,Z,E,L,D,P,W,N,$,B,U,K,J,Q,_,te,ee,ne,re=function(t,e){return function(){return t.apply(e,arguments)}};q=function(){return"visible"===document.visibilityState||null!=C.tests},z=function(){var t;return t=[],"undefined"!=typeof document&&null!==document&&document.addEventListener("visibilitychange",function(){var e,n,r,o;for(o=[],n=0,r=t.length;r>n;n++)e=t[n],o.push(e(q()));return o}),function(e){return t.push(e)}}(),M=function(t){var e,n,r;n={};for(e in t)r=t[e],n[e]=r;return n},w=function(t){var e;return e={},function(){var n,r,o,i,s;for(r="",i=0,s=arguments.length;s>i;i++)n=arguments[i],r+=n.toString()+",";return o=e[r],o||(e[r]=o=t.apply(this,arguments)),o}},j=function(t){return function(e){var n,r,o;return e instanceof Array||e instanceof NodeList||e instanceof HTMLCollection?o=function(){var o,i,s;for(s=[],r=o=0,i=e.length;i>=0?i>o:o>i;r=i>=0?++o:--o)n=Array.prototype.slice.call(arguments,1),n.splice(0,0,e[r]),s.push(t.apply(this,n));return s}.apply(this,arguments):t.apply(this,arguments)}},g=function(t,e){var n,r,o;o=[];for(n in e)r=e[n],o.push(null!=t[n]?t[n]:t[n]=r);return o},y=function(t,e){var n,r,o;if(null!=t.style)return v(t,e);o=[];for(n in e)r=e[n],o.push(t[n]=r.format());return o},v=function(t,e){var n,r,o,i,s;e=F(e),i=[],n=X(t);for(r in e)s=e[r],te.contains(r)?i.push([r,s]):(null!=s.format&&(s=s.format()),"number"==typeof s&&(s=""+s+ne(r,s)),n&&U.contains(r)?t.setAttribute(r,s):t.style[A(r)]=s);return i.length>0?n?(o=new l,o.applyProperties(i),t.setAttribute("transform",o.decompose().format())):(s=i.map(function(t){return ee(t[0],t[1])}).join(" "),t.style[A("transform")]=s):void 0},X=function(t){var e,n;return"undefined"!=typeof SVGElement&&null!==SVGElement&&"undefined"!=typeof SVGSVGElement&&null!==SVGSVGElement?t instanceof SVGElement&&!(t instanceof SVGSVGElement):null!=(e=null!=(n=C.tests)&&"function"==typeof n.isSVG?n.isSVG(t):void 0)?e:!1},Z=function(t,e){var n;return n=Math.pow(10,e),Math.round(t*n)/n},f=function(){function t(t){var e,n,r;for(this.obj={},n=0,r=t.length;r>n;n++)e=t[n],this.obj[e]=1}return t.prototype.contains=function(t){return 1===this.obj[t]},t}(),_=function(t){return t.replace(/([A-Z])/g,function(t){return"-"+t.toLowerCase()})},O=new f("marginTop,marginLeft,marginBottom,marginRight,paddingTop,paddingLeft,paddingBottom,paddingRight,top,left,bottom,right,translateX,translateY,translateZ,perspectiveX,perspectiveY,perspectiveZ,width,height,maxWidth,maxHeight,minWidth,minHeight,borderRadius".split(",")),T=new f("rotate,rotateX,rotateY,rotateZ,skew,skewX,skewY,skewZ".split(",")),te=new f("translate,translateX,translateY,translateZ,scale,scaleX,scaleY,scaleZ,rotate,rotateX,rotateY,rotateZ,rotateC,rotateCX,rotateCY,skew,skewX,skewY,skewZ,perspective".split(",")),U=new f("accent-height,ascent,azimuth,baseFrequency,baseline-shift,bias,cx,cy,d,diffuseConstant,divisor,dx,dy,elevation,filterRes,fx,fy,gradientTransform,height,k1,k2,k3,k4,kernelMatrix,kernelUnitLength,letter-spacing,limitingConeAngle,markerHeight,markerWidth,numOctaves,order,overline-position,overline-thickness,pathLength,points,pointsAtX,pointsAtY,pointsAtZ,r,radius,rx,ry,seed,specularConstant,specularExponent,stdDeviation,stop-color,stop-opacity,strikethrough-position,strikethrough-thickness,surfaceScale,target,targetX,targetY,transform,underline-position,underline-thickness,viewBox,width,x,x1,x2,y,y1,y2,z".split(",")),ne=function(t,e){return"number"!=typeof e?"":O.contains(t)?"px":T.contains(t)?"deg":""},ee=function(t,e){var n,r;return n=(""+e).match(/^([0-9.-]*)([^0-9]*)$/),null!=n?(e=n[1],r=n[2]):e=parseFloat(e),e=Z(parseFloat(e),10),(null==r||""===r)&&(r=ne(t,e)),""+t+"("+e+r+")"},F=function(t){var e,n,r,o,i,s,a,u;r={};for(o in t)if(i=t[o],te.contains(o))if(n=o.match(/(translate|rotateC|rotate|skew|scale|perspective)(X|Y|Z|)/),n&&n[2].length>0)r[o]=i;else for(u=["X","Y","Z"],s=0,a=u.length;a>s;s++)e=u[s],r[n[1]+e]=i;else r[o]=i;return r},k=function(t){var e;return e="opacity"===t?1:0,""+e+ne(t,e)},H=function(t,e){var n,r,o,i,s,a,f,h,p,c,m;if(i={},n=X(t),null!=t.style)for(s=window.getComputedStyle(t,null),f=0,p=e.length;p>f;f++)r=e[f],te.contains(r)?null==i.transform&&(o=n?new l(null!=(m=t.transform.baseVal.consolidate())?m.matrix:void 0):u.fromTransform(s[A("transform")]),i.transform=o.decompose()):(a=s[r],null==a&&U.contains(r)&&(a=t.getAttribute(r)),(""===a||null==a)&&(a=k(r)),i[r]=S(a));else for(h=0,c=e.length;c>h;h++)r=e[h],i[r]=S(t[r]);return i},S=function(t){var e,n,o,u,l;for(o=[r,s,i,a],u=0,l=o.length;l>u;u++)if(n=o[u],e=n.create(t),null!=e)return e;return null},a=function(){function t(t){this.parts=t,this.format=re(this.format,this),this.interpolate=re(this.interpolate,this)}return t.prototype.interpolate=function(e,n){var r,o,i,s,a,u;for(s=this.parts,r=e.parts,i=[],o=a=0,u=Math.min(s.length,r.length);u>=0?u>a:a>u;o=u>=0?++a:--a)i.push(null!=s[o].interpolate?s[o].interpolate(r[o],n):s[o]);return new t(i)},t.prototype.format=function(){var t;return t=this.parts.map(function(t){return null!=t.format?t.format():t}),t.join("")},t.create=function(e){var n,r,s,a,u,l,f,h,p,c,m;for(e=""+e,s=[],f=[{re:/(#[a-f\d]{3,6})/gi,klass:o,parse:function(t){return t}},{re:/(rgba?\([0-9.]*, ?[0-9.]*, ?[0-9.]*(?:, ?[0-9.]*)?\))/gi,klass:o,parse:function(t){return t}},{re:/([-+]?[\d.]+)/gi,klass:i,parse:parseFloat}],h=0,c=f.length;c>h;h++)for(l=f[h],u=l.re;r=u.exec(e);)s.push({index:r.index,length:r[1].length,interpolable:l.klass.create(l.parse(r[1]))});for(s=s.sort(function(t,e){return t.index>e.index}),a=[],n=0,p=0,m=s.length;m>p;p++)r=s[p],r.index<n||(r.index>n&&a.push(e.substring(n,r.index)),a.push(r.interpolable),n=r.index+r.length);return n<e.length&&a.push(e.substring(n)),new t(a)},t}(),s=function(){function t(t){this.format=re(this.format,this),this.interpolate=re(this.interpolate,this),this.obj=t}return t.prototype.interpolate=function(e,n){var r,o,i,s,a;s=this.obj,r=e.obj,i={};for(o in s)a=s[o],i[o]=null!=a.interpolate?a.interpolate(r[o],n):a;return new t(i)},t.prototype.format=function(){return this.obj},t.create=function(e){var n,r,o;if(e instanceof Object){r={};for(n in e)o=e[n],r[n]=S(o);return new t(r)}return null},t}(),i=function(){function t(t){this.format=re(this.format,this),this.interpolate=re(this.interpolate,this),this.value=parseFloat(t)}return t.prototype.interpolate=function(e,n){var r,o;return o=this.value,r=e.value,new t((r-o)*n+o)},t.prototype.format=function(){return Z(this.value,5)},t.create=function(e){return"number"==typeof e?new t(e):null},t}(),r=function(){function t(t){this.values=t,this.format=re(this.format,this),this.interpolate=re(this.interpolate,this)}return t.prototype.interpolate=function(e,n){var r,o,i,s,a,u;for(s=this.values,r=e.values,i=[],o=a=0,u=Math.min(s.length,r.length);u>=0?u>a:a>u;o=u>=0?++a:--a)i.push(null!=s[o].interpolate?s[o].interpolate(r[o],n):s[o]);return new t(i)},t.prototype.format=function(){return this.values.map(function(t){return null!=t.format?t.format():t})},t.createFromArray=function(e){var n;return n=e.map(function(t){return S(t)||t}),n=n.filter(function(t){return null!=t}),new t(n)},t.create=function(e){return e instanceof Array?t.createFromArray(e):null},t}(),t=function(){function t(t,e){this.rgb=null!=t?t:{},this.format=e,this.toRgba=re(this.toRgba,this),this.toRgb=re(this.toRgb,this),this.toHex=re(this.toHex,this)}return t.fromHex=function(e){var n,r;return n=e.match(/^#([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i),null!=n&&(e="#"+n[1]+n[1]+n[2]+n[2]+n[3]+n[3]),r=e.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i),null!=r?new t({r:parseInt(r[1],16),g:parseInt(r[2],16),b:parseInt(r[3],16),a:1},"hex"):null},t.fromRgb=function(e){var n,r;return n=e.match(/^rgba?\(([0-9.]*), ?([0-9.]*), ?([0-9.]*)(?:, ?([0-9.]*))?\)$/),null!=n?new t({r:parseFloat(n[1]),g:parseFloat(n[2]),b:parseFloat(n[3]),a:parseFloat(null!=(r=n[4])?r:1)},null!=n[4]?"rgba":"rgb"):null},t.componentToHex=function(t){var e;return e=t.toString(16),1===e.length?"0"+e:e},t.prototype.toHex=function(){return"#"+t.componentToHex(this.rgb.r)+t.componentToHex(this.rgb.g)+t.componentToHex(this.rgb.b)},t.prototype.toRgb=function(){return"rgb("+this.rgb.r+", "+this.rgb.g+", "+this.rgb.b+")"},t.prototype.toRgba=function(){return"rgba("+this.rgb.r+", "+this.rgb.g+", "+this.rgb.b+", "+this.rgb.a+")"},t}(),o=function(){function e(t){this.color=t,this.format=re(this.format,this),this.interpolate=re(this.interpolate,this)}return e.prototype.interpolate=function(n,r){var o,i,s,a,u,l,f,h;for(a=this.color,o=n.color,s={},h=["r","g","b"],l=0,f=h.length;f>l;l++)i=h[l],u=Math.round((o.rgb[i]-a.rgb[i])*r+a.rgb[i]),s[i]=Math.min(255,Math.max(0,u));return i="a",u=Z((o.rgb[i]-a.rgb[i])*r+a.rgb[i],5),s[i]=Math.min(1,Math.max(0,u)),new e(new t(s,o.format))},e.prototype.format=function(){return"hex"===this.color.format?this.color.toHex():"rgb"===this.color.format?this.color.toRgb():"rgba"===this.color.format?this.color.toRgba():void 0},e.create=function(n){var r;if("string"==typeof n)return r=t.fromHex(n)||t.fromRgb(n),null!=r?new e(r):null},e}(),n=function(){function t(t){this.props=t,this.applyRotateCenter=re(this.applyRotateCenter,this),this.format=re(this.format,this),this.interpolate=re(this.interpolate,this)}return t.prototype.interpolate=function(e,n){var r,o,i,s,a,u,l,f,h,p,c,m;for(i={},p=["translate","scale","rotate"],s=0,f=p.length;f>s;s++)for(o=p[s],i[o]=[],r=a=0,c=this.props[o].length;c>=0?c>a:a>c;r=c>=0?++a:--a)i[o][r]=(e.props[o][r]-this.props[o][r])*n+this.props[o][r];for(r=u=1;2>=u;r=++u)i.rotate[r]=e.props.rotate[r];for(m=["skew"],l=0,h=m.length;h>l;l++)o=m[l],i[o]=(e.props[o]-this.props[o])*n+this.props[o];return new t(i)},t.prototype.format=function(){return"translate("+this.props.translate.join(",")+") rotate("+this.props.rotate.join(",")+") skewX("+this.props.skew+") scale("+this.props.scale.join(",")+")"},t.prototype.applyRotateCenter=function(t){var e,n,r,o,i,s;for(n=b.createSVGMatrix(),n=n.translate(t[0],t[1]),n=n.rotate(this.props.rotate[0]),n=n.translate(-t[0],-t[1]),r=new l(n),o=r.decompose().props.translate,s=[],e=i=0;1>=i;e=++i)s.push(this.props.translate[e]-=o[e]);return s},t}(),b="undefined"!=typeof document&&null!==document?document.createElementNS("http://www.w3.org/2000/svg","svg"):void 0,l=function(){function t(t){this.m=t,this.applyProperties=re(this.applyProperties,this),this.decompose=re(this.decompose,this),this.m||(this.m=b.createSVGMatrix())}return t.prototype.decompose=function(){var t,e,r,o,i;return o=new h([this.m.a,this.m.b]),i=new h([this.m.c,this.m.d]),t=o.length(),r=o.dot(i),o=o.normalize(),e=i.combine(o,1,-r).length(),new n({translate:[this.m.e,this.m.f],rotate:[180*Math.atan2(this.m.b,this.m.a)/Math.PI,this.rotateCX,this.rotateCY],scale:[t,e],skew:r/e*180/Math.PI})},t.prototype.applyProperties=function(t){var e,n,r,o,i,s,a,u;for(e={},i=0,s=t.length;s>i;i++)r=t[i],e[r[0]]=r[1];for(n in e)o=e[n],"translateX"===n?this.m=this.m.translate(o,0):"translateY"===n?this.m=this.m.translate(0,o):"scaleX"===n?this.m=this.m.scale(o,1):"scaleY"===n?this.m=this.m.scale(1,o):"rotateZ"===n?this.m=this.m.rotate(o):"skewX"===n?this.m=this.m.skewX(o):"skewY"===n&&(this.m=this.m.skewY(o));return this.rotateCX=null!=(a=e.rotateCX)?a:0,this.rotateCY=null!=(u=e.rotateCY)?u:0},t}(),h=function(){function t(t){this.els=t,this.combine=re(this.combine,this),this.normalize=re(this.normalize,this),this.length=re(this.length,this),this.cross=re(this.cross,this),this.dot=re(this.dot,this),this.e=re(this.e,this)}return t.prototype.e=function(t){return 1>t||t>this.els.length?null:this.els[t-1]},t.prototype.dot=function(t){var e,n,r;if(e=t.els||t,r=0,n=this.els.length,n!==e.length)return null;for(n+=1;--n;)r+=this.els[n-1]*e[n-1];return r},t.prototype.cross=function(e){var n,r;return r=e.els||e,3!==this.els.length||3!==r.length?null:(n=this.els,new t([n[1]*r[2]-n[2]*r[1],n[2]*r[0]-n[0]*r[2],n[0]*r[1]-n[1]*r[0]]))},t.prototype.length=function(){var t,e,n,r,o;for(t=0,o=this.els,n=0,r=o.length;r>n;n++)e=o[n],t+=Math.pow(e,2);return Math.sqrt(t)},t.prototype.normalize=function(){var e,n,r,o,i;r=this.length(),o=[],i=this.els;for(n in i)e=i[n],o[n]=e/r;return new t(o)},t.prototype.combine=function(e,n,r){var o,i,s,a;for(i=[],o=s=0,a=this.els.length;a>=0?a>s:s>a;o=a>=0?++s:--s)i[o]=n*this.els[o]+r*e.els[o];return new t(i)},t}(),e=function(){function t(){this.toMatrix=re(this.toMatrix,this),this.format=re(this.format,this),this.interpolate=re(this.interpolate,this)}return t.prototype.interpolate=function(e,n,r){var o,i,s,a,u,l,f,h,p,c,m,d,g,y,v,b,w,x;for(null==r&&(r=null),s=this,i=new t,w=["translate","scale","skew","perspective"],d=0,b=w.length;b>d;d++)for(f=w[d],i[f]=[],a=g=0,x=s[f].length-1;x>=0?x>=g:g>=x;a=x>=0?++g:--g)i[f][a]=null==r||r.indexOf(f)>-1||r.indexOf(""+f+["x","y","z"][a])>-1?(e[f][a]-s[f][a])*n+s[f][a]:s[f][a];if(null==r||-1!==r.indexOf("rotate")){if(h=s.quaternion,p=e.quaternion,o=h[0]*p[0]+h[1]*p[1]+h[2]*p[2]+h[3]*p[3],0>o){for(a=y=0;3>=y;a=++y)h[a]=-h[a];o=-o}for(o+1>.05?1-o>=.05?(m=Math.acos(o),l=1/Math.sin(m),c=Math.sin(m*(1-n))*l,u=Math.sin(m*n)*l):(c=1-n,u=n):(p[0]=-h[1],p[1]=h[0],p[2]=-h[3],p[3]=h[2],c=Math.sin(piDouble*(.5-n)),u=Math.sin(piDouble*n)),i.quaternion=[],a=v=0;3>=v;a=++v)i.quaternion[a]=h[a]*c+p[a]*u}else i.quaternion=s.quaternion;return i},t.prototype.format=function(){return this.toMatrix().toString()},t.prototype.toMatrix=function(){var t,e,n,r,o,i,s,a,l,f,h,p,c,m,d,g;for(t=this,o=u.I(4),e=c=0;3>=c;e=++c)o.els[e][3]=t.perspective[e];for(i=t.quaternion,f=i[0],h=i[1],p=i[2],l=i[3],s=t.skew,r=[[1,0],[2,0],[2,1]],e=m=2;m>=0;e=--m)s[e]&&(a=u.I(4),a.els[r[e][0]][r[e][1]]=s[e],o=o.multiply(a));for(o=o.multiply(new u([[1-2*(h*h+p*p),2*(f*h-p*l),2*(f*p+h*l),0],[2*(f*h+p*l),1-2*(f*f+p*p),2*(h*p-f*l),0],[2*(f*p-h*l),2*(h*p+f*l),1-2*(f*f+h*h),0],[0,0,0,1]])),e=d=0;2>=d;e=++d){for(n=g=0;2>=g;n=++g)o.els[e][n]*=t.scale[e];o.els[3][e]=t.translate[e]}return o},t}(),u=function(){function t(t){this.els=t,this.toString=re(this.toString,this),this.decompose=re(this.decompose,this),this.inverse=re(this.inverse,this),this.augment=re(this.augment,this),this.toRightTriangular=re(this.toRightTriangular,this),this.transpose=re(this.transpose,this),this.multiply=re(this.multiply,this),this.dup=re(this.dup,this),this.e=re(this.e,this)}return t.prototype.e=function(t,e){return 1>t||t>this.els.length||1>e||e>this.els[0].length?null:this.els[t-1][e-1]},t.prototype.dup=function(){return new t(this.els)},t.prototype.multiply=function(e){var n,r,o,i,s,a,u,l,f,h,p,c,m;for(c=e.modulus?!0:!1,n=e.els||e,"undefined"==typeof n[0][0]&&(n=new t(n).els),h=this.els.length,u=h,l=n[0].length,o=this.els[0].length,i=[],h+=1;--h;)for(s=u-h,i[s]=[],p=l,p+=1;--p;){for(a=l-p,m=0,f=o,f+=1;--f;)r=o-f,m+=this.els[s][r]*n[r][a];i[s][a]=m}return n=new t(i),c?n.col(1):n},t.prototype.transpose=function(){var e,n,r,o,i,s,a;for(a=this.els.length,e=this.els[0].length,n=[],i=e,i+=1;--i;)for(r=e-i,n[r]=[],s=a,s+=1;--s;)o=a-s,n[r][o]=this.els[o][r];return new t(n)},t.prototype.toRightTriangular=function(){var t,e,n,r,o,i,s,a,u,l,f,h,p,c;for(t=this.dup(),a=this.els.length,o=a,i=this.els[0].length;--a;){if(n=o-a,0===t.els[n][n])for(r=f=p=n+1;o>=p?o>f:f>o;r=o>=p?++f:--f)if(0!==t.els[r][n]){for(e=[],u=i,u+=1;--u;)l=i-u,e.push(t.els[n][l]+t.els[r][l]);t.els[n]=e;break}if(0!==t.els[n][n])for(r=h=c=n+1;o>=c?o>h:h>o;r=o>=c?++h:--h){for(s=t.els[r][n]/t.els[n][n],e=[],u=i,u+=1;--u;)l=i-u,e.push(n>=l?0:t.els[r][l]-t.els[n][l]*s);t.els[r]=e}}return t},t.prototype.augment=function(e){var n,r,o,i,s,a,u,l,f;if(n=e.els||e,"undefined"==typeof n[0][0]&&(n=new t(n).els),r=this.dup(),o=r.els[0].length,l=r.els.length,a=l,u=n[0].length,l!==n.length)return null;for(l+=1;--l;)for(i=a-l,f=u,f+=1;--f;)s=u-f,r.els[i][o+s]=n[i][s];return r},t.prototype.inverse=function(){var e,n,r,o,i,s,a,u,l,f,h,p,c;for(f=this.els.length,a=f,e=this.augment(t.I(f)).toRightTriangular(),u=e.els[0].length,i=[],f+=1;--f;){for(o=f-1,r=[],h=u,i[o]=[],n=e.els[o][o],h+=1;--h;)p=u-h,l=e.els[o][p]/n,r.push(l),p>=a&&i[o].push(l);for(e.els[o]=r,s=c=0;o>=0?o>c:c>o;s=o>=0?++c:--c){for(r=[],h=u,h+=1;--h;)p=u-h,r.push(e.els[s][p]-e.els[o][p]*e.els[s][o]);e.els[s]=r}}return new t(i)},t.I=function(e){var n,r,o,i,s;for(n=[],i=e,e+=1;--e;)for(r=i-e,n[r]=[],s=i,s+=1;--s;)o=i-s,n[r][o]=r===o?1:0;return new t(n)},t.prototype.decompose=function(){var t,n,r,o,i,s,a,u,l,f,p,c,m,d,g,y,v,b,w,x,M,S,k,T,C,H,R,q,X,I,Y,j,z,F,G,A,O,V;for(s=this,x=[],v=[],b=[],f=[],u=[],t=[],n=X=0;3>=X;n=++X)for(t[n]=[],o=I=0;3>=I;o=++I)t[n][o]=s.els[n][o];if(0===t[3][3])return!1;for(n=Y=0;3>=Y;n=++Y)for(o=j=0;3>=j;o=++j)t[n][o]/=t[3][3];for(l=s.dup(),n=z=0;2>=z;n=++z)l.els[n][3]=0;if(l.els[3][3]=1,0!==t[0][3]||0!==t[1][3]||0!==t[2][3]){for(c=new h(t.slice(0,4)[3]),r=l.inverse(),M=r.transpose(),u=M.multiply(c).els,n=F=0;2>=F;n=++F)t[n][3]=0;t[3][3]=1}else u=[0,0,0,1];for(n=G=0;2>=G;n=++G)x[n]=t[3][n],t[3][n]=0;for(d=[],n=A=0;2>=A;n=++A)d[n]=new h(t[n].slice(0,3));if(v[0]=d[0].length(),d[0]=d[0].normalize(),b[0]=d[0].dot(d[1]),d[1]=d[1].combine(d[0],1,-b[0]),v[1]=d[1].length(),d[1]=d[1].normalize(),b[0]/=v[1],b[1]=d[0].dot(d[2]),d[2]=d[2].combine(d[0],1,-b[1]),b[2]=d[1].dot(d[2]),d[2]=d[2].combine(d[1],1,-b[2]),v[2]=d[2].length(),d[2]=d[2].normalize(),b[1]/=v[2],b[2]/=v[2],a=d[1].cross(d[2]),d[0].dot(a)<0)for(n=O=0;2>=O;n=++O)for(v[n]*=-1,o=V=0;2>=V;o=++V)d[n].els[o]*=-1;g=function(t,e){return d[t].els[e]},m=[],m[1]=Math.asin(-g(0,2)),0!==Math.cos(m[1])?(m[0]=Math.atan2(g(1,2),g(2,2)),m[2]=Math.atan2(g(0,1),g(0,0))):(m[0]=Math.atan2(-g(2,0),g(1,1)),m[1]=0),w=g(0,0)+g(1,1)+g(2,2)+1,w>1e-4?(y=.5/Math.sqrt(w),C=.25/y,H=(g(2,1)-g(1,2))*y,R=(g(0,2)-g(2,0))*y,q=(g(1,0)-g(0,1))*y):g(0,0)>g(1,1)&&g(0,0)>g(2,2)?(y=2*Math.sqrt(1+g(0,0)-g(1,1)-g(2,2)),H=.25*y,R=(g(0,1)+g(1,0))/y,q=(g(0,2)+g(2,0))/y,C=(g(2,1)-g(1,2))/y):g(1,1)>g(2,2)?(y=2*Math.sqrt(1+g(1,1)-g(0,0)-g(2,2)),H=(g(0,1)+g(1,0))/y,R=.25*y,q=(g(1,2)+g(2,1))/y,C=(g(0,2)-g(2,0))/y):(y=2*Math.sqrt(1+g(2,2)-g(0,0)-g(1,1)),H=(g(0,2)+g(2,0))/y,R=(g(1,2)+g(2,1))/y,q=.25*y,C=(g(1,0)-g(0,1))/y),f=[H,R,q,C],p=new e,p.translate=x,p.scale=v,p.skew=b,p.quaternion=f,p.perspective=u,p.rotate=m;for(k in p){S=p[k];for(i in S)T=S[i],isNaN(T)&&(S[i]=0)}return p},t.prototype.toString=function(){var t,e,n,r,o;for(n="matrix3d(",t=r=0;3>=r;t=++r)for(e=o=0;3>=o;e=++o)n+=Z(this.els[t][e],10),(3!==t||3!==e)&&(n+=",");return n+=")"},t.matrixForTransform=w(function(t){var e,n,r,o,i,s;return e=document.createElement("div"),e.style.position="absolute",e.style.visibility="hidden",e.style[A("transform")]=t,document.body.appendChild(e),r=window.getComputedStyle(e,null),n=null!=(o=null!=(i=r.transform)?i:r[A("transform")])?o:null!=(s=C.tests)?s.matrixForTransform(t):void 0,document.body.removeChild(e),n}),t.fromTransform=function(e){var n,r,o,i,s,a;for(i=null!=e?e.match(/matrix3?d?\(([-0-9,e \.]*)\)/):void 0,i?(n=i[1].split(","),n=n.map(parseFloat),r=6===n.length?[n[0],n[1],0,0,n[2],n[3],0,0,0,0,1,0,n[4],n[5],0,1]:n):r=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],s=[],o=a=0;3>=a;o=++a)s.push(r.slice(4*o,4*o+4));return new t(s)},t}(),G=w(function(t){var e,n,r,o,i,s,a,u,l,f;if(void 0!==document.body.style[t])return"";for(o=t.split("-"),i="",s=0,u=o.length;u>s;s++)r=o[s],i+=r.substring(0,1).toUpperCase()+r.substring(1);for(f=["Webkit","Moz","ms"],a=0,l=f.length;l>a;a++)if(n=f[a],e=n+i,void 0!==document.body.style[e])return n;return""}),A=w(function(t){var e;return e=G(t),"Moz"===e?""+e+(t.substring(0,1).toUpperCase()+t.substring(1)):""!==e?"-"+e.toLowerCase()+"-"+_(t):_(t)}),V="undefined"!=typeof window&&null!==window?window.requestAnimationFrame:void 0,m=[],d=[],W=!1,N=1,"undefined"!=typeof window&&null!==window&&window.addEventListener("keyup",function(t){return 68===t.keyCode&&t.shiftKey&&t.ctrlKey?C.toggleSlow():void 0}),null==V&&(I=0,V=function(t){var e,n,r;return e=Date.now(),r=Math.max(0,16-(e-I)),n=window.setTimeout(function(){return t(e+r)},r),I=e+r,n}),L=!1,E=!1,B=function(){return L?void 0:(L=!0,V(D))},D=function(t){var e,n,r,o;if(E)return void V(D);for(n=[],r=0,o=m.length;o>r;r++)e=m[r],c(t,e)||n.push(e);return m=m.filter(function(t){return-1===n.indexOf(t)}),0===m.length?L=!1:V(D)},c=function(t,e){var n,r,o,i,s,a,u,l;if(null==e.tStart&&(e.tStart=t),i=(t-e.tStart)/e.options.duration,s=e.curve(i),r={},i>=1)r=e.curve.returnsToSelf?e.properties.start:e.properties.end;else{l=e.properties.start;for(n in l)o=l[n],r[n]=R(o,e.properties.end[n],s)}return y(e.el,r),"function"==typeof(a=e.options).change&&a.change(e.el),i>=1&&"function"==typeof(u=e.options).complete&&u.complete(e.el),1>i},R=function(t,e,n){return null!=t&&null!=t.interpolate?t.interpolate(e,n):null},$=function(t,e,n,r){var o,s,f,h,p,c,g,y;if(null!=r&&(d=d.filter(function(t){return t.id!==r})),C.stop(t,{timeout:!1}),!n.animated)return C.css(t,e),void("function"==typeof n.complete&&n.complete(this));e=F(e),c=H(t,Object.keys(e)),o={},g=[];for(h in e)y=e[h],null!=t.style&&te.contains(h)?g.push([h,y]):(s=S(y),s instanceof i&&null!=t.style&&(s=new a([s,ne(h,0)])),o[h]=s);return g.length>0&&(f=X(t),f?(p=new l,p.applyProperties(g)):(y=g.map(function(t){return ee(t[0],t[1])}).join(" "),p=u.fromTransform(u.matrixForTransform(y))),o.transform=p.decompose(),f&&c.transform.applyRotateCenter([o.transform.props.rotate[1],o.transform.props.rotate[2]])),m.push({el:t,properties:{start:c,end:o},options:n,curve:n.type.call(n.type,n)}),B()},Q=[],J=0,P=function(t){return q()?t.realTimeoutId=setTimeout(function(){return t.fn(),x(t.id)},t.delay):void 0},p=function(t,e){var n;return J+=1,n={id:J,tStart:Date.now(),fn:t,delay:e,originalDelay:e},P(n),Q.push(n),J},x=function(t){return Q=Q.filter(function(e){return e.id===t&&clearTimeout(e.realTimeoutId),e.id!==t})},Y=function(t,e){var n;return null!=t?(n=t-e.tStart,e.originalDelay-n):e.originalDelay},"undefined"!=typeof window&&null!==window&&window.addEventListener("unload",function(){}),K=null,z(function(t){var e,n,r,o,i,s,a,u,l,f;if(E=!t,t){if(L)for(n=Date.now()-K,i=0,u=m.length;u>i;i++)e=m[i],null!=e.tStart&&(e.tStart+=n);for(s=0,l=Q.length;l>s;s++)r=Q[s],r.delay=Y(K,r),P(r);return K=null}for(K=Date.now(),f=[],o=0,a=Q.length;a>o;o++)r=Q[o],f.push(clearTimeout(r.realTimeoutId));return f}),C={},C.linear=function(){return function(t){return t}},C.spring=function(t){var e,n,r,o,i,s;return null==t&&(t={}),g(t,C.spring.defaults),o=Math.max(1,t.frequency/20),i=Math.pow(20,t.friction/100),s=t.anticipationSize/1e3,r=Math.max(0,s),e=function(e){var n,r,o,i,a;return n=.8,i=s/(1-s),a=0,o=(i-n*a)/(i-a),r=(n-o)/i,r*e*t.anticipationStrength/100+o},n=function(t){return Math.pow(i/10,-t)*(1-t)},function(t){var r,i,a,u,l,f,h,p;return f=t/(1-s)-s/(1-s),s>t?(p=s/(1-s)-s/(1-s),h=0/(1-s)-s/(1-s),l=Math.acos(1/e(p)),a=(Math.acos(1/e(h))-l)/(o*-s),r=e):(r=n,l=0,a=1),i=r(f),u=o*(t-s)*a+l,1-i*Math.cos(u)}},C.bounce=function(t){var e,n,r,o;return null==t&&(t={}),g(t,C.bounce.defaults),r=Math.max(1,t.frequency/20),o=Math.pow(20,t.friction/100),e=function(t){return Math.pow(o/10,-t)*(1-t)},n=function(t){var n,o,i,s;return s=-1.57,o=1,n=e(t),i=r*t*o+s,n*Math.cos(i)},n.returnsToSelf=!0,n},C.gravity=function(t){var e,n,r,o,i,s,a;return null==t&&(t={}),g(t,C.gravity.defaults),n=Math.min(t.bounciness/1250,.8),o=t.elasticity/1e3,a=100,r=[],e=function(){var r,o;for(r=Math.sqrt(2/a),o={a:-r,b:r,H:1},t.returnsToSelf&&(o.a=0,o.b=2*o.b);o.H>.001;)e=o.b-o.a,o={a:o.b,b:o.b+e*n,H:o.H*n*n};return o.b}(),s=function(n,r,o,i){var s,a;return e=r-n,a=2/e*i-1-2*n/e,s=a*a*o-o+1,t.returnsToSelf&&(s=1-s),s},function(){var i,s,u,l;for(s=Math.sqrt(2/(a*e*e)),u={a:-s,b:s,H:1},t.returnsToSelf&&(u.a=0,u.b=2*u.b),r.push(u),i=e,l=[];u.b<1&&u.H>.001;)i=u.b-u.a,u={a:u.b,b:u.b+i*n,H:u.H*o},l.push(r.push(u));return l}(),i=function(e){var n,o,i;for(o=0,n=r[o];!(e>=n.a&&e<=n.b)&&(o+=1,n=r[o]););return i=n?s(n.a,n.b,n.H,e):t.returnsToSelf?0:1},i.returnsToSelf=t.returnsToSelf,i},C.forceWithGravity=function(t){return null==t&&(t={}),g(t,C.forceWithGravity.defaults),t.returnsToSelf=!0,C.gravity(t)},C.bezier=function(){var t,e,n;return e=function(t,e,n,r,o){return Math.pow(1-t,3)*e+3*Math.pow(1-t,2)*t*n+3*(1-t)*Math.pow(t,2)*r+Math.pow(t,3)*o},t=function(t,n,r,o,i){return{x:e(t,n.x,r.x,o.x,i.x),y:e(t,n.y,r.y,o.y,i.y)}},n=function(t,e,n){var r,o,i,s,a,u,l,f,h,p;for(r=null,h=0,p=e.length;p>h&&(o=e[h],t>=o(0).x&&t<=o(1).x&&(r=o),null===r);h++);if(!r)return n?0:1;for(f=1e-4,s=0,u=1,a=(u+s)/2,l=r(a).x,i=0;Math.abs(t-l)>f&&100>i;)t>l?s=a:u=a,a=(u+s)/2,l=r(a).x,i+=1;return r(a).y},function(e){var r,o,i;return null==e&&(e={}),i=e.points,r=function(){var e,n,o;r=[],o=function(e,n){var o;return o=function(r){return t(r,e,e.cp[e.cp.length-1],n.cp[0],n)},r.push(o)};for(e in i){if(n=parseInt(e),n>=i.length-1)break;o(i[n],i[n+1])}return r}(),o=function(t){return 0===t?0:1===t?1:n(t,r,this.returnsToSelf)},o.returnsToSelf=0===i[i.length-1].y,o}}(),C.easeInOut=function(t){var e,n;return null==t&&(t={}),e=null!=(n=t.friction)?n:C.easeInOut.defaults.friction,C.bezier({points:[{x:0,y:0,cp:[{x:.92-e/1e3,y:0}]},{x:1,y:1,cp:[{x:.08+e/1e3,y:1}]}]})},C.easeIn=function(t){var e,n;return null==t&&(t={}),e=null!=(n=t.friction)?n:C.easeIn.defaults.friction,C.bezier({points:[{x:0,y:0,cp:[{x:.92-e/1e3,y:0}]},{x:1,y:1,cp:[{x:1,y:1}]}]})},C.easeOut=function(t){var e,n;return null==t&&(t={}),e=null!=(n=t.friction)?n:C.easeOut.defaults.friction,C.bezier({points:[{x:0,y:0,cp:[{x:0,y:0}]},{x:1,y:1,cp:[{x:.08+e/1e3,y:1}]}]})},C.spring.defaults={frequency:300,friction:200,anticipationSize:0,anticipationStrength:0},C.bounce.defaults={frequency:300,friction:200},C.forceWithGravity.defaults=C.gravity.defaults={bounciness:400,elasticity:200},C.easeInOut.defaults=C.easeIn.defaults=C.easeOut.defaults={friction:500},C.css=j(function(t,e){return v(t,e,!0)}),C.animate=j(function(t,e,n){var r;return null==n&&(n={}),n=M(n),g(n,{type:C.easeInOut,duration:1e3,delay:0,animated:!0}),n.duration=Math.max(0,n.duration*N),n.delay=Math.max(0,n.delay),0===n.delay?$(t,e,n):(r=C.setTimeout(function(){return $(t,e,n,r)},n.delay),d.push({id:r,el:t}))}),C.stop=j(function(t,e){return null==e&&(e={}),null==e.timeout&&(e.timeout=!0),e.timeout&&(d=d.filter(function(n){return n.el!==t||null!=e.filter&&!e.filter(n)?!0:(C.clearTimeout(n.id),!1)})),m=m.filter(function(e){return e.el!==t})}),C.setTimeout=function(t,e){return p(t,e*N)},C.clearTimeout=function(t){return x(t)},C.toggleSlow=function(){return W=!W,N=W?3:1,"undefined"!=typeof console&&null!==console&&"function"==typeof console.log?console.log("dynamics.js: slow animations "+(W?"enabled":"disabled")):void 0},"object"==typeof module&&"object"==typeof module.exports?module.exports=C:"function"==typeof define?define("dynamics",function(){return C}):window.dynamics=C}).call(this);

//	imagesloaded

/*!
 * imagesLoaded PACKAGED v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

(function(){function e(){}function t(e,t){for(var n=e.length;n--;)if(e[n].listener===t)return n;return-1}function n(e){return function(){return this[e].apply(this,arguments)}}var i=e.prototype,r=this,o=r.EventEmitter;i.getListeners=function(e){var t,n,i=this._getEvents();if("object"==typeof e){t={};for(n in i)i.hasOwnProperty(n)&&e.test(n)&&(t[n]=i[n])}else t=i[e]||(i[e]=[]);return t},i.flattenListeners=function(e){var t,n=[];for(t=0;e.length>t;t+=1)n.push(e[t].listener);return n},i.getListenersAsObject=function(e){var t,n=this.getListeners(e);return n instanceof Array&&(t={},t[e]=n),t||n},i.addListener=function(e,n){var i,r=this.getListenersAsObject(e),o="object"==typeof n;for(i in r)r.hasOwnProperty(i)&&-1===t(r[i],n)&&r[i].push(o?n:{listener:n,once:!1});return this},i.on=n("addListener"),i.addOnceListener=function(e,t){return this.addListener(e,{listener:t,once:!0})},i.once=n("addOnceListener"),i.defineEvent=function(e){return this.getListeners(e),this},i.defineEvents=function(e){for(var t=0;e.length>t;t+=1)this.defineEvent(e[t]);return this},i.removeListener=function(e,n){var i,r,o=this.getListenersAsObject(e);for(r in o)o.hasOwnProperty(r)&&(i=t(o[r],n),-1!==i&&o[r].splice(i,1));return this},i.off=n("removeListener"),i.addListeners=function(e,t){return this.manipulateListeners(!1,e,t)},i.removeListeners=function(e,t){return this.manipulateListeners(!0,e,t)},i.manipulateListeners=function(e,t,n){var i,r,o=e?this.removeListener:this.addListener,s=e?this.removeListeners:this.addListeners;if("object"!=typeof t||t instanceof RegExp)for(i=n.length;i--;)o.call(this,t,n[i]);else for(i in t)t.hasOwnProperty(i)&&(r=t[i])&&("function"==typeof r?o.call(this,i,r):s.call(this,i,r));return this},i.removeEvent=function(e){var t,n=typeof e,i=this._getEvents();if("string"===n)delete i[e];else if("object"===n)for(t in i)i.hasOwnProperty(t)&&e.test(t)&&delete i[t];else delete this._events;return this},i.removeAllListeners=n("removeEvent"),i.emitEvent=function(e,t){var n,i,r,o,s=this.getListenersAsObject(e);for(r in s)if(s.hasOwnProperty(r))for(i=s[r].length;i--;)n=s[r][i],n.once===!0&&this.removeListener(e,n.listener),o=n.listener.apply(this,t||[]),o===this._getOnceReturnValue()&&this.removeListener(e,n.listener);return this},i.trigger=n("emitEvent"),i.emit=function(e){var t=Array.prototype.slice.call(arguments,1);return this.emitEvent(e,t)},i.setOnceReturnValue=function(e){return this._onceReturnValue=e,this},i._getOnceReturnValue=function(){return this.hasOwnProperty("_onceReturnValue")?this._onceReturnValue:!0},i._getEvents=function(){return this._events||(this._events={})},e.noConflict=function(){return r.EventEmitter=o,e},"function"==typeof define&&define.amd?define("eventEmitter/EventEmitter",[],function(){return e}):"object"==typeof module&&module.exports?module.exports=e:this.EventEmitter=e}).call(this),function(e){function t(t){var n=e.event;return n.target=n.target||n.srcElement||t,n}var n=document.documentElement,i=function(){};n.addEventListener?i=function(e,t,n){e.addEventListener(t,n,!1)}:n.attachEvent&&(i=function(e,n,i){e[n+i]=i.handleEvent?function(){var n=t(e);i.handleEvent.call(i,n)}:function(){var n=t(e);i.call(e,n)},e.attachEvent("on"+n,e[n+i])});var r=function(){};n.removeEventListener?r=function(e,t,n){e.removeEventListener(t,n,!1)}:n.detachEvent&&(r=function(e,t,n){e.detachEvent("on"+t,e[t+n]);try{delete e[t+n]}catch(i){e[t+n]=void 0}});var o={bind:i,unbind:r};"function"==typeof define&&define.amd?define("eventie/eventie",o):e.eventie=o}(this),function(e,t){"function"==typeof define&&define.amd?define(["eventEmitter/EventEmitter","eventie/eventie"],function(n,i){return t(e,n,i)}):"object"==typeof exports?module.exports=t(e,require("wolfy87-eventemitter"),require("eventie")):e.imagesLoaded=t(e,e.EventEmitter,e.eventie)}(window,function(e,t,n){function i(e,t){for(var n in t)e[n]=t[n];return e}function r(e){return"[object Array]"===d.call(e)}function o(e){var t=[];if(r(e))t=e;else if("number"==typeof e.length)for(var n=0,i=e.length;i>n;n++)t.push(e[n]);else t.push(e);return t}function s(e,t,n){if(!(this instanceof s))return new s(e,t);"string"==typeof e&&(e=document.querySelectorAll(e)),this.elements=o(e),this.options=i({},this.options),"function"==typeof t?n=t:i(this.options,t),n&&this.on("always",n),this.getImages(),a&&(this.jqDeferred=new a.Deferred);var r=this;setTimeout(function(){r.check()})}function f(e){this.img=e}function c(e){this.src=e,v[e]=this}var a=e.jQuery,u=e.console,h=u!==void 0,d=Object.prototype.toString;s.prototype=new t,s.prototype.options={},s.prototype.getImages=function(){this.images=[];for(var e=0,t=this.elements.length;t>e;e++){var n=this.elements[e];"IMG"===n.nodeName&&this.addImage(n);var i=n.nodeType;if(i&&(1===i||9===i||11===i))for(var r=n.querySelectorAll("img"),o=0,s=r.length;s>o;o++){var f=r[o];this.addImage(f)}}},s.prototype.addImage=function(e){var t=new f(e);this.images.push(t)},s.prototype.check=function(){function e(e,r){return t.options.debug&&h&&u.log("confirm",e,r),t.progress(e),n++,n===i&&t.complete(),!0}var t=this,n=0,i=this.images.length;if(this.hasAnyBroken=!1,!i)return this.complete(),void 0;for(var r=0;i>r;r++){var o=this.images[r];o.on("confirm",e),o.check()}},s.prototype.progress=function(e){this.hasAnyBroken=this.hasAnyBroken||!e.isLoaded;var t=this;setTimeout(function(){t.emit("progress",t,e),t.jqDeferred&&t.jqDeferred.notify&&t.jqDeferred.notify(t,e)})},s.prototype.complete=function(){var e=this.hasAnyBroken?"fail":"done";this.isComplete=!0;var t=this;setTimeout(function(){if(t.emit(e,t),t.emit("always",t),t.jqDeferred){var n=t.hasAnyBroken?"reject":"resolve";t.jqDeferred[n](t)}})},a&&(a.fn.imagesLoaded=function(e,t){var n=new s(this,e,t);return n.jqDeferred.promise(a(this))}),f.prototype=new t,f.prototype.check=function(){var e=v[this.img.src]||new c(this.img.src);if(e.isConfirmed)return this.confirm(e.isLoaded,"cached was confirmed"),void 0;if(this.img.complete&&void 0!==this.img.naturalWidth)return this.confirm(0!==this.img.naturalWidth,"naturalWidth"),void 0;var t=this;e.on("confirm",function(e,n){return t.confirm(e.isLoaded,n),!0}),e.check()},f.prototype.confirm=function(e,t){this.isLoaded=e,this.emit("confirm",this,t)};var v={};return c.prototype=new t,c.prototype.check=function(){if(!this.isChecked){var e=new Image;n.bind(e,"load",this),n.bind(e,"error",this),e.src=this.src,this.isChecked=!0}},c.prototype.handleEvent=function(e){var t="on"+e.type;this[t]&&this[t](e)},c.prototype.onload=function(e){this.confirm(!0,"onload"),this.unbindProxyEvents(e)},c.prototype.onerror=function(e){this.confirm(!1,"onerror"),this.unbindProxyEvents(e)},c.prototype.confirm=function(e,t){this.isConfirmed=!0,this.isLoaded=e,this.emit("confirm",this,t)},c.prototype.unbindProxyEvents=function(e){n.unbind(e.target,"load",this),n.unbind(e.target,"error",this)},s});

//	masonry

/*!
 * Masonry PACKAGED v3.3.2
 * Cascading grid layout library
 * http://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */

!function(a){function b(){}function c(a){function c(b){b.prototype.option||(b.prototype.option=function(b){a.isPlainObject(b)&&(this.options=a.extend(!0,this.options,b))})}function e(b,c){a.fn[b]=function(e){if("string"==typeof e){for(var g=d.call(arguments,1),h=0,i=this.length;i>h;h++){var j=this[h],k=a.data(j,b);if(k)if(a.isFunction(k[e])&&"_"!==e.charAt(0)){var l=k[e].apply(k,g);if(void 0!==l)return l}else f("no such method '"+e+"' for "+b+" instance");else f("cannot call methods on "+b+" prior to initialization; attempted to call '"+e+"'")}return this}return this.each(function(){var d=a.data(this,b);d?(d.option(e),d._init()):(d=new c(this,e),a.data(this,b,d))})}}if(a){var f="undefined"==typeof console?b:function(a){console.error(a)};return a.bridget=function(a,b){c(b),e(a,b)},a.bridget}}var d=Array.prototype.slice;"function"==typeof define&&define.amd?define("jquery-bridget/jquery.bridget",["jquery"],c):c("object"==typeof exports?require("jquery"):a.jQuery)}(window),function(a){function b(b){var c=a.event;return c.target=c.target||c.srcElement||b,c}var c=document.documentElement,d=function(){};c.addEventListener?d=function(a,b,c){a.addEventListener(b,c,!1)}:c.attachEvent&&(d=function(a,c,d){a[c+d]=d.handleEvent?function(){var c=b(a);d.handleEvent.call(d,c)}:function(){var c=b(a);d.call(a,c)},a.attachEvent("on"+c,a[c+d])});var e=function(){};c.removeEventListener?e=function(a,b,c){a.removeEventListener(b,c,!1)}:c.detachEvent&&(e=function(a,b,c){a.detachEvent("on"+b,a[b+c]);try{delete a[b+c]}catch(d){a[b+c]=void 0}});var f={bind:d,unbind:e};"function"==typeof define&&define.amd?define("eventie/eventie",f):"object"==typeof exports?module.exports=f:a.eventie=f}(window),function(){function a(){}function b(a,b){for(var c=a.length;c--;)if(a[c].listener===b)return c;return-1}function c(a){return function(){return this[a].apply(this,arguments)}}var d=a.prototype,e=this,f=e.EventEmitter;d.getListeners=function(a){var b,c,d=this._getEvents();if(a instanceof RegExp){b={};for(c in d)d.hasOwnProperty(c)&&a.test(c)&&(b[c]=d[c])}else b=d[a]||(d[a]=[]);return b},d.flattenListeners=function(a){var b,c=[];for(b=0;b<a.length;b+=1)c.push(a[b].listener);return c},d.getListenersAsObject=function(a){var b,c=this.getListeners(a);return c instanceof Array&&(b={},b[a]=c),b||c},d.addListener=function(a,c){var d,e=this.getListenersAsObject(a),f="object"==typeof c;for(d in e)e.hasOwnProperty(d)&&-1===b(e[d],c)&&e[d].push(f?c:{listener:c,once:!1});return this},d.on=c("addListener"),d.addOnceListener=function(a,b){return this.addListener(a,{listener:b,once:!0})},d.once=c("addOnceListener"),d.defineEvent=function(a){return this.getListeners(a),this},d.defineEvents=function(a){for(var b=0;b<a.length;b+=1)this.defineEvent(a[b]);return this},d.removeListener=function(a,c){var d,e,f=this.getListenersAsObject(a);for(e in f)f.hasOwnProperty(e)&&(d=b(f[e],c),-1!==d&&f[e].splice(d,1));return this},d.off=c("removeListener"),d.addListeners=function(a,b){return this.manipulateListeners(!1,a,b)},d.removeListeners=function(a,b){return this.manipulateListeners(!0,a,b)},d.manipulateListeners=function(a,b,c){var d,e,f=a?this.removeListener:this.addListener,g=a?this.removeListeners:this.addListeners;if("object"!=typeof b||b instanceof RegExp)for(d=c.length;d--;)f.call(this,b,c[d]);else for(d in b)b.hasOwnProperty(d)&&(e=b[d])&&("function"==typeof e?f.call(this,d,e):g.call(this,d,e));return this},d.removeEvent=function(a){var b,c=typeof a,d=this._getEvents();if("string"===c)delete d[a];else if(a instanceof RegExp)for(b in d)d.hasOwnProperty(b)&&a.test(b)&&delete d[b];else delete this._events;return this},d.removeAllListeners=c("removeEvent"),d.emitEvent=function(a,b){var c,d,e,f,g=this.getListenersAsObject(a);for(e in g)if(g.hasOwnProperty(e))for(d=g[e].length;d--;)c=g[e][d],c.once===!0&&this.removeListener(a,c.listener),f=c.listener.apply(this,b||[]),f===this._getOnceReturnValue()&&this.removeListener(a,c.listener);return this},d.trigger=c("emitEvent"),d.emit=function(a){var b=Array.prototype.slice.call(arguments,1);return this.emitEvent(a,b)},d.setOnceReturnValue=function(a){return this._onceReturnValue=a,this},d._getOnceReturnValue=function(){return this.hasOwnProperty("_onceReturnValue")?this._onceReturnValue:!0},d._getEvents=function(){return this._events||(this._events={})},a.noConflict=function(){return e.EventEmitter=f,a},"function"==typeof define&&define.amd?define("eventEmitter/EventEmitter",[],function(){return a}):"object"==typeof module&&module.exports?module.exports=a:e.EventEmitter=a}.call(this),function(a){function b(a){if(a){if("string"==typeof d[a])return a;a=a.charAt(0).toUpperCase()+a.slice(1);for(var b,e=0,f=c.length;f>e;e++)if(b=c[e]+a,"string"==typeof d[b])return b}}var c="Webkit Moz ms Ms O".split(" "),d=document.documentElement.style;"function"==typeof define&&define.amd?define("get-style-property/get-style-property",[],function(){return b}):"object"==typeof exports?module.exports=b:a.getStyleProperty=b}(window),function(a){function b(a){var b=parseFloat(a),c=-1===a.indexOf("%")&&!isNaN(b);return c&&b}function c(){}function d(){for(var a={width:0,height:0,innerWidth:0,innerHeight:0,outerWidth:0,outerHeight:0},b=0,c=g.length;c>b;b++){var d=g[b];a[d]=0}return a}function e(c){function e(){if(!m){m=!0;var d=a.getComputedStyle;if(j=function(){var a=d?function(a){return d(a,null)}:function(a){return a.currentStyle};return function(b){var c=a(b);return c||f("Style returned "+c+". Are you running this code in a hidden iframe on Firefox? See http://bit.ly/getsizebug1"),c}}(),k=c("boxSizing")){var e=document.createElement("div");e.style.width="200px",e.style.padding="1px 2px 3px 4px",e.style.borderStyle="solid",e.style.borderWidth="1px 2px 3px 4px",e.style[k]="border-box";var g=document.body||document.documentElement;g.appendChild(e);var h=j(e);l=200===b(h.width),g.removeChild(e)}}}function h(a){if(e(),"string"==typeof a&&(a=document.querySelector(a)),a&&"object"==typeof a&&a.nodeType){var c=j(a);if("none"===c.display)return d();var f={};f.width=a.offsetWidth,f.height=a.offsetHeight;for(var h=f.isBorderBox=!(!k||!c[k]||"border-box"!==c[k]),m=0,n=g.length;n>m;m++){var o=g[m],p=c[o];p=i(a,p);var q=parseFloat(p);f[o]=isNaN(q)?0:q}var r=f.paddingLeft+f.paddingRight,s=f.paddingTop+f.paddingBottom,t=f.marginLeft+f.marginRight,u=f.marginTop+f.marginBottom,v=f.borderLeftWidth+f.borderRightWidth,w=f.borderTopWidth+f.borderBottomWidth,x=h&&l,y=b(c.width);y!==!1&&(f.width=y+(x?0:r+v));var z=b(c.height);return z!==!1&&(f.height=z+(x?0:s+w)),f.innerWidth=f.width-(r+v),f.innerHeight=f.height-(s+w),f.outerWidth=f.width+t,f.outerHeight=f.height+u,f}}function i(b,c){if(a.getComputedStyle||-1===c.indexOf("%"))return c;var d=b.style,e=d.left,f=b.runtimeStyle,g=f&&f.left;return g&&(f.left=b.currentStyle.left),d.left=c,c=d.pixelLeft,d.left=e,g&&(f.left=g),c}var j,k,l,m=!1;return h}var f="undefined"==typeof console?c:function(a){console.error(a)},g=["paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginRight","marginTop","marginBottom","borderLeftWidth","borderRightWidth","borderTopWidth","borderBottomWidth"];"function"==typeof define&&define.amd?define("get-size/get-size",["get-style-property/get-style-property"],e):"object"==typeof exports?module.exports=e(require("desandro-get-style-property")):a.getSize=e(a.getStyleProperty)}(window),function(a){function b(a){"function"==typeof a&&(b.isReady?a():g.push(a))}function c(a){var c="readystatechange"===a.type&&"complete"!==f.readyState;b.isReady||c||d()}function d(){b.isReady=!0;for(var a=0,c=g.length;c>a;a++){var d=g[a];d()}}function e(e){return"complete"===f.readyState?d():(e.bind(f,"DOMContentLoaded",c),e.bind(f,"readystatechange",c),e.bind(a,"load",c)),b}var f=a.document,g=[];b.isReady=!1,"function"==typeof define&&define.amd?define("doc-ready/doc-ready",["eventie/eventie"],e):"object"==typeof exports?module.exports=e(require("eventie")):a.docReady=e(a.eventie)}(window),function(a){function b(a,b){return a[g](b)}function c(a){if(!a.parentNode){var b=document.createDocumentFragment();b.appendChild(a)}}function d(a,b){c(a);for(var d=a.parentNode.querySelectorAll(b),e=0,f=d.length;f>e;e++)if(d[e]===a)return!0;return!1}function e(a,d){return c(a),b(a,d)}var f,g=function(){if(a.matches)return"matches";if(a.matchesSelector)return"matchesSelector";for(var b=["webkit","moz","ms","o"],c=0,d=b.length;d>c;c++){var e=b[c],f=e+"MatchesSelector";if(a[f])return f}}();if(g){var h=document.createElement("div"),i=b(h,"div");f=i?b:e}else f=d;"function"==typeof define&&define.amd?define("matches-selector/matches-selector",[],function(){return f}):"object"==typeof exports?module.exports=f:window.matchesSelector=f}(Element.prototype),function(a,b){"function"==typeof define&&define.amd?define("fizzy-ui-utils/utils",["doc-ready/doc-ready","matches-selector/matches-selector"],function(c,d){return b(a,c,d)}):"object"==typeof exports?module.exports=b(a,require("doc-ready"),require("desandro-matches-selector")):a.fizzyUIUtils=b(a,a.docReady,a.matchesSelector)}(window,function(a,b,c){var d={};d.extend=function(a,b){for(var c in b)a[c]=b[c];return a},d.modulo=function(a,b){return(a%b+b)%b};var e=Object.prototype.toString;d.isArray=function(a){return"[object Array]"==e.call(a)},d.makeArray=function(a){var b=[];if(d.isArray(a))b=a;else if(a&&"number"==typeof a.length)for(var c=0,e=a.length;e>c;c++)b.push(a[c]);else b.push(a);return b},d.indexOf=Array.prototype.indexOf?function(a,b){return a.indexOf(b)}:function(a,b){for(var c=0,d=a.length;d>c;c++)if(a[c]===b)return c;return-1},d.removeFrom=function(a,b){var c=d.indexOf(a,b);-1!=c&&a.splice(c,1)},d.isElement="function"==typeof HTMLElement||"object"==typeof HTMLElement?function(a){return a instanceof HTMLElement}:function(a){return a&&"object"==typeof a&&1==a.nodeType&&"string"==typeof a.nodeName},d.setText=function(){function a(a,c){b=b||(void 0!==document.documentElement.textContent?"textContent":"innerText"),a[b]=c}var b;return a}(),d.getParent=function(a,b){for(;a!=document.body;)if(a=a.parentNode,c(a,b))return a},d.getQueryElement=function(a){return"string"==typeof a?document.querySelector(a):a},d.handleEvent=function(a){var b="on"+a.type;this[b]&&this[b](a)},d.filterFindElements=function(a,b){a=d.makeArray(a);for(var e=[],f=0,g=a.length;g>f;f++){var h=a[f];if(d.isElement(h))if(b){c(h,b)&&e.push(h);for(var i=h.querySelectorAll(b),j=0,k=i.length;k>j;j++)e.push(i[j])}else e.push(h)}return e},d.debounceMethod=function(a,b,c){var d=a.prototype[b],e=b+"Timeout";a.prototype[b]=function(){var a=this[e];a&&clearTimeout(a);var b=arguments,f=this;this[e]=setTimeout(function(){d.apply(f,b),delete f[e]},c||100)}},d.toDashed=function(a){return a.replace(/(.)([A-Z])/g,function(a,b,c){return b+"-"+c}).toLowerCase()};var f=a.console;return d.htmlInit=function(c,e){b(function(){for(var b=d.toDashed(e),g=document.querySelectorAll(".js-"+b),h="data-"+b+"-options",i=0,j=g.length;j>i;i++){var k,l=g[i],m=l.getAttribute(h);try{k=m&&JSON.parse(m)}catch(n){f&&f.error("Error parsing "+h+" on "+l.nodeName.toLowerCase()+(l.id?"#"+l.id:"")+": "+n);continue}var o=new c(l,k),p=a.jQuery;p&&p.data(l,e,o)}})},d}),function(a,b){"function"==typeof define&&define.amd?define("outlayer/item",["eventEmitter/EventEmitter","get-size/get-size","get-style-property/get-style-property","fizzy-ui-utils/utils"],function(c,d,e,f){return b(a,c,d,e,f)}):"object"==typeof exports?module.exports=b(a,require("wolfy87-eventemitter"),require("get-size"),require("desandro-get-style-property"),require("fizzy-ui-utils")):(a.Outlayer={},a.Outlayer.Item=b(a,a.EventEmitter,a.getSize,a.getStyleProperty,a.fizzyUIUtils))}(window,function(a,b,c,d,e){function f(a){for(var b in a)return!1;return b=null,!0}function g(a,b){a&&(this.element=a,this.layout=b,this.position={x:0,y:0},this._create())}function h(a){return a.replace(/([A-Z])/g,function(a){return"-"+a.toLowerCase()})}var i=a.getComputedStyle,j=i?function(a){return i(a,null)}:function(a){return a.currentStyle},k=d("transition"),l=d("transform"),m=k&&l,n=!!d("perspective"),o={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"otransitionend",transition:"transitionend"}[k],p=["transform","transition","transitionDuration","transitionProperty"],q=function(){for(var a={},b=0,c=p.length;c>b;b++){var e=p[b],f=d(e);f&&f!==e&&(a[e]=f)}return a}();e.extend(g.prototype,b.prototype),g.prototype._create=function(){this._transn={ingProperties:{},clean:{},onEnd:{}},this.css({position:"absolute"})},g.prototype.handleEvent=function(a){var b="on"+a.type;this[b]&&this[b](a)},g.prototype.getSize=function(){this.size=c(this.element)},g.prototype.css=function(a){var b=this.element.style;for(var c in a){var d=q[c]||c;b[d]=a[c]}},g.prototype.getPosition=function(){var a=j(this.element),b=this.layout.options,c=b.isOriginLeft,d=b.isOriginTop,e=a[c?"left":"right"],f=a[d?"top":"bottom"],g=this.layout.size,h=-1!=e.indexOf("%")?parseFloat(e)/100*g.width:parseInt(e,10),i=-1!=f.indexOf("%")?parseFloat(f)/100*g.height:parseInt(f,10);h=isNaN(h)?0:h,i=isNaN(i)?0:i,h-=c?g.paddingLeft:g.paddingRight,i-=d?g.paddingTop:g.paddingBottom,this.position.x=h,this.position.y=i},g.prototype.layoutPosition=function(){var a=this.layout.size,b=this.layout.options,c={},d=b.isOriginLeft?"paddingLeft":"paddingRight",e=b.isOriginLeft?"left":"right",f=b.isOriginLeft?"right":"left",g=this.position.x+a[d];c[e]=this.getXValue(g),c[f]="";var h=b.isOriginTop?"paddingTop":"paddingBottom",i=b.isOriginTop?"top":"bottom",j=b.isOriginTop?"bottom":"top",k=this.position.y+a[h];c[i]=this.getYValue(k),c[j]="",this.css(c),this.emitEvent("layout",[this])},g.prototype.getXValue=function(a){var b=this.layout.options;return b.percentPosition&&!b.isHorizontal?a/this.layout.size.width*100+"%":a+"px"},g.prototype.getYValue=function(a){var b=this.layout.options;return b.percentPosition&&b.isHorizontal?a/this.layout.size.height*100+"%":a+"px"},g.prototype._transitionTo=function(a,b){this.getPosition();var c=this.position.x,d=this.position.y,e=parseInt(a,10),f=parseInt(b,10),g=e===this.position.x&&f===this.position.y;if(this.setPosition(a,b),g&&!this.isTransitioning)return void this.layoutPosition();var h=a-c,i=b-d,j={};j.transform=this.getTranslate(h,i),this.transition({to:j,onTransitionEnd:{transform:this.layoutPosition},isCleaning:!0})},g.prototype.getTranslate=function(a,b){var c=this.layout.options;return a=c.isOriginLeft?a:-a,b=c.isOriginTop?b:-b,n?"translate3d("+a+"px, "+b+"px, 0)":"translate("+a+"px, "+b+"px)"},g.prototype.goTo=function(a,b){this.setPosition(a,b),this.layoutPosition()},g.prototype.moveTo=m?g.prototype._transitionTo:g.prototype.goTo,g.prototype.setPosition=function(a,b){this.position.x=parseInt(a,10),this.position.y=parseInt(b,10)},g.prototype._nonTransition=function(a){this.css(a.to),a.isCleaning&&this._removeStyles(a.to);for(var b in a.onTransitionEnd)a.onTransitionEnd[b].call(this)},g.prototype._transition=function(a){if(!parseFloat(this.layout.options.transitionDuration))return void this._nonTransition(a);var b=this._transn;for(var c in a.onTransitionEnd)b.onEnd[c]=a.onTransitionEnd[c];for(c in a.to)b.ingProperties[c]=!0,a.isCleaning&&(b.clean[c]=!0);if(a.from){this.css(a.from);var d=this.element.offsetHeight;d=null}this.enableTransition(a.to),this.css(a.to),this.isTransitioning=!0};var r="opacity,"+h(q.transform||"transform");g.prototype.enableTransition=function(){this.isTransitioning||(this.css({transitionProperty:r,transitionDuration:this.layout.options.transitionDuration}),this.element.addEventListener(o,this,!1))},g.prototype.transition=g.prototype[k?"_transition":"_nonTransition"],g.prototype.onwebkitTransitionEnd=function(a){this.ontransitionend(a)},g.prototype.onotransitionend=function(a){this.ontransitionend(a)};var s={"-webkit-transform":"transform","-moz-transform":"transform","-o-transform":"transform"};g.prototype.ontransitionend=function(a){if(a.target===this.element){var b=this._transn,c=s[a.propertyName]||a.propertyName;if(delete b.ingProperties[c],f(b.ingProperties)&&this.disableTransition(),c in b.clean&&(this.element.style[a.propertyName]="",delete b.clean[c]),c in b.onEnd){var d=b.onEnd[c];d.call(this),delete b.onEnd[c]}this.emitEvent("transitionEnd",[this])}},g.prototype.disableTransition=function(){this.removeTransitionStyles(),this.element.removeEventListener(o,this,!1),this.isTransitioning=!1},g.prototype._removeStyles=function(a){var b={};for(var c in a)b[c]="";this.css(b)};var t={transitionProperty:"",transitionDuration:""};return g.prototype.removeTransitionStyles=function(){this.css(t)},g.prototype.removeElem=function(){this.element.parentNode.removeChild(this.element),this.css({display:""}),this.emitEvent("remove",[this])},g.prototype.remove=function(){if(!k||!parseFloat(this.layout.options.transitionDuration))return void this.removeElem();var a=this;this.once("transitionEnd",function(){a.removeElem()}),this.hide()},g.prototype.reveal=function(){delete this.isHidden,this.css({display:""});var a=this.layout.options,b={},c=this.getHideRevealTransitionEndProperty("visibleStyle");b[c]=this.onRevealTransitionEnd,this.transition({from:a.hiddenStyle,to:a.visibleStyle,isCleaning:!0,onTransitionEnd:b})},g.prototype.onRevealTransitionEnd=function(){this.isHidden||this.emitEvent("reveal")},g.prototype.getHideRevealTransitionEndProperty=function(a){var b=this.layout.options[a];if(b.opacity)return"opacity";for(var c in b)return c},g.prototype.hide=function(){this.isHidden=!0,this.css({display:""});var a=this.layout.options,b={},c=this.getHideRevealTransitionEndProperty("hiddenStyle");b[c]=this.onHideTransitionEnd,this.transition({from:a.visibleStyle,to:a.hiddenStyle,isCleaning:!0,onTransitionEnd:b})},g.prototype.onHideTransitionEnd=function(){this.isHidden&&(this.css({display:"none"}),this.emitEvent("hide"))},g.prototype.destroy=function(){this.css({position:"",left:"",right:"",top:"",bottom:"",transition:"",transform:""})},g}),function(a,b){"function"==typeof define&&define.amd?define("outlayer/outlayer",["eventie/eventie","eventEmitter/EventEmitter","get-size/get-size","fizzy-ui-utils/utils","./item"],function(c,d,e,f,g){return b(a,c,d,e,f,g)}):"object"==typeof exports?module.exports=b(a,require("eventie"),require("wolfy87-eventemitter"),require("get-size"),require("fizzy-ui-utils"),require("./item")):a.Outlayer=b(a,a.eventie,a.EventEmitter,a.getSize,a.fizzyUIUtils,a.Outlayer.Item)}(window,function(a,b,c,d,e,f){function g(a,b){var c=e.getQueryElement(a);if(!c)return void(h&&h.error("Bad element for "+this.constructor.namespace+": "+(c||a)));this.element=c,i&&(this.$element=i(this.element)),this.options=e.extend({},this.constructor.defaults),this.option(b);var d=++k;this.element.outlayerGUID=d,l[d]=this,this._create(),this.options.isInitLayout&&this.layout()}var h=a.console,i=a.jQuery,j=function(){},k=0,l={};return g.namespace="outlayer",g.Item=f,g.defaults={containerStyle:{position:"relative"},isInitLayout:!0,isOriginLeft:!0,isOriginTop:!0,isResizeBound:!0,isResizingContainer:!0,transitionDuration:"0.4s",hiddenStyle:{opacity:0,transform:"scale(0.001)"},visibleStyle:{opacity:1,transform:"scale(1)"}},e.extend(g.prototype,c.prototype),g.prototype.option=function(a){e.extend(this.options,a)},g.prototype._create=function(){this.reloadItems(),this.stamps=[],this.stamp(this.options.stamp),e.extend(this.element.style,this.options.containerStyle),this.options.isResizeBound&&this.bindResize()},g.prototype.reloadItems=function(){this.items=this._itemize(this.element.children)},g.prototype._itemize=function(a){for(var b=this._filterFindItemElements(a),c=this.constructor.Item,d=[],e=0,f=b.length;f>e;e++){var g=b[e],h=new c(g,this);d.push(h)}return d},g.prototype._filterFindItemElements=function(a){return e.filterFindElements(a,this.options.itemSelector)},g.prototype.getItemElements=function(){for(var a=[],b=0,c=this.items.length;c>b;b++)a.push(this.items[b].element);return a},g.prototype.layout=function(){this._resetLayout(),this._manageStamps();var a=void 0!==this.options.isLayoutInstant?this.options.isLayoutInstant:!this._isLayoutInited;this.layoutItems(this.items,a),this._isLayoutInited=!0},g.prototype._init=g.prototype.layout,g.prototype._resetLayout=function(){this.getSize()},g.prototype.getSize=function(){this.size=d(this.element)},g.prototype._getMeasurement=function(a,b){var c,f=this.options[a];f?("string"==typeof f?c=this.element.querySelector(f):e.isElement(f)&&(c=f),this[a]=c?d(c)[b]:f):this[a]=0},g.prototype.layoutItems=function(a,b){a=this._getItemsForLayout(a),this._layoutItems(a,b),this._postLayout()},g.prototype._getItemsForLayout=function(a){for(var b=[],c=0,d=a.length;d>c;c++){var e=a[c];e.isIgnored||b.push(e)}return b},g.prototype._layoutItems=function(a,b){if(this._emitCompleteOnItems("layout",a),a&&a.length){for(var c=[],d=0,e=a.length;e>d;d++){var f=a[d],g=this._getItemLayoutPosition(f);g.item=f,g.isInstant=b||f.isLayoutInstant,c.push(g)}this._processLayoutQueue(c)}},g.prototype._getItemLayoutPosition=function(){return{x:0,y:0}},g.prototype._processLayoutQueue=function(a){for(var b=0,c=a.length;c>b;b++){var d=a[b];this._positionItem(d.item,d.x,d.y,d.isInstant)}},g.prototype._positionItem=function(a,b,c,d){d?a.goTo(b,c):a.moveTo(b,c)},g.prototype._postLayout=function(){this.resizeContainer()},g.prototype.resizeContainer=function(){if(this.options.isResizingContainer){var a=this._getContainerSize();a&&(this._setContainerMeasure(a.width,!0),this._setContainerMeasure(a.height,!1))}},g.prototype._getContainerSize=j,g.prototype._setContainerMeasure=function(a,b){if(void 0!==a){var c=this.size;c.isBorderBox&&(a+=b?c.paddingLeft+c.paddingRight+c.borderLeftWidth+c.borderRightWidth:c.paddingBottom+c.paddingTop+c.borderTopWidth+c.borderBottomWidth),a=Math.max(a,0),this.element.style[b?"width":"height"]=a+"px"}},g.prototype._emitCompleteOnItems=function(a,b){function c(){e.dispatchEvent(a+"Complete",null,[b])}function d(){g++,g===f&&c()}var e=this,f=b.length;if(!b||!f)return void c();for(var g=0,h=0,i=b.length;i>h;h++){var j=b[h];j.once(a,d)}},g.prototype.dispatchEvent=function(a,b,c){var d=b?[b].concat(c):c;if(this.emitEvent(a,d),i)if(this.$element=this.$element||i(this.element),b){var e=i.Event(b);e.type=a,this.$element.trigger(e,c)}else this.$element.trigger(a,c)},g.prototype.ignore=function(a){var b=this.getItem(a);b&&(b.isIgnored=!0)},g.prototype.unignore=function(a){var b=this.getItem(a);b&&delete b.isIgnored},g.prototype.stamp=function(a){if(a=this._find(a)){this.stamps=this.stamps.concat(a);for(var b=0,c=a.length;c>b;b++){var d=a[b];this.ignore(d)}}},g.prototype.unstamp=function(a){if(a=this._find(a))for(var b=0,c=a.length;c>b;b++){var d=a[b];e.removeFrom(this.stamps,d),this.unignore(d)}},g.prototype._find=function(a){return a?("string"==typeof a&&(a=this.element.querySelectorAll(a)),a=e.makeArray(a)):void 0},g.prototype._manageStamps=function(){if(this.stamps&&this.stamps.length){this._getBoundingRect();for(var a=0,b=this.stamps.length;b>a;a++){var c=this.stamps[a];this._manageStamp(c)}}},g.prototype._getBoundingRect=function(){var a=this.element.getBoundingClientRect(),b=this.size;this._boundingRect={left:a.left+b.paddingLeft+b.borderLeftWidth,top:a.top+b.paddingTop+b.borderTopWidth,right:a.right-(b.paddingRight+b.borderRightWidth),bottom:a.bottom-(b.paddingBottom+b.borderBottomWidth)}},g.prototype._manageStamp=j,g.prototype._getElementOffset=function(a){var b=a.getBoundingClientRect(),c=this._boundingRect,e=d(a),f={left:b.left-c.left-e.marginLeft,top:b.top-c.top-e.marginTop,right:c.right-b.right-e.marginRight,bottom:c.bottom-b.bottom-e.marginBottom};return f},g.prototype.handleEvent=function(a){var b="on"+a.type;this[b]&&this[b](a)},g.prototype.bindResize=function(){this.isResizeBound||(b.bind(a,"resize",this),this.isResizeBound=!0)},g.prototype.unbindResize=function(){this.isResizeBound&&b.unbind(a,"resize",this),this.isResizeBound=!1},g.prototype.onresize=function(){function a(){b.resize(),delete b.resizeTimeout}this.resizeTimeout&&clearTimeout(this.resizeTimeout);var b=this;this.resizeTimeout=setTimeout(a,100)},g.prototype.resize=function(){this.isResizeBound&&this.needsResizeLayout()&&this.layout()},g.prototype.needsResizeLayout=function(){var a=d(this.element),b=this.size&&a;return b&&a.innerWidth!==this.size.innerWidth},g.prototype.addItems=function(a){var b=this._itemize(a);return b.length&&(this.items=this.items.concat(b)),b},g.prototype.appended=function(a){var b=this.addItems(a);b.length&&(this.layoutItems(b,!0),this.reveal(b))},g.prototype.prepended=function(a){var b=this._itemize(a);if(b.length){var c=this.items.slice(0);this.items=b.concat(c),this._resetLayout(),this._manageStamps(),this.layoutItems(b,!0),this.reveal(b),this.layoutItems(c)}},g.prototype.reveal=function(a){this._emitCompleteOnItems("reveal",a);for(var b=a&&a.length,c=0;b&&b>c;c++){var d=a[c];d.reveal()}},g.prototype.hide=function(a){this._emitCompleteOnItems("hide",a);for(var b=a&&a.length,c=0;b&&b>c;c++){var d=a[c];d.hide()}},g.prototype.revealItemElements=function(a){var b=this.getItems(a);this.reveal(b)},g.prototype.hideItemElements=function(a){var b=this.getItems(a);this.hide(b)},g.prototype.getItem=function(a){for(var b=0,c=this.items.length;c>b;b++){var d=this.items[b];if(d.element===a)return d}},g.prototype.getItems=function(a){a=e.makeArray(a);for(var b=[],c=0,d=a.length;d>c;c++){var f=a[c],g=this.getItem(f);g&&b.push(g)}return b},g.prototype.remove=function(a){var b=this.getItems(a);if(this._emitCompleteOnItems("remove",b),b&&b.length)for(var c=0,d=b.length;d>c;c++){var f=b[c];f.remove(),e.removeFrom(this.items,f)}},g.prototype.destroy=function(){var a=this.element.style;a.height="",a.position="",a.width="";for(var b=0,c=this.items.length;c>b;b++){var d=this.items[b];d.destroy()}this.unbindResize();var e=this.element.outlayerGUID;delete l[e],delete this.element.outlayerGUID,i&&i.removeData(this.element,this.constructor.namespace)},g.data=function(a){a=e.getQueryElement(a);var b=a&&a.outlayerGUID;return b&&l[b]},g.create=function(a,b){function c(){g.apply(this,arguments)}return Object.create?c.prototype=Object.create(g.prototype):e.extend(c.prototype,g.prototype),c.prototype.constructor=c,c.defaults=e.extend({},g.defaults),e.extend(c.defaults,b),c.prototype.settings={},c.namespace=a,c.data=g.data,c.Item=function(){f.apply(this,arguments)},c.Item.prototype=new f,e.htmlInit(c,a),i&&i.bridget&&i.bridget(a,c),c},g.Item=f,g}),function(a,b){"function"==typeof define&&define.amd?define(["outlayer/outlayer","get-size/get-size","fizzy-ui-utils/utils"],b):"object"==typeof exports?module.exports=b(require("outlayer"),require("get-size"),require("fizzy-ui-utils")):a.Masonry=b(a.Outlayer,a.getSize,a.fizzyUIUtils)}(window,function(a,b,c){var d=a.create("masonry");return d.prototype._resetLayout=function(){this.getSize(),this._getMeasurement("columnWidth","outerWidth"),this._getMeasurement("gutter","outerWidth"),this.measureColumns();var a=this.cols;for(this.colYs=[];a--;)this.colYs.push(0);this.maxY=0},d.prototype.measureColumns=function(){if(this.getContainerWidth(),!this.columnWidth){var a=this.items[0],c=a&&a.element;this.columnWidth=c&&b(c).outerWidth||this.containerWidth}var d=this.columnWidth+=this.gutter,e=this.containerWidth+this.gutter,f=e/d,g=d-e%d,h=g&&1>g?"round":"floor";f=Math[h](f),this.cols=Math.max(f,1)},d.prototype.getContainerWidth=function(){var a=this.options.isFitWidth?this.element.parentNode:this.element,c=b(a);this.containerWidth=c&&c.innerWidth},d.prototype._getItemLayoutPosition=function(a){a.getSize();var b=a.size.outerWidth%this.columnWidth,d=b&&1>b?"round":"ceil",e=Math[d](a.size.outerWidth/this.columnWidth);e=Math.min(e,this.cols);for(var f=this._getColGroup(e),g=Math.min.apply(Math,f),h=c.indexOf(f,g),i={x:this.columnWidth*h,y:g},j=g+a.size.outerHeight,k=this.cols+1-f.length,l=0;k>l;l++)this.colYs[h+l]=j;return i},d.prototype._getColGroup=function(a){if(2>a)return this.colYs;for(var b=[],c=this.cols+1-a,d=0;c>d;d++){var e=this.colYs.slice(d,d+a);b[d]=Math.max.apply(Math,e)}return b},d.prototype._manageStamp=function(a){var c=b(a),d=this._getElementOffset(a),e=this.options.isOriginLeft?d.left:d.right,f=e+c.outerWidth,g=Math.floor(e/this.columnWidth);g=Math.max(0,g);var h=Math.floor(f/this.columnWidth);h-=f%this.columnWidth?0:1,h=Math.min(this.cols-1,h);for(var i=(this.options.isOriginTop?d.top:d.bottom)+c.outerHeight,j=g;h>=j;j++)this.colYs[j]=Math.max(i,this.colYs[j])},d.prototype._getContainerSize=function(){this.maxY=Math.max.apply(Math,this.colYs);var a={height:this.maxY};return this.options.isFitWidth&&(a.width=this._getContainerFitWidth()),a},d.prototype._getContainerFitWidth=function(){for(var a=0,b=this.cols;--b&&0===this.colYs[b];)a++;return(this.cols-a)*this.columnWidth-this.gutter},d.prototype.needsResizeLayout=function(){var a=this.containerWidth;return this.getContainerWidth(),a!==this.containerWidth},d});

//	modernizr

/*! modernizr 3.3.1 (Custom Build) | MIT *
 * https://modernizr.com/download/?-cssanimations-prefixed-setclasses !*/
!function(e,n,t){function r(e,n){return typeof e===n}function o(){var e,n,t,o,i,s,a;for(var f in C)if(C.hasOwnProperty(f)){if(e=[],n=C[f],n.name&&(e.push(n.name.toLowerCase()),n.options&&n.options.aliases&&n.options.aliases.length))for(t=0;t<n.options.aliases.length;t++)e.push(n.options.aliases[t].toLowerCase());for(o=r(n.fn,"function")?n.fn():n.fn,i=0;i<e.length;i++)s=e[i],a=s.split("."),1===a.length?Modernizr[a[0]]=o:(!Modernizr[a[0]]||Modernizr[a[0]]instanceof Boolean||(Modernizr[a[0]]=new Boolean(Modernizr[a[0]])),Modernizr[a[0]][a[1]]=o),g.push((o?"":"no-")+a.join("-"))}}function i(e){var n=w.className,t=Modernizr._config.classPrefix||"";if(x&&(n=n.baseVal),Modernizr._config.enableJSClass){var r=new RegExp("(^|\\s)"+t+"no-js(\\s|$)");n=n.replace(r,"$1"+t+"js$2")}Modernizr._config.enableClasses&&(n+=" "+t+e.join(" "+t),x?w.className.baseVal=n:w.className=n)}function s(e){return e.replace(/([a-z])-([a-z])/g,function(e,n,t){return n+t.toUpperCase()}).replace(/^-/,"")}function a(e,n){return!!~(""+e).indexOf(n)}function f(){return"function"!=typeof n.createElement?n.createElement(arguments[0]):x?n.createElementNS.call(n,"http://www.w3.org/2000/svg",arguments[0]):n.createElement.apply(n,arguments)}function l(e,n){return function(){return e.apply(n,arguments)}}function u(e,n,t){var o;for(var i in e)if(e[i]in n)return t===!1?e[i]:(o=n[e[i]],r(o,"function")?l(o,t||n):o);return!1}function p(e){return e.replace(/([A-Z])/g,function(e,n){return"-"+n.toLowerCase()}).replace(/^ms-/,"-ms-")}function d(){var e=n.body;return e||(e=f(x?"svg":"body"),e.fake=!0),e}function c(e,t,r,o){var i,s,a,l,u="modernizr",p=f("div"),c=d();if(parseInt(r,10))for(;r--;)a=f("div"),a.id=o?o[r]:u+(r+1),p.appendChild(a);return i=f("style"),i.type="text/css",i.id="s"+u,(c.fake?c:p).appendChild(i),c.appendChild(p),i.styleSheet?i.styleSheet.cssText=e:i.appendChild(n.createTextNode(e)),p.id=u,c.fake&&(c.style.background="",c.style.overflow="hidden",l=w.style.overflow,w.style.overflow="hidden",w.appendChild(c)),s=t(p,e),c.fake?(c.parentNode.removeChild(c),w.style.overflow=l,w.offsetHeight):p.parentNode.removeChild(p),!!s}function m(n,r){var o=n.length;if("CSS"in e&&"supports"in e.CSS){for(;o--;)if(e.CSS.supports(p(n[o]),r))return!0;return!1}if("CSSSupportsRule"in e){for(var i=[];o--;)i.push("("+p(n[o])+":"+r+")");return i=i.join(" or "),c("@supports ("+i+") { #modernizr { position: absolute; } }",function(e){return"absolute"==getComputedStyle(e,null).position})}return t}function v(e,n,o,i){function l(){p&&(delete z.style,delete z.modElem)}if(i=r(i,"undefined")?!1:i,!r(o,"undefined")){var u=m(e,o);if(!r(u,"undefined"))return u}for(var p,d,c,v,h,y=["modernizr","tspan","samp"];!z.style&&y.length;)p=!0,z.modElem=f(y.shift()),z.style=z.modElem.style;for(c=e.length,d=0;c>d;d++)if(v=e[d],h=z.style[v],a(v,"-")&&(v=s(v)),z.style[v]!==t){if(i||r(o,"undefined"))return l(),"pfx"==n?v:!0;try{z.style[v]=o}catch(g){}if(z.style[v]!=h)return l(),"pfx"==n?v:!0}return l(),!1}function h(e,n,t,o,i){var s=e.charAt(0).toUpperCase()+e.slice(1),a=(e+" "+b.join(s+" ")+s).split(" ");return r(n,"string")||r(n,"undefined")?v(a,n,o,i):(a=(e+" "+N.join(s+" ")+s).split(" "),u(a,n,t))}function y(e,n,r){return h(e,t,t,n,r)}var g=[],C=[],_={_version:"3.3.1",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(e,n){var t=this;setTimeout(function(){n(t[e])},0)},addTest:function(e,n,t){C.push({name:e,fn:n,options:t})},addAsyncTest:function(e){C.push({name:null,fn:e})}},Modernizr=function(){};Modernizr.prototype=_,Modernizr=new Modernizr;var w=n.documentElement,x="svg"===w.nodeName.toLowerCase(),S="Moz O ms Webkit",b=_._config.usePrefixes?S.split(" "):[];_._cssomPrefixes=b;var E=function(n){var r,o=prefixes.length,i=e.CSSRule;if("undefined"==typeof i)return t;if(!n)return!1;if(n=n.replace(/^@/,""),r=n.replace(/-/g,"_").toUpperCase()+"_RULE",r in i)return"@"+n;for(var s=0;o>s;s++){var a=prefixes[s],f=a.toUpperCase()+"_"+r;if(f in i)return"@-"+a.toLowerCase()+"-"+n}return!1};_.atRule=E;var N=_._config.usePrefixes?S.toLowerCase().split(" "):[];_._domPrefixes=N;var P={elem:f("modernizr")};Modernizr._q.push(function(){delete P.elem});var z={style:P.elem.style};Modernizr._q.unshift(function(){delete z.style}),_.testAllProps=h;_.prefixed=function(e,n,t){return 0===e.indexOf("@")?E(e):(-1!=e.indexOf("-")&&(e=s(e)),n?h(e,n,t):h(e,"pfx"))};_.testAllProps=y,Modernizr.addTest("cssanimations",y("animationName","a",!0)),o(),i(g),delete _.addTest,delete _.addAsyncTest;for(var T=0;T<Modernizr._q.length;T++)Modernizr._q[T]();e.Modernizr=Modernizr}(window,document);


(function() {
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	new IsoGrid(document.querySelector('.isolayer--deco1'), {
		transform : 'translateX(33vw) translateY(-340px) rotateX(45deg) rotateZ(45deg)',
		stackItemsAnimation : {
			properties : function(pos) {
				return {
					translateZ: (pos+1) * 30,
					rotateZ: getRandomInt(-4, 4)
				};
			},
			options : function(pos, itemstotal) {
				return {
					type: dynamics.bezier,
					duration: 500,
					points: [{"x":0,"y":0,"cp":[{"x":0.2,"y":1}]},{"x":1,"y":1,"cp":[{"x":0.3,"y":1}]}],
					delay: (itemstotal-pos-1)*40
				};
			}
		}
	});
})();