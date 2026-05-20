import styled from "styled-components";

const ProgressBarStyle = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 10px;
  
  .progress-container {
    margin-bottom: 8px;
    background-color: #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .progress-item {
    margin-bottom: 10px;
    background-color: white;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }

  .progress-title {
    font-weight: bold;
    color: #333;
    font-size: 14px;
  }

  .progress-percent {
    font-size: 12px;
    color: #666;
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background-color: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    border-radius: 10px;
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    font-weight: bold;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
    margin-top: 5px;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #999;
    font-size: 16px;
    padding: 2px 5px;
    margin-left: 10px;
  }

  .close-btn:hover {
    color: #ff4444;
  }
`;

export default ProgressBarStyle;