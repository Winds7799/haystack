/**
 * Custom entry point, and it exists for one reason.
 *
 * On web, react-native-skia builds its entire API the moment its module is
 * evaluated: `export const Skia = JsiSkApi(global.CanvasKit)`. If CanvasKit is
 * not on the global by then, every factory on Skia is permanently bound to
 * undefined and the first draw fails with "cannot read properties of
 * undefined". No React effect can be early enough, because the router pulls in
 * every route — and therefore Skia — while the bundle is still evaluating.
 *
 * So the wasm is loaded first, and the app is only required afterwards.
 */
const { Platform } = require('react-native');

if (Platform.OS === 'web') {
  if (__DEV__) {
    // Development only. A WebGL canvas reads back blank the moment a frame
    // is presented, which makes screenshots of the board impossible.
    // Preserving the buffer costs a little memory and nothing else, and it
    // is what lets the App Store captures show straw instead of black.
    // Also development only. Browsers suspend requestAnimationFrame in a
    // hidden tab, which freezes Skia's render loop and every animation —
    // so nothing draws when the page is captured from a background pane.
    // While hidden, drive rAF from a timer; when visible, leave it alone.
    const nativeRaf = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      document.hidden ? setTimeout(() => cb(performance.now()), 16) : nativeRaf(cb);
    window.cancelAnimationFrame = (id) => {
      clearTimeout(id);
      nativeCancel(id);
    };
    // And layout. React Native Web fires onLayout from a ResizeObserver,
    // whose notifications are withheld from a hidden document — so Skia never
    // creates its renderer and no canvas is ever sized. While hidden, deliver
    // the first layout of each observed element from a timer instead.
    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      constructor(callback) {
        super(callback);
        this.deliver = callback;
      }
      observe(target, options) {
        super.observe(target, options);
        if (document.hidden) {
          setTimeout(() => this.deliver([{ target, contentRect: target.getBoundingClientRect() }], this), 40);
        }
      }
    };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      const preserved = /webgl/.test(type) ? { ...(options ?? {}), preserveDrawingBuffer: true } : options;
      return getContext.call(this, type, preserved);
    };
  }
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  // public/canvaskit.wasm is copied to the web root; CanvasKit would otherwise
  // look beside the bundle, which lives under _expo/static/js.
  LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
    require('expo-router/entry');
  });
} else {
  require('expo-router/entry');
}
