import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/** Mobile-only "Add to Home Screen" prompt. Shows once, after 2 sessions. */

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'udonpass-install-dismissed-v1';
const SESSION_KEY = 'udonpass-sessions';

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(SESSION_KEY) || '0') + 1;
      localStorage.setItem(SESSION_KEY, String(n));
    } catch { /* ignore */ }

    function onPrompt(e: Event) {
      e.preventDefault();
      const sessions = Number(localStorage.getItem(SESSION_KEY) || '0');
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed || sessions < 2) return;
      setEvt(e as BIPEvent);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  if (!visible || !evt) return null;

  return (
    <div className="install-prompt" role="dialog" aria-label="Install ApplyWise">
      <div className="install-prompt-icon">🎓</div>
      <div className="install-prompt-body">
        <div className="install-prompt-title">Install ApplyWise</div>
        <div className="install-prompt-sub">Open it like an app. Works offline too.</div>
      </div>
      <button className="install-prompt-cta" onClick={install}>
        <Download size={14} /> Install
      </button>
      <button className="install-prompt-x" onClick={dismiss} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
