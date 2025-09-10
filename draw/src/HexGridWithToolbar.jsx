import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import logoFinal4 from '/logoFinal4.png';
import gearIcon from '/gear.png';
import { detectSixMemberedRings, isSegmentInRing, getRingInteriorDirection, isSpecialRingBond, getRingInfo, detectThreeMemberedRings, detectFourMemberedRings, detectFiveMemberedRings } from './ringDetection.js';
import { determineVertexTypes, isTopOfHex, getType, getIfTop } from './vertexDetection.js';
import { drawArrowOnCanvas, drawEquilArrowOnCanvas, drawCurvedArrowOnCanvas, calculateCurvedArrowPeak } from './rendering/ArrowRenderer.js';
import { 
  isPointInRect, 
  isLineIntersectingRect, 
  updateSelection as updateSelectionUtil,
  clearSelection as clearSelectionUtil,
  copySelection as copySelectionUtil,
  cancelPasteMode as cancelPasteModeUtil,
  pasteAtPosition as pasteAtPositionUtil
} from './utils/SelectionUtils.js';
import { handleMouseMove as handleMouseMoveUtil, handleMouseDown as handleMouseDownUtil, handleMouseUp as handleMouseUpUtil } from './handlers/MouseHandlers.js';
import { createEscapeKeyHandler, createGeneralEscapeHandler, createFourthBondKeyHandler, createCopyPasteKeyHandler, createUndoKeyHandler, createEnterKeyHandler, createElementShortcutHandler } from './handlers/KeyboardHandlers.js';
import { handleArrowMouseMove, handleArrowClick } from './handlers/ArrowHandlers.js';
import { handleClickCore } from './handlers/clickHandlers.js';
import { formatAtomText } from './utils/TextUtils.jsx';
import { analyzeGridBreaking, isInBreakingZone, generateBondPreviews, isPointOnBondPreview, isVertexInLinearSystem, getLinearAxis } from './utils/GridBreakingUtils.js';
import { generateChairPreset, createChairIcon } from './utils/ChairConformation.js';
import MolecularProperties from './components/MolecularProperties.jsx';

  const HexGridWithToolbar = () => {
    const canvasRef = useRef(null);
    
    // segments store base coordinates and bondOrder: 0 (none), 1 (single), 2 (double)
  // bondType: null (normal), 'wedge', 'dash', 'ambiguous'
  // bondDirection: 1 (default/forward), -1 (reversed/flipped)
  const [segments, setSegments] = useState([]);
  // vertices store base coordinates
  const [vertices, setVertices] = useState([]);
  // mapping from "x,y" to atom symbol
  const [vertexAtoms, setVertexAtoms] = useState({});
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // grid pan offset
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuVertexKey, setMenuVertexKey] = useState(null);
  const [mode, setMode] = useState('draw'); // modes: 'draw', 'erase', 'arrow', 'equil', 'lone', 'plus', 'minus', 'curve0', ... 'curve5'
  const [hoverVertex, setHoverVertex] = useState(null);
  const [hoverSegmentIndex, setHoverSegmentIndex] = useState(null);

  const [hoverCurvedArrow, setHoverCurvedArrow] = useState({ index: -1, part: null }); // Track curved arrow hover state

  const [arrowPreview, setArrowPreview] = useState(null);
  // Selection box state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  // Selected items state
  const [selectedSegments, setSelectedSegments] = useState(new Set());
  const [selectedVertices, setSelectedVertices] = useState(new Set());
  const [selectedArrows, setSelectedArrows] = useState(new Set());
  // Selection bounds for persistent border
  const [selectionBounds, setSelectionBounds] = useState(null);
  
  // Copy/paste state
  const [clipboard, setClipboard] = useState(null);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pastePreviewPosition, setPastePreviewPosition] = useState({ x: 0, y: 0 });
  // Grid snapping state
  const [gridVertexIndex, setGridVertexIndex] = useState(new Map());
  const [snapAlignment, setSnapAlignment] = useState(null);
  const [showSnapPreview, setShowSnapPreview] = useState(true); // Allow users to toggle snapping

  // Fourth bond feature states
  const [fourthBondMode, setFourthBondMode] = useState(false);
  const [fourthBondSource, setFourthBondSource] = useState(null); // Vertex from which the fourth bond starts
  const [fourthBondPreview, setFourthBondPreview] = useState(null); // Preview line for fourth bond
  // Arrow state: store in screen coordinates
  const [arrows, setArrows] = useState([]);
  // Track the first point of a curved arrow for two-click placement
  const [curvedArrowStartPoint, setCurvedArrowStartPoint] = useState(null);
  const [showAtomInput, setShowAtomInput] = useState(false);
  const [atomInputValue, setAtomInputValue] = useState('');
  const [atomInputPosition, setAtomInputPosition] = useState({ x: 0, y: 0 });
  const [showAboutPopup, setShowAboutPopup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Color scheme function - returns appropriate colors based on dark mode
  const getColors = useCallback(() => {
    if (isDarkMode) {
      return {
        background: '#1a1a1a',
        surface: '#2d2d2d',
        surfaceHover: '#3a3a3a',
        border: '#404040',
        text: '#ffffff',
        textSecondary: '#b3b3b3',
        textTertiary: '#808080',
        button: '#404040',
        buttonHover: '#4a4a4a',
        buttonActive: 'rgb(54,98,227)', // Keep accent color the same
        shadow: 'rgba(0,0,0,0.5)',
        canvasBackground: '#1a1a1a',
        gridLines: '#333333',
        bonds: '#ffffff',
        atoms: '#ffffff'
      };
    } else {
      return {
        background: '#ffffff',
        surface: '#ffffff',
        surfaceHover: '#f5f5f5',
        border: '#e3e7eb',
        text: '#1a1a1a',
        textSecondary: '#666666',
        textTertiary: '#999999',
        button: '#e9ecef',
        buttonHover: '#dee2e6',
        buttonActive: 'rgb(54,98,227)',
        shadow: 'rgba(0,0,0,0.1)',
        canvasBackground: '#ffffff',
        gridLines: '#ddd',
        bonds: '#000000',
        atoms: '#000000'
      };
    }
  }, [isDarkMode]);
  
  const colors = getColors();
  
  // Preset state
  const [selectedPreset, setSelectedPreset] = useState(null); // Track which preset is currently selected ('benzene', 'cyclohexane', etc.)
  // Ring detection state (invisible to user)
  const [detectedRings, setDetectedRings] = useState([]);
  // Grid breaking state
  const [gridBreakingAnalysis, setGridBreakingAnalysis] = useState({
    offGridVertices: [],
    breakingZones: [],
    totalOffGrid: 0,
    totalZones: 0,
    gridBreakingActive: false
  });
  const [gridBreakingEnabled, setGridBreakingEnabled] = useState(false);
  // Off-grid vertex tracking (for small rings attached to bonds: cyclopropane/epoxide, cyclobutane, cyclopentane)
  const [epoxideVertices, setEpoxideVertices] = useState(new Set());
  // Bond preview state for off-grid vertices
  const [bondPreviews, setBondPreviews] = useState([]);
  const [hoverBondPreview, setHoverBondPreview] = useState(null);
  const lineThreshold = 15;
  const vertexThreshold = 15; // click tolerance for vertices
  const hexRadius = 60;
  
  // Simplified lonePairPositioning functions
  // Get bonds connected to a vertex
  function getConnectedBonds(vertex, allSegments) {
    return allSegments.filter(seg => 
      (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
      (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)
    );
  }
  
  // Determine lone pair position order based on vertex type and isTop status
  function getLonePairPositionOrder(connectedBonds, vertex) {
    // Get the vertex type using the getter function
    const vertexType = getType(vertex, vertexTypes, segments);
    // Get if the vertex is at the top of a hexagon
    const isTop = getIfTop(vertex, segments);
    
    // Default order if no specific rule applies
    let order = ['top', 'bottom', 'left', 'right'];
    
    // Apply specific positioning rules based on vertex type: Modified Manually
    switch(vertexType) {
      case 'A': 
        order = ['top', 'right', 'bottom', 'left'];
        break;
        
      case 'B': 
        if (isTop) {
          order = ['bottom', 'left', 'right', 'top'];
        } else {
          order = ['top', 'right', 'left', 'bottom'];
        }
        break;
        
      case 'C': 
        if (isTop) {
          order = ['right', 'top', 'bottom', 'left'];
        } else {
          order = ['left', 'bottom', 'top', 'right'];
        }
        break;
        
      case 'D': 
        if (isTop) {
          order = ['left', 'top', 'bottom', 'right'];
        } else {
          order = ['right', 'bottom', 'top', 'left'];
        }
        break;
        
      case 'E': 
        if (isTop) {
          order = ['right', 'bottom', 'top', 'left'];
        } else {
          order = ['left', 'top', 'right', 'bottom'];
        }
        break;
        
      case 'F': 
      if (isTop) {
        order = ['left', 'bottom', 'right', 'top'];
      } else {
        order = ['right', 'top', 'left', 'bottom'];
      }
      break;
      case 'G': 
      if (isTop) {
        order = ['top', 'right', 'left', 'bottom'];
      } else {
        order = ['bottom', 'left', 'right', 'top'];
      } 
      break;
      case 'H':
      if (isTop) {
        order = ['bottom', 'right', 'top', 'left'];
      } else {
        order = ['top', 'left', 'right', 'bottom'];
      } 
      break;
    }
    
    // Fine-tune based on specific bond patterns of the connected bonds if needed
    // This would require analyzing bond angles and positions, which is complex
    // For now, we're using just the vertex type and isTop status
    
    return order;
  }

  // Helper function to calculate bond direction based on coordinates
  const calculateBondDirection = useCallback((x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Calculate angle in degrees (0 = right, 90 = up, 180 = left, 270 = down)
    let angle = Math.atan2(-dy, dx) * 180 / Math.PI; // negative dy because canvas y increases downward
    if (angle < 0) angle += 360; // normalize to 0-360
    
    // Determine direction based on angle ranges
    // vertical: 75-105 degrees (up) and 255-285 degrees (down)
    // topRightFacing: 15-75 degrees (up-right to right-up) and 195-255 degrees (down-left to left-down)
    // topLeftFacing: 105-165 degrees (up-left to left-up) and 285-345 degrees (down-right to right-down)
    
    if ((angle >= 75 && angle <= 105) || (angle >= 255 && angle <= 285)) {
      return 'vertical';
    } else if ((angle >= 15 && angle <= 75) || (angle >= 195 && angle <= 255)) {
      return 'topRightFacing';
    } else if ((angle >= 105 && angle <= 165) || (angle >= 285 && angle <= 345)) {
      return 'topLeftFacing';
    } else {
      // Handle edge cases around 0/360 degrees
      return 'topRightFacing'; // default for horizontal-ish bonds
    }
  }, []);

  // Helper function to calculate upperVertex and lowerVertex for double bonds
  const calculateDoubleBondVertices = useCallback((x1, y1, x2, y2, direction) => {
    if (direction === 'vertical') {
      // For vertical bonds, the vertex with smaller y is upper, larger y is lower
      if (y1 < y2) {
        return { upperVertex: { x: x1, y: y1 }, lowerVertex: { x: x2, y: y2 } };
      } else {
        return { upperVertex: { x: x2, y: y2 }, lowerVertex: { x: x1, y: y1 } };
      }
    } else if (direction === 'topLeftFacing') {
      // For topLeftFacing bonds, the vertex on the top left is upper, bottom right is lower
      // Compare positions based on both x and y coordinates
      const leftVertex = x1 < x2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
      const rightVertex = x1 < x2 ? { x: x2, y: y2 } : { x: x1, y: y1 };
      
      // For topLeftFacing, the left vertex is typically the upper one
      return { upperVertex: leftVertex, lowerVertex: rightVertex };
    } else if (direction === 'topRightFacing') {
      // For topRightFacing bonds, the vertex on the top right is upper, bottom left is lower
      // Compare positions based on both x and y coordinates
      const leftVertex = x1 < x2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
      const rightVertex = x1 < x2 ? { x: x2, y: y2 } : { x: x1, y: y1 };
      
      // For topRightFacing, the right vertex is typically the upper one
      return { upperVertex: rightVertex, lowerVertex: leftVertex };
    }
    
    // Fallback: default to first vertex as upper, second as lower
    return { upperVertex: { x: x1, y: y1 }, lowerVertex: { x: x2, y: y2 } };
  }, []);

  // Add a flag to track if a drag occurred and the last mouse event type
  const [didDrag, setDidDrag] = useState(false);
  const [mouseDownOnCanvas, setMouseDownOnCanvas] = useState(false);
  
  // Track which vertices are free-floating (created in text mode, not part of the grid)
  const [freeFloatingVertices, setFreeFloatingVertices] = useState(new Set());
  // Track vertex types (A, B, C, etc.)
  const [vertexTypes, setVertexTypes] = useState({});
  // Track the vertex being currently dragged in mouse mode
  const [draggingVertex, setDraggingVertex] = useState(null);
  const [draggingArrowIndex, setDraggingArrowIndex] = useState(null);
  const [dragArrowOffset, setDragArrowOffset] = useState({ x: 0, y: 0 });
  
  // Track when we're actively dragging to defer expensive operations
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);

  // Undo/Redo history system
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Track molecular properties panel state
  const [isPropertiesPanelExpanded, setIsPropertiesPanelExpanded] = useState(false);
  
  // Prevent duplicate captureState calls within a short time window
  const [lastCaptureTime, setLastCaptureTime] = useState(0);

  // Molecule tracking state
  const [activeMoleculeId, setActiveMoleculeId] = useState(null);
  const [lastEditedVertex, setLastEditedVertex] = useState(null);

  // Export popup state
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportImageUrl, setExportImageUrl] = useState(null);
  const [exportMetadata, setExportMetadata] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Molecule detection and tracking functions
  const detectSeparateMolecules = useCallback(() => {
    // Build a graph of vertices connected by bonds
    const actualBonds = segments.filter(s => s.bondOrder > 0);
    const vertexConnections = new Map();
    
    // Initialize vertex connections
    vertices.forEach(vertex => {
      const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
      vertexConnections.set(key, new Set());
    });
    
    // Add connections from bonds
    actualBonds.forEach(bond => {
      const v1Key = `${bond.x1.toFixed(2)},${bond.y1.toFixed(2)}`;
      const v2Key = `${bond.x2.toFixed(2)},${bond.y2.toFixed(2)}`;
      
      if (vertexConnections.has(v1Key) && vertexConnections.has(v2Key)) {
        vertexConnections.get(v1Key).add(v2Key);
        vertexConnections.get(v2Key).add(v1Key);
      }
    });
    
    // Find connected components using BFS
    const visited = new Set();
    const molecules = [];
    
    for (const [vertexKey, connections] of vertexConnections) {
      if (!visited.has(vertexKey)) {
        // Start a new molecule from this unvisited vertex
        const molecule = new Set();
        const queue = [vertexKey];
        
        while (queue.length > 0) {
          const currentKey = queue.shift();
          if (visited.has(currentKey)) continue;
          
          visited.add(currentKey);
          molecule.add(currentKey);
          
          // Add connected vertices to queue
          const connectedVertices = vertexConnections.get(currentKey);
          if (connectedVertices) {
            for (const connectedKey of connectedVertices) {
              if (!visited.has(connectedKey)) {
                queue.push(connectedKey);
              }
            }
          }
        }
        
        // Include all vertices that are part of actual bonds OR have atom labels
        // A molecule is valid if it has actual bonds connecting vertices OR standalone labeled atoms
        const moleculeVertexKeys = Array.from(molecule);
        const hasActualBonds = actualBonds.some(bond => {
          const v1Key = `${bond.x1.toFixed(2)},${bond.y1.toFixed(2)}`;
          const v2Key = `${bond.x2.toFixed(2)},${bond.y2.toFixed(2)}`;
          return moleculeVertexKeys.includes(v1Key) && moleculeVertexKeys.includes(v2Key);
        });
        const hasLabeledAtoms = moleculeVertexKeys.some(vKey => vertexAtoms[vKey]);
        
        if (hasActualBonds || hasLabeledAtoms) {
          molecules.push({
            id: `molecule_${molecules.length}`,
            vertexKeys: moleculeVertexKeys
          });
        }
      }
    }
    
    return molecules;
  }, [vertices, segments, vertexAtoms]);
  
  const findMoleculeContainingVertex = useCallback((targetVertex) => {
    const molecules = detectSeparateMolecules();
    const targetKey = `${targetVertex.x.toFixed(2)},${targetVertex.y.toFixed(2)}`;
    
    return molecules.find(molecule => 
      molecule.vertexKeys.includes(targetKey)
    );
  }, [detectSeparateMolecules]);
  
  const getActiveMolecule = useCallback(() => {
    const molecules = detectSeparateMolecules();
    
    // If we have a last edited vertex, find its molecule
    if (lastEditedVertex) {
      const molecule = findMoleculeContainingVertex(lastEditedVertex);
      if (molecule) {
        return molecule;
      }
    }
    
    // If no last edited vertex, return the first molecule or null
    return molecules.length > 0 ? molecules[0] : null;
  }, [detectSeparateMolecules, findMoleculeContainingVertex, lastEditedVertex]);
  
  // Minimal canvas rendering function for export (only captures edited content)
  const renderCleanCanvas = useCallback(async (scaleFactor = 2) => {
    return new Promise((resolve) => {
      // Use requestAnimationFrame to avoid blocking the UI
      requestAnimationFrame(() => {
        try {
          const exportCanvas = document.createElement('canvas');
          const canvas = canvasRef.current;
          if (!canvas || !exportCanvas) {
            resolve(null);
            return;
          }

          // Find bounds of all EDITED content only (exclude empty grid vertices)
          const allPoints = [];
          
          // Add all bond endpoints (these are definitely edited content)
          segments.filter(s => s.bondOrder > 0).forEach(seg => {
            allPoints.push({ x: seg.x1 + offset.x, y: seg.y1 + offset.y });
            allPoints.push({ x: seg.x2 + offset.x, y: seg.y2 + offset.y });
          });

          // Only add vertices that are actually part of the molecular structure
          vertices.forEach(v => {
            const vx = v.x;
            const vy = v.y;
            const key = `${vx.toFixed(2)},${vy.toFixed(2)}`;
            
            // Check if this vertex has an atom label
            const hasAtomLabel = !!vertexAtoms[key];
            
            // Check if this vertex is connected to any bonds (including double bonds)
            const hasConnectedBonds = segments.some(seg => 
              seg.bondOrder > 0 && (
                (Math.abs(seg.x1 - vx) < 0.1 && Math.abs(seg.y1 - vy) < 0.1) ||
                (Math.abs(seg.x2 - vx) < 0.1 && Math.abs(seg.y2 - vy) < 0.1)
              )
            );
            
            // Only include vertices that have atom labels OR are connected to bonds
            if (hasAtomLabel || hasConnectedBonds) {
              allPoints.push({ x: v.x + offset.x, y: v.y + offset.y });
            }
          });

          // Add all arrow endpoints
          arrows.forEach(arrow => {
            allPoints.push({ x: arrow.x1 + offset.x, y: arrow.y1 + offset.y });
            allPoints.push({ x: arrow.x2 + offset.x, y: arrow.y2 + offset.y });
          });

          // If no content, return null
          if (allPoints.length === 0) {
            // Simple debug check ONLY when export fails
            console.log('🚫 EXPORT FAILED - NO CONTENT DETECTED');
            console.log('📊 Current state:');
            console.log(`   - Total vertices: ${vertices.length}`);
            console.log(`   - Total bonds: ${segments.filter(s => s.bondOrder > 0).length}`);
            console.log(`   - Double bonds: ${segments.filter(s => s.bondOrder === 2).length}`);
            console.log(`   - Atoms with labels: ${Object.keys(vertexAtoms).length}`);
            
            if (segments.some(s => s.bondOrder === 2)) {
              console.log('⚠️ Double bonds exist but no vertices detected - checking bond endpoints:');
              segments.filter(s => s.bondOrder === 2).forEach((seg, i) => {
                console.log(`   Double bond ${i+1}: (${seg.x1.toFixed(1)}, ${seg.y1.toFixed(1)}) → (${seg.x2.toFixed(1)}, ${seg.y2.toFixed(1)})`);
                // Check if we have matching vertices
                const v1Match = vertices.find(v => Math.abs(v.x - seg.x1) < 0.1 && Math.abs(v.y - seg.y1) < 0.1);
                const v2Match = vertices.find(v => Math.abs(v.x - seg.x2) < 0.1 && Math.abs(v.y - seg.y2) < 0.1);
                console.log(`     Vertex matches: v1=${!!v1Match}, v2=${!!v2Match}`);
              });
            }
            resolve(null);
            return;
          }

          // Find the bounding box
          let minX = Math.min(...allPoints.map(p => p.x));
          let maxX = Math.max(...allPoints.map(p => p.x));
          let minY = Math.min(...allPoints.map(p => p.y));
          let maxY = Math.max(...allPoints.map(p => p.y));

          // Add padding for text, bonds, charges, etc.
          const padding = 40;
          minX -= padding;
          maxX += padding;
          minY -= padding;
          maxY += padding;

          // Calculate canvas dimensions
          const cropWidth = maxX - minX;
          const cropHeight = maxY - minY;
          
          exportCanvas.width = cropWidth * scaleFactor;
          exportCanvas.height = cropHeight * scaleFactor;
          const ctx = exportCanvas.getContext('2d');

          // Set up high-quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.scale(scaleFactor, scaleFactor);

          // Fill white background (export always uses light mode)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropWidth, cropHeight);

          // Offset all drawing to account for the crop
          // Round coordinates to ensure pixel-perfect alignment with main canvas
          const offsetX = Math.round(-minX);
          const offsetY = Math.round(-minY);

          // Render content with cropping offset - FULL QUALITY to match main canvas
          // Note: All coordinates are already adjusted for offsetX/offsetY
          
          // Draw bonds with same logic as main canvas (export always uses light mode)
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          segments.forEach((seg, segIdx) => {
                          if (seg.bondOrder >= 1) {
               const x1b = seg.x1;
               const y1b = seg.y1;
               const x2b = seg.x2;
               const y2b = seg.y2;
               const key1 = `${x1b.toFixed(2)},${y1b.toFixed(2)}`;
               const key2 = `${x2b.toFixed(2)},${y2b.toFixed(2)}`;
               const hasAtom1 = !!vertexAtoms[key1];
               const hasAtom2 = !!vertexAtoms[key2];
               let sx1 = Math.round(x1b + offset.x + offsetX);
               let sy1 = Math.round(y1b + offset.y + offsetY);
               let sx2 = Math.round(x2b + offset.x + offsetX);
               let sy2 = Math.round(y2b + offset.y + offsetY);
              const shrink = 14;
              const dx = sx2 - sx1;
              const dy = sy2 - sy1;
              const length = Math.hypot(dx, dy);
              const ux = dx / length;
              const uy = dy / length;
              if (hasAtom1) {
                sx1 += ux * shrink;
                sy1 += uy * shrink;
              }
              if (hasAtom2) {
                sx2 -= ux * shrink;
                sy2 -= uy * shrink;
              }
              
              ctx.strokeStyle = '#000000'; // Export always uses light mode
              
              // Calculate perpendicular vectors for all bond types
              const perpX = -uy; 
              const perpY = ux;
              
              if (seg.bondOrder === 1) {
                
                if (seg.bondType === 'wedge') {
                  // Full wedge bond rendering
                  ctx.beginPath();
                  const wedgeWidth = 8;
                  const direction = seg.bondDirection || 1;
                  
                  if (direction === 1) {
                    ctx.moveTo(sx1, sy1);
                    ctx.lineTo(sx2 + perpX * wedgeWidth, sy2 + perpY * wedgeWidth);
                    ctx.lineTo(sx2 - perpX * wedgeWidth, sy2 - perpY * wedgeWidth);
                  } else {
                    ctx.moveTo(sx2, sy2);
                    ctx.lineTo(sx1 + perpX * wedgeWidth, sy1 + perpY * wedgeWidth);
                    ctx.lineTo(sx1 - perpX * wedgeWidth, sy1 - perpY * wedgeWidth);
                  }
                  
                  ctx.closePath();
                  ctx.fillStyle = '#000000'; // Export always uses light mode
                  ctx.fill();
                } else if (seg.bondType === 'dash') {
                  // Full dash bond rendering
                  const minDashWidth = 4;
                  const maxDashWidth = 13;
                  const totalDashes = 6;
                  const direction = seg.bondDirection || 1;
                  
                  ctx.strokeStyle = '#000000'; // Export always uses light mode
                  ctx.lineWidth = 3;
                  ctx.lineCap = 'round';
                  
                  for (let i = 0; i < totalDashes; i++) {
                    const t = i / (totalDashes - 1);
                    const effectiveT = direction === 1 ? t : 1 - t;
                    
                    const dashX = sx1 + (sx2 - sx1) * t;
                    const dashY = sy1 + (sy2 - sy1) * t;
                    const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * effectiveT;
                    
                    ctx.beginPath();
                    ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
                    ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
                    ctx.stroke();
                  }
                } else if (seg.bondType === 'ambiguous') {
                  // Full ambiguous bond rendering
                  ctx.beginPath();
                  const waveWidth = 4.5;
                  const waveFrequency = 4.5;
                  const waveSegments = 100;
                  const direction = seg.bondDirection || 1;
                  const phaseShift = direction === 1 ? 0 : Math.PI;
                  
                  ctx.strokeStyle = '#000000'; // Export always uses light mode
                  ctx.lineWidth = 2;
                  
                  for (let i = 0; i <= waveSegments; i++) {
                    const t = i / waveSegments;
                    const x = sx1 + (sx2 - sx1) * t;
                    const y = sy1 + (sy2 - sy1) * t;
                    
                    const wave = Math.sin(t * Math.PI * 2 * waveFrequency + phaseShift) * waveWidth;
                    const waveX = x + perpX * wave;
                    const waveY = y + perpY * wave;
                    
                    if (i === 0) {
                      ctx.moveTo(waveX, waveY);
                    } else {
                      ctx.lineTo(waveX, waveY);
                    }
                  }
                  
                  ctx.stroke();
                } else {
                  // Regular single bond
                  const ext = 1;
                  ctx.beginPath();
                  ctx.moveTo(sx1 - ux * ext, sy1 - uy * ext);
                  ctx.lineTo(sx2 + ux * ext, sy2 + uy * ext);
                  ctx.stroke();
                }
              } else if (seg.bondOrder === 2) {
                // --- FULL Double bond rendering with proper shorter line logic ---
                function getOtherBonds(vx, vy, excludeIdx) {
                  return segments.filter((s, idx) => 
                    idx !== segIdx && 
                    ((Math.abs(s.x1 - vx) < 0.01 && Math.abs(s.y1 - vy) < 0.01) ||
                     (Math.abs(s.x2 - vx) < 0.01 && Math.abs(s.y2 - vy) < 0.01)) && 
                    s.bondOrder > 0
                  );
                }
                
                const bondsAtStart = getOtherBonds(x1b, y1b, segIdx);
                const bondsAtEnd = getOtherBonds(x2b, y2b, segIdx);
                
                function getBondDirectionVector(bond, fromX, fromY) {
                  let toX, toY;
                  if (Math.abs(bond.x1 - fromX) < 0.01 && Math.abs(bond.y1 - fromY) < 0.01) {
                    toX = bond.x2; toY = bond.y2;
                  } else {
                    toX = bond.x1; toY = bond.y1;
                  }
                  const dx = toX - fromX;
                  const dy = toY - fromY;
                  const len = Math.hypot(dx, dy);
                  if (len === 0) return [0, 0];
                  return [dx / len, dy / len];
                }
                
                const dirMain = [x2b - x1b, y2b - y1b];
                const lenMain = Math.hypot(dirMain[0], dirMain[1]);
                const dirMainNorm = lenMain === 0 ? [0, 0] : [dirMain[0] / lenMain, dirMain[1] / lenMain];
                
                const offset = 5;
                const ext = 6;
                
                const noBondsAtBothEnds = bondsAtStart.length === 0 && bondsAtEnd.length === 0;
                const shorten = noBondsAtBothEnds ? -2 : -3;
                
                let counts = { left: 0, right: 0 };
                [...bondsAtStart, ...bondsAtEnd].forEach(bond => {
                    const isStart = bondsAtStart.includes(bond);
                    const dir = getBondDirectionVector(bond, isStart ? x1b : x2b, isStart ? y1b : y2b);
                    const cross = perpX * dir[1] - perpY * dir[0];
                    if (cross < 0) counts.left++;
                    else if (cross > 0) counts.right++;
                });
                
                let shouldFlipPerpendicular = counts.right > counts.left;
                let ringInteriorOverride = false;
                
                // Ring orientation logic (using seg properties if available)
                if (seg.isInRing && seg.ringOrientation !== undefined) {
                  shouldFlipPerpendicular = seg.ringOrientation;
                  ringInteriorOverride = true;
                } else if (seg.ringOrientation !== undefined) {
                  shouldFlipPerpendicular = seg.ringOrientation;
                }
                
                let finalPerpX, finalPerpY;
                if (seg.isSpecialBond === true) {
                  if (seg.direction === 'vertical') {
                    finalPerpX = Math.abs(perpX);
                    finalPerpY = 0;
                  } else if (seg.direction === 'topLeftFacing') {
                    finalPerpX = Math.abs(perpX);
                    finalPerpY = -Math.abs(perpY);
                  } else if (seg.direction === 'topRightFacing') {
                    finalPerpX = -Math.abs(perpX);
                    finalPerpY = -Math.abs(perpY);
                  } else {
                    finalPerpX = shouldFlipPerpendicular ? -perpX : perpX;
                    finalPerpY = shouldFlipPerpendicular ? -perpY : perpY;
                  }
                } else {
                  finalPerpX = shouldFlipPerpendicular ? -perpX : perpX;
                  finalPerpY = shouldFlipPerpendicular ? -perpY : perpY;
                }
                
                const hasNeighborsAtStart = bondsAtStart.length > 0;
                const hasNeighborsAtEnd = bondsAtEnd.length > 0;
                
                let shortenStart = hasNeighborsAtStart ? 8 : 0;
                let shortenEnd = hasNeighborsAtEnd ? 8 : 0;
                
                let shorterLineOnPositiveSide = counts.left > counts.right;
                
                if (seg.isSpecialBond === true) {
                  if (seg.direction === 'vertical' || seg.direction === 'topLeftFacing') {
                    shorterLineOnPositiveSide = true;
                  } else if (seg.direction === 'topRightFacing') {
                    shorterLineOnPositiveSide = true;
                  } else {
                    shorterLineOnPositiveSide = false;
                  }
                } else if (seg.flipSmallerLine) {
                  shorterLineOnPositiveSide = !shorterLineOnPositiveSide;
                }
                
                const upperVertexUnconnected = seg.upperVertex && segments.filter((s, idx) => 
                  idx !== segIdx && s.bondOrder > 0 && 
                  ((Math.abs(s.x1 - seg.upperVertex.x) < 0.01 && Math.abs(s.y1 - seg.upperVertex.y) < 0.01) ||
                   (Math.abs(s.x2 - seg.upperVertex.x) < 0.01 && Math.abs(s.y2 - seg.upperVertex.y) < 0.01))
                ).length === 0;
                
                const lowerVertexUnconnected = seg.lowerVertex && segments.filter((s, idx) => 
                  idx !== segIdx && s.bondOrder > 0 && 
                  ((Math.abs(s.x1 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y1 - seg.lowerVertex.y) < 0.01) ||
                   (Math.abs(s.x2 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y2 - seg.lowerVertex.y) < 0.01))
                ).length === 0;
                
                if (upperVertexUnconnected || lowerVertexUnconnected) {
                  // Two equal parallel lines, both offset from center
                  ctx.beginPath();
                  ctx.moveTo(sx1 - finalPerpX * offset - ux * (ext + shorten), sy1 - finalPerpY * offset - uy * (ext + shorten));
                  ctx.lineTo(sx2 - finalPerpX * offset + ux * (ext + shorten), sy2 - finalPerpY * offset + uy * (ext + shorten));
                  ctx.stroke();
                  
                  ctx.beginPath();
                  ctx.moveTo(sx1 + finalPerpX * offset - ux * (ext + shorten), sy1 + finalPerpY * offset - uy * (ext + shorten));
                  ctx.lineTo(sx2 + finalPerpX * offset + ux * (ext + shorten), sy2 + finalPerpY * offset + uy * (ext + shorten));
                  ctx.stroke();
                } else {
                  // One shorter line, one longer line
                  const longerLineShorten = 3;
                  
                  if (shorterLineOnPositiveSide) {
                    // First line (aligned with grid - longer)
                    ctx.beginPath();
                    ctx.moveTo(sx1 - ux * (ext + shorten - longerLineShorten), sy1 - uy * (ext + shorten - longerLineShorten));
                    ctx.lineTo(sx2 + ux * (ext + shorten - longerLineShorten), sy2 + uy * (ext + shorten - longerLineShorten));
                    ctx.stroke();
                    
                    // Second line (positive side offset - shorter)
                    ctx.beginPath();
                    ctx.moveTo(sx1 + finalPerpX * offset * 2 - ux * (ext + shorten - shortenStart), sy1 + finalPerpY * offset * 2 - uy * (ext + shorten - shortenStart));
                    ctx.lineTo(sx2 + finalPerpX * offset * 2 + ux * (ext + shorten - shortenEnd), sy2 + finalPerpY * offset * 2 + uy * (ext + shorten - shortenEnd));
                    ctx.stroke();
                  } else {
                    // First line (negative side offset - shorter)
                    ctx.beginPath();
                    ctx.moveTo(sx1 - finalPerpX * offset * 2 - ux * (ext + shorten - shortenStart), sy1 - finalPerpY * offset * 2 - uy * (ext + shorten - shortenStart));
                    ctx.lineTo(sx2 - finalPerpX * offset * 2 + ux * (ext + shorten - shortenEnd), sy2 - finalPerpY * offset * 2 + uy * (ext + shorten - shortenEnd));
                    ctx.stroke();
                    
                    // Second line (aligned with grid - longer)
                    ctx.beginPath();
                    ctx.moveTo(sx1 - ux * (ext + shorten - longerLineShorten), sy1 - uy * (ext + shorten - longerLineShorten));
                    ctx.lineTo(sx2 + ux * (ext + shorten - longerLineShorten), sy2 + uy * (ext + shorten - longerLineShorten));
                    ctx.stroke();
                  }
                }
              } else if (seg.bondOrder === 3) {
                // Full triple bond rendering
                const offset = 6;
                
                // Center line
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx2, sy2);
                ctx.stroke();
                
                // Top and bottom lines
                ctx.beginPath();
                ctx.moveTo(sx1 + perpX * offset, sy1 + perpY * offset);
                ctx.lineTo(sx2 + perpX * offset, sy2 + perpY * offset);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(sx1 - perpX * offset, sy1 - perpY * offset);
                ctx.lineTo(sx2 - perpX * offset, sy2 - perpY * offset);
                ctx.stroke();
              }
            }
          });

          // Draw atoms with same logic as main canvas (full quality)
          vertices.forEach((v, vIdx) => {
            const vx = Math.round(v.x + offset.x + offsetX);
            const vy = Math.round(v.y + offset.y + offsetY);
            const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
            const atom = vertexAtoms[key];
            
            if (atom) {
              ctx.save();
              let symbol = atom.symbol || atom;
              
              // Advanced canvas text rendering with proper subscript support (same as main canvas)
              const segments = [];
              let currentSegment = '';
              let isCurrentNumber = false;
              
              for (let i = 0; i < symbol.length; i++) {
                const char = symbol[i];
                const isNumber = /[0-9]/.test(char);
                
                if (i === 0 || isNumber !== isCurrentNumber) {
                  if (currentSegment) {
                    segments.push({ text: currentSegment, isNumber: isCurrentNumber });
                  }
                  currentSegment = char;
                  isCurrentNumber = isNumber;
                } else {
                  currentSegment += char;
                }
              }
              
              if (currentSegment) {
                segments.push({ text: currentSegment, isNumber: isCurrentNumber });
              }
              
              // Calculate total width for centering
              let totalWidth = 0;
              for (const segment of segments) {
                const font = segment.isNumber ? '300 15px "Roboto", sans-serif' : '300 26px "Roboto", sans-serif';
                ctx.font = font;
                const segmentWidth = ctx.measureText(segment.text).width;
                totalWidth += segmentWidth;
                
                // Apply kerning adjustment for numbers following letters
                if (segment.isNumber && segments.indexOf(segment) > 0) {
                  const prevSegment = segments[segments.indexOf(segment) - 1];
                  if (prevSegment && !prevSegment.isNumber) {
                    const lastChar = prevSegment.text.slice(-1);
                    if (['C', 'O'].includes(lastChar)) {
                      totalWidth -= 3;
                    } else if (['F', 'P', 'S'].includes(lastChar)) {
                      totalWidth -= 2.8;
                    } else if (['N', 'E', 'B'].includes(lastChar)) {
                      totalWidth -= 2.5;
                    } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
                      totalWidth -= 1.7;
                    } else if (['l', 'i'].includes(lastChar)) {
                      totalWidth -= 1.3;
                    } else {
                      totalWidth -= 2.3;
                    }
                  }
                }
              }
              
              // Calculate positions for all segments first
              const segmentPositions = [];
              let currentX = vx - totalWidth / 2;
              const baseYOffset = 2;
              
              for (const segment of segments) {
                const isNumber = segment.isNumber;
                const font = isNumber ? '40 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
                const yOffset = isNumber ? 4 : 0;
                
                ctx.font = font;
                const segmentWidth = ctx.measureText(segment.text).width;
                
                segmentPositions.push({
                  text: segment.text,
                  font: font,
                  x: currentX,
                  y: vy + baseYOffset + yOffset,
                  isNumber: isNumber
                });
                
                currentX += segmentWidth;
                
                // Apply kerning for numbers following letters
                if (isNumber && segments.indexOf(segment) > 0) {
                  const prevSegment = segments[segments.indexOf(segment) - 1];
                  if (prevSegment && !prevSegment.isNumber) {
                    const lastChar = prevSegment.text.slice(-1);
                    if (['C', 'O'].includes(lastChar)) {
                      currentX -= 3;
                    } else if (['F', 'P', 'S'].includes(lastChar)) {
                      currentX -= 2.8;
                    } else if (['N', 'E', 'B'].includes(lastChar)) {
                      currentX -= 2.5;
                    } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
                      currentX -= 1.7;
                    } else if (['l', 'i'].includes(lastChar)) {
                      currentX -= 1.3;
                    } else {
                      currentX -= 2.3;
                    }
                  }
                }
              }
              
              // Render in three passes to prevent overlap issues
              // For single characters, use center alignment for better centering
              if (segmentPositions.length === 1 && !segmentPositions[0].isNumber) {
                ctx.textAlign = 'center';
                // Update the single segment position to use vertex center
                segmentPositions[0].x = vx;
              } else {
                ctx.textAlign = 'left';
              }
              ctx.textBaseline = 'middle';
              
              // Pass 1: Draw background strokes for contrast
              ctx.shadowColor = isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
              ctx.shadowBlur = 4;
              ctx.lineWidth = 5;
              ctx.strokeStyle = isDarkMode ? '#000' : '#fff';
              for (const pos of segmentPositions) {
                ctx.font = pos.font;
                ctx.strokeText(pos.text, pos.x, pos.y);
              }
              ctx.shadowBlur = 0;
              
              // Pass 2: Draw background fills to fill holes in letters
              ctx.fillStyle = isDarkMode ? '#000000' : '#ffffff';
              for (const pos of segmentPositions) {
                ctx.font = pos.font;
                ctx.fillText(pos.text, pos.x, pos.y);
              }
              
              // Pass 3: Draw all final colored text
              ctx.fillStyle = colors.atoms;
              for (const pos of segmentPositions) {
                ctx.font = pos.font;
                ctx.fillText(pos.text, pos.x, pos.y);
              }
              
              ctx.shadowBlur = 0;
              // Draw charge if present (same as main canvas)
              if (atom.charge) {
                ctx.save();
                
                const chargeX = vx - 18;
                const chargeY = vy - 20;
                
                // White background circle
                ctx.beginPath();
                ctx.arc(chargeX, chargeY, 8, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#000000'; // Export always uses light mode
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Charge symbol
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#1a1a1a';
                
                if (atom.charge > 0) {
                  ctx.font = '18px "Inter", "Segoe UI", "Arial", sans-serif';
                  ctx.fillText('+', chargeX + 0.1, chargeY + 1.5);
                } else {
                  ctx.font = '24px "Inter", "Segoe UI", "Arial", sans-serif';
                  ctx.fillText('-', chargeX + 0.4, chargeY - 0.4);
                }
                ctx.restore();
              }
              
              // Draw lone pairs if present (same as main canvas)
              if (atom.lonePairs) {
                ctx.save();
                ctx.fillStyle = '#1a1a1a';
                const n = atom.lonePairs;
                const dotR = 2.6;
                const baseRadius = 14;
                const padding = 6;
                const r = Math.max(baseRadius, totalWidth / 2 + padding);
                const verticalOffset = 16;
                const baseHorizontalOffset = 16;
                const horizontalOffset = baseHorizontalOffset;
                
                // Fixed positions for lone pairs
                const positions = [
                  { x: vx, y: vy - verticalOffset },     // top
                  { x: vx + horizontalOffset, y: vy },   // right
                  { x: vx, y: vy + verticalOffset },     // bottom
                  { x: vx - horizontalOffset, y: vy }    // left
                ];
                
                // Draw lone pair dots
                for (let i = 0; i < n && i < positions.length; i++) {
                  const pos = positions[i];
                  
                  if (n - i === 1) {
                    // Single dot
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, dotR, 0, 2 * Math.PI);
                    ctx.fill();
                  } else if (n - i >= 2) {
                    // Two dots
                    const offset = 5;
                    if (i === 0 || i === 2) { // top/bottom
                      ctx.beginPath();
                      ctx.arc(pos.x - offset, pos.y, dotR, 0, 2 * Math.PI);
                      ctx.fill();
                      ctx.beginPath();
                      ctx.arc(pos.x + offset, pos.y, dotR, 0, 2 * Math.PI);
                      ctx.fill();
                    } else { // left/right
                      ctx.beginPath();
                      ctx.arc(pos.x, pos.y - offset, dotR, 0, 2 * Math.PI);
                      ctx.fill();
                      ctx.beginPath();
                      ctx.arc(pos.x, pos.y + offset, dotR, 0, 2 * Math.PI);
                      ctx.fill();
                    }
                    i++; // Skip next position since we placed two dots
                  }
                }
                ctx.restore();
              }
              
              ctx.restore();
            }
          });

          // Draw arrows with same logic as main canvas (full quality)
          arrows.forEach((arrow, index) => {
            const { x1, y1, x2, y2, type } = arrow;
            const ox1 = Math.round(x1 + offset.x + offsetX);
            const oy1 = Math.round(y1 + offset.y + offsetY);
            const ox2 = Math.round(x2 + offset.x + offsetX);
            const oy2 = Math.round(y2 + offset.y + offsetY);
            
            if (!type || type === 'arrow') {
              drawArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, '#000', 3, 'export');
            } else if (type === 'equil') {
              // Use independent arrow coordinates if available
              const topX1 = arrow.topX1 !== undefined ? Math.round(arrow.topX1 + offset.x + offsetX) : ox1;
              const topX2 = arrow.topX2 !== undefined ? Math.round(arrow.topX2 + offset.x + offsetX) : ox2;
              const bottomX1 = arrow.bottomX1 !== undefined ? Math.round(arrow.bottomX1 + offset.x + offsetX) : ox1;
              const bottomX2 = arrow.bottomX2 !== undefined ? Math.round(arrow.bottomX2 + offset.x + offsetX) : ox2;
              
              // Provide dummy function for export context
              const dummyHoverCheck = () => ({ index: -1, part: null });
              
              drawEquilArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, '#000', 3, 
                topX1, topX2, bottomX1, bottomX2, index, 'export', dummyHoverCheck, { x: 0, y: 0 });
            } else if (type.startsWith('curve')) {
              const peakX = arrow.peakX !== undefined ? Math.round(arrow.peakX + offset.x + offsetX) : null;
              const peakY = arrow.peakY !== undefined ? Math.round(arrow.peakY + offset.y + offsetY) : null;
              
              // Provide dummy hover state for export context
              const dummyHoverState = { index: -1, part: null };
              
              drawCurvedArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, type, '#000', index, peakX, peakY, arrows, 'export', dummyHoverState);
            }
          });

          const imageUrl = exportCanvas.toDataURL('image/png', 1.0);
          
          // Return metadata with the new approach
          resolve({
            imageUrl,
            width: Math.round(cropWidth),
            height: Math.round(cropHeight),
            scaleFactor,
            exportWidth: Math.round(cropWidth * scaleFactor),
            exportHeight: Math.round(cropHeight * scaleFactor)
          });
        } catch (error) {
          console.error('🚫 EXPORT RENDERING ERROR:', error.message);
          console.error('   Stack:', error.stack);
          resolve(null);
        }
      });
    });
  }, [vertices, segments, vertexAtoms, arrows, offset]);
  
  // Helper function to update vertices and track the last edited vertex
  const updateVerticesWithTracking = useCallback((updater, trackedVertex = null) => {
    setVertices(updater);
    if (trackedVertex) {
      setLastEditedVertex(trackedVertex);
    }
  }, []);
  
  // Helper function to set the last edited vertex when a vertex is clicked/modified
  const trackVertexEdit = useCallback((vertex) => {
    setLastEditedVertex(vertex);
  }, []);

  // Fast vertex merging - only checks a new vertex against existing ones
  const checkAndMergeNewVertex = useCallback((newVertex, currentVertices, mergeThreshold = 15) => {
    // Find any existing vertex that's close enough to merge with the new one
    let closestVertex = null;
    let minDistance = mergeThreshold;
    let closestIndex = -1;
    
    for (let i = 0; i < currentVertices.length; i++) {
      const existing = currentVertices[i];
      const distance = Math.sqrt((existing.x - newVertex.x) ** 2 + (existing.y - newVertex.y) ** 2);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestVertex = existing;
        closestIndex = i;
      }
    }
    
    // If no close vertex found, no merging needed
    if (!closestVertex) {
      return { shouldMerge: false, newVertices: [...currentVertices, newVertex] };
    }
    
    // Determine which vertex to keep (prefer one with atom label)
    const newKey = `${newVertex.x.toFixed(2)},${newVertex.y.toFixed(2)}`;
    const existingKey = `${closestVertex.x.toFixed(2)},${closestVertex.y.toFixed(2)}`;
    const newHasAtom = !!vertexAtoms[newKey];
    const existingHasAtom = !!vertexAtoms[existingKey];
    
    let keepVertex, removeVertex, keepKey, removeKey;
    if (newHasAtom && !existingHasAtom) {
      keepVertex = newVertex;
      removeVertex = closestVertex;
      keepKey = newKey;
      removeKey = existingKey;
    } else if (existingHasAtom && !newHasAtom) {
      keepVertex = closestVertex;
      removeVertex = newVertex;
      keepKey = existingKey;
      removeKey = newKey;
    } else {
      // Both have atoms or neither - merge to average position
      const mergedX = (newVertex.x + closestVertex.x) / 2;
      const mergedY = (newVertex.y + closestVertex.y) / 2;
      keepVertex = { ...closestVertex, x: mergedX, y: mergedY };
      removeVertex = newVertex;
      keepKey = existingKey;
      removeKey = newKey;
    }
    
    // Update vertices array
    const newVertices = [...currentVertices];
    newVertices[closestIndex] = keepVertex;
    
    // Update segments that reference the removed vertex
    setSegments(prevSegments => 
      prevSegments.map(seg => {
        let updated = seg;
        if (Math.abs(seg.x1 - removeVertex.x) < 0.01 && Math.abs(seg.y1 - removeVertex.y) < 0.01) {
          updated = { ...updated, x1: keepVertex.x, y1: keepVertex.y };
        }
        if (Math.abs(seg.x2 - removeVertex.x) < 0.01 && Math.abs(seg.y2 - removeVertex.y) < 0.01) {
          updated = { ...updated, x2: keepVertex.x, y2: keepVertex.y };
        }
        return updated;
      })
    );
    
    // Merge atom properties if both have them
    setVertexAtoms(prevAtoms => {
      const newAtoms = { ...prevAtoms };
      const keepAtom = newAtoms[keepKey];
      const removeAtom = newAtoms[removeKey];
      
      if (keepAtom && removeAtom) {
        // Merge properties intelligently
        const mergedKey = `${keepVertex.x.toFixed(2)},${keepVertex.y.toFixed(2)}`;
        newAtoms[mergedKey] = {
          symbol: keepAtom.symbol || removeAtom.symbol || '',
          charge: (keepAtom.charge || 0) + (removeAtom.charge || 0) || undefined,
          lonePairs: Math.max(keepAtom.lonePairs || 0, removeAtom.lonePairs || 0) || undefined,
          lonePairOrder: keepAtom.lonePairOrder || removeAtom.lonePairOrder
        };
        // Clean up
        delete newAtoms[keepKey];
        delete newAtoms[removeKey];
      } else if (removeAtom && !keepAtom) {
        // Move atom data to merged position
        const mergedKey = `${keepVertex.x.toFixed(2)},${keepVertex.y.toFixed(2)}`;
        newAtoms[mergedKey] = removeAtom;
        delete newAtoms[removeKey];
      }
      
      return newAtoms;
    });
    
    return { shouldMerge: true, newVertices };
  }, [vertexAtoms]);

  // Generate unique segments and vertices based on view size
  const generateGrid = useCallback((width, height, existingVertices = [], existingVertexAtoms = {}, existingSegments = []) => {
    const newSegments = [];
    const newVertices = [];
    const seenSeg = new Set();
    const seenVert = new Set();
    const r = hexRadius;
    const hexWidth = Math.sqrt(3) * r;
    const hSpacing = hexWidth;
    const vSpacing = 1.5 * r;

    // Helper function to check if a vertex has real bonds
    const hasRealBonds = (vertex) => {
      return existingSegments.some(seg => 
        seg.bondOrder > 0 && (
          (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
          (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)
        )
      );
    };

    // First, add any existing off-grid vertices and vertices with bonds/atoms
    const preservedVertices = [];
    existingVertices.forEach(vertex => {
      if (vertex.isOffGrid === true) {
        preservedVertices.push(vertex);
        const vk = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
        seenVert.add(vk);
      } else {
        // Also preserve on-grid vertices that have atoms or bonds
        const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
        if (existingVertexAtoms[vertexKey] || hasRealBonds(vertex)) {
          preservedVertices.push(vertex);
          const vk = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
          seenVert.add(vk);
        }
      }
    });

    // Create simple breaking zones around off-grid vertices
    const breakingZones = [];
    const offGridVertices = preservedVertices.filter(v => v.isOffGrid === true);
    offGridVertices.forEach(vertex => {
      breakingZones.push({
        center: { x: vertex.x, y: vertex.y },
        suppressionRadius: hexRadius * 0.75 // Halved to match the new analysis multiplier (0.55 scaled to match grid generation)
      });
    });

    const cols = Math.ceil((width + hexWidth * 2) / hSpacing) + 1; // extra margin
    const rows = Math.ceil((height + r * 2) / vSpacing) + 1;

    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const baseCx = col * hSpacing + (row % 2) * (hexWidth / 2) + r;
        const baseCy = row * vSpacing + r;
        const verts = [];
        for (let i = 0; i < 6; i++) {
          const angle = ((60 * i + 30) * Math.PI) / 180;
          const vx = baseCx + r * Math.cos(angle);
          const vy = baseCy + r * Math.sin(angle);
          verts.push({ x: vx, y: vy });
          const vk = `${vx.toFixed(2)},${vy.toFixed(2)}`;
          if (!seenVert.has(vk)) {
            // Check if this vertex would be in a breaking zone
            const inBreakingZone = breakingZones.some(zone => {
              const distance = Math.sqrt((vx - zone.center.x) ** 2 + (vy - zone.center.y) ** 2);
              return distance <= zone.suppressionRadius;
            });
            
            if (!inBreakingZone) {
              seenVert.add(vk);
              newVertices.push({ x: vx, y: vy, isOffGrid: false }); // Grid vertices are always on-grid
            }
          }
        }
        for (let i = 0; i < 6; i++) {
          const next = (i + 1) % 6;
          let x1b = verts[i].x;
          let y1b = verts[i].y;
          let x2b = verts[next].x;
          let y2b = verts[next].y;
          let key;
          if (x1b < x2b || (x1b === x2b && y1b < y2b)) {
            key = `${x1b.toFixed(2)},${y1b.toFixed(2)},${x2b.toFixed(2)},${y2b.toFixed(2)}`;
          } else {
            key = `${x2b.toFixed(2)},${y2b.toFixed(2)},${x1b.toFixed(2)},${y1b.toFixed(2)}`;
            [x1b, y1b, x2b, y2b] = [x2b, y2b, x1b, y1b];
          }
          if (!seenSeg.has(key)) {
            // Check if both vertices of this segment exist (weren't filtered out by breaking zones)
            const v1Key = `${x1b.toFixed(2)},${y1b.toFixed(2)}`;
            const v2Key = `${x2b.toFixed(2)},${y2b.toFixed(2)}`;
            const v1Exists = seenVert.has(v1Key);
            const v2Exists = seenVert.has(v2Key);

            if (v1Exists && v2Exists) {
              // Check if segment center would be in a breaking zone
              const segmentCenterX = (x1b + x2b) / 2;
              const segmentCenterY = (y1b + y2b) / 2;
              const inBreakingZone = breakingZones.some(zone => {
                const distance = Math.sqrt((segmentCenterX - zone.center.x) ** 2 + (segmentCenterY - zone.center.y) ** 2);
                return distance <= zone.suppressionRadius;
              });

              if (!inBreakingZone) {
                seenSeg.add(key);
                const direction = calculateBondDirection(x1b, y1b, x2b, y2b);
                newSegments.push({ 
                  x1: x1b, 
                  y1: y1b, 
                  x2: x2b, 
                  y2: y2b, 
                  bondOrder: 0, 
                  bondType: null,
                  direction: direction,
                  flipSmallerLine: false
                });
              }
            }
          }
        }
      }
    }

    // Add preserved vertices to the final result
    const finalVertices = [...preservedVertices, ...newVertices];
    
    // Add existing real bonds (bondOrder > 0) to the segments
    const realBonds = existingSegments.filter(seg => seg.bondOrder > 0);
    const finalSegments = [...realBonds, ...newSegments];
    
    return { newSegments: finalSegments, newVertices: finalVertices };
  }, [calculateBondDirection, calculateDoubleBondVertices]);

  // Build spatial index of grid vertices for fast lookup
  const buildGridVertexIndex = useCallback((gridVertices) => {
    const index = new Map();
    const spatialGrid = new Map(); // Add spatial grid for fast lookups
    const gridSize = 60; // Spatial grid cell size (should be >= search radius)
    
    gridVertices.forEach((vertex, i) => {
      const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
      index.set(key, { ...vertex, index: i });
      
      // Add to spatial grid
      const gridX = Math.floor(vertex.x / gridSize);
      const gridY = Math.floor(vertex.y / gridSize);
      const spatialKey = `${gridX},${gridY}`;
      
      if (!spatialGrid.has(spatialKey)) {
        spatialGrid.set(spatialKey, []);
      }
      spatialGrid.get(spatialKey).push({ ...vertex, index: i });
    });
    
    index.spatialGrid = spatialGrid;
    index.gridSize = gridSize;
    return index;
  }, []);

  // Find the closest grid vertex to a given point using spatial indexing
  const findClosestGridVertex = useCallback((x, y, maxDistance = 30) => {
    if (!gridVertexIndex.spatialGrid) return null;
    
    let closestVertex = null;
    let minDistance = maxDistance;
    
    const gridSize = gridVertexIndex.gridSize;
    
    // If maxDistance is Infinity, search all cells (aggressive snapping)
    if (maxDistance === Infinity) {
      minDistance = Infinity;
      gridVertexIndex.spatialGrid.forEach((cellVertices) => {
        cellVertices.forEach((vertex) => {
          const distance = Math.sqrt((vertex.x - x) ** 2 + (vertex.y - y) ** 2);
          if (distance < minDistance) {
            minDistance = distance;
            closestVertex = vertex;
          }
        });
      });
    } else {
      // Normal spatial search with limited radius
      const searchRadius = Math.ceil(maxDistance / gridSize);
      const centerGridX = Math.floor(x / gridSize);
      const centerGridY = Math.floor(y / gridSize);
      
      // Only search nearby spatial grid cells
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          const gridX = centerGridX + dx;
          const gridY = centerGridY + dy;
          const spatialKey = `${gridX},${gridY}`;
          const cellVertices = gridVertexIndex.spatialGrid.get(spatialKey);
          
          if (cellVertices) {
            cellVertices.forEach((vertex) => {
              const distance = Math.sqrt((vertex.x - x) ** 2 + (vertex.y - y) ** 2);
              if (distance < minDistance) {
                minDistance = distance;
                closestVertex = vertex;
              }
            });
          }
        }
      }
    }
    
    return closestVertex ? { vertex: closestVertex, distance: minDistance } : null;
  }, [gridVertexIndex]);

  // Count bonds connected to a specific vertex
  const countBondsAtVertex = useCallback((vertex) => {
    const vx = vertex.x;
    const vy = vertex.y;
    let count = 0;
    
    for (const seg of segments) {
      if (seg.bondOrder > 0) { // Only count bonds (not grid lines)
        // Check if this segment connects to our vertex (at either end)
        if ((Math.abs(seg.x1 - vx) < 0.01 && Math.abs(seg.y1 - vy) < 0.01) || 
            (Math.abs(seg.x2 - vx) < 0.01 && Math.abs(seg.y2 - vy) < 0.01)) {
          // Count each bond order as the appropriate number of bonds
          count += seg.bondOrder;
        }
      }
    }
    
    return count;
  }, [segments]);

  // Count bonds at vertex for grid snapping
  const countBondsAtVertexForSnapping = useCallback((vertex) => {
    const vx = vertex.x;
    const vy = vertex.y;
    let count = 0;
    
    for (const seg of segments) {
      if (seg.bondOrder > 0) { // Only count bonds (not grid lines)
        // Check if this segment connects to our vertex (at either end)
        if ((Math.abs(seg.x1 - vx) < 0.01 && Math.abs(seg.y1 - vy) < 0.01) || 
            (Math.abs(seg.x2 - vx) < 0.01 && Math.abs(seg.y2 - vy) < 0.01)) {
          // Count each bond order as the appropriate number of bonds
          count += seg.bondOrder;
        }
      }
    }
    
    return count;
  }, [segments]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    clearSelectionUtil(
      setSelectedSegments,
      setSelectedVertices,
      setSelectedArrows,
      setSelectionBounds
    );
  }, []);

  // Capture current state for undo history
  const captureState = useCallback(() => {
    const now = Date.now();
    
    // Prevent duplicate captures within 100ms (for the same user action)
    if (now - lastCaptureTime < 100) {
      return;
    }
    
    setLastCaptureTime(now);
    
    const currentState = {
      segments: JSON.parse(JSON.stringify(segments)),
      vertices: JSON.parse(JSON.stringify(vertices)),
      vertexAtoms: JSON.parse(JSON.stringify(vertexAtoms)),
      vertexTypes: JSON.parse(JSON.stringify(vertexTypes)),
      arrows: JSON.parse(JSON.stringify(arrows)),
      freeFloatingVertices: new Set(freeFloatingVertices),
      detectedRings: JSON.parse(JSON.stringify(detectedRings)),
      bondPreviews: JSON.parse(JSON.stringify(bondPreviews)),
      epoxideVertices: new Set(epoxideVertices)
    };

    setHistory(prevHistory => {
      // If we're not at the end of history, truncate everything after current position  
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(currentState);
      // Limit history to 50 states to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });

    setHistoryIndex(prevIndex => Math.min(prevIndex + 1, 49));
  }, [segments, vertices, vertexAtoms, vertexTypes, arrows, freeFloatingVertices, detectedRings, bondPreviews, epoxideVertices, lastCaptureTime]);





  // Undo the last action
  const undo = useCallback(() => {
    if (historyIndex <= 0) return; // Nothing to undo

    const previousState = history[historyIndex - 1];
    if (!previousState) return;

    // Restore all state variables
    setSegments(previousState.segments);
    setVertices(previousState.vertices);
    setVertexAtoms(previousState.vertexAtoms);
    setVertexTypes(previousState.vertexTypes);
    setArrows(previousState.arrows);
    setFreeFloatingVertices(previousState.freeFloatingVertices);
    setDetectedRings(previousState.detectedRings);

    setBondPreviews(previousState.bondPreviews || []);
    setEpoxideVertices(previousState.epoxideVertices || new Set());
    setHoverBondPreview(null); // Clear hover state on undo

    // Update history index
    setHistoryIndex(prev => prev - 1);

    // Clear any active states
    clearSelection();
    setShowAtomInput(false);
    setIsPasteMode(false);
    setFourthBondMode(false);
    setFourthBondSource(null);
    setFourthBondPreview(null);
    setCurvedArrowStartPoint(null);
    setArrowPreview(null);
  }, [history, historyIndex, clearSelection]);

    // Helper function to find grid line that matches bond position and direction
  const findMatchingGridLine = useCallback((x1, y1, x2, y2) => {
    // Find grid segments (bondOrder === 0) that match this bond's position
    const tolerance = 5; // pixels
    
    for (const gridSeg of segments) {
      if (gridSeg.bondOrder !== 0) continue; // Only check grid lines
      
      // Check if bond endpoints are close to grid line endpoints (in either direction)
      const dist1 = Math.sqrt((gridSeg.x1 + offset.x - x1) ** 2 + (gridSeg.y1 + offset.y - y1) ** 2) +
                   Math.sqrt((gridSeg.x2 + offset.x - x2) ** 2 + (gridSeg.y2 + offset.y - y2) ** 2);
      const dist2 = Math.sqrt((gridSeg.x1 + offset.x - x2) ** 2 + (gridSeg.y1 + offset.y - y2) ** 2) +
                   Math.sqrt((gridSeg.x2 + offset.x - x1) ** 2 + (gridSeg.y2 + offset.y - y1) ** 2);
      
      if (Math.min(dist1, dist2) < tolerance * 2) {
        return { segment: gridSeg, distance: Math.min(dist1, dist2) };
      }
    }
    return null;
  }, [segments, offset]);

  // Calculate bond alignment for small rings
  const calculateBondAlignment = useCallback((pastedVertices, clickX, clickY) => {
    if (!pastedVertices || pastedVertices.length === 0 || !clipboard || !clipboard.segments) return null;
    
    // Only apply to small rings
    if (!['cyclopropane', 'cyclobutane', 'cyclopentane'].includes(selectedPreset)) {
      return null;
    }
    
      // Find all single and double bonds within a reasonable distance
  const maxDistance = 80; // Maximum distance to consider for snapping
  const candidateBonds = [];
  
  segments.forEach((segment, index) => {
    if (segment.bondOrder === 1 || segment.bondOrder === 2) { // Single and double bonds
      // Calculate distance from mouse position to bond center
      const bondCenterX = (segment.x1 + segment.x2) / 2 + offset.x;
      const bondCenterY = (segment.y1 + segment.y2) / 2 + offset.y;
      const distance = Math.sqrt((clickX - bondCenterX) ** 2 + (clickY - bondCenterY) ** 2);
      
      if (distance <= maxDistance) {
        candidateBonds.push({ segment, index, distance });
      }
    }
  });
    
    if (candidateBonds.length === 0) return null;
    
    // Sort by distance and take the closest
    candidateBonds.sort((a, b) => a.distance - b.distance);
    const targetBond = candidateBonds[0].segment;
    
    // Calculate the position and rotation needed to align the ring with this bond
    let bestAlignment = null;
    let bestScore = Infinity;
    
    clipboard.segments.forEach((ringSegment, edgeIndex) => {
      const v1 = clipboard.vertices[ringSegment.vertex1Index];
      const v2 = clipboard.vertices[ringSegment.vertex2Index];
      
      if (!v1 || !v2) return;
      
      // Calculate ring center in world coordinates (without offset)
      const ringCenter = clipboard.vertices.reduce((acc, vertex) => ({
        x: acc.x + vertex.x / clipboard.vertices.length,
        y: acc.y + vertex.y / clipboard.vertices.length
      }), { x: 0, y: 0 });
      
      // Try both orientations of the ring edge alignment
      const orientations = [
        { rv1: v1, rv2: v2 }, // Normal orientation
        { rv1: v2, rv2: v1 }  // Flipped orientation
      ];
      
      orientations.forEach((orientation, orientationIndex) => {
        const { rv1, rv2 } = orientation;
        
        // Calculate rotation needed to align this ring edge with the target bond
        const ringEdgeVector = { x: rv2.x - rv1.x, y: rv2.y - rv1.y };
        const bondVector = { x: targetBond.x2 - targetBond.x1, y: targetBond.y2 - targetBond.y1 };
        
        const ringEdgeAngle = Math.atan2(ringEdgeVector.y, ringEdgeVector.x);
        const bondAngle = Math.atan2(bondVector.y, bondVector.x);
        const rotationAngle = bondAngle - ringEdgeAngle;
        
        // Apply rotation to edge vertices around ring center
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        
        const rotatedV1 = {
          x: (rv1.x - ringCenter.x) * cos - (rv1.y - ringCenter.y) * sin + ringCenter.x,
          y: (rv1.x - ringCenter.x) * sin + (rv1.y - ringCenter.y) * cos + ringCenter.y
        };
        
        const rotatedV2 = {
          x: (rv2.x - ringCenter.x) * cos - (rv2.y - ringCenter.y) * sin + ringCenter.x,
          y: (rv2.x - ringCenter.x) * sin + (rv2.y - ringCenter.y) * cos + ringCenter.y
        };
        
        // Calculate translation needed to align rotated edge with target bond
        // We want the rotated edge to exactly match the target bond position
        const translation = {
          x: targetBond.x1 - rotatedV1.x,
          y: targetBond.y1 - rotatedV1.y
        };
        
        // Verify that v2 will also align correctly
        const finalV2X = rotatedV2.x + translation.x;
        const finalV2Y = rotatedV2.y + translation.y;
        const alignmentError = Math.sqrt((finalV2X - targetBond.x2) ** 2 + (finalV2Y - targetBond.y2) ** 2);
        
        // Score based on how well the edge aligns (smaller error = better score)
        // Also consider distance from mouse to the ring center after transformation
        const finalRingCenterX = ringCenter.x + translation.x;
        const finalRingCenterY = ringCenter.y + translation.y;
        const mouseToRingCenter = Math.sqrt(
          ((clickX - offset.x) - finalRingCenterX) ** 2 + 
          ((clickY - offset.y) - finalRingCenterY) ** 2
        );
        
        const score = alignmentError * 100 + mouseToRingCenter; // Prioritize alignment accuracy
        
        if (score < bestScore) {
          bestScore = score;
          bestAlignment = {
            translation: translation,
            rotation: rotationAngle,
            rotationCenter: ringCenter,
            targetBondIndex: candidateBonds[0].index,
            alignedEdgeIndex: edgeIndex,
            targetBond: targetBond,
            score: score,
            alignmentError: alignmentError,
            orientation: orientationIndex,
            type: 'bond' // Mark this as bond alignment
          };
        }
      });
    });
    
    return bestAlignment;
  }, [segments, offset, clipboard, selectedPreset]);

  // Calculate best alignment for pasted molecule to grid based on bond alignment
  const calculateGridAlignment = useCallback((pastedVertices, clickX, clickY) => {
    if (!pastedVertices || pastedVertices.length === 0 || !clipboard || !clipboard.segments) return null;
    
    // Don't try to align small ring presets and chair conformations to hexagonal grid - they won't fit properly
    if (selectedPreset === 'cyclopentane' || selectedPreset === 'cyclobutane' || selectedPreset === 'cyclopropane' || selectedPreset === 'chair') {
      return null;
    }
    
    // Cache recent calculations to avoid duplicate work
    const cacheKey = `${clickX.toFixed(0)},${clickY.toFixed(0)},${pastedVertices.length}`;
    if (calculateGridAlignment.cache && calculateGridAlignment.cache.key === cacheKey) {
      return calculateGridAlignment.cache.result;
    }
    
    // Try alignments based on bond-to-grid-line matching
    const maxTryVertices = Math.min(3, pastedVertices.length);
    let bestAlignment = null;
    let bestScore = Infinity;
    
    for (let index = 0; index < maxTryVertices; index++) {
      const pastedVertex = pastedVertices[index];
      const pastedWorldX = clickX - offset.x + pastedVertex.x;
      const pastedWorldY = clickY - offset.y + pastedVertex.y;
      
      // Find closest grid vertex for this anchor point
      const closestGrid = findClosestGridVertex(pastedWorldX, pastedWorldY, Infinity);
      if (!closestGrid) continue;
      
      // Calculate translation needed to align this pasted vertex to grid vertex
      const translationX = closestGrid.vertex.x - pastedWorldX;
      const translationY = closestGrid.vertex.y - pastedWorldY;
      
      // Score this alignment based on how well bonds align with grid lines
      let totalScore = 0;
      let alignedBonds = 0;
      let totalBonds = 0;
      const vertexMappings = new Map();
      
      // Check each bond in the clipboard for grid line alignment
      clipboard.segments.forEach(segment => {
        if (segment.bondOrder === 0) return; // Skip grid lines in clipboard
        
        const v1 = clipboard.vertices[segment.vertex1Index];
        const v2 = clipboard.vertices[segment.vertex2Index];
        if (!v1 || !v2) return;
        
        // Calculate screen positions after translation
        const screenX1 = clickX + v1.x + translationX;
        const screenY1 = clickY + v1.y + translationY;
        const screenX2 = clickX + v2.x + translationX;
        const screenY2 = clickY + v2.y + translationY;
        
        totalBonds++;
        
        // Check if this bond aligns with a grid line
        const matchingGridLine = findMatchingGridLine(screenX1, screenY1, screenX2, screenY2);
        if (matchingGridLine) {
          alignedBonds++;
          totalScore += matchingGridLine.distance * 0.1; // Small penalty for distance
        } else {
          totalScore += 50; // Penalty for non-aligned bond
        }
      });
      
      // Also map vertices to grid positions for snapping
      pastedVertices.forEach((vertex, i) => {
        const alignedX = clickX - offset.x + vertex.x + translationX;
        const alignedY = clickY - offset.y + vertex.y + translationY;
        
        const nearestGrid = findClosestGridVertex(alignedX, alignedY, 30); // Reasonable threshold for vertex snapping
        if (nearestGrid) {
          const targetBondCount = countBondsAtVertexForSnapping(nearestGrid.vertex);
          if (targetBondCount <= 4) {
            vertexMappings.set(i, nearestGrid.vertex);
          }
        }
      });
      
      // Calculate bond alignment ratio
      const bondAlignmentRatio = totalBonds > 0 ? alignedBonds / totalBonds : 0;
      
      // Accept alignment if most bonds align with grid lines
      if (bondAlignmentRatio >= 0.3 && totalScore < bestScore) { // At least 30% of bonds must align
        bestScore = totalScore;
        bestAlignment = {
          translation: { x: translationX, y: translationY },
          rotation: 0,
          vertexMappings,
          score: totalScore,
          anchorIndex: index,
          snappedCount: vertexMappings.size,
          bondAlignmentRatio: bondAlignmentRatio,
          alignedBonds: alignedBonds,
          totalBonds: totalBonds
        };
        
        // Early exit if we found excellent bond alignment
        if (bondAlignmentRatio >= 0.8) break;
      }
    }
    
    // Cache the result
    calculateGridAlignment.cache = { key: cacheKey, result: bestAlignment };
    return bestAlignment;
  }, [findClosestGridVertex, offset, countBondsAtVertexForSnapping, clipboard, findMatchingGridLine, selectedPreset]);

  // Update grid index when vertices change
  useEffect(() => {
    if (vertices.length > 0) {
      const index = buildGridVertexIndex(vertices);
      setGridVertexIndex(index);
      
      // Clear alignment cache when grid changes
      if (calculateGridAlignment.cache) {
        calculateGridAlignment.cache = null;
      }
    }
  }, [vertices, buildGridVertexIndex]);

  // Draw grid: segments and vertices (with atoms), hiding gray lines around atoms
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill canvas background with theme color
    ctx.fillStyle = colors.canvasBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);



    // Build a set of vertex positions where atoms exist
    const atomPositions = new Set(Object.keys(vertexAtoms));

    // Draw hex grid lines in even lighter gray, skip around atoms and in grid breaking zones
    ctx.lineWidth = 1.5; // slightly thicker
    segments.forEach((seg, i) => {
      // If a vertex is hovered, do not show any segment as hovered
      const isHovered = hoverVertex == null && i === hoverSegmentIndex;
      // For each atom, check if the segment passes close to it (within 20px of the atom center)
      let maskAtom = null;
      for (const key of atomPositions) {
        const [ax, ay] = key.split(',').map(parseFloat);
        const vx = ax + offset.x;
        const vy = ay + offset.y;
        // Distance from atom to segment
        const x0 = vx, y0 = vy;
        const x1 = seg.x1 + offset.x, y1 = seg.y1 + offset.y;
        const x2 = seg.x2 + offset.x, y2 = seg.y2 + offset.y;
        const dx = x2 - x1, dy = y2 - y1;
        const lengthSq = dx*dx + dy*dy;
        let t = ((x0-x1)*dx + (y0-y1)*dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t*dx;
        const projY = y1 + t*dy;
        const dist = Math.sqrt((projX-vx)**2 + (projY-vy)**2);
        if (dist < 20) { maskAtom = { x: vx, y: vy }; break; }
      }
      
      // Check if this grid line should be suppressed due to grid breaking zones
      let inBreakingZone = false;
      if (seg.bondOrder === 0 && gridBreakingAnalysis.gridBreakingActive) {
        const midX = (seg.x1 + seg.x2) / 2;
        const midY = (seg.y1 + seg.y2) / 2;
        const zone = isInBreakingZone(midX, midY, gridBreakingAnalysis.breakingZones, 'suppression');
        if (zone) {
          inBreakingZone = true;
        }
      }
      
      if (seg.bondOrder === 0 && !inBreakingZone) {
        const sx1 = seg.x1 + offset.x;
        const sy1 = seg.y1 + offset.y;
        const sx2 = seg.x2 + offset.x;
        const sy2 = seg.y2 + offset.y;
        ctx.save();
        
        if (isHovered && (mode === 'wedge' || mode === 'dash' || mode === 'ambiguous')) {
          // Draw stereochemistry preview based on current mode
          const dx = sx2 - sx1;
          const dy = sy2 - sy1;
          const length = Math.hypot(dx, dy);
          const ux = dx / length;
          const uy = dy / length;
          const perpX = -uy;
          const perpY = ux;
          
          if (mode === 'wedge') {
            // Draw wedge bond preview
            ctx.beginPath();
            
            // Width of wedge at the wide end
            const wedgeWidth = 8;
            
            // Draw wedge triangle
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2 + perpX * wedgeWidth, sy2 + perpY * wedgeWidth);
            ctx.lineTo(sx2 - perpX * wedgeWidth, sy2 - perpY * wedgeWidth);
            ctx.closePath();
            
            // Fill with semi-transparent gray
            ctx.fillStyle = 'rgba(100,100,100,0.5)';
            ctx.fill();
          } 
          else if (mode === 'dash') {
            // Draw dash bond preview
            // Dash properties
            const minDashWidth = 4; // Width at narrowest point
            const maxDashWidth = 13; // Width at widest point
            const totalDashes = 6; // Number of dashes to draw
            
            ctx.strokeStyle = 'rgba(100,100,100,0.7)';
            ctx.lineWidth = 3;
            
            // Draw each dash with increasing width
            for (let i = 0; i < totalDashes; i++) {
              // Position along the bond
              const t = i / (totalDashes - 1);
              
              const dashX = sx1 + (sx2 - sx1) * t;
              const dashY = sy1 + (sy2 - sy1) * t;
              
              // Calculate width for this dash - increases linearly from narrow to wide end
              const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * t;
              
              // Draw perpendicular dash with rounded ends
              ctx.beginPath();
              ctx.lineCap = 'round'; // Add rounded ends to the line
              ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
              ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
              ctx.stroke();
            }
          }
          else if (mode === 'ambiguous') {
            // Draw ambiguous bond preview (wavy/squiggly line)
            ctx.beginPath();
            
            // Wave properties
            const waveWidth = 4.5; // Amplitude of the wave
            const waveFrequency = 4.5; // Number of complete waves
            const waveSegments = 100; // More segments for smoother curve
            
            ctx.strokeStyle = 'rgba(100,100,100,0.7)';
            ctx.lineWidth = 2;
            
            // Draw a smoother squiggly line
            for (let i = 0; i <= waveSegments; i++) {
              const t = i / waveSegments;
              const x = sx1 + (sx2 - sx1) * t;
              const y = sy1 + (sy2 - sy1) * t;
              
              // Use sine function for a squiggle look
              const wave = Math.sin(t * Math.PI * 2 * waveFrequency) * waveWidth;
              const waveX = x + perpX * wave;
              const waveY = y + perpY * wave;
              
              if (i === 0) {
                ctx.moveTo(waveX, waveY);
              } else {
                ctx.lineTo(waveX, waveY);
              }
            }
            
            ctx.stroke();
          }
        } else {
          // Regular bond hover or normal grid line
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          
          // Use consistent highlighting for all modes: darker gray and thicker when hovered
          ctx.strokeStyle = isHovered ? (isDarkMode ? '#555' : '#888') : colors.gridLines;
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.stroke();
        }
        
        // If masking for atom, cover the area behind the atom letter
        if (maskAtom) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(maskAtom.x, maskAtom.y, 15, 0, 2 * Math.PI);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
      }
    });

    // Draw bond previews for off-grid vertices (solid gray lines like grid)
    ctx.save();
    
    bondPreviews.forEach(preview => {
      if (preview.isVisible) {
        const isHovered = hoverBondPreview?.id === preview.id;
        // Use appropriate color for bond previews based on theme
        ctx.strokeStyle = isHovered ? (isDarkMode ? '#666666' : '#cccccc') : (isDarkMode ? '#555555' : '#ffffff');
        ctx.lineWidth = isHovered ? 2.5 : 1.5; // Thicker when hovered, same as grid lines
        
        const sx1 = preview.x1 + offset.x;
        const sy1 = preview.y1 + offset.y;
        const sx2 = preview.x2 + offset.x;
        const sy2 = preview.y2 + offset.y;
        
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
    });
    
    ctx.restore();

    // Draw bonds (single + double)
    ctx.strokeStyle = colors.bonds;
    ctx.lineWidth = 3;
    segments.forEach((seg, segIdx) => {
      if (seg.bondOrder >= 1) {
        // Use blue color for selected segments in mouse mode
        const isSelected = mode === 'mouse' && selectedSegments.has(segIdx);
        // Use blue highlight for hovered single bonds in draw mode
        const isHoveredSingleBond = mode === 'draw' && segIdx === hoverSegmentIndex && seg.bondOrder === 1;
        
        if (isSelected) {
          ctx.strokeStyle = 'rgb(54,98,227)';
        } else if (isHoveredSingleBond) {
          ctx.strokeStyle = 'rgb(8, 167, 61)'; // Blue highlight for single bonds that can become double bonds
        } else {
          ctx.strokeStyle = colors.bonds;
        }
        const x1b = seg.x1;
        const y1b = seg.y1;
        const x2b = seg.x2;
        const y2b = seg.y2;
        const key1 = `${x1b.toFixed(2)},${y1b.toFixed(2)}`;
        const key2 = `${x2b.toFixed(2)},${y2b.toFixed(2)}`;
        const hasAtom1 = !!vertexAtoms[key1];
        const hasAtom2 = !!vertexAtoms[key2];
        let sx1 = x1b + offset.x;
        let sy1 = y1b + offset.y;
        let sx2 = x2b + offset.x;
        let sy2 = y2b + offset.y;
        const shrink = 14;
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const length = Math.hypot(dx, dy);
        const ux = dx / length;
        const uy = dy / length;
        if (hasAtom1) {
          sx1 += ux * shrink;
          sy1 += uy * shrink;
        }
        if (hasAtom2) {
          sx2 -= ux * shrink;
          sy2 -= uy * shrink;
        }
        
        // Check if this segment is being hovered and we're in stereochemistry mode
        const isHovered = hoverVertex == null && segIdx === hoverSegmentIndex;
        const showStereochemistryPreview = isHovered && 
          (mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && 
          seg.bondOrder === 1 && 
          (seg.bondType !== mode || mode === 'wedge' && seg.bondDirection === -1);
        if (seg.bondOrder === 1) {
          // Get the perpendicular unit vector (used by all stereochemistry types)
          const perpX = -uy; 
          const perpY = ux;
          
          // Check if we should show a stereochemistry preview
          if (showStereochemistryPreview) {
            // Save context before drawing the preview
            ctx.save();
            
            // First draw the regular bond
            ctx.beginPath();
            ctx.moveTo(sx1 - ux * 1, sy1 - uy * 1);
            ctx.lineTo(sx2 + ux * 1, sy2 + uy * 1);
            ctx.strokeStyle = colors.bonds;
            ctx.stroke();
            
            // Draw the stereochemistry preview overlay
            if (mode === 'wedge') {
              // Draw wedge bond preview
              ctx.beginPath();
              
              // Width of wedge at the wide end
              const wedgeWidth = 8;
              
              // Draw wedge triangle semi-transparent over the regular bond
              ctx.moveTo(sx1, sy1);
              ctx.lineTo(sx2 + perpX * wedgeWidth, sy2 + perpY * wedgeWidth);
              ctx.lineTo(sx2 - perpX * wedgeWidth, sy2 - perpY * wedgeWidth);
              ctx.closePath();
              
              // Fill with semi-transparent gray over the existing bond
              ctx.fillStyle = 'rgba(100,100,100,0.5)';
              ctx.fill();
            } 
            else if (mode === 'dash') {
              // Draw dash bond preview
              // Dash properties
              const minDashWidth = 4;
              const maxDashWidth = 13;
              const totalDashes = 6;
              
              ctx.strokeStyle = 'rgba(100,100,100,0.7)';
              ctx.lineWidth = 3;
              
              // Draw dashes over the existing bond
              for (let i = 0; i < totalDashes; i++) {
                const t = i / (totalDashes - 1);
                const dashX = sx1 + (sx2 - sx1) * t;
                const dashY = sy1 + (sy2 - sy1) * t;
                const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * t;
                
                ctx.beginPath();
                ctx.lineCap = 'round'; // Add rounded ends to the line
                ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
                ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
                ctx.stroke();
              }
            }
            else if (mode === 'ambiguous') {
              // Draw ambiguous bond preview as overlay
              ctx.beginPath();
              
              // Wave properties
              const waveWidth = 4.5;
              const waveFrequency = 4.5;
              const waveSegments = 100;
              
              ctx.strokeStyle = 'rgba(100,100,100,0.7)';
              ctx.lineWidth = 2;
              
              // Draw squiggly line over existing bond
              for (let i = 0; i <= waveSegments; i++) {
                const t = i / waveSegments;
                const x = sx1 + (sx2 - sx1) * t;
                const y = sy1 + (sy2 - sy1) * t;
                
                const wave = Math.sin(t * Math.PI * 2 * waveFrequency) * waveWidth;
                const waveX = x + perpX * wave;
                const waveY = y + perpY * wave;
                
                if (i === 0) {
                  ctx.moveTo(waveX, waveY);
                } else {
                  ctx.lineTo(waveX, waveY);
                }
              }
              
              ctx.stroke();
            }
            
            // Restore context
            ctx.restore();
          }
          
          // Draw the actual bond based on its current type
          if (seg.bondType === 'wedge') {
            // Draw wedge bond (triangle)
            ctx.beginPath();
            
            // Width of wedge at the wide end
            const wedgeWidth = 8;
            
            // Check if we need to flip the direction
            const direction = seg.bondDirection || 1; // Default to 1 if not set
            
            if (direction === 1) {
              // Normal direction - wide end at sx2,sy2
              // Starting point (narrow end)
              ctx.moveTo(sx1, sy1);
              
              // Wide end - create a wide base using perpendicular vector
              ctx.lineTo(sx2 + perpX * wedgeWidth, sy2 + perpY * wedgeWidth);
              ctx.lineTo(sx2 - perpX * wedgeWidth, sy2 - perpY * wedgeWidth);
            } else {
              // Flipped direction - wide end at sx1,sy1
              // Starting point (narrow end)
              ctx.moveTo(sx2, sy2);
              
              // Wide end - create a wide base using perpendicular vector
              ctx.lineTo(sx1 + perpX * wedgeWidth, sy1 + perpY * wedgeWidth);
              ctx.lineTo(sx1 - perpX * wedgeWidth, sy1 - perpY * wedgeWidth);
            }
            
            // Close and fill the path
            ctx.closePath();
            ctx.fillStyle = '#000000';
            ctx.fill();
          } 
          else if (seg.bondType === 'dash') {
            // Draw dash bond (series of perpendicular lines that get thicker)
            // Dash properties
            const minDashWidth = 4; // Width at narrowest point
            const maxDashWidth = 13; // Width at widest point
            const totalDashes = 6; // Number of dashes to draw
            
            // Calculate distance between dashes
            const bondLength = Math.hypot(sx2 - sx1, sy2 - sy1);
            const dashSpacing = bondLength / (totalDashes - 1);
            
            // Check if we need to flip the direction
            const direction = seg.bondDirection || 1; // Default to 1 if not set
            
            // Draw each dash with increasing width
            for (let i = 0; i < totalDashes; i++) {
              // Position along the bond
              const t = i / (totalDashes - 1);
              
              // If direction is flipped, reverse the t value to draw dashes in reverse
              const effectiveT = direction === 1 ? t : 1 - t;
              
              const dashX = sx1 + (sx2 - sx1) * t;
              const dashY = sy1 + (sy2 - sy1) * t;
              
              // Calculate width for this dash - increases linearly from narrow to wide end
              // The end that's narrow/wide depends on direction
              const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * effectiveT;
              
              // Draw perpendicular dash
              ctx.beginPath();
              // Set line width to match preview
              ctx.lineWidth = 3;
              ctx.lineCap = 'round'; // Add rounded ends to the line
              ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
              ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
              ctx.stroke();
            }
          }
          else if (seg.bondType === 'ambiguous') {
            // Draw ambiguous bond (wavy/squiggly line)
            ctx.beginPath();
            
            // Wave properties
            const waveWidth = 4.5; // Amplitude of the wave
            const waveFrequency = 4.5; // Number of complete waves
            const waveSegments = 100; // More segments for smoother curve
            
            // Check if we need to flip the direction (for ambiguous bonds, this just reverses the wave phase)
            const direction = seg.bondDirection || 1; // Default to 1 if not set
            const phaseShift = direction === 1 ? 0 : Math.PI; // 180 degree phase shift for flipped direction
            
            // Draw a smoother squiggly line with improved wave pattern
            for (let i = 0; i <= waveSegments; i++) {
              const t = i / waveSegments;
              const x = sx1 + (sx2 - sx1) * t;
              const y = sy1 + (sy2 - sy1) * t;
              
              // Use sine function with higher frequency for a squiggle look
              // 2*PI*waveFrequency gives complete waves along the bond
              // Add phaseShift to reverse the wave pattern if direction is -1
              const wave = Math.sin(t * Math.PI * 2 * waveFrequency + phaseShift) * waveWidth;
              const waveX = x + perpX * wave;
              const waveY = y + perpY * wave;
              
              if (i === 0) {
                ctx.moveTo(waveX, waveY);
              } else {
                ctx.lineTo(waveX, waveY);
              }
            }
            
            ctx.stroke();
          }
          else {
            // Regular single bond
            // Extend single bond lines by 1px at each end
            const ext = 1; // 1 pixel extension
            ctx.beginPath();
            ctx.moveTo(sx1 - ux * ext, sy1 - uy * ext);
            ctx.lineTo(sx2 + ux * ext, sy2 + uy * ext);
            ctx.stroke();
          }
        } else if (seg.bondOrder === 2) {
          // --- Double bond rendering with improved positioning ---
          function getOtherBonds(vx, vy, excludeIdx) {
            return segments.filter((s, idx) => 
              // Not the current segment
              idx !== segIdx && 
              // Connected to the vertex
              ((Math.abs(s.x1 - vx) < 0.01 && Math.abs(s.y1 - vy) < 0.01) ||
               (Math.abs(s.x2 - vx) < 0.01 && Math.abs(s.y2 - vy) < 0.01)) && 
              // Has a bond (bondOrder > 0)
              s.bondOrder > 0
            );
          }
          
          // Get bonds at each end of this double bond
          const bondsAtStart = getOtherBonds(x1b, y1b, segIdx);
          const bondsAtEnd = getOtherBonds(x2b, y2b, segIdx);
          
          // Calculate direction vectors for connected bonds
          function getBondDirectionVector(bond, fromX, fromY) {
            let toX, toY;
            // Figure out which end of the bond is connected to our vertex
            if (Math.abs(bond.x1 - fromX) < 0.01 && Math.abs(bond.y1 - fromY) < 0.01) {
              toX = bond.x2;
              toY = bond.y2;
            } else {
              toX = bond.x1;
              toY = bond.y1;
            }
            
            // Get direction vector from our vertex to the other end of this bond
            const dx = toX - fromX;
            const dy = toY - fromY;
            const len = Math.hypot(dx, dy);
            if (len === 0) return [0, 0];
            return [dx / len, dy / len];
          }
          
          // Get main double bond direction vector (normalized)
          const dirMain = [x2b - x1b, y2b - y1b];
          const lenMain = Math.hypot(dirMain[0], dirMain[1]);
          const dirMainNorm = lenMain === 0 ? [0, 0] : [dirMain[0] / lenMain, dirMain[1] / lenMain];
          
          // Get perpendicular vector to main bond
          const perpX = -dirMainNorm[1]; // perpendicular points to the right of the bond direction
          const perpY = dirMainNorm[0];
          
          // Check if this double bond meets the conditions for flipping the smaller line
          // Case 1: Vertical double bond with specific bond connections
          // Case 2: TopLeftFacing double bond with specific bond connections
          // Case 3: TopRightFacing double bond with specific bond connections
          if (seg.upperVertex && seg.lowerVertex) {
            // Get bonds connected to upperVertex (excluding current double bond)
            const upperBonds = segments.filter((s, idx) => 
              idx !== segIdx && 
              s.bondOrder > 0 && 
              ((Math.abs(s.x1 - seg.upperVertex.x) < 0.01 && Math.abs(s.y1 - seg.upperVertex.y) < 0.01) ||
               (Math.abs(s.x2 - seg.upperVertex.x) < 0.01 && Math.abs(s.y2 - seg.upperVertex.y) < 0.01))
            );
            
            // Get bonds connected to lowerVertex (excluding current double bond)
            const lowerBonds = segments.filter((s, idx) => 
              idx !== segIdx && 
              s.bondOrder > 0 && 
              ((Math.abs(s.x1 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y1 - seg.lowerVertex.y) < 0.01) ||
               (Math.abs(s.x2 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y2 - seg.lowerVertex.y) < 0.01))
            );
            
            // Case 1: Vertical double bond
            // Conditions: 1. Vertical line, 2. upperVertex connected to 1 topLeftFacing bond, 3. lowerVertex connected to 1 topRightFacing bond
            if (seg.direction === 'vertical') {
              const upperHasOneTopLeftFacing = upperBonds.length === 1 && upperBonds[0].direction === 'topLeftFacing';
              const lowerHasOneTopRightFacing = lowerBonds.length === 1 && lowerBonds[0].direction === 'topRightFacing';
              
              if (upperHasOneTopLeftFacing && lowerHasOneTopRightFacing) {
                seg.flipSmallerLine = true;
              }
            }
            
            // Case 2: TopLeftFacing double bond
            // Conditions: 1. TopLeftFacing line, 2. upperVertex connected to 1 topRightFacing bond, 3. lowerVertex connected to 1 vertical bond
            if (seg.direction === 'topLeftFacing') {
              const upperHasOneTopRightFacing = upperBonds.length === 1 && upperBonds[0].direction === 'topRightFacing';
              const lowerHasOneVertical = lowerBonds.length === 1 && lowerBonds[0].direction === 'vertical';
              
              if (upperHasOneTopRightFacing && lowerHasOneVertical) {
                seg.flipSmallerLine = true;
              }
            }
            
            // Case 3: TopRightFacing double bond
            // Conditions: 1. TopRightFacing line, 2. upperVertex connected to 1 topLeftFacing bond, 3. lowerVertex connected to 1 vertical bond
            if (seg.direction === 'topRightFacing') {
              const upperHasOneTopLeftFacing = upperBonds.length === 1 && upperBonds[0].direction === 'topLeftFacing';
              const lowerHasOneVertical = lowerBonds.length === 1 && lowerBonds[0].direction === 'vertical';
              
              if (upperHasOneTopLeftFacing && lowerHasOneVertical) {
                seg.flipSmallerLine = true;
              }
            }
            
            // Case 3: TopRightFacing double bond
            // Conditions: 1. TopRightFacing line, 2. upperVertex connected to 1 topLeftFacing bond, 3. lowerVertex connected to 1 vertical bond
            if (seg.direction === 'topRightFacing') {
              const upperHasOneTopLeftFacing = upperBonds.length === 1 && upperBonds[0].direction === 'topLeftFacing';
              const lowerHasOneVertical = lowerBonds.length === 1 && lowerBonds[0].direction === 'vertical';
              
              if (upperHasOneTopLeftFacing && lowerHasOneVertical) {
                seg.flipSmallerLine = true;
              }
            }
          }
          
          // Simplified double bond rendering
          const offset = 5; // distance between the two lines
          const ext = 6; // extension at ends
          
          // Determine if both vertices have no other bonds attached
          const noBondsAtBothEnds = bondsAtStart.length === 0 && bondsAtEnd.length === 0;
          
          // Make double bonds slightly shorter when both vertices don't have other bonds attached
          const shorten = noBondsAtBothEnds ? -2 : -3;
          
          // Count bonds on each side of the double bond
          let counts = { left: 0, right: 0 };
          
          // Process all neighboring bonds
          [...bondsAtStart, ...bondsAtEnd].forEach(bond => {
              // Get direction vector from appropriate vertex
              const isStart = bondsAtStart.includes(bond);
              const dir = getBondDirectionVector(bond, isStart ? x1b : x2b, isStart ? y1b : y2b);
              
              // Calculate cross product with perpendicular to determine side
              const cross = perpX * dir[1] - perpY * dir[0];
              if (cross < 0) counts.left++;
              else if (cross > 0) counts.right++;
          });
          
          // Initially assume orientation based on neighbors, but will override for rings
          let shouldFlipPerpendicular = counts.right > counts.left;
          let ringInteriorOverride = false;
          
          // CRITICAL: For ring bonds, the interior orientation MUST ALWAYS take priority
          // Check immediately if this is a ring bond (either previously detected or new)
          if (seg.isInRing || (detectedRings && detectedRings.length > 0 && seg.bondOrder === 2)) {
            // For previously detected ring bonds
            if (seg.isInRing && seg.ringOrientation !== undefined) {
              shouldFlipPerpendicular = seg.ringOrientation;
              ringInteriorOverride = true;

            } 
            // For newly detected ring bonds
            else {
              const ringInfo = isSegmentInRing(seg, detectedRings);
              if (ringInfo && ringInfo.inRing) {
                // First-time detection of this bond in a ring
                const isSpecial = isSpecialRingBond(seg, ringInfo, segments);
                
                // Store ring status for future reference
                seg.isInRing = true;
                seg.isSpecialBond = isSpecial;
                
                // Check if this bond is shared between multiple rings
                const shareMultipleRings = detectedRings.filter(r => {
                  const info = isSegmentInRing(seg, [r]);
                  return info && info.inRing;
                }).length > 1;
                seg.isSharedRingBond = shareMultipleRings;
                
                // For special bonds with specific topology, always use false
                if (isSpecial) {
                  shouldFlipPerpendicular = false;
                  seg.ringOrientation = false;

                } 
                // For non-shared ring bonds, orient toward ring interior
                else if (!shareMultipleRings) {
                  const interiorSide = getRingInteriorDirection(seg, ringInfo.ring);
                  shouldFlipPerpendicular = interiorSide < 0;
                  seg.ringOrientation = interiorSide < 0;

                }
                
                ringInteriorOverride = true;
              }
            }
          }
          
          // We've already handled ring bonds completely in the block above
          // No additional ring logic needed here
          
          // Set the final perpendicular vector based on our decision
          // For the special topological cases in rings, we need to ensure the smaller line
          // is always on the top-right side, regardless of other factors
          let finalPerpX, finalPerpY;
          
          // Check if this is a special ring bond that needs consistent placement
          if (seg.isSpecialBond === true) {
            // For special bonds, we want to ensure the final perpendicular vector
            // points toward the top-right, which means:
            // - For vertical bonds: perpendicular points right (positive X)
            // - For topLeftFacing: perpendicular points up-right (negative Y, positive X)
            // - For topRightFacing: perpendicular points up-left (negative Y, negative X)
            if (seg.direction === 'vertical') {
              finalPerpX = Math.abs(perpX); // Always positive X (right)
              finalPerpY = 0;
            } else if (seg.direction === 'topLeftFacing') {
              finalPerpX = Math.abs(perpX); // Always positive X (right)
              finalPerpY = -Math.abs(perpY); // Always negative Y (up)
            } else if (seg.direction === 'topRightFacing') {
              finalPerpX = -Math.abs(perpX); // Always negative X (left)
              finalPerpY = -Math.abs(perpY); // Always negative Y (up)
            } else {
              // Fallback to standard calculation
              finalPerpX = shouldFlipPerpendicular ? -perpX : perpX;
              finalPerpY = shouldFlipPerpendicular ? -perpY : perpY;
            }
          } else {
            // Standard calculation for non-special bonds
            finalPerpX = shouldFlipPerpendicular ? -perpX : perpX;
            finalPerpY = shouldFlipPerpendicular ? -perpY : perpY;
          }
          
          // Determine which line should be shorter based on neighboring bonds
          const hasNeighborsAtStart = bondsAtStart.length > 0;
          const hasNeighborsAtEnd = bondsAtEnd.length > 0;
          
          // Calculate shortening amounts for the smaller line
          let shortenStart = hasNeighborsAtStart ? 8 : 0;
          let shortenEnd = hasNeighborsAtEnd ? 8 : 0;
          
          // Special case: Additional shortening for double bonds inside cyclopropane rings (3-membered rings)
          if (detectedRings && detectedRings.length > 0 && seg.bondOrder === 2) {
            const ringInfo = isSegmentInRing(seg, detectedRings);
            if (ringInfo && ringInfo.inRing) {
              const ring = ringInfo.ring;
              const verticesInRing = ring.vertices || ring;
              // Check if this is a 3-membered ring (cyclopropane/triangle)
              if (verticesInRing && verticesInRing.length === 3) {
                // Add 8 pixels of additional shortening on each side for cyclopropane rings
                shortenStart += 8;
                shortenEnd += 8;
              }
            }
          }
          
          // Determine which side gets the shorter line
          // By default, the side with fewer bonds gets the shorter line
          // But if part of a ring, make the shorter line face the ring interior
          let shorterLineOnPositiveSide = counts.left > counts.right;
          
          // Get special case information for bonds in the bottom left of 6-membered rings
          let isSpecialBottomLeftCase = false;
          
          // Check specific configurations for bottom left bonds in a ring
          if (detectedRings && detectedRings.length > 0 && seg.bondOrder === 2) {
            const ringInfo = isSegmentInRing(seg, detectedRings);
            if (ringInfo) {
              // Get bonds connected to upperVertex and lowerVertex
              if (seg.upperVertex && seg.lowerVertex) {
                // Get bonds connected to upperVertex (excluding current double bond)
                const upperBonds = segments.filter((s, idx) => 
                  idx !== segIdx && 
                  s.bondOrder > 0 && 
                  ((Math.abs(s.x1 - seg.upperVertex.x) < 0.01 && Math.abs(s.y1 - seg.upperVertex.y) < 0.01) ||
                  (Math.abs(s.x2 - seg.upperVertex.x) < 0.01 && Math.abs(s.y2 - seg.upperVertex.y) < 0.01))
                );
                
                // Get bonds connected to lowerVertex (excluding current double bond)
                const lowerBonds = segments.filter((s, idx) => 
                  idx !== segIdx && 
                  s.bondOrder > 0 && 
                  ((Math.abs(s.x1 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y1 - seg.lowerVertex.y) < 0.01) ||
                  (Math.abs(s.x2 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y2 - seg.lowerVertex.y) < 0.01))
                );
                
                // Case 1: topLeftFacing bond with upper vertex connected to vertical
                if (seg.direction === 'topLeftFacing' && 
                    upperBonds.length === 1 && 
                    upperBonds[0].direction === 'vertical') {
                  isSpecialBottomLeftCase = true;
                }
                
                // Case 2: vertical bond with lower vertex connected to topLeftFacing
                if (seg.direction === 'vertical' && 
                    lowerBonds.length === 1 && 
                    lowerBonds[0].direction === 'topLeftFacing') {
                  isSpecialBottomLeftCase = true;
                }
                
                // Case 3: topRightFacing bond with lower vertex connected to topLeftFacing
                if (seg.direction === 'topRightFacing' && 
                    lowerBonds.length === 1 && 
                    lowerBonds[0].direction === 'topLeftFacing') {
                  isSpecialBottomLeftCase = true;
                }
              }
            }
          }
          
          // Apply ring-specific orientations based on stored data or current detection
          
          // If we've already determined this is a special bond, use that orientation
          if (seg.isSpecialBond === true) {
            // The correct orientation depends on the bond direction
            if (seg.direction === 'vertical' || seg.direction === 'topLeftFacing') {
              // For vertical and topLeftFacing bonds (bottom and leftmost), invert the orientation
              shorterLineOnPositiveSide = true;

            } else if (seg.direction === 'topRightFacing') {
              // For topRightFacing bonds (bottom-right), use true instead of false
              shorterLineOnPositiveSide = true;

            } else {
              // Fallback for any other direction
              shorterLineOnPositiveSide = false;

            }
          } 
          // If we just detected a special case, apply the orientation 
          else if (isSpecialBottomLeftCase) {
            // For special bonds, the orientation depends on the bond direction
            if (seg.direction === 'vertical' || seg.direction === 'topLeftFacing' || seg.direction === 'topRightFacing') {
              // For vertical, topLeftFacing, and topRightFacing bonds, set to positive side
              shorterLineOnPositiveSide = true;
            } else {
              // Fallback for any other direction
              shorterLineOnPositiveSide = false;
            }
            // Store this decision for future renders
            seg.isSpecialBond = true;

          } 
          // For regular ring bonds, check interior direction
          else if (ringInteriorOverride && detectedRings && detectedRings.length > 0 && seg.bondOrder === 2) {
            const ringInfo = isSegmentInRing(seg, detectedRings);
            if (ringInfo) {
              const direction = getRingInteriorDirection(seg, ringInfo, detectedRings);
              if (direction.isInRing && !direction.isSharedBond) {
                // For rings, force double bond's shorter line to be on the interior side
                shorterLineOnPositiveSide = direction.isInteriorOnPositiveSide;
              }
            }
          } else if (seg.flipSmallerLine) {
            // If not in a ring or if it's a shared bond, use the original flipSmallerLine logic
            shorterLineOnPositiveSide = !shorterLineOnPositiveSide;
          }
          
          // Check if either vertex is unconnected (no other bonds)
          const upperVertexUnconnected = seg.upperVertex && segments.filter((s, idx) => 
            idx !== segIdx && 
            s.bondOrder > 0 && 
            ((Math.abs(s.x1 - seg.upperVertex.x) < 0.01 && Math.abs(s.y1 - seg.upperVertex.y) < 0.01) ||
             (Math.abs(s.x2 - seg.upperVertex.x) < 0.01 && Math.abs(s.y2 - seg.upperVertex.y) < 0.01))
          ).length === 0;
          
          const lowerVertexUnconnected = seg.lowerVertex && segments.filter((s, idx) => 
            idx !== segIdx && 
            s.bondOrder > 0 && 
            ((Math.abs(s.x1 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y1 - seg.lowerVertex.y) < 0.01) ||
             (Math.abs(s.x2 - seg.lowerVertex.x) < 0.01 && Math.abs(s.y2 - seg.lowerVertex.y) < 0.01))
          ).length === 0;
          
          // If either vertex is unconnected, draw two parallel lines of equal length, both offset from center
          if (upperVertexUnconnected || lowerVertexUnconnected) {
            // Additional shortening for cyclopropane rings (equal parallel lines case)
            let additionalShorten = 0;
            if (detectedRings && detectedRings.length > 0 && seg.bondOrder === 2) {
              const ringInfo = isSegmentInRing(seg, detectedRings);
              if (ringInfo && ringInfo.inRing) {
                const ring = ringInfo.ring;
                const verticesInRing = ring.vertices || ring;
                // Check if this is a 3-membered ring (cyclopropane/triangle)
                if (verticesInRing && verticesInRing.length === 3) {
                  // Add 8 pixels of additional shortening for cyclopropane rings
                  additionalShorten = 8;
                }
              }
            }
            
            // Two equal parallel lines, both offset from center
            ctx.beginPath();
            ctx.moveTo(sx1 - finalPerpX * offset - ux * (ext + shorten + additionalShorten), sy1 - finalPerpY * offset - uy * (ext + shorten + additionalShorten));
            ctx.lineTo(sx2 - finalPerpX * offset + ux * (ext + shorten + additionalShorten), sy2 - finalPerpY * offset + uy * (ext + shorten + additionalShorten));
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(sx1 + finalPerpX * offset - ux * (ext + shorten + additionalShorten), sy1 + finalPerpY * offset - uy * (ext + shorten + additionalShorten));
            ctx.lineTo(sx2 + finalPerpX * offset + ux * (ext + shorten + additionalShorten), sy2 + finalPerpY * offset + uy * (ext + shorten + additionalShorten));
            ctx.stroke();
          } else {
            // Draw the double bond (two parallel lines with one potentially shorter)
            // The longer line should align with the grid, shorter line offset to one side
            const longerLineShorten = 3; // Make longer line 4 pixels shorter
            
            if (shorterLineOnPositiveSide) {
              // Shorter line on positive perpendicular side, longer line aligned with grid
              
              // First line (aligned with grid - longer, but shortened by 4px)
              ctx.beginPath();
              ctx.moveTo(sx1 - ux * (ext + shorten - longerLineShorten), sy1 - uy * (ext + shorten - longerLineShorten));
              ctx.lineTo(sx2 + ux * (ext + shorten - longerLineShorten), sy2 + uy * (ext + shorten - longerLineShorten));
              ctx.stroke();
              
              // Second line (positive side offset - shorter)
              ctx.beginPath();
              ctx.moveTo(sx1 + finalPerpX * offset * 2 - ux * (ext + shorten - shortenStart), sy1 + finalPerpY * offset * 2 - uy * (ext + shorten - shortenStart));
              ctx.lineTo(sx2 + finalPerpX * offset * 2 + ux * (ext + shorten - shortenEnd), sy2 + finalPerpY * offset * 2 + uy * (ext + shorten - shortenEnd));
              ctx.stroke();
            } else {
              // Shorter line on negative perpendicular side, longer line aligned with grid
              
              // First line (negative side offset - shorter)
              ctx.beginPath();
              ctx.moveTo(sx1 - finalPerpX * offset * 2 - ux * (ext + shorten - shortenStart), sy1 - finalPerpY * offset * 2 - uy * (ext + shorten - shortenStart));
              ctx.lineTo(sx2 - finalPerpX * offset * 2 + ux * (ext + shorten - shortenEnd), sy2 - finalPerpY * offset * 2 + uy * (ext + shorten - shortenEnd));
              ctx.stroke();
              
              // Second line (aligned with grid - longer, but shortened by 4px)
              ctx.beginPath();
              ctx.moveTo(sx1 - ux * (ext + shorten - longerLineShorten), sy1 - uy * (ext + shorten - longerLineShorten));
              ctx.lineTo(sx2 + ux * (ext + shorten - longerLineShorten), sy2 + uy * (ext + shorten - longerLineShorten));
              ctx.stroke();
            }
          }
        } else if (seg.bondOrder === 3) {
          // Triple bond rendering
          const dx = sx2 - sx1;
          const dy = sy2 - sy1;
          const length = Math.hypot(dx, dy);
          const ux = dx / length;
          const uy = dy / length;
          const perpX = -uy;
          const perpY = ux;
          
          // Triple bonds have three lines: center and two offset by 6 pixels
          const offset = 6;
          
          // Center line
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
          
          // Top line
          ctx.beginPath();
          ctx.moveTo(sx1 + perpX * offset, sy1 + perpY * offset);
          ctx.lineTo(sx2 + perpX * offset, sy2 + perpY * offset);
          ctx.stroke();
          
          // Bottom line
          ctx.beginPath();
          ctx.moveTo(sx1 - perpX * offset, sy1 - perpY * offset);
          ctx.lineTo(sx2 - perpX * offset, sy2 - perpY * offset);
          ctx.stroke();
        }
      }
    });





    // Draw atoms
    // --- Atom label centering and font improvement ---
    vertices.forEach((v, vIdx) => {
      const vx = v.x + offset.x;
      const vy = v.y + offset.y;
      const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
      const atom = vertexAtoms[key];
      const isSelected = mode === 'mouse' && selectedVertices.has(vIdx);
      if (atom) {
        ctx.save();
        let symbol = atom.symbol || atom;
        
        // Advanced canvas text rendering with proper subscript support
        // Parse the symbol into segments (letters vs numbers)
        const segments = [];
        let currentSegment = '';
        let isCurrentNumber = false;
        
        for (let i = 0; i < symbol.length; i++) {
          const char = symbol[i];
          const isNumber = /[0-9]/.test(char);
          
          if (i === 0 || isNumber !== isCurrentNumber) {
            if (currentSegment) {
              segments.push({ text: currentSegment, isNumber: isCurrentNumber });
            }
            currentSegment = char;
            isCurrentNumber = isNumber;
          } else {
            currentSegment += char;
          }
        }
        
        if (currentSegment) {
          segments.push({ text: currentSegment, isNumber: isCurrentNumber });
        }
        
        // Calculate total width for centering
        let totalWidth = 0;
        let maxHeight = 0; // Track max height for background rectangle
        for (const segment of segments) {
          const font = segment.isNumber ? '300 15px "Roboto", sans-serif' : '300 26px "Roboto", sans-serif';
          ctx.font = font;
          const segmentWidth = ctx.measureText(segment.text).width;
          totalWidth += segmentWidth;
          
          // Calculate height for background rectangle
          const fontSize = segment.isNumber ? 15 : 26;
          maxHeight = Math.max(maxHeight, fontSize);
          
          // Apply kerning adjustment for numbers following letters
          if (segment.isNumber && segments.indexOf(segment) > 0) {
            const prevSegment = segments[segments.indexOf(segment) - 1];
            if (prevSegment && !prevSegment.isNumber) {
              const lastChar = prevSegment.text.slice(-1);
              // Apply same kerning logic as formatAtomText
              if (['C', 'O'].includes(lastChar)) {
                totalWidth -= 3;
              } else if (['F', 'P', 'S'].includes(lastChar)) {
                totalWidth -= 2.8;
              } else if (['N', 'E', 'B'].includes(lastChar)) {
                totalWidth -= 2.5;
              } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
                totalWidth -= 1.7;
              } else if (['l', 'i'].includes(lastChar)) {
                totalWidth -= 1.3;
              } else {
                totalWidth -= 2.3;
              }
            }
          }
        }
        
        // For single characters like "O", use simple center alignment
        if (segments.length === 1 && !segments[0].isNumber) {
          const segment = segments[0];
          const font = '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
          const baseYOffset = 2;
          
          const segmentPositions = [{
            text: segment.text,
            font: font,
            x: vx, // Use vertex center for simple centering
            y: vy + baseYOffset,
            isNumber: false
          }];
          
          // Render in three passes to prevent overlap issues
          ctx.textAlign = 'center'; // Use center alignment for single atoms
          ctx.textBaseline = 'middle';
          
          // Pass 1: Draw background strokes for contrast
          ctx.shadowColor = isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
          ctx.shadowBlur = 4;
          ctx.lineWidth = 5;
          ctx.strokeStyle = isDarkMode ? '#000' : '#fff';
          for (const pos of segmentPositions) {
            ctx.font = pos.font;
            ctx.strokeText(pos.text, pos.x, pos.y);
          }
          ctx.shadowBlur = 0;
          
          // Pass 2: Draw all white fills to fill holes in letters
          ctx.fillStyle = '#ffffff';
          for (const pos of segmentPositions) {
            ctx.font = pos.font;
            ctx.fillText(pos.text, pos.x, pos.y);
          }
          
          // Pass 3: Draw all final colored text
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : colors.atoms;
          for (const pos of segmentPositions) {
            ctx.font = pos.font;
            ctx.fillText(pos.text, pos.x, pos.y);
          }
        } else {
          // Complex positioning for multi-segment atoms (e.g. H2O, CH4)
          const segmentPositions = [];
          let currentX = vx - totalWidth / 2;
          const baseYOffset = 2; // Move entire text down by 2 pixels (reduced from 4 to move text upward)
          
          for (const segment of segments) {
            const isNumber = segment.isNumber;
            const font = isNumber ? '40 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
            const yOffset = isNumber ? 4 : 0; // Numbers positioned 4px below baseline
            
            ctx.font = font;
            const segmentWidth = ctx.measureText(segment.text).width;
            
            segmentPositions.push({
              text: segment.text,
              font: font,
              x: currentX,
              y: vy + baseYOffset + yOffset,
              isNumber: isNumber
            });
            
            currentX += segmentWidth;
            
            // Apply kerning for numbers following letters
            if (isNumber && segments.indexOf(segment) > 0) {
              const prevSegment = segments[segments.indexOf(segment) - 1];
              if (prevSegment && !prevSegment.isNumber) {
                const lastChar = prevSegment.text.slice(-1);
                if (['C', 'O'].includes(lastChar)) {
                  currentX -= 3;
                } else if (['F', 'P', 'S'].includes(lastChar)) {
                  currentX -= 2.8;
                } else if (['N', 'E', 'B'].includes(lastChar)) {
                  currentX -= 2.5;
                } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
                  currentX -= 1.7;
                } else if (['l', 'i'].includes(lastChar)) {
                  currentX -= 1.3;
                } else {
                  currentX -= 2.3;
                }
              }
            }
          }
          
          // Render in three passes to prevent overlap issues
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          // Pass 1: Draw background strokes for contrast
          ctx.shadowColor = isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
          ctx.shadowBlur = 4;
          ctx.lineWidth = 5;
          ctx.strokeStyle = isDarkMode ? '#000' : '#fff';
          for (const pos of segmentPositions) {
            ctx.font = pos.font;
            ctx.strokeText(pos.text, pos.x, pos.y);
          }
          ctx.shadowBlur = 0;
          
          // Pass 2: Draw background fills to fill holes in letters
          ctx.fillStyle = isDarkMode ? '#000000' : '#ffffff';
          for (const pos of segmentPositions) {
            ctx.font = pos.font;
            ctx.fillText(pos.text, pos.x, pos.y);
          }
          
          // Pass 3: Draw all final colored text
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : colors.atoms;
          for (const pos of segmentPositions) {
            ctx.font = pos.font;
            ctx.fillText(pos.text, pos.x, pos.y);
          }
        }
        
        ctx.shadowBlur = 0;
        // Draw charge if present
        if (atom.charge) {
          ctx.save();
          
          // Calculate appropriate charge position based on atom symbol width
          const symbol = atom.symbol || atom;
          ctx.font = '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
          
          // Simplified width calculation for positioning
          let symbolWidth = 0;
          if (/\d/.test(symbol)) {
            // For formulas with subscripts, estimate total width using same parsing logic
            const parts = [];
            let currentText = '';
            let isNumber = false;
            
            for (let i = 0; i < symbol.length; i++) {
              const char = symbol[i];
              const charIsNumber = /\d/.test(char);
              
              if (i === 0) {
                currentText = char;
                isNumber = charIsNumber;
              } else if (charIsNumber !== isNumber) {
                parts.push({ text: currentText, isNumber });
                currentText = char;
                isNumber = charIsNumber;
              } else {
                currentText += char;
              }
            }
            
            if (currentText) {
              parts.push({ text: currentText, isNumber });
            }
            
            // Calculate total width
            for (const part of parts) {
              ctx.font = part.isNumber ? '40 18px "Inter", "Segoe UI", "Arial", sans-serif' : '400 26px "Inter", "Segoe UI", "Arial", sans-serif';
              symbolWidth += ctx.measureText(part.text).width;
              if (!part.isNumber && parts.indexOf(part) < parts.length - 1 && parts[parts.indexOf(part) + 1].isNumber) {
                symbolWidth -= 2; // Account for kerning
              }
            }
          } else {
            symbolWidth = ctx.measureText(symbol).width;
          }
          
          // Use increased vertical distance for charge to avoid overlap with lone pairs
          const fixedVerticalOffset = 20; 
          
          // Horizontal spacing still scales with atom width if needed
          const horizontalPadding = 4;
          const horizontalRadius = Math.max(16, symbolWidth / 2 + horizontalPadding);
          
          // Find the actual vertex to get type and isTop status
          const actualVertexForCharge = vertices.find(v => Math.abs(v.x - vx) < 0.01 && Math.abs(v.y - vy) < 0.01);
          const safeVertexForCharge = actualVertexForCharge || { x: vx, y: vy };
          
          // Get vertex type and isTop status
          const vertexTypeForCharge = getType(safeVertexForCharge, vertexTypes, segments);
          const isTopForCharge = getIfTop(safeVertexForCharge, segments);
          
          // Determine if charge should be placed below the atom instead of above
          // Based on specific vertex type and isTop combinations
          let placeBelow = false;
          
          // Check the specific cases where charge should appear below:
          if ((vertexTypeForCharge === 'B' && isTopForCharge) ||
              (vertexTypeForCharge === 'C' && !isTopForCharge) ||
              (vertexTypeForCharge === 'D' && !isTopForCharge) ||
              (vertexTypeForCharge === 'E' && isTopForCharge) ||
              (vertexTypeForCharge === 'F' && isTopForCharge) ||
              (vertexTypeForCharge === 'G' && !isTopForCharge) ||
              (vertexTypeForCharge === 'H' && isTopForCharge)) {
            placeBelow = true;
          }
          
          // Determine charge placement based on vertex type and isTop status
          
          // Position the charge based on the determination
          // Move 10 pixels to the left as requested
          const chargeX = vx - 18;
          const chargeY = placeBelow ? vy + fixedVerticalOffset : vy - fixedVerticalOffset;
          
          // Turn off any shadows for the white background
          ctx.shadowColor = 'rgba(0,0,0,0)';
          ctx.shadowBlur = 0;
          
          // Draw a white circle background for charge symbol
          ctx.beginPath();
          ctx.arc(chargeX, chargeY, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff'; // Use full hex code for pure white
          ctx.fill();
          // Add ring around the white circle (blue for selected, black for normal)
          ctx.strokeStyle = isSelected ? 'rgb(54,98,227)' : '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Draw charge symbol
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : colors.atoms;
          
          if (atom.charge > 0) {
            // Plus sign - perfect do not change.
            ctx.font = '18px "Inter", "Segoe UI", "Arial", sans-serif';
            ctx.fillText('+', chargeX + 0.1, chargeY + 1.5);
          } else {
            // Minus sign - perfect do not change.
            ctx.font = '24px "Inter", "Segoe UI", "Arial", sans-serif';
            ctx.fillText('-', chargeX +.4, chargeY - .4);
          }
          ctx.restore();
        }
        // Draw lone pairs if present
        if (atom.lonePairs) {
          ctx.save();
          
          // Set color for lone pairs (blue for selected, black for normal)
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : colors.atoms;
          // Define shadow properties but they will be toggled on/off as needed
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 2;
          const n = atom.lonePairs;
          const dotR = 2.6; // dot radius reduced from 3.2 to make dots smaller
          
          // Calculate appropriate distance based on atom symbol width
          const symbol = atom.symbol || atom;
          ctx.font = '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
          
          // Measure the width and account for subscripts if present using same parsing logic
          let symbolWidth = 0;
          if (/\d/.test(symbol)) {
            const parts = [];
            let currentText = '';
            let isNumber = false;
            
            for (let i = 0; i < symbol.length; i++) {
              const char = symbol[i];
              const charIsNumber = /\d/.test(char);
              
              if (i === 0) {
                currentText = char;
                isNumber = charIsNumber;
              } else if (charIsNumber !== isNumber) {
                parts.push({ text: currentText, isNumber });
                currentText = char;
                isNumber = charIsNumber;
              } else {
                currentText += char;
              }
            }
            
            if (currentText) {
              parts.push({ text: currentText, isNumber });
            }
            
            // Calculate total width
            for (const part of parts) {
              ctx.font = part.isNumber ? '40 18px "Inter", "Segoe UI", "Arial", sans-serif' : '400 26px "Inter", "Segoe UI", "Arial", sans-serif';
              symbolWidth += ctx.measureText(part.text).width;
              if (!part.isNumber && parts.indexOf(part) < parts.length - 1 && parts[parts.indexOf(part) + 1].isNumber) {
                symbolWidth -= 2; // Account for kerning
              }
            }
          } else {
            symbolWidth = ctx.measureText(symbol).width;
          }
          
          // Calculate appropriate distance based on symbol width - much closer to the atom
          // Use smaller base radius to keep lone pairs closer to the atom
          const baseRadius = 14; // increased from 12 to move lone pairs further away (+2px)
          
          // Calculate radius based on symbol width but with tighter spacing
          const padding = 6; // increased from 4px to move dots further from text (+2px)
          const r = Math.max(baseRadius, symbolWidth / 2 + padding);
          
          // Use consistent vertical spacing regardless of atom width
          // Only adjust the horizontal spacing based on symbol width
          const verticalOffset = 16; 
          
          // Calculate horizontal offset based on symbol width
          const baseHorizontalOffset = 16;
          const widthAdjustment = symbolWidth > 20 ? (symbolWidth - 20) / 2 : 0;
          const horizontalOffset = baseHorizontalOffset + widthAdjustment;
          
          // Place lone pairs in fixed positions (top, right, bottom, left)
          // This simplified approach removes the complex positioning logic that doesn't change the result
          let dots = [];
          let placed = 0;
          
          // Get connected bonds for this vertex for lone pair positioning
          // Get bonds connected to this vertex using our simplified function
          const connectedBonds = getConnectedBonds({ x: vx, y: vy }, segments);
          
          // Check if vertex is in a ring
          const vertexKey = `${vx.toFixed(2)},${vy.toFixed(2)}`;
          const rings = detectedRings || [];
          const isInRing = rings.some(ring => {
            // Ensure ring is an array and has the expected structure
            if (!Array.isArray(ring)) return false;
            return ring.some(v => {
              // Handle both vertex objects and string keys
              if (typeof v === 'string') {
                return v === vertexKey;
              } else if (v && typeof v === 'object' && v.x !== undefined && v.y !== undefined) {
                return Math.abs(v.x - vx) < 0.01 && Math.abs(v.y - vy) < 0.01;
              }
              return false;
            });
          });
          
          // Control lone pair orientation in rings
          const ringInteriorOverride = isInRing;
          
          // Check if we already have a stored priority order from the click interaction
          let priorityNames;
          if (atom.lonePairOrder) {
            priorityNames = atom.lonePairOrder;
          } else {
            // Find the actual vertex object with stored state instead of creating a new one
            const actualVertex = vertices.find(v => Math.abs(v.x - vx) < 0.01 && Math.abs(v.y - vy) < 0.01);
            
            // Create a fallback vertex if no matching vertex is found
            const safeVertex = actualVertex || { x: vx, y: vy };
            
            // Get vertex type and isTop using the vertex object with null safety
            const vertexTypeForLonePairs = getType(safeVertex, vertexTypes, segments);
            const isTopForLonePairs = getIfTop(safeVertex, segments);
            
            // Calculate priority order if none is stored
            priorityNames = getLonePairPositionOrder(connectedBonds, safeVertex);
          }
          
          // Map position names to angles
          const positionAngles = {
            'top': 90,
            'right': 0,
            'bottom': 270,
            'left': 180
          };
          
          // Create fixedPositions array based on priority order
          const fixedPositions = priorityNames.map(name => ({
            angle: positionAngles[name],
            name: name
          }));
          
          // Place lone pairs on fixed positions
          // Apply the priority order for lone pair placement
          
          for (let i = 0; i < fixedPositions.length && placed < n; i++) {
            const pos = fixedPositions[i];
            
            // Calculate position
            let cx, cy;
            const angleRad = pos.angle * Math.PI / 180;
            
            // Use different radii based on position type
            let radius;
            if (pos.name === 'left' || pos.name === 'right') {
              // Horizontal positions: use horizontal offset
              radius = horizontalOffset + 2;
            } else if (pos.name === 'top' || pos.name === 'bottom') {
              // Vertical positions: use fixed vertical offset
              radius = verticalOffset + 2;
            } else {
              // Shouldn't happen with our fixed positions
              radius = Math.max(horizontalOffset, verticalOffset) + 2;
            }
            
            cx = vx + radius * Math.cos(angleRad);
            cy = vy - radius * Math.sin(angleRad); // Negative because canvas Y increases downward
            

            
            if (n - placed === 1) {
              // Only one dot left: place in the center of this position
              dots.push({
                position: pos.name,
                coords: [cx, cy],
                priority: i  // Store the priority for debugging
              });
              placed++;
            } else if (n - placed >= 2) {
              // Place two dots symmetrically around the center
              const offset = 5; // spacing between dots
              
              // IMPORTANT: When in a ring, always use the ring orientation and don't let substituents affect it
              // So we only compute default orientation based on connected atoms if we're not in a ring
              if (!ringInteriorOverride) {
                if (pos.name === 'top' || pos.name === 'bottom') {
                  // For top/bottom positions, place dots horizontally
                  dots.push({
                    position: pos.name,
                    coords: [cx - offset, cy],
                    priority: i
                  });
                  dots.push({
                    position: pos.name,
                    coords: [cx + offset, cy],
                    priority: i
                  });
                } else {
                  // For left/right positions, place dots vertically
                  dots.push({
                    position: pos.name,
                    coords: [cx, cy - offset],
                    priority: i
                  });
                  dots.push({
                    position: pos.name,
                    coords: [cx, cy + offset],
                    priority: i
                  });
                }
              } else {
                // In a ring, always place dots vertically
                dots.push({
                  position: pos.name,
                  coords: [cx, cy - offset],
                  priority: i
                });
                dots.push({
                  position: pos.name,
                  coords: [cx, cy + offset],
                  priority: i
                });
              }
              
              placed += 2;
            }
          }
          
          // Draw all lone pair dots
          for (const dot of dots) {
            const [cx, cy] = dot.coords;
            // Draw white background with no shadow
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(cx, cy, dotR + 1.8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // Draw the black dot with shadow
            ctx.shadowColor = 'rgba(0,0,0,0.85)';
            ctx.shadowBlur = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, dotR, 0, 2 * Math.PI);
            
            // Set color for lone pair dots (blue for selected, black for normal)
            ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : colors.atoms;
            
            ctx.fill();
          }
          ctx.restore();
        }
      }
    });



    // Draw hover circle if hovering over a vertex
    if (hoverVertex) {
      ctx.save();
      const hx = hoverVertex.x + offset.x;
      const hy = hoverVertex.y + offset.y;
      
      // Blue circle for all modes (smaller and more subtle)
      ctx.beginPath();
      ctx.arc(hx, hy, 10, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(54, 98, 227, 0.3)';
      ctx.fill();
      
      // Draw small gray plus sign in the center for all modes
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      // Horizontal line of plus (smaller)
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy);
      ctx.lineTo(hx + 4, hy);
      ctx.stroke();
      
      // Vertical line of plus (smaller)
      ctx.beginPath();
      ctx.moveTo(hx, hy - 4);
      ctx.lineTo(hx, hy + 4);
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Highlight draggable vertices (free-floating or off-grid) in mouse mode
    if (mode === 'mouse') {
      vertices.forEach(v => {
        const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
        const isFreeFloating = freeFloatingVertices.has(key);
        const isOffGrid = v.isOffGrid === true;
        
        if (isFreeFloating || isOffGrid) {
          const isBeingDragged = draggingVertex && 
            Math.abs(draggingVertex.x - v.x) < 0.01 && 
            Math.abs(draggingVertex.y - v.y) < 0.01;
          
          // Get the atom symbol to determine the box size
          const atom = vertexAtoms[key];
          
          if (atom) {
            ctx.save();
            
            // Calculate text width to determine box dimensions
            let symbol = atom.symbol || atom;
            ctx.font = '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
            
            // Measure the symbol width considering subscripts
            let symbolWidth = 0;
            let symbolHeight = 26; // Default height
            
            if (/\d/.test(symbol)) {
              // For formulas with subscripts, use the same parsing logic as in text rendering
              const segments = [];
              let currentSegment = '';
              let isCurrentNumber = false;
              
              for (let i = 0; i < symbol.length; i++) {
                const char = symbol[i];
                const isNumber = /[0-9]/.test(char);
                
                if (i === 0 || isNumber !== isCurrentNumber) {
                  if (currentSegment) {
                    segments.push({ text: currentSegment, isNumber: isCurrentNumber });
                  }
                  currentSegment = char;
                  isCurrentNumber = isNumber;
                } else {
                  currentSegment += char;
                }
              }
              
              if (currentSegment) {
                segments.push({ text: currentSegment, isNumber: isCurrentNumber });
              }
              
              // Calculate total width
              for (const segment of segments) {
                const font = segment.isNumber ? '400 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
                ctx.font = font;
                symbolWidth += ctx.measureText(segment.text).width;
              }
            } else {
              symbolWidth = ctx.measureText(symbol).width;
            }
            
            // Add padding around the text
            const padding = 8;
            
            // Draw a rectangular box around the text
            ctx.beginPath();
            const boxX = v.x + offset.x - symbolWidth/2 - padding;
            const boxY = v.y + offset.y - symbolHeight/2 - padding/2;
            const boxWidth = symbolWidth + padding*2;
            const boxHeight = symbolHeight + padding;
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
            
            // Use a more noticeable style when being dragged
            if (isBeingDragged) {
              ctx.strokeStyle = 'rgba(54,98,227,1.0)'; // Solid blue when dragging
              ctx.lineWidth = 2;
            } else {
              ctx.strokeStyle = 'rgba(54,98,227,0.8)'; // Slightly transparent blue
              ctx.lineWidth = 1.5;
            }
            
            ctx.stroke();
            
            // Draw small triangles on the outside to indicate draggability
            const triangleSize = 4; // Small triangles
            ctx.fillStyle = isBeingDragged ? 'rgba(54,98,227,1.0)' : 'rgba(54,98,227,0.8)';
            
            // Top triangle
            ctx.beginPath();
            ctx.moveTo(boxX + boxWidth/2, boxY - triangleSize); // Top point
            ctx.lineTo(boxX + boxWidth/2 - triangleSize, boxY); // Bottom left
            ctx.lineTo(boxX + boxWidth/2 + triangleSize, boxY); // Bottom right
            ctx.closePath();
            ctx.fill();
            
            // Right triangle
            ctx.beginPath();
            ctx.moveTo(boxX + boxWidth + triangleSize, boxY + boxHeight/2); // Right point
            ctx.lineTo(boxX + boxWidth, boxY + boxHeight/2 - triangleSize); // Top left
            ctx.lineTo(boxX + boxWidth, boxY + boxHeight/2 + triangleSize); // Bottom left
            ctx.closePath();
            ctx.fill();
            
            // Bottom triangle
            ctx.beginPath();
            ctx.moveTo(boxX + boxWidth/2, boxY + boxHeight + triangleSize); // Bottom point
            ctx.lineTo(boxX + boxWidth/2 - triangleSize, boxY + boxHeight); // Top left
            ctx.lineTo(boxX + boxWidth/2 + triangleSize, boxY + boxHeight); // Top right
            ctx.closePath();
            ctx.fill();
            
            // Left triangle
            ctx.beginPath();
            ctx.moveTo(boxX - triangleSize, boxY + boxHeight/2); // Left point
            ctx.lineTo(boxX, boxY + boxHeight/2 - triangleSize); // Top right
            ctx.lineTo(boxX, boxY + boxHeight/2 + triangleSize); // Bottom right
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            // For vertices with no atom label, use a four-way arrow
            ctx.save();
            
            const centerX = v.x + offset.x;
            const centerY = v.y + offset.y;
            const arrowSize = 13; // Half the total size (so 24px total)
            
            if (isBeingDragged) {
              ctx.strokeStyle = 'rgba(54,98,227,1.0)';
              ctx.fillStyle = 'rgba(54,98,227,1.0)';
              ctx.lineWidth = 5;
            } else {
              ctx.strokeStyle = 'rgba(54,98,227,0.8)';
              ctx.fillStyle = 'rgba(54,98,227,0.8)';
              ctx.lineWidth = 2.5;
            }
            
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // Draw four-way arrow (cross with arrowheads)
            ctx.beginPath();
            
            // Horizontal line
            ctx.moveTo(centerX - arrowSize, centerY);
            ctx.lineTo(centerX + arrowSize, centerY);
            
            // Vertical line  
            ctx.moveTo(centerX, centerY - arrowSize);
            ctx.lineTo(centerX, centerY + arrowSize);
            
            ctx.stroke();
            
            // Draw arrowheads
            const arrowheadSize = 4;
            
            // Right arrowhead
            ctx.beginPath();
            ctx.moveTo(centerX + arrowSize, centerY);
            ctx.lineTo(centerX + arrowSize - arrowheadSize, centerY - arrowheadSize);
            ctx.lineTo(centerX + arrowSize - arrowheadSize, centerY + arrowheadSize);
            ctx.closePath();
            ctx.fill();
            
            // Left arrowhead
            ctx.beginPath();
            ctx.moveTo(centerX - arrowSize, centerY);
            ctx.lineTo(centerX - arrowSize + arrowheadSize, centerY - arrowheadSize);
            ctx.lineTo(centerX - arrowSize + arrowheadSize, centerY + arrowheadSize);
            ctx.closePath();
            ctx.fill();
            
            // Up arrowhead
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - arrowSize);
            ctx.lineTo(centerX - arrowheadSize, centerY - arrowSize + arrowheadSize);
            ctx.lineTo(centerX + arrowheadSize, centerY - arrowSize + arrowheadSize);
            ctx.closePath();
            ctx.fill();
            
            // Down arrowhead
            ctx.beginPath();
            ctx.moveTo(centerX, centerY + arrowSize);
            ctx.lineTo(centerX - arrowheadSize, centerY + arrowSize - arrowheadSize);
            ctx.lineTo(centerX + arrowheadSize, centerY + arrowSize - arrowheadSize);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
          }
        }
      });
    }



    // Draw fourth bond preview if in fourth bond mode or draw/stereochemistry mode with source
    if ((fourthBondMode || ((mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && fourthBondSource)) && fourthBondPreview) {
      ctx.save();
      
      const sx1 = fourthBondPreview.startX;
      const sy1 = fourthBondPreview.startY;
      const sx2 = fourthBondPreview.endX;
      const sy2 = fourthBondPreview.endY;
      // Use blue when snapped to anything (grid or bond preview), light gray otherwise
      const previewColor = (fourthBondPreview.snappedToGrid || fourthBondPreview.snappedToVertex) ? '#2196F3' : '#888888';
      
      // Check if we're in a stereochemistry mode to show the appropriate preview
      if (mode === 'wedge') {
        // Draw wedge bond preview
        ctx.beginPath();
        
        // Get perpendicular unit vector for triangle width
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const length = Math.hypot(dx, dy);
        const ux = dx / length;
        const uy = dy / length;
        const perpX = -uy;
        const perpY = ux;
        
        // Width of wedge at the wide end
        const wedgeWidth = 8;
        
        // Always use forward direction for preview (narrow end at start point)
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2 + perpX * wedgeWidth, sy2 + perpY * wedgeWidth);
        ctx.lineTo(sx2 - perpX * wedgeWidth, sy2 - perpY * wedgeWidth);
        ctx.closePath();
        ctx.fillStyle = previewColor;
        ctx.fill();
      } 
      else if (mode === 'dash') {
        // Draw dash bond preview
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const length = Math.hypot(dx, dy);
        const ux = dx / length;
        const uy = dy / length;
        const perpX = -uy;
        const perpY = ux;
        
        // Dash properties
        const minDashWidth = 4;
        const maxDashWidth = 13;
        const totalDashes = 6;
        const dashSpacing = length / (totalDashes - 1);
        
        ctx.strokeStyle = previewColor;
        ctx.lineWidth = 3;
        
        for (let i = 0; i < totalDashes; i++) {
          const t = i / (totalDashes - 1);
          const dashX = sx1 + dx * t;
          const dashY = sy1 + dy * t;
          const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * t;
          
          ctx.beginPath();
          ctx.lineCap = 'round'; // Add rounded ends to the line
          ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
          ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
          ctx.stroke();
        }
      }
      else if (mode === 'ambiguous') {
        // Draw ambiguous bond preview (wavy/squiggly line)
        ctx.beginPath();
        
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const length = Math.hypot(dx, dy);
        const ux = dx / length;
        const uy = dy / length;
        const perpX = -uy;
        const perpY = ux;
        
        // Wave properties
        const waveWidth = 4.5;
        const waveFrequency = 6;
        const waveSegments = 36;
        
        ctx.strokeStyle = previewColor;
        ctx.lineWidth = 3;
        
        // Draw a squiggly line
        for (let i = 0; i <= waveSegments; i++) {
          const t = i / waveSegments;
          const x = sx1 + dx * t;
          const y = sy1 + dy * t;
          
          const wave = Math.sin(t * Math.PI * 2 * waveFrequency) * waveWidth;
          const waveX = x + perpX * wave;
          const waveY = y + perpY * wave;
          
          if (i === 0) {
            ctx.moveTo(waveX, waveY);
          } else {
            ctx.lineTo(waveX, waveY);
          }
        }
        
        ctx.stroke();
      }
      else {
        // Regular line bond preview
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = previewColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.restore();
    }

    // Draw arrows
    arrows.forEach((arrow, index) => {
      const { x1, y1, x2, y2, type } = arrow;
      const ox1 = x1 + offset.x;
      const oy1 = y1 + offset.y;
      const ox2 = x2 + offset.x;
      const oy2 = y2 + offset.y;
      if (!type || type === 'arrow') {
        // Use blue color for selected arrows in mouse mode
        const isSelected = mode === 'mouse' && selectedArrows.has(index);
        const arrowColor = isSelected ? 'rgb(54,98,227)' : '#000';
        
                      drawArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, arrowColor, 3, mode);
        
        // Draw four-way arrow indicator in the center of forward arrows when in mouse mode
        if (mode === 'mouse') {
          // Calculate center point
          const centerX = (ox1 + ox2) / 2;
          const centerY = (oy1 + oy2) / 2;
          
          // Draw the four-way arrow
          ctx.save();
          
          const arrowSize = 12; // Size from center (extended by 4px)
          const arrowheadSize = 4;
          
          ctx.strokeStyle = 'rgba(54,98,227,0.8)';
          ctx.fillStyle = 'rgba(54,98,227,0.8)';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          
          // Draw four-way arrow (cross with arrowheads)
          ctx.beginPath();
          
          // Horizontal line
          ctx.moveTo(centerX - arrowSize, centerY);
          ctx.lineTo(centerX + arrowSize, centerY);
          
          // Vertical line  
          ctx.moveTo(centerX, centerY - arrowSize);
          ctx.lineTo(centerX, centerY + arrowSize);
          
          ctx.stroke();
          
          // Draw arrowheads
          
          // Right arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX + arrowSize, centerY);
          ctx.lineTo(centerX + arrowSize - arrowheadSize, centerY - arrowheadSize);
          ctx.lineTo(centerX + arrowSize - arrowheadSize, centerY + arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          // Left arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX - arrowSize, centerY);
          ctx.lineTo(centerX - arrowSize + arrowheadSize, centerY - arrowheadSize);
          ctx.lineTo(centerX - arrowSize + arrowheadSize, centerY + arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          // Up arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - arrowSize);
          ctx.lineTo(centerX - arrowheadSize, centerY - arrowSize + arrowheadSize);
          ctx.lineTo(centerX + arrowheadSize, centerY - arrowSize + arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          // Down arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + arrowSize);
          ctx.lineTo(centerX - arrowheadSize, centerY + arrowSize - arrowheadSize);
          ctx.lineTo(centerX + arrowheadSize, centerY + arrowSize - arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
      } else if (type === 'equil') {
        // Use independent arrow coordinates if available
        const topX1 = arrow.topX1 !== undefined ? arrow.topX1 + offset.x : ox1;
        const topX2 = arrow.topX2 !== undefined ? arrow.topX2 + offset.x : ox2;
        const bottomX1 = arrow.bottomX1 !== undefined ? arrow.bottomX1 + offset.x : ox1;
        const bottomX2 = arrow.bottomX2 !== undefined ? arrow.bottomX2 + offset.x : ox2;
        
        // Use blue color for selected arrows in mouse mode
        const isSelected = mode === 'mouse' && selectedArrows.has(index);
        const arrowColor = isSelected ? 'rgb(54,98,227)' : '#000';
        
                      drawEquilArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, arrowColor, 3, topX1, topX2, bottomX1, bottomX2, index, mode, isPointInArrowCircle, offset);
        
        // Draw four-way arrow indicator in the center of equilibrium arrows when in mouse mode
        if (mode === 'mouse') {
          // Calculate center point
          const centerX = (ox1 + ox2) / 2;
          const centerY = oy1; // For equilibrium arrows, use the middle y-coordinate
          
          // Draw the four-way arrow
          ctx.save();
          
          const arrowSize = 12; // Size from center (extended by 4px)
          const arrowheadSize = 4;
          
          ctx.strokeStyle = 'rgba(54,98,227,0.8)';
          ctx.fillStyle = 'rgba(54,98,227,0.8)';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          
          // Draw four-way arrow (cross with arrowheads)
          ctx.beginPath();
          
          // Horizontal line
          ctx.moveTo(centerX - arrowSize, centerY);
          ctx.lineTo(centerX + arrowSize, centerY);
          
          // Vertical line  
          ctx.moveTo(centerX, centerY - arrowSize);
          ctx.lineTo(centerX, centerY + arrowSize);
          
          ctx.stroke();
          
          // Draw arrowheads
          
          // Right arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX + arrowSize, centerY);
          ctx.lineTo(centerX + arrowSize - arrowheadSize, centerY - arrowheadSize);
          ctx.lineTo(centerX + arrowSize - arrowheadSize, centerY + arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          // Left arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX - arrowSize, centerY);
          ctx.lineTo(centerX - arrowSize + arrowheadSize, centerY - arrowheadSize);
          ctx.lineTo(centerX - arrowSize + arrowheadSize, centerY + arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          // Up arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - arrowSize);
          ctx.lineTo(centerX - arrowheadSize, centerY - arrowSize + arrowheadSize);
          ctx.lineTo(centerX + arrowheadSize, centerY - arrowSize + arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          // Down arrowhead
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + arrowSize);
          ctx.lineTo(centerX - arrowheadSize, centerY + arrowSize - arrowheadSize);
          ctx.lineTo(centerX + arrowheadSize, centerY + arrowSize - arrowheadSize);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
      } else if (type.startsWith('curve')) {
        const peakX = arrow.peakX !== undefined ? arrow.peakX + offset.x : null;
        const peakY = arrow.peakY !== undefined ? arrow.peakY + offset.y : null;
        // Use blue color for selected arrows in mouse mode
        const isSelected = mode === 'mouse' && selectedArrows.has(index);
        const arrowColor = isSelected ? 'rgb(54,98,227)' : '#000';
        
                      drawCurvedArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, type, arrowColor, index, peakX, peakY, arrows, mode, hoverCurvedArrow);
      }
    });
    
    // Draw arrow preview if necessary
    if (arrowPreview && (mode === 'arrow' || mode === 'equil' || mode.startsWith('curve'))) {
      // For curved arrows with both start and end points
      if (arrowPreview.isCurved) {
        // Draw a curved arrow from start point to current mouse position
        // Calculate peak position for preview
        const peakPos = calculateCurvedArrowPeak(
          arrowPreview.x1, 
          arrowPreview.y1, 
          arrowPreview.x2, 
          arrowPreview.y2, 
          mode
        );
        drawCurvedArrowOnCanvas(
          ctx, 
          arrowPreview.x1, 
          arrowPreview.y1, 
          arrowPreview.x2, 
          arrowPreview.y2, 
          mode, 
          'rgba(0,0,0,0.5)',
          -1,
          peakPos.x,
          peakPos.y,
          arrows,
          mode,
          hoverCurvedArrow
        );
        
        // Additionally, mark the start point more prominently to show it's fixed
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.arc(arrowPreview.x1, arrowPreview.y1, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      } 
      // For regular arrows or first click of curved arrows
      else {
        const x = arrowPreview.x;
        const y = arrowPreview.y;
        
        if (mode === 'arrow') {
          const previewX1 = x - 40;
          const previewY1 = y;
          const previewX2 = x + 40;
          const previewY2 = y;
          drawArrowOnCanvas(ctx, previewX1, previewY1, previewX2, previewY2, 'rgba(0,0,0,0.4)', 3, mode);
        } else if (mode === 'equil') {
          const previewX1 = x - 40;
          const previewY1 = y;
          const previewX2 = x + 40;
          const previewY2 = y;
          // Use same coordinates for top and bottom in the preview
          drawEquilArrowOnCanvas(ctx, previewX1, previewY1, previewX2, previewY2, 'rgba(0,0,0,0.4)', 3, 
            previewX1, previewX2, previewX1, previewX2, -1, mode, isPointInArrowCircle, offset);
        } else if (mode.startsWith('curve')) {
          // For first click of a curved arrow, show a small indicator with directional tip
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          // Main dot
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add a directional tip based on the arrow type
          const isTopRow = ['curve0', 'curve1', 'curve2'].includes(mode);
          const tipX = x + 12;
          const tipY = y + (isTopRow ? -4 : 4);
          
          ctx.beginPath();
          ctx.moveTo(x + 8, y);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(x + 16, y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          
          // Add a hint text for where to click next
          ctx.save();
          ctx.font = '14px Arial';
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillText('Click to place endpoint', x + 22, y);
          ctx.restore();
        }
      }
    }
    
          // Draw the first point of a curved arrow if it exists
      if (curvedArrowStartPoint && mode.startsWith('curve')) {
        const startX = curvedArrowStartPoint.x + offset.x;
        const startY = curvedArrowStartPoint.y + offset.y;
        
        ctx.save();
        // Draw a small circle with a diamond tip to indicate start point
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        // Main dot
        ctx.beginPath();
        ctx.arc(startX, startY, 5, 0, 2 * Math.PI);
        ctx.fill();
        // Diamond tip to show direction
        ctx.beginPath();
        ctx.moveTo(startX + 8, startY);
        ctx.lineTo(startX + 12, startY + 4);
        ctx.lineTo(startX + 16, startY);
        ctx.lineTo(startX + 12, startY - 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      
      // Draw selection box if selecting
      if (isSelecting) {
        ctx.save();
        const x1 = Math.min(selectionStart.x, selectionEnd.x);
        const y1 = Math.min(selectionStart.y, selectionEnd.y);
        const x2 = Math.max(selectionStart.x, selectionEnd.x);
        const y2 = Math.max(selectionStart.y, selectionEnd.y);
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Draw selection rectangle
        ctx.strokeStyle = 'rgba(54, 98, 227, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x1, y1, width, height);
        
        // Draw semi-transparent fill
        ctx.fillStyle = 'rgba(54, 98, 227, 0.1)';
        ctx.fillRect(x1, y1, width, height);
        
        ctx.restore();
      }
      
      // Draw persistent selection border
      if (selectionBounds && (selectedSegments.size > 0 || selectedVertices.size > 0 || selectedArrows.size > 0)) {
        ctx.save();
        const { x1, y1, x2, y2 } = selectionBounds;
        const width = x2 - x1;
        const height = y2 - y1;
        
        ctx.strokeStyle = 'rgba(54, 98, 227, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(x1, y1, width, height);
        
        ctx.restore();
      }
      
      // Draw paste preview
      if (isPasteMode && clipboard) {
        ctx.save();
        ctx.globalAlpha = 0.5; // Semi-transparent preview
        
        // Use snapped position if available, otherwise use mouse position
        let previewX, previewY;
        if (snapAlignment && showSnapPreview) {
          if (snapAlignment.type === 'bond') {
            // For bond alignment, the translation already accounts for the exact positioning
            // Don't add mouse position since the translation is absolute
            previewX = snapAlignment.translation.x;
            previewY = snapAlignment.translation.y;
          } else {
            // For grid alignment, combine mouse position with translation offset
            previewX = pastePreviewPosition.x - offset.x + snapAlignment.translation.x;
            previewY = pastePreviewPosition.y - offset.y + snapAlignment.translation.y;
          }
        } else {
          previewX = pastePreviewPosition.x - offset.x;
          previewY = pastePreviewPosition.y - offset.y;
        }
        
        // Highlight the target bond for bond alignment
        if (snapAlignment && showSnapPreview && snapAlignment.type === 'bond' && snapAlignment.targetBond) {
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = '#4CAF50'; // Green for bond snap target
          ctx.lineWidth = 6; // Thicker highlight
          
          const targetBond = snapAlignment.targetBond;
          const bx1 = targetBond.x1 + offset.x;
          const by1 = targetBond.y1 + offset.y;
          const bx2 = targetBond.x2 + offset.x;
          const by2 = targetBond.y2 + offset.y;
          
          ctx.beginPath();
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bx2, by2);
          ctx.stroke();
          
          ctx.restore();
        }
        
        // Highlight the target grid vertex closest to molecule center
        if (snapAlignment && showSnapPreview && snapAlignment.vertexMappings && snapAlignment.vertexMappings.size > 0) {
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#4CAF50'; // Green for snap target
          ctx.strokeStyle = '#4CAF50';
          ctx.lineWidth = 2;
          
          // Calculate center of the pasted molecule
          let centerX = 0, centerY = 0;
          clipboard.vertices.forEach(vertex => {
            centerX += previewX + vertex.x;
            centerY += previewY + vertex.y;
          });
          centerX /= clipboard.vertices.length;
          centerY /= clipboard.vertices.length;
          
          // Find the target grid vertex closest to the molecule center
          let closestGridVertex = null;
          let minDistanceToCenter = Infinity;
          
          snapAlignment.vertexMappings.forEach((gridVertex) => {
            const distance = Math.sqrt(
              (gridVertex.x - centerX) ** 2 + (gridVertex.y - centerY) ** 2
            );
            if (distance < minDistanceToCenter) {
              minDistanceToCenter = distance;
              closestGridVertex = gridVertex;
            }
          });
          
          // Draw highlight circle only on the closest vertex
          if (closestGridVertex) {
            const gx = closestGridVertex.x + offset.x;
            const gy = closestGridVertex.y + offset.y;
            
            // Draw highlight circle around target grid vertex
            ctx.beginPath();
            ctx.arc(gx, gy, 8, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Fill center
            ctx.beginPath();
            ctx.arc(gx, gy, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
          
          ctx.restore();
        }
        
        // Draw preview vertices with atoms
        clipboard.vertices.forEach((vertex, vertexIndex) => {
          let vx, vy;
          
          // Apply rotation if this is bond alignment
          if (snapAlignment && snapAlignment.type === 'bond') {
            const rotationCenter = snapAlignment.rotationCenter;
            const cos = Math.cos(snapAlignment.rotation);
            const sin = Math.sin(snapAlignment.rotation);
            
            // Rotate vertex around rotation center
            const rotatedVertex = {
              x: (vertex.x - rotationCenter.x) * cos - (vertex.y - rotationCenter.y) * sin + rotationCenter.x,
              y: (vertex.x - rotationCenter.x) * sin + (vertex.y - rotationCenter.y) * cos + rotationCenter.y
            };
            
            vx = previewX + rotatedVertex.x;
            vy = previewY + rotatedVertex.y;
          } else {
            vx = previewX + vertex.x;
            vy = previewY + vertex.y;
          }
          
          // Draw atom label with exact same logic as main rendering
          if (vertex.atom) {
            ctx.save();
            let symbol = vertex.atom.symbol || vertex.atom;
            
            // Use exact same font rendering as main drawing
            const segments = [];
            let currentSegment = '';
            let isCurrentNumber = false;
            
            for (let i = 0; i < symbol.length; i++) {
              const char = symbol[i];
              const isNumber = /[0-9]/.test(char);
              
              if (i === 0 || isNumber !== isCurrentNumber) {
                if (currentSegment) {
                  segments.push({ text: currentSegment, isNumber: isCurrentNumber });
                }
                currentSegment = char;
                isCurrentNumber = isNumber;
              } else {
                currentSegment += char;
              }
            }
            
            if (currentSegment) {
              segments.push({ text: currentSegment, isNumber: isCurrentNumber });
            }
            
            // Calculate total width for centering (same as main rendering)
            let totalWidth = 0;
            for (const segment of segments) {
              const font = segment.isNumber ? '400 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
              ctx.font = font;
              const segmentWidth = ctx.measureText(segment.text).width;
              totalWidth += segmentWidth;
              
              // Apply kerning adjustment
              if (segment.isNumber && segments.indexOf(segment) > 0) {
                const prevSegment = segments[segments.indexOf(segment) - 1];
                if (prevSegment && !prevSegment.isNumber) {
                  const lastChar = prevSegment.text.slice(-1);
                  if (['C', 'O'].includes(lastChar)) {
                    totalWidth -= 3;
                  } else if (['F', 'P', 'S'].includes(lastChar)) {
                    totalWidth -= 2.8;
                  } else if (['N', 'E', 'B'].includes(lastChar)) {
                    totalWidth -= 2.5;
                  } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
                    totalWidth -= 1.7;
                  } else if (['l', 'i'].includes(lastChar)) {
                    totalWidth -= 1.3;
                  } else {
                    totalWidth -= 2.3;
                  }
                }
              }
            }
            
            // Calculate positions for all segments first (same as main rendering)
            const segmentPositions = [];
            let currentX = vx + offset.x - totalWidth / 2;
            const baseYOffset = 2;
            
            for (const segment of segments) {
              const isNumber = segment.isNumber;
              const font = isNumber ? '40 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
              const yOffset = isNumber ? 4 : 0;
              
              ctx.font = font;
              const segmentWidth = ctx.measureText(segment.text).width;
              
              segmentPositions.push({
                text: segment.text,
                font: font,
                x: currentX,
                y: vy + offset.y + baseYOffset + yOffset,
                isNumber: isNumber
              });
              
              currentX += segmentWidth;
              
              // Apply kerning
              if (isNumber && segments.indexOf(segment) > 0) {
                const prevSegment = segments[segments.indexOf(segment) - 1];
                if (prevSegment && !prevSegment.isNumber) {
                  const lastChar = prevSegment.text.slice(-1);
                  if (['C', 'O'].includes(lastChar)) {
                    currentX -= 3;
                  } else if (['F', 'P', 'S'].includes(lastChar)) {
                    currentX -= 2.8;
                  } else if (['N', 'E', 'B'].includes(lastChar)) {
                    currentX -= 2.5;
                  } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
                    currentX -= 1.7;
                  } else if (['l', 'i'].includes(lastChar)) {
                    currentX -= 1.3;
                  } else {
                    currentX -= 2.3;
                  }
                }
              }
            }
            
            // Render in three passes to prevent overlap issues (same as main rendering)
            // For single characters, use center alignment for better centering
            if (segments.length === 1 && !segments[0].isNumber) {
              ctx.textAlign = 'center';
              // Update the single segment position to use vertex center
              segmentPositions[0].x = vx + offset.x;
            } else {
              ctx.textAlign = 'left';
            }
            ctx.textBaseline = 'middle';
            
            // Pass 1: Draw background strokes for contrast (export uses light mode)
            ctx.shadowColor = 'rgba(255,255,255,0.85)';
            ctx.shadowBlur = 4;
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#fff';
            for (const pos of segmentPositions) {
              ctx.font = pos.font;
              ctx.strokeText(pos.text, pos.x, pos.y);
            }
            ctx.shadowBlur = 0;
            
            // Pass 2: Draw background fills to fill holes in letters (export uses light mode)
            ctx.fillStyle = '#ffffff';
            for (const pos of segmentPositions) {
              ctx.font = pos.font;
              ctx.fillText(pos.text, pos.x, pos.y);
            }
            
            // Pass 3: Draw all final colored text
            ctx.fillStyle = '#888'; // Gray for preview
            for (const pos of segmentPositions) {
              ctx.font = pos.font;
              ctx.fillText(pos.text, pos.x, pos.y);
            }
            
            // Draw charge if present (same position logic as main rendering)
            if (vertex.atom.charge) {
              ctx.save();
              const chargeX = vx + offset.x + totalWidth/2 + 8;
              const chargeY = vy + offset.y - 8;
              
              const chargeSymbol = vertex.atom.charge > 0 ? '+' : '−';
              
              ctx.font = '600 16px "Inter", "Segoe UI", "Arial", sans-serif';
              ctx.shadowColor = 'rgba(255,255,255,0.85)';
              ctx.shadowBlur = 4;
              ctx.lineWidth = 4;
              ctx.strokeStyle = '#fff';
              ctx.strokeText(chargeSymbol, chargeX, chargeY);
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#888';
              ctx.fillText(chargeSymbol, chargeX, chargeY);
              ctx.restore();
            }
            
            ctx.restore();
          }
          // Note: Don't draw anything for vertices without atoms
        });
        
        // Draw preview segments with bond alignment feedback
        clipboard.segments.forEach(segment => {
          const v1 = clipboard.vertices[segment.vertex1Index];
          const v2 = clipboard.vertices[segment.vertex2Index];
          if (v1 && v2) {
            let x1, y1, x2, y2;
            
            // Apply rotation if this is bond alignment
            if (snapAlignment && snapAlignment.type === 'bond') {
              const rotationCenter = snapAlignment.rotationCenter;
              const cos = Math.cos(snapAlignment.rotation);
              const sin = Math.sin(snapAlignment.rotation);
              
              // Rotate v1 around rotation center
              const rotatedV1 = {
                x: (v1.x - rotationCenter.x) * cos - (v1.y - rotationCenter.y) * sin + rotationCenter.x,
                y: (v1.x - rotationCenter.x) * sin + (v1.y - rotationCenter.y) * cos + rotationCenter.y
              };
              
              // Rotate v2 around rotation center
              const rotatedV2 = {
                x: (v2.x - rotationCenter.x) * cos - (v2.y - rotationCenter.y) * sin + rotationCenter.x,
                y: (v2.x - rotationCenter.x) * sin + (v2.y - rotationCenter.y) * cos + rotationCenter.y
              };
              
              x1 = previewX + rotatedV1.x + offset.x;
              y1 = previewY + rotatedV1.y + offset.y;
              x2 = previewX + rotatedV2.x + offset.x;
              y2 = previewY + rotatedV2.y + offset.y;
            } else {
              x1 = previewX + v1.x + offset.x;
              y1 = previewY + v1.y + offset.y;
              x2 = previewX + v2.x + offset.x;
              y2 = previewY + v2.y + offset.y;
            }
            
            // Check if this bond aligns with a grid line when snapping is enabled
            let bondColor = '#888'; // Default gray
            if (snapAlignment && showSnapPreview && segment.bondOrder > 0) {
              if (snapAlignment.type === 'bond') {
                // For bond alignment, highlight the edge that aligns with the target bond
                const isAlignedEdge = snapAlignment.alignedEdgeIndex === clipboard.segments.indexOf(segment);
                bondColor = isAlignedEdge ? '#4CAF50' : '#888'; // Green for aligned edge, gray for others
              } else {
                // For grid alignment, check grid line matching
                const matchingGridLine = findMatchingGridLine(x1, y1, x2, y2);
                if (matchingGridLine) {
                  bondColor = '#4CAF50'; // Green for aligned bonds
                } else {
                  bondColor = '#F44336'; // Red for non-aligned bonds
                }
              }
            }
            
            ctx.strokeStyle = bondColor;
            ctx.lineWidth = 3;
            
            // Use the exact same rendering logic as the main drawing function
            if (segment.bondOrder === 0) {
              // Grid line - don't render in preview
              return;
            }
            
            if (segment.bondOrder === 1) {
              // Check if we should show stereochemistry preview
              const showStereochemistryPreview = false; // No hover preview in paste mode
              
              if (segment.bondType === 'wedge') {
                // Draw wedge bond
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len;
                const uy = dy / len;
                const perpX = -uy;
                const perpY = ux;
                
                // Check bond direction for wedge orientation
                const bondDirection = segment.bondDirection || 1;
                const wedgeWidth = 8;
                
                ctx.fillStyle = '#888';
              ctx.beginPath();
                
                if (bondDirection === 1) {
                  // Forward direction: narrow at start, wide at end
              ctx.moveTo(x1, y1);
                  ctx.lineTo(x2 + perpX * wedgeWidth, y2 + perpY * wedgeWidth);
                  ctx.lineTo(x2 - perpX * wedgeWidth, y2 - perpY * wedgeWidth);
                } else {
                  // Reverse direction: wide at start, narrow at end
                  ctx.moveTo(x1 + perpX * wedgeWidth, y1 + perpY * wedgeWidth);
                  ctx.lineTo(x1 - perpX * wedgeWidth, y1 - perpY * wedgeWidth);
              ctx.lineTo(x2, y2);
                }
                ctx.closePath();
                ctx.fill();
              } else if (segment.bondType === 'dash') {
                // Draw dashed bond
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len;
                const uy = dy / len;
                const perpX = -uy;
                const perpY = ux;
                
                const bondDirection = segment.bondDirection || 1;
                const minDashWidth = 4;
                const maxDashWidth = 13;
                const totalDashes = 6;
                
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                
                for (let i = 0; i < totalDashes; i++) {
                  let t = i / (totalDashes - 1);
                  if (bondDirection === -1) t = 1 - t;
                  
                  const dashX = x1 + (x2 - x1) * (i / (totalDashes - 1));
                  const dashY = y1 + (y2 - y1) * (i / (totalDashes - 1));
                  const dashWidth = minDashWidth + (maxDashWidth - minDashWidth) * t;
                  
                  ctx.beginPath();
                  ctx.moveTo(dashX - perpX * dashWidth/2, dashY - perpY * dashWidth/2);
                  ctx.lineTo(dashX + perpX * dashWidth/2, dashY + perpY * dashWidth/2);
              ctx.stroke();
                }
                ctx.lineCap = 'butt';
              } else if (segment.bondType === 'ambiguous') {
                // Draw ambiguous (wavy) bond
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len;
                const uy = dy / len;
                const perpX = -uy;
                const perpY = ux;
                
                const waveWidth = 4.5;
                const waveFrequency = 4.5;
                const waveSegments = 100;
                
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                for (let i = 0; i <= waveSegments; i++) {
                  const t = i / waveSegments;
                  const waveT = t * waveFrequency * 2 * Math.PI;
                  const waveOffset = Math.sin(waveT) * waveWidth;
                  
                  const pointX = x1 + (x2 - x1) * t + perpX * waveOffset;
                  const pointY = y1 + (y2 - y1) * t + perpY * waveOffset;
                  
                  if (i === 0) {
                    ctx.moveTo(pointX, pointY);
                  } else {
                    ctx.lineTo(pointX, pointY);
                  }
                }
                ctx.stroke();
              } else {
                // Regular single bond
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 3;
                ctx.beginPath();
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / len;
                const uy = dy / len;
                ctx.moveTo(x1 - ux * 1, y1 - uy * 1);
                ctx.lineTo(x2 + ux * 1, y2 + uy * 1);
                ctx.stroke();
              }
            } else if (segment.bondOrder === 2) {
              // Double bond - use the exact same sophisticated logic as main rendering
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const dirMainNorm = [dx / len, dy / len];
              const perpX = -dirMainNorm[1];
              const perpY = dirMainNorm[0];
              
              // Use exact same offset calculations as main rendering
              const bondOffset = 5;
              const ext = 6;
              
              // Count neighboring bonds in clipboard
              function getOtherBondsInClipboard(vx, vy, excludeSegment) {
                return clipboard.segments.filter((s, idx) => 
                  s !== excludeSegment && 
                  s.bondOrder > 0 && 
                  ((Math.abs(s.x1 - vx) < 0.01 && Math.abs(s.y1 - vy) < 0.01) ||
                   (Math.abs(s.x2 - vx) < 0.01 && Math.abs(s.y2 - vy) < 0.01))
                );
              }
              
              const v1 = clipboard.vertices[segment.vertex1Index];
              const v2 = clipboard.vertices[segment.vertex2Index];
              const bondsAtStart = getOtherBondsInClipboard(v1.x, v1.y, segment);
              const bondsAtEnd = getOtherBondsInClipboard(v2.x, v2.y, segment);
              
              // Calculate orientation based on neighboring bonds (same logic as main rendering)
              let counts = { left: 0, right: 0 };
              
              function getBondDirectionVector(bond, fromX, fromY) {
                let toX, toY;
                if (Math.abs(bond.x1 - fromX) < 0.01 && Math.abs(bond.y1 - fromY) < 0.01) {
                  toX = bond.x2;
                  toY = bond.y2;
                } else {
                  toX = bond.x1;
                  toY = bond.y1;
                }
                const dx = toX - fromX;
                const dy = toY - fromY;
                const len = Math.hypot(dx, dy);
                return len === 0 ? [0, 0] : [dx / len, dy / len];
              }
              
              [...bondsAtStart, ...bondsAtEnd].forEach(bond => {
                const isStart = bondsAtStart.includes(bond);
                const dir = getBondDirectionVector(bond, isStart ? v1.x : v2.x, isStart ? v1.y : v2.y);
                const cross = perpX * dir[1] - perpY * dir[0];
                if (cross < 0) counts.left++;
                else if (cross > 0) counts.right++;
              });
              
              let shouldFlipPerpendicular = counts.right > counts.left;
              
                             // For benzene rings, detect if this is a ring and orient toward interior
               const isBenzeneRing = clipboard.vertices.length === 6 && clipboard.segments.length === 6;
              
                             // For benzene rings, use standard perpendicular vector; for others, apply flipping logic
               let finalPerpX, finalPerpY;
               if (isBenzeneRing) {
                 finalPerpX = perpX;
                 finalPerpY = perpY;
               } else {
                 finalPerpX = shouldFlipPerpendicular ? -perpX : perpX;
                 finalPerpY = shouldFlipPerpendicular ? -perpY : perpY;
               }
              
              // Calculate shortening
              const hasNeighborsAtStart = bondsAtStart.length > 0;
              const hasNeighborsAtEnd = bondsAtEnd.length > 0;
              const shortenStart = hasNeighborsAtStart ? 8 : 0;
              const shortenEnd = hasNeighborsAtEnd ? 8 : 0;
              
                             let shorterLineOnPositiveSide = counts.left > counts.right;
               if (isBenzeneRing && segment.bondOrder === 2) {
                 // For benzene, put shorter line on whichever side faces the center
                 const midX = (v1.x + v2.x) / 2;
                 const midY = (v1.y + v2.y) / 2;
                 const towardCenter = [-midX, -midY];
                 const toCenterLen = Math.sqrt(towardCenter[0] * towardCenter[0] + towardCenter[1] * towardCenter[1]);
                 if (toCenterLen > 0) {
                   towardCenter[0] /= toCenterLen;
                   towardCenter[1] /= toCenterLen;
                 }
                 const dot = perpX * towardCenter[0] + perpY * towardCenter[1];
                 shorterLineOnPositiveSide = dot > 0; // Put shorter line on positive side if perpendicular points toward center
               }
              
              // Determine if both vertices have no other bonds attached
              const noBondsAtBothEnds = bondsAtStart.length === 0 && bondsAtEnd.length === 0;
              const shorten = noBondsAtBothEnds ? -2 : -3;
              const ux = dx / len;
              const uy = dy / len;
              
              ctx.strokeStyle = bondColor;
              ctx.lineWidth = 3;
              
              if (noBondsAtBothEnds) {
                // Two equal parallel lines, both offset from center
                ctx.beginPath();
                ctx.moveTo(x1 - finalPerpX * bondOffset - ux * (ext + shorten), y1 - finalPerpY * bondOffset - uy * (ext + shorten));
                ctx.lineTo(x2 - finalPerpX * bondOffset + ux * (ext + shorten), y2 - finalPerpY * bondOffset + uy * (ext + shorten));
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(x1 + finalPerpX * bondOffset - ux * (ext + shorten), y1 + finalPerpY * bondOffset - uy * (ext + shorten));
                ctx.lineTo(x2 + finalPerpX * bondOffset + ux * (ext + shorten), y2 + finalPerpY * bondOffset + uy * (ext + shorten));
                ctx.stroke();
              } else {
                const longerLineShorten = 3;
                
                if (shorterLineOnPositiveSide) {
                  // Shorter line on positive side, longer line aligned with center
                  // Longer line (aligned with grid)
                  ctx.beginPath();
                  ctx.moveTo(x1 - ux * (ext + shorten - longerLineShorten), y1 - uy * (ext + shorten - longerLineShorten));
                  ctx.lineTo(x2 + ux * (ext + shorten - longerLineShorten), y2 + uy * (ext + shorten - longerLineShorten));
                  ctx.stroke();
                  
                  // Shorter line (positive side offset)
                  ctx.beginPath();
                  ctx.moveTo(x1 + finalPerpX * bondOffset * 2 - ux * (ext + shorten - shortenStart), y1 + finalPerpY * bondOffset * 2 - uy * (ext + shorten - shortenStart));
                  ctx.lineTo(x2 + finalPerpX * bondOffset * 2 + ux * (ext + shorten - shortenEnd), y2 + finalPerpY * bondOffset * 2 + uy * (ext + shorten - shortenEnd));
                  ctx.stroke();
                } else {
                  // Shorter line on negative side, longer line aligned with center
                  // Shorter line (negative side offset)
                  ctx.beginPath();
                  ctx.moveTo(x1 - finalPerpX * bondOffset * 2 - ux * (ext + shorten - shortenStart), y1 - finalPerpY * bondOffset * 2 - uy * (ext + shorten - shortenStart));
                  ctx.lineTo(x2 - finalPerpX * bondOffset * 2 + ux * (ext + shorten - shortenEnd), y2 - finalPerpY * bondOffset * 2 + uy * (ext + shorten - shortenEnd));
                  ctx.stroke();
                  
                  // Longer line (aligned with grid)
                  ctx.beginPath();
                  ctx.moveTo(x1 - ux * (ext + shorten - longerLineShorten), y1 - uy * (ext + shorten - longerLineShorten));
                  ctx.lineTo(x2 + ux * (ext + shorten - longerLineShorten), y2 + uy * (ext + shorten - longerLineShorten));
                  ctx.stroke();
                }
              }
            } else if (segment.bondOrder === 3) {
              // Triple bond
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const perpX = -dy / len * 6;
              const perpY = dx / len * 6;
              
              ctx.strokeStyle = '#888';
              ctx.lineWidth = 3;
              
              // Center line
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              
              // Top line
              ctx.beginPath();
              ctx.moveTo(x1 + perpX, y1 + perpY);
              ctx.lineTo(x2 + perpX, y2 + perpY);
              ctx.stroke();
              
              // Bottom line
              ctx.beginPath();
              ctx.moveTo(x1 - perpX, y1 - perpY);
              ctx.lineTo(x2 - perpX, y2 - perpY);
              ctx.stroke();
            }
            
            // Handle stereochemistry bonds
            if (segment.bondType === 'wedge') {
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const perpX = -dy / len * 3;
              const perpY = dx / len * 3;
              
              ctx.fillStyle = '#888';
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2 + perpX, y2 + perpY);
              ctx.lineTo(x2 - perpX, y2 - perpY);
              ctx.closePath();
              ctx.fill();
            } else if (segment.bondType === 'dash') {
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const dashLength = 8;
              const gapLength = 4;
              const totalLength = dashLength + gapLength;
              const numDashes = Math.floor(len / totalLength);
              
              ctx.setLineDash([dashLength, gapLength]);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw stereochemistry bonds
            if (segment.bondType === 'wedge') {
              // Draw wedge bond
              const angle = Math.atan2(y2 - y1, x2 - x1);
              const perpAngle = angle + Math.PI / 2;
              const wedgeWidth = 8;
              
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2 - wedgeWidth * Math.cos(perpAngle), y2 - wedgeWidth * Math.sin(perpAngle));
              ctx.lineTo(x2 + wedgeWidth * Math.cos(perpAngle), y2 + wedgeWidth * Math.sin(perpAngle));
              ctx.closePath();
              ctx.fillStyle = '#888';
              ctx.fill();
            } else if (segment.bondType === 'dash') {
              // Draw dashed bond
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        });
        
        // Draw preview arrows
        clipboard.arrows.forEach(arrow => {
          const x1 = previewX + arrow.x1 + offset.x;
          const y1 = previewY + arrow.y1 + offset.y;
          const x2 = previewX + arrow.x2 + offset.x;
          const y2 = previewY + arrow.y2 + offset.y;
          
          if (arrow.type === 'arrow') {
                            drawArrowOnCanvas(ctx, x1, y1, x2, y2, '#888', 3, mode);
          } else if (arrow.type === 'equilibrium') {
            const topX1 = arrow.topX1 !== undefined ? previewX + arrow.topX1 + offset.x : x1;
            const topX2 = arrow.topX2 !== undefined ? previewX + arrow.topX2 + offset.x : x2;
            const bottomX1 = arrow.bottomX1 !== undefined ? previewX + arrow.bottomX1 + offset.x : x1;
            const bottomX2 = arrow.bottomX2 !== undefined ? previewX + arrow.bottomX2 + offset.x : x2;
                          drawEquilArrowOnCanvas(ctx, x1, y1, x2, y2, '#888', 3, topX1, topX2, bottomX1, bottomX2, -1, mode, isPointInArrowCircle, offset);
          } else if (arrow.type && arrow.type.startsWith('curve')) {
            const peakX = arrow.peakX !== undefined ? previewX + arrow.peakX + offset.x : null;
            const peakY = arrow.peakY !== undefined ? previewY + arrow.peakY + offset.y : null;
                          drawCurvedArrowOnCanvas(ctx, x1, y1, x2, y2, arrow.type, '#888', -1, peakX, peakY, null, mode, hoverCurvedArrow);
          }
        });
        
        ctx.restore();
      }

    // Debug visualization: Draw grid breaking zones (when enabled)
    if (gridBreakingEnabled && gridBreakingAnalysis.gridBreakingActive) {
      ctx.save();
      gridBreakingAnalysis.breakingZones.forEach(zone => {
        const centerX = zone.center.x + offset.x;
        const centerY = zone.center.y + offset.y;
        
        // Draw suppression zone (red, transparent)
        ctx.beginPath();
        ctx.arc(centerX, centerY, zone.suppressionRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        
        // Draw bond option zone (blue, transparent)
        ctx.beginPath();
        ctx.arc(centerX, centerY, zone.bondOptionRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        
        // Mark center with a small dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fill();
      });
      ctx.restore();
    }
  }, [segments, vertices, vertexAtoms, vertexTypes, offset, hoverVertex, hoverSegmentIndex, arrows, arrowPreview, curvedArrowStartPoint, mode, countBondsAtVertex, countBondsAtVertexForSnapping, fourthBondMode, fourthBondSource, fourthBondPreview, isSelecting, selectionStart, selectionEnd, selectedSegments, selectedVertices, selectedArrows, selectionBounds, isPasteMode, clipboard, pastePreviewPosition, snapAlignment, showSnapPreview, gridBreakingEnabled, gridBreakingAnalysis, epoxideVertices]);





  // Function to update selection based on current selection box
  const updateSelection = useCallback(() => {
    updateSelectionUtil(
      isSelecting,
      selectionStart,
      selectionEnd,
      segments,
      vertices,
      arrows,
      offset,
      setSelectedSegments,
      setSelectedVertices,
      setSelectedArrows,
      setSelectionBounds
    );
  }, [isSelecting, selectionStart, selectionEnd, segments, vertices, arrows, offset]);
  
  // Copy selected items to clipboard
  const copySelection = useCallback(() => {
    copySelectionUtil(
      selectedSegments,
      selectedVertices,
      selectedArrows,
      segments,
      vertices,
      vertexAtoms,
      vertexTypes,
      arrows,
      getIfTop,
      setClipboard,
      setIsPasteMode,
      clearSelection
    );
    setSelectedPreset(null); // Deselect any active preset when copying regular selection
  }, [selectedSegments, selectedVertices, selectedArrows, segments, vertices, vertexAtoms, vertexTypes, arrows, clearSelection]);
  

  
    // Cancel paste mode
  const cancelPasteMode = useCallback(() => {
    cancelPasteModeUtil(setIsPasteMode, setSnapAlignment);
    setSelectedPreset(null); // Deselect any active preset
    setMode('draw'); // Return to draw mode when canceling paste
  }, []);

  // Generate benzene preset data
  const generateBenzenePreset = useCallback(() => {
    const benzeneVertices = [];
    const benzeneSegments = [];
    const radius = hexRadius; // Use same radius as grid hexagons
    
    // Create 6 vertices in a regular hexagon pattern
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180; // Start from top (-90°)
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      benzeneVertices.push({
        x: x,
        y: y
        // No atom label - carbons are implied at vertices
      });
    }
    
    // Create 6 segments connecting the vertices in a ring with alternating double bonds
    for (let i = 0; i < 6; i++) {
      const nextIndex = (i + 1) % 6;
      const vertex1 = benzeneVertices[i];
      const vertex2 = benzeneVertices[nextIndex];
      
      // Calculate bond direction
      const direction = calculateBondDirection(vertex1.x, vertex1.y, vertex2.x, vertex2.y);
      
      // Alternate between single and double bonds (every other bond is double)
      const bondOrder = (i % 2 === 0) ? 2 : 1;
      
      // Calculate upperVertex and lowerVertex for double bonds
      let upperVertex, lowerVertex;
      if (bondOrder === 2) {
        const vertices = calculateDoubleBondVertices(vertex1.x, vertex1.y, vertex2.x, vertex2.y, direction);
        upperVertex = vertices.upperVertex;
        lowerVertex = vertices.lowerVertex;
      }
      
      benzeneSegments.push({
        vertex1Index: i,
        vertex2Index: nextIndex,
        x1: vertex1.x,
        y1: vertex1.y,
        x2: vertex2.x,
        y2: vertex2.y,
        bondOrder: bondOrder,
        bondType: null,
        bondDirection: 1,
        direction: direction,
        upperVertex: upperVertex,
        lowerVertex: lowerVertex,
        flipSmallerLine: false
      });
    }
    
    return {
      vertices: benzeneVertices,
      segments: benzeneSegments,
      arrows: []
    };
  }, [hexRadius, calculateBondDirection, calculateDoubleBondVertices]);

  // Generate cyclohexane preset data
  const generateCyclohexanePreset = useCallback(() => {
    const cyclohexaneVertices = [];
    const cyclohexaneSegments = [];
    const radius = hexRadius; // Use same radius as grid hexagons
    
    // Create 6 vertices in a regular hexagon pattern
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180; // Start from top (-90°)
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      cyclohexaneVertices.push({
        x: x,
        y: y,
        isOffGrid: true // Cyclohexane vertices are off-grid
      });
    }
    
    // Create 6 segments connecting the vertices in a ring with all single bonds
    for (let i = 0; i < 6; i++) {
      const nextIndex = (i + 1) % 6;
      const vertex1 = cyclohexaneVertices[i];
      const vertex2 = cyclohexaneVertices[nextIndex];
      
      // Calculate bond direction
      const direction = calculateBondDirection(vertex1.x, vertex1.y, vertex2.x, vertex2.y);
      
      cyclohexaneSegments.push({
        vertex1Index: i,
        vertex2Index: nextIndex,
        x1: vertex1.x,
        y1: vertex1.y,
        x2: vertex2.x,
        y2: vertex2.y,
        bondOrder: 1, // All single bonds
        bondType: null,
        bondDirection: 1,
        direction: direction,
        flipSmallerLine: false
      });
    }
    
    return {
      vertices: cyclohexaneVertices,
      segments: cyclohexaneSegments,
      arrows: []
    };
  }, [hexRadius, calculateBondDirection]);

  // Generate cyclopentane preset data
  const generateCyclopentanePreset = useCallback(() => {
    const cyclopentaneVertices = [];
    const cyclopentaneSegments = [];
    // For a regular pentagon with bond length L, circumradius = L / (2 * sin(π/5))
    // Since hexRadius is our standard bond length, use it as L
    const radius = hexRadius / (2 * Math.sin(Math.PI / 5)); // ≈ hexRadius * 0.851
    
    // Create 5 vertices in a regular pentagon pattern
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180; // Start from top (-90°), 72° intervals for pentagon
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      cyclopentaneVertices.push({
        x: x,
        y: y,
        isOffGrid: false // Cyclopentane vertices are treated as on-grid
      });
    }
    
    // Create 5 segments connecting the vertices in a ring with all single bonds
    for (let i = 0; i < 5; i++) {
      const nextIndex = (i + 1) % 5;
      const vertex1 = cyclopentaneVertices[i];
      const vertex2 = cyclopentaneVertices[nextIndex];
      
      // Calculate bond direction
      const direction = calculateBondDirection(vertex1.x, vertex1.y, vertex2.x, vertex2.y);
      
      cyclopentaneSegments.push({
        vertex1Index: i,
        vertex2Index: nextIndex,
        x1: vertex1.x,
        y1: vertex1.y,
        x2: vertex2.x,
        y2: vertex2.y,
        bondOrder: 1, // All single bonds
        bondType: null,
        bondDirection: 1,
        direction: direction,
        flipSmallerLine: false
      });
    }
    
    return {
      vertices: cyclopentaneVertices,
      segments: cyclopentaneSegments,
      arrows: []
    };
  }, [hexRadius, calculateBondDirection]);

  // Generate cyclobutane preset data
  const generateCyclobutanePreset = useCallback(() => {
    const cyclobutaneVertices = [];
    const cyclobutaneSegments = [];
    // For a regular square with bond length L, circumradius = L / (2 * sin(π/4)) = L / √2
    // Since hexRadius is our standard bond length, use it as L
    const radius = hexRadius / (2 * Math.sin(Math.PI / 4)); // = hexRadius / √2 ≈ hexRadius * 0.707
    
    // Create 4 vertices in a regular square pattern
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 - 45) * Math.PI / 180; // Start from top-right (-45°), 90° intervals for square
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      cyclobutaneVertices.push({
        x: x,
        y: y,
        isOffGrid: false // Cyclobutane vertices are treated as on-grid
      });
    }
    
    // Create 4 segments connecting the vertices in a ring with all single bonds
    for (let i = 0; i < 4; i++) {
      const nextIndex = (i + 1) % 4;
      const vertex1 = cyclobutaneVertices[i];
      const vertex2 = cyclobutaneVertices[nextIndex];
      
      // Calculate bond direction
      const direction = calculateBondDirection(vertex1.x, vertex1.y, vertex2.x, vertex2.y);
      
      cyclobutaneSegments.push({
        vertex1Index: i,
        vertex2Index: nextIndex,
        x1: vertex1.x,
        y1: vertex1.y,
        x2: vertex2.x,
        y2: vertex2.y,
        bondOrder: 1, // All single bonds
        bondType: null,
        bondDirection: 1,
        direction: direction,
        flipSmallerLine: false
      });
    }
    
    return {
      vertices: cyclobutaneVertices,
      segments: cyclobutaneSegments,
      arrows: []
    };
  }, [hexRadius, calculateBondDirection]);

  // Generate cyclopropane preset data
  const generateCyclopropanePreset = useCallback(() => {
    const cyclopropaneVertices = [];
    const cyclopropaneSegments = [];
    // For a regular triangle with bond length L, circumradius = L / (2 * sin(π/3)) = L / √3
    // Since hexRadius is our standard bond length, use it as L
    const radius = hexRadius / (2 * Math.sin(Math.PI / 3)); // = hexRadius / √3 ≈ hexRadius * 0.577
    
    // Create 3 vertices in a regular triangle pattern
    for (let i = 0; i < 3; i++) {
      const angle = (i * 120 - 90) * Math.PI / 180; // Start from top (-90°), 120° intervals for triangle
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      cyclopropaneVertices.push({
        x: x,
        y: y,
        isOffGrid: false // Cyclopropane vertices are treated as on-grid
      });
    }
    
    // Create 3 segments connecting the vertices in a ring with all single bonds
    for (let i = 0; i < 3; i++) {
      const nextIndex = (i + 1) % 3;
      const vertex1 = cyclopropaneVertices[i];
      const vertex2 = cyclopropaneVertices[nextIndex];
      
      // Calculate bond direction
      const direction = calculateBondDirection(vertex1.x, vertex1.y, vertex2.x, vertex2.y);
      
      cyclopropaneSegments.push({
        vertex1Index: i,
        vertex2Index: nextIndex,
        x1: vertex1.x,
        y1: vertex1.y,
        x2: vertex2.x,
        y2: vertex2.y,
        bondOrder: 1, // All single bonds
        bondType: null,
        bondDirection: 1,
        direction: direction,
        flipSmallerLine: false
      });
    }
    
    return {
      vertices: cyclopropaneVertices,
      segments: cyclopropaneSegments,
      arrows: []
    };
  }, [hexRadius, calculateBondDirection]);

  // Generic function to select a preset (integrates with mode system)
  const selectPreset = useCallback((presetName, presetData) => {
    if (selectedPreset === presetName) {
      // Deselect current preset - return to draw mode
      setSelectedPreset(null);
      setIsPasteMode(false);
      setClipboard(null);
      setSnapAlignment(null);
      setMode('draw'); // Return to draw mode
    } else {
      // Clear any existing selection first (ensures mutual exclusivity)
      clearSelection();
      
      // Clear any drawing-in-progress states
      setCurvedArrowStartPoint(null);
      setArrowPreview(null);
      setFourthBondSource(null);
      setFourthBondPreview(null);
      
      // Clear other UI states
      setShowMenu(false);
      setShowAtomInput(false);
      setIsSelecting(false);
      setSelectionStart({ x: 0, y: 0 });
      setSelectionEnd({ x: 0, y: 0 });
      setHoverVertex(null);
      setHoverSegmentIndex(null);
      
      // Select new preset
      setSelectedPreset(presetName);
      setClipboard(presetData);
      setIsPasteMode(true);
      setSnapAlignment(null);
      setMode('preset'); // Set mode to preset
    }
  }, [selectedPreset, clearSelection]);

  // Toggle benzene preset selection
  const toggleBenzenePreset = useCallback(() => {
    const benzeneData = generateBenzenePreset();
    selectPreset('benzene', benzeneData);
  }, [selectPreset, generateBenzenePreset]);

  // Toggle cyclohexane preset selection
  const toggleCyclohexanePreset = useCallback(() => {
    const cyclohexaneData = generateCyclohexanePreset();
    selectPreset('cyclohexane', cyclohexaneData);
  }, [selectPreset, generateCyclohexanePreset]);

  // Toggle cyclopentane preset selection
  const toggleCyclopentanePreset = useCallback(() => {
    const cyclopentaneData = generateCyclopentanePreset();
    selectPreset('cyclopentane', cyclopentaneData);
  }, [selectPreset, generateCyclopentanePreset]);

  // Toggle cyclobutane preset selection
  const toggleCyclobutanePreset = useCallback(() => {
    const cyclobutaneData = generateCyclobutanePreset();
    selectPreset('cyclobutane', cyclobutaneData);
  }, [selectPreset, generateCyclobutanePreset]);

  // Toggle cyclopropane preset selection
  const toggleCyclopropanePreset = useCallback(() => {
    const cyclopropaneData = generateCyclopropanePreset();
    selectPreset('cyclopropane', cyclopropaneData);
  }, [selectPreset, generateCyclopropanePreset]);

  // Generate chair conformation preset data
  const generateChairConformationPreset = useCallback(() => {
    // Use manual coordinates for perfect chair shape
    return generateChairPreset(hexRadius, calculateBondDirection, {
      manualCoordinates: [
        { x: -30, y: 30 },   // Vertex 0: Bottom-left
        { x: -50, y: -10 },    // Vertex 1: Bottom-right
        { x: 20, y: 20 },   // Vertex 2: Top-right elevated
        { x: -20, y: -20 },   // Vertex 3: Top-right
        { x: 30, y: 30 },  // Vertex 4: Top-left
        { x: -30, y: -30 }   // Vertex 5: Top-left elevated
      ]
    });
    
    // TO MANUALLY ADJUST CHAIR GEOMETRY, replace the above line with one of these:
    
    // Option 1: Use predefined presets
    // return generateChairPreset(hexRadius, calculateBondDirection, chairPresets.wide);
    // return generateChairPreset(hexRadius, calculateBondDirection, chairPresets.adjusted);
    
    // Option 2: Specify exact coordinates manually
    // return generateChairPreset(hexRadius, calculateBondDirection, {
    //   manualCoordinates: [
    //     { x: -40, y: 15 },  // Vertex 0: Bottom-left
    //     { x: 40, y: 15 },   // Vertex 1: Bottom-right
    //     { x: 60, y: -20 },  // Vertex 2: Top-right slant  
    //     { x: 20, y: -35 },  // Vertex 3: Top-right
    //     { x: -20, y: -35 }, // Vertex 4: Top-left
    //     { x: -60, y: -20 }  // Vertex 5: Top-left slant
    //   ]
    // });
    
    // Option 3: Adjust scaling and parameters
    // return generateChairPreset(hexRadius, calculateBondDirection, {
    //   widthScale: 1.2,    // Make wider
    //   heightScale: 0.8,   // Make shorter
    //   symmetryOffset: 5   // Shift horizontally
    // });
  }, [hexRadius, calculateBondDirection]);

  // Toggle chair conformation preset selection
  const toggleChairPreset = useCallback(() => {
    const chairData = generateChairConformationPreset();
    selectPreset('chair', chairData);
  }, [selectPreset, generateChairConformationPreset]);

  // Function to detect off-grid vertices in small rings (cyclopropane, cyclobutane, cyclopentane) attached to bonds
  const detectEpoxideVertices = useCallback(() => {
    console.log('🔍 Running small ring off-grid vertex detection...');
    
    // Find all small rings (3, 4, and 5-membered)
    const threeMemberedRings = detectThreeMemberedRings(vertices, segments, vertexAtoms);
    const fourMemberedRings = detectFourMemberedRings(vertices, segments, vertexAtoms);
    const fiveMemberedRings = detectFiveMemberedRings(vertices, segments, vertexAtoms);
    
    console.log('🔺 Found rings:', {
      cyclopropane: threeMemberedRings.length,
      cyclobutane: fourMemberedRings.length, 
      cyclopentane: fiveMemberedRings.length
    });
    
    // Combine all small rings with their types
    const allSmallRings = [
      ...threeMemberedRings.map(ring => ({ ring, type: 'cyclopropane', size: 3 })),
      ...fourMemberedRings.map(ring => ({ ring, type: 'cyclobutane', size: 4 })),
      ...fiveMemberedRings.map(ring => ({ ring, type: 'cyclopentane', size: 5 }))
    ];
    
    if (allSmallRings.length === 0) {
      return;
    }
    
    const newEpoxideVertices = new Set();
    
    // For each small ring, check if it's attached to an existing bond
    allSmallRings.forEach(({ ring, type, size }, ringIndex) => {
      // Check if this ring already has off-grid vertices detected
      const alreadyHasOffGrid = ring.some(vertexKey => epoxideVertices.has(vertexKey));
      if (alreadyHasOffGrid) {
        return; // Skip this ring
      }
      
      const ringVertexKeys = ring;
      const attachmentBonds = [];
      
      // Find bonds that connect ring vertices to external vertices
      for (const segment of segments) {
        if (segment.bondOrder > 0) {
          const seg1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
          const seg2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
          
          // Check if this bond has one vertex in the ring and one outside
          const v1InRing = ringVertexKeys.includes(seg1Key);
          const v2InRing = ringVertexKeys.includes(seg2Key);
          
          if ((v1InRing && !v2InRing) || (!v1InRing && v2InRing)) {
            attachmentBonds.push({
              ringVertexKey: v1InRing ? seg1Key : seg2Key,
              externalVertexKey: v1InRing ? seg2Key : seg1Key
            });
          }
        }
      }
      
      if (attachmentBonds.length > 0) {
        // Get the vertices that are involved in attachment bonds
        const attachedVertexKeys = new Set(attachmentBonds.map(bond => bond.ringVertexKey));
        
        // The off-grid vertices are those NOT involved in attachment bonds
        const offGridVertexKeys = ringVertexKeys.filter(key => !attachedVertexKeys.has(key));
        
        offGridVertexKeys.forEach(offGridKey => {
          console.log(`🔶 FOUND OFF-GRID VERTEX in ${type}: ${offGridKey}`);
          newEpoxideVertices.add(offGridKey);
        });
        
        console.log(`🔶 ${type} ring: ${offGridVertexKeys.length} off-grid vertices, ${attachedVertexKeys.size} on-bond vertices`);
      }
    });
    
    // Update state if we found new off-grid vertices
    if (newEpoxideVertices.size > 0) {
      console.log(`🔶 UPDATING STATE: Found ${newEpoxideVertices.size} off-grid vertices in small rings`);
      setEpoxideVertices(prev => new Set([...prev, ...newEpoxideVertices]));
      
      // Update vertex types for the new off-grid vertices
      setVertexTypes(prev => {
        const newTypes = { ...prev };
        newEpoxideVertices.forEach(key => {
          // Set appropriate type based on the ring it belongs to
          // For now, we'll use 'epoxide' for all, but this could be made more specific
          newTypes[key] = 'epoxide';
        });
        return newTypes;
      });
    }
  }, [vertices, segments, vertexAtoms, epoxideVertices]);

  // Paste clipboard contents at given position
  const pasteAtPosition = useCallback((x, y) => {
    // Capture the vertices before pasting to detect new ones
    const verticesBeforePaste = vertices.map(v => ({ x: v.x, y: v.y }));
    
    // Capture state before pasting
    captureState();
    
    pasteAtPositionUtil(
      x,
      y,
      clipboard,
      snapAlignment,
      showSnapPreview,
      offset,
      vertices,
      vertexAtoms,
      vertexTypes,
      segments,
      arrows,
      calculateDoubleBondVertices,
      setVertices,
      setVertexAtoms,
      setVertexTypes,
      setSegments,
      setArrows,
      selectedPreset ? (() => {}) : setIsPasteMode, // Don't exit paste mode for presets
      setSnapAlignment,
      selectedPreset // Pass selectedPreset to ensure presets are made of off-grid vertices when not snapping
    );
    
    // Track the pasted molecule by finding one of the new vertices
    setTimeout(() => {
      setVertices(currentVertices => {
        // Find a new vertex that wasn't there before pasting
        const newVertex = currentVertices.find(v => 
          !verticesBeforePaste.some(oldV => 
            Math.abs(oldV.x - v.x) < 0.01 && Math.abs(oldV.y - v.y) < 0.01
          )
        );
        
        if (newVertex) {
          trackVertexEdit(newVertex);
        }
        
        return currentVertices; // Don't modify vertices, just track
      });
    }, 5); // Small delay to ensure vertices are updated
    
    // Run small ring off-grid vertex detection after pasting (with small delay to ensure state is updated)
    setTimeout(detectEpoxideVertices, 10);
  }, [clipboard, vertices, vertexAtoms, vertexTypes, segments, arrows, offset, snapAlignment, showSnapPreview, calculateDoubleBondVertices, captureState, selectedPreset, detectEpoxideVertices, trackVertexEdit]);

  // Set mode (draw/erase/arrow/text/etc.) - must be defined before setModeAndClearSelection
  const selectMode = (m) => {
    // Close any open menus and inputs
    setShowMenu(false);
    setShowAtomInput(false);
    
    // Clear any drawing-in-progress states
    setCurvedArrowStartPoint(null);
    setArrowPreview(null);
    
    // Clear fourth bond source when switching away from draw, triple, or stereochemistry modes
    if (m !== 'draw' && m !== 'triple' && m !== 'wedge' && m !== 'dash' && m !== 'ambiguous') {
      setFourthBondSource(null);
      setFourthBondPreview(null);
    }
    
    // Clear selection state
    setIsSelecting(false);
    setSelectionStart({ x: 0, y: 0 });
    setSelectionEnd({ x: 0, y: 0 });
    
    // Clear hover states when switching modes
    setHoverVertex(null);
    setHoverSegmentIndex(null);
    
    // Always clear preset states when switching to any regular mode (ensures mutual exclusivity)
    setSelectedPreset(null);
    setIsPasteMode(false);
    setClipboard(null);
    setSnapAlignment(null);
    
    // Update mode
    setMode(m);
  };

  // Legacy function - replaced by selectMode
  const setModeAndClearSelection = useCallback((newMode) => {
    selectMode(newMode);
  }, []);

  // Update selection when selection box changes
  useEffect(() => {
    updateSelection();
  }, [updateSelection, selectionEnd]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettingsDropdown && !event.target.closest('[data-settings-dropdown]')) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettingsDropdown]);

  // Distance to a vertex
  const distanceToVertex = (px, py, vx, vy) => {
    const dx = px - (vx + offset.x);
    const dy = py - (vy + offset.y);
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Calculate dimensions of the box around a free-floating vertex
  const calculateVertexBoxDimensions = (vertex) => {
    if (!vertex) return null;
    
    const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    const atom = vertexAtoms[key];
    if (!atom) return null;
    
    let symbol = atom.symbol || atom;
    const ctx = canvasRef.current.getContext('2d');
    ctx.font = '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
    
    // Measure the symbol width considering subscripts
    let symbolWidth = 0;
    let symbolHeight = 26; // Default height
    
    if (/\d/.test(symbol)) {
      // For formulas with subscripts, parse them
      const segments = [];
      let currentSegment = '';
      let isCurrentNumber = false;
      
      for (let i = 0; i < symbol.length; i++) {
        const char = symbol[i];
        const isNumber = /[0-9]/.test(char);
        
        if (i === 0 || isNumber !== isCurrentNumber) {
          if (currentSegment) {
            segments.push({ text: currentSegment, isNumber: isCurrentNumber });
          }
          currentSegment = char;
          isCurrentNumber = isNumber;
        } else {
          currentSegment += char;
        }
      }
      
      if (currentSegment) {
        segments.push({ text: currentSegment, isNumber: isCurrentNumber });
      }
      
      // Calculate total width
      for (const segment of segments) {
        const font = segment.isNumber ? '400 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
        ctx.font = font;
        symbolWidth += ctx.measureText(segment.text).width;
      }
    } else {
      symbolWidth = ctx.measureText(symbol).width;
    }
    
    const padding = 8;
    const boxX = vertex.x + offset.x - symbolWidth/2 - padding;
    const boxY = vertex.y + offset.y - symbolHeight/2 - padding/2;
    const boxWidth = symbolWidth + padding*2;
    const boxHeight = symbolHeight + padding;
    
    return { boxX, boxY, boxWidth, boxHeight };
  };

  // Check if a point is inside the box of a free-floating vertex
  const isPointInVertexBox = (x, y, vertex) => {
    const box = calculateVertexBoxDimensions(vertex);
    if (!box) return false;
    
    return x >= box.boxX && x <= box.boxX + box.boxWidth && 
           y >= box.boxY && y <= box.boxY + box.boxHeight;
  };

  // Helper function to check if a point is over any interactive element
  const isPointOverInteractiveElement = (x, y) => {
    // Check arrows (straight and equilibrium)
    const { index: arrowIndex } = isPointInArrowCircle(x, y);
    if (arrowIndex !== -1) return true;
    
    // Check curved arrows
    const { index: curvedArrowIndex } = isPointInCurvedArrowCircle(x, y);
    if (curvedArrowIndex !== -1) return true;
    
    // Check if over a curved arrow path (for deletion)
    const curvedArrowPathIndex = isPointOnCurvedArrow(x, y);
    if (curvedArrowPathIndex !== -1) return true;
    
    // Check vertices (for free-floating vertices in mouse mode)
    for (let v of vertices) {
      const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
      if (freeFloatingVertices.has(key)) {
        if (isPointInVertexBox(x, y, v)) return true;
        const dist = distanceToVertex(x, y, v.x, v.y);
        if (dist <= vertexThreshold) return true;
      }
    }
    
    
    
    return false;
  };

  // Handle atom input submission when user presses Enter or clicks outside
  const handleAtomInputSubmit = () => {
    if (menuVertexKey) {
      // Track which vertex was edited by finding it from the key
      const [x, y] = menuVertexKey.split(',').map(parseFloat);
      const editedVertex = vertices.find(v => 
        Math.abs(v.x - x) < 0.01 && Math.abs(v.y - y) < 0.01
      );
      if (editedVertex) {
        trackVertexEdit(editedVertex);
      }
      
      // Capture state before modifying atom
      captureState();
      
      // If input is empty, remove the atom
      if (!atomInputValue.trim()) {
        const { [menuVertexKey]: _, ...rest } = vertexAtoms;
        setVertexAtoms(rest);
      } else {
        // Store the atom as an object with symbol property for consistency
        const formula = atomInputValue.trim();
        console.log('🧪 Storing atom formula:', formula, 'for vertex:', menuVertexKey);
        setVertexAtoms(prev => ({ 
          ...prev, 
          [menuVertexKey]: { symbol: formula }
        }));
      }
    }
    setShowAtomInput(false);
  };
  
  // Handle atom input key events (Enter to submit, Escape to cancel)
  const handleAtomInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent the global Enter handler from triggering
      handleAtomInputSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // Prevent other escape handlers from triggering
      setShowAtomInput(false);
    }
  };
  
  // Legacy handler for the pop-up menu (no longer used)
  const handleSelectAtom = (symbol) => {
    if (menuVertexKey) {
      setVertexAtoms(prev => ({ ...prev, [menuVertexKey]: { symbol } }));
    }
    setShowMenu(false);
  };

  // Function to detect rings whenever molecules change
  const detectRings = useCallback(() => {
    const ringInfo = getRingInfo(vertices, segments, vertexAtoms);
    setDetectedRings(ringInfo.rings);
    
    // For debugging (can be removed in production)
    if (ringInfo.rings.length > 0) {
      console.log('🔍 Rings detected, running epoxide detection...');
      // Run epoxide detection after rings are detected
      setTimeout(detectEpoxideVertices, 0);
    }
  }, [vertices, segments, vertexAtoms, detectEpoxideVertices]);

  // Function to analyze grid breaking whenever molecules change
  const analyzeGridBreakingState = useCallback(() => {
    if (vertices.length === 0) {
      setGridBreakingAnalysis({
        offGridVertices: [],
        breakingZones: [],
        totalOffGrid: 0,
        totalZones: 0,
        gridBreakingActive: false
      });
      return;
    }

    const analysis = analyzeGridBreaking(
      vertices, 
      segments, 
      findClosestGridVertex, 
      hexRadius,
      {
        tolerance: 8, // Slightly more tolerance than the default 5
        suppressionRadiusMultiplier: 0.55, // Halved from 1.1 to reduce deletion radius
        bondOptionRadiusMultiplier: 0.5, // Halved to match suppression zone
        overlapMergeThreshold: 0.8
      }
    );

    setGridBreakingAnalysis(analysis);

    // Generate bond previews for off-grid vertices
    const previews = generateBondPreviews(vertices, segments, hexRadius);
    setBondPreviews(previews);

    // Debug logging removed to prevent performance issues
  }, [vertices, segments, findClosestGridVertex]);

  // Handle clicks for draw vs erase
  const handleClick = useCallback(event => {
    // Start timing the entire click handler
    const clickStartTime = performance.now();
    
    // Prepare state object with all required variables
    const state = {
      isDragging,
      draggingVertex,
      didDrag,
      canvasRef,
      isPasteMode,
      mode,
      fourthBondSource,
      fourthBondPreview,
      fourthBondMode,
      hexRadius,
      segments,
      vertices,
      vertexAtoms,
      offset,
      vertexThreshold,
      lineThreshold,
      arrows,
      showSnapPreview,
      freeFloatingVertices,
      vertexTypes,
      bondPreviews,
    };
    
    // Prepare actions object with all required functions
    const actions = {
      // Action functions
      trackVertexEdit,
      captureState,
      setVertices,
      setSegments,
      setFourthBondMode,
      setFourthBondSource,
      setFourthBondPreview,
      setVertexAtoms,
      setArrows,
      setShowAtomInput,
      setMenuVertexKey,
      setAtomInputPosition,
      setAtomInputValue,
      setFreeFloatingVertices,
      setBondPreviews,
      setHoverBondPreview,
      checkAndMergeNewVertex,
      updateVerticesWithTracking,
      detectRings,
      
      // Helper functions
      distanceToVertex,
      calculateBondDirection,
      calculateDoubleBondVertices,
      findClosestGridVertex,
      isPointOnBondPreview,
      getType,
      getIfTop,
      getConnectedBonds,
      getLonePairPositionOrder,
      isPointInArrowCircle,
      isPointOnCurvedArrow,
    };
    
    // Time the core handler specifically
    const coreStartTime = performance.now();
    
    const coreEndTime = performance.now();
    const clickEndTime = performance.now();
    
    // Calculate timings
    const totalClickTime = clickEndTime - clickStartTime;
    const coreTime = coreEndTime - coreStartTime;
    const setupTime = coreStartTime - clickStartTime;
    
    // Log performance metrics
    console.group('🔍 Click Handler Performance');
    console.log(`📊 Total click handler time: ${totalClickTime.toFixed(2)}ms`);
    console.log(`⚙️  Setup time (state/actions): ${setupTime.toFixed(2)}ms`);
    console.log(`🎯 handleClickCore time: ${coreTime.toFixed(2)}ms`);
    console.log(`📈 Core vs Total: ${((coreTime / totalClickTime) * 100).toFixed(1)}%`);
    console.groupEnd();
    
    // Warning for slow clicks
    if (totalClickTime > 50) {
      console.warn(`⚠️  Slow click detected: ${totalClickTime.toFixed(2)}ms (target: <50ms)`);
    }
    // Call the core handler
    handleClickCore(event, state, actions);
  }, [isDragging, segments, vertices, vertexAtoms, offset, mode, distanceToVertex, lineThreshold, vertexThreshold, isPasteMode, pasteAtPosition, calculateGridAlignment, showSnapPreview]);

  // Arrow drawing function
  const drawArrow = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Arrow properties
    const startX = canvas.width / 2 - 50;
    const startY = canvas.height / 2;
    const endX = canvas.width / 2 + 50;
    const endY = canvas.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(endX - 10, endY - 10);
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - 10, endY + 10);
    ctx.strokeStyle = colors.bonds;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  // Helper function to check if a point is inside an arrow's control circle or end triangles
  // Returns an object with arrow index and the part being clicked (center, start, or end)
  // skipDistance: if true, just return if current point is over the arrow, used for hover detection
  const isPointInArrowCircle = useCallback((x, y, skipDistance = false) => {
    if (mode !== 'mouse' && !skipDistance) return { index: -1, part: null };
    
    // Check only if we're in mouse mode or explicitly checking hover (skipDistance)
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      
      // Skip curved arrows
      if (arrow.type && arrow.type.startsWith('curve')) continue;
      
      // Add screen offset to arrow coordinates
      const ox1 = arrow.x1 + (skipDistance ? 0 : offset.x); // Don't add offset twice for skipDistance mode
      const oy1 = arrow.y1 + (skipDistance ? 0 : offset.y);
      const ox2 = arrow.x2 + (skipDistance ? 0 : offset.x);
      const oy2 = arrow.y2 + (skipDistance ? 0 : offset.y);
      
      // Check for equilibrium arrow
      if (arrow.type === 'equil') {
        // Calculate the center of the equilibrium arrow
        const centerX = (ox1 + ox2) / 2;
        const centerY = oy1; // For equilibrium arrows, use the middle y-coordinate
        
        // Check if within the center circle (radius 10)
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 10) { // Increased from 8 to 10
          return { index: i, part: 'center' }; // Center of the arrow
        }
        
        // Check for triangle at right end of top arrow - increased click area
        const topRightX = ox2;
        const topRightY = oy1 - 5; // Top arrow y-coordinate
        const topRightTriangleDistance = Math.sqrt((x - topRightX) * (x - topRightX) + (y - topRightY) * (y - topRightY));
        
        if (topRightTriangleDistance <= 30) { // Increased from 24 to 30 for larger detection area
          return { index: i, part: 'topEnd' }; // Right end of the top arrow
        }
        
        // Ability to adjust top arrow from the left side has been removed
        
        // Check for triangle at left end of bottom arrow - increased click area
        const bottomLeftX = ox1;
        const bottomLeftY = oy2 + 5; // Bottom arrow y-coordinate
        const bottomLeftTriangleDistance = Math.sqrt((x - bottomLeftX) * (x - bottomLeftX) + (y - bottomLeftY) * (y - bottomLeftY));
        
        if (bottomLeftTriangleDistance <= 30) { // Increased from 24 to 30 for larger detection area
          return { index: i, part: 'bottomStart' }; // Left end of the bottom arrow
        }
        
        // Ability to adjust bottom arrow from the right side has been removed
      } else {
        // Regular arrow
        // Calculate the center of the arrow
        const centerX = (ox1 + ox2) / 2;
        const centerY = (oy1 + oy2) / 2;
        
        // Check if within the center circle (radius 10)
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 10) { // Increased from 8 to 10
          return { index: i, part: 'center' }; // Center of the arrow
        }
        
        // Calculate the angle of the arrow
        const angle = Math.atan2(oy2 - oy1, ox2 - ox1);
        
        // Calculate the triangle positions (these match the drawing positions)
        const triangleDistance = 15;
        
        // End triangle position (at arrow tip)
        const tipX = ox2 + triangleDistance * Math.cos(angle);
        const tipY = oy2 + triangleDistance * Math.sin(angle);
        const endDistance = Math.sqrt((x - tipX) * (x - tipX) + (y - tipY) * (y - tipY));
        
        if (endDistance <= 20) { // Increased from 10 to 20 for larger detection area
          return { index: i, part: 'end' }; // End of the arrow
        }
        
        // Start triangle position
        const startX = ox1 - triangleDistance * Math.cos(angle);
        const startY = oy1 - triangleDistance * Math.sin(angle);
        const startDistance = Math.sqrt((x - startX) * (x - startX) + (y - startY) * (y - startY));
        
        if (startDistance <= 20) { // Increased from 10 to 20 for larger detection area
          return { index: i, part: 'start' }; // Start of the arrow
        }
      }
    }
    
    return { index: -1, part: null }; // No arrow circle or triangle was clicked
  }, [arrows, mode, offset]);

  // Helper function to check if a point is near a curved arrow path
  const isPointOnCurvedArrow = useCallback((x, y) => {
    // Check distance to each curved arrow
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      
      // Only process curved arrows
      if (!arrow.type || !arrow.type.startsWith('curve')) continue;
      
      // Add screen offset to arrow coordinates
      const ox1 = arrow.x1 + offset.x;
      const oy1 = arrow.y1 + offset.y;
      const ox2 = arrow.x2 + offset.x;
      const oy2 = arrow.y2 + offset.y;
      
      // Calculate distance and midpoint between the two points
      const deltaX = ox2 - ox1;
      const deltaY = oy2 - oy1;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const midX = (ox1 + ox2) / 2;
      const midY = (oy1 + oy2) / 2;
      
      // Perpendicular vector to the line from start to end
      const perpX = -deltaY / (distance || 1);
      const perpY = deltaX / (distance || 1);
      
      // Determine direction and curvature level
      const isTopRow = ['curve0', 'curve1', 'curve2'].includes(arrow.type);
      const curvatureMap = {
        'curve0': 0.25, 'curve1': 0.6, 'curve2': 1.0,
        'curve3': 0.25, 'curve4': 0.6, 'curve5': 1.0
      };
      
      // Get curvature factor for this arrow type
      const curveFactor = curvatureMap[arrow.type] || 0.5;
      
      // Calculate control point position for hit detection
      const peakHeight = distance * curveFactor;
      
      // Calculate control point position by moving perpendicular to the line
      let controlX, controlY;
      if (isTopRow) {
        // Clockwise arrows (top row) - control point below the line
        controlX = midX - perpX * peakHeight;
        controlY = midY - perpY * peakHeight;
      } else {
        // Counterclockwise arrows (bottom row) - control point above the line
        controlX = midX + perpX * peakHeight;
        controlY = midY + perpY * peakHeight;
      }
      
      // If arrow has stored peak position, use that instead
      if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
        controlX = arrow.peakX + offset.x;
        controlY = arrow.peakY + offset.y;
      }
      
      // Calculate actual curve peak from control point
      const actualPeakX = 0.25 * ox1 + 0.5 * controlX + 0.25 * ox2;
      const actualPeakY = 0.25 * oy1 + 0.5 * controlY + 0.25 * oy2;
      
      // Check if point is near the curve by checking distance to the actual peak
      const distanceToPeak = Math.sqrt((x - actualPeakX) * (x - actualPeakX) + (y - actualPeakY) * (y - actualPeakY));
      
      // Also check if point is near start or end points
      const distanceToStart = Math.sqrt((x - ox1) * (x - ox1) + (y - oy1) * (y - oy1));
      const distanceToEnd = Math.sqrt((x - ox2) * (x - ox2) + (y - oy2) * (y - oy2));
      
      // If point is close to the peak or either endpoint, consider it a hit
      if (distanceToPeak <= 30 || distanceToStart <= 15 || distanceToEnd <= 15) {
        return i; // Return the index of the arrow
      }
    }
    
    return -1; // No curved arrow was clicked
  }, [arrows, offset]);

  // Helper function to check if a point is inside a curved arrow's endpoint circles
  // Returns an object with arrow index and the part being clicked (start or end)
  // skipDistance: if true, just return if current point is over the arrow, used for hover detection
  const isPointInCurvedArrowCircle = useCallback((x, y, skipDistance = false) => {
    if (mode !== 'mouse' && !skipDistance) return { index: -1, part: null };
    
    // Check only if we're in mouse mode or explicitly checking hover (skipDistance)
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      
      // Only process curved arrows
      if (!arrow.type || !arrow.type.startsWith('curve')) continue;
      
      // Add screen offset to arrow coordinates
      const ox1 = arrow.x1 + offset.x; // Always add offset for screen coordinates
      const oy1 = arrow.y1 + offset.y;
      const ox2 = arrow.x2 + offset.x;
      const oy2 = arrow.y2 + offset.y;
      
      const circleRadius = 10;
      
      // Check if within the start circle
      const startDistance = Math.sqrt((x - ox1) * (x - ox1) + (y - oy1) * (y - oy1));
      if (startDistance <= circleRadius) {
        return { index: i, part: 'start' }; // Start of the curved arrow
      }
      
      // Check if within the end circle
      const endDistance = Math.sqrt((x - ox2) * (x - ox2) + (y - oy2) * (y - oy2));
      if (endDistance <= circleRadius) {
        return { index: i, part: 'end' }; // End of the curved arrow
      }
      
      // Check if within the peak circle (actual curve peak, not control point)
      let controlX, controlY;
      if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
        // Use stored control point position
        controlX = arrow.peakX + offset.x;
        controlY = arrow.peakY + offset.y;
      } else {
        // Calculate control point position if not stored
        const peakPos = calculateCurvedArrowPeak(ox1, oy1, ox2, oy2, arrow.type);
        if (peakPos) {
          controlX = peakPos.x;
          controlY = peakPos.y;
        }
      }
      
      if (controlX !== undefined && controlY !== undefined) {
        // Calculate actual curve peak from control point
        const actualPeakX = 0.25 * ox1 + 0.5 * controlX + 0.25 * ox2;
        const actualPeakY = 0.25 * oy1 + 0.5 * controlY + 0.25 * oy2;
        
        const peakDistance = Math.sqrt((x - actualPeakX) * (x - actualPeakX) + (y - actualPeakY) * (y - actualPeakY));
        if (peakDistance <= circleRadius) {
          return { index: i, part: 'peak' }; // Peak of the curved arrow
        }
      }
    }
    
    return { index: -1, part: null }; // No curved arrow circle was clicked
  }, [arrows, mode, offset]);

  // Dragging handlers...
  const handleMouseDown = event => {
    // Handle paste mode on mouse down
    if (isPasteMode) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pasteAtPosition(x, y);
      return; // Exit early after pasting
    }

    handleMouseDownUtil(
      event,
      canvasRef,
      isPasteMode,
      mode,
      arrows,
      vertices,
      vertexThreshold,
      freeFloatingVertices,
      offset,
      // Functions
      pasteAtPosition,
      isPointInArrowCircle,
      isPointInCurvedArrowCircle,
      calculateCurvedArrowPeak,
      isPointInVertexBox,
      distanceToVertex,
      isPointOverInteractiveElement,
      clearSelection,
      captureState, // Add captureState function
      // Setters
      setMouseDownOnCanvas,
      setDraggingArrowIndex,
      setDragArrowOffset,
      setDragStart,
      setIsDragging,
      setDidDrag,
      setDraggingVertex,
      setIsDraggingVertex,
      setIsSelecting,
      setSelectionStart,
      setSelectionEnd
    );
  };
  const handleMouseMove = event => {
    handleMouseMoveUtil(
      event,
      canvasRef,
      isPasteMode,
      isDragging,
      fourthBondMode,
      fourthBondSource,
      mode,
      draggingArrowIndex,
      draggingVertex,
      isSelecting,
      clipboard,
      showSnapPreview,
      hexRadius,
      offset,
      dragStart,
      dragArrowOffset,
      arrows,
      vertices,
      vertexThreshold,
      lineThreshold,
      freeFloatingVertices,
      segments,
      vertexAtoms,
      bondPreviews,
      isPointOnBondPreview,
      // Setters
      setPastePreviewPosition,
      calculateGridAlignment,
      calculateBondAlignment,
      setSnapAlignment,
      setFourthBondPreview,
      setDidDrag,
      setArrows,
      setDragStart,
      setVertices,
      setFreeFloatingVertices,
      setSegments,
      setVertexAtoms,
      setDraggingVertex,
      setSelectionEnd,
      setOffset,
      setHoverVertex,
      setHoverSegmentIndex,
      setHoverCurvedArrow,
      isPointInArrowCircle,
      isPointInCurvedArrowCircle,
      distanceToVertex,
      isPointInVertexBox
    );

    // Enhanced hover priority system for interactive modes: vertex > bond preview > grid line > nearest vertex fallback
    const isInteractiveMode = (mode === 'draw' || mode === 'triple' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && 
                             !isDragging && !isSelecting && !isPasteMode && !fourthBondMode && !draggingVertex && !draggingArrowIndex;
    
    if (isInteractiveMode) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // First priority: Check if we're directly hovering over a vertex
        let directHoverVertex = null;
        let minDirectVertexDist = vertexThreshold;
        
        for (let v of vertices) {
          const dist = distanceToVertex(x, y, v.x, v.y);
          if (dist <= minDirectVertexDist) {
            minDirectVertexDist = dist;
            directHoverVertex = v;
          }
        }
        
        if (directHoverVertex) {
          // Hovering directly over a vertex - highlight vertex and clear everything else
          setHoverVertex(directHoverVertex);
          setHoverSegmentIndex(null);
          setHoverBondPreview(null);
        } else {
          // Second priority: Check if we're hovering over a bond preview (off-grid bonds)
          let hoveredPreview = null;
          if (bondPreviews.length > 0) {
            for (const preview of bondPreviews) {
              if (isPointOnBondPreview(x, y, preview, offset)) {
                hoveredPreview = preview;
                break;
              }
            }
          }
          
          if (hoveredPreview) {
            // Hovering over a bond preview - highlight it and clear everything else
            setHoverBondPreview(hoveredPreview);
            setHoverVertex(null);
            setHoverSegmentIndex(null);
          } else {
            // Third priority: Check if we're hovering over a grid line
            let closestSegmentIdx = null;
            let minSegmentDist = lineThreshold;
            
            segments.forEach((seg, idx) => {
              const A = x - (seg.x1 + offset.x);
              const B = y - (seg.y1 + offset.y);
              const C = (seg.x2 + offset.x) - (seg.x1 + offset.x);
              const D = (seg.y2 + offset.y) - (seg.y1 + offset.y);
              const dot = A * C + B * D;
              const len_sq = C * C + D * D;
              let t = dot / len_sq;
              t = Math.max(0, Math.min(1, t));
              const projX = seg.x1 + offset.x + t * C;
              const projY = seg.y1 + offset.y + t * D;
              const dx = x - projX;
              const dy = y - projY;
              const distSeg = Math.sqrt(dx * dx + dy * dy);
              if (distSeg < minSegmentDist) {
                minSegmentDist = distSeg;
                closestSegmentIdx = idx;
              }
            });
            
                    if (closestSegmentIdx !== null) {
          // Hovering over a grid line - highlight the segment and clear everything else
          setHoverSegmentIndex(closestSegmentIdx);
          setHoverVertex(null);
          setHoverBondPreview(null);
        } else {
              // Fourth priority: Find nearest vertex as fallback for empty space
              let nearestVertex = null;
              let minDistance = 150; // Maximum distance to consider for highlighting (in pixels)
              
              for (let v of vertices) {
                const dist = distanceToVertex(x, y, v.x, v.y);
                if (dist < minDistance) {
                  minDistance = dist;
                  nearestVertex = v;
                }
              }
              
              // Set the nearest vertex as hovered if we found one, otherwise clear everything
              if (nearestVertex) {
                setHoverVertex(nearestVertex);
                setHoverSegmentIndex(null);
                setHoverBondPreview(null);
              } else {
                // Not hovering over anything - clear all highlights
                setHoverVertex(null);
                setHoverSegmentIndex(null);
                setHoverBondPreview(null);
              }
            }
          }
        }
      }
    } else {
      // For non-interactive modes, still handle bond preview hover detection
      const canvas = canvasRef.current;
      if (canvas && bondPreviews.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if mouse is over any bond preview
        let hoveredPreview = null;
        for (const preview of bondPreviews) {
          if (isPointOnBondPreview(x, y, preview, offset)) {
            hoveredPreview = preview;
            break;
          }
        }
        
        setHoverBondPreview(hoveredPreview);
      }
    }
  };
  const handleMouseUp = event => {
    // Don't handle mouse up events in paste mode
    if (isPasteMode) {
      return;
    }

    handleMouseUpUtil(
      event,
      canvasRef,
      isSelecting,
      isDragging,
      draggingVertex,
      draggingArrowIndex,
      didDrag,
      mouseDownOnCanvas,
      mode,
      fourthBondMode,
      // Functions
      handleArrowClickLocal,
      // Setters
      setIsSelecting,
      setIsDragging,
      setDraggingVertex,
      setIsDraggingVertex,
      setDraggingArrowIndex,
      setDragArrowOffset,
      setHoverVertex,
      setHoverSegmentIndex,
      setFourthBondMode,
      setFourthBondSource,
      setFourthBondPreview,
      setMouseDownOnCanvas
    );
  };

  // Arrow mouse handlers
  const handleArrowMouseMoveLocal = (event) => {
    handleArrowMouseMove(
      event,
      mode,
      canvasRef,
      curvedArrowStartPoint,
      offset,
      setArrowPreview
    );
  };



  const handleArrowClickLocal = (event) => {
    // Don't handle arrow clicks when in paste mode
    if (isPasteMode) return;
    
    // Capture state before creating arrows
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Only capture state if we're actually going to create an arrow
    if (mode === 'arrow' || mode === 'equil' || mode.startsWith('curve')) {
      captureState();
    }
    
    handleArrowClick(
      event,
      mode,
      canvasRef,
      offset,
      curvedArrowStartPoint,
      calculateCurvedArrowPeak,
      setArrows,
      setArrowPreview,
      setCurvedArrowStartPoint
    );
  };

  // Track if we're updating the grid to prevent infinite loops
  const [isUpdatingGrid, setIsUpdatingGrid] = useState(false);

  // Initial grid setup and resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Only generate initial grid if we don't have vertices yet
    if (vertices.length === 0 && !isUpdatingGrid) {
      setIsUpdatingGrid(true);
      const { newSegments, newVertices } = generateGrid(width, height, [], {}, []);
      setSegments(newSegments);
      setVertices(newVertices);
      setIsUpdatingGrid(false);
    }

    const handleResize = () => {
      if (isUpdatingGrid) return; // Prevent recursive updates
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      setIsUpdatingGrid(true);
      const { newSegments: s, newVertices: v } = generateGrid(width, height, vertices, vertexAtoms, segments);
      setSegments(s);
      setVertices(v);
      setIsUpdatingGrid(false);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [generateGrid]); // Only depend on generateGrid, not the data it processes

  // Update grid when off-grid vertices are added or removed
  const offGridVertexCount = useMemo(() => 
    vertices.filter(v => v.isOffGrid === true).length, 
    [vertices]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isUpdatingGrid || vertices.length === 0) return;

    // Only update if there are off-grid vertices
    if (offGridVertexCount > 0) {
      setIsUpdatingGrid(true);
      // Capture current values to avoid dependency issues
      const currentVertices = vertices;
      const currentVertexAtoms = vertexAtoms;
      const currentSegments = segments;
      
      const { newSegments, newVertices } = generateGrid(canvas.width, canvas.height, currentVertices, currentVertexAtoms, currentSegments);
      setSegments(newSegments);
      setVertices(newVertices);
      setIsUpdatingGrid(false);
    }
  }, [offGridVertexCount]);

  // Update vertex types whenever vertices, segments, or atoms change (skip during dragging)
  useEffect(() => {
    if (!isDraggingVertex) {
      const newVertexTypes = determineVertexTypes(vertices, segments, vertexAtoms);
      setVertexTypes(newVertexTypes);
    }
  }, [vertices, segments, vertexAtoms, isDraggingVertex]);



  // Capture initial state when component first loads
  useEffect(() => {
    // Only capture initial state if history is empty and vertices are loaded
    if (history.length === 0 && vertices.length > 0) {
      captureState();
    }
  }, [vertices, history.length, captureState]);

  useEffect(() => drawGrid(), [segments, vertices, vertexAtoms, vertexTypes, offset, arrowPreview, mode, drawGrid, fourthBondPreview, fourthBondMode, fourthBondSource, hoverCurvedArrow, bondPreviews, hoverBondPreview, epoxideVertices]);

  // Erase all handler
  const handleEraseAll = () => {
    // Capture state before erasing everything
    captureState();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Pass empty arrays for vertices, atoms, and segments since we're erasing everything
    const { newSegments, newVertices } = generateGrid(canvas.width, canvas.height, [], {}, []);
    setSegments(newSegments);
    setVertices(newVertices);
    setVertexAtoms({});
    setVertexTypes({}); // Reset vertex types
    setOffset({ x: 0, y: 0 });
    setShowMenu(false);
    setShowAtomInput(false);
    setArrows([]); // Clear all arrows as well
    setBondPreviews([]); // Clear bond previews
    setHoverBondPreview(null); // Clear hover state
  };

  // Add keyboard handler for ESC key to cancel curved arrow and selection
  useEffect(() => {
    const handleKeyDown = createEscapeKeyHandler(
      curvedArrowStartPoint,
      isSelecting,
      setCurvedArrowStartPoint,
      setArrowPreview,
      setIsSelecting,
      setSelectionStart,
      setSelectionEnd,
      setOffset,
      canvasRef
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [curvedArrowStartPoint, isSelecting]);

  // Add keyboard handler for ESC key to close atom input
  useEffect(() => {
    const handleKeyDown = createGeneralEscapeHandler(
      showAtomInput,
      showAboutPopup,
      mode,
      selectedSegments,
      selectedVertices,
      selectedArrows,
      setShowAtomInput,
      setShowAboutPopup,
      clearSelection
    );
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAtomInput, showAboutPopup, mode, selectedSegments, selectedVertices, selectedArrows, clearSelection]);



  // When mode changes away from arrow modes, clear preview:
  useEffect(() => { 
    if (mode !== 'arrow' && mode !== 'equil' && !mode.startsWith('curve')) {
      setArrowPreview(null);
      setCurvedArrowStartPoint(null);
    }
    // Reset the curved arrow start point when changing between different arrow types
    else if (!mode.startsWith('curve')) {
      setCurvedArrowStartPoint(null);
    }
    
    // Clear fourth bond state when switching away from draw, triple, or stereochemistry modes
    if (mode !== 'draw' && mode !== 'triple' && mode !== 'wedge' && mode !== 'dash' && mode !== 'ambiguous') {
      setFourthBondSource(null);
      setFourthBondPreview(null);
    }
    
    // Set cursor based on mode
    if (canvasRef.current) {
      if (mode === 'text' || mode === 'mouse') {
        canvasRef.current.style.cursor = 'text';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }
    

  }, [mode]);

  // Effect to run ring detection whenever vertices or segments change (skip during dragging)
  useEffect(() => {
    if (!isDraggingVertex) {
      detectRings();
    }
  }, [segments, vertices, detectRings, isDraggingVertex]);

  // Effect to run grid breaking analysis only when off-grid vertices change or bond structure changes
  const bondCount = useMemo(() => 
    segments.filter(seg => seg.bondOrder > 0).length, 
    [segments]
  );

  useEffect(() => {
    if (!isUpdatingGrid && !isDraggingVertex) {
      analyzeGridBreakingState();
    }
  }, [offGridVertexCount, bondCount, analyzeGridBreakingState, isUpdatingGrid, isDraggingVertex]);

  // Handle keyboard events for the fourth bond mode
  useEffect(() => {
    const handleKeyDown = createFourthBondKeyHandler(
      fourthBondMode,
      setFourthBondMode,
      setFourthBondSource,
      setFourthBondPreview
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fourthBondMode]);
  
  // Handle keyboard events for copy/paste
  useEffect(() => {
    const handleKeyDown = createCopyPasteKeyHandler(
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
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSegments, selectedVertices, selectedArrows, clipboard, isPasteMode, copySelection, cancelPasteMode, showSnapPreview]);

  // Handle keyboard events for undo
  useEffect(() => {
    const handleKeyDown = createUndoKeyHandler(
      historyIndex,
      undo
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [historyIndex, undo]);

  // Handle Enter key in draw mode to edit hovered vertex
  useEffect(() => {
    const handleKeyDown = createEnterKeyHandler(
      mode,
      hoverVertex,
      vertexAtoms,
      offset,
      showAtomInput,
      setMenuVertexKey,
      setAtomInputPosition,
      setAtomInputValue,
      setShowAtomInput
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, hoverVertex, vertexAtoms, offset, showAtomInput]);

  // Handle element shortcuts (O, N, F, S, C, H) in draw mode
  useEffect(() => {
    const handleKeyDown = createElementShortcutHandler(
      mode,
      hoverVertex,
      showAtomInput,
      captureState,
      setVertexAtoms
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, hoverVertex, showAtomInput, captureState]);



  // Auto-select text in atom input when it appears
  useEffect(() => {
    if (showAtomInput) {
      // Give the input time to render before trying to select
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]');
        if (input) {
          input.select();
        }
      }, 10);
    }
  }, [showAtomInput]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: colors.background,
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
          <div style={{ position: 'relative', display: 'inline-block' }} data-settings-dropdown>
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
                backgroundColor: colors.surface,
                minWidth: '280px',
                boxShadow: `0 8px 16px ${colors.shadow}`,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
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
                  borderBottom: `8px solid ${colors.surface}`
                }} />
                <div style={{
                  color: colors.text,
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  Settings
                </div>
                
                {/* Dark Mode Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: `1px solid ${colors.border}`
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <span style={{
                      color: colors.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '2px'
                    }}>
                      Dark Mode
                    </span>
                    <span style={{
                      color: colors.textSecondary,
                      fontSize: '12px'
                    }}>
                      Switch to dark color scheme
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      backgroundColor: isDarkMode ? colors.buttonActive : colors.button,
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: isDarkMode ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
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
        background: colors.surface,
        padding: 'calc(50px + 16px) 16px 16px 16px', // Top padding accounts for tab bar
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'max(8px, min(calc(min(240px, 22vw) * 0.031), 2vh))',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 0, // Remove border radius for full-height sidebar
        boxShadow: 'none', // Remove shadow
        border: `1px solid ${colors.border}`, // Remove border
        borderRight: '1px solidrgb(192, 192, 192)', // Add subtle right border
        zIndex: 2,
        justifyContent: 'flex-start', // Change from space-between to flex-start
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
        
        {/* Toolbar Content - always show since we only have Draw mode */}
        <>
        {/* Draw/Erase Buttons as icon buttons side by side */}
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
              backgroundColor: mode === 'draw' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'draw' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'draw') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'draw') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Draw Mode"
          >
            {/* Pencil SVG */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 24 24" fill="none" stroke={mode === 'draw' ? '#fff' : colors.textSecondary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'mouse' ? 'draw' : 'mouse';
              setModeAndClearSelection(newMode);
            }}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'mouse' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'mouse' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'mouse') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'mouse') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Mouse Mode"
          >
            {/* Mouse cursor SVG - bigger with handle */}
            <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
              <path d="M6 3L12 17L14.5 12.5L19 10.5L6 3Z" fill={mode === 'mouse' ? '#fff' : colors.textSecondary} stroke={mode === 'mouse' ? '#fff' : colors.textSecondary} strokeWidth="1.2" strokeLinejoin="round"/>
              <rect x="16.3" y="16" width="3.5" height="7" rx="1.5" fill={mode === 'mouse' ? '#fff' : colors.textSecondary} stroke={mode === 'mouse' ? '#fff' : colors.textSecondary} strokeWidth="0.5" transform="rotate(316 12.75 18.5)"/>
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
              backgroundColor: mode === 'erase' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'erase' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'erase') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'erase') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Erase Mode"
          >
            {/* Minimalist Eraser: Rotated rectangle, bifurcated */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
              <g transform="rotate(45 13 13)">
                <rect x="6" y="10" width="14" height="6" rx="1.5" fill={mode === 'erase' ? '#fff' : colors.textSecondary} stroke={mode === 'erase' ? '#fff' : colors.textSecondary} strokeWidth="1.5"/>
                <line x1="13" y1="10" x2="13" y2="16" stroke={mode === 'erase' ? colors.button : colors.surface} strokeWidth="1.5"/>
              </g>
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'text' ? 'draw' : 'text';
              setModeAndClearSelection(newMode);
            }}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'text' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'text' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'text') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'text') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Text Mode"
          >
            {/* Text "T" SVG - bigger and Times New Roman font */}
            <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
              <text x="5" y="18" fill={mode === 'text' ? '#fff' : colors.textSecondary} style={{ font: 'bold 20px "Times New Roman", serif' }}>T</text>
            </svg>
          </button>
        </div>

        {/* Buttons for charges/lone pairs */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(2px, calc(min(280px, 25vw) * 0.006))' }}>
          <button
            onClick={() => { 
              const newMode = mode === 'plus' ? 'draw' : 'plus';
              setModeAndClearSelection(newMode);
            }}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'plus' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'plus' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'plus') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'plus') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Add Positive Charge"
          >
            {/* Plus sign in circle SVG */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
              <circle cx="13" cy="13" r="9" stroke={mode === 'plus' ? '#fff' : colors.textSecondary} strokeWidth="2.2" fill="none" />
              <g stroke={mode === 'plus' ? '#fff' : colors.textSecondary} strokeWidth="2.2" strokeLinecap="round">
                <line x1="13" y1="8.5" x2="13" y2="17.5" />
                <line x1="8.5" y1="13" x2="17.5" y2="13" />
              </g>
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'minus' ? 'draw' : 'minus';
              setModeAndClearSelection(newMode);
            }}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'minus' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'minus' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'minus') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'minus') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Add Negative Charge"
          >
            {/* Minus sign in circle SVG */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
              <circle cx="13" cy="13" r="9" stroke={mode === 'minus' ? '#fff' : colors.textSecondary} strokeWidth="2.2" fill="none" />
              <line x1="8.5" y1="13" x2="17.5" y2="13" stroke={mode === 'minus' ? '#fff' : colors.textSecondary} strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'lone' ? 'draw' : 'lone';
              setModeAndClearSelection(newMode);
            }}
            className="toolbar-button"
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'lone' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(240px, 22vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'lone' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'lone') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'lone') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Add Lone Pair"
          >
            {/* Two dots SVG */}
            <svg width="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" height="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" viewBox="0 0 22 22" fill="none" style={{ pointerEvents: 'none' }}>
              <circle cx="7" cy="11" r="2.6" fill={mode === 'lone' ? '#fff' : colors.textSecondary} />
              <circle cx="15" cy="11" r="2.6" fill={mode === 'lone' ? '#fff' : colors.textSecondary} />
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
        {/* Arrow and Equilibrium Arrow Buttons side by side */}
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
              backgroundColor: mode === 'arrow' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'arrow' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'arrow') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'arrow') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <line x1="6" y1="13" x2="32" y2="13" stroke={mode === 'arrow' ? '#fff' : colors.textSecondary} strokeWidth="3" strokeLinecap="round" />
              <polygon points="32,7 44,13 32,19" fill={mode === 'arrow' ? '#fff' : colors.textSecondary} />
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
              backgroundColor: mode === 'equil' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'equil' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'equil') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'equil') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Equilibrium Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Top arrow: left to right */}
              <line x1="8" y1="10" x2="34" y2="10" stroke={mode === 'equil' ? '#fff' : colors.textSecondary} strokeWidth="3" strokeLinecap="round" />
              <polygon points="34,5 44,10 34,15" fill={mode === 'equil' ? '#fff' : colors.textSecondary} />
              {/* Bottom arrow: right to left */}
              <line x1="38" y1="18" x2="12" y2="18" stroke={mode === 'equil' ? '#fff' : colors.textSecondary} strokeWidth="3" strokeLinecap="round" />
              <polygon points="12,13 2,18 12,23" fill={mode === 'equil' ? '#fff' : colors.textSecondary} />
            </svg>
          </button>
        </div>
        {/* Six arrow buttons in two rows, three columns, each as a separate component for future extensibility */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'max(4px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
          marginTop: '0px',
        }}>
          {/* Arrow 1: CCW Shallow (Top Left) */}
          <button
            onClick={() => setModeAndClearSelection('curve2')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve2' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'curve2') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve2') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Counterclockwise semicircle (top left)"
          ><ArrowCCWSemicircleTopLeft mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 2: CW Semicircle (Top Center) */}
          <button
            onClick={() => setModeAndClearSelection('curve1')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve1' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'curve1') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve1') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise semicircle (top center)"
          ><ArrowCWSemicircleTopCenter mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 3: CW Quarter-circle (Top Right) */}
          <button
            onClick={() => setModeAndClearSelection('curve0')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve0' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'curve0') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve0') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise quarter (top right)"
          ><ArrowCWQuarterTopRight mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 4: CCW Semicircle (Bottom Left) */}
          <button
            onClick={() => setModeAndClearSelection('curve5')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve5' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'curve5') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve5') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Counterclockwise semicircle (bottom left)"
          ><ArrowCCWSemicircleBottomLeft mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 5: CW Semicircle (Bottom Center) */}
          <button
            onClick={() => setModeAndClearSelection('curve4')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve4' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'curve4') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve4') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise semicircle (bottom center)"
          ><ArrowCWSemicircleBottomCenter mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 6: CW Quarter-circle (Bottom Right) */}
          <button
            onClick={() => setModeAndClearSelection('curve3')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve3' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'curve3') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve3') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise quarter (bottom right)"
          ><ArrowCWQuarterBottomRight mode={mode} isDarkMode={isDarkMode} /></button>
        </div>
        {/* Stereochemistry Section Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(0px, min(calc(min(280px, 25vw) * 0.001), 0vh))',
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
              backgroundColor: mode === 'wedge' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'wedge' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'wedge') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'wedge') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Wedge Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <polygon points="6,13 38,6 38,20" fill={mode === 'wedge' ? '#fff' : colors.textSecondary} />
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
              backgroundColor: mode === 'dash' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'dash' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'dash') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'dash') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Dash Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Updated dash bond icon to better reflect actual appearance with perpendicular lines that get progressively wider */}
              <g transform="translate(6, 13)">
                <line x1="0" y1="0" x2="32" y2="0" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="1" strokeOpacity="0" />
                <line x1="3" y1="-1" x2="3" y2="1" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="-2" x2="9" y2="2" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="15" y1="-3" x2="15" y2="3" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="-4" x2="21" y2="4" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="27" y1="-5" x2="27" y2="5" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="33" y1="-6" x2="33" y2="6" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
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
              backgroundColor: mode === 'ambiguous' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'ambiguous' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'ambiguous') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'ambiguous') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Ambiguous Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <path
                d= " M 4 13 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0"
                stroke={mode === 'ambiguous' ? '#fff' : colors.textSecondary}
                stroke-width="3"
                fill="none"
                linecap="round"
                />
            </svg>
          </button>
        </div>

        {/* Special Section Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(0px, min(calc(min(280px, 25vw) * 0.001), 0vh))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Special</div>
        
        {/* Special buttons in 2x4 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 'max(4px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
          marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))',
        }}>
          {/* Triple Bond Button */}
          <button
            onClick={() => setModeAndClearSelection('triple')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'triple' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'triple' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'triple') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'triple') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Triple Bond"
          >
            <svg width="max(24px, min(32px, calc(min(280px, 25vw) * 0.114)))" height="max(14px, min(18px, calc(min(280px, 25vw) * 0.064)))" viewBox="0 0 32 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Triple bond - three parallel lines (smaller) */}
              <line x1="4" y1="5" x2="28" y2="5" stroke={mode === 'triple' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="9" x2="28" y2="9" stroke={mode === 'triple' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="13" x2="28" y2="13" stroke={mode === 'triple' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Benzene preset button */}
          <button
            onClick={toggleBenzenePreset}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: selectedPreset === 'benzene' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: selectedPreset === 'benzene' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (selectedPreset !== 'benzene') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPreset !== 'benzene') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Benzene Ring"
          >
            {/* Benzene ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Benzene ring structure with alternating single/double bonds */}
              <g transform="translate(60, 60)">
                {/* Bond 0: Double bond (top-right) */}
                <g>
                  <line x1="40" y1="-10" x2="80" y2="12" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="42" y1="8" x2="66" y2="22" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 1: Single bond (right) */}
                <line x1="80" y1="12" x2="80" y2="60" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 2: Double bond (bottom-right) */}
                <g>
                  <line x1="80" y1="60" x2="40" y2="82" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="66" y1="52" x2="44" y2="65" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 3: Single bond (bottom-left) */}
                <line x1="40" y1="82" x2="0" y2="60" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 4: Double bond (left) */}
                <g>
                  <line x1="0" y1="60" x2="0" y2="12" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="14" y1="50" x2="14" y2="21" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 5: Single bond (top-left) */}
                <line x1="0" y1="12" x2="40" y2="-10" stroke={selectedPreset === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclohexane preset button */}
          <button
            onClick={toggleCyclohexanePreset}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: selectedPreset === 'cyclohexane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: selectedPreset === 'cyclohexane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (selectedPreset !== 'cyclohexane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPreset !== 'cyclohexane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclohexane Ring"
          >
            {/* Cyclohexane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclohexane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in hexagon pattern */}
                <line x1="40" y1="-10" x2="80" y2="12" stroke={selectedPreset === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="12" x2="80" y2="60" stroke={selectedPreset === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="60" x2="40" y2="82" stroke={selectedPreset === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="40" y1="82" x2="0" y2="60" stroke={selectedPreset === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="60" x2="0" y2="12" stroke={selectedPreset === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="12" x2="40" y2="-10" stroke={selectedPreset === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>

              </g>
            </svg>
          </button>
          
          {/* Cyclopentane preset button */}
          <button
            onClick={toggleCyclopentanePreset}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: selectedPreset === 'cyclopentane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: selectedPreset === 'cyclopentane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (selectedPreset !== 'cyclopentane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPreset !== 'cyclopentane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclopentane Ring"
          >
            {/* Cyclopentane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclopentane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in pentagon pattern */}
                <line x1="40" y1="0" x2="80" y2="30" stroke={selectedPreset === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="80" y1="30" x2="66" y2="80" stroke={selectedPreset === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="66" y1="80" x2="20" y2="80" stroke={selectedPreset === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="0" y1="30" x2="16" y2="80" stroke={selectedPreset === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="40" y1="0" x2="0" y2="30" stroke={selectedPreset === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclobutane preset button */}
          <button
            onClick={toggleCyclobutanePreset}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: selectedPreset === 'cyclobutane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: selectedPreset === 'cyclobutane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (selectedPreset !== 'cyclobutane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPreset !== 'cyclobutane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclobutane Ring"
          >
            {/* Cyclobutane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclobutane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in square pattern */}
                <line x1="0" y1="0" x2="80" y2="0" stroke={selectedPreset === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="0" x2="80" y2="80" stroke={selectedPreset === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="80" x2="0" y2="80" stroke={selectedPreset === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="0" y2="0" stroke={selectedPreset === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclopropane preset button */}
          <button
            onClick={toggleCyclopropanePreset}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: selectedPreset === 'cyclopropane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: selectedPreset === 'cyclopropane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (selectedPreset !== 'cyclopropane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPreset !== 'cyclopropane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclopropane Ring"
          >
            {/* Cyclopropane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclopropane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in triangle pattern */}
                <line x1="80" y1="80" x2="40" y2="0" stroke={selectedPreset === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="80" y2="80" stroke={selectedPreset === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="40" y2="0" stroke={selectedPreset === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Chair Conformation preset button - DISABLED */}
          <button
            onClick={() => {}} // Disabled - does nothing
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: '#e9ecef', // Always disabled appearance
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'not-allowed', // Show disabled cursor
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={() => {}} // No hover effect - disabled
            onMouseLeave={() => {}} // No hover effect - disabled
            title="Chair Conformation (Disabled)"
          >
            {/* Chair conformation SVG preview */}
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Proper chair with 3 sets of parallel lines */}
              <g stroke="#666" strokeWidth="1.4" fill="none" strokeLinecap="round"> {/* Always gray - disabled */}
                {/* Chair shape: bottom flat, then up-slants, top flat, then down-slants */}
                <path d="M3 11 L9 11 L12 7 L10 4 L4 4 L1 7 Z"/>
              </g>
            </svg>
          </button>
          
          <button
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#e9ecef',
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              color: '#666',
              fontSize: 'max(10px, min(14px, calc(min(280px, 25vw) * 0.05)))',
              fontWeight: '600',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dee2e6';
              e.target.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
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
            onClick={() => { 
              handleEraseAll(); 
              clearSelection(); 
            }}
            className="toolbar-button"
            style={{
              flex: 1,
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: '#e9ecef',
              color: '#333',
              border: `1px solid ${colors.border}`,
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
            onClick={undo}
            disabled={historyIndex <= 0}
            className="toolbar-button"
            style={{
              flex: 1,
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: historyIndex <= 0 ? '#f8f9fa' : '#e9ecef',
              color: historyIndex <= 0 ? '#999' : '#333',
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.025)',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
              boxShadow: historyIndex <= 0 ? 
                '0 1px 2px rgba(0,0,0,0.05)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
              fontWeight: 700,
              marginTop: 0,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'max(6px, calc(min(280px, 25vw) * 0.025))',
              opacity: historyIndex <= 0 ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (historyIndex > 0) {
                e.target.style.backgroundColor = '#ffc107';
                e.target.style.color = '#000';
                e.target.style.boxShadow = '0 6px 16px rgba(255,193,7,0.4), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (historyIndex > 0) {
                e.target.style.backgroundColor = colors.button;
                e.target.style.color = '#333';
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title={`Undo${historyIndex <= 0 ? ' (No actions to undo)' : ''}`}
          >
            {/* Undo SVG */}
            <svg width="max(20px, calc(min(280px, 25vw) * 0.081))" height="max(20px, calc(min(280px, 25vw) * 0.081))" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
            Undo
          </button>
        </div>
        </>
      </div>
      
      {/* Canvas wrapper fills all except toolbar area */}
      <div style={{
        position: 'absolute',
        top: '50px', // Account for tab bar
        left: 'min(240px, 22vw)', // Start after the sidebar
        right: 0,
        bottom: 0,
        zIndex: 1,
        pointerEvents: 'none', // let toolbar be clickable
      }}>
        <canvas
          ref={canvasRef}
          onClick={e => { handleClick(e); }}
          onMouseDown={handleMouseDown}
          onMouseMove={e => { handleMouseMove(e); handleArrowMouseMoveLocal(e); }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            cursor: isPasteMode ? 'copy' : (mode === 'text' || mode === 'mouse' ? 'text' : 'default'),
            display: 'block',
          }}
        />
      </div>
      {/* Atom text input - must be outside pointerEvents:none wrapper */}
      {showAtomInput && (
        <>
        {/* Overlay for dismissing input by clicking outside */}
        <div
          onClick={() => handleAtomInputSubmit()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9,
            background: 'transparent',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: `${atomInputPosition.y}px`,
            left: `${atomInputPosition.x}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          {/* Styled display with subscript numbers */}
          <div
            style={{
              width: '70px', // Slightly wider for better visibility
              height: '38px', // Slightly taller
              padding: '4px 8px',
              fontSize: '22px', // Slightly larger font
              fontWeight: '600',
              textAlign: 'center',
              border: '2px solid #3662e3',
              borderRadius: '8px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              backgroundColor: 'white',
              color: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
              cursor: 'text',
              lineHeight: '1.2',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            onClick={(e) => {
              // Focus the hidden input when clicking on the display div
              const input = e.currentTarget.querySelector('input');
              if (input) input.focus();
              e.stopPropagation();
            }}
          >
            {/* Format the text to show subscript numbers */}
            {formatAtomText(atomInputValue)}
            
            {/* Hidden input field that captures keystrokes */}
            <input
              type="text"
              value={atomInputValue}
              onChange={(e) => {
                const newValue = e.target.value;
                // Auto-capitalize single letters
                if (newValue.length === 1 && /^[a-zA-Z]$/.test(newValue)) {
                  setAtomInputValue(newValue.toUpperCase());
                } else {
                  setAtomInputValue(newValue);
                }
              }}
              onKeyDown={handleAtomInputKeyDown}
              autoFocus
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                height: '100%',
                padding: 0,
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: 'transparent',
                caretColor: 'black', // Only the caret is visible
                outline: 'none',
                zIndex: 1,
                textAlign: 'center',
                letterSpacing: '0.6em' // Increased spacing between letters // Add slight spacing between letters
              }}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
        </>
      )}
      
      {/* Copy Button - appears above selection */}
      {(selectedSegments.size > 0 || selectedVertices.size > 0 || selectedArrows.size > 0) && !isPasteMode && (() => {
        // Calculate current screen bounds of selected items
        let minX = Infinity, maxX = -Infinity, minY = Infinity;
        
        // Check selected vertices
        selectedVertices.forEach(vertexIndex => {
          const vertex = vertices[vertexIndex];
          if (vertex) {
            const screenX = vertex.x + offset.x;
            const screenY = vertex.y + offset.y;
            minX = Math.min(minX, screenX);
            maxX = Math.max(maxX, screenX);
            minY = Math.min(minY, screenY);
          }
        });
        
        // Check selected segments
        selectedSegments.forEach(segmentIndex => {
          const segment = segments[segmentIndex];
          if (segment) {
            const screenX1 = segment.x1 + offset.x;
            const screenY1 = segment.y1 + offset.y;
            const screenX2 = segment.x2 + offset.x;
            const screenY2 = segment.y2 + offset.y;
            minX = Math.min(minX, screenX1, screenX2);
            maxX = Math.max(maxX, screenX1, screenX2);
            minY = Math.min(minY, screenY1, screenY2);
          }
        });
        
        // Check selected arrows
        selectedArrows.forEach(arrowIndex => {
          const arrow = arrows[arrowIndex];
          if (arrow) {
            const screenX1 = arrow.x1 + offset.x;
            const screenY1 = arrow.y1 + offset.y;
            const screenX2 = arrow.x2 + offset.x;
            const screenY2 = arrow.y2 + offset.y;
            minX = Math.min(minX, screenX1, screenX2);
            maxX = Math.max(maxX, screenX1, screenX2);
            minY = Math.min(minY, screenY1, screenY2);
          }
        });
        
        // If no valid bounds found, don't render the button
        if (minX === Infinity) return null;
        
        const centerX = (minX + maxX) / 2;
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              copySelection();
            }}
            style={{
              position: 'absolute',
              top: `${minY - 40}px`,
              left: `${centerX}px`,
              transform: 'translateX(-50%)',
              zIndex: 4,
              backgroundColor: 'rgb(54, 98, 227)',
              color: 'white',
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
            }}
            title="Copy (Cmd/Ctrl+C)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        );
      })()}
      
      {/* Paste Mode Indicator */}
      {isPasteMode && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            zIndex: 10,
            backgroundColor: showSnapPreview ? '#4CAF50' : '#FF9800',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div>
            {selectedPreset ? (
              `Preset: ${selectedPreset.charAt(0).toUpperCase() + selectedPreset.slice(1)}`
            ) : (
              showSnapPreview ? (
                snapAlignment && snapAlignment.type === 'bond' ? 'Bond Snap: ON' : 'Grid Snap: ON'
              ) : 'Grid Snap: OFF'
            )}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9' }}>
            {(selectedPreset === 'cyclopentane' || selectedPreset === 'cyclobutane' || selectedPreset === 'cyclopropane' || selectedPreset === 'chair') ? 
             (snapAlignment && snapAlignment.type === 'bond' ? 'Snapping to bond' : 'Move near bond to snap') : 
             selectedPreset ? 'Click to place multiple' : 'Press G to toggle'}
          </div>
          {snapAlignment && showSnapPreview && !selectedPreset && (
            <div style={{ 
              fontSize: '12px', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: '2px 6px', 
              borderRadius: '4px' 
            }}>
              {snapAlignment.type === 'bond' ? 'Ring will include bond' : 
               `${snapAlignment.alignedBonds || 0}/${snapAlignment.totalBonds || 0} bonds aligned`}
            </div>
          )}
        </div>
      )}
      
      {/* About Popup */}
      {showAboutPopup && (
        <>
          {/* Overlay for dismissing popup by clicking outside */}
          <div
            onClick={() => setShowAboutPopup(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 15,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 16,
              pointerEvents: 'auto',
              width: '400px',
              maxWidth: '90vw',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '2px solid #e0e0e0',
              padding: '30px',
              textAlign: 'center',
              fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
            }}
          >
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '20px',
              lineHeight: '1.4',
            }}>
              Made by: Nathan Levy PO '27
            </div>
            
            <div style={{
              fontSize: '18px',
              fontWeight: '500',
              color: '#333',
              marginBottom: '20px',
              lineHeight: '1.4',
            }}>
              text 925-808-9441 with questions!
            </div>
            
            <div style={{
              fontSize: '16px',
              fontWeight: '400',
              color: '#666',
              fontStyle: 'italic',
              lineHeight: '1.4',
            }}>
              still under development.
            </div>
            
            <button
              onClick={() => setShowAboutPopup(false)}
              style={{
                marginTop: '25px',
                backgroundColor: '#e9ecef',
                color: 'white',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dee2e6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e9ecef'}
            >
              Close
            </button>
          </div>
        </>
      )}
      
      {/* Export Popup */}
      {showExportPopup && exportImageUrl && (
        <>
          {/* Overlay for dismissing popup by clicking outside */}
          <div
            onClick={() => setShowExportPopup(false)}
            style={{
        position: 'fixed',
              inset: 0,
              zIndex: 15,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 16,
              pointerEvents: 'auto',
              width: '500px',
              maxWidth: '90vw',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '2px solid #e0e0e0',
              padding: '30px',
              textAlign: 'center',
              fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
            }}
          >
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '20px',
            }}>
              Export Molecular Structure
            </div>
            
            {/* Image Preview */}
            <div style={{
              marginBottom: '24px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
            }}>
              <img
                src={exportImageUrl}
                alt="Molecular structure preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '16px',
      }}>
        <button
          onClick={() => {
                  // Create download link with smart filename
                  const link = document.createElement('a');
                  link.href = exportImageUrl;
                  
                  const date = new Date().toISOString().split('T')[0];
                  const sizeInfo = exportMetadata ? `_${exportMetadata.width}x${exportMetadata.height}` : '';
                  link.download = `molecule_${date}${sizeInfo}.png`;
                  
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
          style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
            cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#45a049';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4CAF50';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Save as PNG
              </button>
              
              <button
                onClick={async () => {
                  try {
                    // Convert data URL to blob
                    const response = await fetch(exportImageUrl);
                    const blob = await response.blob();
                    
                    // Copy to clipboard
                    await navigator.clipboard.write([
                      new ClipboardItem({ 'image/png': blob })
                    ]);
                    
                    // Show success feedback
                    const btn = event.target;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ Copied!';
                    btn.style.backgroundColor = '#28a745';
                    setTimeout(() => {
                      btn.innerHTML = originalText;
                      btn.style.backgroundColor = '#2196F3';
                    }, 1500);
                  } catch (error) {
                    alert('Clipboard copy failed. Please use "Save as PNG" instead.');
                  }
                }}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
          onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                  e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2196F3';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Image
        </button>
            </div>
            
            <div style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '20px',
              lineHeight: '1.4',
            }}>
              {exportMetadata ? (
                <>
                  Smart cropped: {exportMetadata.width}×{exportMetadata.height}px • {exportMetadata.scaleFactor}x resolution • Clean background
                </>
              ) : (
                'High-quality PNG export • Clean background • No grid lines'
              )}
            </div>
        
        <button
              onClick={() => setShowExportPopup(false)}
              style={{
                backgroundColor: '#e9ecef',
                color: '#333',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dee2e6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e9ecef'}
            >
              Close
            </button>
          </div>
        </>
      )}
      
      {/* Bottom Right Toolbar - Export */}
      <div style={{
        position: 'fixed',
        bottom: (() => {
          // Use active molecule detection instead of checking all molecules
          const activeMolecule = getActiveMolecule();
          const hasValidMolecule = activeMolecule && activeMolecule.vertexKeys.length > 0;
          
          if (!hasValidMolecule) {
            // No active molecule - position at bottom with small margin
            return '20px';
          } else if (isPropertiesPanelExpanded) {
            // Expanded panel - position just above the expanded panel
            // Panel is at bottom: 20px, expanded height varies 190-290px, so position at 20 + 230px + 8px gap = 258px
            return '178px';
          } else {
            // Collapsed pill - position above the small pill (approx 40px tall) + margin
            return '70px';
          }
        })(),
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 3,
        transition: 'bottom 0.3s ease'
      }}>
        <button
          onClick={async () => {
            if (vertices.length === 0 && segments.filter(s => s.bondOrder > 0).length === 0 && arrows.length === 0) {
              alert('Draw a molecule first!');
              return;
            }
            
            setIsExporting(true);
            
            try {
              // Generate clean canvas image with smart cropping
              const result = await renderCleanCanvas(2); // 2x resolution for good quality and performance
              if (result) {
                if (typeof result === 'string') {
                  // Legacy format - just image URL
                  setExportImageUrl(result);
                  setExportMetadata(null);
                } else {
                  // New format with metadata
                  setExportImageUrl(result.imageUrl);
                  setExportMetadata(result);

                }
                setShowExportPopup(true);
              } else {
                alert('No content to export!');
              }
            } catch (error) {
              console.error('Export error:', error);
              alert('Failed to generate export image. Please try again.');
            } finally {
              setIsExporting(false);
            }
          }}
          className="toolbar-button"
          style={{
            width: '80px',
            height: '36px',
            backgroundColor: isExporting ? '#f8f9fa' : '#e9ecef',
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            cursor: isExporting ? 'wait' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            outline: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: isExporting ? '#999' : '#333',
            fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
            opacity: isExporting ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
          title={isExporting ? "Generating image..." : "Export"}
          disabled={isExporting}
          onMouseEnter={(e) => {
            if (!isExporting) {
              e.target.style.backgroundColor = '#dee2e6';
              e.target.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExporting) {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
          }}
        >
          {isExporting ? '...' : 'Export'}
        </button>
      </div>

      {/* Molecular Properties Display */}
      <MolecularProperties 
        vertices={(() => {
          // Get the active molecule (last edited one)
          const activeMolecule = getActiveMolecule();
          if (!activeMolecule) return [];
          
          // Only include vertices from the active molecule
          const molecularVertices = [];
          
                      activeMolecule.vertexKeys.forEach(vertexKey => {
              const [x, y] = vertexKey.split(',').map(parseFloat);
              const vertex = vertices.find(v => 
                Math.abs(v.x - x) < 0.01 && Math.abs(v.y - y) < 0.01
              );
              if (vertex) {
                const atomInfo = vertexAtoms[vertexKey];
                // Handle both string and object formats for atom data
                // Any vertex in the active molecule without an explicit label is carbon
                let element = 'C'; // Default to carbon for all molecular vertices
                if (atomInfo) {
                  element = atomInfo.symbol || atomInfo || 'C';
                }

                molecularVertices.push({
                  ...vertex,
                  id: vertexKey,
                  element: element
                });
              }
            });
          
          return molecularVertices;
        })()} 
        bonds={(() => {
          // Get the active molecule (last edited one)
          const activeMolecule = getActiveMolecule();
          if (!activeMolecule) return [];
          
          // Only include bonds within the active molecule
          const activeMoleculeBonds = segments.filter(s => {
            if (s.bondOrder <= 0) return false;
            
            const v1Key = `${s.x1.toFixed(2)},${s.y1.toFixed(2)}`;
            const v2Key = `${s.x2.toFixed(2)},${s.y2.toFixed(2)}`;
            
            return activeMolecule.vertexKeys.includes(v1Key) && 
                   activeMolecule.vertexKeys.includes(v2Key);
          });
          
          return activeMoleculeBonds.map(s => ({
            id: s.id || `${s.x1}-${s.y1}-${s.x2}-${s.y2}`,
            from: `${s.x1.toFixed(2)},${s.y1.toFixed(2)}`,
            to: `${s.x2.toFixed(2)},${s.y2.toFixed(2)}`,
            bondType: s.bondOrder === 2 ? 'double' : s.bondOrder === 3 ? 'triple' : 'single'
          }));
        })()} 
        onExpandedChange={setIsPropertiesPanelExpanded}
      />
    </div>
  );
};



 //UI FOR ARROWS
// --- Arrow SVG Components ---
const ARROW_STROKE = 3.5; // match straight arrow thickness
const ARROW_COLOR = "#FFF";
const ARROWHEAD_SIZE = 8; // 20% larger than typical

// Helper for arrowhead: returns points for a triangle at (x, y) with direction angle (radians)
function arrowheadPoints(x, y, angle, size = ARROWHEAD_SIZE) {
  const base = size * 1;
  const height = size * 1;
  // Base points perpendicular to angle
  const x1 = x - height * Math.cos(angle);
  const y1 = y - height * Math.sin(angle);
  const x2 = x1 + base * Math.cos(angle + Math.PI / 2);
  const y2 = y1 + base * Math.sin(angle + Math.PI / 2);
  const x3 = x1 + base * Math.cos(angle - Math.PI / 2);
  const y3 = y1 + base * Math.sin(angle - Math.PI / 2);
  return `${x},${y} ${x2},${y2} ${x3},${y3}`;
}
// 1. Counterclockwise Semicircle (Top Left)
function ArrowCCWSemicircleTopLeft({ mode, isDarkMode = false }) {
  // manually made
  const angle = -3 * Math.PI / 4;
  const color = mode === 'curve2' ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666');
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
// 2. Clockwise Semicircle (Top Center)
function ArrowCWSemicircleTopCenter({ mode, isDarkMode = false }) {
  // manually made
  const angle = -3 * Math.PI / 4;
  const color = mode === 'curve1' ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666');
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
// 3. Clockwise Quarter-circle (Top Right)
function ArrowCWQuarterTopRight({ mode, isDarkMode = false }) {
  // manually made
  const angle = -3 * Math.PI / 4;
  const color = mode === 'curve0' ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666');
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
// 4. Counterclockwise Semicircle (Bottom Left)
function ArrowCCWSemicircleBottomLeft({ mode, isDarkMode = false }) {
  const color = mode === 'curve5' ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666');
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
// 5. Clockwise Semicircle (Bottom Center)
function ArrowCWSemicircleBottomCenter({ mode, isDarkMode = false }) {
  // Arc: start at (10,34), end at (34,10), r=16, large-arc, sweep=1
  // Arrowhead at (34,10), tangent is -45deg
  const angle = -Math.PI/4;
  const color = mode === 'curve4' ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666');
  return (
    <svg width="48" height="48" viewBox="0 4 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      {/* Arc remains the same */}
      <path d="M12 24 A12 12 0 0 0 36 24"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      {/* Arrowhead flipped downward */}
      <polygon points="29,24 38,19 42,28" fill={color}/>
    </svg>
  );
}
// 6. Clockwise Quarter-circle (Bottom Right)
function ArrowCWQuarterBottomRight({ mode, isDarkMode = false }) {
  // Arc: start at (10,22), end at (34,34), r=12, large-arc=0, sweep=1
  // Arrowhead at (34,34), tangent is 30deg
  const angle = Math.atan2(12,24); // 26.56deg
  const color = mode === 'curve3' ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666');
  return (
    <svg width="48" height="48" viewBox="0 15 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M10 38 A22 22 0 0 0 38 38"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      {/* Arrowhead flipped downward */}
      <polygon points="33,33 43,43 43,33" fill={color}/>
    </svg>
  );
}

export default HexGridWithToolbar;