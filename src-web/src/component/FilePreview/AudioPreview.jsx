import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AudioPreviewRoot, AudioPreviewBox, AudioPreviewStatus} from './AudioPreviewStyle';
import {PreviewButton} from './FilePreviewStyle';

function AudioPreview({url, reloadKey}) {
    const {t} = useTranslation();
    const [error, setError] = useState(false);

    if (error) {
        return (
            <AudioPreviewRoot>
                <AudioPreviewStatus>
                    {t('fileSharing.preview.audioFailed')}
                    <div style={{marginTop: 8}}>
                        <PreviewButton onClick={() => setError(false)}>{t('fileSharing.preview.refresh')}</PreviewButton>
                    </div>
                </AudioPreviewStatus>
            </AudioPreviewRoot>
        );
    }

    return (
        <AudioPreviewRoot>
            <AudioPreviewBox>
                <audio key={reloadKey} controls src={url} style={{width: '100%'}} onError={() => setError(true)} />
            </AudioPreviewBox>
        </AudioPreviewRoot>
    );
}

export default AudioPreview;