import {useEffect, useRef, useState} from 'react';
import IconButton from '@mui/material/IconButton';
import {useToast} from "@/components/toast/index.jsx";
import {useTranslation} from "react-i18next";
import {copyText} from "../../utils/copyText.js";

// 复制成功后短暂切换为对勾，提供比 Toast 更贴近操作点的反馈
const FEEDBACK_DURATION = 1200;

export default function CopyButton({ text, size = 14 }) {
  const {showToast} = useToast();
  const {t} = useTranslation();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    try {
      await copyText(text);
      showToast({message: t('common.toast.copied'), type: 'success'});
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), FEEDBACK_DURATION);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <IconButton
      onClick={handleCopy}
      size="small"
      sx={{
        opacity: copied ? 1 : 0.6,
        color: copied ? 'var(--success)' : 'inherit',
        transition: 'opacity var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
        '&:hover': { opacity: 1 },
      }}
    >
      <span className={copied ? 'copy-icon-swap' : undefined} key={copied ? 'done' : 'copy'}>
        {copied ? (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </span>
    </IconButton>
  );
}
