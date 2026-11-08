// Web Audio chime generator - works without any external audio files
export function playAlertChime(type: 'drop' | 'gain' | 'urgent_drop' | 'neutral' = 'drop') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);

    if (type === 'urgent_drop' || type === 'drop') {
      // Descending warning tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.25); // G4
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);

      if (type === 'urgent_drop') {
        // Second warning pulse for sharp drops (>5%)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(440, now + 0.2);
        osc2.frequency.exponentialRampToValueAtTime(293.66, now + 0.45);
        gain2.gain.setValueAtTime(0.01, now + 0.2);
        gain2.gain.linearRampToValueAtTime(0.2, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.5);
      }
    } else if (type === 'gain') {
      // Pleasant ascending chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // Audio context may be restricted by autoplay policy before first gesture
  }
}

// Push notification / Browser Notification API wrapper
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    return 'denied';
  }
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function dispatchSystemNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Vibration on supported mobile devices
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch {}
      }

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('System notification failed:', e);
    }
  }
}
