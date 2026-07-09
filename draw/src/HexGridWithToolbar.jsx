import React, { useRef, useState, useCallback } from 'react';
import logoFinal4 from '/logoFinal4.png';
import gearIcon from '/gear.png';
import { formatAtomText } from './utils/TextUtils.jsx';
import ToolPalette from './components/ToolPalette.jsx';
import { detectAllRingsEnhanced } from './rendering/RingDetectionUtils.js';
import { renderDoubleBondByCase } from './rendering/DoubleBondRenderer.js';
import {
  handleTextButtonClick, 
  handleEnterKeyOnVertex, 
  handleQuickElementKey,
  handleTextInputComplete 
} from './handlers/TextHandler.js';
import { renderAllAtomText, getAtomLabelHalfExtents } from './rendering/TextRenderer.js';
import { renderAllLonePairsAndCharges } from './rendering/LonePairRenderer.js';
import { renderAllStereochemistryBonds, renderStereochemistryBond } from './rendering/StereochemistryRenderer.js';
import {
  renderAllArrows,
  renderArrowPreview,
  renderArrow,
  getCurvedArrowMidHandleWorld,
  getCurvedArrowPerpAndAlong,
  strokeCurvedArrowShaft,
} from './rendering/ArrowRenderer.js';
import { calculateBenzeneSnap, calculateRingSnap } from './utils/SnapUtils.js';
import {
  computeCanvasContentBounds,
  exportCanvasCroppedSnapshot,
} from './utils/cleanExportCanvas.js';
import {
  calculateBondDirection,
  normalizeAngle,
  normalizeToSixtyDegrees,
  CHAIR_MIDDLE_VERTEX_INDEXES,
  getChairVertices,
  getChairSubstituentAngles,
  getNewmanProjectionGeometry,
} from './utils/geometry.js';
import { reassignAndDedupeBonds, mergeAtomLabels } from './utils/vertexMerge.js';
import { computeImplicitH } from './utils/valence.js';
import { getColorScheme } from './theme/colors.js';
import {
  findNearestVertex as findNearestVertexPure,
  findHoveredBondIndex,
  detectArrowPart as detectArrowPartPure,
  findHoveredArrowIndex,
} from './utils/hitTest.js';
import { buildMoleculeGraph } from './chemistry/moleculeGraph.js';
import { graphToSmiles } from './chemistry/exportStructure.js';
import { smilesToGraph } from './chemistry/importStructure.js';

const RING_PRESET_MODES = ['benzene', 'cyclohexane', 'cyclopentane', 'cyclobutane', 'cyclopropane', 'chair', 'newman'];

