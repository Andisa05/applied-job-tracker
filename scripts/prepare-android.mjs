// Customises the Android project that `npx cap add android` generates:
// icons/splash (vector), AdMob app ID, signing, version code and permissions.
// Run from the repo root after `npx cap add android`. Safe to run more than once.
import { readFileSync, writeFileSync, rmSync, cpSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const app = 'android/app';
const res = join(app, 'src/main/res');
if (!existsSync(res)) throw new Error('Run `npx cap add android` first.');

// 1. Replace the template's PNG icons and splash images with our vector resources.
for (const dir of readdirSync(res)) {
  const full = join(res, dir);
  if (/^mipmap-(m|h|xh|xxh|xxxh)dpi$/.test(dir) || /^drawable-(land|port)/.test(dir)) {
    rmSync(full, { recursive: true, force: true });
  }
}
for (const f of ['drawable/splash.png', 'drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']) {
  rmSync(join(res, f), { force: true });
}
cpSync('android-res', res, { recursive: true });

const edit = (file, fn) => {
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  writeFileSync(file, after);
};
const must = (s, find) => {
  if (!s.includes(find)) throw new Error(`Could not find: ${find.slice(0, 60)}`);
};

// 2. Manifest: AdMob app ID placeholder, notification permission, no exact alarms.
edit(join(app, 'src/main/AndroidManifest.xml'), (s) => {
  if (s.includes('com.google.android.gms.ads.APPLICATION_ID')) return s;
  must(s, '<manifest xmlns:android="http://schemas.android.com/apk/res/android">');
  must(s, 'android:theme="@style/AppTheme">');
  must(s, '<uses-permission android:name="android.permission.INTERNET" />');
  return s
    .replace(
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools">'
    )
    .replace(
      'android:theme="@style/AppTheme">',
      'android:theme="@style/AppTheme">\n\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="${admobAppId}" />'
    )
    .replace(
      '<uses-permission android:name="android.permission.INTERNET" />',
      '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />'
    );
});

// 3. build.gradle: version from CI, AdMob ID from env (Google test ID by default), release signing.
edit(join(app, 'build.gradle'), (s) => {
  if (s.includes('admobAppId')) return s;
  must(s, 'versionCode 1');
  must(s, 'versionName "1.0"');
  must(s, '    buildTypes {\n        release {');
  return s
    .replace('versionCode 1', 'versionCode = Integer.parseInt(System.getenv("VERSION_CODE") ?: "1")')
    .replace(
      'versionName "1.0"',
      'versionName = "1.0." + (System.getenv("VERSION_CODE") ?: "0")\n' +
        '        manifestPlaceholders = [admobAppId: (System.getenv("ADMOB_APP_ID") ?: "ca-app-pub-3940256099942544~3347511713")]'
    )
    .replace(
      '    buildTypes {\n        release {',
      [
        '    signingConfigs {',
        '        release {',
        '            def ks = System.getenv("KEYSTORE_FILE")',
        '            if (ks && file(ks).exists()) {',
        '                storeFile file(ks)',
        '                storePassword System.getenv("KEYSTORE_PASSWORD")',
        '                keyAlias System.getenv("KEY_ALIAS")',
        '                keyPassword System.getenv("KEY_PASSWORD")',
        '            }',
        '        }',
        '    }',
        '    buildTypes {',
        '        release {',
        '            if (System.getenv("KEYSTORE_FILE")) {',
        '                signingConfig signingConfigs.release',
        '            }',
      ].join('\n')
    );
});

console.log('Android project customised.');
