import styled from "@emotion/styled";

export const TextPreviewRoot = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-page);
`;

export const TextPreviewScroller = styled.div`
  flex: 1;
  overflow: auto;
  position: relative;
`;

export const TextPreviewSpacer = styled.div`
  height: ${p => p.totalHeight}px;
  position: relative;
  width: ${p => p.width}px;
  min-width: 100%;
`;

export const TextPreviewRow = styled.div`
  position: absolute;
  left: 0; right: 0;
  top: ${p => p.top}px;
  height: 22px;
  line-height: 22px;
  display: flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: ${p => (p.highlight ? '#fff3bf' : 'transparent')};
  cursor: text;
  &:hover { background: var(--bg-hover); }
  html.dark & {
    background: ${p => (p.highlight ? 'rgba(255, 243, 191, 0.16)' : 'transparent')};
  }
`;

export const TextPreviewLineNo = styled.div`
  flex: none;
  width: 56px;
  padding-right: 12px;
  text-align: right;
  color: var(--text-tertiary);
  user-select: none;
  border-right: 1px solid var(--border);
  background: var(--bg-page);
  overflow: hidden;
`;

export const TextPreviewLineText = styled.div`
  flex: 1;
  padding: 0 12px;
  white-space: pre;
  color: var(--text-primary);
`;

export const TextPreviewStatus = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
`;
