import React, { useRef, useState, useLayoutEffect } from 'react';

// 对话框内图片：按对话框内容区可用高度等比缩放
// 规则：超大图缩小至可显示区域内完整显示；小于可显示区域的图片保持原尺寸不放大；不提供手动缩放
export default function DialogImage({ src, alt, borderRadius = '4px', wrapperStyle }) {
    const wrapperRef = useRef(null);
    const imgRef = useRef(null);
    const [maxH, setMaxH] = useState(0);
    const maxHRef = useRef(0);

    useLayoutEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const content = wrapper.closest('.MuiDialogContent-root');
        if (!content) return;

        const compute = () => {
            const paper = content.closest('.MuiDialog-paper') || content.parentElement;
            // paper 最大高度（MUI 默认 calc(100% - 64px)），优先取计算后的像素值
            let paperMaxH = window.innerHeight - 64;
            if (paper) {
                const paperMaxStyle = getComputedStyle(paper).maxHeight;
                if (paperMaxStyle && paperMaxStyle.endsWith('px')) {
                    paperMaxH = parseFloat(paperMaxStyle);
                }
            }
            // 标题区与按钮区高度
            const titleEl = paper && paper.querySelector('.MuiDialogTitle-root');
            const actionsEl = paper && paper.querySelector('.MuiDialogActions-root');
            const titleH = titleEl ? titleEl.getBoundingClientRect().height : 0;
            const actionsH = actionsEl ? actionsEl.getBoundingClientRect().height : 0;
            // content 内容区最大可用高度
            const cs = getComputedStyle(content);
            const paddingTop = parseFloat(cs.paddingTop) || 0;
            const paddingBottom = parseFloat(cs.paddingBottom) || 0;
            const contentMaxH = paperMaxH - titleH - actionsH;
            // 图片上方内容高度
            const contentRect = content.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            const above = Math.max(0, wrapperRect.top - contentRect.top - paddingTop);
            // 图片下方同级兄弟高度（如粘贴预览的文件名输入框）
            let topChild = wrapper;
            while (topChild.parentElement && topChild.parentElement !== content) {
                topChild = topChild.parentElement;
            }
            let following = 0;
            let sib = topChild.nextElementSibling;
            while (sib) {
                following += sib.getBoundingClientRect().height;
                sib = sib.nextElementSibling;
            }
            const available = contentMaxH - paddingTop - paddingBottom - above - following;
            if (available > 0 && Math.abs(available - maxHRef.current) > 1) {
                maxHRef.current = available;
                setMaxH(available);
            }
        };

        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(content);
        window.addEventListener('resize', compute);
        const img = imgRef.current;
        if (img && !img.complete) {
            img.addEventListener('load', compute);
        }
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', compute);
            if (img) img.removeEventListener('load', compute);
        };
    }, [src]);

    return (
        <div ref={wrapperRef} style={{ textAlign: 'center', minHeight: 0, ...(wrapperStyle || {}) }}>
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                style={{ maxWidth: '100%', maxHeight: maxH > 0 ? maxH + 'px' : '60vh', objectFit: 'contain', borderRadius, verticalAlign: 'middle' }}
            />
        </div>
    );
}
