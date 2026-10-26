# Applied: Job Hunt Tracker

A free Android app for job seekers. Track applications, get follow-up reminders and read CV and interview tips. It earns money from Google AdMob ads: a banner at the bottom, plus a full-screen ad after every 4th new application.

Built with React + Vite, wrapped as a native Android app with Capacitor 8. Data is stored on the phone only (no backend, no account).

## How the money works

- **AdMob pays per ad view and click.** In South Africa, expect roughly cents per user per month, so income grows with active users. 1,000 daily users could earn a few hundred rand a month, depending heavily on the country and ad type.
- AdMob pays out monthly by bank transfer once your balance passes the payment threshold (about $100 for ZA accounts; check your AdMob Payments page).
- The app uses **Google's test ads** until you add your own AdMob IDs (step 5). Never click your own real ads: AdMob bans accounts for that.

## Launch checklist

### 1. Put the code on GitHub (about 5 minutes)
1. Unzip `applied-job-tracker.zip`.
2. On github.com, click **New repository**, name it `applied-job-tracker`, choose **Public** (needed for free GitHub Pages; or Private if you host the privacy policy elsewhere), and click **Create repository**.
3. Click **uploading an existing file**, drag in **everything inside** the unzipped folder (including the hidden `.github` folder; on Windows turn on View > Hidden items first), and click **Commit changes**.
4. Open the **Actions** tab. The "Build Android app" workflow starts by itself. When it turns green (about 8 minutes), open the run and download **applied-android-N** under Artifacts. It contains a debug APK you can install on your phone to try the app.

### 2. Add your signing key (so builds can go to the Play Store)
Keep the `applied-signing-key-PRIVATE` folder somewhere safe and **never upload it to GitHub**. If you lose it, you can't easily update the app.

In the repo, go to **Settings > Secrets and variables > Actions > New repository secret** and add these 4 secrets with the values from `keystore-secrets.txt`:

| Secret name | Value |
|---|---|
| `KEYSTORE_BASE64` | the long text in `upload-keystore-base64.txt` |
| `KEYSTORE_PASSWORD` | from keystore-secrets.txt |
| `KEY_ALIAS` | `applied-upload` |
| `KEY_PASSWORD` | from keystore-secrets.txt (same as the keystore password) |

Then go to **Actions > Build Android app > Run workflow**. This time the artifact contains a signed `app-release.aab` (for the Play Store) and `app-release.apk`.

### 3. Turn on the privacy policy page
**Settings > Pages > Build and deployment > Source: Deploy from a branch > Branch: main, folder: /docs > Save.** After a minute it's live at `https://andisa05.github.io/applied-job-tracker/privacy.html`. Google Play and AdMob both require this link.

### 4. Create your Google Play developer account
1. Go to play.google.com/console and sign up as an **individual**. There's a **one-time $25 fee**, and Google verifies your ID and phone number.
2. **Create app**: name "Applied: Job Hunt Tracker", default language English (South Africa) or English (US), App, Free.
3. Fill in the store listing and App content using `store/PLAY_STORE_LISTING.md` and the images in `store/`.
4. **New personal accounts must run a closed test first**: at least **12 testers** must stay opted in for **14 days in a row** before you can apply for production. Create a closed testing track, upload `app-release.aab`, add your testers' Gmail addresses (friends, family, classmates, WhatsApp groups), and share the opt-in link with them.
5. After 14 days, apply for production access in the Dashboard. Google usually reviews within about a week.

### 5. Switch on real ads (AdMob)
1. Sign up at admob.google.com with the same Google account and add your payment details.
2. **Apps > Add app > Android**. Say it isn't listed yet (you can link the Play listing later), name it "Applied".
3. Create two ad units: a **Banner** and an **Interstitial**.
4. In GitHub, go to **Settings > Secrets and variables > Actions > Variables** and add:
   - `ADMOB_APP_ID`: your app ID (looks like `ca-app-pub-1234567890123456~1234567890`)
   - `ADMOB_BANNER_ID`: your banner ad unit ID (`ca-app-pub-.../...`)
   - `ADMOB_INTERSTITIAL_ID`: your interstitial ad unit ID
5. Run the workflow again and upload the new `.aab` to Play. Every build gets a higher version number automatically.
6. In AdMob, open **Privacy & messaging** and create a **GDPR consent message** (needed for users in Europe/UK). The app already shows it when required.
7. Once the app is live on Play, link it in AdMob (App settings > Add store) so AdMob can verify it.

## Changing the app

- Edit files in `src/` on GitHub (click a file, then the pencil icon). Every commit to `main` builds a new APK/AAB.
- Tips content: `src/tips.js`. Ad frequency: `INTERSTITIAL_EVERY` in `src/config.js`. Contact email: `src/config.js` and `docs/privacy.html`.
- The `android/` folder isn't stored in the repo: the build creates it from Capacitor's template and `scripts/prepare-android.mjs` adds the icons (`android-res/`), AdMob ID and signing.
- Running locally (needs Node 22, and Android Studio for the native app): `npm install`, `npm run dev` (browser preview), `npm run android`, then open the `android` folder in Android Studio.

## Ideas for version 2
- "Pro" upgrade (no ads, CV templates, export to spreadsheet) via Google Play Billing
- Weekly progress notification
- Share an application to WhatsApp
- Afrikaans, isiZulu and isiXhosa translations
