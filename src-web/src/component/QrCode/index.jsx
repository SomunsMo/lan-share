import React from 'react';
import {useTranslation} from "react-i18next";
import {QRCodeSVG} from "qrcode.react";
import {useDialog} from "../Dialog/useDialog.js";
import BarcodeIconSvg from "@/assets/icon/barcode.svg";

// 顶部二维码按钮：点击弹窗展示访问地址
export default function QrCodeButton({fgColor}) {
    const {t} = useTranslation();
    const {showDialog} = useDialog();

    const getQrCodeUrl = () => window.location.href.split('?')[0];

    const handleClick = () => {
        const url = getQrCodeUrl();
        showDialog({
            title: t('web.qrTitle'),
            content: (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '8px 0'}}>
                    <QRCodeSVG value={url} size={180} fgColor={fgColor} bgColor={"transparent"}/>
                    <p style={{
                        margin: 0,
                        maxWidth: '260px',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        wordBreak: 'break-all',
                        userSelect: 'text'
                    }}>{url}</p>
                </div>
            ),
            buttons: [{label: 'common.button.close', value: false, primary: true}],
        });
    };

    return (
        <button className="qrIcon" onClick={handleClick} title={t('web.qrTitle')} aria-label={t('web.qrTitle')}>
            <img src={BarcodeIconSvg} alt="QR Code"/>
        </button>
    );
}