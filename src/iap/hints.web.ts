/**
 * There is no App Store in a browser. Metro resolves this file on web, which
 * also keeps the native purchase module out of the bundle entirely. Every call
 * reports "not available", and the free allowance applies.
 */

export const UNLIMITED_HINTS = 'com.dahbed55.haystack.unlimited_hints';

/**
 * Development only: `?preview=store` on a web URL renders the offer sheet as
 * the iPhone app shows it, with a stand-in price. It exists so the sheet can
 * be screenshotted for App Store review without a device. Buying and
 * restoring stay inert.
 */
function previewing(): boolean {
  if (!__DEV__ || typeof location === 'undefined') {
    return false;
  }
  try {
    // The router rewrites the URL as it navigates, so remember the flag for
    // the rest of the tab's life once it has been seen.
    if (/[?&]preview=store/.test(location.search)) {
      sessionStorage.setItem('preview-store', '1');
    }
    return sessionStorage.getItem('preview-store') === '1';
  } catch {
    return false;
  }
}

export interface Offer {
  price: string;
  title: string;
}

export async function prepareStore(): Promise<boolean> {
  return false;
}

export function closeStore(): void {
  // Nothing was opened.
}

export async function fetchOffer(): Promise<Offer | null> {
  return previewing() ? { price: '$1.99', title: 'Unlimited Hints' } : null;
}

export async function buy(): Promise<void> {
  // Unreachable: the offer is never shown when the store is unavailable.
}

export async function restore(): Promise<boolean> {
  return false;
}

export function storeAvailable(): boolean {
  return previewing();
}
