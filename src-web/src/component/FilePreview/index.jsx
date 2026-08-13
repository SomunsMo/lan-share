import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {PreviewOverlay, PreviewCard, PreviewToolbar, PreviewTitle, PreviewActions, PreviewButton, PreviewFrame} from './FilePreviewStyle';

function FilePreview({url, title, onClose}) {
    const {t} = useTranslation();
    const [reloadKey, setReloadKey] = useState(0);

    // Esc 关闭
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <PreviewOverlay onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <PreviewCard>
                <PreviewToolbar>
                    <PreviewTitle title={title}>{title}</PreviewTitle>
                    <PreviewActions>
                        <PreviewButton data-testid="preview-refresh" onClick={() => setReloadKey(k => k + 1)}>{t('fileSharing.preview.refresh')}</PreviewButton>
                        <PreviewButton onClick={onClose}>{t('fileSharing.preview.close')}</PreviewButton>
                    </PreviewActions>
                </PreviewToolbar>
                <PreviewFrame key={reloadKey} src={url} title={title} />
            </PreviewCard>
        </PreviewOverlay>
    );
}

export default FilePreview;
