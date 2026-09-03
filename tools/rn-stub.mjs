// Enough of react-native for the pure game logic to load under Node. Only the
// tools use this; the app never sees it.
export const Platform = { OS: 'ios', select: (o) => o.ios ?? o.default };