const HexGridWithToolbar = () => {
    const canvasRef = useRef(null);
    const isExportingRef = useRef(false);
    const curveControlDragRef = useRef(null);
    const newmanIdRef = useRef(1);
    
    // State variables needed for visual appearance
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showAboutPopup, setShowAboutPopup] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [mode, setMode] = useState('draw');
    const [isRotateArrowHovered, setIsRotateArrowHovered] = useState(false);
    const [atomInputValue, setAtomInputValue] = useState('');
    const [showAtomInput, setShowAtomInput] = useState(false);
    const [atomInputPosition, setAtomInputPosition] = useState({ x: 0, y: 0 });
    // Undo/redo history. Snapshots are captured *before* each mutation (callers
    // invoke saveToHistory() ahead of changing state). undoStackRef holds those
    // "before" states; redoStackRef holds states we've undone past. canUndo/canRedo
    // are mirrored into React state purely so the toolbar buttons re-render.
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isPasteMode, setIsPasteMode] = useState(false);
    const [selectedSegments, setSelectedSegments] = useState(new Set());
    const [selectedVertices, setSelectedVertices] = useState(new Set());
    const [selectedArrows, setSelectedArrows] = useState(new Set());
    
    // Core molecular data
    const [segments, setSegments] = useState([]);
    const [vertices, setVertices] = useState([]);
    const [vertexAtoms, setVertexAtoms] = useState({});
    const [arrows, setArrows] = useState([]);
    const [newmanInstances, setNewmanInstances] = useState([]);
    
    // UI interaction state
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [menuVertexKey, setMenuVertexKey] = useState(null);

    // Selection state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
    const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
    const [selectedMolecules, setSelectedMolecules] = useState([]); // Array of molecule vertex sets
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [dragSelectionStart, setDragSelectionStart] = useState({ x: 0, y: 0 });
    const [hoveredMolecule, setHoveredMolecule] = useState(null); // For hover preview
    const [hoveredArrow, setHoveredArrow] = useState(null); // Arrow under cursor
    const [draggingArrow, setDraggingArrow] = useState(null); // Arrow being dragged
    const [draggingArrowEnd, setDraggingArrowEnd] = useState(null); // Which end: 'start', 'end', or 'middle'
    const [justCompletedSelection, setJustCompletedSelection] = useState(false); // Prevent click after selection

    // Copy/paste state
    const [clipboard, setClipboard] = useState(null);
    const [pastePreviewPosition, setPastePreviewPosition] = useState({ x: 0, y: 0 });
    const [isPastePreviewMode, setIsPastePreviewMode] = useState(false);
    
    // Grid and snapping state
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

    // SMILES export result shown in the Settings dropdown
    // { smiles: string, warnings: string[], copied: boolean }
    const [smilesResult, setSmilesResult] = useState(null);

    // Build a SMILES string from the current drawing, show it, and copy it to
    // the clipboard. The chemistry lives in the framework-agnostic modules
    // under src/chemistry so this handler stays thin.
    const handleCopySmiles = useCallback(async () => {
      const graph = buildMoleculeGraph({ vertices, segments, vertexAtoms });
      const { smiles, warnings } = await graphToSmiles(graph);
      let copied = false;
      if (smiles) {
        try {
          await navigator.clipboard.writeText(smiles);
          copied = true;
        } catch {
          copied = false; // clipboard blocked (e.g. insecure context); still show the string
        }
      }
      setSmilesResult({ smiles, warnings, copied });
    }, [vertices, segments, vertexAtoms]);

    // SMILES import: text box + result message. The handler itself
    // (handleImportSmiles) is defined lower down, after the geometry/history
    // helpers it depends on are declared.
    const [smilesInput, setSmilesInput] = useState('');
    const [smilesImportMessage, setSmilesImportMessage] = useState(null); // { text, isError }

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
      setNewmanInstances([]);
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

    // Snapshot the document (drawable state) for the history stacks. A ref keeps
    // the freshest values available without recreating callbacks on every edit.
    const MAX_HISTORY = 100;
    const stateRef = useRef({});
    stateRef.current = { vertices, segments, vertexAtoms, arrows, newmanInstances, detectedRings, vertexBondStates };
    const snapshotDocument = () => JSON.parse(JSON.stringify(stateRef.current));
    const applyDocument = (snap) => {
      setVertices(JSON.parse(JSON.stringify(snap.vertices || [])));
      setSegments(JSON.parse(JSON.stringify(snap.segments || [])));
      setVertexAtoms(JSON.parse(JSON.stringify(snap.vertexAtoms || {})));
      setArrows(JSON.parse(JSON.stringify(snap.arrows || [])));
      setNewmanInstances(JSON.parse(JSON.stringify(snap.newmanInstances || [])));
      setDetectedRings(JSON.parse(JSON.stringify(snap.detectedRings || [])));
      setVertexBondStates(JSON.parse(JSON.stringify(snap.vertexBondStates || {})));
      // Any in-progress interaction no longer matches the restored document.
      setBondSuggestions([]);
      setIsCreatingBond(false);
      setBondStartPoint(null);
      setBondPreviewEnd(null);
      setCurvedArrowStartPoint(null);
    };
    const syncHistoryFlags = () => {
      setCanUndo(undoStackRef.current.length > 0);
      setCanRedo(redoStackRef.current.length > 0);
    };

    // Push the pre-mutation state so it can be restored. Callers invoke this
    // immediately before changing the document. A new edit invalidates the redo
    // stack, matching every editor's linear-history behaviour.
    const saveToHistory = useCallback(() => {
      undoStackRef.current.push(snapshotDocument());
      if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
      redoStackRef.current = [];
      syncHistoryFlags();
    }, []);

    // Undo: stash the current state for redo, then restore the most recent
    // "before" snapshot. (The old implementation restored index-1, skipping a
    // step and making the last action impossible to undo.)
    const handleUndo = useCallback(() => {
      if (undoStackRef.current.length === 0) return;
      redoStackRef.current.push(snapshotDocument());
      applyDocument(undoStackRef.current.pop());
      syncHistoryFlags();
    }, []);

    // Redo: inverse of undo.
    const handleRedo = useCallback(() => {
      if (redoStackRef.current.length === 0) return;
      undoStackRef.current.push(snapshotDocument());
      applyDocument(redoStackRef.current.pop());
      syncHistoryFlags();
    }, []);

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

    // Delete the current selection (molecules and/or arrows). Bound to
    // Delete/Backspace so selecting-then-deleting works like every other editor.
    const deleteSelection = useCallback(() => {
      if (selectedMolecules.length === 0 && selectedArrows.size === 0) return;
      saveToHistory();

      const removeKeys = new Set();
      selectedMolecules.forEach((m) =>
        m.vertices.forEach((v) => removeKeys.add(`${v.x.toFixed(2)},${v.y.toFixed(2)}`))
      );

      if (removeKeys.size > 0) {
        // Drop real bonds (bondOrder > 0) touching a removed atom; leave any grid
        // lines untouched.
        setSegments((prev) =>
          prev.filter((seg) => {
            if (!(seg.bondOrder > 0)) return true;
            const k1 = `${seg.x1.toFixed(2)},${seg.y1.toFixed(2)}`;
            const k2 = `${seg.x2.toFixed(2)},${seg.y2.toFixed(2)}`;
            return !(removeKeys.has(k1) || removeKeys.has(k2));
          })
        );
        setVertices((prev) =>
          prev.filter((v) => !removeKeys.has(`${v.x.toFixed(2)},${v.y.toFixed(2)}`))
        );
        setVertexAtoms((prev) => {
          const next = { ...prev };
          removeKeys.forEach((k) => delete next[k]);
          return next;
        });
        setVertexBondStates((prev) => {
          const next = { ...prev };
          removeKeys.forEach((k) => delete next[k]);
          return next;
        });
      }

      if (selectedArrows.size > 0) {
        setArrows((prev) => prev.filter((_, i) => !selectedArrows.has(i)));
      }

      setSelectedMolecules([]);
      setSelectedVertices(new Set());
      setSelectedSegments(new Set());
      setSelectedArrows(new Set());
      setHoveredMolecule(null);
      // Ring detection re-runs automatically via detectedRingsMemo when
      // segments/vertices change, so no manual trigger is needed here.
    }, [selectedMolecules, selectedArrows, saveToHistory]);

  // Color scheme function - returns appropriate colors based on dark mode
  // Color palette lives in ./theme/colors.js; select by the current theme.
  const colors = getColorScheme(isDarkMode);

  // Drawing constants
  const hexRadius = 60; // Standard bond length (doubled from 30 to 60)
  const vertexThreshold = 15; // Distance for vertex detection
  const lineThreshold = 8; // Distance for line detection
  const mergeThreshold = 20; // Distance for vertex merging
  const snapAngleTolerance = 20 * (Math.PI / 180); // 20 degrees in radians
  const molecularBoundaryRadius = 60; // Radius around existing molecules to prevent new vertex creation (safe zone)
  
  // Common bond angles (in radians): 60°, 120°, 180°, 240°, 300°, 0° (rotated by +30° from previous)
  const snapAngles = [Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3, 0];

  // Pure bond-angle helpers (calculateBondDirection, normalizeAngle,
  // normalizeToSixtyDegrees) now live in ./utils/geometry.js.

  // Helper function to find the closest snap angle for a specific vertex
  const findClosestSnapAngle = (targetAngle, startVertex = null) => {
    const normalizedAngle = normalizeAngle(targetAngle);
    let closestAngle = null;
    let minDifference = Infinity;

    // Get valid angles for this vertex, or use general snap angles if no vertex specified
    const validAngles = startVertex ? getAvailableBondAngles(startVertex) : snapAngles;
    const startVertexKey = startVertex ? getVertexKey(startVertex) : null;
    const hasConstrainedAngles = startVertexKey
      ? !!(vertexBondStates[startVertexKey]?.constrainedAngles && vertexBondStates[startVertexKey].constrainedAngles.length > 0)
      : false;

    for (const snapAngle of validAngles) {
      // Calculate the difference, considering the circular nature of angles
      let diff = Math.abs(normalizedAngle - snapAngle);
      if (diff > Math.PI) {
        diff = 2 * Math.PI - diff;
      }

      if (diff < minDifference && (hasConstrainedAngles || diff <= snapAngleTolerance)) {
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
    const vertexKey = getVertexKey(startVertex);
    if (vertexBondStates[vertexKey]?.constrainedAngles?.length) {
      return false;
    }
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

  const revealNewmanRotateControlForVertex = useCallback((vertex) => {
    if (!vertex?.newmanId) return;
    if (vertex.newmanRole !== 'frontOuter' && vertex.newmanRole !== 'backOuter') return;
    const now = Date.now();
    setNewmanInstances(prev =>
      prev.map(instance =>
        instance.id === vertex.newmanId
          ? { ...instance, showRotateControl: true, lastTouchedAt: now }
          : instance
      )
    );
  }, []);

  const revealNewmanRotateControlForBond = useCallback((bond) => {
    if (!bond) return;
    let targetNewmanId = bond.newmanId || null;
    if (!targetNewmanId) {
      // Fallback: infer from endpoint vertices for bonds created/edited after placement.
      const endpointMatches = vertices.filter(v =>
        (Math.abs(v.x - bond.x1) < 0.01 && Math.abs(v.y - bond.y1) < 0.01) ||
        (Math.abs(v.x - bond.x2) < 0.01 && Math.abs(v.y - bond.y2) < 0.01)
      );
      const newmanVertex = endpointMatches.find(v => !!v.newmanId);
      targetNewmanId = newmanVertex?.newmanId || null;
    }
    if (!targetNewmanId) return;
    const now = Date.now();
    setNewmanInstances(prev =>
      prev.map(instance =>
        instance.id === targetNewmanId
          ? { ...instance, showRotateControl: true, lastTouchedAt: now }
          : instance
      )
    );
  }, [vertices]);

  const hideNewmanRotateControls = useCallback(() => {
    setNewmanInstances(prev =>
      prev.map(instance =>
        instance.showRotateControl ? { ...instance, showRotateControl: false } : instance
      )
    );
  }, []);

  // Helper for chair conformation preset geometry
  // Chair/Newman projection geometry (getChairVertices, getChairSubstituentAngles,
  // getNewmanProjectionGeometry) and CHAIR_MIDDLE_VERTEX_INDEXES now live in
  // ./utils/geometry.js.

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

    if (bondState?.constrainedAngles && bondState.constrainedAngles.length > 0) {
      return bondState.constrainedAngles;
    }
    
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
    
    setVertexBondStates(prevStates => {
      const currentState = prevStates[vertexKey] || { bondAngles: [], orientation: null };
      const newBondAngles = [...currentState.bondAngles];
      const normalizedAngle = currentState.constrainedAngles && currentState.constrainedAngles.length > 0
        ? currentState.constrainedAngles.reduce((closest, candidate) => {
            let currentDiff = Math.abs(normalizeAngle(bondAngle) - candidate);
            if (currentDiff > Math.PI) currentDiff = (2 * Math.PI) - currentDiff;
            let closestDiff = Math.abs(normalizeAngle(bondAngle) - closest);
            if (closestDiff > Math.PI) closestDiff = (2 * Math.PI) - closestDiff;
            return currentDiff < closestDiff ? candidate : closest;
          }, currentState.constrainedAngles[0])
        : normalizeToSixtyDegrees(bondAngle);
      
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
          orientation: orientation,
          constrainedAngles: currentState.constrainedAngles || null,
          noMerge: !!currentState.noMerge
        }
      };
    });
  }, []);

  // Helper function to get available bond angles for a vertex
  const getAvailableBondAngles = (vertex) => {
    const vertexKey = getVertexKey(vertex);
    const bondState = vertexBondStates[vertexKey];
    const validAngles = getValidAnglesForVertex(vertex);

    // Chair-constrained vertices should always expose both axial/equatorial directions.
    if (bondState?.constrainedAngles?.length) {
      return validAngles;
    }
    
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

  // Parse a SMILES string and add the resulting structure to the canvas,
  // centered in the current view. Carbons stay implicit (no vertexAtoms entry);
  // heteroatoms and charged atoms get an atom label. Defined here (not with the
  // other SMILES state near the top) so its geometry/history dependencies exist.
  const handleImportSmiles = useCallback(async () => {
    const { atoms, bonds, warnings } = await smilesToGraph(smilesInput, { bondLength: hexRadius });
    if (atoms.length === 0) {
      setSmilesImportMessage({ text: warnings[0] || 'Could not import that SMILES.', isError: true });
      return;
    }

    // Place the fragment at the center of the visible canvas (world coords).
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : { width: 800, height: 600 };
    const worldCenterX = rect.width / 2 - offset.x;
    const worldCenterY = rect.height / 2 - offset.y;

    const newVertices = atoms.map((a) => ({
      x: +(worldCenterX + a.x).toFixed(2),
      y: +(worldCenterY + a.y).toFixed(2),
      isOffGrid: false,
    }));

    const newVertexAtoms = {};
    atoms.forEach((a, i) => {
      if (a.element !== 'C' || a.charge !== 0) {
        const key = `${newVertices[i].x.toFixed(2)},${newVertices[i].y.toFixed(2)}`;
        newVertexAtoms[key] = { symbol: a.element, charge: a.charge || 0, implicitH: 0, lonePairs: 0 };
      }
    });

    const newSegments = bonds.map((b) => {
      const A = newVertices[b.from];
      const B = newVertices[b.to];
      return {
        x1: A.x, y1: A.y, x2: B.x, y2: B.y,
        bondOrder: b.order,
        bondType: null,
        bondDirection: 1,
        direction: calculateBondDirection(A.x, A.y, B.x, B.y),
        flipSmallerLine: false,
      };
    });

    saveToHistory();
    setVertices((prev) => [...prev, ...newVertices]);
    setSegments((prev) => [...prev, ...newSegments]);
    setVertexAtoms((prev) => ({ ...prev, ...newVertexAtoms }));
    setTimeout(() => updateRingDetection(), 0);

    setSmilesInput('');
    setSmilesImportMessage({
      text: `Added ${atoms.length} atom${atoms.length === 1 ? '' : 's'} to the canvas.`,
      isError: false,
    });
  }, [smilesInput, hexRadius, offset, saveToHistory, updateRingDetection]);

  // Double-bond rendering (findBondRing / renderDoubleBondByCase) now lives in
  // ./rendering/DoubleBondRenderer.js.

  // Thin wrappers over the pure hit-testers in ./utils/hitTest.js; convert the
  // incoming screen coords to world coords using the current pan offset.
  const findNearestVertex = (x, y) =>
    findNearestVertexPure(vertices, x - offset.x, y - offset.y, vertexThreshold);

  const findHoveredBond = (x, y) =>
    findHoveredBondIndex(segments, x - offset.x, y - offset.y, lineThreshold);

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

  // Thin wrappers over the pure arrow hit-testers in ./utils/hitTest.js.
  const detectArrowPart = useCallback(
    (x, y, arrowIndex) => detectArrowPartPure(arrows, arrowIndex, x - offset.x, y - offset.y),
    [arrows, offset]
  );

  const findHoveredArrow = (x, y) =>
    findHoveredArrowIndex(arrows, x - offset.x, y - offset.y);

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
    const startVertexIsConstrained = !!vertexBondStates[getVertexKey(startVertex)]?.constrainedAngles?.length;
    const endVertexIsConstrained = !!vertexBondStates[getVertexKey(endVertex)]?.constrainedAngles?.length;
    
    // Check if either vertex has a triple bond (requires linear geometry)
    const endHasTriple = hasTripleBond(endVertex);
    const startHasTriple = hasTripleBond(startVertex);
    
    // Generate suggestions from the END vertex (x2, y2) - only if it has fewer than 3 bonds
    // Skip if this end connects to a triple bond (use linear geometry from other end)
    if ((endVertexIsConstrained ? endVertexBondCount < 4 : endVertexBondCount < 3) && !endHasTriple.hasTriple) {
      const availableEndAngles = getAvailableBondAngles(endVertex);

      if (endVertexIsConstrained) {
        // Chair vertices: only ever show the explicit constrained directions.
        availableEndAngles.forEach((angle, index) => {
          suggestions.push({
            id: `end-constrained-${index}`,
            x1: lastBond.x2,
            y1: lastBond.y2,
            x2: lastBond.x2 + Math.cos(angle) * hexRadius,
            y2: lastBond.y2 + Math.sin(angle) * hexRadius,
            angle,
            fromVertex: { x: lastBond.x2, y: lastBond.y2 }
          });
        });
      } else {
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
    }
    
    // Generate suggestions from the START vertex (x1, y1) - only if it has fewer than 3 bonds
    // Skip if this end connects to a triple bond (use linear geometry from other end)
    if ((startVertexIsConstrained ? startVertexBondCount < 4 : startVertexBondCount < 3) && !startHasTriple.hasTriple) {
      const availableStartAngles = getAvailableBondAngles(startVertex);

      if (startVertexIsConstrained) {
        // Chair vertices: only ever show the explicit constrained directions.
        availableStartAngles.forEach((angle, index) => {
          suggestions.push({
            id: `start-constrained-${index}`,
            x1: lastBond.x1,
            y1: lastBond.y1,
            x2: lastBond.x1 + Math.cos(angle) * hexRadius,
            y2: lastBond.y1 + Math.sin(angle) * hexRadius,
            angle,
            fromVertex: { x: lastBond.x1, y: lastBond.y1 }
          });
        });
      } else {
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
    }
    
    return suggestions;
  }, [hexRadius, segments, countVertexBonds, getAvailableBondAngles, normalizeToSixtyDegrees, vertexBondStates]);

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
        if (vertex1.noMerge || vertex2.noMerge) continue;
        const vertex1State = vertexBondStates[getVertexKey(vertex1)];
        const vertex2State = vertexBondStates[getVertexKey(vertex2)];
        const vertex1Protected = !!(vertex1State?.constrainedAngles?.length || vertex1State?.noMerge);
        const vertex2Protected = !!(vertex2State?.constrainedAngles?.length || vertex2State?.noMerge);
        if (vertex1Protected || vertex2Protected) continue;
        
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
  }, [vertices, mergeThreshold, vertexBondStates]);

  // Helper function to perform vertex merging.
  //
  // The merge keeps vertex1 (the older/existing vertex — findVerticesToMerge
  // always orders the pair by index, and freshly-placed vertices are appended)
  // exactly where it is, and snaps vertex2 onto it. This is the ChemDraw/Marvin
  // behavior: dropping a new atom onto an existing one connects to it without
  // shifting the existing structure (the old code averaged the two positions,
  // which nudged the whole molecule). It also reassigns bonds, drops the
  // zero-length self-loop and any duplicate bond the merge would create, and
  // preserves the more meaningful atom label.
  const performVertexMerge = useCallback((mergeOperation) => {
    const { vertex1: keep, vertex2: remove } = mergeOperation;
    const near = (a, b) => Math.abs(a - b) < 0.01;
    const keepKey = getVertexKey(keep);
    const removeKey = getVertexKey(remove);

    // Remove the newer vertex; the kept vertex stays put.
    setVertices(prevVertices =>
      prevVertices.filter(v => !(near(v.x, remove.x) && near(v.y, remove.y)))
    );

    // Reassign the removed vertex's bonds onto the kept vertex, then clean up
    // self-loops and duplicate bonds (pure helper, unit-tested).
    setSegments(prevSegments =>
      reassignAndDedupeBonds(prevSegments, keep, remove, calculateBondDirection)
    );

    // Merge atom labels, preferring a real element label.
    setVertexAtoms(prevAtoms => mergeAtomLabels(prevAtoms, keepKey, removeKey));

    // Migrate any per-vertex bond state onto the kept vertex.
    setVertexBondStates(prevStates => {
      if (!prevStates[removeKey] && !prevStates[keepKey]) return prevStates;
      const next = { ...prevStates };
      const merged = next[keepKey] || next[removeKey];
      delete next[removeKey];
      if (merged) next[keepKey] = merged;
      return next;
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
        revealNewmanRotateControlForVertex(clickedVertex);
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

    // Hide Newman rotate controls on general non-Newman interactions.
    // Newman-specific handlers will explicitly re-show when relevant.
    if (mode !== 'newman') {
      hideNewmanRotateControls();
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

    // Handle chair conformation mode clicks (cyclohexane chair projection)
    if (mode === 'chair') {
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
      const isFlippedChair = false;
      const chairVertices = getChairVertices(centerX, centerY, hexRadius, rotationOffset, isFlippedChair);
      const chairBonds = [];
      const chairSubstituentAngles = getChairSubstituentAngles(chairVertices, centerX, centerY, isFlippedChair);

      for (let i = 0; i < chairVertices.length; i++) {
        const nextIndex = (i + 1) % chairVertices.length;
        chairBonds.push({
          x1: chairVertices[i].x,
          y1: chairVertices[i].y,
          x2: chairVertices[nextIndex].x,
          y2: chairVertices[nextIndex].y,
          bondOrder: 1,
          bondType: null,
          bondDirection: 1,
          direction: calculateBondDirection(
            chairVertices[i].x,
            chairVertices[i].y,
            chairVertices[nextIndex].x,
            chairVertices[nextIndex].y
          ),
          flipSmallerLine: false
        });
      }

      saveToHistory();
      setVertices(prev => [...prev, ...chairVertices]);
      setSegments(prev => [...prev, ...chairBonds]);
      setVertexBondStates(prev => {
        const updated = { ...prev };
        chairVertices.forEach((vertex, index) => {
          const key = getVertexKey(vertex);
          const constrainedAngles = [
            chairSubstituentAngles[index].axialAngle,
            chairSubstituentAngles[index].equatorialAngle
          ];
          updated[key] = {
            bondAngles: [],
            orientation: null,
            constrainedAngles
          };
        });
        return updated;
      });
      setMode('draw');
      setTimeout(() => updateRingDetection(), 0);
      return;
    }

    // Handle Newman projection mode clicks
    if (mode === 'newman') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = x - offset.x;
      const worldY = y - offset.y;
      const newmanRadius = hexRadius * 0.68;
      const newmanId = `newman-${newmanIdRef.current++}`;
      const geometry = getNewmanProjectionGeometry(
        worldX,
        worldY,
        newmanRadius,
        60,
        0
      );

      const centerVertex = { x: worldX, y: worldY, isOffGrid: true, noMerge: true, newmanId, newmanRole: 'frontCenter' };
      const frontVertices = geometry.frontEndpoints.map((point, index) => ({ ...point, isOffGrid: true, noMerge: true, newmanId, newmanRole: 'frontOuter', newmanIndex: index }));
      const backVertices = geometry.backEndpoints.map((point, index) => ({ ...point, isOffGrid: true, noMerge: true, newmanId, newmanRole: 'backOuter', newmanIndex: index }));
      const newmanVertices = [
        centerVertex,
        ...frontVertices,
        ...backVertices
      ];

      const newmanBonds = [];

      frontVertices.forEach(front => {
        newmanBonds.push({
          x1: centerVertex.x,
          y1: centerVertex.y,
          x2: front.x,
          y2: front.y,
          bondOrder: 1,
          bondType: null,
          bondDirection: 1,
          direction: calculateBondDirection(centerVertex.x, centerVertex.y, front.x, front.y),
          flipSmallerLine: false,
          newmanId,
          newmanRole: 'front'
        });
      });

      for (let i = 0; i < geometry.backStarts.length; i++) {
        const start = geometry.backStarts[i];
        const end = geometry.backEndpoints[i];
        newmanBonds.push({
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          bondOrder: 1,
          bondType: null,
          bondDirection: 1,
          direction: calculateBondDirection(start.x, start.y, end.x, end.y),
          flipSmallerLine: false,
          newmanId,
          newmanRole: 'back',
          newmanIndex: i
        });
      }

      saveToHistory();
      setVertices(prev => [...prev, ...newmanVertices]);
      setSegments(prev => [...prev, ...newmanBonds]);
      setNewmanInstances(prev => [
        ...prev,
        {
          id: newmanId,
          x: worldX,
          y: worldY,
          radius: newmanRadius,
          backRotationDeg: 60,
          nextStepDeg: 75,
          showRotateControl: true,
          lastTouchedAt: Date.now()
        }
      ]);
      setVertexBondStates(prev => {
        const updated = { ...prev };
        newmanVertices.forEach(vertex => {
          const key = getVertexKey(vertex);
          updated[key] = {
            ...(updated[key] || { bondAngles: [], orientation: null, constrainedAngles: null }),
            noMerge: true
          };
        });
        return updated;
      });
      setMode('draw');
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
      revealNewmanRotateControlForVertex(clickedVertex);
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
        const fromVertexKey = getVertexKey(suggestion.fromVertex);
        const fromVertexIsChair = !!vertexBondStates[fromVertexKey]?.constrainedAngles?.length;
        
        updateVertexBondState(suggestion.fromVertex, bondAngle);
        updateVertexBondState(newVertex, reverseBondAngle);
        revealNewmanRotateControlForVertex(suggestion.fromVertex);
        revealNewmanRotateControlForBond(newBond);
        if (fromVertexIsChair) {
          const newVertexKey = getVertexKey(newVertex);
          setVertexBondStates(prevStates => ({
            ...prevStates,
            [newVertexKey]: {
              ...(prevStates[newVertexKey] || { bondAngles: [], orientation: null, constrainedAngles: null }),
              noMerge: true
            }
          }));
        }
        
        // Generate new suggestions from this bond
        setTimeout(() => {
          setBondSuggestions(generateBondSuggestions(newBond));
          // Update ring detection after new bond
          updateRingDetection();
          // Check for vertex merging after state updates
          if (!fromVertexIsChair) {
            setTimeout(() => checkAndPerformVertexMerging(), 10);
          }
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
      revealNewmanRotateControlForBond(clickedBond);
      
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
        const startKey = getVertexKey(bondStartPoint);
        const clickedKey = getVertexKey(completionClickedVertex);
        const startIsChairVertex = !!vertexBondStates[startKey]?.constrainedAngles?.length;
        const clickedIsChairVertex = !!vertexBondStates[clickedKey]?.constrainedAngles?.length;

        // For chair vertices, clicking another chair vertex should switch selection,
        // not create a new bond between chair framework vertices.
        if (startIsChairVertex && clickedIsChairVertex) {
          setBondStartPoint(completionClickedVertex);
          setBondPreviewEnd(null);
          return;
        }

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
        revealNewmanRotateControlForBond(overlappingBond);
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
        const startVertexKey = getVertexKey(bondStartPoint);
        const endVertexKey = getVertexKey(endVertex);
        const startVertexIsChair = !!vertexBondStates[startVertexKey]?.constrainedAngles?.length;
        const endVertexIsChair = !!vertexBondStates[endVertexKey]?.constrainedAngles?.length;
        const chairSubstituentInvolved = startVertexIsChair || endVertexIsChair;
        
        updateVertexBondState(bondStartPoint, bondAngle);
        updateVertexBondState(endVertex, reverseBondAngle);
        revealNewmanRotateControlForVertex(bondStartPoint);
        revealNewmanRotateControlForVertex(endVertex);
        revealNewmanRotateControlForBond(newBond);
        if (startVertexIsChair && !endVertexIsChair) {
          setVertexBondStates(prevStates => ({
            ...prevStates,
            [endVertexKey]: {
              ...(prevStates[endVertexKey] || { bondAngles: [], orientation: null, constrainedAngles: null }),
              noMerge: true
            }
          }));
        } else if (endVertexIsChair && !startVertexIsChair) {
          setVertexBondStates(prevStates => ({
            ...prevStates,
            [startVertexKey]: {
              ...(prevStates[startVertexKey] || { bondAngles: [], orientation: null, constrainedAngles: null }),
              noMerge: true
            }
          }));
        }
        
        // Generate bond suggestions from the newly created bond
        setTimeout(() => {
          setBondSuggestions(generateBondSuggestions(newBond));
          // Update ring detection after new bond
          updateRingDetection();
          // Check for vertex merging after state updates
          if (!chairSubstituentInvolved) {
            setTimeout(() => checkAndPerformVertexMerging(), 10);
          }
        }, 0);
        return newSegments;
      });
      
      // Reset bond creation state
      setIsCreatingBond(false);
      setBondStartPoint(null);
      setBondPreviewEnd(null);
    }
  }, [mode, isCreatingBond, bondStartPoint, vertices, segments, offset, hexRadius, bondSuggestions, findHoveredSuggestion, generateBondSuggestions, checkAndPerformVertexMerging, shouldDisableAngleSnapping, findClosestSnapAngle, updateVertexBondState, calculateBondDirection, molecularBoundaryRadius, justCompletedSelection, clipboard, isPastePreviewMode, updateRingDetection, saveToHistory, vertexAtoms, arrows, findMolecule, findHoveredArrow, vertexBondStates, revealNewmanRotateControlForVertex, revealNewmanRotateControlForBond, hideNewmanRotateControls]);

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
              return { ...arrow, x1: worldX, y1: worldY };
            } else if (draggingArrowEnd === 'end') {
              return { ...arrow, x2: worldX, y2: worldY };
            } else if (draggingArrowEnd === 'control') {
              const midX = (arrow.x1 + arrow.x2) / 2;
              const midY = (arrow.y1 + arrow.y2) / 2;
              const dx = arrow.x2 - arrow.x1;
              const dy = arrow.y2 - arrow.y1;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance === 0) return arrow;

              const perpX = -dy / distance;
              const perpY = dx / distance;
              const ux = dx / distance;
              const uy = dy / distance;

              const ref = curveControlDragRef.current;
              const toMouseX = worldX - midX;
              const toMouseY = worldY - midY;
              if (ref) {
                const currentPerp = toMouseX * perpX + toMouseY * perpY;
                const currentAlong = toMouseX * ux + toMouseY * uy;
                return {
                  ...arrow,
                  controlOffset:
                    ref.initialPerp + (currentPerp - ref.startMousePerp),
                  controlAlong:
                    ref.initialAlong + (currentAlong - ref.startMouseAlong),
                };
              }
              return {
                ...arrow,
                controlOffset: toMouseX * perpX + toMouseY * perpY,
                controlAlong: toMouseX * ux + toMouseY * uy,
              };
            } else if (draggingArrowEnd === 'body') {
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      handleUndo();
      return;
    }

    // Handle Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y for redo
    if ((event.metaKey || event.ctrlKey) && ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y')) {
      event.preventDefault();
      handleRedo();
      return;
    }

    // Handle Delete/Backspace to remove the current selection
    if ((event.key === 'Delete' || event.key === 'Backspace') && !showAtomInput &&
        (selectedMolecules.length > 0 || selectedArrows.size > 0)) {
      event.preventDefault();
      deleteSelection();
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
  }, [isCreatingBond, hoveredVertex, showAtomInput, currentMousePosition, vertexAtoms, segments, curvedArrowStartPoint, handleUndo, handleRedo, saveToHistory, copySelectionToClipboard, deleteSelection, selectedMolecules, selectedArrows, updateRingDetection, isPastePreviewMode]);

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
      const arrow = arrows[arrowIdx];
      if (arrowPart === 'control' && arrow?.type === 'curved') {
        const midX = (arrow.x1 + arrow.x2) / 2;
        const midY = (arrow.y1 + arrow.y2) / 2;
        const dx = arrow.x2 - arrow.x1;
        const dy = arrow.y2 - arrow.y1;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / d;
        const perpY = dx / d;
        const ux = dx / d;
        const uy = dy / d;
        const { perp: initialPerp, along: initialAlong } = getCurvedArrowPerpAndAlong(arrow);
        curveControlDragRef.current = {
          startMousePerp: (worldX - midX) * perpX + (worldY - midY) * perpY,
          startMouseAlong: (worldX - midX) * ux + (worldY - midY) * uy,
          initialPerp,
          initialAlong,
        };
      } else {
        curveControlDragRef.current = null;
      }
      saveToHistory(); // Save before editing arrow
      // Clear molecule/vertex selection so the floating Copy UI does not stay up from a prior marquee.
      setSelectedVertices(new Set());
      setSelectedSegments(new Set());
      setSelectedMolecules([]);
      setSelectedArrows(prev => {
        const next = new Set(prev);
        next.add(arrowIdx);
        return next;
      });
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
  }, [mode, offset, arrows, selectedMolecules, selectedVertices, selectedArrows, findNearestVertex, findHoveredArrow, saveToHistory, isPastePreviewMode, detectArrowPart]);

  // Handle mouse up for completing drag or selection
  const handleCanvasMouseUp = useCallback((event) => {
    if (mode !== 'mouse') return;
    
    // Complete arrow dragging
    if (draggingArrow !== null) {
      curveControlDragRef.current = null;
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
      // If a Newman substituent label changed, re-show the rotate control for that instance.
      const changedKeys = new Set([
        ...Object.keys(prevVertexAtomsRef.current),
        ...Object.keys(vertexAtoms)
      ]);
      changedKeys.forEach((key) => {
        const before = prevVertexAtomsRef.current[key];
        const after = vertexAtoms[key];
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          const [xStr, yStr] = key.split(',');
          const x = parseFloat(xStr);
          const y = parseFloat(yStr);
          const vertex = vertices.find(
            (v) => Math.abs(v.x - x) < 0.01 && Math.abs(v.y - y) < 0.01
          );
          if (vertex) {
            revealNewmanRotateControlForVertex(vertex);
          }
        }
      });

      // Don't clear if we're in the middle of creating a bond
      if (!isCreatingBond) {
        setBondSuggestions([]);
      }
    }
    prevVertexAtomsRef.current = vertexAtoms;
  }, [vertexAtoms, isCreatingBond, vertices, revealNewmanRotateControlForVertex]);

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

    // Draw Newman projection circles as non-interactive visual guides.
    newmanInstances.forEach(circle => {
      ctx.strokeStyle = colors.bonds;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(circle.x + offset.x, circle.y + offset.y, circle.radius, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Draw existing bonds - handle stereochemistry, single, and double bonds
    ctx.lineCap = 'round'; // Rounded line ends
    
    // First pass: Render stereochemistry bonds
    const stereoBondIndices = renderAllStereochemistryBonds(ctx, segments, offset, colors);

    const vertexByKey = new Map();
    vertices.forEach((vv) => vertexByKey.set(`${vv.x.toFixed(2)},${vv.y.toFixed(2)}`, vv));

    // Per labeled vertex, accumulate the sum of bond orders (for implicit H) and
    // the net horizontal direction toward its neighbors (for label-direction
    // flipping).
    const bondOrderSumByKey = new Map();
    const neighborDxByKey = new Map();
    segments.forEach((seg) => {
      if (!(seg.bondOrder > 0)) return;
      const k1 = `${seg.x1.toFixed(2)},${seg.y1.toFixed(2)}`;
      const k2 = `${seg.x2.toFixed(2)},${seg.y2.toFixed(2)}`;
      bondOrderSumByKey.set(k1, (bondOrderSumByKey.get(k1) || 0) + seg.bondOrder);
      bondOrderSumByKey.set(k2, (bondOrderSumByKey.get(k2) || 0) + seg.bondOrder);
      neighborDxByKey.set(k1, (neighborDxByKey.get(k1) || 0) + (seg.x2 - seg.x1));
      neighborDxByKey.set(k2, (neighborDxByKey.get(k2) || 0) + (seg.x1 - seg.x2));
    });

    // Atom map augmented with computed implicit hydrogens. Used for both the
    // label clearance boxes and the text render so widths stay consistent.
    // A user who explicitly typed hydrogens (implicitH already set, or a label
    // that isn't a bare element) is left untouched. When implicit H is added and
    // the atom's neighbors sit to its right, flag the label to flip ("H₂N")
    // so the connecting element stays nearest the bond.
    const displayVertexAtoms = {};
    Object.entries(vertexAtoms).forEach(([key, atom]) => {
      if (!atom || !atom.symbol) { displayVertexAtoms[key] = atom; return; }
      if (atom.implicitH) { displayVertexAtoms[key] = atom; return; }
      const implicitH = computeImplicitH(atom.symbol, atom.charge || 0, bondOrderSumByKey.get(key) || 0);
      if (implicitH > 0) {
        const flip = (neighborDxByKey.get(key) || 0) > 0.01;
        displayVertexAtoms[key] = { ...atom, implicitH, _flipHydrogens: flip };
      } else {
        displayVertexAtoms[key] = atom;
      }
    });

    // Precompute a clearance box for every labeled atom so bonds stop cleanly at
    // the label edge (ChemDraw/Marvin style) instead of running under the letter
    // and relying on an opaque mask. This gives consistent gaps and prevents
    // bonds from showing through the holes of letters like "O".
    const labelClearanceBoxes = new Map();
    Object.entries(displayVertexAtoms).forEach(([key, atom]) => {
      if (!atom || !atom.symbol) return;
      const v = vertexByKey.get(key);
      if (!v) return;
      const ext = getAtomLabelHalfExtents(ctx, atom);
      if (ext) labelClearanceBoxes.set(key, { cx: v.x, cy: v.y, halfW: ext.halfW, halfH: ext.halfH });
    });

    const BOND_LABEL_MARGIN = 2; // extra gap (px) beyond the label halo box
    // Distance from a label's center, along a unit direction, to its box edge + margin.
    const labelClearance = (box, ux, uy) => {
      const ax = Math.abs(ux);
      const ay = Math.abs(uy);
      const tX = ax > 1e-6 ? box.halfW / ax : Infinity;
      const tY = ay > 1e-6 ? box.halfH / ay : Infinity;
      return Math.min(tX, tY) + BOND_LABEL_MARGIN;
    };
    // Return bond endpoints trimmed at any labeled endpoint. `clipped` is true if
    // either end was shortened (so callers know the geometry changed).
    const clipBondToLabels = (segment) => {
      const k1 = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
      const k2 = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
      const b1 = labelClearanceBoxes.get(k1);
      const b2 = labelClearanceBoxes.get(k2);
      if (!b1 && !b2) return { x1: segment.x1, y1: segment.y1, x2: segment.x2, y2: segment.y2, clipped: false };

      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      let x1 = segment.x1;
      let y1 = segment.y1;
      let x2 = segment.x2;
      let y2 = segment.y2;
      if (b1) {
        const c = labelClearance(b1, ux, uy);
        x1 = b1.cx + ux * c;
        y1 = b1.cy + uy * c;
      }
      if (b2) {
        const c = labelClearance(b2, -ux, -uy);
        x2 = b2.cx - ux * c;
        y2 = b2.cy - uy * c;
      }
      // Guard against over-shortening on very short bonds (endpoints crossing).
      const newLen = Math.hypot(x2 - x1, y2 - y1);
      if (newLen < len * 0.1 || (x2 - x1) * dx + (y2 - y1) * dy <= 0) {
        return { x1: segment.x1, y1: segment.y1, x2: segment.x2, y2: segment.y2, clipped: false };
      }
      return { x1, y1, x2, y2, clipped: true };
    };

    // Second pass: Render regular bonds (skip stereochemistry bonds)
    segments.forEach((segment, index) => {
      if (segment.bondOrder <= 0) return; // Skip grid lines
      if (stereoBondIndices.has(index)) return; // Skip stereochemistry bonds (already rendered)

      const clip = clipBondToLabels(segment);

      if (segment.bondOrder === 1) {
        // Single bond rendering
        ctx.strokeStyle = (!isExportingRef.current && hoveredBondIndex === index) ? '#007bff' : colors.bonds;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(clip.x1 + offset.x, clip.y1 + offset.y);
        ctx.lineTo(clip.x2 + offset.x, clip.y2 + offset.y);
        ctx.stroke();
      } else if (segment.bondOrder === 2) {
        // Double bond rendering with hover support. Only pass trimmed coordinates
        // when an endpoint is labeled (keeps ring double-bond detection intact for
        // ordinary C=C bonds, which are never clipped).
        const drawSeg = clip.clipped
          ? { ...segment, x1: clip.x1, y1: clip.y1, x2: clip.x2, y2: clip.y2 }
          : segment;
        const doubleBondDeps = { detectedRings, countVertexBonds };
        if (!isExportingRef.current && hoveredBondIndex === index) {
          const tempColors = { ...colors, bonds: '#007bff' };
          renderDoubleBondByCase(ctx, drawSeg, offset, tempColors, doubleBondDeps);
        } else {
          renderDoubleBondByCase(ctx, drawSeg, offset, colors, doubleBondDeps);
        }
      } else if (segment.bondOrder === 3) {
        // Triple bond rendering - three parallel lines
        const bondAngle = Math.atan2(clip.y2 - clip.y1, clip.x2 - clip.x1);
        const perpAngle = bondAngle + Math.PI / 2;
        const lineSpacing = 8.5; // Distance between parallel lines (further apart)

        ctx.strokeStyle = (!isExportingRef.current && hoveredBondIndex === index) ? '#007bff' : colors.bonds;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Draw center line
        ctx.beginPath();
        ctx.moveTo(clip.x1 + offset.x, clip.y1 + offset.y);
        ctx.lineTo(clip.x2 + offset.x, clip.y2 + offset.y);
        ctx.stroke();

        // Draw top line
        const topOffsetX = Math.cos(perpAngle) * lineSpacing;
        const topOffsetY = Math.sin(perpAngle) * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(clip.x1 + topOffsetX + offset.x, clip.y1 + topOffsetY + offset.y);
        ctx.lineTo(clip.x2 + topOffsetX + offset.x, clip.y2 + topOffsetY + offset.y);
        ctx.stroke();

        // Draw bottom line
        ctx.beginPath();
        ctx.moveTo(clip.x1 - topOffsetX + offset.x, clip.y1 - topOffsetY + offset.y);
        ctx.lineTo(clip.x2 - topOffsetX + offset.x, clip.y2 - topOffsetY + offset.y);
        ctx.stroke();
      }
    });

    // Draw bond suggestions
    if (!isExportingRef.current && bondSuggestions.length > 0 && !isCreatingBond) {
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
    if (!isExportingRef.current && isCreatingBond && bondStartPoint && !shouldDisableAngleSnapping(bondStartPoint)) {
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
    if (!isExportingRef.current && isCreatingBond && bondStartPoint && bondPreviewEnd) {
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
    renderAllAtomText(ctx, vertices, displayVertexAtoms, offset, colors, isDarkMode, newmanInstances);
    
    // Draw lone pairs and charges
    renderAllLonePairsAndCharges(ctx, vertices, segments, vertexAtoms, offset, colors);
    
    // Draw arrows
    renderAllArrows(ctx, arrows, offset, colors);
    
    // Draw benzene preview if in benzene mode
    if (!isExportingRef.current && mode === 'benzene' && currentMousePosition) {
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
    if (!isExportingRef.current && mode === 'cyclohexane' && currentMousePosition) {
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
    if (!isExportingRef.current && mode === 'cyclopentane' && currentMousePosition) {
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
    if (!isExportingRef.current && mode === 'cyclobutane' && currentMousePosition) {
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
    if (!isExportingRef.current && mode === 'cyclopropane' && currentMousePosition) {
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

    // Draw chair conformation preview with axial/equatorial guide lines
    if (!isExportingRef.current && mode === 'chair' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      const snapInfo = calculateRingSnap({ x: worldMouseX, y: worldMouseY }, vertices, segments, hexRadius, 6);
      const previewCenterX = snapInfo ? snapInfo.center.x : worldMouseX;
      const previewCenterY = snapInfo ? snapInfo.center.y : worldMouseY;
      const rotationOffset = snapInfo?.rotation || 0;
      const isSnapping = snapInfo !== null;
      const isFlippedChair = false;
      const previewVertices = getChairVertices(previewCenterX, previewCenterY, hexRadius, rotationOffset, isFlippedChair);

      ctx.strokeStyle = isSnapping ? 'rgba(0, 204, 0, 0.75)' : 'rgba(136, 136, 136, 0.58)';
      ctx.fillStyle = isSnapping ? 'rgba(0, 204, 0, 0.7)' : 'rgba(136, 136, 136, 0.6)';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      for (let i = 0; i < previewVertices.length; i++) {
        const nextIndex = (i + 1) % previewVertices.length;
        const v1 = previewVertices[i];
        const v2 = previewVertices[nextIndex];
        ctx.beginPath();
        ctx.moveTo(v1.x + offset.x, v1.y + offset.y);
        ctx.lineTo(v2.x + offset.x, v2.y + offset.y);
        ctx.stroke();
      }

      for (const vertex of previewVertices) {
        ctx.beginPath();
        ctx.arc(vertex.x + offset.x, vertex.y + offset.y, 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Show directional guide lines for axial/equatorial substituents.
      const substituentAngles = getChairSubstituentAngles(
        previewVertices,
        previewCenterX,
        previewCenterY,
        isFlippedChair
      );
      const guideStroke = isSnapping ? 'rgba(0, 204, 0, 0.45)' : 'rgba(90, 90, 90, 0.4)';
      ctx.strokeStyle = guideStroke;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      for (let i = 0; i < previewVertices.length; i++) {
        const vertex = previewVertices[i];
        const { axialAngle, equatorialAngle } = substituentAngles[i];

        const axialEndX = vertex.x + Math.cos(axialAngle) * hexRadius * 0.52;
        const axialEndY = vertex.y + Math.sin(axialAngle) * hexRadius * 0.52;
        const equatorialLengthFactor = CHAIR_MIDDLE_VERTEX_INDEXES.has(i) ? 0.40 : 0.48;
        const equatorialEndX = vertex.x + Math.cos(equatorialAngle) * hexRadius * equatorialLengthFactor;
        const equatorialEndY = vertex.y + Math.sin(equatorialAngle) * hexRadius * equatorialLengthFactor;

        ctx.beginPath();
        ctx.moveTo(vertex.x + offset.x, vertex.y + offset.y);
        ctx.lineTo(axialEndX + offset.x, axialEndY + offset.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(vertex.x + offset.x, vertex.y + offset.y);
        ctx.lineTo(equatorialEndX + offset.x, equatorialEndY + offset.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

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

    // Draw Newman projection preview
    if (!isExportingRef.current && mode === 'newman' && currentMousePosition) {
      const worldMouseX = currentMousePosition.x - offset.x;
      const worldMouseY = currentMousePosition.y - offset.y;
      const previewRadius = hexRadius * 0.68;
      const geometry = getNewmanProjectionGeometry(
        worldMouseX,
        worldMouseY,
        previewRadius,
        60,
        0
      );

      ctx.strokeStyle = 'rgba(136, 136, 136, 0.7)';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      // Back carbon circle
      ctx.beginPath();
      ctx.arc(worldMouseX + offset.x, worldMouseY + offset.y, previewRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Front bonds (from center)
      geometry.frontEndpoints.forEach(point => {
        ctx.beginPath();
        ctx.moveTo(worldMouseX + offset.x, worldMouseY + offset.y);
        ctx.lineTo(point.x + offset.x, point.y + offset.y);
        ctx.stroke();
      });

      // Back bonds (from circle edge outward)
      for (let i = 0; i < geometry.backStarts.length; i++) {
        ctx.beginPath();
        ctx.moveTo(geometry.backStarts[i].x + offset.x, geometry.backStarts[i].y + offset.y);
        ctx.lineTo(geometry.backEndpoints[i].x + offset.x, geometry.backEndpoints[i].y + offset.y);
        ctx.stroke();
      }
    }
    
    // Draw arrow preview if in arrow mode (suppressed during export)
    if (!isExportingRef.current) {
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
        if (curvedArrowStartPoint) {
          const previewArrow = {
            x1: curvedArrowStartPoint.x,
            y1: curvedArrowStartPoint.y,
            x2: currentMousePosition.x - offset.x,
            y2: currentMousePosition.y - offset.y,
            type: 'curved',
            curveType: mode,
            direction: (mode === 'curve0' || mode === 'curve1' || mode === 'curve2') ? 'ccw' : 'cw'
          };
          renderArrow(ctx, previewArrow, offset, colors, true);
          ctx.fillStyle = '#007bff';
          ctx.beginPath();
          ctx.arc(curvedArrowStartPoint.x + offset.x, curvedArrowStartPoint.y + offset.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Draw paste preview
    if (!isExportingRef.current && isPastePreviewMode && clipboard) {
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
    if (!isExportingRef.current && mode === 'mouse') {
      // Draw control points on all arrows to show they're editable
      const ARROW_HANDLE_BLUE = 'rgba(0, 123, 255, 0.82)';
      const ARROW_HANDLE_YELLOW = 'rgba(255, 193, 7, 0.88)';
      const ARROW_HANDLE_BLUE_DIM = 'rgba(0, 123, 255, 0.58)';

      arrows.forEach((arrow, idx) => {
        const isSelected = selectedArrows.has(idx);
        const isHovered = hoveredArrow === idx;
        const isDragging = draggingArrow === idx;

        if (isDragging) return;

        let circleSize = 10;
        if (isSelected) circleSize = 12;
        else if (isHovered) circleSize = 11;

        const blueFill = isSelected || isHovered ? ARROW_HANDLE_BLUE : ARROW_HANDLE_BLUE_DIM;

        if (arrow.type === 'curved') {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          ctx.fillStyle = blueFill;
          ctx.beginPath();
          ctx.arc(arrow.x1 + offset.x, arrow.y1 + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = blueFill;
          ctx.beginPath();
          ctx.arc(arrow.x2 + offset.x, arrow.y2 + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();

          const handle = getCurvedArrowMidHandleWorld(arrow);
          if (handle) {
            ctx.fillStyle = ARROW_HANDLE_YELLOW;
            ctx.beginPath();
            ctx.arc(handle.x + offset.x, handle.y + offset.y, circleSize, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          const endX = arrow.x + arrow.length * Math.cos(arrow.angle);
          const endY = arrow.y + arrow.length * Math.sin(arrow.angle);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          ctx.fillStyle = blueFill;
          ctx.beginPath();
          ctx.arc(arrow.x + offset.x, arrow.y + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = blueFill;
          ctx.beginPath();
          ctx.arc(endX + offset.x, endY + offset.y, circleSize, 0, 2 * Math.PI);
          ctx.fill();
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
              strokeCurvedArrowShaft(
                ctx,
                arrow,
                offset,
                'rgba(0, 123, 255, 0.5)',
                8
              );
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
      
      // Draw control points for arrow being dragged (same geometry as idle handles; active = yellow)
      if (draggingArrow !== null && draggingArrow < arrows.length) {
        const arrow = arrows[draggingArrow];
        const dragBlue = 'rgba(0, 123, 255, 0.82)';
        const dragYellow = 'rgba(255, 193, 7, 0.88)';
        const rActive = 12;
        const rIdle = 10;

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (arrow.type === 'curved') {
          const x1 = arrow.x1 + offset.x;
          const y1 = arrow.y1 + offset.y;
          const x2 = arrow.x2 + offset.x;
          const y2 = arrow.y2 + offset.y;

          const handleW = getCurvedArrowMidHandleWorld(arrow);
          const hx = handleW ? handleW.x + offset.x : x1;
          const hy = handleW ? handleW.y + offset.y : y1;

          const rs = draggingArrowEnd === 'start' ? rActive : rIdle;
          const re = draggingArrowEnd === 'end' ? rActive : rIdle;
          const rc = draggingArrowEnd === 'control' ? rActive : rIdle;

          ctx.fillStyle = draggingArrowEnd === 'start' ? dragYellow : dragBlue;
          ctx.beginPath();
          ctx.arc(x1, y1, rs, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = draggingArrowEnd === 'end' ? dragYellow : dragBlue;
          ctx.beginPath();
          ctx.arc(x2, y2, re, 0, 2 * Math.PI);
          ctx.fill();

          if (handleW) {
            ctx.fillStyle = draggingArrowEnd === 'control' ? dragYellow : ARROW_HANDLE_YELLOW;
            ctx.beginPath();
            ctx.arc(hx, hy, rc, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          const x = arrow.x + offset.x;
          const y = arrow.y + offset.y;
          const endX = x + arrow.length * Math.cos(arrow.angle);
          const endY = y + arrow.length * Math.sin(arrow.angle);

          const rs = draggingArrowEnd === 'start' ? rActive : rIdle;
          const re = draggingArrowEnd === 'end' ? rActive : rIdle;

          ctx.fillStyle = draggingArrowEnd === 'start' ? dragYellow : dragBlue;
          ctx.beginPath();
          ctx.arc(x, y, rs, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = draggingArrowEnd === 'end' ? dragYellow : dragBlue;
          ctx.beginPath();
          ctx.arc(endX, endY, re, 0, 2 * Math.PI);
          ctx.fill();
        }
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
    if (!isExportingRef.current && hoveredVertex && mode !== 'mouse') {
      ctx.fillStyle = 'rgba(0, 123, 255, 0.3)'; // Blue highlight color with transparency
      ctx.beginPath();
      ctx.arc(hoveredVertex.x + offset.x, hoveredVertex.y + offset.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [colors, segments, vertices, vertexAtoms, offset, isCreatingBond, bondStartPoint, bondPreviewEnd, hoveredVertex, hoveredBondIndex, bondSuggestions, hoveredSuggestionIndex, isDarkMode, arrows, mode, currentMousePosition, curvedArrowStartPoint, getAvailableBondAngles, shouldDisableAngleSnapping, hexRadius, vertexBondStates, selectedMolecules, selectedArrows, hoveredMolecule, hoveredArrow, isSelecting, selectionStart, selectionEnd, isDraggingSelection, selectedVertices, isPastePreviewMode, clipboard, pastePreviewPosition, draggingArrow, draggingArrowEnd, newmanInstances]);

  /** PNG of the live canvas, cropped to drawn content. Redraws without any interactive overlays. */
  const renderCleanCanvas = useCallback(
    async (resolution = 2) => {
      isExportingRef.current = true;
      try {
        drawCanvas();
      } finally {
        isExportingRef.current = false;
      }
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const crop = computeCanvasContentBounds(
        vertices,
        segments,
        arrows,
        offset,
        canvas.width,
        canvas.height,
        72
      );
      if (!crop) return null;
      return exportCanvasCroppedSnapshot(canvas, crop, resolution);
    },
    [drawCanvas, vertices, segments, arrows, offset]
  );

  // Redraw canvas when relevant data changes
  React.useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvas panning. The whole coordinate system already supports a pan offset
  // (screen = world + offset), it just was never wired to any input, so the
  // canvas felt fixed and anything drawn off-screen was unreachable. Trackpad /
  // wheel scrolling now pans the view (ChemDraw/Marvin-style "infinite" canvas).
  // A native non-passive listener lets us preventDefault so two-finger scroll
  // doesn't trigger the browser's back/forward swipe.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event) => {
      event.preventDefault();
      setOffset((prev) => ({ x: prev.x - event.deltaX, y: prev.y - event.deltaY }));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const latestNewmanInstance = newmanInstances.reduce(
    (latest, instance) => (!latest || instance.lastTouchedAt > latest.lastTouchedAt ? instance : latest),
    null
  );
  const canvasRect = canvasRef.current?.getBoundingClientRect();
  const canvasScreenLeft = canvasRect?.left || 0;
  const canvasScreenTop = canvasRect?.top || 0;

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

                {/* Copy as SMILES */}
                <div style={{ padding: '12px 0' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '2px'
                      }}>
                        Copy as SMILES
                      </span>
                      <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
                        Export the structure as a SMILES string
                      </span>
                    </div>
                    <button
                      onClick={handleCopySmiles}
                      style={{
                        backgroundColor: colors.button,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontFamily: 'Roboto, sans-serif',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Copy
                    </button>
                  </div>

                  {smilesResult && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: colors.text,
                        wordBreak: 'break-all',
                        userSelect: 'all',
                        maxHeight: '96px',
                        overflowY: 'auto'
                      }}>
                        {smilesResult.smiles || '(empty — nothing drawn)'}
                      </div>
                      {smilesResult.copied && smilesResult.smiles && (
                        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '6px' }}>
                          ✓ Copied to clipboard
                        </div>
                      )}
                      {smilesResult.warnings && smilesResult.warnings.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          {smilesResult.warnings.map((w, i) => (
                            <div key={i} style={{ color: '#c77', fontSize: '12px', marginTop: '2px' }}>
                              ⚠ {w}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Import from SMILES */}
                <div style={{ padding: '12px 0', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
                    <span style={{
                      color: colors.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '2px'
                    }}>
                      Import from SMILES
                    </span>
                    <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
                      Paste a SMILES string to add it to the canvas
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={smilesInput}
                      onChange={(e) => setSmilesInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleImportSmiles(); }}
                      placeholder="e.g. c1ccccc1"
                      spellCheck={false}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        backgroundColor: colors.background,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={handleImportSmiles}
                      style={{
                        backgroundColor: colors.buttonActive,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontFamily: 'Roboto, sans-serif',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {smilesImportMessage && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: smilesImportMessage.isError ? '#c77' : colors.textSecondary
                    }}>
                      {smilesImportMessage.isError ? '⚠ ' : '✓ '}{smilesImportMessage.text}
                    </div>
                  )}
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
        <ToolPalette mode={mode} setModeAndClearSelection={setModeAndClearSelection} colors={colors} isDarkMode={isDarkMode} />
        
        <div style={{ flex: 1, minHeight: '20px' }} />
        
        {/* Erase All (full width), then Undo / Redo side by side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 'max(6px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))' }}>
          {/* Erase All Button */}
          <button
            onClick={handleEraseAll}
            className="toolbar-button"
            style={{
              width: '100%',
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

          {/* Undo / Redo row */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          {/* Undo Button (Left) */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="toolbar-button"
            style={{
              flex: 1,
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: !canUndo ? '#f8f9fa' : '#e9ecef',
              color: !canUndo ? '#999' : '#333',
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.025)',
              cursor: !canUndo ? 'not-allowed' : 'pointer',
              boxShadow: !canUndo ?
                '0 1px 2px rgba(0,0,0,0.05)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
              fontWeight: 700,
              marginTop: 0,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'max(4px, calc(min(280px, 25vw) * 0.02))',
              opacity: !canUndo ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (canUndo) {
                e.currentTarget.style.backgroundColor = '#ffc107';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,193,7,0.4), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (canUndo) {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title={`Undo${!canUndo ? ' (No actions to undo)' : ' (⌘Z)'}`}
          >
            {/* Undo SVG */}
            <svg width="max(20px, calc(min(280px, 25vw) * 0.081))" height="max(20px, calc(min(280px, 25vw) * 0.081))" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
            Undo
          </button>

          {/* Redo Button (Right) */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="toolbar-button"
            style={{
              flex: 1,
              padding: 'calc(min(280px, 25vw) * 0.019) 0',
              backgroundColor: !canRedo ? '#f8f9fa' : '#e9ecef',
              color: !canRedo ? '#999' : '#333',
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.025)',
              cursor: !canRedo ? 'not-allowed' : 'pointer',
              boxShadow: !canRedo ?
                '0 1px 2px rgba(0,0,0,0.05)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
              fontWeight: 700,
              marginTop: 0,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'max(4px, calc(min(280px, 25vw) * 0.02))',
              opacity: !canRedo ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (canRedo) {
                e.currentTarget.style.backgroundColor = '#ffc107';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,193,7,0.4), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (canRedo) {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.color = '#333';
                e.currentTarget.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title={`Redo${!canRedo ? ' (No actions to redo)' : ' (⇧⌘Z)'}`}
          >
            {/* Redo SVG (mirror of undo) */}
            <svg width="max(20px, calc(min(280px, 25vw) * 0.081))" height="max(20px, calc(min(280px, 25vw) * 0.081))" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
              <path d="M21 7v6h-6"/>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
            Redo
          </button>
          </div>
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
      
      {/* Copy — fixed top-center (molecule selection only; arrows use sidebar / Cmd+C) */}
      {(selectedSegments.size > 0 ||
        selectedVertices.size > 0 ||
        selectedMolecules.length > 0) &&
        draggingArrow === null &&
        !isDraggingSelection &&
        !isPasteMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copySelectionToClipboard();
          }}
          style={{
            position: 'fixed',
            top: '78px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 12,
            backgroundColor: '#28a745',
            color: '#fff',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(40, 167, 69, 0.35), 0 2px 6px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = '#218838';
            el.style.boxShadow =
              '0 4px 14px rgba(40, 167, 69, 0.45), 0 2px 6px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = '#28a745';
            el.style.boxShadow =
              '0 2px 10px rgba(40, 167, 69, 0.35), 0 2px 6px rgba(0,0,0,0.12)';
          }}
          title="Copy (Cmd/Ctrl+C)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      )}
      
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
              mode === 'newman'
                ? `Preset: Newman (${latestNewmanInstance ? `${latestNewmanInstance.backRotationDeg}deg` : '60deg'})`
                : `Preset: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`
            ) : (
              showSnapPreview ? (
                snapAlignment && snapAlignment.type === 'bond' ? 'Bond Snap: ON' : 'Grid Snap: ON'
              ) : 'Grid Snap: OFF'
            )}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9' }}>
            {isPastePreviewMode ? (
              'Click to place • ESC to cancel'
            ) : mode === 'newman' ? (
              'Click to place • Use rotate button'
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

      {/* Newman rotation button near latest projection */}
      {latestNewmanInstance?.showRotateControl && (
        <button
          onClick={() => {
            if (!latestNewmanInstance) return;
            const increment = latestNewmanInstance.nextStepDeg === 45 ? 45 : 75;
            const nextRotation = (latestNewmanInstance.backRotationDeg + increment) % 360;
            const nextStepDeg = increment === 75 ? 45 : 75;
            const oldGeometry = getNewmanProjectionGeometry(
              latestNewmanInstance.x,
              latestNewmanInstance.y,
              latestNewmanInstance.radius,
              latestNewmanInstance.backRotationDeg,
              0
            );

            const updatedGeometry = getNewmanProjectionGeometry(
              latestNewmanInstance.x,
              latestNewmanInstance.y,
              latestNewmanInstance.radius,
              nextRotation,
              0
            );

            setNewmanInstances(prev =>
              prev.map(instance =>
                instance.id === latestNewmanInstance.id
                  ? {
                      ...instance,
                      backRotationDeg: nextRotation,
                      nextStepDeg,
                      lastTouchedAt: Date.now()
                    }
                  : instance
              )
            );

            setVertices(prev =>
              prev.map(vertex => {
                if (vertex.newmanId !== latestNewmanInstance.id || vertex.newmanRole !== 'backOuter') {
                  return vertex;
                }
                const i = vertex.newmanIndex || 0;
                return {
                  ...vertex,
                  x: updatedGeometry.backEndpoints[i].x,
                  y: updatedGeometry.backEndpoints[i].y
                };
              })
            );

            // Keep atom labels/metadata bound to rotated Newman back endpoints.
            setVertexAtoms(prev => {
              const updated = { ...prev };
              for (let i = 0; i < oldGeometry.backEndpoints.length; i++) {
                const oldPoint = oldGeometry.backEndpoints[i];
                const newPoint = updatedGeometry.backEndpoints[i];
                const oldKey = `${oldPoint.x.toFixed(2)},${oldPoint.y.toFixed(2)}`;
                const newKey = `${newPoint.x.toFixed(2)},${newPoint.y.toFixed(2)}`;
                if (oldKey === newKey) continue;
                if (updated[oldKey] !== undefined && updated[newKey] === undefined) {
                  updated[newKey] = updated[oldKey];
                }
                delete updated[oldKey];
              }
              return updated;
            });

            setVertexBondStates(prev => {
              const updated = { ...prev };
              for (let i = 0; i < oldGeometry.backEndpoints.length; i++) {
                const oldPoint = oldGeometry.backEndpoints[i];
                const newPoint = updatedGeometry.backEndpoints[i];
                const oldKey = `${oldPoint.x.toFixed(2)},${oldPoint.y.toFixed(2)}`;
                const newKey = `${newPoint.x.toFixed(2)},${newPoint.y.toFixed(2)}`;
                if (oldKey === newKey) continue;
                if (updated[oldKey] !== undefined && updated[newKey] === undefined) {
                  updated[newKey] = updated[oldKey];
                }
                delete updated[oldKey];
              }
              return updated;
            });

            setSegments(prev =>
              prev.map(segment => {
                if (segment.newmanId !== latestNewmanInstance.id || segment.newmanRole !== 'back') {
                  return segment;
                }
                const i = segment.newmanIndex || 0;
                const x1 = updatedGeometry.backStarts[i].x;
                const y1 = updatedGeometry.backStarts[i].y;
                const x2 = updatedGeometry.backEndpoints[i].x;
                const y2 = updatedGeometry.backEndpoints[i].y;
                return {
                  ...segment,
                  x1,
                  y1,
                  x2,
                  y2,
                  direction: calculateBondDirection(x1, y1, x2, y2)
                };
              })
            );
          }}
          onMouseEnter={() => setIsRotateArrowHovered(true)}
          onMouseLeave={() => setIsRotateArrowHovered(false)}
          className="toolbar-button"
          style={{
            position: 'fixed',
            top: `${canvasScreenTop + latestNewmanInstance.y + offset.y - (latestNewmanInstance.radius * 0.18) + 5}px`,
            left: `${canvasScreenLeft + latestNewmanInstance.x + offset.x + latestNewmanInstance.radius + 8}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 14,
            backgroundColor: 'transparent',
            color: '#16a34a',
            border: 'none',
            borderRadius: 0,
            width: '46px',
            height: '46px',
            padding: 0,
            cursor: 'pointer',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1
          }}
          title={`Rotate Newman (${latestNewmanInstance.backRotationDeg}deg)`}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
            <path
              d="M9.9 5.5a9.2 9.2 0 0 1 6.4 14.2"
              stroke={isRotateArrowHovered ? '#22c55e' : '#16a34a'}
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <path
              d="M16.2 22 12 22 14 17.7"
              stroke={isRotateArrowHovered ? '#22c55e' : '#16a34a'}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
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
                  Cropped to drawing: {exportMetadata.width}×{exportMetadata.height}px • {exportMetadata.scaleFactor}× scale (same pixels as canvas)
                </>
              ) : (
                'PNG zoomed to your structure — copied from the canvas'
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

export default HexGridWithToolbar;