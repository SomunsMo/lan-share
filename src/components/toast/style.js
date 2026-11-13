import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const toastIn = keyframes`
  from { opacity: 0; transform: translate3d(100%, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const toastOut = keyframes`
  from { opacity: 1; transform: translate3d(0, 0, 0); }
  to   { opacity: 0; transform: translate3d(100%, 0, 0); }
`;

const BAR_COLORS = {
  success: 'var(--success)',
  error:   'var(--error)',
  warning: 'var(--secondary)',
  info:    'var(--primary)',
};

export const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 16px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  pointer-events: none;
  max-width: 90vw;
`;

export const ToastItemOuter = styled.div`
  overflow: ${props => props.$exiting ? 'hidden' : 'visible'};
  transition: height var(--dur-mid) var(--ease-exit), margin-bottom var(--dur-mid) var(--ease-exit);
  height: ${props => props.$exiting ? '0px' : props.$height ? `${props.$height}px` : 'auto'};
  /* 容器不再用 gap：退场时 margin 一起收，剩余 toast 不会在卸载瞬间跳一下 */
  margin-bottom: ${props => props.$exiting ? '0px' : '8px'};
  pointer-events: auto;
`;

export const ToastItemInner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: var(--surface-container-lowest);
  border: var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  min-width: 300px;
  animation: ${props => props.$exiting ? toastOut : toastIn} var(--dur-mid) ${props => props.$exiting ? 'var(--ease-exit)' : 'var(--ease-enter)'} forwards;
  backface-visibility: hidden;
  will-change: transform;
`;

export const ToastBar = styled.div`
  width: 3px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
  background: ${props => BAR_COLORS[props.$type] || 'var(--primary)'};
`;

export const ToastMessage = styled.span`
  flex: 1;
  font-family: var(--font-label);
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface);
`;

export const ToastCloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  color: var(--on-surface-variant);
  border-radius: var(--radius-sm);
  transition: background var(--dur-fast) var(--ease);

  &:hover {
    background: var(--surface-container);
  }
`;
