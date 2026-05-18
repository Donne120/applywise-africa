import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Check } from 'lucide-react';

/**
 * Tiny status pill for the Writing Studio header.
 * Reflects: online/offline, and whether the current body has hit localStorage.
 */
export default function OfflineBadge({ savedAt }: { savedAt: string | null }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (!online) {
    return (
      <span className="offline-badge offline" title={savedAt ? `Saved offline at ${new Date(savedAt).toLocaleTimeString()}` : ''}>
        <CloudOff size={12} /> Offline · saved locally
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="offline-badge synced">
        <Check size={12} /> Saved
      </span>
    );
  }
  return (
    <span className="offline-badge idle">
      <Cloud size={12} /> Auto-save on
    </span>
  );
}
