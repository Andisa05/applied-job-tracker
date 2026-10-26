// Ad unit IDs. Google's test IDs are used until real ones are set at build time
// (GitHub repository variables ADMOB_BANNER_ID / ADMOB_INTERSTITIAL_ID, or a local .env file).
const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

const env = import.meta.env;

export const BANNER_ID = env.VITE_ADMOB_BANNER_ID || TEST_BANNER;
export const INTERSTITIAL_ID = env.VITE_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL;
export const USING_TEST_ADS = BANNER_ID === TEST_BANNER;

export const PRIVACY_URL =
  env.VITE_PRIVACY_URL || 'https://andisa05.github.io/applied-job-tracker/privacy.html';
export const CONTACT_EMAIL = 'andisap1@icloud.com';

// Show a full-screen ad after every Nth new application (never on first use).
export const INTERSTITIAL_EVERY = 4;
