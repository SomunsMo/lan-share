import copy from 'copy-to-clipboard';

const btnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px',
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '4px',
  color: 'var(--on-surface-variant)',
  opacity: 0.6,
  transition: 'opacity 0.15s',
};

export default function CopyButton({ text, size = 14 }) {
  return (
    <button
      style={btnStyle}
      onClick={() => copy(text)}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>
  );
}
