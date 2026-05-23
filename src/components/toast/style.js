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
  transition: height 0.3s ease, margin 0.3s ease;
  height: ${props => props.$collapsing ? '0px' : props.$height ? `${props.$height}px` : 'auto'};
  margin-bottom: ${props => props.$collapsing ? '0px' : '8px'};
  pointer-events: auto;
`;

export const ToastItemInner = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  min-width: 260px;
  max-width: 480px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: ${slideInDown} 0.3s ease forwards;
  background: ${props => {
    switch (props.$type) {
      case 'success': return '#f0f9eb';
      case 'error': return '#fef0f0';
      case 'warning': return '#fdf6ec';
      case 'info': default: return '#f0f5ff';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return '#e1f3d8';
      case 'error': return '#fde2e2';
      case 'warning': return '#faecd8';
      case 'info': default: return '#d9e8ff';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#529b2e';
      case 'error': return '#c45656';
      case 'warning': return '#b88230';
      case 'info': default: return '#337ecc';
    }
  }};
  opacity: ${props => props.$exiting ? 0 : 1};
  transform: ${props => props.$exiting ? 'translateY(-20px)' : 'translateY(0)'};
  transition: opacity 0.3s ease, transform 0.3s ease;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;

  @media (prefers-color-scheme: dark) {
    background: ${props => {
      switch (props.$type) {
        case 'success': return '#1a3a1a';
        case 'error': return '#3a1a1a';
        case 'warning': return '#3a2a1a';
        case 'info': default: return '#1a2a3a';
      }
    }};
    border-color: ${props => {
      switch (props.$type) {
        case 'success': return '#2a5a2a';
        case 'error': return '#5a2a2a';
        case 'warning': return '#5a3a2a';
        case 'info': default: return '#2a3a5a';
      }
    }};
    color: ${props => {
      switch (props.$type) {
        case 'success': return '#95d475';
        case 'error': return '#f89898';
        case 'warning': return '#eebe77';
        case 'info': default: return '#79bbff';
      }
    }};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
`;

export const ToastIcon = styled.span`
  margin-right: 8px;
  font-size: 16px;
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
  transition: opacity 0.2s, background 0.2s;
  border-radius: 4px;

  &&:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.06);
  }
`;
