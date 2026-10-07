import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from './Toast';

export const CopyIconButton: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = value.trim();
    if (!text) {
      showToast(`No ${label.toLowerCase()} to copy`, 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      style={{
        background: 'none',
        border: '1px solid var(--border-subtle)',
        color: copied ? '#10b981' : 'var(--text-muted)',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        flexShrink: 0
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};
