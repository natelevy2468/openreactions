// Keyboard event handlers

export const createEscapeKeyHandler = (
  curvedArrowStartPoint,
  isSelecting,
  setCurvedArrowStartPoint,
  setArrowPreview,
  setIsSelecting,
  setSelectionStart,
  setSelectionEnd,
  setOffset,
  canvasRef
) => {
  return (e) => {
    if (e.key === 'Escape') {
      if (curvedArrowStartPoint) {
        // Clear the curved arrow start point and preview
        setCurvedArrowStartPoint(null);
        setArrowPreview(null);
        
        // Show brief visual feedback that drawing was canceled
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          
          ctx.save();
          ctx.fillStyle = 'rgba(200,0,0,0.15)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          
          // Redraw after a short delay - the effect of setting state above 
          // will trigger a redraw via the useEffect for drawGrid
          setTimeout(() => {
            // Force redraw without using drawGrid directly
            setOffset(prev => ({...prev}));
          }, 150);
        }
      }
      
      if (isSelecting) {
        // Clear selection
        setIsSelecting(false);
        setSelectionStart({ x: 0, y: 0 });
        setSelectionEnd({ x: 0, y: 0 });
      }
    }
  };
};

export const createGeneralEscapeHandler = (
  showAtomInput,
  showAboutPopup,
  mode,
  selectedSegments,
  selectedVertices,
  selectedArrows,
  setShowAtomInput,
  setShowAboutPopup,
  clearSelection
) => {
  return (e) => {
    if (e.key === 'Escape' && showAtomInput) {
      setShowAtomInput(false);
    }
    if (e.key === 'Escape' && showAboutPopup) {
      setShowAboutPopup(false);
    }
    // Clear selection with escape key in mouse mode
    if (e.key === 'Escape' && mode === 'mouse' && (selectedSegments.size > 0 || selectedVertices.size > 0 || selectedArrows.size > 0)) {
      clearSelection();
    }
  };
};

export const createFourthBondKeyHandler = (
  fourthBondMode,
  setFourthBondMode,
  setFourthBondSource,
  setFourthBondPreview
) => {
  return (e) => {
    // ESC key cancels fourth bond mode
    if (e.key === 'Escape' && fourthBondMode) {
      setFourthBondMode(false);
      setFourthBondSource(null);
      setFourthBondPreview(null);
    }
  };
};

export const createCopyPasteKeyHandler = (
  selectedSegments,
  selectedVertices,
  selectedArrows,
  clipboard,
  isPasteMode,
  showSnapPreview,
  copySelection,
  setIsPasteMode,
  cancelPasteMode,
  setShowSnapPreview
) => {
  return (e) => {
    // Copy (Cmd/Ctrl + C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !e.shiftKey && !e.altKey) {
      if (selectedSegments.size > 0 || selectedVertices.size > 0 || selectedArrows.size > 0) {
        e.preventDefault();
        copySelection();
      }
    }
    
    // Paste (Cmd/Ctrl + V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !e.shiftKey && !e.altKey) {
      if (clipboard && clipboard.vertices.length > 0 && !isPasteMode) {
        e.preventDefault();
        setIsPasteMode(true);
      }
    }
    
    // Cancel paste mode with Escape
    if (e.key === 'Escape' && isPasteMode) {
      cancelPasteMode();
    }
    
    // Toggle grid snapping with 'G' key during paste mode
    if (e.key === 'g' && isPasteMode) {
      setShowSnapPreview(!showSnapPreview);
    }
  };
};

export const createUndoKeyHandler = (
  historyIndex,
  undo
) => {
  return (e) => {
    // Undo (Cmd/Ctrl + Z)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !e.altKey) {
      if (historyIndex > 0) {
        e.preventDefault();
        undo();
      }
    }
  };
}; 