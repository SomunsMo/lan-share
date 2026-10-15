import styled from "@emotion/styled";

export const ImagePreviewRoot = styled.div`
  flex: 1;
  overflow: hidden;
  background: var(--bg-page);
  position: relative;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  &:active { cursor: grabbing; }
`;

export const ImagePreviewImg = styled.img`
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  transform-origin: center;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
  will-change: transform;
`;

export const ImagePreviewReset = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  &:hover { background: rgba(0, 0, 0, 0.6); }
`;

export const ImagePreviewStatus = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
`;