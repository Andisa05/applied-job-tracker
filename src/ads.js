import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { BANNER_ID, INTERSTITIAL_ID, USING_TEST_ADS } from './config';

const native = Capacitor.isNativePlatform();
let ready = false;
let interstitialLoaded = false;
let privacyOptionsRequired = false;

// Ask for consent where the law requires it (EEA/UK), then start the SDK.
export async function startAds(onBannerHeight) {
  if (!native || ready) return;
  try {
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm();
    }
    privacyOptionsRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    if (!consent.canRequestAds) return;

    await AdMob.initialize({ initializeForTesting: USING_TEST_ADS });
    ready = true;

    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => onBannerHeight?.(size?.height || 0));
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => onBannerHeight?.(0));
    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: USING_TEST_ADS,
    });
    prepareInterstitial();
  } catch (e) {
    console.warn('Ads unavailable', e);
  }
}

async function prepareInterstitial() {
  if (!ready) return;
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: USING_TEST_ADS });
    interstitialLoaded = true;
  } catch {
    interstitialLoaded = false;
  }
}

export async function maybeShowInterstitial() {
  if (!ready || !interstitialLoaded) return;
  try {
    interstitialLoaded = false;
    await AdMob.showInterstitial();
  } catch {
    /* ignore */
  } finally {
    setTimeout(prepareInterstitial, 1000);
  }
}

export function canShowPrivacyOptions() {
  return native && privacyOptionsRequired;
}

export async function showPrivacyOptions() {
  if (native) await AdMob.showPrivacyOptionsForm();
}

export async function hideBanner() {
  if (ready) await AdMob.hideBanner().catch(() => {});
}
export async function resumeBanner() {
  if (ready) await AdMob.resumeBanner().catch(() => {});
}
