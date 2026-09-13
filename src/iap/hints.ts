import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import type { Purchase } from 'expo-iap';

/**
 * One product: unlimited hints, bought once, yours on every device signed in
 * to the same Apple ID. A non-consumable, so Apple requires a way to restore
 * it — that is `restore()`, and Settings has to show it.
 *
 * Nothing here is trusted on its own. The entitlement is written to the
 * progress store only when a purchase for this product reaches the
 * 'purchased' state, and `restore()` re-derives it from what Apple says the
 * account owns.
 */

/** Must match App Store Connect exactly. It can never be changed there. */
export const UNLIMITED_HINTS = 'com.dahbed55.haystack.unlimited_hints';

export interface Offer {
  /** Localised, e.g. "$2.99". Straight from the store. */
  price: string;
  title: string;
}

let connected: Promise<boolean> | null = null;
let stop: (() => void) | null = null;

function connect(onOwned: () => void): Promise<boolean> {
  connected ??= initConnection()
    .then(() => {
      const updated = purchaseUpdatedListener((purchase: Purchase) => {
        if (purchase.productId !== UNLIMITED_HINTS || purchase.purchaseState !== 'purchased') {
          return;
        }
        onOwned();
        // Tell the store the entitlement has been delivered, or it keeps
        // re-sending this purchase on every launch.
        finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
      });
      const failed = purchaseErrorListener(() => undefined);
      stop = () => {
        updated.remove();
        failed.remove();
      };
      return true;
    })
    .catch(() => false);
  return connected;
}

/** True once the store is reachable. Call once, early; safe to call again. */
export async function prepareStore(onOwned: () => void): Promise<boolean> {
  return connect(onOwned);
}

export function closeStore(): void {
  stop?.();
  stop = null;
  connected = null;
  endConnection().catch(() => undefined);
}

/** What the store will charge, or null if it cannot say right now. */
export async function fetchOffer(): Promise<Offer | null> {
  try {
    const products = await fetchProducts({ skus: [UNLIMITED_HINTS], type: 'in-app' });
    const product = products?.find((entry) => entry.id === UNLIMITED_HINTS);
    return product ? { price: product.displayPrice, title: product.title } : null;
  } catch {
    return null;
  }
}

/**
 * Opens the payment sheet. Resolves when the sheet closes; the entitlement
 * itself arrives through the listener above, not this return value.
 */
export async function buy(): Promise<void> {
  await requestPurchase({ request: { apple: { sku: UNLIMITED_HINTS } }, type: 'in-app' });
}

/** True if this Apple ID already owns the product. */
export async function restore(): Promise<boolean> {
  try {
    const owned = await getAvailablePurchases();
    return owned.some(
      (purchase) => purchase.productId === UNLIMITED_HINTS && purchase.purchaseState === 'purchased'
    );
  } catch {
    return false;
  }
}

/** Whether purchasing is possible at all on this platform. */
export function storeAvailable(): boolean {
  return true;
}
