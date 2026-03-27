import React, { useRef, useState, useCallback } from 'react';
import logoFinal4 from '/logoFinal4.png';
import gearIcon from '/gear.png';
import { formatAtomText } from './utils/TextUtils.jsx';
import { renderDoubleBond, analyzeBondContext, findNeighboringBonds } from './rendering/DoubleBondRenderer.js';
import { detectAllRingsEnhanced } from './rendering/RingDetectionUtils.js';
import { 
  handleTextButtonClick, 
  handleEnterKeyOnVertex, 
  handleQuickElementKey,
  handleTextInputComplete 
} from './handlers/TextHandler.js';
import { renderAllAtomText } from './rendering/TextRenderer.js';
import { renderAllLonePairsAndCharges } from './rendering/LonePairRenderer.js';
import { getLonePairPositionOrder } from './utils/LonePairPositioning.js';
import { renderAllStereochemistryBonds, renderStereochemistryBond } from './rendering/StereochemistryRenderer.js';
import { renderAllArrows, renderArrowPreview, renderArrow } from './rendering/ArrowRenderer.js';
import { calculateBenzeneSnap, calculateRingSnap } from './utils/SnapUtils.js';
import { renderCleanCanvasExport } from './utils/cleanExportCanvas.js';

const RING_PRESET_MODES = ['benzene', 'cyclohexane', 'cyclopentane', 'cyclobutane', 'cyclopropane'];

