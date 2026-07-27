import IconButton from '@mui/material/IconButton';
import {useToast} from "@/components/toast/index.jsx";
import {useTranslation} from "react-i18next";
import {copyText} from "../../utils/copyText.js";

export default function CopyButton({ text, size = 14 }) {
  const {showToast} = useToast();
  const {t} = useTranslation();
  return (
    <IconButton onClick={async () => { try { await copyText(text); showToast({message: t('common.toast.copied'), type: 'success'}); } catch (err) { console.error('复制失败:', err); } }} size="small" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </IconButton>
  );
}
