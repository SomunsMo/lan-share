import copy from 'copy-to-clipboard';
import IconButton from '@mui/material/IconButton';

export default function CopyButton({ text, size = 14 }) {
  return (
    <IconButton onClick={() => copy(text)} size="small" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </IconButton>
  );
}
