/**
 * There is no App Store in a browser. Metro resolves this file on web, which
 * also keeps the native purchase module out of the bundle entirely. Every call
 * reports "not available", and the free allowance applies.
 */

export const UNLIMITED_HINTS = 'com.dahbed55.haystack.unlimited_hints';

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
  return null;
}

export async function buy(): Promise<void> {
  // Unreachable: the offer is never shown when the store is unavailable.
}

export async function restore(): Promise<boolean> {
  return false;
}

export function storeAvailable(): boolean {
  return false;
}
