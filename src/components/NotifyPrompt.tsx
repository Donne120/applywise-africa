import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  notificationsSupported, notificationsPermission, requestNotificationsPermission,
  softPromptDismissed, dismissSoftPrompt, runDeadlineScan,
} from '../utils/notifications';

/**
 * Soft in-app prompt asking for notification permission.
 * Only shows when:
 *   - browser supports Notifications
 *   - permission is still "default"
 *   - user hasn't dismissed before
 *   - they have at least one tracked scholarship (otherwise it's premature)
 *   - they've used the app for >= 2 sessions (piggybacks on InstallPrompt's counter)
 *
 * Also drives the scheduler: scans deadlines on mount and every 30 minutes.
 */
export default function NotifyPrompt() {
  const { scholarships } = useApp();
  const [visible, setVisible] = useState(false);

  // One-time check on mount + a passive 30-min scheduler
  useEffect(() => {
    if (!notificationsSupported()) return;
    runDeadlineScan(scholarships);
    const id = setInterval(() => runDeadlineScan(scholarships), 30 * 60 * 1000);
    const onVis = () => { if (!document.hidden) runDeadlineScan(scholarships); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [scholarships]);

  // Decide whether to show the soft prompt
  useEffect(() => {
    if (!notificationsSupported()) return;
    if (notificationsPermission() !== 'default') return;
    if (softPromptDismissed()) return;
    if (scholarships.length === 0) return;
    let sessions = 0;
    try { sessions = Number(localStorage.getItem('udonpass-sessions') || '0'); } catch { /* ignore */ }
    if (sessions < 2) return;
    setVisible(true);
  }, [scholarships.length]);

  async function enable() {
    const result = await requestNotificationsPermission();
    setVisible(false);
    dismissSoftPrompt();
    if (result === 'granted') {
      runDeadlineScan(scholarships);
    }
  }

  function later() {
    setVisible(false);
    dismissSoftPrompt();
  }

  if (!visible) return null;

  return (
    <div className="notify-prompt" role="dialog" aria-label="Enable deadline reminders">
      <div className="notify-prompt-icon"><Bell size={18} /></div>
      <div className="notify-prompt-body">
        <div className="notify-prompt-title">Don't miss a deadline</div>
        <div className="notify-prompt-sub">We'll ping you 30, 14, 7, 3 &amp; 1 day before each one closes.</div>
      </div>
      <div className="notify-prompt-actions">
        <button className="notify-prompt-cta" onClick={enable}>Enable</button>
        <button className="notify-prompt-skip" onClick={later} aria-label="Not now">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
