import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
    TextPreviewRoot, TextPreviewScroller, TextPreviewSpacer, TextPreviewRow,
    TextPreviewLineNo, TextPreviewLineText, TextPreviewStatus,
} from './TextPreviewStyle';
import {PreviewButton} from './FilePreviewStyle';

const LINE_HEIGHT = 22;
const OVERSCAN = 30;
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function TextPreview({url}) {
    const {t} = useTranslation();
    const [text, setText] = useState(null);
    const [error, setError] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [highlight, setHighlight] = useState(null);
    const [isTouch] = useState(isTouchDevice);
    const scrollerRef = useRef(null);

    const reload = useCallback(() => {
        setText(null);
        setError('');
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(String(res.status));
                return res.text();
            })
            .then(body => setText(body))
            .catch(err => setError(err.message || '加载失败'));
    }, [url]);

    useEffect(() => { reload(); }, [reload]);

    const lines = useMemo(() => (text == null ? [] : text.split('\n')), [text]);

    // 测量最长行宽度（canvas 匹配等宽字体，精确撑起横向滚动；一次性 O(n)）
    const maxLineWidth = useMemo(() => {
        if (lines.length === 0) return 0;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 0;
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        let max = 0;
        for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > max) max = w;
        }
        return Math.ceil(max);
    }, [lines]);
    // 行号列宽(56) + 内容左右 padding(12+12) + 最长行宽，不足视口时由 min-width:100% 兜底
    const spacerWidth = 56 + 24 + maxLineWidth;

    // 挂载/尺寸变化时采样滚动容器实际高度，避免首帧 viewportHeight=0 只渲染约 30 行
    const measureViewport = () => {
        const el = scrollerRef.current;
        if (el) setViewportHeight(el.clientHeight);
    };
    useLayoutEffect(() => {
        measureViewport();
        const ro = new ResizeObserver(measureViewport);
        if (scrollerRef.current) ro.observe(scrollerRef.current);
        return () => ro.disconnect();
    }, [text]);

    const start = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
    const end = Math.min(lines.length, start + Math.ceil(viewportHeight / LINE_HEIGHT) + OVERSCAN);
    const rows = useMemo(() => {
        const out = [];
        for (let i = start; i < end; i++) {
            out.push({
                index: i,
                top: i * LINE_HEIGHT,
                text: lines[i],
            });
        }
        return out;
    }, [start, end, lines]);

    // 触摸设备上点按行高亮（桌面用 onMouseMove）
    const handleTouch = (index) => {
        if (isTouch) setHighlight(index);
    };

    if (error) {
        return (
            <TextPreviewRoot>
                <TextPreviewStatus>
                    {t('fileSharing.preview.loadFailed')}
                    <div style={{marginTop: 8}}>
                        <PreviewButton onClick={reload}>{t('fileSharing.preview.refresh')}</PreviewButton>
                    </div>
                </TextPreviewStatus>
            </TextPreviewRoot>
        );
    }
    if (text == null) {
        return <TextPreviewRoot><TextPreviewStatus>{t('fileSharing.preview.loading')}</TextPreviewStatus></TextPreviewRoot>;
    }
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
        return <TextPreviewRoot><TextPreviewStatus>{t('fileSharing.preview.empty')}</TextPreviewStatus></TextPreviewRoot>;
    }

    // onScroll 同时采样 clientHeight 更新视口高度，保证首屏行数正确
    const handleScroll = (e) => {
        const el = e.currentTarget;
        setScrollTop(el.scrollTop);
        setViewportHeight(el.clientHeight);
    };

    return (
        <TextPreviewRoot>
            <TextPreviewScroller ref={scrollerRef} onScroll={handleScroll}>
                <TextPreviewSpacer totalHeight={lines.length * LINE_HEIGHT} width={spacerWidth}>
                    {rows.map(r => (
                        <TextPreviewRow
                            key={r.index}
                            top={r.top}
                            highlight={highlight === r.index}
                            onMouseMove={() => { if (!isTouch) setHighlight(r.index); }}
                            onTouchStart={() => handleTouch(r.index)}
                        >
                            <TextPreviewLineNo>{r.index + 1}</TextPreviewLineNo>
                            <TextPreviewLineText>{r.text}</TextPreviewLineText>
                        </TextPreviewRow>
                    ))}
                </TextPreviewSpacer>
            </TextPreviewScroller>
        </TextPreviewRoot>
    );
}

export default TextPreview;