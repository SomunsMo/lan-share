import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

export const PreviewOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.15s ease forwards;
`;

export const PreviewCard = styled.div`
  width: min(80vw, 1200px);
  height: 85vh;
  max-width: 95vw;
  background: var(--bg-card);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${scaleIn} 0.15s ease forwards;
`;

export const PreviewToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  border-bottom: 1px solid var(--border);
  flex: none;
`;

export const PreviewTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PreviewActions = styled.div`
  display: flex;
  gap: 8px;
  flex: none;
  margin-left: 12px;
`;

export const PreviewButton = styled.button`
  border: 1px solid var(--border);
  background: transparent;
  color: var(--accent);
  border-radius: var(--radius);
  padding: 3px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  &:hover {
    background-color: var(--bg-hover);
    border-color: var(--accent);
  }
`;

export const PreviewFrame = styled.iframe`
  flex: 1;
  width: 100%;
  border: 0;
  background: var(--bg-card);
`;
