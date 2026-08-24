import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * A rewarded ad in exchange for a hint.
 *
 * The native module is loaded lazily and defensively on purpose. A build made
 * before this dependency existed has no ad module in it, and importing one at
 * the top of a file would take the whole app down. Here, a missing module just
 * means `adsAvailable()` is false — and a hint asked for when no ad can be
 * shown is granted anyway. Nobody loses a hint to an outage, an aeroplane, or
 * a build that predates the SDK.
 */

/** Google's public test units. Used until a real one is configured. */
const TEST_UNIT = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-3940256099942544/5224354917',
});

interface AdsConfig {
  iosRewardedUnitId?: string;
  androidRewardedUnitId?: string;
}

function configured(): string | null {
  const extra = Constants.expoConfig?.extra as { ads?: AdsConfig } | undefined;
  const unit = Platform.select({
    ios: extra?.ads?.iosRewardedUnitId,
    default: extra?.ads?.androidRewardedUnitId,
  });
  // A real unit is an ad unit path, and never one of Google's samples.
  return typeof unit === 'string' && unit.startsWith('ca-app-pub-') && !unit.includes('3940256099942544')
    ? unit
    : null;
}

/** The unit this build will actually request. */
function unitId(): string {
  return configured() ?? TEST_UNIT;
}

/**
 * True when this build is still serving Google's samples. Worth surfacing:
 * shipping on test units earns nothing and looks identical.
 */
export function usingTestAds(): boolean {
  return configured() === null;
}

interface RewardedAdLike {
  load: () => void;
  show: () => Promise<void>;
  addAdEventListener: (event: string, handler: () => void) => () => void;
}

interface ConsentInfo {
  canRequestAds: boolean;
  isConsentFormAvailable?: boolean;
}

interface AdsModule {
  RewardedAd: { createForAdRequest: (unitId: string) => RewardedAdLike };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  AdEventType: { ERROR: string; CLOSED: string };
  AdsConsent: {
    gatherConsent: () => Promise<ConsentInfo>;
    showPrivacyOptionsForm: () => Promise<ConsentInfo>;
  };
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

/**
 * Consent, gathered once per launch before the first ad. Serving personalised
 * ads in the EU or UK without this is a policy breach, and Google will simply
 * stop filling. It is deliberately not called at startup: a player who never
 * asks for a hint never sees a consent form.
 */
let consented: Promise<boolean> | null = null;

function ensureConsent(ads: AdsModule): Promise<boolean> {
  consented ??= ads.AdsConsent.gatherConsent()
    .then((info) => info.canRequestAds)
    // A consent failure should not cost the player a hint, so assume the
    // worst about ads and the best about the player.
    .catch(() => false);
  return consented;
}

/** Lets a player revisit their choice, which the EU rules require. */
export async function openAdPrivacyOptions(): Promise<void> {
  const ads = load();
  if (!ads) {
    return;
  }
  await ads.AdsConsent.showPrivacyOptionsForm().catch(() => undefined);
}

/** How long to wait for an ad before deciding the player has waited enough. */
const LOAD_TIMEOUT = 6000;

export type AdOutcome = 'earned' | 'unavailable' | 'dismissed';

/**
 * Resolves 'earned' if the ad ran to the reward, 'unavailable' if no ad could
 * be shown at all, and 'dismissed' if the player closed it early. Only
 * 'dismissed' should cost the player anything.
 */
export async function showRewardedAd(): Promise<AdOutcome> {
  const ads = load();
  if (!ads) {
    return 'unavailable';
  }
  if (!(await ensureConsent(ads))) {
    return 'unavailable';
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
      const ad = ads.RewardedAd.createForAdRequest(unitId());
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
