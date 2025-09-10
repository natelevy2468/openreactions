import React, { useState, useEffect } from 'react';
import logoFinal4 from '/logoFinal4.png';
import gearIcon from '/gear.png';
import MoleculeCanvas from './components/MoleculeCanvas';
import { drawingApi, apiUtils } from './services/api';

const UserInterface = () => {
  // UI State
  const [mode, setMode] = useState('draw');
  const [showAboutPopup, setShowAboutPopup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showAtomInput, setShowAtomInput] = useState(false);
  const [atomInputValue, setAtomInputValue] = useState('');
  
  // Backend Integration State
  const [currentMolecule, setCurrentMolecule] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Check backend connection on component mount
  useEffect(() => {
    const checkBackend = async () => {
      const connected = await apiUtils.checkConnection();
      setIsBackendConnected(connected);
      setStatusMessage(connected ? 'Backend connected' : 'Backend not available');
    };
    checkBackend();
  }, []);

  // Create new molecule when draw mode is activated
  const setModeAndClearSelection = async (newMode) => {
    setMode(newMode);
    
    if (newMode === 'draw' && isBackendConnected && !currentMolecule) {
      try {
        setIsLoading(true);
        setStatusMessage('Creating new molecule...');
        const molecule = await drawingApi.createNewMolecule('New Drawing');
        setCurrentMolecule(molecule);
        setStatusMessage(`Created molecule: ${molecule.name}`);
      } catch (error) {
        console.error('Failed to create molecule:', error);
        setStatusMessage('Failed to create new molecule');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Create sample molecule for testing
  const createSampleMolecule = async () => {
    if (!isBackendConnected) {
      setStatusMessage('Backend not connected');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Creating sample molecule...');
      const molecule = await apiUtils.createSampleMolecule();
      setCurrentMolecule(molecule);
      setStatusMessage(`Created sample molecule: ${molecule.name}`);
    } catch (error) {
      console.error('Failed to create sample molecule:', error);
      setStatusMessage('Failed to create sample molecule');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#fff',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      zIndex: 0
    }}>
      {/* Navigation Bar at the top */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        background: '#c4c4c4',
        borderBottom: '1px solid rgb(191, 191, 191)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '20px',
        paddingRight: '20px',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        justifyContent: 'space-between'
      }}>
        {/* Left side buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          marginTop: '3px'
        }}>
          <a
            href="https://openreactions.com/"
            style={{
              backgroundColor: 'transparent',
              color: '#333',
              textDecoration: 'none',
              border: 'none',
              padding: '10px 12px',
              marginRight: '2px',
              marginLeft: '-16px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '400',
              fontFamily: 'Roboto, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(54, 98, 227, 0.2)';
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.transform = 'scale(1)';
            }}
          >
            <img 
              src={logoFinal4} 
              alt="OpenReactions Logo" 
              style={{
                height: '38px',
                width: 'auto',
                pointerEvents: 'none',
                filter: 'hue-rotate(0deg) saturate(1.8) brightness(.8)'
              }}
              onError={(e) => {
                console.error('Logo failed to load:', e);
                e.target.style.display = 'none';
              }}
            />
            <span style={{ pointerEvents: 'none' }}>Home</span>
          </a>
          <div
            style={{
              backgroundColor: 'rgba(54, 98, 227, 0.7)',
              color: '#fff',
              border: 'none',
              padding: '10px 12px',
              marginRight: '2px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '400',
              fontFamily: 'Roboto, sans-serif',
            }}
          >
            Draw
          </div>
        </div>
        
        {/* Center title */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          marginTop: '3px'
        }}>
          <span style={{
            fontSize: '28px',
            fontWeight: '300',
            background: 'linear-gradient(135deg, #1042e8 0%, #7921f3 50%, #9C27B0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'Roboto, sans-serif',
            letterSpacing: '-0.5px'
          }}>
            OpenReactions
          </span>
        </div>
        
        {/* Right side buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginTop: '3px'
        }}>
          <button
            onClick={() => setShowAboutPopup(true)}
            style={{
              backgroundColor: 'transparent',
              color: '#333',
              textDecoration: 'none',
              border: 'none',
              padding: '10px 12px',
              marginRight: '2px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '400',
              fontFamily: 'Roboto, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.15s ease-out',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(54, 98, 227, 0.2)';
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.transform = 'scale(1)';
            }}
          >
            About
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              style={{
                backgroundColor: 'transparent',
                color: '#333',
                textDecoration: 'none',
                border: 'none',
                padding: '0px 0px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '400',
                fontFamily: 'Roboto, sans-serif',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Settings"
            >
              <img 
                src={gearIcon} 
                alt="Settings" 
                style={{
                  width: '50px',
                  height: '50px',
                  pointerEvents: 'none',
                  filter: 'brightness(0) saturate(100%) invert(27%) sepia(0%) saturate(1567%) hue-rotate(184deg) brightness(95%) contrast(87%)'
                }}
              />
            </button>
            {/* Settings Dropdown */}
            {showSettingsDropdown && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                backgroundColor: 'white',
                minWidth: '280px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                borderRadius: '8px',
                border: '1px solid #ddd',
                zIndex: 1000,
                marginTop: '8px',
                padding: '16px',
                fontSize: '14px',
                lineHeight: '1.4',
                fontFamily: 'Roboto, sans-serif',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '20px',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid white'
                }} />
                <div style={{
                  color: '#666',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Settings menu coming soon...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .toolbar-button {
          transition: all 0.15s ease-out;
        }
        
        .toolbar-button:hover {
          transform: scale(1.02);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Toolbar */}
      <div style={{
        width: 'min(240px, 22vw)',
        minWidth: '200px',
        maxWidth: '100vw',
        height: '100vh',
        background: '#f8f9fa',
        padding: 'calc(50px + 16px) 16px 16px 16px',
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
        border: '1px solid #e3e7eb',
        borderRight: '1px solid rgb(192, 192, 192)',
        zIndex: 2,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        touchAction: 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,0,0,0.2) transparent'
      }}>
        {/* Toolbar Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginBottom: 'calc(min(280px, 25vw) * 0.001)',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Create</div>
        
        {/* Draw/Mouse Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 0 }}>
          <button
            onClick={() => setModeAndClearSelection('draw')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'draw' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'draw' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Draw Mode"
          >
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 24 24" fill="none" stroke={mode === 'draw' ? '#fff' : '#666'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('mouse')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'mouse' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'mouse' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Mouse Mode"
          >
            <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
              <path d="M6 3L12 17L14.5 12.5L19 10.5L6 3Z" fill={mode === 'mouse' ? '#fff' : '#666'} stroke={mode === 'mouse' ? '#fff' : '#666'} strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Erase and Text mode buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 0, marginTop: 'max(2px, calc(min(280px, 25vw) * 0.006))' }}>
          <button
            onClick={() => setModeAndClearSelection('erase')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'erase' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'erase' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Erase Mode"
          >
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
              <g transform="rotate(45 13 13)">
                <rect x="6" y="10" width="14" height="6" rx="1.5" fill={mode === 'erase' ? '#fff' : '#666'} stroke={mode === 'erase' ? '#fff' : '#666'} strokeWidth="1.5"/>
                <line x1="13" y1="10" x2="13" y2="16" stroke={mode === 'erase' ? '#e9ecef' : '#f8f9fa'} strokeWidth="1.5"/>
              </g>
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('text')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'text' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'text' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Text Mode"
          >
            <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
              <text x="5" y="18" fill={mode === 'text' ? '#fff' : '#666'} style={{ font: 'bold 20px "Times New Roman", serif' }}>T</text>
            </svg>
          </button>
        </div>

        {/* Buttons for charges/lone pairs */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(2px, calc(min(280px, 25vw) * 0.006))' }}>
          <button
            onClick={() => setModeAndClearSelection('plus')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'plus' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'plus' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Add Positive Charge"
          >
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
              <circle cx="13" cy="13" r="9" stroke={mode === 'plus' ? '#fff' : '#666'} strokeWidth="2.2" fill="none" />
              <g stroke={mode === 'plus' ? '#fff' : '#666'} strokeWidth="2.2" strokeLinecap="round">
                <line x1="13" y1="8.5" x2="13" y2="17.5" />
                <line x1="8.5" y1="13" x2="17.5" y2="13" />
              </g>
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('minus')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'minus' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'minus' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Add Negative Charge"
          >
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
              <circle cx="13" cy="13" r="9" stroke={mode === 'minus' ? '#fff' : '#666'} strokeWidth="2.2" fill="none" />
              <line x1="8.5" y1="13" x2="17.5" y2="13" stroke={mode === 'minus' ? '#fff' : '#666'} strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('lone')}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'lone' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(240px, 22vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'lone' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Add Lone Pair"
          >
            <svg width="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" height="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" viewBox="0 0 22 22" fill="none" style={{ pointerEvents: 'none' }}>
              <circle cx="7" cy="11" r="2.6" fill={mode === 'lone' ? '#fff' : '#666'} />
              <circle cx="15" cy="11" r="2.6" fill={mode === 'lone' ? '#fff' : '#666'} />
            </svg>
          </button>
        </div>

        {/* Reactions Section Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(0px, min(calc(min(280px, 25vw) * 0.001), 0vh))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Reactions</div>

        {/* Arrow and Equilibrium Arrow Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          <button
            onClick={() => setModeAndClearSelection('arrow')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'arrow' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'arrow' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            title="Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <line x1="6" y1="13" x2="32" y2="13" stroke={mode === 'arrow' ? '#fff' : '#666'} strokeWidth="3" strokeLinecap="round" />
              <polygon points="32,7 44,13 32,19" fill={mode === 'arrow' ? '#fff' : '#666'} />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('equil')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'equil' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'equil' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            title="Equilibrium Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <line x1="8" y1="10" x2="34" y2="10" stroke={mode === 'equil' ? '#fff' : '#666'} strokeWidth="3" strokeLinecap="round" />
              <polygon points="34,5 44,10 34,15" fill={mode === 'equil' ? '#fff' : '#666'} />
              <line x1="38" y1="18" x2="12" y2="18" stroke={mode === 'equil' ? '#fff' : '#666'} strokeWidth="3" strokeLinecap="round" />
              <polygon points="12,13 2,18 12,23" fill={mode === 'equil' ? '#fff' : '#666'} />
            </svg>
          </button>
        </div>

        {/* Curved Arrow Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'max(4px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
          marginTop: '0px',
        }}>
          {/* Row 1 */}
          <button
            onClick={() => setModeAndClearSelection('curve2')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve2' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve2' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Counterclockwise semicircle (top left)"
          ><ArrowCCWSemicircleTopLeft mode={mode} /></button>
          
          <button
            onClick={() => setModeAndClearSelection('curve1')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve1' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve1' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise semicircle (top center)"
          ><ArrowCWSemicircleTopCenter mode={mode} /></button>
          
          <button
            onClick={() => setModeAndClearSelection('curve0')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve0' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve0' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise quarter-circle (top right)"
          ><ArrowCWQuarterTopRight mode={mode} /></button>

          {/* Row 2 */}
          <button
            onClick={() => setModeAndClearSelection('curve5')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve5' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve5' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Counterclockwise semicircle (bottom left)"
          ><ArrowCCWSemicircleBottomLeft mode={mode} /></button>
          
          <button
            onClick={() => setModeAndClearSelection('curve4')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve4' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve4' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise semicircle (bottom center)"
          ><ArrowCWSemicircleBottomCenter mode={mode} /></button>
          
          <button
            onClick={() => setModeAndClearSelection('curve3')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve3' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve3' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise quarter-circle (bottom right)"
          ><ArrowCWQuarterBottomRight mode={mode} /></button>
        </div>

        {/* Stereochemistry Section */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(8px, calc(min(280px, 25vw) * 0.03))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Stereochemistry</div>

        {/* Stereochemistry buttons - wedge, dash, ambiguous */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          <button
            onClick={() => setModeAndClearSelection('wedge')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'wedge' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'wedge' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            title="Wedge Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <polygon points="6,13 38,6 38,20" fill={mode === 'wedge' ? '#fff' : '#666'} />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('dash')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'dash' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'dash' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            title="Dash Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Updated dash bond icon to better reflect actual appearance with perpendicular lines that get progressively wider */}
              <g transform="translate(6, 13)">
                <line x1="0" y1="0" x2="32" y2="0" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="1" strokeOpacity="0" />
                <line x1="3" y1="-1" x2="3" y2="1" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="-2" x2="9" y2="2" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
                <line x1="15" y1="-3" x2="15" y2="3" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="-4" x2="21" y2="4" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
                <line x1="27" y1="-5" x2="27" y2="5" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
                <line x1="33" y1="-6" x2="33" y2="6" stroke={mode === 'dash' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('ambiguous')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'ambiguous' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'ambiguous' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            title="Ambiguous Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <path
                d=" M 4 13 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0"
                stroke={mode === 'ambiguous' ? '#fff' : '#666'}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                />
            </svg>
          </button>
        </div>

        {/* Presets Section */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(8px, calc(min(280px, 25vw) * 0.03))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Presets</div>

        {/* Preset buttons in 2x4 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 'max(4px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
          marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))',
        }}>
          {/* Triple Bond Button */}
          <button
            onClick={() => setModeAndClearSelection('triple-bond')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'triple-bond' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'triple-bond' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            title="Triple Bond"
          >
            <svg width="max(24px, min(32px, calc(min(280px, 25vw) * 0.114)))" height="max(14px, min(18px, calc(min(280px, 25vw) * 0.064)))" viewBox="0 0 32 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Triple bond - three parallel lines (smaller) */}
              <line x1="4" y1="5" x2="28" y2="5" stroke={mode === 'triple-bond' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="9" x2="28" y2="9" stroke={mode === 'triple-bond' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="13" x2="28" y2="13" stroke={mode === 'triple-bond' ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Benzene preset button */}
          <button
            onClick={() => setModeAndClearSelection('benzene')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'benzene' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'benzene' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            title="Benzene Ring"
          >
            {/* Benzene ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Benzene ring structure with alternating single/double bonds */}
              <g transform="translate(60, 60)">
                {/* Bond 0: Double bond (top-right) */}
                <g>
                  <line x1="40" y1="-10" x2="80" y2="12" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="42" y1="8" x2="66" y2="22" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 1: Single bond (right) */}
                <line x1="80" y1="12" x2="80" y2="60" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 2: Double bond (bottom-right) */}
                <g>
                  <line x1="80" y1="60" x2="40" y2="82" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="66" y1="52" x2="44" y2="65" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 3: Single bond (bottom-left) */}
                <line x1="40" y1="82" x2="0" y2="60" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 4: Double bond (left) */}
                <g>
                  <line x1="0" y1="60" x2="0" y2="12" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="14" y1="50" x2="14" y2="21" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 5: Single bond (top-left) */}
                <line x1="0" y1="12" x2="40" y2="-10" stroke={mode === 'benzene' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclohexane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclohexane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclohexane' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclohexane' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            title="Cyclohexane Ring"
          >
            {/* Cyclohexane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclohexane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in hexagon pattern */}
                <line x1="40" y1="-10" x2="80" y2="12" stroke={mode === 'cyclohexane' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="12" x2="80" y2="60" stroke={mode === 'cyclohexane' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="60" x2="40" y2="82" stroke={mode === 'cyclohexane' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                <line x1="40" y1="82" x2="0" y2="60" stroke={mode === 'cyclohexane' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="60" x2="0" y2="12" stroke={mode === 'cyclohexane' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="12" x2="40" y2="-10" stroke={mode === 'cyclohexane' ? '#fff' : '#666'} strokeWidth="7" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclopentane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclopentane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclopentane' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclopentane' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            title="Cyclopentane Ring"
          >
            {/* Cyclopentane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclopentane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in pentagon pattern */}
                <line x1="40" y1="0" x2="80" y2="30" stroke={mode === 'cyclopentane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="30" x2="66" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="66" y1="80" x2="20" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="30" x2="16" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="40" y1="0" x2="0" y2="30" stroke={mode === 'cyclopentane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclobutane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclobutane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclobutane' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclobutane' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            title="Cyclobutane Ring"
          >
            {/* Cyclobutane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclobutane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in square pattern */}
                <line x1="0" y1="0" x2="80" y2="0" stroke={mode === 'cyclobutane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="0" x2="80" y2="80" stroke={mode === 'cyclobutane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="80" x2="0" y2="80" stroke={mode === 'cyclobutane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="0" y2="0" stroke={mode === 'cyclobutane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclopropane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclopropane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclopropane' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclopropane' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            title="Cyclopropane Ring"
          >
            {/* Cyclopropane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclopropane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in triangle pattern */}
                <line x1="80" y1="80" x2="40" y2="0" stroke={mode === 'cyclopropane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="80" y2="80" stroke={mode === 'cyclopropane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="40" y2="0" stroke={mode === 'cyclopropane' ? '#fff' : '#666'} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Chair Conformation preset button */}
          <button
            onClick={() => setModeAndClearSelection('chair')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'chair' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'chair' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            title="Chair Conformation"
          >
            {/* Chair conformation SVG preview */}
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Proper chair with 3 sets of parallel lines */}
              <g stroke={mode === 'chair' ? '#fff' : '#666'} strokeWidth="1.4" fill="none" strokeLinecap="round">
                {/* Chair shape: bottom flat, then up-slants, top flat, then down-slants */}
                <path d="M3 11 L9 11 L12 7 L10 4 L4 4 L1 7 Z"/>
              </g>
            </svg>
          </button>
          
          <button
            onClick={() => setModeAndClearSelection('preset-8')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'preset-8' ? 'rgb(54,98,227)' : '#e9ecef',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'preset-8' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              color: mode === 'preset-8' ? '#fff' : '#666',
              fontSize: 'max(10px, min(14px, calc(min(280px, 25vw) * 0.05)))',
              fontWeight: '600',
            }}
            title="Coming Soon"
          >
            8
          </button>
        </div>

        <div style={{ flex: 1, minHeight: '20px' }} />
        
        {/* Undo and Erase All Buttons Side by Side */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 'max(6px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))' }}>
          {/* Erase All Button (Left) */}
          <button
            onClick={() => console.log('Erase all clicked')}
            className="toolbar-button"
            style={{
              flex: 1,
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: '#e9ecef',
              color: '#333',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.025)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
              fontWeight: 700,
              marginTop: 0,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'max(6px, calc(min(280px, 25vw) * 0.025))',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc3545';
              e.target.style.color = '#fff';
              e.target.style.boxShadow = '0 6px 16px rgba(220,53,69,0.4), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.color = '#333';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            {/* Taller Trash Can SVG */}
            <svg width="max(20px, calc(min(280px, 25vw) * 0.081))" height="max(24px, calc(min(280px, 25vw) * 0.094))" viewBox="0 0 26 30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <rect x="4" y="8" width="18" height="18" rx="2.5"/>
              <path d="M9 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/>
              <line x1="11" y1="13" x2="11" y2="22"/>
              <line x1="15" y1="13" x2="15" y2="22"/>
            </svg>
            Erase All
          </button>
          
          {/* Undo Button (Right) */}
          <button
            onClick={() => console.log('Undo clicked')}
            className="toolbar-button"
            style={{
              flex: 1,
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: '#e9ecef',
              color: '#333',
              border: '1px solid #e3e7eb',
              borderRadius: 'calc(min(280px, 25vw) * 0.025)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
              fontWeight: 700,
              marginTop: 0,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'max(6px, calc(min(280px, 25vw) * 0.025))',
              opacity: 1,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#ffc107';
              e.target.style.color = '#000';
              e.target.style.boxShadow = '0 6px 16px rgba(255,193,7,0.4), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.color = '#333';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
            title="Undo"
          >
            {/* Undo SVG */}
            <svg width="max(20px, calc(min(280px, 25vw) * 0.081))" height="max(20px, calc(min(280px, 25vw) * 0.081))" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
            Undo
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div style={{
        marginLeft: 'min(240px, 22vw)',
        marginTop: '50px',
        width: 'calc(100vw - min(240px, 22vw))',
        height: 'calc(100vh - 50px)',
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Status Bar */}
        <div style={{
          height: '40px',
          background: isBackendConnected ? '#e8f5e8' : '#ffe8e8',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: isBackendConnected ? '#4caf50' : '#f44336'
            }} />
            <span>{statusMessage}</span>
            {currentMolecule && (
              <span style={{ color: '#666' }}>
                | Current: {currentMolecule.name} (ID: {currentMolecule.id})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isBackendConnected && (
              <button
                onClick={createSampleMolecule}
                disabled={isLoading}
                style={{
                  padding: '4px 12px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Loading...' : 'Create Sample'}
              </button>
            )}
          </div>
        </div>

        {/* Canvas Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          {currentMolecule ? (
            <MoleculeCanvas 
              moleculeId={currentMolecule.id}
              width={Math.min(800, window.innerWidth - 300)}
              height={Math.min(600, window.innerHeight - 200)}
            />
          ) : (
            <div style={{
              width: '400px',
              height: '300px',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '12px' }}>
                {isBackendConnected ? 'No molecule loaded' : 'Backend not connected'}
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                {isBackendConnected ? (
                  <>
                    Click "Draw Mode" to create a new molecule<br/>
                    or use "Create Sample" to load a test molecule
                  </>
                ) : (
                  <>
                    Make sure the Java backend is running<br/>
                    on localhost:8080
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        

         {/* Bottom Right Toolbar - Export */}
         <div style={{
           position: 'fixed',
           bottom: '20px',
           right: '20px',
           display: 'flex',
           flexDirection: 'column',
           gap: '8px',
           zIndex: 3,
           transition: 'bottom 0.3s ease'
         }}>
           <button
             onClick={() => console.log('Export clicked')}
             className="toolbar-button"
             style={{
               width: '80px',
               height: '36px',
               backgroundColor: '#e9ecef',
               border: '1px solid #e3e7eb',
               borderRadius: '6px',
               cursor: 'pointer',
               boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
               outline: 'none',
               padding: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               fontSize: '14px',
               fontWeight: '600',
               color: '#333',
               fontFamily: 'Roboto, sans-serif',
               transition: 'all 0.2s ease',
             }}
             title="Export"
             onMouseEnter={(e) => {
               e.target.style.backgroundColor = '#dee2e6';
               e.target.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
             }}
             onMouseLeave={(e) => {
               e.target.style.backgroundColor = '#e9ecef';
               e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
             }}
           >
             Export
           </button>
         </div>
      </div>

      {/* About Popup */}
      {showAboutPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '8px',
            maxWidth: '500px',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontFamily: 'Roboto, sans-serif' }}>About OpenReactions</h2>
            <p style={{ margin: '0 0 16px 0', fontFamily: 'Roboto, sans-serif', lineHeight: '1.5' }}>
              A molecular drawing application for creating chemical structures and reactions.
            </p>
            <button
              onClick={() => setShowAboutPopup(false)}
              style={{
                backgroundColor: 'rgb(54,98,227)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Roboto, sans-serif'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Atom Input Modal */}
      {showAtomInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            minWidth: '300px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontFamily: 'Roboto, sans-serif' }}>Enter Atom Symbol</h3>
            <input
              type="text"
              value={atomInputValue}
              onChange={(e) => setAtomInputValue(e.target.value)}
              placeholder="e.g., C, N, O, F, S..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'Roboto, sans-serif',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAtomInput(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Roboto, sans-serif'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Atom submitted:', atomInputValue);
                  setShowAtomInput(false);
                  setAtomInputValue('');
                }}
                style={{
                  backgroundColor: 'rgb(54,98,227)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Roboto, sans-serif'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Arrow SVG Components (unchanged from original)
function ArrowCCWSemicircleTopLeft({ mode }) {
  const color = mode === 'curve2' ? '#fff' : '#666';
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M14 34 A14 14 0 1 1 36 20" stroke={color} 
      strokeWidth="3.5" 
      fill="none" 
      strokeLinecap="round"/>
      <polygon points="29,20 43,20 36,28" fill={color}/>
    </svg>
  );
}

function ArrowCWSemicircleTopCenter({ mode }) {
  const color = mode === 'curve1' ? '#fff' : '#666';
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M12 24 A12 12 0 0 1 36 24" stroke={color}
      strokeWidth="3.5"
      fill="none"
      strokeLinecap="round"/>
      <polygon points="29,24 43,20 38,29" fill={color}/>
    </svg>
  );
}

function ArrowCWQuarterTopRight({ mode }) {
  const color = mode === 'curve0' ? '#fff' : '#666';
  return (
    <svg width="48" height="48" viewBox="0 6 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M10 32 A22 22 0 0 1 38 32" stroke={color}
       strokeWidth="3.5"
        fill="none"
       strokeLinecap="round"/>
      <polygon points="31,35 40,25 42,35" fill={color}/>
    </svg>
  );
}

function ArrowCCWSemicircleBottomLeft({ mode }) {
  const color = mode === 'curve5' ? '#fff' : '#666';
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <g transform="scale(1,-1) translate(0,-45)">
        <path d="M14 34 A14 14 0 1 1 36 20" 
          stroke={color}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"/>
        <polygon points="29,20 43,20 36,28" fill={color}/>
      </g>
    </svg>
  );
}

function ArrowCWSemicircleBottomCenter({ mode }) {
  const color = mode === 'curve4' ? '#fff' : '#666';
  return (
    <svg width="48" height="48" viewBox="0 4 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M12 24 A12 12 0 0 0 36 24"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      <polygon points="29,24 38,19 42,28" fill={color}/>
    </svg>
  );
}

function ArrowCWQuarterBottomRight({ mode }) {
  const color = mode === 'curve3' ? '#fff' : '#666';
  return (
    <svg width="48" height="48" viewBox="0 15 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M10 38 A22 22 0 0 0 38 38"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      <polygon points="33,33 43,43 43,33" fill={color}/>
    </svg>
  );
}

export default UserInterface;