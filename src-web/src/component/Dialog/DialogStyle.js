import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

export const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: ${props => props.$zIndex || 9000};
  animation: ${fadeIn} 0.2s ease forwards;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const DialogCard = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 320px;
  max-width: 500px;
  width: 90vw;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  animation: ${scaleIn} 0.25s ease forwards;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${props => props.$exiting && `
    animation: none;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  `}

  @media (prefers-color-scheme: dark) {
    background: #2a2a2a;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }
`;

export const DialogHeader = styled.div`
  padding: 20px 24px 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;

  @media (prefers-color-scheme: dark) {
    color: #e5eaf3;
  }
`;

export const DialogBody = styled.div`
  padding: 0 24px 20px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  word-break: break-word;

  @media (prefers-color-scheme: dark) {
    color: #a3a6ad;
  }
`;

export const DialogInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  font-size: 14px;
  color: #303133;
  background: #ffffff;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #409eff;
  }

  @media (prefers-color-scheme: dark) {
    background: #1e1e1e;
    border-color: #4c4d4f;
    color: #e5eaf3;

    &:focus {
      border-color: #409eff;
    }
  }
`;

export const DialogFooter = styled.div`
  padding: 12px 24px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

export const DialogButton = styled.button`
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${props => props.$primary ? 'transparent' : '#dcdfe6'};
  background: ${props => props.$primary ? (props.$danger ? '#f56c6c' : '#409eff') : '#ffffff'};
  color: ${props => props.$primary ? '#ffffff' : '#606266'};

  &:hover {
    ${props => props.$primary
        ? (props.$danger
            ? 'background: #f78989;'
            : 'background: #66b1ff;')
        : 'background: #ecf5ff; color: #409eff; border-color: #c6e2ff;'
    }
  }

  @media (prefers-color-scheme: dark) {
    border-color: ${props => props.$primary ? 'transparent' : '#4c4d4f'};
    background: ${props => props.$primary ? (props.$danger ? '#f56c6c' : '#409eff') : '#2a2a2a'};
    color: ${props => props.$primary ? '#ffffff' : '#cfd3dc'};

    &:hover {
      ${props => props.$primary
        ? (props.$danger
            ? 'background: #f78989;'
            : 'background: #66b1ff;')
        : 'background: #333; color: #79bbff; border-color: #3a4a5a;'
    }
    }
  }
`;
