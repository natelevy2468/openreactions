/**
 * Bond Creation Features Demo
 * Demonstrates the enhanced bond and vertex creation capabilities
 */

import React, { useState, useCallback } from 'react';
import BondCreationToolbar from '../components/BondCreationToolbar.jsx';
import { 
  handleEnhancedBondCreation, 
  validateEntireStructure,
  toggleBondCreationFeature 
} from '../handlers/EnhancedClickHandlers.js';

const BondCreationDemo = () => {
  // Demo state
  const [bondCreationMode, setBondCreationMode] = useState('standard');
  const [showValidationWarnings, setShowValidationWarnings] = useState(false);
  const [demoVertices, setDemoVertices] = useState([
    { x: 100, y: 100, isOffGrid: false },
    { x: 150, y: 100, isOffGrid: false },
    { x: 200, y: 100, isOffGrid: false }
  ]);
  const [demoSegments, setDemoSegments] = useState([
    { x1: 100, y1: 100, x2: 150, y2: 100, bondOrder: 1, bondType: null, direction: 0 },
    { x1: 150, y1: 100, x2: 200, y2: 100, bondOrder: 2, bondType: null, direction: 0 }
  ]);
  const [notifications, setNotifications] = useState([]);

  // Mock actions for demo
  const mockActions = {
    setVertices: setDemoVertices,
    setSegments: setDemoSegments,
    setBondCreationMode,
    setShowValidationWarnings,
    setBondPreviews: () => {},
    captureState: () => {},
    findClosestGridVertex: () => null,
    showNotification: (message, type) => {
      const notification = { 
        id: Date.now(), 
        message, 
        type, 
        timestamp: new Date().toLocaleTimeString() 
      };
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    }
  };

  const handleModeChange = useCallback((newMode) => {
    setBondCreationMode(newMode);
    mockActions.showNotification(`Bond creation mode: ${newMode}`, 'info');
  }, []);

  const handleValidationToggle = useCallback((enabled) => {
    setShowValidationWarnings(enabled);
    mockActions.showNotification(
      `Validation warnings ${enabled ? 'enabled' : 'disabled'}`, 
      'info'
    );
  }, []);

  const handleValidateStructure = useCallback(() => {
    const mockState = {
      vertices: demoVertices,
      segments: demoSegments,
      vertexAtoms: {}
    };
    validateEntireStructure(mockState, mockActions);
  }, [demoVertices, demoSegments]);

  const handleClearPreviews = useCallback(() => {
    mockActions.showNotification('Bond previews cleared', 'info');
  }, []);

  return (
    <div className="bond-creation-demo">
      <div className="demo-header">
        <h2>Enhanced Bond Creation Features</h2>
        <p>This demo showcases the new intelligent bond and vertex creation capabilities.</p>
      </div>

      <div className="demo-toolbar">
        <BondCreationToolbar
          bondCreationMode={bondCreationMode}
          showValidationWarnings={showValidationWarnings}
          onModeChange={handleModeChange}
          onValidationToggle={handleValidationToggle}
          onValidateStructure={handleValidateStructure}
          onClearPreviews={handleClearPreviews}
        />
      </div>

      <div className="demo-content">
        <div className="feature-grid">
          <div className="feature-card">
            <h3>🎯 Smart Bond Previews</h3>
            <p>Automatically suggests optimal bond angles based on existing connections.</p>
            <ul>
              <li>120° tetrahedral geometry</li>
              <li>Avoids bond collisions</li>
              <li>Chemical accuracy</li>
            </ul>
          </div>

          <div className="feature-card">
            <h3>✅ Chemical Validation</h3>
            <p>Real-time validation of molecular structures against chemical rules.</p>
            <ul>
              <li>Bond count limits per atom</li>
              <li>Oversaturation detection</li>
              <li>Element-specific rules</li>
            </ul>
          </div>

          <div className="feature-card">
            <h3>🔧 Enhanced Creation</h3>
            <p>Improved bond and vertex creation with intelligent placement.</p>
            <ul>
              <li>Grid snapping preference</li>
              <li>Duplicate bond prevention</li>
              <li>Ring formation detection</li>
            </ul>
          </div>

          <div className="feature-card">
            <h3>📊 Structure Analysis</h3>
            <p>Complete molecular structure validation and reporting.</p>
            <ul>
              <li>Connectivity analysis</li>
              <li>Geometric validation</li>
              <li>Warning system</li>
            </ul>
          </div>
        </div>

        <div className="demo-molecules">
          <h3>Demo Structure</h3>
          <div className="molecule-display">
            <svg width="300" height="200" viewBox="0 0 300 200">
              {/* Demo molecule rendering */}
              {demoSegments.map((segment, index) => (
                <g key={index}>
                  {segment.bondOrder === 1 && (
                    <line
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                      stroke="#333"
                      strokeWidth="2"
                    />
                  )}
                  {segment.bondOrder === 2 && (
                    <g>
                      <line
                        x1={segment.x1}
                        y1={segment.y1 - 3}
                        x2={segment.x2}
                        y2={segment.y2 - 3}
                        stroke="#333"
                        strokeWidth="2"
                      />
                      <line
                        x1={segment.x1}
                        y1={segment.y1 + 3}
                        x2={segment.x2}
                        y2={segment.y2 + 3}
                        stroke="#333"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </g>
              ))}
              {demoVertices.map((vertex, index) => (
                <circle
                  key={index}
                  cx={vertex.x}
                  cy={vertex.y}
                  r="4"
                  fill={vertex.isOffGrid ? "#e74c3c" : "#3498db"}
                  stroke="#333"
                  strokeWidth="1"
                />
              ))}
            </svg>
            <div className="molecule-legend">
              <span><span style={{color: '#3498db'}}>●</span> Grid vertices</span>
              <span><span style={{color: '#e74c3c'}}>●</span> Off-grid vertices</span>
            </div>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="notifications">
            <h4>Activity Log</h4>
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`notification notification-${notification.type}`}
              >
                <span className="timestamp">{notification.timestamp}</span>
                <span className="message">{notification.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .bond-creation-demo {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .demo-header h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .demo-header p {
          color: #7f8c8d;
          font-size: 16px;
        }

        .demo-toolbar {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .feature-card {
          padding: 20px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .feature-card h3 {
          margin: 0 0 12px 0;
          color: #2c3e50;
          font-size: 18px;
        }

        .feature-card p {
          margin: 0 0 12px 0;
          color: #555;
          line-height: 1.5;
        }

        .feature-card ul {
          margin: 0;
          padding-left: 20px;
          color: #666;
        }

        .feature-card li {
          margin-bottom: 4px;
        }

        .demo-molecules {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .demo-molecules h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
        }

        .molecule-display {
          text-align: center;
        }

        .molecule-legend {
          margin-top: 10px;
          display: flex;
          justify-content: center;
          gap: 20px;
          font-size: 14px;
          color: #666;
        }

        .notifications {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
        }

        .notifications h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
        }

        .notification {
          display: flex;
          gap: 10px;
          padding: 8px 12px;
          margin-bottom: 8px;
          border-radius: 4px;
          font-size: 14px;
        }

        .notification-info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .notification-warning {
          background: #fff3cd;
          color: #856404;
        }

        .notification-error {
          background: #f8d7da;
          color: #721c24;
        }

        .notification-success {
          background: #d4edda;
          color: #155724;
        }

        .timestamp {
          font-weight: 600;
          min-width: 80px;
        }

        .message {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default BondCreationDemo;
