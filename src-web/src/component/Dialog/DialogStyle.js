import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
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
  background-color: rgba(0, 0, 0, 0.4);
  z-index: ${props => props.$zIndex || 9000};
  animation: ${fadeIn} 0.15s ease forwards;
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
  max-width: 480px;
  width: 90vw;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  animation: ${scaleIn} 0.2s ease forwards;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${props => props.$exiting && `
    animation: none;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
    transition: opacity 0.15s ease, transform 0.15s ease;
  `}
`;

export const DialogHeader = styled.div`
  padding: 18px 22px 8px;
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--text-primary);
`;

export const DialogBody = styled.div`
  padding: 0 22px 16px;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
`;

export const DialogInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  margin-top: 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border-input);
  font-size: 0.82rem;
  color: var(--text-primary);
  background: var(--bg-input);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--accent);
  }
`;

export const DialogFooter = styled.div`
  padding: 8px 22px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const DialogButton = styled.button`
  padding: 7px 18px;
  border-radius: var(--radius);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  border: 1px solid ${props => props.$primary ? 'transparent' : 'var(--border)'};
  background: ${props => props.$primary ? (props.$danger ? 'var(--danger)' : 'var(--accent)') : 'transparent'};
  color: ${props => props.$primary ? 'var(--text-accent)' : 'var(--text-primary)'};

  &:hover {
    ${props => props.$primary
        ? 'opacity: 0.85;'
        : 'background: var(--bg-hover);'
    }
  }
`;
