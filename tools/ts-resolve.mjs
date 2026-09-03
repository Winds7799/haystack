import { pathToFileURL } from 'node:url';

/**
 * Lets the build tools import the app's TypeScript directly.
 *
 * Node's ESM resolver wants an explicit extension and knows nothing about the
 * `@/` alias; Metro and tsc handle both, so the source omits them. This hook
 * closes that gap for tooling only — nothing about how the app resolves
 * changes. react-native is stubbed because the pure game logic reaches it only
 * through the design tokens.
 */
const SRC = new URL('../src/', import.meta.url);
const STUB = new URL('./rn-stub.mjs', import.meta.url).href;

export function resolve(specifier, context, next) {
  if (specifier === 'react-native') {
    return next(STUB, context);
  }
  if (specifier.startsWith('@/')) {
    return next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
  }
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    return next(`${specifier}.ts`, context);
  }
  return next(specifier, context);
}

export { pathToFileURL };
