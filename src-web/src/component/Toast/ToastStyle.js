import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const toastIn = keyframes`
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
`;

const toastOut = keyframes`
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(100%); }
`;

const BAR_COLORS = {
  success: 'var(--success)',
  error:   'var(--danger)',
  warning: '#f59e0b',
  info:    'var(--text-accent)',
};

export const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 16px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
  max-width: 90vw;
`;

export const ToastItemOuter = styled.div`
  overflow: ${props => props.$exiting ? 'hidden' : 'visible'};
  transition: height 0.25s ease, margin 0.25s ease;
  height: ${props => props.$exiting ? '0px' : props.$height ? `${props.$height}px` : 'auto'};
  margin-bottom: ${props => props.$exiting ? '0px' : '0'};
  pointer-events: auto;
`;

export const ToastItemInner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  min-width: 300px;
  animation: ${props => props.$exiting ? toastOut : toastIn} 0.2s ease forwards;
`;

export const ToastBar = styled.div`
  width: 3px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
  background: ${props => BAR_COLORS[props.$type] || 'var(--text-accent)'};
`;

export const ToastMessage = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
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
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;

  &&:hover {
    background: var(--bg-hover);
  }
`;
