import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {PreviewOverlay, PreviewCard, PreviewToolbar, PreviewTitle, PreviewActions, PreviewButton, PreviewFrame} from './FilePreviewStyle';
import TextPreview from './TextPreview';
import ImagePreview from './ImagePreview';
import AudioPreview from './AudioPreview';
import ExcelPreview from './ExcelPreview';

function FilePreview({url, title, type = 'pdf', onClose}) {
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

    // 预览期间锁定主页面：禁止缩放并重置视口，同时锁定根元素滚动（遮罩上的滚轮/触摸
    // 不再控制父页面）；关闭时全部恢复
    useEffect(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        const originalContent = meta ? meta.getAttribute('content') : null;
        const html = document.documentElement;
        const originalOverflow = html.style.overflow;
        if (meta) {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
        html.style.overflow = 'hidden';
        return () => {
            if (meta) meta.setAttribute('content', originalContent);
            html.style.overflow = originalOverflow;
        };
    }, []);

    const renderBody = () => {
        switch (type) {
            case 'text':
                return <TextPreview url={url} />;
            case 'image':
                return <ImagePreview url={url} reloadKey={reloadKey} />;
            case 'audio':
                return <AudioPreview url={url} reloadKey={reloadKey} />;
            case 'excel':
                return <ExcelPreview url={url} reloadKey={reloadKey} />;
            case 'pdf':
            default:
                return <PreviewFrame key={reloadKey} src={url} title={title} />;
        }
    };

    return (
        <PreviewOverlay onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <PreviewCard>
                <PreviewToolbar>
                    <PreviewTitle title={title}>{title}</PreviewTitle>
                    <PreviewActions>
                        <PreviewButton data-testid="preview-refresh"
                                       onClick={() => setReloadKey(k => k + 1)}>{t('fileSharing.preview.refresh')}</PreviewButton>
                        <PreviewButton onClick={onClose}>{t('fileSharing.preview.close')}</PreviewButton>
                    </PreviewActions>
                </PreviewToolbar>
                {renderBody()}
            </PreviewCard>
        </PreviewOverlay>
    );
}

export default FilePreview;
