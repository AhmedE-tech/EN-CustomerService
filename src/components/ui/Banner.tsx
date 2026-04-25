import { useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface BannerProps {
  type: 'error' | 'success' | 'warning';
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function Banner({
  type,
  message,
  onDismiss,
  autoDismissMs,
}: BannerProps) {
  useEffect(() => {
    if (autoDismissMs && autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  const Icon =
    type === 'error'
      ? AlertCircle
      : type === 'success'
        ? CheckCircle
        : AlertTriangle;

  return (
    <div className={`banner banner-${type}`} role="alert">
      <Icon size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: 'inherit',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
