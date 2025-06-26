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
      // Note: If we're in add bond mode, this will return to the hover state
      // but won't exit add bond mode entirely
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

export const createEnterKeyHandler = (
  mode,
  hoverVertex,
  vertexAtoms,
  offset,
  showAtomInput,
  setMenuVertexKey,
  setAtomInputPosition,
  setAtomInputValue,
  setShowAtomInput
) => {
  return (e) => {
    // Don't trigger if an input field is currently focused
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      return;
    }
    
    // Enter key in draw mode to edit hovered vertex - only if text box is NOT already open
    if (e.key === 'Enter' && mode === 'draw' && hoverVertex && !showAtomInput) {
      e.preventDefault();
      
      const key = `${hoverVertex.x.toFixed(2)},${hoverVertex.y.toFixed(2)}`;
      setMenuVertexKey(key);
      
      // Position the input box at the vertex position
      setAtomInputPosition({ x: hoverVertex.x + offset.x, y: hoverVertex.y + offset.y });
      
      // Set initial value if there's an existing atom
      const existingAtom = vertexAtoms[key];
      if (existingAtom) {
        const symbol = existingAtom.symbol || existingAtom;
        setAtomInputValue(symbol);
      } else {
        setAtomInputValue('');
      }
      
      // Show the input box
      setShowAtomInput(true);
    }
  };
};

export const createElementShortcutHandler = (
  mode,
  hoverVertex,
  showAtomInput,
  captureState,
  setVertexAtoms
) => {
  return (e) => {
    // Don't trigger if an input field is currently focused
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      return;
    }
    
    // Element shortcuts: O, N, F, S, C, H - only in draw mode, when hovering, and text box not open
    const elementKeys = ['o', 'n', 'f', 's', 'c', 'h'];
    const key = e.key.toLowerCase();
    
    if (elementKeys.includes(key) && mode === 'draw' && hoverVertex && !showAtomInput) {
      e.preventDefault();
      
      // Capture state before modifying atom
      captureState();
      
      const vertexKey = `${hoverVertex.x.toFixed(2)},${hoverVertex.y.toFixed(2)}`;
      const elementSymbol = key.toUpperCase(); // Convert to uppercase for proper chemical symbol
      
      // Set the atom symbol directly
      setVertexAtoms(prev => ({ ...prev, [vertexKey]: elementSymbol }));
    }
  };
}; 