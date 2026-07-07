import styled from "@emotion/styled";

const ProgressBarStyle = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 10px;

  .progress-container {
    max-width: 480px;
    margin: 0 auto;
  }

  .progress-item {
    margin-bottom: 8px;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    box-shadow: var(--shadow-md);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .progress-title {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-percent {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background-color: var(--bg-progress);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: var(--success);
    border-radius: 3px;
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    font-size: 0;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: 4px;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-tertiary);
    font-size: 14px;
    padding: 2px 5px;
    margin-left: 8px;
  }

  .close-btn:hover {
    color: var(--danger);
  }
`;

export default ProgressBarStyle;
