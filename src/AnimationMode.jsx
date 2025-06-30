import React, { useState } from 'react';

const AnimationMode = () => {
  const [animationMode, setAnimationMode] = useState('play'); // Default animation mode

  return (
    <>
      <style>{`
        .animation-toolbar-button {
          transition: all 0.15s ease-out;
        }
        
        .animation-toolbar-button:hover {
          transform: scale(1.02);
        }
      `}</style>
      
      {/* Animation Toolbar */}
      <div style={{
        width: 'min(240px, 22vw)',
        minWidth: '200px',
        maxWidth: '100vw',
        height: '100vh',
        background: 'linear-gradient(to bottom, rgb(19,26,38), rgb(15,40,30))',
        backgroundImage: `
          linear-gradient(45deg, rgba(255,255,255,0.015) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.015) 75%),
          linear-gradient(45deg, rgba(255,255,255,0.015) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.015) 75%),
          linear-gradient(to bottom, rgb(21,28,40), rgb(15,40,32))`,
        backgroundSize: 'calc(min(240px, 22vw) * 0.28) calc(min(240px, 22vw) * 0.28), calc(min(240px, 22vw) * 0.28) calc(min(240px, 22vw) * 0.28), 100% 100%',
        backgroundPosition: '0 0, calc(min(240px, 22vw) * 0.14) calc(min(240px, 22vw) * 0.14), 0 0',
        padding: 'calc(50px + 16px) 16px 16px 16px', // Top padding accounts for tab bar
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'max(8px, min(calc(min(240px, 22vw) * 0.031), 2vh))',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 0,
        boxShadow: 'none',
        border: 'none',
        borderRight: '2px solid #000',
        zIndex: 2,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        touchAction: 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.2) transparent'
      }}>
        {/* Animation Toolbar Title */}
        <div style={{
          color: '#888',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(240px, 22vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginBottom: 'calc(min(240px, 22vw) * 0.001)',
          textAlign: 'left',
          userSelect: 'none',
        }}>Animate</div>
        
        {/* Animation Controls */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(240px, 22vw) * 0.025))', marginBottom: 0 }}>
          <button
            onClick={() => setAnimationMode(animationMode === 'play' ? 'pause' : 'play')}
            className="animation-toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: animationMode === 'play' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(240px, 22vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: animationMode === 'play' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 3px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (animationMode !== 'play') {
                e.target.style.backgroundColor = '#3554a0';
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (animationMode !== 'play') {
                e.target.style.backgroundColor = '#23395d';
                e.target.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
              }
            }}
            title={animationMode === 'play' ? 'Pause Animation' : 'Play Animation'}
          >
            {/* Play/Pause Icon */}
            {animationMode === 'play' ? (
              // Pause icon (two vertical bars)
              <svg width="max(18px, min(26px, calc(min(240px, 22vw) * 0.093)))" height="max(18px, min(26px, calc(min(240px, 22vw) * 0.093)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                <rect x="8" y="6" width="2" height="12" fill="#fff" />
                <rect x="14" y="6" width="2" height="12" fill="#fff" />
              </svg>
            ) : (
              // Play icon (triangle)
              <svg width="max(18px, min(26px, calc(min(240px, 22vw) * 0.093)))" height="max(18px, min(26px, calc(min(240px, 22vw) * 0.093)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                <polygon points="8,6 8,18 18,12" fill="#fff" />
              </svg>
            )}
          </button>
        </div>
        
        <div style={{ flex: 1, minHeight: '20px' }} />
        
        {/* Coming Soon Message */}
        <div style={{
          color: '#888',
          fontSize: 'max(11px, min(calc(min(240px, 22vw) * 0.044), 2vh))',
          textAlign: 'center',
          marginBottom: 'max(6px, min(calc(min(240px, 22vw) * 0.025), 1.5vh))',
          fontStyle: 'italic',
          userSelect: 'none',
        }}>
          More animation features coming soon...
        </div>
      </div>
      
      {/* Animation Canvas Area */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: 'min(240px, 22vw)',
        right: 0,
        bottom: 0,
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: '600',
        color: '#666',
        fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
      }}>
        Animation workspace - Click play to start
      </div>
    </>
  );
};

export default AnimationMode; 