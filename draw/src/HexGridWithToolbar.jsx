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
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [atomInputPosition, setAtomInputPosition] = useState({ x: 0, y: 0 });
    const [historyIndex, setHistoryIndex] = useState(0);
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
    
    // Copy/paste state
    const [clipboard, setClipboard] = useState(null);
    const [pastePreviewPosition, setPastePreviewPosition] = useState({ x: 0, y: 0 });
    
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
    const [isPropertiesPanelExpanded, setIsPropertiesPanelExpanded] = useState(false);
    const [showExportPopup, setShowExportPopup] = useState(false);
    const [exportImageUrl, setExportImageUrl] = useState(null);
    
    // Placeholder function for renderCleanCanvas
    const renderCleanCanvas = async (resolution) => {
      return null; // Removed functionality
    };
    
    // Placeholder function for getActiveMolecule
    const getActiveMolecule = () => {
      return null; // Removed functionality
    };
    
    // Mode switching function
    const setModeAndClearSelection = (newMode) => {
      setMode(newMode);
      // Clear any selections when switching modes
      setSelectedSegments(new Set());
      setSelectedVertices(new Set());
      setSelectedArrows(new Set());
      setSelectedPreset(null);
    };
    
    // Preset switching function
    const setPresetAndClearMode = (presetName) => {
      setSelectedPreset(selectedPreset === presetName ? null : presetName);
      setMode('draw'); // Reset to draw mode when selecting presets
      // Clear any selections when switching presets
      setSelectedSegments(new Set());
      setSelectedVertices(new Set());
      setSelectedArrows(new Set());
    };
  
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
  }, [mode, isCreatingBond, bondStartPoint, vertices, segments, offset, hexRadius, bondSuggestions, findHoveredSuggestion, generateBondSuggestions, checkAndPerformVertexMerging, shouldDisableAngleSnapping, findClosestSnapAngle, updateVertexBondState, calculateBondDirection, molecularBoundaryRadius]);

  const handleCanvasMouseMove = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update current mouse position for text input positioning
    setCurrentMousePosition({ x, y });
    
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
  }, [mode, isCreatingBond, offset, bondStartPoint, hexRadius, vertices, segments, vertexThreshold, lineThreshold, bondSuggestions, shouldDisableAngleSnapping, findClosestSnapAngle, getAvailableBondAngles]);

  // Enhanced keyboard handler for text and bond creation
  const handleKeyDown = useCallback((event) => {
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
      const success = handleQuickElementKey(
        event.key,
        hoveredVertex,
        { vertexAtoms, segments },
        { setVertexAtoms }
      );
      if (success) return;
    }
  }, [isCreatingBond, hoveredVertex, showAtomInput, currentMousePosition, vertexAtoms, segments, curvedArrowStartPoint]);

  // Handle mouse leaving canvas - clear hover states
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredVertex(null);
    setHoveredBondIndex(null);
    setHoveredSuggestionIndex(null);
  }, []);

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
        // Use gray color for suggestions, blue if hovered
        ctx.strokeStyle = hoveredSuggestionIndex === index ? '#007bff' : '#888888';
        ctx.lineWidth = 3; // Same thickness as regular bonds
        ctx.lineCap = 'round';
        // Solid gray lines, same as bond preview
        ctx.beginPath();
        ctx.moveTo(suggestion.x1 + offset.x, suggestion.y1 + offset.y);
        ctx.lineTo(suggestion.x2 + offset.x, suggestion.y2 + offset.y);
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
      
      // Create gray preview colors
      const previewColors = { ...colors, bonds: '#888888' };
      
      // Render preview with appropriate style
      if (previewBond.bondType) {
        // Render stereochemistry preview in gray
        renderStereochemistryBond(ctx, previewBond, offset, previewColors);
      } else if (previewBond.bondOrder === 3) {
        // Triple bond preview - three gray lines
        const bondAngle = Math.atan2(bondPreviewEnd.y - bondStartPoint.y, bondPreviewEnd.x - bondStartPoint.x);
        const perpAngle = bondAngle + Math.PI / 2;
        const lineSpacing = 8.5; // Further spacing
        
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 3;
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
      ctx.strokeStyle = '#888888'; // Gray preview color
        ctx.lineWidth = 3;
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
      ctx.strokeStyle = isSnapping ? '#00CC00' : '#888888'; // Green when snapping
      ctx.fillStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.lineWidth = 2.5;
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
          ctx.fillStyle = 'rgba(0, 204, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(snapInfo.target.x + offset.x, snapInfo.target.y + offset.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        } else if (snapInfo.type === 'bond') {
          // Highlight the snap target bond
          ctx.strokeStyle = '#00CC00';
          ctx.lineWidth = 5;
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
      
      ctx.strokeStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.fillStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.lineWidth = 2.5;
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
      
      ctx.strokeStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.fillStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.lineWidth = 2.5;
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
      
      ctx.strokeStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.fillStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.lineWidth = 2.5;
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
      
      ctx.strokeStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.fillStyle = isSnapping ? '#00CC00' : '#888888';
      ctx.lineWidth = 2.5;
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

    // Draw hovered vertex highlight (always visible, even during bond creation)
    // This is drawn last so it appears on top of everything else
    if (hoveredVertex) {
      ctx.fillStyle = 'rgba(0, 123, 255, 0.3)'; // Blue highlight color with transparency
      ctx.beginPath();
      ctx.arc(hoveredVertex.x + offset.x, hoveredVertex.y + offset.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [colors, segments, vertices, vertexAtoms, offset, isCreatingBond, bondStartPoint, bondPreviewEnd, hoveredVertex, hoveredBondIndex, bondSuggestions, hoveredSuggestionIndex, isDarkMode, arrows, mode, currentMousePosition, curvedArrowStartPoint]);

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
            onClick={() => { 
              // handleEraseAll(); // Removed functionality 
              // clearSelection(); // Removed functionality 
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
            onClick={() => {}}
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
          onClick={handleCanvasClick}
          onMouseDown={() => {}}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={() => {}}
          onMouseLeave={handleCanvasMouseLeave}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            cursor: isPasteMode ? 'copy' : 
                   (mode === 'draw' && isCreatingBond ? 'crosshair' : 
                   (mode === 'draw' ? 'crosshair' : 
                   (mode === 'text' || mode === 'mouse' ? 'text' : 'default'))),
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
              // copySelection(); // Removed functionality
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
            {(mode === 'cyclopentane' || mode === 'cyclobutane' || mode === 'cyclopropane' || selectedPreset === 'chair') ? 
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