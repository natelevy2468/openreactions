/**
 * Enhanced Bond Creation Toolbar
 * Provides UI controls for advanced bond and vertex creation features
 */

import React, { useState } from 'react';

const BondCreationToolbar = ({ 
  bondCreationMode = 'standard',
  showValidationWarnings = false,
  onModeChange,
  onValidationToggle,
  onValidateStructure,
  onClearPreviews,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bond-creation-toolbar ${className}`}>
      {/* Toggle button */}
      <button 
        className="toolbar-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Enhanced Bond Creation Tools"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Bond Tools
      </button>

      {/* Expanded toolbar */}
      {isExpanded && (
        <div className="toolbar-panel">
          <div className="toolbar-section">
            <h4>Creation Mode</h4>
            <div className="mode-selector">
              <label className="mode-option">
                <input
                  type="radio"
                  name="bondMode"
                  value="standard"
                  checked={bondCreationMode === 'standard'}
                  onChange={(e) => onModeChange(e.target.value)}
                />
                <span>Standard</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="bondMode"
                  value="smart"
                  checked={bondCreationMode === 'smart'}
                  onChange={(e) => onModeChange(e.target.value)}
                />
                <span>Smart Previews</span>
              </label>
            </div>
          </div>

          <div className="toolbar-section">
            <h4>Validation</h4>
            <label className="validation-toggle">
              <input
                type="checkbox"
                checked={showValidationWarnings}
                onChange={(e) => onValidationToggle(e.target.checked)}
              />
              <span>Show Warnings</span>
            </label>
          </div>

          <div className="toolbar-section">
            <h4>Actions</h4>
            <div className="action-buttons">
              <button 
                className="action-btn validate-btn"
                onClick={onValidateStructure}
                title="Validate entire molecular structure"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                Validate
              </button>
              <button 
                className="action-btn clear-btn"
                onClick={onClearPreviews}
                title="Clear bond previews"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.354 4.646a.5.5 0 00-.708 0L8 7.293 5.354 4.646a.5.5 0 10-.708.708L7.293 8l-2.647 2.646a.5.5 0 00.708.708L8 8.707l2.646 2.647a.5.5 0 00.708-.708L8.707 8l2.647-2.646a.5.5 0 000-.708z"/>
                </svg>
                Clear
              </button>
            </div>
          </div>

          <div className="toolbar-section">
            <h4>Help</h4>
            <div className="help-text">
              <p><strong>Standard:</strong> Basic bond creation</p>
              <p><strong>Smart:</strong> Intelligent bond angle suggestions</p>
              <p><strong>Validation:</strong> Chemical rule checking</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bond-creation-toolbar {
          position: relative;
          display: inline-block;
        }

        .toolbar-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #495057;
          transition: all 0.2s ease;
        }

        .toolbar-toggle:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .toolbar-panel {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 1000;
          width: 280px;
          padding: 16px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          margin-top: 4px;
        }

        .toolbar-section {
          margin-bottom: 16px;
        }

        .toolbar-section:last-child {
          margin-bottom: 0;
        }

        .toolbar-section h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #212529;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mode-selector {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mode-option {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .mode-option input[type="radio"] {
          margin: 0;
        }

        .validation-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .validation-toggle input[type="checkbox"] {
          margin: 0;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: #f8f9fa;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #e9ecef;
        }

        .validate-btn {
          color: #28a745;
          border-color: #28a745;
        }

        .validate-btn:hover {
          background: #d4edda;
        }

        .clear-btn {
          color: #dc3545;
          border-color: #dc3545;
        }

        .clear-btn:hover {
          background: #f8d7da;
        }

        .help-text {
          font-size: 11px;
          color: #6c757d;
          line-height: 1.4;
        }

        .help-text p {
          margin: 0 0 4px 0;
        }

        .help-text strong {
          color: #495057;
        }
      `}</style>
    </div>
  );
};

export default BondCreationToolbar;
