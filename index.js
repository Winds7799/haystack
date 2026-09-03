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
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  // public/canvaskit.wasm is copied to the web root; CanvasKit would otherwise
  // look beside the bundle, which lives under _expo/static/js.
  LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
    require('expo-router/entry');
  });
} else {
  require('expo-router/entry');
}
