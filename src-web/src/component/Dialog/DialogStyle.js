import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
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
  width: calc(100vw - 32px);
  min-width: 280px;
  max-width: 900px;
  max-height: 85vh;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  animation: ${scaleIn} 0.2s ease forwards;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (min-width: 600px) {
    width: min(60vw, 600px);
    min-width: 400px;
  }
  @media (min-width: 900px) {
    width: min(50vw, 700px);
    min-width: 450px;
  }
  @media (min-width: 1200px) {
    width: min(45vw, 800px);
    min-width: 500px;
  }

  ${props => props.$exiting && `
    animation: none;
    opacity: 0;
    transform: scale(0.95);
    transition: opacity 0.15s ease, transform 0.15s ease;
  `}
`;

export const DialogHeader = styled.div`
  padding: 18px 22px 8px;
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
`;

export const DialogBody = styled.div`
  padding: 0 22px 16px;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
  flex-shrink: 0;
`;

export const DialogButton = styled.button`
  padding: 7px 18px;
  border-radius: var(--radius);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
  box-sizing: border-box;
  transition: border-color 0.15s, opacity 0.15s;
  border: 1px solid ${props => props.$primary ? 'transparent' : 'var(--border)'};
  background: ${props => props.$primary ? (props.$danger ? 'var(--danger)' : 'var(--accent)') : 'var(--bg-card)'};
  color: ${props => props.$primary ? 'var(--text-accent)' : 'var(--text-primary)'};

  &:hover {
    ${props => props.$primary
        ? 'opacity: 0.85;'
        : 'background: var(--bg-card) !important; border-color: var(--accent);'
    }
  }

  ${props => (props.$loading || props.$disabled) && `
    opacity: 0.5;
    pointer-events: none;
  `}
`;
