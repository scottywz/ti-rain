export default
(element => { customElements.define(element.NAME, element); return element; })
(Object.defineProperties(class RainAnimation extends HTMLElement {
 static get NAME() { return "rain-animation"; }
 
 static get CSS() { return /* css */ `
  :host(:not([hidden])) {
   display: inline-block; overflow: hidden;
  }
  :host(:not([hidden]):not([cover])) {
   aspect-ratio: 96 / 64;
  }
  figure {
   display: flex; align-items: center; justify-content: center; text-align: center;
  }
  figure, figure > * {
   width: 100%; height: 100%; margin: 0;
  }
 `; }
 
 static get HTML() { return /* html */ `
  <figure></figure>
  <style class="runtime screen"></style>
 `; }
 
 // Which version of the background sprites to use.
 // Valid values are 1 and 2 (default).
 get bgVersion() {
  return this.state.bgVersion;
 }
 set bgVersion(value) {
  if (value == null)
   this.removeAttribute("bg-version");
  else if (this.getAttribute("bg-version") != String(value))
   this.setAttribute("bg-version", String(value));
  this.state.bgVersion = Number(value) || 2;
 }
 
 // Whether the animation should cover the whole element.
 // If false (default), the animation will be displayed at
 // a 96:64 aspect ratio within the element.
 get cover() {
  return this._cover;
 }
 set cover(value) {
  if (value == null)
   this.removeAttribute("cover");
  else
   this.setAttribute("cover", "");
  this._cover = Boolean(value != null);
  this.setScreenSize();
  this.setCtxState();
 }
 
 static get observedAttributes() { return ["bg-version", "cover"]; }
 
 constructor() {
  super();
  const shadowRoot = this.attachShadow({mode: "open"});
  shadowRoot.innerHTML = `<style>${this.constructor.CSS}</style>${this.constructor.HTML}`; 
  
  // Instance state
  this.figure = this.shadowRoot.querySelector("figure");
  this.canvas = document.createElement("canvas");
  this.ctx = this.canvas.getContext("2d");
  this.scaleFactor = 0;
  
  // Animation state
  this.state = new this.constructor.State(this);
  
  // Setup canvas
  this.canvas.hidden = true;
  this.figure.appendChild(this.canvas);
  if (this.canvas instanceof HTMLCanvasElement) {
   this.canvas.width = 96;
   this.canvas.height = 64;
   this.setScreenSize();
   if (CSS.supports("image-rendering: pixelated"))
    this.canvas.style.imageRendering = "pixelated";
   else
    this.canvas.style.imageRendering = "optimizeSpeed";
  }
  this.canvas.innerHTML = `
   This animation requires a modern Web browser.
  `.trim();
  this.canvas.hidden = false;
  
  // Initialize mutable attribute values
  this.bgVersion = this.bgVersion;
  this.cover = this.cover;
  
  // Setup resize observer
  this.resizeObserver = new ResizeObserver(entries => {
   for (const entry of entries) {
    this.setScreenSize();
    this.setCtxState();
   }
  });
  this.resizeObserver.observe(this);
 }
 
 isTopLevel() {
  return (
   this.parentNode == document.body ||
   this.parentNode == document.querySelector("main > :first-child")
  );
 }
 
 connectedCallback() {
  this.setScreenSize();
  this.setCtxState();
  if (this.isTopLevel && !this._didTopLevel) {
   this.setAttributesFromParams(location.hash);
   window.addEventListener("hashchange", () => {
    this.setAttributesFromParams(location.hash);
   });
  }
  this._didTopLevel = true;
  
  this.state.start();
  this.ctxStateInterval = setInterval(() => this.setCtxState(true), 200);
 }
 
 disconnectedCallback() {
  this.state.stop();
  clearInterval(this.ctxStateInterval);
 }
 
 attributeChangedCallback(name, oldValue, newValue) {
  name = name.toLowerCase().replace(/-[a-z]/g, match => match[1].toUpperCase());
  if (oldValue !== newValue)
   this[name] = newValue;
 }
 
 // Sets mutable attributes from the given search or hash parameters.
 setAttributesFromParams(paramString) {
  const attributes = this.constructor.observedAttributes;
  paramString = paramString.replace(/^[?#]/, "");
  const params = new URLSearchParams(paramString);
  for (let k of attributes) {
   if (params.get(k) == null)
    this.removeAttribute(k);
   else
    this.setAttribute(k, params.get(k));
  }
 }
 
 // Set the draw settings.
 setCtxState(auto) {
  const computed = window.getComputedStyle(this);
  if (!auto || computed.color != this._color)
   this.ctx.fillStyle = this._color = computed.color;
 }
 
 // Determines the screen size.
 setScreenSize() {
  this.canvas.style.width = this.canvas.style.height = "0";
  let hostRect = this.getBoundingClientRect();
  if (hostRect.width && hostRect.height) {
   if (this._cover) {
    this.scaleFactor = Math.ceil(Math.max(hostRect.width / 96, hostRect.height / 64))
   } else {
    this.scaleFactor = Math.floor(Math.min(hostRect.width / 96, hostRect.height / 64))
   }
  } else {
   this.scaleFactor = 3;
  }
  const width = 96 * this.scaleFactor;
  const height = 64 * this.scaleFactor;
  this.canvas.width = width;
  this.canvas.height = height;
  this.canvas.style.width = String(width) + "px";
  this.canvas.style.height = String(height) + "px";
  this.shadowRoot.querySelector("style.runtime.screen").textContent = `
   /* Work around changes to clip-path not taking effect in WebKit */
   :host(:not[hidden]) {
    opacity: 0.99;
   }
  `;
  setTimeout(() => {
   if (this._cover) {
    this.shadowRoot.querySelector("style.runtime.screen").textContent = `
     :host(:not([hidden])) {
      clip-path: none;
     }
     figure {
      justify-content: left;
     }
    `;
   } else {
    hostRect = this.getBoundingClientRect();
    this.shadowRoot.querySelector("style.runtime.screen").textContent = `
     :host(:not([hidden])) {
      clip-path: inset(
       ${(hostRect.height - height) / 2}px
       ${(hostRect.width - width) / 2}px
      );
     }
    `;
   }
  }, 1);
 }
 
 // Clears the entire canvas.
 clearScreen() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
 }
 
 // Draws a rectangle, scaling it and its position to correspond to the canvas
 // size.
 drawRect(x, y, w, h) {
  this.ctx.fillRect(
   x * this.scaleFactor, y * this.scaleFactor,
   w * this.scaleFactor, h * this.scaleFactor,
  );
 }
}, {
 State: {
  writable: false,
  value: class RainAnimationState {
   constructor(display) {
    // Must contain clearScreen() and drawRect() methods.
    this.display = display;
    
    // Animation state (nulls are unused, but kept for historical reasons)
    this.R = 35;  // Number of raindrops (<=100)
    this.B = 0; // BG Number
    this.C = null;
    this.D = null;
    this.E = null;
    this.F = null;
    this.G = null;
    this.I = 1; // Initial run?
    this.N = 0; // Raindrop+1 to move down
    this.S = null;
    this.T = 0; // Timer
    this.X = null;
    this.Y = null;
    this.Pic = null;
    this.Pic0 = null;
    this.Pic99 = null;
    this.GDB0 = new Array(100);  // X coordinates (0-108)
    this.GDB1 = new Array(100);  // Y coordinates (0-76)
    
    // Set initial coordinates
    for (this.A=0;this.A<this.R;this.A++) {
     this.GDB0[this.A] = this.constructor.randomInt(109);
     this.GDB1[this.A] = this.constructor.randomInt(77);
    }
    
    this.L = 15; // BG delay
    this.M = 50; // FG delay
    
    // Animation options
    this.bgVersion = 2;
   }
   
   start() {
    this.loopInterval = setInterval(this.loop.bind(this), this.L);
   }
   
   stop() {
    clearInterval(this.loopInterval);
   }
   
   // Returns a random integer in the range [0, maximum).
   static randomInt(maximum) {
    return Math.floor(Math.random() * maximum);
   }
   
   // Draws the background and appropriate raindrops.
   loop() {
    this.display.clearScreen();
    // Draw BG
    for (this.Y=0;this.Y<8;this.Y++) {
     for (this.X=0;this.X<12;this.X++) {
      this.drawBgSprite(this.X, this.Y, this.B, this.bgVersion);
     }
    }
    this.B = this.B+1;
    if (this.B > 7) {
     this.B = 0;
    }
    // Do raindrops
    for (this.A=0;this.A<this.R;this.A++) {
     this.X = this.GDB0[this.A];
     this.Y = this.GDB1[this.A];
     if (this.I==0 || this.A<=this.N) {
      this.drawRaindrop(this.X-5, this.Y-3);
      if (this.T==this.M) {
       this.Y = this.Y+1;
      }
     }
     if (this.Y>76) {
      this.X = this.constructor.randomInt(109);
      this.Y = this.constructor.randomInt(77);
     }
     this.GDB0[this.A] = this.X;
     this.GDB1[this.A] = this.Y;
    }
    //Timer logic
    this.T = this.T+1;
    if (this.T>this.M) {
     this.N = this.N+1;
     this.T = 0;
    }
    if (this.N>this.R) {
     this.N = 1;
     if (this.I==1) {
      this.I = 0;
     }
    }
   }
   
   // Draws a raindrop, scaling it and its position to correspond to the canvas
   // size.
   drawRaindrop(x, y) {
    this.display.drawRect(x + 3, y + 0, 2, 1);
    this.display.drawRect(x + 2, y + 1, 1, 2);
    this.display.drawRect(x + 5, y + 1, 1, 2);
    this.display.drawRect(x + 1, y + 3, 1, 3);
    this.display.drawRect(x + 6, y + 3, 1, 3);
    this.display.drawRect(x + 2, y + 6, 1, 1);
    this.display.drawRect(x + 5, y + 6, 1, 1);
    this.display.drawRect(x + 3, y + 7, 2, 1);
   }
   
   // Draws the background rain.
   drawBgSprite(x, y, n, v) {
    if (n == 0) {
     this.display.drawRect(x*8 + 1, y*8 + 0, 1, 4);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 2, 1, 4);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 4, 1, 4);
    }
    if (n == 1) {
     this.display.drawRect(x*8 + 1, y*8 + 1, 1, 4);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 3, 1, 4);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 5, 1, 3);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 1);
    }
    if (n == 2) {
     this.display.drawRect(x*8 + 1, y*8 + 2, 1, 4);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 4, 1, 4);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 6, 1, 2);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 2);
    }
    if (n == 3) {
     this.display.drawRect(x*8 + 1, y*8 + 3, 1, 4);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 5, 1, 3);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 1);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 7, 1, 1);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 3);
    }
    if (n == 4) {
     this.display.drawRect(x*8 + 1, y*8 + 4, 1, 4);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 6, 1, 2);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 2);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 4);
    }
    if (n == 5) {
     this.display.drawRect(x*8 + 1, y*8 + 5, 1, 3);
     this.display.drawRect(x*8 + 1, y*8 + 0, 1, 1);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 7, 1, 1);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 3);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 1, 1, 4);
    }
    if (n == 6) {
     this.display.drawRect(x*8 + 1, y*8 + 6, 1, 2);
     this.display.drawRect(x*8 + 1, y*8 + 0, 1, 2);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 0, 1, 4);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 2, 1, 4);
    }
    if (n == 7) {
     this.display.drawRect(x*8 + 1, y*8 + 7, 1, 1);
     this.display.drawRect(x*8 + 1, y*8 + 0, 1, 3);
     v==1 && this.display.drawRect(x*8 + 5, y*8 + 1, 1, 4);
     v==2 && this.display.drawRect(x*8 + 5, y*8 + 3, 1, 4);
    }
   }
  }
 },
}));
