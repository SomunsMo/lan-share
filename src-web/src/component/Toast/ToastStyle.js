import styled, { keyframes } from 'styled-components';

const slideInDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  max-width: 90vw;
`;

export const ToastItemOuter = styled.div`
  overflow: ${props => props.$collapsing ? 'hidden' : 'visible'};
  transition: height 0.25s ease, margin 0.25s ease;
  height: ${props => props.$collapsing ? '0px' : props.$height ? `${props.$height}px` : 'auto'};
  margin-bottom: ${props => props.$collapsing ? '0px' : '6px'};
  pointer-events: auto;
`;

export const ToastItemInner = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  min-width: 260px;
  max-width: 480px;
  box-shadow: var(--shadow-md);
  animation: ${slideInDown} 0.25s ease forwards;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  opacity: ${props => props.$exiting ? 0 : 1};
  transform: ${props => props.$exiting ? 'translateY(-20px)' : 'translateY(0)'};
  transition: opacity 0.25s ease, transform 0.25s ease;
  font-size: 0.82rem;
  line-height: 1.5;
  word-break: break-word;
`;

export const ToastIcon = styled.span`
  margin-right: 8px;
  font-size: 15px;
  flex-shrink: 0;
  font-style: normal;
`;

export const ToastMessage = styled.span`
  flex: 1;
`;

export const ToastCloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 12px;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  opacity: 0.5;
  color: inherit;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, background 0.15s;
  border-radius: var(--radius);

  &&:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.06);
  }
`;
