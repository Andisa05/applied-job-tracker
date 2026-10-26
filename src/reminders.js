import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const native = Capacitor.isNativePlatform();

// Stable positive 31-bit int from the application id (notification ids must be ints).
function notifId(appId) {
  let h = 0;
  for (const c of appId) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2147483000 + 1;
}

export async function ensurePermission() {
  if (!native) return false;
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      p = await LocalNotifications.requestPermissions();
    }
    return p.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleFollowUp(app) {
  if (!native) return;
  await cancelFollowUp(app.id);
  if (!app.followUp || ['Offer', 'Rejected'].includes(app.status)) return;
  const at = new Date(app.followUp + 'T09:00:00');
  if (isNaN(at) || at.getTime() < Date.now() + 60_000) return;
  if (!(await ensurePermission())) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: notifId(app.id),
        title: `Follow up: ${app.company}`,
        body: `Time to check in about the ${app.role || 'role'} you applied for.`,
        schedule: { at, allowWhileIdle: true },
        extra: { appId: app.id },
      },
    ],
  }).catch(() => {});
}

export async function cancelFollowUp(appId) {
  if (!native) return;
  await LocalNotifications.cancel({ notifications: [{ id: notifId(appId) }] }).catch(() => {});
}