const HexGridWithToolbar = () => {
    const canvasRef = useRef(null);
    
    // State variables needed for visual appearance
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showAboutPopup, setShowAboutPopup] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [mode, setMode] = useState('draw');
    const [atomInputValue, setAtomInputValue] = useState('');
    const [showAtomInput, setShowAtomInput] = useState(false);
    const [atomInputPosition, setAtomInputPosition] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isPasteMode, setIsPasteMode] = useState(false);
    const [selectedSegments, setSelectedSegments] = useState(new Set());
    const [selectedVertices, setSelectedVertices] = useState(new Set());
    const [selectedArrows, setSelectedArrows] = useState(new Set());
    
    // Core molecular data
    const [segments, setSegments] = useState([]);
    const [vertices, setVertices] = useState([]);
    const [vertexAtoms, setVertexAtoms] = useState({});
    const [arrows, setArrows] = useState([]);
    
    // UI interaction state
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [menuVertexKey, setMenuVertexKey] = useState(null);
    const [hoverVertex, setHoverVertex] = useState(null);
    const [hoverSegmentIndex, setHoverSegmentIndex] = useState(null);
    const [hoverCurvedArrow, setHoverCurvedArrow] = useState({ index: -1, part: null });
    const [arrowPreview, setArrowPreview] = useState(null);
    
    // Selection state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
    const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
    const [selectionBounds, setSelectionBounds] = useState(null);
    const [selectedMolecules, setSelectedMolecules] = useState([]); // Array of molecule vertex sets
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [dragSelectionStart, setDragSelectionStart] = useState({ x: 0, y: 0 });
    const [hoveredMolecule, setHoveredMolecule] = useState(null); // For hover preview
    const [hoveredArrow, setHoveredArrow] = useState(null); // Arrow under cursor
    const [draggingArrow, setDraggingArrow] = useState(null); // Arrow being dragged
    const [draggingArrowEnd, setDraggingArrowEnd] = useState(null); // Which end: 'start', 'end', or 'middle'
    const [justCompletedSelection, setJustCompletedSelection] = useState(false); // Prevent click after selection
    const [arrowControlOffsets, setArrowControlOffsets] = useState({}); // Store control offset for curved arrows
    
    // Copy/paste state
    const [clipboard, setClipboard] = useState(null);
    const [pastePreviewPosition, setPastePreviewPosition] = useState({ x: 0, y: 0 });
    const [isPastePreviewMode, setIsPastePreviewMode] = useState(false);
    
    // Grid and snapping state
    const [gridVertexIndex, setGridVertexIndex] = useState(new Map());
    const [snapAlignment, setSnapAlignment] = useState(null);
    const [showSnapPreview, setShowSnapPreview] = useState(true);
    
    // Fourth bond feature state
    const [fourthBondMode, setFourthBondMode] = useState(false);
    const [fourthBondSource, setFourthBondSource] = useState(null);
    const [fourthBondPreview, setFourthBondPreview] = useState(null);
    
    // Curved arrow state
    const [curvedArrowStartPoint, setCurvedArrowStartPoint] = useState(null);
    
    // Bond creation state for draw mode
    const [isCreatingBond, setIsCreatingBond] = useState(false);
    const [bondStartPoint, setBondStartPoint] = useState(null);
    const [bondPreviewEnd, setBondPreviewEnd] = useState(null);
    
    // Hover state for highlighting
    const [hoveredVertex, setHoveredVertex] = useState(null);
    const [hoveredBondIndex, setHoveredBondIndex] = useState(null);
    
    // Bond suggestions state
    const [bondSuggestions, setBondSuggestions] = useState([]);
    const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(null);
    
    // Vertex bond state tracking - maps vertex key to its bond directions and orientation
    const [vertexBondStates, setVertexBondStates] = useState({});
    
    // Current mouse position for text input positioning
    const [currentMousePosition, setCurrentMousePosition] = useState({ x: 0, y: 0 });
    
    // Ring detection state - persistent rings
    const [detectedRings, setDetectedRings] = useState([]);
    
    // Additional UI state
    const [showExportPopup, setShowExportPopup] = useState(false);
    const [exportImageUrl, setExportImageUrl] = useState(null);
    const [exportMetadata, setExportMetadata] = useState(null);
    
    // Mode switching function
    const setModeAndClearSelection = (newMode) => {
      setMode(newMode);
      // Clear any selections when switching modes
      setSelectedSegments(new Set());
      setSelectedVertices(new Set());
      setSelectedArrows(new Set());
    };

    // Erase All function - clears the entire canvas
    const handleEraseAll = () => {
      saveToHistory(); // Save state before clearing
      setVertices([]);
      setSegments([]);
      setVertexAtoms({});
      setArrows([]);
      setBondSuggestions([]);
      setDetectedRings([]);
      setVertexBondStates({});
      setSelectedSegments(new Set());
      setSelectedVertices(new Set());
      setSelectedArrows(new Set());
      setClipboard(null);
      setIsPasteMode(false);
      setShowAtomInput(false);
      setIsCreatingBond(false);
      setBondStartPoint(null);
      setHoveredVertex(null);
      setHoveredBondIndex(null);
      setCurvedArrowStartPoint(null);
      setFourthBondMode(false);
      setFourthBondSource(null);
      setFourthBondPreview(null);
    };

    // Save current state to history
    const saveToHistory = useCallback(() => {
      const snapshot = {
        vertices: JSON.parse(JSON.stringify(vertices)),
        segments: JSON.parse(JSON.stringify(segments)),
        vertexAtoms: JSON.parse(JSON.stringify(vertexAtoms)),
        arrows: JSON.parse(JSON.stringify(arrows)),
        detectedRings: JSON.parse(JSON.stringify(detectedRings)),
        vertexBondStates: JSON.parse(JSON.stringify(vertexBondStates))
      };
      
      setHistory(prev => {
        // If we're not at the end of history, remove future states
        const newHistory = prev.slice(0, historyIndex + 1);
        // Add new snapshot
        newHistory.push(snapshot);
        // Limit history to 50 states to avoid memory issues
        if (newHistory.length > 50) {
          newHistory.shift();
          return newHistory;
        }
        return newHistory;
      });
      
      setHistoryIndex(prev => {
        const newIndex = prev + 1;
        return newIndex > 50 ? 50 : newIndex;
      });
    }, [vertices, segments, vertexAtoms, arrows, detectedRings, vertexBondStates, historyIndex]);

    // Undo function - restore previous state
    const handleUndo = useCallback(() => {
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        const prevState = history[prevIndex];
        
        if (prevState) {
          setVertices(JSON.parse(JSON.stringify(prevState.vertices)));
          setSegments(JSON.parse(JSON.stringify(prevState.segments)));
          setVertexAtoms(JSON.parse(JSON.stringify(prevState.vertexAtoms)));
          setArrows(JSON.parse(JSON.stringify(prevState.arrows)));
          setDetectedRings(JSON.parse(JSON.stringify(prevState.detectedRings)));
          setVertexBondStates(JSON.parse(JSON.stringify(prevState.vertexBondStates)));
          setHistoryIndex(prevIndex);
          
          // Clear temporary states
          setBondSuggestions([]);
          setIsCreatingBond(false);
          setBondStartPoint(null);
          setBondPreviewEnd(null);
          setCurvedArrowStartPoint(null);
        }
      }
    }, [history, historyIndex]);

    const copySelectionToClipboard = useCallback(() => {
      if (selectedMolecules.length === 0 && selectedArrows.size === 0) return;

      const clipboardData = {
        molecules: selectedMolecules.map((m) => ({
          vertices: m.vertices.map((v) => ({ ...v })),
          bonds: m.bonds.map((b) => ({ ...b })),
          atoms: {},
          bondStates: {},
        })),
        arrows: Array.from(selectedArrows).map((idx) => ({ ...arrows[idx] })),
      };

      clipboardData.molecules.forEach((mol) => {
        mol.vertices.forEach((v) => {
          const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
          if (vertexAtoms[key]) {
            mol.atoms[key] = { ...vertexAtoms[key] };
          }
          if (vertexBondStates[key]) {
            mol.bondStates[key] = { ...vertexBondStates[key] };
          }
        });
      });

      setClipboard(clipboardData);
      const worldX = currentMousePosition.x - offset.x;
      const worldY = currentMousePosition.y - offset.y;
      setPastePreviewPosition({ x: worldX, y: worldY });
      setIsPastePreviewMode(true);
      setSelectedMolecules([]);
      setSelectedVertices(new Set());
      setSelectedSegments(new Set());
      setSelectedArrows(new Set());
    }, [
      selectedMolecules,
      selectedArrows,
      arrows,
      vertexAtoms,
      vertexBondStates,
      currentMousePosition,
      offset,
    ]);
  
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

  const renderCleanCanvas = useCallback(
    async (resolution = 2) => {
      return renderCleanCanvasExport({
        vertices,
        segments,
        vertexAtoms,
        arrows,
        detectedRings,
        colors,
        isDarkMode,
        resolution,
      });
    },
    [vertices, segments, vertexAtoms, arrows, detectedRings, colors, isDarkMode]
  );

  // Drawing constants
  const hexRadius = 60; // Standard bond length (doubled from 30 to 60)
  const vertexThreshold = 15; // Distance for vertex detection
  const lineThreshold = 8; // Distance for line detection
  const mergeThreshold = 20; // Distance for vertex merging
  const snapAngleTolerance = 20 * (Math.PI / 180); // 20 degrees in radians
  const molecularBoundaryRadius = 60; // Radius around existing molecules to prevent new vertex creation (safe zone)
  
  // Common bond angles (in radians): 60°, 120°, 180°, 240°, 300°, 0° (rotated by +30° from previous)
  const snapAngles = [Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3, 0];

  // Helper functions for bond creation
  const calculateBondDirection = (x1, y1, x2, y2) => {
    return Math.atan2(y2 - y1, x2 - x1);
  };

  // Helper function to normalize angle to 0-2π range
  const normalizeAngle = (angle) => {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  };

  // Helper function to find the closest snap angle for a specific vertex
  const findClosestSnapAngle = (targetAngle, startVertex = null) => {
    const normalizedAngle = normalizeAngle(targetAngle);
    let closestAngle = null;
    let minDifference = Infinity;

    // Get valid angles for this vertex, or use general snap angles if no vertex specified
    const validAngles = startVertex ? getAvailableBondAngles(startVertex) : snapAngles;

    for (const snapAngle of validAngles) {
      // Calculate the difference, considering the circular nature of angles
      let diff = Math.abs(normalizedAngle - snapAngle);
      if (diff > Math.PI) {
        diff = 2 * Math.PI - diff;
      }

      if (diff < minDifference && diff <= snapAngleTolerance) {
        minDifference = diff;
        closestAngle = snapAngle;
      }
    }

    return closestAngle;
  };

  // Helper function to count bonds connected to a vertex
  const countVertexBonds = (vertex) => {
    return segments.filter(segment => {
      if (segment.bondOrder <= 0) return false; // Skip grid lines
      
      const distanceToStart = Math.sqrt(
        Math.pow(segment.x1 - vertex.x, 2) + 
        Math.pow(segment.y1 - vertex.y, 2)
      );
      const distanceToEnd = Math.sqrt(
        Math.pow(segment.x2 - vertex.x, 2) + 
        Math.pow(segment.y2 - vertex.y, 2)
      );
      
      return distanceToStart < 0.01 || distanceToEnd < 0.01;
    }).length;
  };

  // Helper function to check if angle snapping should be disabled
  const shouldDisableAngleSnapping = (startVertex) => {
    if (!startVertex) return false;
    return countVertexBonds(startVertex) >= 3; // Disable snapping for 4th bond
  };
  
  // Helper function to check if vertex has a triple bond (requires linear geometry)
  const hasTripleBond = (vertex) => {
    if (!vertex) return false;
    
    for (const segment of segments) {
      if (segment.bondOrder === 3) {
        const isConnected = (
          (Math.abs(segment.x1 - vertex.x) < 0.01 && Math.abs(segment.y1 - vertex.y) < 0.01) ||
          (Math.abs(segment.x2 - vertex.x) < 0.01 && Math.abs(segment.y2 - vertex.y) < 0.01)
        );
        if (isConnected) {
          return { hasTriple: true, bond: segment };
        }
      }
    }
    return { hasTriple: false };
  };
  
  // Helper function to get linear angle for triple bond (180° from existing bond)
  const getLinearAngle = (vertex, tripleBond) => {
    // Calculate the angle of the existing triple bond from this vertex
    let bondAngle;
    if (Math.abs(tripleBond.x1 - vertex.x) < 0.01 && Math.abs(tripleBond.y1 - vertex.y) < 0.01) {
      bondAngle = Math.atan2(tripleBond.y2 - tripleBond.y1, tripleBond.x2 - tripleBond.x1);
    } else {
      bondAngle = Math.atan2(tripleBond.y1 - tripleBond.y2, tripleBond.x1 - tripleBond.x2);
    }
    
    // Return 180° opposite angle
    return bondAngle + Math.PI;
  };

  // Helper function to get vertex key
  const getVertexKey = (vertex) => {
    return `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
  };

  // Helper function to normalize angle to nearest 60-degree increment (rotated by 30°)
  const normalizeToSixtyDegrees = (angle) => {
    const normalizedAngle = normalizeAngle(angle);
    // 60-degree increments rotated by 30°: 30°, 90°, 150°, 210°, 270°, 330°
    const sixtyDegreeIncrements = [Math.PI/6, Math.PI/2, 5*Math.PI/6, 7*Math.PI/6, 3*Math.PI/2, 11*Math.PI/6];
    
    let closestAngle = sixtyDegreeIncrements[0];
    let minDiff = Math.abs(normalizedAngle - closestAngle);
    
    for (const increment of sixtyDegreeIncrements) {
      let diff = Math.abs(normalizedAngle - increment);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      
      if (diff < minDiff) {
        minDiff = diff;
        closestAngle = increment;
      }
    }
    
    return closestAngle;
  };

  // Helper function to determine vertex orientation (30° or 90° based, rotated by 30°)
  const determineVertexOrientation = (existingAngles) => {
    if (existingAngles.length === 0) return null; // First bond can be any angle
    
    // Check if existing angles fit the 30°-based pattern (30°, 150°, 270°) - rotated from (0°, 120°, 240°)
    const thirtyBasedAngles = [Math.PI/6, 5*Math.PI/6, 3*Math.PI/2];
    // Check if existing angles fit the 90°-based pattern (90°, 210°, 330°) - rotated from (60°, 180°, 300°)
    const ninetyBasedAngles = [Math.PI/2, 7*Math.PI/6, 11*Math.PI/6];
    
    // Normalize existing angles to 60-degree increments
    const normalizedExisting = existingAngles.map(normalizeToSixtyDegrees);
    
    // Check which pattern the existing angles fit better
    let thirtyBasedScore = 0;
    let ninetyBasedScore = 0;
    
    for (const angle of normalizedExisting) {
      if (thirtyBasedAngles.includes(angle)) thirtyBasedScore++;
      if (ninetyBasedAngles.includes(angle)) ninetyBasedScore++;
    }
    
    return thirtyBasedScore >= ninetyBasedScore ? 'thirty-based' : 'ninety-based';
  };

  // Helper function to get valid angles for a vertex based on its orientation
  const getValidAnglesForVertex = (vertex) => {
    const vertexKey = getVertexKey(vertex);
    const bondState = vertexBondStates[vertexKey];
    
    if (!bondState || bondState.bondAngles.length === 0) {
      // First bond - can be any 60-degree increment (all rotated by 30°)
      return [Math.PI/6, Math.PI/2, 5*Math.PI/6, 7*Math.PI/6, 3*Math.PI/2, 11*Math.PI/6];
    }
    
    const orientation = bondState.orientation;
    if (orientation === 'thirty-based') {
      return [Math.PI/6, 5*Math.PI/6, 3*Math.PI/2]; // 30°, 150°, 270°
    } else {
      return [Math.PI/2, 7*Math.PI/6, 11*Math.PI/6]; // 90°, 210°, 330°
    }
  };

  // Helper function to update vertex bond state
  const updateVertexBondState = useCallback((vertex, bondAngle) => {
    const vertexKey = getVertexKey(vertex);
    const normalizedAngle = normalizeToSixtyDegrees(bondAngle);
    
    setVertexBondStates(prevStates => {
      const currentState = prevStates[vertexKey] || { bondAngles: [], orientation: null };
      const newBondAngles = [...currentState.bondAngles];
      
      // Add the new angle if it's not already present
      if (!newBondAngles.some(angle => Math.abs(angle - normalizedAngle) < 0.01)) {
        newBondAngles.push(normalizedAngle);
      }
      
      // Determine orientation if this is the first or second bond
      let orientation = currentState.orientation;
      if (!orientation && newBondAngles.length > 0) {
        orientation = determineVertexOrientation(newBondAngles);
      }
      
      return {
        ...prevStates,
        [vertexKey]: {
          bondAngles: newBondAngles,
          orientation: orientation
        }
      };
    });
  }, []);

  // Helper function to get available bond angles for a vertex
  const getAvailableBondAngles = (vertex) => {
    const vertexKey = getVertexKey(vertex);
    const bondState = vertexBondStates[vertexKey];
    const validAngles = getValidAnglesForVertex(vertex);
    
    if (!bondState) {
      return validAngles; // All angles available for new vertex
    }
    
    // Return angles that aren't already used
    return validAngles.filter(angle => 
      !bondState.bondAngles.some(usedAngle => Math.abs(angle - usedAngle) < 0.01)
    );
  };

  // Helper function to check if a position is within molecular boundary (too close to existing structure)
  const isWithinMolecularBoundary = (x, y) => {
    // Check distance to all existing vertices
    for (const vertex of vertices) {
      const distance = Math.sqrt(Math.pow(vertex.x - x, 2) + Math.pow(vertex.y - y, 2));
      if (distance <= molecularBoundaryRadius) {
        return true;
      }
    }
    
    // Check distance to all existing bonds (midpoints and along the bond)
    for (const bond of segments) {
      if (bond.bondOrder <= 0) continue; // Skip grid lines
      
      // Check distance to bond midpoint
      const midX = (bond.x1 + bond.x2) / 2;
      const midY = (bond.y1 + bond.y2) / 2;
      const midDistance = Math.sqrt(Math.pow(midX - x, 2) + Math.pow(midY - y, 2));
      
      if (midDistance <= molecularBoundaryRadius) {
        return true;
      }
      
      // Check distance to closest point on bond line
      const A = x - bond.x1;
      const B = y - bond.y1;
      const C = bond.x2 - bond.x1;
      const D = bond.y2 - bond.y1;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      
      if (lenSq > 0) {
        let param = dot / lenSq;
        if (param < 0) param = 0;
        else if (param > 1) param = 1;
        
        const closestX = bond.x1 + param * C;
        const closestY = bond.y1 + param * D;
        const bondDistance = Math.sqrt(Math.pow(closestX - x, 2) + Math.pow(closestY - y, 2));
        
        if (bondDistance <= molecularBoundaryRadius) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Helper function to find overlapping bond
  const findOverlappingBond = (startVertex, endVertex) => {
    const angleTolerance = 15 * (Math.PI / 180); // 15 degrees tolerance
    const newBondAngle = Math.atan2(endVertex.y - startVertex.y, endVertex.x - startVertex.x);
    
    // Check all existing bonds connected to the start vertex
    for (const bond of segments) {
      if (bond.bondOrder <= 0) continue; // Skip grid lines
      
      // Check if bond is connected to start vertex
      const isConnectedToStart = 
        (Math.abs(bond.x1 - startVertex.x) < 0.01 && Math.abs(bond.y1 - startVertex.y) < 0.01) ||
        (Math.abs(bond.x2 - startVertex.x) < 0.01 && Math.abs(bond.y2 - startVertex.y) < 0.01);
      
      if (!isConnectedToStart) continue;
      
      // Calculate the angle of the existing bond from the start vertex
      let existingBondAngle;
      if (Math.abs(bond.x1 - startVertex.x) < 0.01 && Math.abs(bond.y1 - startVertex.y) < 0.01) {
        existingBondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
      } else {
        existingBondAngle = Math.atan2(bond.y1 - bond.y2, bond.x1 - bond.x2);
      }
      
      // Calculate angular difference
      let angleDiff = Math.abs(newBondAngle - existingBondAngle);
      // Normalize to 0-π range
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      
      // If angles are very similar, this is an overlapping bond
      if (angleDiff < angleTolerance) {
        return bond;
      }
    }
    
    return null;
  };

  // Memoize ring detection to avoid recalculating on every render
  const detectedRingsMemo = React.useMemo(() => {
    return detectAllRingsEnhanced(segments, vertices);
  }, [segments, vertices]);
  
  // Update detectedRings state when memo changes
  React.useEffect(() => {
    setDetectedRings(detectedRingsMemo);
  }, [detectedRingsMemo]);
  
  // Helper function to manually trigger ring detection (for specific cases)
  const updateRingDetection = useCallback(() => {
    const rings = detectAllRingsEnhanced(segments, vertices);
    setDetectedRings(rings);
  }, [segments, vertices]);

  // Helper function to check if a bond is in any detected ring
  const isBondInRing = (bond) => {
    for (const ring of detectedRings) {
      if (ring.bonds) {
        const bondExists = ring.bonds.some(ringBond => {
          const tolerance = 0.01;
          return (
            Math.abs(ringBond.x1 - bond.x1) < tolerance &&
            Math.abs(ringBond.y1 - bond.y1) < tolerance &&
            Math.abs(ringBond.x2 - bond.x2) < tolerance &&
            Math.abs(ringBond.y2 - bond.y2) < tolerance
          ) || (
            Math.abs(ringBond.x1 - bond.x2) < tolerance &&
            Math.abs(ringBond.y1 - bond.y2) < tolerance &&
            Math.abs(ringBond.x2 - bond.x1) < tolerance &&
            Math.abs(ringBond.y2 - bond.y1) < tolerance
          );
        });
        
        if (bondExists) return ring;
      }
    }
    return null;
  };

  // Helper function to get interior direction for a ring bond
  const getRingInteriorDirection = (bond, ring) => {
    if (!ring || !ring.center) return null;
    
    const bondMidX = (bond.x1 + bond.x2) / 2;
    const bondMidY = (bond.y1 + bond.y2) / 2;
    
    return Math.atan2(
      ring.center.y - bondMidY,
      ring.center.x - bondMidX
    );
  };

  // Helper function to determine double bond rendering case
  const getDoubleBondRenderingCase = (bond) => {
    const startVertex = { x: bond.x1, y: bond.y1 };
    const endVertex = { x: bond.x2, y: bond.y2 };
    
    const startVertexBondCount = countVertexBonds(startVertex);
    const endVertexBondCount = countVertexBonds(endVertex);
    
    // Case 1: Both vertices have additional bonds (single + offset line)
    if (startVertexBondCount > 1 && endVertexBondCount > 1) {
      return 'single-plus-offset';
    }
    
    // Case 2: At least one vertex has no additional bonds (equal parallel lines)
    return 'equal-parallel';
  };

  // Helper function to render a double bond based on its case and ring status
  const renderDoubleBondByCase = (ctx, bond, offset, colors) => {
    // Check if bond is in a ring
    const ringInfo = isBondInRing(bond);
    
    if (ringInfo) {
      // Ring double bond - always render with interior offset
      const interiorDirection = getRingInteriorDirection(bond, ringInfo);
      const offsetDistance = 11; // Further from main line for better visibility
      
      const offsetX = Math.cos(interiorDirection) * offsetDistance;
      const offsetY = Math.sin(interiorDirection) * offsetDistance;
      
      // Draw main bond line
      ctx.strokeStyle = colors.bonds;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bond.x1 + offset.x, bond.y1 + offset.y);
      ctx.lineTo(bond.x2 + offset.x, bond.y2 + offset.y);
      ctx.stroke();
      
      // Draw interior offset line (slightly longer and further away)
      const bondLength = Math.sqrt(Math.pow(bond.x2 - bond.x1, 2) + Math.pow(bond.y2 - bond.y1, 2));
      const shorterLength = bondLength * 0.77; // Slightly longer (increased from 0.6 to 0.7)
      const centerX = (bond.x1 + bond.x2) / 2;
      const centerY = (bond.y1 + bond.y2) / 2;
      
      const bondUnitX = (bond.x2 - bond.x1) / bondLength;
      const bondUnitY = (bond.y2 - bond.y1) / bondLength;
      
      const shorterStartX = centerX - (bondUnitX * shorterLength / 2);
      const shorterStartY = centerY - (bondUnitY * shorterLength / 2);
      const shorterEndX = centerX + (bondUnitX * shorterLength / 2);
      const shorterEndY = centerY + (bondUnitY * shorterLength / 2);
      
      // Draw interior offset line
      ctx.beginPath();
      ctx.moveTo(shorterStartX + offsetX + offset.x, shorterStartY + offsetY + offset.y);
      ctx.lineTo(shorterEndX + offsetX + offset.x, shorterEndY + offsetY + offset.y);
      ctx.stroke();
      
    } else {
      // Non-ring double bond - use existing case logic
      const renderingCase = getDoubleBondRenderingCase(bond);
      
      if (renderingCase === 'equal-parallel') {
        // Case 2: Two parallel lines of equal length - slightly closer
        const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
        const perpAngle = bondAngle + Math.PI / 2;
        const offsetDistance = 5; // Reduced from 6 to 5 pixels (slightly closer)
        
        const offsetX = Math.cos(perpAngle) * offsetDistance;
        const offsetY = Math.sin(perpAngle) * offsetDistance;
        
        // Draw two equal parallel lines
        ctx.strokeStyle = colors.bonds;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // First line
        ctx.beginPath();
        ctx.moveTo(bond.x1 + offsetX + offset.x, bond.y1 + offsetY + offset.y);
        ctx.lineTo(bond.x2 + offsetX + offset.x, bond.y2 + offsetY + offset.y);
        ctx.stroke();
        
        // Second line
        ctx.beginPath();
        ctx.moveTo(bond.x1 - offsetX + offset.x, bond.y1 - offsetY + offset.y);
        ctx.lineTo(bond.x2 - offsetX + offset.x, bond.y2 - offsetY + offset.y);
        ctx.stroke();
        
      } else {
        // Case 1: Single bond + shorter offset line (matching ring style)
        const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
        const perpAngle = bondAngle + Math.PI / 2; // Default offset direction
        const offsetDistance = 11; // Match ring double bond style
        
        const offsetX = Math.cos(perpAngle) * offsetDistance;
        const offsetY = Math.sin(perpAngle) * offsetDistance;
        
        // Draw main bond line (same as single bond)
        ctx.strokeStyle = colors.bonds;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bond.x1 + offset.x, bond.y1 + offset.y);
        ctx.lineTo(bond.x2 + offset.x, bond.y2 + offset.y);
        ctx.stroke();
        
        // Calculate shorter line endpoints (matching ring style - 77% length, centered)
        const bondLength = Math.sqrt(Math.pow(bond.x2 - bond.x1, 2) + Math.pow(bond.y2 - bond.y1, 2));
        const shorterLength = bondLength * 0.77; // Match ring double bond style
        const centerX = (bond.x1 + bond.x2) / 2;
        const centerY = (bond.y1 + bond.y2) / 2;
        
        const bondUnitX = (bond.x2 - bond.x1) / bondLength;
        const bondUnitY = (bond.y2 - bond.y1) / bondLength;
        
        const shorterStartX = centerX - (bondUnitX * shorterLength / 2);
        const shorterStartY = centerY - (bondUnitY * shorterLength / 2);
        const shorterEndX = centerX + (bondUnitX * shorterLength / 2);
        const shorterEndY = centerY + (bondUnitY * shorterLength / 2);
        
        // Draw shorter offset line - same thickness as main line
        ctx.lineWidth = 3; // Same thickness as main line
        ctx.beginPath();
        ctx.moveTo(shorterStartX + offsetX + offset.x, shorterStartY + offsetY + offset.y);
        ctx.lineTo(shorterEndX + offsetX + offset.x, shorterEndY + offsetY + offset.y);
        ctx.stroke();
      }
    }
  };

  const findNearestVertex = (x, y) => {
    let nearestVertex = null;
    let minDistance = vertexThreshold;
    
    vertices.forEach(vertex => {
      const distance = Math.sqrt(Math.pow(vertex.x - (x - offset.x), 2) + Math.pow(vertex.y - (y - offset.y), 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestVertex = vertex;
      }
    });
    
    return nearestVertex;
  };

  // Helper function to find if mouse is over a bond
  const findHoveredBond = (x, y) => {
    const worldX = x - offset.x;
    const worldY = y - offset.y;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.bondOrder <= 0) continue; // Skip grid lines
      
      // Calculate distance from point to line segment
      const A = worldX - segment.x1;
      const B = worldY - segment.y1;
      const C = segment.x2 - segment.x1;
      const D = segment.y2 - segment.y1;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      
      if (lenSq === 0) continue; // Zero-length segment
      
      let param = dot / lenSq;
      
      // Clamp to segment bounds
      if (param < 0) param = 0;
      else if (param > 1) param = 1;
      
      const xx = segment.x1 + param * C;
      const yy = segment.y1 + param * D;
      
      const dx = worldX - xx;
      const dy = worldY - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= lineThreshold) {
        return i;
      }
    }
    
    return null;
  };

  // Helper function to find connected molecule (all vertices connected by bonds)
  const findMolecule = useCallback((startVertex) => {
    const moleculeVertices = new Set();
    const moleculeBonds = [];
    const queue = [startVertex];
    const visited = new Set();
    
    while (queue.length > 0) {
      const vertex = queue.shift();
      const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
      
      if (visited.has(vertexKey)) continue;
      visited.add(vertexKey);
      moleculeVertices.add(vertex);
      
      // Find all bonds connected to this vertex
      segments.forEach(seg => {
        if (seg.bondOrder <= 0) return; // Skip grid lines
        
        const isConnectedToStart = Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01;
        const isConnectedToEnd = Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01;
        
        if (isConnectedToStart || isConnectedToEnd) {
          if (!moleculeBonds.some(b => b === seg)) {
            moleculeBonds.push(seg);
          }
          
          // Add the other vertex to queue
          if (isConnectedToStart) {
            const otherVertex = vertices.find(v => 
              Math.abs(v.x - seg.x2) < 0.01 && Math.abs(v.y - seg.y2) < 0.01
            );
            if (otherVertex) queue.push(otherVertex);
          } else {
            const otherVertex = vertices.find(v => 
              Math.abs(v.x - seg.x1) < 0.01 && Math.abs(v.y - seg.y1) < 0.01
            );
            if (otherVertex) queue.push(otherVertex);
          }
        }
      });
    }
    
    return { vertices: Array.from(moleculeVertices), bonds: moleculeBonds };
  }, [vertices, segments]);

  // Helper function to check if a point is inside a molecule's bounding box
  const isPointInMolecule = useCallback((worldX, worldY, molecule) => {
    const threshold = 20; // Pixels
    return molecule.vertices.some(v => {
      const dist = Math.sqrt(Math.pow(v.x - worldX, 2) + Math.pow(v.y - worldY, 2));
      return dist <= threshold;
    });
  }, []);

  // Helper function to detect which part of arrow is clicked (start, end, or middle)
  const detectArrowPart = useCallback((x, y, arrowIndex) => {
    if (arrowIndex === null || arrowIndex < 0 || arrowIndex >= arrows.length) return null;
    
    const arrow = arrows[arrowIndex];
    const worldX = x - offset.x;
    const worldY = y - offset.y;
    const endpointThreshold = 25; // Large threshold for easy clicking on endpoints
    
    if (arrow.type === 'curved') {
      // Curved arrow - check control point FIRST, then start/end
      const midX = (arrow.x1 + arrow.x2) / 2;
      const midY = (arrow.y1 + arrow.y2) / 2;
      const dx = arrow.x2 - arrow.x1;
      const dy = arrow.y2 - arrow.y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // Perpendicular unit vector
        const perpX = -dy / distance;
        const perpY = dx / distance;
        
        // Calculate control offset (same logic as rendering)
        let controlOffset;
        if (arrow.controlOffset !== undefined) {
          controlOffset = arrow.controlOffset;
        } else {
          // Calculate default based on curve type
          let curveFactor = 0.5;
          if (arrow.curveType === 'curve0') curveFactor = 0.25;
          else if (arrow.curveType === 'curve1') curveFactor = 0.5;
          else if (arrow.curveType === 'curve2') curveFactor = 0.95;
          
          const curveSign = arrow.direction === 'cw' ? 1 : -1;
          controlOffset = distance * curveFactor * curveSign;
        }
        
        const controlX = midX + perpX * controlOffset;
        const controlY = midY + perpY * controlOffset;
        
        const controlDist = Math.sqrt(Math.pow(worldX - controlX, 2) + Math.pow(worldY - controlY, 2));
        
        // Check control point FIRST with higher priority
        if (controlDist <= endpointThreshold) {
          return 'control';
        }
      }
      
      // Then check endpoints
      const startDist = Math.sqrt(Math.pow(worldX - arrow.x1, 2) + Math.pow(worldY - arrow.y1, 2));
      const endDist = Math.sqrt(Math.pow(worldX - arrow.x2, 2) + Math.pow(worldY - arrow.y2, 2));
      
      if (startDist <= endpointThreshold) {
        return 'start';
      }
      if (endDist <= endpointThreshold) {
        return 'end';
      }
      
      return 'body';
    } else {
      // Straight arrow - check start and end
      const endX = arrow.x + arrow.length * Math.cos(arrow.angle);
      const endY = arrow.y + arrow.length * Math.sin(arrow.angle);
      
      const startDist = Math.sqrt(Math.pow(worldX - arrow.x, 2) + Math.pow(worldY - arrow.y, 2));
      const endDist = Math.sqrt(Math.pow(worldX - endX, 2) + Math.pow(worldY - endY, 2));
      
      if (startDist <= endpointThreshold) return 'start';
      if (endDist <= endpointThreshold) return 'end';
      return 'middle';
    }
  }, [arrows, offset]);

  // Helper function to find if mouse is over an arrow
  const findHoveredArrow = (x, y) => {
    const worldX = x - offset.x;
    const worldY = y - offset.y;
    const clickThreshold = 30; // Large threshold for easy clicking on arrows
    
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      
      // Handle curved arrows
      if (arrow.type === 'curved' || (arrow.type && arrow.type.startsWith('curve'))) {
        // For curved arrows, check if point is near the curve path
        // Check if near start or end point FIRST (most important)
        const startDist = Math.sqrt(Math.pow(worldX - arrow.x1, 2) + Math.pow(worldY - arrow.y1, 2));
        const endDist = Math.sqrt(Math.pow(worldX - arrow.x2, 2) + Math.pow(worldY - arrow.y2, 2));
        
        if (startDist <= clickThreshold || endDist <= clickThreshold) {
          return i;
        }
        
        // Check control point (middle of curve)
        const midX = (arrow.x1 + arrow.x2) / 2;
        const midY = (arrow.y1 + arrow.y2) / 2;
        const dx = arrow.x2 - arrow.x1;
        const dy = arrow.y2 - arrow.y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) continue;
        
        // Calculate control point position
        const perpX = -dy / distance;
        const perpY = dx / distance;
        
        let controlOffset;
        if (arrow.controlOffset !== undefined) {
          controlOffset = arrow.controlOffset;
        } else {
          let curveFactor = 0.5;
          if (arrow.curveType === 'curve0') curveFactor = 0.25;
          else if (arrow.curveType === 'curve1') curveFactor = 0.5;
          else if (arrow.curveType === 'curve2') curveFactor = 0.95;
          
          const curveSign = arrow.direction === 'cw' ? 1 : -1;
          controlOffset = distance * curveFactor * curveSign;
        }
        
        const controlX = midX + perpX * controlOffset;
        const controlY = midY + perpY * controlOffset;
        const controlDist = Math.sqrt(Math.pow(worldX - controlX, 2) + Math.pow(worldY - controlY, 2));
        
        if (controlDist <= clickThreshold) {
          return i;
        }
        
        // Also check along the curve path (use midpoint as approximation)
        const midDist = Math.sqrt(Math.pow(worldX - midX, 2) + Math.pow(worldY - midY, 2));
        if (midDist <= clickThreshold * 1.5) {
          return i;
        }
      } else {
        // For straight arrows (forward and equilibrium)
        const arrowEndX = arrow.x + arrow.length * Math.cos(arrow.angle);
        const arrowEndY = arrow.y + arrow.length * Math.sin(arrow.angle);
        
        // Calculate distance from point to line segment
        const A = worldX - arrow.x;
        const B = worldY - arrow.y;
        const C = arrowEndX - arrow.x;
        const D = arrowEndY - arrow.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) continue; // Zero-length arrow
        
        let param = dot / lenSq;
        
        // Clamp to segment bounds
        if (param < 0) param = 0;
        else if (param > 1) param = 1;
        
        const xx = arrow.x + param * C;
        const yy = arrow.y + param * D;
        
        const dx = worldX - xx;
        const dy = worldY - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= clickThreshold) {
          return i;
        }
      }
    }
    
    return null;
  };

  // Helper function to check if a suggested bond would overlap with existing bonds
  const wouldOverlapExistingBond = (suggestionStart, suggestionEnd) => {
    const suggestionAngle = Math.atan2(suggestionEnd.y - suggestionStart.y, suggestionEnd.x - suggestionStart.x);
    const normalizedSuggestionAngle = normalizeToSixtyDegrees(suggestionAngle);
    
    // Check all existing bonds for overlap
    for (const segment of segments) {
      if (segment.bondOrder <= 0) continue; // Skip grid lines
      
      // Check if this bond starts from the same vertex as our suggestion
      const startsFromSameVertex = (
        Math.abs(segment.x1 - suggestionStart.x) < 0.01 && 
        Math.abs(segment.y1 - suggestionStart.y) < 0.01
      ) || (
        Math.abs(segment.x2 - suggestionStart.x) < 0.01 && 
        Math.abs(segment.y2 - suggestionStart.y) < 0.01
      );
      
      if (startsFromSameVertex) {
        // Calculate the angle of this existing bond from the suggestion start point
        let existingBondAngle;
        if (Math.abs(segment.x1 - suggestionStart.x) < 0.01 && Math.abs(segment.y1 - suggestionStart.y) < 0.01) {
          existingBondAngle = Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1);
        } else {
          existingBondAngle = Math.atan2(segment.y1 - segment.y2, segment.x1 - segment.x2);
        }
        
        const normalizedExistingAngle = normalizeToSixtyDegrees(existingBondAngle);
        
        // If angles are the same (within tolerance), this would overlap
        if (Math.abs(normalizedSuggestionAngle - normalizedExistingAngle) < 0.01) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Helper function to generate bond suggestions at 120-degree angles (or 180° for triple bonds)
  const generateBondSuggestions = useCallback((lastBond) => {
    if (!lastBond) return [];

    const suggestions = [];
    
    // If the last bond IS a triple bond, generate linear suggestions only
    if (lastBond.bondOrder === 3) {
      // Triple bond requires linear geometry - only show 180° suggestions
      const bondAngle = Math.atan2(lastBond.y2 - lastBond.y1, lastBond.x2 - lastBond.x1);
      const startVertex = { x: lastBond.x1, y: lastBond.y1 };
      const endVertex = { x: lastBond.x2, y: lastBond.y2 };
      const startVertexBondCount = countVertexBonds(startVertex);
      const endVertexBondCount = countVertexBonds(endVertex);
      
      // Linear suggestion from END vertex (only one, at 180°)
      if (endVertexBondCount < 2) {
        const linearAngle = bondAngle; // Same direction as triple bond
        const endSuggestion = {
          x: lastBond.x2 + Math.cos(linearAngle) * hexRadius,
          y: lastBond.y2 + Math.sin(linearAngle) * hexRadius
        };
        
        suggestions.push({
          id: 'end-linear',
          x1: lastBond.x2,
          y1: lastBond.y2,
          x2: endSuggestion.x,
          y2: endSuggestion.y,
          angle: linearAngle,
          fromVertex: { x: lastBond.x2, y: lastBond.y2 }
        });
      }
      
      // Linear suggestion from START vertex (only one, at 180°)
      if (startVertexBondCount < 2) {
        const linearAngle = bondAngle + Math.PI; // Opposite direction
        const startSuggestion = {
          x: lastBond.x1 + Math.cos(linearAngle) * hexRadius,
          y: lastBond.y1 + Math.sin(linearAngle) * hexRadius
        };
        
        suggestions.push({
          id: 'start-linear',
          x1: lastBond.x1,
          y1: lastBond.y1,
          x2: startSuggestion.x,
          y2: startSuggestion.y,
          angle: linearAngle,
          fromVertex: { x: lastBond.x1, y: lastBond.y1 }
        });
      }
      
      return suggestions; // Return early for triple bonds
    }
    
    // Normal bond (not triple) - continue with regular logic
    const bondAngle = Math.atan2(lastBond.y2 - lastBond.y1, lastBond.x2 - lastBond.x1);
    
    // Check bond counts for both vertices
    const startVertex = { x: lastBond.x1, y: lastBond.y1 };
    const endVertex = { x: lastBond.x2, y: lastBond.y2 };
    const startVertexBondCount = countVertexBonds(startVertex);
    const endVertexBondCount = countVertexBonds(endVertex);
    
    // Check if either vertex has a triple bond (requires linear geometry)
    const endHasTriple = hasTripleBond(endVertex);
    const startHasTriple = hasTripleBond(startVertex);
    
    // Generate suggestions from the END vertex (x2, y2) - only if it has fewer than 3 bonds
    // Skip if this end connects to a triple bond (use linear geometry from other end)
    if (endVertexBondCount < 3 && !endHasTriple.hasTriple) {
        // Normal 120° suggestions
      const availableEndAngles = getAvailableBondAngles(endVertex);
      
      // Generate suggestions at 120-degree separation from the bond (±60° from bond angle)
      const endSuggestion1Angle = bondAngle + (Math.PI / 3); // +60 degrees from bond angle
      const endSuggestion2Angle = bondAngle - (Math.PI / 3); // -60 degrees from bond angle
      
      // Check if these angles are available for this vertex
      const endSuggestion1Normalized = normalizeToSixtyDegrees(endSuggestion1Angle);
      const endSuggestion2Normalized = normalizeToSixtyDegrees(endSuggestion2Angle);
      
      if (availableEndAngles.some(angle => Math.abs(angle - endSuggestion1Normalized) < 0.01)) {
        const endSuggestion1End = {
          x: lastBond.x2 + Math.cos(endSuggestion1Angle) * hexRadius,
          y: lastBond.y2 + Math.sin(endSuggestion1Angle) * hexRadius
        };
        
        if (!wouldOverlapExistingBond(endVertex, endSuggestion1End)) {
          suggestions.push({
            id: 'end-suggestion1',
            x1: lastBond.x2,
            y1: lastBond.y2,
            x2: endSuggestion1End.x,
            y2: endSuggestion1End.y,
            angle: endSuggestion1Angle,
            fromVertex: { x: lastBond.x2, y: lastBond.y2 }
          });
        }
      }
      
      if (availableEndAngles.some(angle => Math.abs(angle - endSuggestion2Normalized) < 0.01)) {
        const endSuggestion2End = {
          x: lastBond.x2 + Math.cos(endSuggestion2Angle) * hexRadius,
          y: lastBond.y2 + Math.sin(endSuggestion2Angle) * hexRadius
        };
        
        if (!wouldOverlapExistingBond(endVertex, endSuggestion2End)) {
          suggestions.push({
            id: 'end-suggestion2',
            x1: lastBond.x2,
            y1: lastBond.y2,
            x2: endSuggestion2End.x,
            y2: endSuggestion2End.y,
            angle: endSuggestion2Angle,
            fromVertex: { x: lastBond.x2, y: lastBond.y2 }
          });
        }
      }
    }
    
    // Generate suggestions from the START vertex (x1, y1) - only if it has fewer than 3 bonds
    // Skip if this end connects to a triple bond (use linear geometry from other end)
    if (startVertexBondCount < 3 && !startHasTriple.hasTriple) {
        // Normal 120° suggestions
      const availableStartAngles = getAvailableBondAngles(startVertex);
      
      // The bond angle from start vertex perspective is opposite
      const startBondAngle = bondAngle + Math.PI; // Reverse direction
      const startSuggestion1Angle = startBondAngle + (Math.PI / 3); // +60 degrees from reversed bond angle
      const startSuggestion2Angle = startBondAngle - (Math.PI / 3); // -60 degrees from reversed bond angle
      
      // Check if these angles are available for this vertex
      const startSuggestion1Normalized = normalizeToSixtyDegrees(startSuggestion1Angle);
      const startSuggestion2Normalized = normalizeToSixtyDegrees(startSuggestion2Angle);
      
      if (availableStartAngles.some(angle => Math.abs(angle - startSuggestion1Normalized) < 0.01)) {
        const startSuggestion1End = {
          x: lastBond.x1 + Math.cos(startSuggestion1Angle) * hexRadius,
          y: lastBond.y1 + Math.sin(startSuggestion1Angle) * hexRadius
        };
        
        if (!wouldOverlapExistingBond(startVertex, startSuggestion1End)) {
          suggestions.push({
            id: 'start-suggestion1',
            x1: lastBond.x1,
            y1: lastBond.y1,
            x2: startSuggestion1End.x,
            y2: startSuggestion1End.y,
            angle: startSuggestion1Angle,
            fromVertex: { x: lastBond.x1, y: lastBond.y1 }
          });
        }
      }
      
      if (availableStartAngles.some(angle => Math.abs(angle - startSuggestion2Normalized) < 0.01)) {
        const startSuggestion2End = {
          x: lastBond.x1 + Math.cos(startSuggestion2Angle) * hexRadius,
          y: lastBond.y1 + Math.sin(startSuggestion2Angle) * hexRadius
        };
        
        if (!wouldOverlapExistingBond(startVertex, startSuggestion2End)) {
          suggestions.push({
            id: 'start-suggestion2',
            x1: lastBond.x1,
            y1: lastBond.y1,
            x2: startSuggestion2End.x,
            y2: startSuggestion2End.y,
            angle: startSuggestion2Angle,
            fromVertex: { x: lastBond.x1, y: lastBond.y1 }
          });
        }
      }
    }
    
    return suggestions;
  }, [hexRadius, segments, countVertexBonds, getAvailableBondAngles, normalizeToSixtyDegrees]);

  // Helper function to check if mouse is over a bond suggestion
  const findHoveredSuggestion = (x, y) => {
    const worldX = x - offset.x;
    const worldY = y - offset.y;
    
    for (let i = 0; i < bondSuggestions.length; i++) {
      const suggestion = bondSuggestions[i];
      
      // Calculate distance from point to line segment
      const A = worldX - suggestion.x1;
      const B = worldY - suggestion.y1;
      const C = suggestion.x2 - suggestion.x1;
      const D = suggestion.y2 - suggestion.y1;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      
      if (lenSq === 0) continue;
      
      let param = dot / lenSq;
      if (param < 0) param = 0;
      else if (param > 1) param = 1;
      
      const xx = suggestion.x1 + param * C;
      const yy = suggestion.y1 + param * D;
      
      const dx = worldX - xx;
      const dy = worldY - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= lineThreshold) {
        return i;
      }
    }
    
    return null;
  };

  // Helper function to find vertices that should be merged
  const findVerticesToMerge = useCallback(() => {
    const mergeOperations = [];
    
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const vertex1 = vertices[i];
        const vertex2 = vertices[j];
        
        const distance = Math.sqrt(
          Math.pow(vertex1.x - vertex2.x, 2) + 
          Math.pow(vertex1.y - vertex2.y, 2)
        );
        
        if (distance <= mergeThreshold) {
          mergeOperations.push({
            vertex1Index: i,
            vertex2Index: j,
            vertex1,
            vertex2,
            distance
          });
        }
      }
    }
    
    return mergeOperations;
  }, [vertices, mergeThreshold]);

  // Helper function to perform vertex merging
  const performVertexMerge = useCallback((mergeOperation) => {
    const { vertex1Index, vertex2Index, vertex1, vertex2 } = mergeOperation;
    
    // Calculate merged position (average of the two vertices)
    const mergedVertex = {
      x: (vertex1.x + vertex2.x) / 2,
      y: (vertex1.y + vertex2.y) / 2,
      isOffGrid: vertex1.isOffGrid || vertex2.isOffGrid // Keep off-grid status if either is off-grid
    };
    
    // Update vertices array - remove both old vertices and add merged one
    setVertices(prevVertices => {
      const newVertices = [...prevVertices];
      // Remove vertices in reverse order to maintain indices
      if (vertex2Index > vertex1Index) {
        newVertices.splice(vertex2Index, 1);
        newVertices.splice(vertex1Index, 1);
      } else {
        newVertices.splice(vertex1Index, 1);
        newVertices.splice(vertex2Index, 1);
      }
      newVertices.push(mergedVertex);
      return newVertices;
    });
    
    // Update all segments that reference the old vertices
    setSegments(prevSegments => {
      return prevSegments.map(segment => {
        let updatedSegment = { ...segment };
        
        // Check if segment uses vertex1
        if (Math.abs(segment.x1 - vertex1.x) < 0.01 && Math.abs(segment.y1 - vertex1.y) < 0.01) {
          updatedSegment.x1 = mergedVertex.x;
          updatedSegment.y1 = mergedVertex.y;
        }
        if (Math.abs(segment.x2 - vertex1.x) < 0.01 && Math.abs(segment.y2 - vertex1.y) < 0.01) {
          updatedSegment.x2 = mergedVertex.x;
          updatedSegment.y2 = mergedVertex.y;
        }
        
        // Check if segment uses vertex2
        if (Math.abs(segment.x1 - vertex2.x) < 0.01 && Math.abs(segment.y1 - vertex2.y) < 0.01) {
          updatedSegment.x1 = mergedVertex.x;
          updatedSegment.y1 = mergedVertex.y;
        }
        if (Math.abs(segment.x2 - vertex2.x) < 0.01 && Math.abs(segment.y2 - vertex2.y) < 0.01) {
          updatedSegment.x2 = mergedVertex.x;
          updatedSegment.y2 = mergedVertex.y;
        }
        
        // Recalculate bond direction if endpoints changed
        if (updatedSegment.x1 !== segment.x1 || updatedSegment.y1 !== segment.y1 || 
            updatedSegment.x2 !== segment.x2 || updatedSegment.y2 !== segment.y2) {
          updatedSegment.direction = calculateBondDirection(
            updatedSegment.x1, updatedSegment.y1, 
            updatedSegment.x2, updatedSegment.y2
          );
        }
        
        return updatedSegment;
      });
    });
    
    // Update vertex atoms if they exist for the merged vertices
    setVertexAtoms(prevAtoms => {
      const newAtoms = { ...prevAtoms };
      const vertex1Key = `${vertex1.x.toFixed(2)},${vertex1.y.toFixed(2)}`;
      const vertex2Key = `${vertex2.x.toFixed(2)},${vertex2.y.toFixed(2)}`;
      const mergedKey = `${mergedVertex.x.toFixed(2)},${mergedVertex.y.toFixed(2)}`;
      
      // If either vertex had atom data, preserve it for the merged vertex
      if (newAtoms[vertex1Key] || newAtoms[vertex2Key]) {
        newAtoms[mergedKey] = newAtoms[vertex1Key] || newAtoms[vertex2Key];
      }
      
      // Remove old atom data
      delete newAtoms[vertex1Key];
      delete newAtoms[vertex2Key];
      
      return newAtoms;
    });
  }, [calculateBondDirection]);

  // Function to check and perform vertex merging
  const checkAndPerformVertexMerging = useCallback(() => {
    const mergeOperations = findVerticesToMerge();
    
    // Perform merging operations (limit to one at a time to avoid conflicts)
    if (mergeOperations.length > 0) {
      // Sort by distance and merge the closest pair first
      mergeOperations.sort((a, b) => a.distance - b.distance);
      performVertexMerge(mergeOperations[0]);
    }
  }, [findVerticesToMerge, performVertexMerge]);

  // Canvas click handler for all modes
  const handleCanvasClick = useCallback((event) => {
    // Handle text mode clicks
    if (mode === 'text') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const clickPosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      
      // Check if clicking on existing vertex first
      const clickedVertex = findNearestVertex(clickPosition.x, clickPosition.y);
      if (clickedVertex) {
        // Open text input for existing vertex
        const success = handleEnterKeyOnVertex(
          clickedVertex,
          clickPosition,
          {
            setShowAtomInput,
            setAtomInputPosition,
            setAtomInputValue,
            setMenuVertexKey
          }
        );
        return;
      }
      
      // Create new vertex with text input
      const success = handleTextButtonClick(
        clickPosition,
        offset,
        { vertices, molecularBoundaryRadius },
        {
          setVertices,
          setShowAtomInput,
          setAtomInputPosition,
          setAtomInputValue,
          setMenuVertexKey
        }
      );
      return;
    }

    // Handle mouse/selection mode clicks
    if (mode === 'mouse') {
      // Skip if we just completed a selection box
      if (justCompletedSelection) {
        setJustCompletedSelection(false);
        return;
      }
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Handle paste preview mode - place the copied items
      if (isPastePreviewMode && clipboard) {
        // Calculate center of clipboard items
        let totalX = 0, totalY = 0, count = 0;
        clipboard.molecules.forEach(mol => {
          mol.vertices.forEach(v => {
            totalX += v.x;
            totalY += v.y;
            count++;
          });
        });
        clipboard.arrows.forEach(arrow => {
          if (arrow.type === 'curved') {
            totalX += arrow.x1;
            totalY += arrow.y1;
            count++;
          } else {
            totalX += arrow.x;
            totalY += arrow.y;
            count++;
          }
        });
        
        if (count > 0) {
          const centerX = totalX / count;
          const centerY = totalY / count;
          
          // Place at current mouse position
          const offsetX = worldX - centerX;
          const offsetY = worldY - centerY;
          
          saveToHistory(); // Save before pasting
          
          // Paste molecules
          clipboard.molecules.forEach(mol => {
            const newVertices = mol.vertices.map(v => ({
              x: v.x + offsetX,
              y: v.y + offsetY,
              isOffGrid: v.isOffGrid
            }));
            
            const newBonds = mol.bonds.map(b => ({
              ...b,
              x1: b.x1 + offsetX,
              y1: b.y1 + offsetY,
              x2: b.x2 + offsetX,
              y2: b.y2 + offsetY
            }));
            
            setVertices(prev => [...prev, ...newVertices]);
            setSegments(prev => [...prev, ...newBonds]);
            
            // Paste atoms
            Object.keys(mol.atoms).forEach(oldKey => {
              const [xStr, yStr] = oldKey.split(',');
              const newKey = `${(parseFloat(xStr) + offsetX).toFixed(2)},${(parseFloat(yStr) + offsetY).toFixed(2)}`;
              setVertexAtoms(prev => ({
                ...prev,
                [newKey]: mol.atoms[oldKey]
              }));
            });
            
            // Paste bond states
            Object.keys(mol.bondStates || {}).forEach(oldKey => {
              const [xStr, yStr] = oldKey.split(',');
              const newKey = `${(parseFloat(xStr) + offsetX).toFixed(2)},${(parseFloat(yStr) + offsetY).toFixed(2)}`;
              setVertexBondStates(prev => ({
                ...prev,
                [newKey]: mol.bondStates[oldKey]
              }));
            });
          });
          
          // Paste arrows
          clipboard.arrows.forEach(arrow => {
            const newArrow = {
              ...arrow,
              x: arrow.x !== undefined ? arrow.x + offsetX : arrow.x,
              y: arrow.y !== undefined ? arrow.y + offsetY : arrow.y,
              x1: arrow.x1 !== undefined ? arrow.x1 + offsetX : arrow.x1,
              y1: arrow.y1 !== undefined ? arrow.y1 + offsetY : arrow.y1,
              x2: arrow.x2 !== undefined ? arrow.x2 + offsetX : arrow.x2,
              y2: arrow.y2 !== undefined ? arrow.y2 + offsetY : arrow.y2
            };
            setArrows(prev => [...prev, newArrow]);
          });
          
          setTimeout(() => updateRingDetection(), 10);
        }
        
        // Exit paste preview mode
        setIsPastePreviewMode(false);
        return;
      }
      
      // Check if clicking on an arrow first
      const clickedArrowIndex = findHoveredArrow(x, y);
      if (clickedArrowIndex !== null) {
        // Select this arrow
        setSelectedArrows(new Set([clickedArrowIndex]));
        setSelectedMolecules([]);
        setSelectedVertices(new Set());
        setSelectedSegments(new Set());
        return;
      }
      
      // Check if clicking on a vertex/molecule
      const clickedVertex = findNearestVertex(x, y);
      if (clickedVertex) {
        // Find the entire molecule this vertex belongs to
        const molecule = findMolecule(clickedVertex);
        setSelectedMolecules([molecule]);
        
        // Convert to sets for compatibility
        const vertexSet = new Set();
        molecule.vertices.forEach(v => {
          vertexSet.add(`${v.x.toFixed(2)},${v.y.toFixed(2)}`);
        });
        setSelectedVertices(vertexSet);
        
        const bondSet = new Set();
        molecule.bonds.forEach((bond, idx) => {
          const bondIdx = segments.indexOf(bond);
          if (bondIdx !== -1) bondSet.add(bondIdx);
        });
        setSelectedSegments(bondSet);
        setSelectedArrows(new Set());
        return;
      }
      
      // If clicking on empty space, clear selections
      setSelectedMolecules([]);
      setSelectedVertices(new Set());
      setSelectedSegments(new Set());
      setSelectedArrows(new Set());
      return;
    }

    // Handle charge and lone pair mode clicks
    if (mode === 'plus' || mode === 'minus' || mode === 'lone') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Find the nearest vertex
      const clickedVertex = findNearestVertex(x, y);
      if (clickedVertex) {
        const vertexKey = `${clickedVertex.x.toFixed(2)},${clickedVertex.y.toFixed(2)}`;
        
        saveToHistory(); // Save before modifying charges/lone pairs
        setVertexAtoms(prev => {
          const prevVal = prev[vertexKey] || { 
            symbol: 'C', 
            charge: 0, 
            implicitH: 0, 
            lonePairs: 0 
          };
          
          if (mode === 'plus') {
            // Toggle +1 charge (cycle: 0 -> +1 -> 0)
            const charge = prevVal.charge === 1 ? 0 : 1;
            return { ...prev, [vertexKey]: { ...prevVal, charge } };
          } else if (mode === 'minus') {
            // Toggle -1 charge (cycle: 0 -> -1 -> 0)
            const charge = prevVal.charge === -1 ? 0 : -1;
            return { ...prev, [vertexKey]: { ...prevVal, charge } };
          } else if (mode === 'lone') {
            // Increment lone pairs count (cycle: 0 -> 1 -> 2 -> ... -> 8 -> 0)
            // Each click adds one electron dot
            const lonePairs = ((prevVal.lonePairs || 0) + 1) % 9;
            return { ...prev, [vertexKey]: { ...prevVal, lonePairs } };
          }
          return prev;
        });
        
        // Clear bond suggestions when modifying charges/lone pairs
        setBondSuggestions([]);
      }
      return;
    }

    // Handle erase mode clicks
    if (mode === 'erase') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to world coordinates
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Priority 1: Check if clicking on a vertex
      const clickedVertex = findNearestVertex(x, y);
      if (clickedVertex) {
        const vertexKey = `${clickedVertex.x.toFixed(2)},${clickedVertex.y.toFixed(2)}`;
        
        saveToHistory(); // Save before erasing
        // Remove the vertex
        setVertices(prev => prev.filter(v => 
          !(Math.abs(v.x - clickedVertex.x) < 0.01 && Math.abs(v.y - clickedVertex.y) < 0.01)
        ));
        
        // Remove any bonds connected to this vertex
        setSegments(prev => prev.filter(seg => {
          const isConnected = (
            (Math.abs(seg.x1 - clickedVertex.x) < 0.01 && Math.abs(seg.y1 - clickedVertex.y) < 0.01) ||
            (Math.abs(seg.x2 - clickedVertex.x) < 0.01 && Math.abs(seg.y2 - clickedVertex.y) < 0.01)
          );
          return !isConnected;
        }));
        
        // Remove vertex atom data
        setVertexAtoms(prev => {
          const newAtoms = { ...prev };
          delete newAtoms[vertexKey];
          return newAtoms;
        });
        
        // Clear bond suggestions
        setBondSuggestions([]);
        
        // Update ring detection
        setTimeout(() => updateRingDetection(), 10);
        
        return;
      }
      
      // Priority 2: Check if clicking on a bond
      const clickedBondIndex = findHoveredBond(x, y);
      if (clickedBondIndex !== null) {
        // Remove the bond
        setSegments(prev => prev.filter((_, index) => index !== clickedBondIndex));
        
        // Clear bond suggestions
        setBondSuggestions([]);
        
        // Update ring detection
        setTimeout(() => updateRingDetection(), 10);
        
        return;
      }
      
      // Priority 3: Check if clicking on an arrow
      const clickedArrowIndex = findHoveredArrow(x, y);
      if (clickedArrowIndex !== null) {
        // Remove the arrow
        setArrows(prev => prev.filter((_, index) => index !== clickedArrowIndex));
        return;
      }
      
      return;
    }

    // Handle arrow mode clicks
    if (mode === 'arrow') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to world coordinates
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Create a forward arrow at click position
      const arrowLength = 80; // Length of the arrow
      const newArrow = {
        x: worldX,
        y: worldY,
        type: 'forward', // Straight forward arrow pointing right
        length: arrowLength,
        angle: 0 // Points to the right (0 degrees)
      };
      
      saveToHistory(); // Save before placing arrow
      setArrows(prev => [...prev, newArrow]);
      
      // Clear bond suggestions when placing arrow
      setBondSuggestions([]);
      return;
    }

    // Handle equilibrium arrow mode clicks
    if (mode === 'equil') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to world coordinates
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Create an equilibrium arrow at click position
      const arrowLength = 80;
      const newArrow = {
        x: worldX,
        y: worldY,
        type: 'equilibrium',
        length: arrowLength,
        angle: 0 // Points to the right (0 degrees)
      };
      
      saveToHistory(); // Save before placing equilibrium arrow
      setArrows(prev => [...prev, newArrow]);
      
      // Clear bond suggestions when placing arrow
      setBondSuggestions([]);
      return;
    }
    
    // Handle curved arrow mode clicks (two-click system)
    if (mode === 'curve0' || mode === 'curve1' || mode === 'curve2' || 
        mode === 'curve3' || mode === 'curve4' || mode === 'curve5') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to world coordinates
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      if (!curvedArrowStartPoint) {
        // First click: set start point
        setCurvedArrowStartPoint({ x: worldX, y: worldY });
      } else {
        // Second click: create curved arrow
        saveToHistory(); // Save before creating curved arrow
        const newArrow = {
          x1: curvedArrowStartPoint.x,
          y1: curvedArrowStartPoint.y,
          x2: worldX,
          y2: worldY,
          type: 'curved',
          curveType: mode, // curve0, curve1, curve2, curve3, curve4, or curve5
          direction: (mode === 'curve0' || mode === 'curve1' || mode === 'curve2') ? 'ccw' : 'cw' // Swapped
        };
        
        setArrows(prev => [...prev, newArrow]);
        setCurvedArrowStartPoint(null); // Reset for next arrow
        
        // Clear bond suggestions when placing curved arrow
        setBondSuggestions([]);
      }
      return;
    }

    // Handle benzene mode clicks
    if (mode === 'benzene') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to world coordinates
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Check for snap target
      const snapInfo = calculateBenzeneSnap({ x: worldX, y: worldY }, vertices, segments, hexRadius);
      
      // Use snap position if available, otherwise use mouse position
      const centerX = snapInfo ? snapInfo.center.x : worldX;
      const centerY = snapInfo ? snapInfo.center.y : worldY;
      
      // Generate benzene ring centered at calculated position
      const benzeneRadius = hexRadius; // Use standard bond length as radius
      const benzeneVertices = [];
      const benzeneBonds = [];
      
      // Create 6 vertices in hexagon arrangement
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 6) + (i * Math.PI / 3); // Start at 30° and go around
        const vx = centerX + Math.cos(angle) * benzeneRadius;
        const vy = centerY + Math.sin(angle) * benzeneRadius;
        benzeneVertices.push({ x: vx, y: vy, isOffGrid: false });
      }
      
      // Create 6 bonds connecting the vertices (alternating single/double)
      for (let i = 0; i < 6; i++) {
        const nextIndex = (i + 1) % 6;
        const bondOrder = (i % 2 === 0) ? 2 : 1; // Alternating double/single bonds
        
        benzeneBonds.push({
          x1: benzeneVertices[i].x,
          y1: benzeneVertices[i].y,
          x2: benzeneVertices[nextIndex].x,
          y2: benzeneVertices[nextIndex].y,
          bondOrder: bondOrder,
          bondType: null,
          bondDirection: 1,
          direction: calculateBondDirection(
            benzeneVertices[i].x, benzeneVertices[i].y,
            benzeneVertices[nextIndex].x, benzeneVertices[nextIndex].y
          ),
          flipSmallerLine: false
        });
      }
      
      // Add all vertices and bonds to state
      saveToHistory(); // Save before placing benzene ring
      setVertices(prev => [...prev, ...benzeneVertices]);
      setSegments(prev => [...prev, ...benzeneBonds]);
      
      // Update ring detection after adding benzene
      setTimeout(() => {
        updateRingDetection();
      }, 0);
      
      // Don't clear mode - allow multiple benzene placements
      
      return;
    }
    
    // Handle cyclohexane mode clicks (6-member ring, all single bonds)
    if (mode === 'cyclohexane') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      const snapInfo = calculateRingSnap({ x: worldX, y: worldY }, vertices, segments, hexRadius, 6);
      const centerX = snapInfo ? snapInfo.center.x : worldX;
      const centerY = snapInfo ? snapInfo.center.y : worldY;
      const rotationOffset = snapInfo?.rotation || 0;
      
      const ringVertices = [];
      const ringBonds = [];
      
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 6) + (i * Math.PI / 3) + rotationOffset;
        ringVertices.push({ 
          x: centerX + Math.cos(angle) * hexRadius, 
          y: centerY + Math.sin(angle) * hexRadius, 
          isOffGrid: false 
        });
      }
      
      for (let i = 0; i < 6; i++) {
        const nextIndex = (i + 1) % 6;
        ringBonds.push({
          x1: ringVertices[i].x, y1: ringVertices[i].y,
          x2: ringVertices[nextIndex].x, y2: ringVertices[nextIndex].y,
          bondOrder: 1, // All single bonds
          bondType: null, bondDirection: 1,
          direction: calculateBondDirection(ringVertices[i].x, ringVertices[i].y, ringVertices[nextIndex].x, ringVertices[nextIndex].y),
          flipSmallerLine: false
        });
      }
      
      saveToHistory(); // Save before placing cyclohexane ring
      setVertices(prev => [...prev, ...ringVertices]);
      setSegments(prev => [...prev, ...ringBonds]);
      setTimeout(() => updateRingDetection(), 0);
      return;
    }
    
    // Handle cyclopentane mode clicks (5-member pentagon)
    if (mode === 'cyclopentane') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      const pentagonRadius = hexRadius / (2 * Math.sin(Math.PI / 5));
      const snapInfo = calculateRingSnap({ x: worldX, y: worldY }, vertices, segments, pentagonRadius, 5);
      const centerX = snapInfo ? snapInfo.center.x : worldX;
      const centerY = snapInfo ? snapInfo.center.y : worldY;
      const rotationOffset = snapInfo?.rotation || 0;
      
      const ringVertices = [];
      const ringBonds = [];
      
      for (let i = 0; i < 5; i++) {
        const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 5) + rotationOffset;
        ringVertices.push({ 
          x: centerX + Math.cos(angle) * pentagonRadius, 
          y: centerY + Math.sin(angle) * pentagonRadius, 
          isOffGrid: true 
        });
      }
      
      for (let i = 0; i < 5; i++) {
        const nextIndex = (i + 1) % 5;
        ringBonds.push({
          x1: ringVertices[i].x, y1: ringVertices[i].y,
          x2: ringVertices[nextIndex].x, y2: ringVertices[nextIndex].y,
          bondOrder: 1,
          bondType: null, bondDirection: 1,
          direction: calculateBondDirection(ringVertices[i].x, ringVertices[i].y, ringVertices[nextIndex].x, ringVertices[nextIndex].y),
          flipSmallerLine: false
        });
      }
      
      saveToHistory(); // Save before placing cyclopentane ring
      setVertices(prev => [...prev, ...ringVertices]);
      setSegments(prev => [...prev, ...ringBonds]);
      setTimeout(() => updateRingDetection(), 0);
      return;
    }
    
    // Handle cyclobutane mode clicks (4-member square)
    if (mode === 'cyclobutane') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      const squareRadius = hexRadius / (2 * Math.sin(Math.PI / 4));
      const snapInfo = calculateRingSnap({ x: worldX, y: worldY }, vertices, segments, squareRadius, 4);
      const centerX = snapInfo ? snapInfo.center.x : worldX;
      const centerY = snapInfo ? snapInfo.center.y : worldY;
      const rotationOffset = snapInfo?.rotation || 0;
      
      const ringVertices = [];
      const ringBonds = [];
      
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 4) + (i * Math.PI / 2) + rotationOffset;
        ringVertices.push({ 
          x: centerX + Math.cos(angle) * squareRadius, 
          y: centerY + Math.sin(angle) * squareRadius, 
          isOffGrid: true 
        });
      }
      
      for (let i = 0; i < 4; i++) {
        const nextIndex = (i + 1) % 4;
        ringBonds.push({
          x1: ringVertices[i].x, y1: ringVertices[i].y,
          x2: ringVertices[nextIndex].x, y2: ringVertices[nextIndex].y,
          bondOrder: 1,
          bondType: null, bondDirection: 1,
          direction: calculateBondDirection(ringVertices[i].x, ringVertices[i].y, ringVertices[nextIndex].x, ringVertices[nextIndex].y),
          flipSmallerLine: false
        });
      }
      
      saveToHistory(); // Save before placing cyclobutane ring
      setVertices(prev => [...prev, ...ringVertices]);
      setSegments(prev => [...prev, ...ringBonds]);
      setTimeout(() => updateRingDetection(), 0);
      return;
    }
    
    // Handle cyclopropane mode clicks (3-member triangle)
    if (mode === 'cyclopropane') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      const triangleRadius = hexRadius / (2 * Math.sin(Math.PI / 3));
      const snapInfo = calculateRingSnap({ x: worldX, y: worldY }, vertices, segments, triangleRadius, 3);
      const centerX = snapInfo ? snapInfo.center.x : worldX;
      const centerY = snapInfo ? snapInfo.center.y : worldY;
      const rotationOffset = snapInfo?.rotation || 0;
      
      const ringVertices = [];
      const ringBonds = [];
      
      for (let i = 0; i < 3; i++) {
        const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 3) + rotationOffset;
        ringVertices.push({ 
          x: centerX + Math.cos(angle) * triangleRadius, 
          y: centerY + Math.sin(angle) * triangleRadius, 
          isOffGrid: true 
        });
      }
      
      for (let i = 0; i < 3; i++) {
        const nextIndex = (i + 1) % 3;
        ringBonds.push({
          x1: ringVertices[i].x, y1: ringVertices[i].y,
          x2: ringVertices[nextIndex].x, y2: ringVertices[nextIndex].y,
          bondOrder: 1,
          bondType: null, bondDirection: 1,
          direction: calculateBondDirection(ringVertices[i].x, ringVertices[i].y, ringVertices[nextIndex].x, ringVertices[nextIndex].y),
          flipSmallerLine: false
        });
      }
      
      saveToHistory(); // Save before placing cyclopropane ring
      setVertices(prev => [...prev, ...ringVertices]);
      setSegments(prev => [...prev, ...ringBonds]);
      setTimeout(() => updateRingDetection(), 0);
      return;
    }

    // Handle draw mode, stereochemistry mode, and triple bond mode clicks
    if (mode !== 'draw' && mode !== 'wedge' && mode !== 'dash' && mode !== 'ambiguous' && mode !== 'triple') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to world coordinates
    const worldX = x - offset.x;
    const worldY = y - offset.y;
    
    // Check if we're clicking on an existing vertex FIRST (highest priority)
    const clickedVertex = findNearestVertex(x, y);
    
    if (clickedVertex && !isCreatingBond) {
      // Clear existing suggestions when starting a new bond from a vertex
      setBondSuggestions([]);
      
      // Start creating a bond from this existing vertex
      setBondStartPoint(clickedVertex);
      setIsCreatingBond(true);
      return; // Exit early - vertex click takes priority over everything
    }
    
    // Check if clicking on a bond suggestion (only if no vertex was clicked)
    const clickedSuggestionIndex = findHoveredSuggestion(x, y);
    if (clickedSuggestionIndex !== null && !isCreatingBond) {
      const suggestion = bondSuggestions[clickedSuggestionIndex];
      
      // Determine bond type based on current mode
      let bondType = null;
      if (mode === 'wedge') bondType = 'wedge';
      else if (mode === 'dash') bondType = 'dash';
      else if (mode === 'ambiguous') bondType = 'ambiguous';
      
      // Create the suggested bond
      saveToHistory(); // Save before creating bond from suggestion
      const newVertex = { x: suggestion.x2, y: suggestion.y2, isOffGrid: false };
      setVertices(prev => [...prev, newVertex]);
      
      const newBond = {
        x1: suggestion.x1,
        y1: suggestion.y1,
        x2: suggestion.x2,
        y2: suggestion.y2,
        bondOrder: 1,
        bondType: bondType,
        bondDirection: 1,
        direction: calculateBondDirection(suggestion.x1, suggestion.y1, suggestion.x2, suggestion.y2),
        flipSmallerLine: false
      };
      
      setSegments(prev => {
        const newSegments = [...prev, newBond];
        
        // Update vertex bond states for both ends of the bond
        const bondAngle = calculateBondDirection(newBond.x1, newBond.y1, newBond.x2, newBond.y2);
        const reverseBondAngle = bondAngle + Math.PI; // Angle from end vertex perspective
        
        updateVertexBondState(suggestion.fromVertex, bondAngle);
        updateVertexBondState(newVertex, reverseBondAngle);
        
        // Generate new suggestions from this bond
        setTimeout(() => {
          setBondSuggestions(generateBondSuggestions(newBond));
          // Update ring detection after new bond
          updateRingDetection();
          // Check for vertex merging after state updates
          setTimeout(() => checkAndPerformVertexMerging(), 10);
        }, 0);
        return newSegments;
      });
      
      return; // Exit early after handling suggestion click
    }
    
    // Clear bond suggestions if we didn't click on a suggestion
    // This ensures suggestions only appear right after bond creation
    if (bondSuggestions.length > 0 && !isCreatingBond) {
      setBondSuggestions([]);
    }
    
    // Check if clicking on an existing bond
    const clickedBondIndex = findHoveredBond(x, y);
    if (clickedBondIndex !== null && !isCreatingBond) {
      const clickedBond = segments[clickedBondIndex];
      
      // Handle draw mode: convert to double bond
      if (mode === 'draw' && clickedBond.bondOrder === 1 && !clickedBond.bondType) {
        // Convert to double bond
        saveToHistory(); // Save before converting to double bond
        setSegments(prev => {
          const newSegments = [...prev];
          const doubleBond = {
            ...clickedBond,
            bondOrder: 2
          };
          newSegments[clickedBondIndex] = doubleBond;
          
          // Regenerate suggestions from the new double bond
          setTimeout(() => {
            setBondSuggestions(generateBondSuggestions(doubleBond));
            // Update ring detection after double bond creation
            updateRingDetection();
          }, 0);
          
          return newSegments;
        });
        return; // Exit early
      }
      
      // Handle triple bond mode: convert bond to triple bond
      if (mode === 'triple' && (clickedBond.bondOrder === 1 || clickedBond.bondOrder === 2) && !clickedBond.bondType) {
        // Convert to triple bond
        saveToHistory(); // Save before converting to triple bond
        setSegments(prev => {
          const newSegments = [...prev];
          const tripleBond = {
            ...clickedBond,
            bondOrder: 3,
            bondType: null
          };
          newSegments[clickedBondIndex] = tripleBond;
          
          return newSegments;
        });
        return; // Exit early
      }
      
      // Handle stereochemistry modes: convert bond or flip if same type
      if (mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') {
        saveToHistory(); // Save before modifying stereochemistry
        setSegments(prev => {
          const newSegments = [...prev];
          
          // If clicking the same stereochemistry type, flip it 180 degrees
          if (clickedBond.bondType === mode) {
            // Flip the bond by swapping endpoints
            const flippedBond = {
              ...clickedBond,
              x1: clickedBond.x2,
              y1: clickedBond.y2,
              x2: clickedBond.x1,
              y2: clickedBond.y1,
              bondDirection: clickedBond.bondDirection === 1 ? -1 : 1
            };
            newSegments[clickedBondIndex] = flippedBond;
          } else {
            // Convert to the selected stereochemistry type
            const stereoBond = {
              ...clickedBond,
              bondOrder: 1, // Always single bond
              bondType: mode,
              bondDirection: 1
            };
            newSegments[clickedBondIndex] = stereoBond;
          }
          
          return newSegments;
        });
        
        // Clear bond suggestions when modifying stereochemistry
        setBondSuggestions([]);
        return; // Exit early
      }
      
      return; // Exit early after handling bond click
    }

    if (!isCreatingBond) {
      // If we get here, no vertex, suggestion, or bond was clicked
      // Check if click position is within molecular boundary
      if (isWithinMolecularBoundary(worldX, worldY)) {
        // Don't create new vertex if too close to existing molecular structure
        return;
      }
      
      // Clear existing suggestions when starting a new bond
      setBondSuggestions([]);
      
      // Create new start vertex at click position
      const newStartVertex = { x: worldX, y: worldY, isOffGrid: false };
      setVertices(prev => [...prev, newStartVertex]);
      setBondStartPoint(newStartVertex);
      setIsCreatingBond(true);
    } else {
      // Complete the bond with fixed length
      let endVertex;
      
      // Re-check for clicked vertex in completion mode (vertex still takes priority)
      const completionClickedVertex = findNearestVertex(x, y);
      
      if (completionClickedVertex && completionClickedVertex !== bondStartPoint) {
        // End at existing vertex
        endVertex = completionClickedVertex;
      } else {
        // Calculate fixed-length end position with angle snapping
        const deltaX = worldX - bondStartPoint.x;
        const deltaY = worldY - bondStartPoint.y;
        const currentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (currentLength > 0) {
          // Calculate the target angle
          let targetAngle = Math.atan2(deltaY, deltaX);
          
          // Check for linear geometry constraint (triple bonds require 180°)
          const tripleInfo = hasTripleBond(bondStartPoint);
          if (tripleInfo.hasTriple) {
            // Linear geometry: snap to 180° from existing triple bond
            const linearAngle = getLinearAngle(bondStartPoint, tripleInfo.bond);
            
            // Allow free rotation but snap to the linear angle when close
            const angleDiff = Math.abs(targetAngle - linearAngle);
            const normalizedDiff = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
            
            // Snap if within 20 degrees of the linear angle
            if (normalizedDiff < 20 * (Math.PI / 180)) {
              targetAngle = linearAngle;
            }
            // Otherwise allow free rotation
          } else if (!shouldDisableAngleSnapping(bondStartPoint)) {
            // Normal angle snapping (120° intervals)
            const snappedAngle = findClosestSnapAngle(targetAngle, bondStartPoint);
            if (snappedAngle !== null) {
              targetAngle = snappedAngle;
            }
          }
          
          // Calculate fixed-length end point using the (possibly snapped) angle
          const fixedX = bondStartPoint.x + Math.cos(targetAngle) * hexRadius;
          const fixedY = bondStartPoint.y + Math.sin(targetAngle) * hexRadius;
          endVertex = { x: fixedX, y: fixedY, isOffGrid: false };
        } else {
          // Default to horizontal bond if no movement
          endVertex = { x: bondStartPoint.x + hexRadius, y: bondStartPoint.y, isOffGrid: false };
        }
        
        setVertices(prev => [...prev, endVertex]);
      }
      
      // Check if this bond would overlap with an existing bond
      const overlappingBond = findOverlappingBond(bondStartPoint, endVertex);
      
      if (overlappingBond && overlappingBond.bondOrder === 1) {
        // Convert the existing bond to a double bond instead of creating a new one
        saveToHistory(); // Save before converting overlapping bond to double bond
        setSegments(prev => {
          return prev.map(seg => {
            if (seg === overlappingBond) {
              return { ...seg, bondOrder: 2 };
            }
            return seg;
          });
        });
        
        // Reset bond creation state
        setIsCreatingBond(false);
        setBondStartPoint(null);
        setBondPreviewEnd(null);
        
        // Update ring detection after converting to double bond
        setTimeout(() => {
          updateRingDetection();
        }, 0);
        
        return; // Exit early - we converted instead of creating
      }
      
      // Determine bond type and order based on current mode
      let bondType = null;
      let bondOrder = 1;
      
      if (mode === 'wedge') bondType = 'wedge';
      else if (mode === 'dash') bondType = 'dash';
      else if (mode === 'ambiguous') bondType = 'ambiguous';
      else if (mode === 'triple') bondOrder = 3;
      
      // Create the bond
      saveToHistory(); // Save before creating new bond
      const newBond = {
        x1: bondStartPoint.x,
        y1: bondStartPoint.y,
        x2: endVertex.x,
        y2: endVertex.y,
        bondOrder: bondOrder, // 1 for normal/stereo, 3 for triple
        bondType: bondType,
        bondDirection: 1,
        direction: calculateBondDirection(bondStartPoint.x, bondStartPoint.y, endVertex.x, endVertex.y),
        flipSmallerLine: false
      };
      
      setSegments(prev => {
        const newSegments = [...prev, newBond];
        
        // Update vertex bond states for both ends of the bond
        const bondAngle = calculateBondDirection(newBond.x1, newBond.y1, newBond.x2, newBond.y2);
        const reverseBondAngle = bondAngle + Math.PI; // Angle from end vertex perspective
        
        updateVertexBondState(bondStartPoint, bondAngle);
        updateVertexBondState(endVertex, reverseBondAngle);
        
        // Generate bond suggestions from the newly created bond
        setTimeout(() => {
          setBondSuggestions(generateBondSuggestions(newBond));
          // Update ring detection after new bond
          updateRingDetection();
          // Check for vertex merging after state updates
          setTimeout(() => checkAndPerformVertexMerging(), 10);
        }, 0);
        return newSegments;
      });
      
      // Reset bond creation state
      setIsCreatingBond(false);
      setBondStartPoint(null);
      setBondPreviewEnd(null);
    }
  }, [mode, isCreatingBond, bondStartPoint, vertices, segments, offset, hexRadius, bondSuggestions, findHoveredSuggestion, generateBondSuggestions, checkAndPerformVertexMerging, shouldDisableAngleSnapping, findClosestSnapAngle, updateVertexBondState, calculateBondDirection, molecularBoundaryRadius, justCompletedSelection, clipboard, isPastePreviewMode, updateRingDetection, saveToHistory, vertexAtoms, arrows, findMolecule, findHoveredArrow]);

  const handleCanvasMouseMove = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update current mouse position for text input positioning
    setCurrentMousePosition({ x, y });
    
    // Handle paste preview mode - update preview position (center on cursor)
    if (isPastePreviewMode && clipboard) {
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      setPastePreviewPosition({ x: worldX, y: worldY });
      return;
    }
    
    // Handle arrow dragging/editing in mouse mode
    if (mode === 'mouse' && draggingArrow !== null && draggingArrowEnd !== null) {
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Use functional setState to avoid stale state issues during rapid updates
      setArrows(prevArrows => {
        return prevArrows.map((arrow, idx) => {
          if (idx !== draggingArrow) return arrow;
          
          if (arrow.type === 'curved') {
            // Curved arrow editing
            if (draggingArrowEnd === 'start') {
              console.log('START DRAG - Moving start point');
              return { ...arrow, x1: worldX, y1: worldY };
            } else if (draggingArrowEnd === 'end') {
              console.log('END DRAG - Moving end point');
              return { ...arrow, x2: worldX, y2: worldY };
            } else if (draggingArrowEnd === 'control') {
              // Adjust curve height by changing control offset
              const midX = (arrow.x1 + arrow.x2) / 2;
              const midY = (arrow.y1 + arrow.y2) / 2;
              
              // Calculate perpendicular direction
              const dx = arrow.x2 - arrow.x1;
              const dy = arrow.y2 - arrow.y1;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance === 0) return arrow;
              
              // Perpendicular unit vector
              const perpX = -dy / distance;
              const perpY = dx / distance;
              
              // Project mouse position onto perpendicular axis from midpoint
              const toMouseX = worldX - midX;
              const toMouseY = worldY - midY;
              
              // Dot product to get offset along perpendicular
              const controlOffset = toMouseX * perpX + toMouseY * perpY;
              
              console.log('CONTROL DRAG - New offset:', controlOffset, 'Endpoints FIXED at x1:', arrow.x1, 'y1:', arrow.y1, 'x2:', arrow.x2, 'y2:', arrow.y2);
              
              // ONLY update controlOffset, keep endpoints fixed
              return { 
                ...arrow, 
                controlOffset
              };
            } else if (draggingArrowEnd === 'body') {
              // Move entire curved arrow
              console.log('BODY DRAG - Moving entire arrow');
              const deltaX = worldX - dragSelectionStart.x;
              const deltaY = worldY - dragSelectionStart.y;
              return {
                ...arrow,
                x1: arrow.x1 + deltaX,
                y1: arrow.y1 + deltaY,
                x2: arrow.x2 + deltaX,
                y2: arrow.y2 + deltaY
              };
            }
            console.log('WARNING: Unexpected draggingArrowEnd value:', draggingArrowEnd);
            return arrow;
          } else {
            // Straight arrow editing (forward, equilibrium)
            const currentEndX = arrow.x + arrow.length * Math.cos(arrow.angle);
            const currentEndY = arrow.y + arrow.length * Math.sin(arrow.angle);
            
            if (draggingArrowEnd === 'start') {
              // Move start point, recalculate angle and length
              const newLength = Math.sqrt(Math.pow(currentEndX - worldX, 2) + Math.pow(currentEndY - worldY, 2));
              const newAngle = Math.atan2(currentEndY - worldY, currentEndX - worldX);
              return { ...arrow, x: worldX, y: worldY, length: newLength, angle: newAngle };
            } else if (draggingArrowEnd === 'end') {
              // Move end point, recalculate angle and length
              const newLength = Math.sqrt(Math.pow(worldX - arrow.x, 2) + Math.pow(worldY - arrow.y, 2));
              const newAngle = Math.atan2(worldY - arrow.y, worldX - arrow.x);
              return { ...arrow, length: newLength, angle: newAngle };
            } else if (draggingArrowEnd === 'middle') {
              // Move entire arrow
              const deltaX = worldX - dragSelectionStart.x;
              const deltaY = worldY - dragSelectionStart.y;
              return { ...arrow, x: arrow.x + deltaX, y: arrow.y + deltaY };
            }
          }
          return arrow;
        });
      });
      
      // Update drag start for continuous dragging (whole arrow movement)
      if (draggingArrowEnd === 'middle' || draggingArrowEnd === 'body') {
        setDragSelectionStart({ x: worldX, y: worldY });
      }
      
      return;
    }
    
    // Handle selection box dragging in mouse mode
    if (mode === 'mouse' && isSelecting) {
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      setSelectionEnd({ x: worldX, y: worldY });
      return;
    }
    
    // Handle dragging selected items in mouse mode  
    if (mode === 'mouse' && isDraggingSelection) {
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      const deltaX = worldX - dragSelectionStart.x;
      const deltaY = worldY - dragSelectionStart.y;
      
      // Move selected molecules
      if (selectedMolecules.length > 0) {
        const newVertices = vertices.map(v => {
          const vertexKey = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
          if (selectedVertices.has(vertexKey)) {
            return { ...v, x: v.x + deltaX, y: v.y + deltaY };
          }
          return v;
        });
        
        const newSegments = segments.map(seg => {
          const seg1Key = `${seg.x1.toFixed(2)},${seg.y1.toFixed(2)}`;
          const seg2Key = `${seg.x2.toFixed(2)},${seg.y2.toFixed(2)}`;
          
          if (selectedVertices.has(seg1Key) || selectedVertices.has(seg2Key)) {
            return {
              ...seg,
              x1: selectedVertices.has(seg1Key) ? seg.x1 + deltaX : seg.x1,
              y1: selectedVertices.has(seg1Key) ? seg.y1 + deltaY : seg.y1,
              x2: selectedVertices.has(seg2Key) ? seg.x2 + deltaX : seg.x2,
              y2: selectedVertices.has(seg2Key) ? seg.y2 + deltaY : seg.y2
            };
          }
          return seg;
        });
        
        setVertices(newVertices);
        setSegments(newSegments);
        
        // Update vertex atoms
        const newVertexAtoms = {};
        Object.keys(vertexAtoms).forEach(key => {
          const [xStr, yStr] = key.split(',');
          const vx = parseFloat(xStr);
          const vy = parseFloat(yStr);
          
          if (selectedVertices.has(key)) {
            const newKey = `${(vx + deltaX).toFixed(2)},${(vy + deltaY).toFixed(2)}`;
            newVertexAtoms[newKey] = vertexAtoms[key];
          } else {
            newVertexAtoms[key] = vertexAtoms[key];
          }
        });
        setVertexAtoms(newVertexAtoms);
      }
      
      // Move selected arrows
      if (selectedArrows.size > 0) {
        const newArrows = arrows.map((arrow, idx) => {
          if (selectedArrows.has(idx)) {
            if (arrow.type === 'curved') {
              return {
                ...arrow,
                x1: arrow.x1 + deltaX,
                y1: arrow.y1 + deltaY,
                x2: arrow.x2 + deltaX,
                y2: arrow.y2 + deltaY
              };
            } else {
              return {
                ...arrow,
                x: arrow.x + deltaX,
                y: arrow.y + deltaY
              };
            }
          }
          return arrow;
        });
        setArrows(newArrows);
      }
      
      setDragSelectionStart({ x: worldX, y: worldY });
      return;
    }
    
    // Handle hover detection for molecules in mouse mode
    if (mode === 'mouse' && !isSelecting && !isDraggingSelection) {
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      const hoveredVertex = findNearestVertex(x, y);
      
      if (hoveredVertex) {
        const molecule = findMolecule(hoveredVertex);
        setHoveredMolecule(molecule);
      } else {
        setHoveredMolecule(null);
      }
      
      // Check for arrow hover
      const arrowIdx = findHoveredArrow(x, y);
      setHoveredArrow(arrowIdx);
      return;
    }
    
    // Handle bond creation preview (for draw mode, stereochemistry modes, and triple bond mode)
    if ((mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous' || mode === 'triple') && isCreatingBond) {
      // Convert to world coordinates
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Calculate fixed-length preview end point with angle snapping
      if (bondStartPoint) {
        const deltaX = worldX - bondStartPoint.x;
        const deltaY = worldY - bondStartPoint.y;
        const currentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (currentLength > 0) {
          // Calculate the target angle
          let targetAngle = Math.atan2(deltaY, deltaX);
          
          // Check for linear geometry constraint (triple bonds require 180°)
          const tripleInfo = hasTripleBond(bondStartPoint);
          if (tripleInfo.hasTriple) {
            // Linear geometry: snap to 180° from existing triple bond
            const linearAngle = getLinearAngle(bondStartPoint, tripleInfo.bond);
            
            // Allow free rotation but snap to the linear angle when close
            const angleDiff = Math.abs(targetAngle - linearAngle);
            const normalizedDiff = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
            
            // Snap if within 20 degrees of the linear angle
            if (normalizedDiff < 20 * (Math.PI / 180)) {
              targetAngle = linearAngle;
            }
            // Otherwise allow free rotation
          } else if (!shouldDisableAngleSnapping(bondStartPoint)) {
            // Normal angle snapping (120° intervals)
            const snappedAngle = findClosestSnapAngle(targetAngle, bondStartPoint);
            if (snappedAngle !== null) {
              targetAngle = snappedAngle;
            }
          }
          
          // Calculate fixed-length end point using the (possibly snapped) angle
          const fixedX = bondStartPoint.x + Math.cos(targetAngle) * hexRadius;
          const fixedY = bondStartPoint.y + Math.sin(targetAngle) * hexRadius;
          setBondPreviewEnd({ x: fixedX, y: fixedY });
        } else {
          // Default preview position
          setBondPreviewEnd({ x: bondStartPoint.x + hexRadius, y: bondStartPoint.y });
        }
      }
    }
    
    // Handle hover detection (always active, even when creating bonds)
    const hoveredVertex = findNearestVertex(x, y);
    
    // Check for suggestion hover (only when not creating bonds AND no vertex is hovered)
    const hoveredSuggestion = (!isCreatingBond && !hoveredVertex) ? findHoveredSuggestion(x, y) : null;
    
    // Only check for bond hover if no vertex or suggestion is hovered (vertex has absolute highest priority)
    const hoveredBond = (hoveredVertex || hoveredSuggestion !== null) ? null : findHoveredBond(x, y);
    
    // Update hover states
    setHoveredVertex(hoveredVertex);
    setHoveredBondIndex(hoveredBond);
    setHoveredSuggestionIndex(hoveredSuggestion);
  }, [mode, isCreatingBond, offset, bondStartPoint, hexRadius, vertices, segments, vertexThreshold, lineThreshold, bondSuggestions, shouldDisableAngleSnapping, findClosestSnapAngle, getAvailableBondAngles, isPastePreviewMode, clipboard, isSelecting, isDraggingSelection, selectedMolecules, selectedVertices, selectedArrows, dragSelectionStart, vertexAtoms, arrows, findMolecule, findNearestVertex, findHoveredArrow, vertexBondStates, draggingArrow, draggingArrowEnd]);

  // Enhanced keyboard handler for text and bond creation
  const handleKeyDown = useCallback((event) => {
    // Handle Cmd/Ctrl+Z for undo
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      handleUndo();
      return;
    }
    
    // Handle Cmd/Ctrl+C for copy
    if ((event.metaKey || event.ctrlKey) && event.key === 'c' && (selectedMolecules.length > 0 || selectedArrows.size > 0)) {
      event.preventDefault();
      copySelectionToClipboard();
      return;
    }
    
    // Handle Cmd/Ctrl+V for paste (enter paste preview mode)
    if ((event.metaKey || event.ctrlKey) && event.key === 'v' && clipboard && !isPastePreviewMode) {
      event.preventDefault();
      setIsPastePreviewMode(true);
      return;
    }
    
    // Legacy Cmd/Ctrl+V direct paste (keeping for backwards compatibility)
    if (false && (event.metaKey || event.ctrlKey) && event.key === 'v' && clipboard) {
      event.preventDefault();
      
      // Calculate center of clipboard items
      let totalX = 0, totalY = 0, count = 0;
      clipboard.molecules.forEach(mol => {
        mol.vertices.forEach(v => {
          totalX += v.x;
          totalY += v.y;
          count++;
        });
      });
      clipboard.arrows.forEach(arrow => {
        if (arrow.type === 'curved') {
          totalX += arrow.x1;
          totalY += arrow.y1;
          count++;
        } else {
          totalX += arrow.x;
          totalY += arrow.y;
          count++;
        }
      });
      
      if (count > 0) {
        const centerX = totalX / count;
        const centerY = totalY / count;
        
        // Paste at mouse position
        const offsetX = currentMousePosition.x - offset.x - centerX + 50;
        const offsetY = currentMousePosition.y - offset.y - centerY + 50;
        
        saveToHistory(); // Save before pasting
        
        // Paste molecules
        clipboard.molecules.forEach(mol => {
          const newVertices = mol.vertices.map(v => ({
            x: v.x + offsetX,
            y: v.y + offsetY,
            isOffGrid: v.isOffGrid
          }));
          
          const newBonds = mol.bonds.map(b => ({
            ...b,
            x1: b.x1 + offsetX,
            y1: b.y1 + offsetY,
            x2: b.x2 + offsetX,
            y2: b.y2 + offsetY
          }));
          
          setVertices(prev => [...prev, ...newVertices]);
          setSegments(prev => [...prev, ...newBonds]);
          
          // Paste atoms
          Object.keys(mol.atoms).forEach(oldKey => {
            const [xStr, yStr] = oldKey.split(',');
            const newKey = `${(parseFloat(xStr) + offsetX).toFixed(2)},${(parseFloat(yStr) + offsetY).toFixed(2)}`;
            setVertexAtoms(prev => ({
              ...prev,
              [newKey]: mol.atoms[oldKey]
            }));
          });
        });
        
        // Paste arrows
        clipboard.arrows.forEach(arrow => {
          const newArrow = {
            ...arrow,
            x: arrow.x ? arrow.x + offsetX : arrow.x,
            y: arrow.y ? arrow.y + offsetY : arrow.y,
            x1: arrow.x1 ? arrow.x1 + offsetX : arrow.x1,
            y1: arrow.y1 ? arrow.y1 + offsetY : arrow.y1,
            x2: arrow.x2 ? arrow.x2 + offsetX : arrow.x2,
            y2: arrow.y2 ? arrow.y2 + offsetY : arrow.y2
          };
          setArrows(prev => [...prev, newArrow]);
        });
        
        setTimeout(() => updateRingDetection(), 10);
      }
      return;
    }
    
    // Handle Escape key for paste preview mode
    if (event.key === 'Escape' && isPastePreviewMode) {
      setIsPastePreviewMode(false);
      return;
    }
    
    // Handle Escape key for bond creation
    if (event.key === 'Escape' && isCreatingBond) {
      setIsCreatingBond(false);
      setBondStartPoint(null);
      setBondPreviewEnd(null);
      return;
    }
    
    // Handle Escape key for curved arrow creation
    if (event.key === 'Escape' && curvedArrowStartPoint) {
      setCurvedArrowStartPoint(null);
      return;
    }

    // Handle Enter key for text input on hovered vertex
    if (event.key === 'Enter' && hoveredVertex && !showAtomInput) {
      const success = handleEnterKeyOnVertex(
        hoveredVertex, 
        currentMousePosition, 
        {
          setShowAtomInput,
          setAtomInputPosition,
          setAtomInputValue,
          setMenuVertexKey
        }
      );
      if (success) return;
    }

    // Handle single letter keys for quick element placement
    if (event.key.length === 1 && /[A-Za-z]/.test(event.key) && hoveredVertex && !showAtomInput) {
      saveToHistory(); // Save before quick element placement
      const success = handleQuickElementKey(
        event.key,
        hoveredVertex,
        { vertexAtoms, segments },
        { setVertexAtoms }
      );
      if (success) return;
    }
  }, [isCreatingBond, hoveredVertex, showAtomInput, currentMousePosition, vertexAtoms, segments, curvedArrowStartPoint, handleUndo, saveToHistory, copySelectionToClipboard, updateRingDetection, isPastePreviewMode]);

  // Handle mouse leaving canvas - clear hover states
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredVertex(null);
    setHoveredBondIndex(null);
    setHoveredSuggestionIndex(null);
    setHoveredMolecule(null);
    setHoveredArrow(null);
  }, []);

  // Handle mouse down for dragging
  const handleCanvasMouseDown = useCallback((event) => {
    if (mode !== 'mouse') return;
    
    // Don't start selection box in paste preview mode
    if (isPastePreviewMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldX = x - offset.x;
    const worldY = y - offset.y;
    
    // Check if clicking on any arrow to edit it (in mouse mode, arrows are always editable)
    const arrowIdx = findHoveredArrow(x, y);
    if (arrowIdx !== null) {
      const arrowPart = detectArrowPart(x, y, arrowIdx);
      console.log('ARROW EDIT START - Arrow:', arrowIdx, 'Part:', arrowPart);
      saveToHistory(); // Save before editing arrow
      setDraggingArrow(arrowIdx);
      setDraggingArrowEnd(arrowPart);
      setDragSelectionStart({ x: worldX, y: worldY });
      return;
    }
    
    // Check if clicking on selected items to start dragging
    if (selectedMolecules.length > 0 || selectedArrows.size > 0) {
      // Check if clicking within selected molecule
      const clickedVertex = findNearestVertex(x, y);
      if (clickedVertex) {
        const vertexKey = `${clickedVertex.x.toFixed(2)},${clickedVertex.y.toFixed(2)}`;
        if (selectedVertices.has(vertexKey)) {
          setIsDraggingSelection(true);
          setDragSelectionStart({ x: worldX, y: worldY });
          saveToHistory(); // Save before dragging
          return;
        }
      }
    }
    
    // Check if clicking on any vertex or arrow (for new selection)
    const clickedVertex = findNearestVertex(x, y);
    if (clickedVertex) {
      // Don't start selection box, click handler will handle selection
      return;
    }
    
    const arrowIdx2 = findHoveredArrow(x, y);
    if (arrowIdx2 !== null) {
      // Don't start selection box, click handler will handle selection
      return;
    }
    
    // Clicking on empty space - start selection box
    setIsSelecting(true);
    setSelectionStart({ x: worldX, y: worldY });
    setSelectionEnd({ x: worldX, y: worldY });
  }, [mode, offset, selectedMolecules, selectedVertices, selectedArrows, findNearestVertex, findHoveredArrow, saveToHistory, isPastePreviewMode, detectArrowPart]);

  // Handle mouse up for completing drag or selection
  const handleCanvasMouseUp = useCallback((event) => {
    if (mode !== 'mouse') return;
    
    // Complete arrow dragging
    if (draggingArrow !== null) {
      setDraggingArrow(null);
      setDraggingArrowEnd(null);
      return;
    }
    
    // Complete selection box
    if (isSelecting) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      
      // Calculate selection box bounds
      const minX = Math.min(selectionStart.x, worldX);
      const maxX = Math.max(selectionStart.x, worldX);
      const minY = Math.min(selectionStart.y, worldY);
      const maxY = Math.max(selectionStart.y, worldY);
      
      // Select all vertices within box
      const selectedVertexSet = new Set();
      const selectedMoleculesArray = [];
      
      vertices.forEach(v => {
        if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) {
          const vertexKey = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
          selectedVertexSet.add(vertexKey);
          
          // Find molecule for this vertex
          const molecule = findMolecule(v);
          if (!selectedMoleculesArray.some(m => m.vertices.some(mv => 
            Math.abs(mv.x - molecule.vertices[0].x) < 0.01 && Math.abs(mv.y - molecule.vertices[0].y) < 0.01
          ))) {
            selectedMoleculesArray.push(molecule);
            molecule.vertices.forEach(mv => {
              const mvKey = `${mv.x.toFixed(2)},${mv.y.toFixed(2)}`;
              selectedVertexSet.add(mvKey);
            });
          }
        }
      });
      
      // Select bonds
      const selectedBondSet = new Set();
      segments.forEach((seg, idx) => {
        const seg1Key = `${seg.x1.toFixed(2)},${seg.y1.toFixed(2)}`;
        const seg2Key = `${seg.x2.toFixed(2)},${seg.y2.toFixed(2)}`;
        if (selectedVertexSet.has(seg1Key) && selectedVertexSet.has(seg2Key)) {
          selectedBondSet.add(idx);
        }
      });
      
      // Select arrows within box
      const selectedArrowSet = new Set();
      arrows.forEach((arrow, idx) => {
        if (arrow.type === 'curved') {
          if (arrow.x1 >= minX && arrow.x1 <= maxX && arrow.y1 >= minY && arrow.y1 <= maxY) {
            selectedArrowSet.add(idx);
          }
        } else {
          if (arrow.x >= minX && arrow.x <= maxX && arrow.y >= minY && arrow.y <= maxY) {
            selectedArrowSet.add(idx);
          }
        }
      });
      
      setSelectedVertices(selectedVertexSet);
      setSelectedSegments(selectedBondSet);
      setSelectedArrows(selectedArrowSet);
      setSelectedMolecules(selectedMoleculesArray);
      setIsSelecting(false);
      
      // Prevent click handler from firing immediately after selection
      setJustCompletedSelection(true);
      setTimeout(() => setJustCompletedSelection(false), 100);
    }
    
    // Complete dragging
    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      updateRingDetection(); // Update rings after moving
    }
  }, [mode, isSelecting, isDraggingSelection, selectionStart, offset, vertices, segments, arrows, findMolecule, updateRingDetection, draggingArrow]);

  // Add keyboard listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Check for vertex merging when vertices change
  React.useEffect(() => {
    if (vertices.length > 1) {
      const timeoutId = setTimeout(() => {
        checkAndPerformVertexMerging();
      }, 100); // Small delay to allow state updates to complete
      
      return () => clearTimeout(timeoutId);
    }
  }, [vertices, checkAndPerformVertexMerging]);
  
  // Clear bond suggestions when atom text changes
  const prevVertexAtomsRef = React.useRef(vertexAtoms);
  React.useEffect(() => {
    // Check if vertexAtoms changed (text, charges, lone pairs modified)
    if (prevVertexAtomsRef.current !== vertexAtoms && Object.keys(prevVertexAtomsRef.current).length > 0) {
      // Don't clear if we're in the middle of creating a bond
      if (!isCreatingBond) {
        setBondSuggestions([]);
      }
    }
    prevVertexAtomsRef.current = vertexAtoms;
  }, [vertexAtoms, isCreatingBond]);

  // Canvas drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.canvasBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw existing bonds - handle stereochemistry, single, and double bonds
    ctx.lineCap = 'round'; // Rounded line ends
    
    // First pass: Render stereochemistry bonds
    const stereoBondIndices = renderAllStereochemistryBonds(ctx, segments, offset, colors);
    
    // Second pass: Render regular bonds (skip stereochemistry bonds)
    segments.forEach((segment, index) => {
      if (segment.bondOrder <= 0) return; // Skip grid lines
      if (stereoBondIndices.has(index)) return; // Skip stereochemistry bonds (already rendered)
      
      if (segment.bondOrder === 1) {
        // Single bond rendering
        ctx.strokeStyle = hoveredBondIndex === index ? '#007bff' : colors.bonds;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
        ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
        ctx.stroke();
      } else if (segment.bondOrder === 2) {
        // Double bond rendering with hover support
        if (hoveredBondIndex === index) {
          // Render hovered double bond in blue
          const originalBondsColor = colors.bonds;
          const tempColors = { ...colors, bonds: '#007bff' };
          renderDoubleBondByCase(ctx, segment, offset, tempColors);
        } else {
          // Render normal double bond
          renderDoubleBondByCase(ctx, segment, offset, colors);
        }
      } else if (segment.bondOrder === 3) {
        // Triple bond rendering - three parallel lines
        const bondAngle = Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1);
        const perpAngle = bondAngle + Math.PI / 2;
        const lineSpacing = 8.5; // Distance between parallel lines (further apart)
        
        ctx.strokeStyle = hoveredBondIndex === index ? '#007bff' : colors.bonds;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // Draw center line
        ctx.beginPath();
        ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
        ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
        ctx.stroke();
        
        // Draw top line
        const topOffsetX = Math.cos(perpAngle) * lineSpacing;
        const topOffsetY = Math.sin(perpAngle) * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(segment.x1 + topOffsetX + offset.x, segment.y1 + topOffsetY + offset.y);
        ctx.lineTo(segment.x2 + topOffsetX + offset.x, segment.y2 + topOffsetY + offset.y);
        ctx.stroke();
        
        // Draw bottom line
        ctx.beginPath();
        ctx.moveTo(segment.x1 - topOffsetX + offset.x, segment.y1 - topOffsetY + offset.y);
        ctx.lineTo(segment.x2 - topOffsetX + offset.x, segment.y2 - topOffsetY + offset.y);
        ctx.stroke();
      }
    });

    // Draw bond suggestions
    if (bondSuggestions.length > 0 && !isCreatingBond) {
      bondSuggestions.forEach((suggestion, index) => {
        // Use subtle gray for suggestions, blue if hovered
        ctx.strokeStyle = hoveredSuggestionIndex === index ? 'rgba(0, 123, 255, 0.6)' : 'rgba(136, 136, 136, 0.5)';
        ctx.lineWidth = 1.5; // Thinner, more subtle
        ctx.lineCap = 'round';
        // Subtle gray lines
        ctx.beginPath();
        ctx.moveTo(suggestion.x1 + offset.x, suggestion.y1 + offset.y);
        ctx.lineTo(suggestion.x2 + offset.x, suggestion.y2 + offset.y);
        ctx.stroke();
      });
    }

    // Draw bond preview angle suggestions during creation
    if (isCreatingBond && bondStartPoint && !shouldDisableAngleSnapping(bondStartPoint)) {
      // Get available angles for this vertex
      const availableAngles = getAvailableBondAngles(bondStartPoint);
      
      // Draw light gray suggestion lines at each available angle
      ctx.strokeStyle = 'rgba(136, 136, 136, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      availableAngles.forEach(angle => {
        const endX = bondStartPoint.x + Math.cos(angle) * hexRadius;
        const endY = bondStartPoint.y + Math.sin(angle) * hexRadius;
        
        ctx.beginPath();
        ctx.moveTo(bondStartPoint.x + offset.x, bondStartPoint.y + offset.y);
        ctx.lineTo(endX + offset.x, endY + offset.y);
        ctx.stroke();
      });
    }

    // Draw bond preview if creating a bond
    if (isCreatingBond && bondStartPoint && bondPreviewEnd) {
      const previewBondOrder = mode === 'triple' ? 3 : 1;
      const previewBond = {
        x1: bondStartPoint.x,
        y1: bondStartPoint.y,
        x2: bondPreviewEnd.x,
        y2: bondPreviewEnd.y,
        bondOrder: previewBondOrder,
        bondType: mode === 'wedge' || mode === 'dash' || mode === 'ambiguous' ? mode : null,
        bondDirection: 1
      };
      
      // Create darker gray preview colors
      const previewColors = { ...colors, bonds: 'rgba(102, 102, 102, 0.75)' };
      
      // Render preview with appropriate style
      if (previewBond.bondType) {
        // Render stereochemistry preview in darker gray
        renderStereochemistryBond(ctx, previewBond, offset, previewColors);
      } else if (previewBond.bondOrder === 3) {
        // Triple bond preview - three gray lines
        const bondAngle = Math.atan2(bondPreviewEnd.y - bondStartPoint.y, bondPreviewEnd.x - bondStartPoint.x);
        const perpAngle = bondAngle + Math.PI / 2;
        const lineSpacing = 8.5; // Further spacing
        
        ctx.strokeStyle = 'rgba(102, 102, 102, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        // Center line
        ctx.beginPath();
        ctx.moveTo(bondStartPoint.x + offset.x, bondStartPoint.y + offset.y);
        ctx.lineTo(bondPreviewEnd.x + offset.x, bondPreviewEnd.y + offset.y);
        ctx.stroke();
        
        // Top line
        const topOffsetX = Math.cos(perpAngle) * lineSpacing;
        const topOffsetY = Math.sin(perpAngle) * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(bondStartPoint.x + topOffsetX + offset.x, bondStartPoint.y + topOffsetY + offset.y);
        ctx.lineTo(bondPreviewEnd.x + topOffsetX + offset.x, bondPreviewEnd.y + topOffsetY + offset.y);
        ctx.stroke();
        
        // Bottom line
        ctx.beginPath();
        ctx.moveTo(bondStartPoint.x - topOffsetX + offset.x, bondStartPoint.y - topOffsetY + offset.y);
        ctx.lineTo(bondPreviewEnd.x - topOffsetX + offset.x, bondPreviewEnd.y - topOffsetY + offset.y);
        ctx.stroke();
      } else {
        // Regular bond preview
      ctx.strokeStyle = 'rgba(102, 102, 102, 0.75)'; // Darker gray preview
        ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bondStartPoint.x + offset.x, bondStartPoint.y + offset.y);
      ctx.lineTo(bondPreviewEnd.x + offset.x, bondPreviewEnd.y + offset.y);
      ctx.stroke();
      }
    }

    // Draw atom text labels
    renderAllAtomText(ctx, vertices, vertexAtoms, offset, colors, isDarkMode);
    
    // Draw lone pairs and charges
    renderAllLonePairsAndCharges(ctx, vertices, segments, vertexAtoms, offset, colors);
    
    // Draw arrows
    renderAllArrows(ctx, arrows, offset, colors);
    
    // Draw benzene preview if in benzene mode
    if (mode === 'benzene' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      const benzeneRadius = hexRadius;
      
      // Check for snap target
      const snapInfo = calculateBenzeneSnap({ x: worldMouseX, y: worldMouseY }, vertices, segments, benzeneRadius);
      
      // Use snap position if available
      const previewCenterX = snapInfo ? snapInfo.center.x : worldMouseX;
      const previewCenterY = snapInfo ? snapInfo.center.y : worldMouseY;
      
      // Use green color if snapping, gray if not
      const isSnapping = snapInfo !== null;
      ctx.strokeStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)'; // Green when snapping
      ctx.fillStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      // Draw preview benzene hexagon
      for (let i = 0; i < 6; i++) {
        const angle1 = (Math.PI / 6) + (i * Math.PI / 3);
        const angle2 = (Math.PI / 6) + ((i + 1) * Math.PI / 3);
        
        const x1 = previewCenterX + Math.cos(angle1) * benzeneRadius + offset.x;
        const y1 = previewCenterY + Math.sin(angle1) * benzeneRadius + offset.y;
        const x2 = previewCenterX + Math.cos(angle2) * benzeneRadius + offset.x;
        const y2 = previewCenterY + Math.sin(angle2) * benzeneRadius + offset.y;
        
        // Draw bond line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw small dots at vertices
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw snap indicator
      if (isSnapping) {
        if (snapInfo.type === 'vertex') {
          // Highlight the snap target vertex
          ctx.fillStyle = 'rgba(0, 204, 0, 0.2)';
          ctx.beginPath();
          ctx.arc(snapInfo.target.x + offset.x, snapInfo.target.y + offset.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        } else if (snapInfo.type === 'bond') {
          // Highlight the snap target bond
          ctx.strokeStyle = 'rgba(0, 204, 0, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(snapInfo.target.x1 + offset.x, snapInfo.target.y1 + offset.y);
          ctx.lineTo(snapInfo.target.x2 + offset.x, snapInfo.target.y2 + offset.y);
          ctx.stroke();
        }
      }
    }
    
    // Draw cyclohexane preview with snapping
    if (mode === 'cyclohexane' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      
      const snapInfo = calculateRingSnap({ x: worldMouseX, y: worldMouseY }, vertices, segments, hexRadius, 6);
      const previewCenterX = snapInfo ? snapInfo.center.x : worldMouseX;
      const previewCenterY = snapInfo ? snapInfo.center.y : worldMouseY;
      const rotationOffset = snapInfo?.rotation || 0;
      const isSnapping = snapInfo !== null;
      
      ctx.strokeStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.fillStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < 6; i++) {
        const angle1 = (Math.PI / 6) + (i * Math.PI / 3) + rotationOffset;
        const angle2 = (Math.PI / 6) + ((i + 1) * Math.PI / 3) + rotationOffset;
        const x1 = previewCenterX + Math.cos(angle1) * hexRadius + offset.x;
        const y1 = previewCenterY + Math.sin(angle1) * hexRadius + offset.y;
        const x2 = previewCenterX + Math.cos(angle2) * hexRadius + offset.x;
        const y2 = previewCenterY + Math.sin(angle2) * hexRadius + offset.y;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw snap indicator
      if (isSnapping && snapInfo.type === 'vertex') {
        ctx.fillStyle = 'rgba(0, 204, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(snapInfo.target.x + offset.x, snapInfo.target.y + offset.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      } else if (isSnapping && snapInfo.type === 'bond') {
        ctx.strokeStyle = 'rgba(0, 204, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(snapInfo.target.x1 + offset.x, snapInfo.target.y1 + offset.y);
        ctx.lineTo(snapInfo.target.x2 + offset.x, snapInfo.target.y2 + offset.y);
        ctx.stroke();
      }
    }
    
    // Draw cyclopentane preview with snapping
    if (mode === 'cyclopentane' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      const pentagonRadius = hexRadius / (2 * Math.sin(Math.PI / 5));
      
      const snapInfo = calculateRingSnap({ x: worldMouseX, y: worldMouseY }, vertices, segments, pentagonRadius, 5);
      const previewCenterX = snapInfo ? snapInfo.center.x : worldMouseX;
      const previewCenterY = snapInfo ? snapInfo.center.y : worldMouseY;
      const rotationOffset = snapInfo?.rotation || 0;
      const isSnapping = snapInfo !== null;
      
      ctx.strokeStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.fillStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < 5; i++) {
        const angle1 = (-Math.PI / 2) + (i * 2 * Math.PI / 5) + rotationOffset;
        const angle2 = (-Math.PI / 2) + ((i + 1) * 2 * Math.PI / 5) + rotationOffset;
        const x1 = previewCenterX + Math.cos(angle1) * pentagonRadius + offset.x;
        const y1 = previewCenterY + Math.sin(angle1) * pentagonRadius + offset.y;
        const x2 = previewCenterX + Math.cos(angle2) * pentagonRadius + offset.x;
        const y2 = previewCenterY + Math.sin(angle2) * pentagonRadius + offset.y;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      if (isSnapping && snapInfo.type === 'vertex') {
        ctx.fillStyle = 'rgba(0, 204, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(snapInfo.target.x + offset.x, snapInfo.target.y + offset.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      } else if (isSnapping && snapInfo.type === 'bond') {
        ctx.strokeStyle = '#00CC00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(snapInfo.target.x1 + offset.x, snapInfo.target.y1 + offset.y);
        ctx.lineTo(snapInfo.target.x2 + offset.x, snapInfo.target.y2 + offset.y);
        ctx.stroke();
      }
    }
    
    // Draw cyclobutane preview with snapping
    if (mode === 'cyclobutane' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      const squareRadius = hexRadius / (2 * Math.sin(Math.PI / 4));
      
      const snapInfo = calculateRingSnap({ x: worldMouseX, y: worldMouseY }, vertices, segments, squareRadius, 4);
      const previewCenterX = snapInfo ? snapInfo.center.x : worldMouseX;
      const previewCenterY = snapInfo ? snapInfo.center.y : worldMouseY;
      const rotationOffset = snapInfo?.rotation || 0;
      const isSnapping = snapInfo !== null;
      
      ctx.strokeStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.fillStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < 4; i++) {
        const angle1 = (Math.PI / 4) + (i * Math.PI / 2) + rotationOffset;
        const angle2 = (Math.PI / 4) + ((i + 1) * Math.PI / 2) + rotationOffset;
        const x1 = previewCenterX + Math.cos(angle1) * squareRadius + offset.x;
        const y1 = previewCenterY + Math.sin(angle1) * squareRadius + offset.y;
        const x2 = previewCenterX + Math.cos(angle2) * squareRadius + offset.x;
        const y2 = previewCenterY + Math.sin(angle2) * squareRadius + offset.y;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      if (isSnapping && snapInfo.type === 'vertex') {
        ctx.fillStyle = 'rgba(0, 204, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(snapInfo.target.x + offset.x, snapInfo.target.y + offset.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      } else if (isSnapping && snapInfo.type === 'bond') {
        ctx.strokeStyle = '#00CC00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(snapInfo.target.x1 + offset.x, snapInfo.target.y1 + offset.y);
        ctx.lineTo(snapInfo.target.x2 + offset.x, snapInfo.target.y2 + offset.y);
        ctx.stroke();
      }
    }
    
    // Draw cyclopropane preview with snapping
    if (mode === 'cyclopropane' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      const triangleRadius = hexRadius / (2 * Math.sin(Math.PI / 3));
      
      const snapInfo = calculateRingSnap({ x: worldMouseX, y: worldMouseY }, vertices, segments, triangleRadius, 3);
      const previewCenterX = snapInfo ? snapInfo.center.x : worldMouseX;
      const previewCenterY = snapInfo ? snapInfo.center.y : worldMouseY;
      const rotationOffset = snapInfo?.rotation || 0;
      const isSnapping = snapInfo !== null;
      
      ctx.strokeStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.fillStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < 3; i++) {
        const angle1 = (-Math.PI / 2) + (i * 2 * Math.PI / 3) + rotationOffset;
        const angle2 = (-Math.PI / 2) + ((i + 1) * 2 * Math.PI / 3) + rotationOffset;
        const x1 = previewCenterX + Math.cos(angle1) * triangleRadius + offset.x;
        const y1 = previewCenterY + Math.sin(angle1) * triangleRadius + offset.y;
        const x2 = previewCenterX + Math.cos(angle2) * triangleRadius + offset.x;
        const y2 = previewCenterY + Math.sin(angle2) * triangleRadius + offset.y;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      if (isSnapping && snapInfo.type === 'vertex') {
        ctx.fillStyle = 'rgba(0, 204, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(snapInfo.target.x + offset.x, snapInfo.target.y + offset.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      } else if (isSnapping && snapInfo.type === 'bond') {
        ctx.strokeStyle = '#00CC00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(snapInfo.target.x1 + offset.x, snapInfo.target.y1 + offset.y);
        ctx.lineTo(snapInfo.target.x2 + offset.x, snapInfo.target.y2 + offset.y);
        ctx.stroke();
      }
    }
    
    // Draw arrow preview if in arrow mode
    if (mode === 'arrow' && currentMousePosition) {
      const worldMousePos = {
        x: currentMousePosition.x - offset.x,
        y: currentMousePosition.y - offset.y
      };
      renderArrowPreview(ctx, worldMousePos, 'forward', offset, colors);
    } else if (mode === 'equil' && currentMousePosition) {
      const worldMousePos = {
        x: currentMousePosition.x - offset.x,
        y: currentMousePosition.y - offset.y
      };
      renderArrowPreview(ctx, worldMousePos, 'equilibrium', offset, colors);
    } else if ((mode === 'curve0' || mode === 'curve1' || mode === 'curve2' || 
                mode === 'curve3' || mode === 'curve4' || mode === 'curve5') && currentMousePosition) {
      // Curved arrow preview
      if (curvedArrowStartPoint) {
        // Show preview from start point to current mouse position
        const previewArrow = {
          x1: curvedArrowStartPoint.x,
          y1: curvedArrowStartPoint.y,
          x2: currentMousePosition.x - offset.x,
          y2: currentMousePosition.y - offset.y,
          type: 'curved',
          curveType: mode,
          direction: (mode === 'curve0' || mode === 'curve1' || mode === 'curve2') ? 'ccw' : 'cw' // Swapped
        };
        renderArrow(ctx, previewArrow, offset, colors, true);
        
        // Also draw a small circle at the start point
        ctx.fillStyle = '#007bff';
        ctx.beginPath();
        ctx.arc(curvedArrowStartPoint.x + offset.x, curvedArrowStartPoint.y + offset.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw paste preview
    if (isPastePreviewMode && clipboard) {
      // Calculate center of clipboard items
      let totalX = 0, totalY = 0, count = 0;
      clipboard.molecules.forEach(mol => {
        mol.vertices.forEach(v => {
          totalX += v.x;
          totalY += v.y;
          count++;
        });
      });
      clipboard.arrows.forEach(arrow => {
        if (arrow.type === 'curved') {
          totalX += arrow.x1;
          totalY += arrow.y1;
          count++;
        } else {
          totalX += arrow.x;
          totalY += arrow.y;
          count++;
        }
      });
      
      if (count > 0) {
        const centerX = totalX / count;
        const centerY = totalY / count;
        const offsetX = pastePreviewPosition.x - centerX;
        const offsetY = pastePreviewPosition.y - centerY;
        
        // Draw molecules with blue semi-transparent overlay
        clipboard.molecules.forEach(mol => {
          // Draw bonds with proper bond orders and types
          mol.bonds.forEach(bond => {
            const x1 = bond.x1 + offsetX + offset.x;
            const y1 = bond.y1 + offsetY + offset.y;
            const x2 = bond.x2 + offsetX + offset.x;
            const y2 = bond.y2 + offsetY + offset.y;
            
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            // Handle different bond types
            if (bond.bondOrder === 2) {
              // Double bond
              const bondAngle = Math.atan2(y2 - y1, x2 - x1);
              const perpAngle = bondAngle + Math.PI / 2;
              const spacing = 4;
              
              const offset1X = Math.cos(perpAngle) * spacing;
              const offset1Y = Math.sin(perpAngle) * spacing;
              
              // First line
              ctx.beginPath();
              ctx.moveTo(x1 + offset1X, y1 + offset1Y);
              ctx.lineTo(x2 + offset1X, y2 + offset1Y);
              ctx.stroke();
              
              // Second line
              ctx.beginPath();
              ctx.moveTo(x1 - offset1X, y1 - offset1Y);
              ctx.lineTo(x2 - offset1X, y2 - offset1Y);
              ctx.stroke();
            } else if (bond.bondOrder === 3) {
              // Triple bond
              const bondAngle = Math.atan2(y2 - y1, x2 - x1);
              const perpAngle = bondAngle + Math.PI / 2;
              const spacing = 5;
              
              const offsetX = Math.cos(perpAngle) * spacing;
              const offsetY = Math.sin(perpAngle) * spacing;
              
              // Center line
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              
              // Top line
              ctx.beginPath();
              ctx.moveTo(x1 + offsetX, y1 + offsetY);
              ctx.lineTo(x2 + offsetX, y2 + offsetY);
              ctx.stroke();
              
              // Bottom line
              ctx.beginPath();
              ctx.moveTo(x1 - offsetX, y1 - offsetY);
              ctx.lineTo(x2 - offsetX, y2 - offsetY);
              ctx.stroke();
            } else if (bond.bondType === 'wedge' || bond.bondType === 'dash' || bond.bondType === 'ambiguous') {
              // Stereochemistry bonds - simplified preview
              ctx.lineWidth = bond.bondType === 'wedge' ? 6 : 3;
              if (bond.bondType === 'dash') {
                ctx.setLineDash([5, 3]);
              }
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.lineWidth = 3;
            } else {
              // Single bond
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          });
          
          // Draw vertices
          ctx.fillStyle = 'rgba(0, 123, 255, 0.4)';
          mol.vertices.forEach(v => {
            const vx = v.x + offsetX + offset.x;
            const vy = v.y + offsetY + offset.y;
            ctx.beginPath();
            ctx.arc(vx, vy, 8, 0, 2 * Math.PI);
            ctx.fill();
          });
          
          // Draw atom labels, charges, and lone pairs
          Object.keys(mol.atoms).forEach(oldKey => {
            const [xStr, yStr] = oldKey.split(',');
            const atomX = parseFloat(xStr) + offsetX;
            const atomY = parseFloat(yStr) + offsetY;
            const atomData = mol.atoms[oldKey];
            
            if (atomData.symbol && atomData.symbol !== 'C') {
              ctx.fillStyle = 'rgba(0, 123, 255, 0.7)';
              ctx.font = '16px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(atomData.symbol, atomX + offset.x, atomY + offset.y);
            }
            
            // Draw charges
            if (atomData.charge) {
              ctx.fillStyle = 'rgba(0, 123, 255, 0.7)';
              ctx.font = '12px Arial';
              const chargeText = atomData.charge > 0 ? `+${atomData.charge}` : `${atomData.charge}`;
              ctx.fillText(chargeText, atomX + offset.x + 12, atomY + offset.y - 8);
            }
            
            // Draw lone pairs
            if (atomData.lonePairs > 0) {
              ctx.fillStyle = 'rgba(0, 123, 255, 0.6)';
              for (let i = 0; i < atomData.lonePairs; i++) {
                const angle = (i * 2 * Math.PI) / 8;
                const lpX = atomX + offset.x + Math.cos(angle) * 15;
                const lpY = atomY + offset.y + Math.sin(angle) * 15;
                ctx.beginPath();
                ctx.arc(lpX, lpY, 2, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          });
        });
        
        // Draw arrows
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        clipboard.arrows.forEach(arrow => {
          if (arrow.type === 'curved') {
            const x1 = arrow.x1 + offsetX + offset.x;
            const y1 = arrow.y1 + offsetY + offset.y;
            const x2 = arrow.x2 + offsetX + offset.x;
            const y2 = arrow.y2 + offsetY + offset.y;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          } else {
            const arrowX = arrow.x + offsetX + offset.x;
            const arrowY = arrow.y + offsetY + offset.y;
            const endX = arrowX + arrow.length * Math.cos(arrow.angle);
            const endY = arrowY + arrow.length * Math.sin(arrow.angle);
            
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        });
      }
    }

    // Draw selection indicators in mouse mode
    if (mode === 'mouse') {
      // Draw control points on all arrows to show they're editable
      arrows.forEach((arrow, idx) => {
        // Different styling based on state
        const isSelected = selectedArrows.has(idx);
        const isHovered = hoveredArrow === idx;
        const isDragging = draggingArrow === idx;
        
        // Skip if dragging (will be drawn separately)
        if (isDragging) return;
        
        // Determine circle size and color - BIGGER and MORE VISIBLE
        let circleSize = 10; // Base size increased from 5 to 10
        let fillColor = 'rgba(70, 130, 180, 0.7)'; // Steel blue, more visible
        let strokeColor = 'rgba(255, 255, 255, 0.95)';
        let strokeWidth = 2.5;
        
        if (isSelected) {
          circleSize = 13;
          fillColor = 'rgba(0, 123, 255, 0.95)';
          strokeColor = '#ffffff';
          strokeWidth = 3;
        } else if (isHovered) {
          circleSize = 12;
          fillColor = 'rgba(0, 123, 255, 0.85)';
          strokeColor = '#ffffff';
          strokeWidth = 3;
        }
        
        if (arrow.type === 'curved') {
          // Draw start point with shadow for depth
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          ctx.arc(arrow.x1 + offset.x, arrow.y1 + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Add inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(arrow.x1 + offset.x - 2, arrow.y1 + offset.y - 2, circleSize / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add small drag indicator on start point (when selected/hovered)
          if (isSelected || isHovered) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5;
            const indicatorSize = 3;
            ctx.beginPath();
            ctx.moveTo(arrow.x1 + offset.x - indicatorSize, arrow.y1 + offset.y);
            ctx.lineTo(arrow.x1 + offset.x + indicatorSize, arrow.y1 + offset.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(arrow.x1 + offset.x, arrow.y1 + offset.y - indicatorSize);
            ctx.lineTo(arrow.x1 + offset.x, arrow.y1 + offset.y + indicatorSize);
            ctx.stroke();
          }
          
          // Draw end point with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          ctx.arc(arrow.x2 + offset.x, arrow.y2 + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Add inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(arrow.x2 + offset.x - 2, arrow.y2 + offset.y - 2, circleSize / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add small drag indicator on end point (when selected/hovered)
          if (isSelected || isHovered) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5;
            const indicatorSize = 3;
            ctx.beginPath();
            ctx.moveTo(arrow.x2 + offset.x - indicatorSize, arrow.y2 + offset.y);
            ctx.lineTo(arrow.x2 + offset.x + indicatorSize, arrow.y2 + offset.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(arrow.x2 + offset.x, arrow.y2 + offset.y - indicatorSize);
            ctx.lineTo(arrow.x2 + offset.x, arrow.y2 + offset.y + indicatorSize);
            ctx.stroke();
          }
          
          // Draw middle control point (for curve adjustment) - ALWAYS VISIBLE AND LARGER
          const midX = (arrow.x1 + arrow.x2) / 2;
          const midY = (arrow.y1 + arrow.y2) / 2;
          const dx = arrow.x2 - arrow.x1;
          const dy = arrow.y2 - arrow.y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Perpendicular direction
          const perpX = -dy / distance;
          const perpY = dx / distance;
          
          // Use stored controlOffset or calculate default
          let controlOffset;
          if (arrow.controlOffset !== undefined) {
            controlOffset = arrow.controlOffset;
          } else {
            // Calculate default based on curve type
            let curveFactor = 0.5;
            if (arrow.curveType === 'curve0') curveFactor = 0.25;
            else if (arrow.curveType === 'curve1') curveFactor = 0.5;
            else if (arrow.curveType === 'curve2') curveFactor = 0.95;
            
            const curveSign = arrow.direction === 'cw' ? 1 : -1;
            controlOffset = distance * curveFactor * curveSign;
          }
          
          const controlX = midX + perpX * controlOffset;
          const controlY = midY + perpY * controlOffset;
          
          // Draw control point with orange/yellow color - LARGER with shadow
          const controlSize = (isSelected || isHovered) ? circleSize + 2 : circleSize;
          
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = (isSelected || isHovered) ? 'rgba(255, 165, 0, 0.95)' : 'rgba(255, 193, 7, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          ctx.arc(controlX + offset.x, controlY + offset.y, controlSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          // Add inner circle for depth effect
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(controlX + offset.x - 2, controlY + offset.y - 2, controlSize / 2.5, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw dashed guide lines - ALWAYS visible for curved arrows
          ctx.strokeStyle = (isSelected || isHovered) ? 'rgba(150, 150, 150, 0.6)' : 'rgba(150, 150, 150, 0.35)';
          ctx.lineWidth = (isSelected || isHovered) ? 2 : 1.5;
          ctx.setLineDash([6, 4]);
          
          ctx.beginPath();
          ctx.moveTo(arrow.x1 + offset.x, arrow.y1 + offset.y);
          ctx.lineTo(controlX + offset.x, controlY + offset.y);
          ctx.lineTo(arrow.x2 + offset.x, arrow.y2 + offset.y);
          ctx.stroke();
          
          ctx.setLineDash([]);
          
          // Add small directional indicators on control points
          if (isSelected || isHovered) {
            // Small crosshair on middle control to show it's moveable
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(controlX + offset.x - 4, controlY + offset.y);
            ctx.lineTo(controlX + offset.x + 4, controlY + offset.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(controlX + offset.x, controlY + offset.y - 4);
            ctx.lineTo(controlX + offset.x, controlY + offset.y + 4);
            ctx.stroke();
          }
        } else {
          // Straight arrow control points with shadows
          const endX = arrow.x + arrow.length * Math.cos(arrow.angle);
          const endY = arrow.y + arrow.length * Math.sin(arrow.angle);
          
          // Start point with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          
          ctx.beginPath();
          ctx.arc(arrow.x + offset.x, arrow.y + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(arrow.x + offset.x - 2, arrow.y + offset.y - 2, circleSize / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add drag indicator (when selected/hovered)
          if (isSelected || isHovered) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5;
            const indicatorSize = 3;
            ctx.beginPath();
            ctx.moveTo(arrow.x + offset.x - indicatorSize, arrow.y + offset.y);
            ctx.lineTo(arrow.x + offset.x + indicatorSize, arrow.y + offset.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(arrow.x + offset.x, arrow.y + offset.y - indicatorSize);
            ctx.lineTo(arrow.x + offset.x, arrow.y + offset.y + indicatorSize);
            ctx.stroke();
          }
          
          // End point with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          
          ctx.beginPath();
          ctx.arc(endX + offset.x, endY + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(endX + offset.x - 2, endY + offset.y - 2, circleSize / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add drag indicator (when selected/hovered)
          if (isSelected || isHovered) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5;
            const indicatorSize = 3;
            ctx.beginPath();
            ctx.moveTo(endX + offset.x - indicatorSize, endY + offset.y);
            ctx.lineTo(endX + offset.x + indicatorSize, endY + offset.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(endX + offset.x, endY + offset.y - indicatorSize);
            ctx.lineTo(endX + offset.x, endY + offset.y + indicatorSize);
            ctx.stroke();
          }
        }
      });
      
      // Reset shadow settings
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Draw hovered molecule indicator
      if (hoveredMolecule && !isDraggingSelection && !draggingArrow) {
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.3)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        hoveredMolecule.bonds.forEach(bond => {
          ctx.beginPath();
          ctx.moveTo(bond.x1 + offset.x, bond.y1 + offset.y);
          ctx.lineTo(bond.x2 + offset.x, bond.y2 + offset.y);
          ctx.stroke();
        });
        
        hoveredMolecule.vertices.forEach(v => {
          ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(v.x + offset.x, v.y + offset.y, 12, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
      
      // Draw selected molecules (blue highlight)
      if (selectedMolecules.length > 0 && !draggingArrow) {
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.6)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        
        selectedMolecules.forEach(molecule => {
          molecule.bonds.forEach(bond => {
            ctx.beginPath();
            ctx.moveTo(bond.x1 + offset.x, bond.y1 + offset.y);
            ctx.lineTo(bond.x2 + offset.x, bond.y2 + offset.y);
            ctx.stroke();
          });
          
          molecule.vertices.forEach(v => {
            ctx.fillStyle = 'rgba(0, 123, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(v.x + offset.x, v.y + offset.y, 10, 0, 2 * Math.PI);
            ctx.fill();
          });
        });
      }
      
      // Draw thick overlay on selected arrows (but control points are drawn above)
      if (!draggingArrow) {
        selectedArrows.forEach(arrowIdx => {
          const arrow = arrows[arrowIdx];
          if (arrow) {
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            
            if (arrow.type === 'curved') {
              // Draw thicker curve overlay
              ctx.beginPath();
              ctx.moveTo(arrow.x1 + offset.x, arrow.y1 + offset.y);
              ctx.lineTo(arrow.x2 + offset.x, arrow.y2 + offset.y);
              ctx.stroke();
            } else {
              const endX = arrow.x + arrow.length * Math.cos(arrow.angle);
              const endY = arrow.y + arrow.length * Math.sin(arrow.angle);
              ctx.beginPath();
              ctx.moveTo(arrow.x + offset.x, arrow.y + offset.y);
              ctx.lineTo(endX + offset.x, endY + offset.y);
              ctx.stroke();
            }
          }
        });
      }
      
      // Draw control points for arrow being dragged (with emphasis on active point)
      if (draggingArrow !== null && draggingArrow < arrows.length) {
        const arrow = arrows[draggingArrow];
        
        if (arrow.type === 'curved') {
          const x1 = arrow.x1 + offset.x;
          const y1 = arrow.y1 + offset.y;
          const x2 = arrow.x2 + offset.x;
          const y2 = arrow.y2 + offset.y;
          
          // Calculate middle control point
          const midX = (arrow.x1 + arrow.x2) / 2;
          const midY = (arrow.y1 + arrow.y2) / 2;
          const arrowAngle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
          const perpAngle = arrowAngle + Math.PI / 2;
          const controlOffset = arrow.controlOffset || (arrow.direction === 'ccw' ? -40 : 40);
          const controlX = midX + Math.cos(perpAngle) * controlOffset + offset.x;
          const controlY = midY + Math.sin(perpAngle) * controlOffset + offset.y;
          
          // Draw all control points with shadows
          // Start point
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = draggingArrowEnd === 'start' ? 'rgba(255, 193, 7, 1)' : 'rgba(0, 123, 255, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x1, y1, draggingArrowEnd === 'start' ? 14 : 11, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(x1 - 2, y1 - 2, (draggingArrowEnd === 'start' ? 14 : 11) / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // End point
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = draggingArrowEnd === 'end' ? 'rgba(255, 193, 7, 1)' : 'rgba(0, 123, 255, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x2, y2, draggingArrowEnd === 'end' ? 14 : 11, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(x2 - 2, y2 - 2, (draggingArrowEnd === 'end' ? 14 : 11) / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Middle control point (curve adjustment)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = draggingArrowEnd === 'control' ? 'rgba(255, 193, 7, 1)' : 'rgba(255, 165, 0, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(controlX, controlY, draggingArrowEnd === 'control' ? 14 : 11, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(controlX - 2, controlY - 2, (draggingArrowEnd === 'control' ? 14 : 11) / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw guide lines
          ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(controlX, controlY);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Add crosshair indicators on all control points
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          const crossSize = 4;
          
          // Start point crosshair
          ctx.beginPath();
          ctx.moveTo(x1 - crossSize, y1);
          ctx.lineTo(x1 + crossSize, y1);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x1, y1 - crossSize);
          ctx.lineTo(x1, y1 + crossSize);
          ctx.stroke();
          
          // End point crosshair
          ctx.beginPath();
          ctx.moveTo(x2 - crossSize, y2);
          ctx.lineTo(x2 + crossSize, y2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x2, y2 - crossSize);
          ctx.lineTo(x2, y2 + crossSize);
          ctx.stroke();
          
          // Middle control crosshair
          ctx.beginPath();
          ctx.moveTo(controlX - crossSize, controlY);
          ctx.lineTo(controlX + crossSize, controlY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(controlX, controlY - crossSize);
          ctx.lineTo(controlX, controlY + crossSize);
          ctx.stroke();
        } else {
          const x = arrow.x + offset.x;
          const y = arrow.y + offset.y;
          const endX = x + arrow.length * Math.cos(arrow.angle);
          const endY = y + arrow.length * Math.sin(arrow.angle);
          
          // Draw start point with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = draggingArrowEnd === 'start' ? 'rgba(255, 193, 7, 1)' : 'rgba(0, 123, 255, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, draggingArrowEnd === 'start' ? 14 : 11, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(x - 2, y - 2, (draggingArrowEnd === 'start' ? 14 : 11) / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw end point with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = draggingArrowEnd === 'end' ? 'rgba(255, 193, 7, 1)' : 'rgba(0, 123, 255, 0.9)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(endX, endY, draggingArrowEnd === 'end' ? 14 : 11, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Inner highlight
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(endX - 2, endY - 2, (draggingArrowEnd === 'end' ? 14 : 11) / 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add crosshairs to both points
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          const crossSize = 5;
          
          // Start crosshair
          ctx.beginPath();
          ctx.moveTo(x - crossSize, y);
          ctx.lineTo(x + crossSize, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y - crossSize);
          ctx.lineTo(x, y + crossSize);
          ctx.stroke();
          
          // End crosshair
          ctx.beginPath();
          ctx.moveTo(endX - crossSize, endY);
          ctx.lineTo(endX + crossSize, endY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(endX, endY - crossSize);
          ctx.lineTo(endX, endY + crossSize);
          ctx.stroke();
        }
        
        // Reset shadow settings
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      
      // Draw selection box
      if (isSelecting) {
        const minX = Math.min(selectionStart.x, selectionEnd.x) + offset.x;
        const maxX = Math.max(selectionStart.x, selectionEnd.x) + offset.x;
        const minY = Math.min(selectionStart.y, selectionEnd.y) + offset.y;
        const maxY = Math.max(selectionStart.y, selectionEnd.y) + offset.y;
        
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
        ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        
        ctx.setLineDash([]);
      }
    }

    // Draw hovered vertex highlight (always visible, even during bond creation)
    // This is drawn last so it appears on top of everything else
    if (hoveredVertex && mode !== 'mouse') {
      ctx.fillStyle = 'rgba(0, 123, 255, 0.3)'; // Blue highlight color with transparency
      ctx.beginPath();
      ctx.arc(hoveredVertex.x + offset.x, hoveredVertex.y + offset.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [colors, segments, vertices, vertexAtoms, offset, isCreatingBond, bondStartPoint, bondPreviewEnd, hoveredVertex, hoveredBondIndex, bondSuggestions, hoveredSuggestionIndex, isDarkMode, arrows, mode, currentMousePosition, curvedArrowStartPoint, getAvailableBondAngles, shouldDisableAngleSnapping, hexRadius, vertexBondStates, selectedMolecules, selectedArrows, hoveredMolecule, hoveredArrow, isSelecting, selectionStart, selectionEnd, isDraggingSelection, selectedVertices, isPastePreviewMode, clipboard, pastePreviewPosition, draggingArrow, draggingArrowEnd]);

  // Redraw canvas when relevant data changes
  React.useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

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
            onClick={() => setModeAndClearSelection('mouse')}
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
            onClick={() => setModeAndClearSelection('text')}
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
            onClick={() => setModeAndClearSelection('plus')}
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
            onClick={() => setModeAndClearSelection('minus')}
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
            onClick={() => setModeAndClearSelection('lone')}
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
            onClick={() => setModeAndClearSelection('benzene')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'benzene' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'benzene') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'benzene') {
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
                  <line x1="40" y1="-10" x2="80" y2="12" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="42" y1="8" x2="66" y2="22" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 1: Single bond (right) */}
                <line x1="80" y1="12" x2="80" y2="60" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 2: Double bond (bottom-right) */}
                <g>
                  <line x1="80" y1="60" x2="40" y2="82" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="66" y1="52" x2="44" y2="65" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 3: Single bond (bottom-left) */}
                <line x1="40" y1="82" x2="0" y2="60" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 4: Double bond (left) */}
                <g>
                  <line x1="0" y1="60" x2="0" y2="12" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="14" y1="50" x2="14" y2="21" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 5: Single bond (top-left) */}
                <line x1="0" y1="12" x2="40" y2="-10" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclohexane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclohexane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclohexane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'cyclohexane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclohexane') {
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
                <line x1="40" y1="-10" x2="80" y2="12" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="12" x2="80" y2="60" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="60" x2="40" y2="82" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="40" y1="82" x2="0" y2="60" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="60" x2="0" y2="12" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="12" x2="40" y2="-10" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>

              </g>
            </svg>
          </button>
          
          {/* Cyclopentane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclopentane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclopentane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'cyclopentane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclopentane') {
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
                <line x1="40" y1="0" x2="80" y2="30" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="80" y1="30" x2="66" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="66" y1="80" x2="20" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="0" y1="30" x2="16" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="40" y1="0" x2="0" y2="30" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclobutane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclobutane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclobutane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'cyclobutane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclobutane') {
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
                <line x1="0" y1="0" x2="80" y2="0" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="0" x2="80" y2="80" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="80" x2="0" y2="80" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="0" y2="0" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclopropane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclopropane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclopropane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
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
            onMouseEnter={(e) => {
              if (mode !== 'cyclopropane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclopropane') {
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
                <line x1="80" y1="80" x2="40" y2="0" stroke={mode === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="80" y2="80" stroke={mode === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="40" y2="0" stroke={mode === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
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
            onClick={handleEraseAll}
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
            onClick={handleUndo}
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
        
        {/* Copy Button - only shows when something is selected */}
        {(selectedMolecules.length > 0 || selectedArrows.size > 0) && !isPastePreviewMode && (
          <button
            onClick={copySelectionToClipboard}
            className="toolbar-button"
            style={{
              width: '100%',
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: '#28a745',
              color: '#fff',
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.025)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
              fontWeight: 700,
              marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))',
              marginBottom: 'max(6px, calc(min(280px, 25vw) * 0.025))',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'max(6px, calc(min(280px, 25vw) * 0.025))'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.boxShadow = '0 4px 12px rgba(40,167,69,0.4), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
            }}
            title="Copy Selection (Cmd/Ctrl+C)"
          >
            {/* Copy Icon SVG */}
            <svg width="max(18px, calc(min(280px, 25vw) * 0.075))" height="max(18px, calc(min(280px, 25vw) * 0.075))" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
        )}
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
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            cursor: (isPasteMode || isPastePreviewMode) ? 'copy' : 
                   (draggingArrow !== null ? 'move' :
                   (mode === 'draw' && isCreatingBond ? 'crosshair' : 
                   (mode === 'draw' ? 'crosshair' : 
                   (mode === 'text' ? 'text' : 
                   (mode === 'mouse' && (hoveredArrow !== null || hoveredMolecule !== null) ? 'pointer' : 
                   (mode === 'mouse' ? 'default' : 'default')))))),
            display: 'block',
          }}
        />
      </div>
      {/* Atom text input - must be outside pointerEvents:none wrapper */}
      {showAtomInput && (
        <>
        {/* Overlay for dismissing input by clicking outside */}
        <div
          onClick={() => {}}
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
                // Allow letters and numbers for custom text labels
                const allowedChars = newValue.replace(/[^a-zA-Z0-9]/g, '');
                // Auto-capitalize letters only
                const capitalized = allowedChars.split('').map(char => 
                  /[a-z]/.test(char) ? char.toUpperCase() : char
                ).join('');
                setAtomInputValue(capitalized);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Handle text input completion
                  saveToHistory(); // Save before modifying atom text
                  handleTextInputComplete(
                    atomInputValue,
                    menuVertexKey,
                    { segments },
                    { setVertexAtoms, setShowAtomInput }
                  );
                }
              }}
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
              copySelectionToClipboard();
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
            {isPastePreviewMode ? (
              'Paste Mode: Active'
            ) : RING_PRESET_MODES.includes(mode) ? (
              `Preset: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`
            ) : (
              showSnapPreview ? (
                snapAlignment && snapAlignment.type === 'bond' ? 'Bond Snap: ON' : 'Grid Snap: ON'
              ) : 'Grid Snap: OFF'
            )}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9' }}>
            {isPastePreviewMode ? (
              'Click to place • ESC to cancel'
            ) : (mode === 'cyclopentane' || mode === 'cyclobutane' || mode === 'cyclopropane') ? 
             (snapAlignment && snapAlignment.type === 'bond' ? 'Snapping to bond' : 'Move near bond to snap') : 
             RING_PRESET_MODES.includes(mode) ? 'Click to place multiple' : 'Press G to toggle'}
          </div>
          {snapAlignment && showSnapPreview && !RING_PRESET_MODES.includes(mode) && (
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
            onClick={() => {
              setShowExportPopup(false);
              setExportImageUrl(null);
              setExportMetadata(null);
            }}
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
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  try {
                    const response = await fetch(exportImageUrl);
                    const blob = await response.blob();
                    
                    await navigator.clipboard.write([
                      new ClipboardItem({ 'image/png': blob })
                    ]);
                    
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
              onClick={() => {
                setShowExportPopup(false);
                setExportImageUrl(null);
                setExportMetadata(null);
              }}
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
          const hasDrawing =
            vertices.length > 0 ||
            segments.some((s) => s.bondOrder > 0) ||
            arrows.length > 0;
          return hasDrawing ? '70px' : '20px';
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
                  setExportImageUrl(result.imageUrl);
                  setExportMetadata({
                    width: result.width,
                    height: result.height,
                    scaleFactor: result.scaleFactor,
                  });
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