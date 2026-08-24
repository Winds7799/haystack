import { Platform } from 'react-native';

/**
 * A rewarded ad in exchange for a hint.
 *
 * The native module is loaded lazily and defensively on purpose. A build made
 * before this dependency existed has no ad module in it, and importing one at
 * the top of a file would take the whole app down. Here, a missing module just
 * means `available()` is false — and a hint asked for when no ad can be shown
 * is granted anyway. Nobody loses a hint to an outage, an aeroplane, or a
 * build that predates the SDK.
 */

/** Google's public test units. Swap these for real ones before shipping. */
const TEST_UNIT = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-3940256099942544/5224354917',
});

interface RewardedAdLike {
  load: () => void;
  show: () => Promise<void>;
  addAdEventListener: (event: string, handler: () => void) => () => void;
}

interface AdsModule {
  RewardedAd: { createForAdRequest: (unitId: string) => RewardedAdLike };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  AdEventType: { ERROR: string; CLOSED: string };
  default?: () => { initialize: () => Promise<unknown> };
}

let module: AdsModule | null = null;
let looked = false;

function load(): AdsModule | null {
  if (looked) {
    return module;
  }
  looked = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('react-native-google-mobile-ads') as AdsModule;
    module.default?.().initialize().catch(() => undefined);
  } catch {
    module = null;
  }
  return module;
}

/** True when an ad could actually be shown on this build. */
export function adsAvailable(): boolean {
  return load() !== null;
}

/** How long to wait for an ad before deciding the player has waited enough. */
const LOAD_TIMEOUT = 6000;

export type AdOutcome = 'earned' | 'unavailable' | 'dismissed';

/**
 * Resolves 'earned' if the ad ran to the reward, 'unavailable' if no ad could
 * be shown at all, and 'dismissed' if the player closed it early. Only
 * 'dismissed' should cost the player anything.
 */
export function showRewardedAd(): Promise<AdOutcome> {
  const ads = load();
  if (!ads) {
    return Promise.resolve('unavailable');
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: AdOutcome) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      unsubscribe.forEach((off) => off());
      resolve(outcome);
    };

    const timer = setTimeout(() => finish('unavailable'), LOAD_TIMEOUT);
    const unsubscribe: (() => void)[] = [];

    try {
      const ad = ads.RewardedAd.createForAdRequest(TEST_UNIT);
      unsubscribe.push(
        ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
          clearTimeout(timer);
          ad.show().catch(() => finish('unavailable'));
        }),
        ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => finish('earned')),
        ad.addAdEventListener(ads.AdEventType.ERROR, () => finish('unavailable')),
        ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish('dismissed'))
      );
      ad.load();
    } catch {
      finish('unavailable');
    }
  });
}
