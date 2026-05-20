import React from 'react';
import ProgressBarStyle from './ProgressBarStyle.js';

const ProgressBar = ({ progresses = [], onClose }) => {
  return (
    <ProgressBarStyle>
      <div className="progress-container">
        {progresses.map((progress) => (
          <div key={progress.id} className="progress-item">
            <div className="progress-header">
              <span className="progress-title">{progress.title}</span>
              <div>
                <span className="progress-percent">{progress.percent}%</span>
                {onClose && (
                  <button 
                    className="close-btn" 
                    onClick={() => onClose(progress.id)}
                    title="关闭进度条"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress.percent}%` }}
              >
                {progress.percent}%
              </div>
            </div>
            <div className="progress-info">
              <span>{progress.description || ''}</span>
              <span>{progress.status || '进行中...'}</span>
            </div>
          </div>
        ))}
      </div>
    </ProgressBarStyle>
  );
};

export default ProgressBar;