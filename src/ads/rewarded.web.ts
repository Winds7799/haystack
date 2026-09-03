/**
 * The browser has no rewarded ads. Metro resolves this file instead of the
 * native one on web, which also keeps the Google Mobile Ads SDK — and the
 * react-native internals it imports — out of the web bundle entirely.
 *
 * Everything here reports "no ad could be shown", and the caller already
 * treats that as "give the hint anyway".
 */

export type AdOutcome = 'earned' | 'unavailable' | 'dismissed';

export function usingTestAds(): boolean {
  return false;
}

export function adsAvailable(): boolean {
  return false;
}

export async function openAdPrivacyOptions(): Promise<void> {
  // Nothing to consent to when nothing is served.
}

export async function showRewardedAd(): Promise<AdOutcome> {
  return 'unavailable';
}
