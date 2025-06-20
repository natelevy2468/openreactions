import React, { useRef, useEffect, useState, useCallback } from 'react';
import { detectSixMemberedRings, isSegmentInRing, getRingInteriorDirection, isSpecialRingBond, getRingInfo } from './ringDetection';
import { determineVertexTypes, isTopOfHex, getType, getIfTop } from './vertexDetection';

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
  const [hoverIndicator, setHoverIndicator] = useState(null); // Track which 4th bond indicator is being hovered
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
  // Track vertices that have exactly 3 bonds (will only show indicator for these)
  const [verticesWith3Bonds, setVerticesWith3Bonds] = useState([]);
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
  // Preset menu state
  const [isPresetMenuExpanded, setIsPresetMenuExpanded] = useState(false);
  const [presetMenuVisualState, setPresetMenuVisualState] = useState(false); // Controls visual appearance (border radius, etc.)
  // Ring detection state (invisible to user)
  const [detectedRings, setDetectedRings] = useState([]);
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

  // Generate unique segments and vertices based on view size
  const generateGrid = useCallback((width, height) => {
    const newSegments = [];
    const newVertices = [];
    const seenSeg = new Set();
    const seenVert = new Set();
    const r = hexRadius;
    const hexWidth = Math.sqrt(3) * r;
    const hSpacing = hexWidth;
    const vSpacing = 1.5 * r;

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
            seenVert.add(vk);
            newVertices.push({ x: vx, y: vy });
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
    return { newSegments, newVertices };
  }, [calculateBondDirection, calculateDoubleBondVertices]);

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

  // Draw grid: segments and vertices (with atoms), hiding gray lines around atoms
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);



    // Build a set of vertex positions where atoms exist
    const atomPositions = new Set(Object.keys(vertexAtoms));

    // Draw hex grid lines in even lighter gray, skip around atoms
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
      if (seg.bondOrder === 0) {
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
          // Use consistent grid line color for all modes
          ctx.strokeStyle = isHovered ? '#888' : '#e0e0e0';
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

    // Draw bonds (single + double)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    segments.forEach((seg, segIdx) => {
      if (seg.bondOrder >= 1) {
        // Use blue color for selected segments in mouse mode
        const isSelected = mode === 'mouse' && selectedSegments.has(segIdx);
        if (isSelected) {
          ctx.strokeStyle = 'rgb(54,98,227)';
        } else {
          ctx.strokeStyle = '#000000';
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
            ctx.strokeStyle = '#000000';
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
          const shortenStart = hasNeighborsAtStart ? 8 : 0;
          const shortenEnd = hasNeighborsAtEnd ? 8 : 0;
          
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
          const font = segment.isNumber ? '400 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
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
        
        // Render each segment with proper positioning
        let currentX = vx - totalWidth / 2;
        const baseYOffset = 2; // Move entire text down by 2 pixels (reduced from 4 to move text upward)
        
        for (const segment of segments) {
          const isNumber = segment.isNumber;
          const font = isNumber ? '40 15px "Inter", "Segoe UI", "Arial", sans-serif' : '40 26px "Inter", "Segoe UI", "Arial", sans-serif';
          const yOffset = isNumber ? 4 : 0; // Numbers positioned 4px below baseline
          
          ctx.font = font;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          // Add a thick white outline to make text stand out over bonds
          ctx.shadowColor = 'rgba(255,255,255,0.85)';
          ctx.shadowBlur = 4;
          ctx.lineWidth = 5; // Thick outline to prevent bonds showing through letters with holes
          ctx.strokeStyle = '#fff';
          
          // Draw shadow/stroke
          ctx.strokeText(segment.text, currentX, vy + baseYOffset + yOffset);
          ctx.shadowBlur = 0;
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : '#1a1a1a';
          ctx.fillText(segment.text, currentX, vy + baseYOffset + yOffset);
          
          // Calculate width and move to next position
          const segmentWidth = ctx.measureText(segment.text).width;
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
          // Add ring around the white circle (black or blue when selected)
          ctx.strokeStyle = isSelected ? 'rgb(54,98,227)' : '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Draw charge symbol
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : '#1a1a1a';
          
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
          ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : '#1a1a1a';
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
            ctx.fillStyle = isSelected ? 'rgb(54,98,227)' : '#1a1a1a';
            ctx.fill();
          }
          ctx.restore();
        }
      }
    });

    // Draw indicators for vertices with exactly 3 bonds
    if (verticesWith3Bonds.length > 0) {
      verticesWith3Bonds.forEach(v => {
        const vx = v.x + offset.x;
        const vy = v.y + offset.y;
        
        // Draw a blue triangle indicator with plus sign
        ctx.save();
        
        // Position the triangle slightly offset from the vertex
        const indicatorX = vx + 22; // Moved further right
        const indicatorY = vy;      // Centered vertically
        
        // Check if this indicator is being hovered
        const isHovered = hoverIndicator && 
          Math.abs(hoverIndicator.x - v.x) < 0.01 && 
          Math.abs(hoverIndicator.y - v.y) < 0.01;
        
        // Define triangle points (pointing toward the vertex) - made bigger
        const size = isHovered ? 16 : 14; // Bigger size, even bigger on hover
        ctx.beginPath();
        ctx.moveTo(indicatorX + size, indicatorY - size); // Top right
        ctx.lineTo(indicatorX - size, indicatorY); // Left point (pointing to vertex)
        ctx.lineTo(indicatorX + size, indicatorY + size); // Bottom right
        ctx.closePath();
        
        // Change color if this is the active fourth-bond source
        const isActiveSource = fourthBondSource && 
          Math.abs(fourthBondSource.x - v.x) < 0.01 && 
          Math.abs(fourthBondSource.y - v.y) < 0.01;
        
        // Fill and stroke the triangle with hover effects
        if (isActiveSource) {
          ctx.fillStyle = 'rgba(25, 118, 210, 1.0)';
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(25, 98, 180, 1.0)'; // Darker blue on hover
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.8;
        } else {
          ctx.fillStyle = 'rgba(25, 118, 210, 0.85)'; // Normal blue
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.5;
        }
        
        ctx.fill();
        ctx.stroke();
        
        // Draw plus sign in white - bigger size for larger triangle
        const plusSize = isHovered ? 10 : 9; // Bigger plus sign, even bigger on hover
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        // Horizontal line of plus
        ctx.moveTo(indicatorX + 2, indicatorY);
        ctx.lineTo(indicatorX + 2 + plusSize, indicatorY);
        // Vertical line of plus
        ctx.moveTo(indicatorX + 2 + plusSize/2, indicatorY - plusSize/2);
        ctx.lineTo(indicatorX + 2 + plusSize/2, indicatorY + plusSize/2);
        ctx.stroke();
        
        // Store the click area for this indicator in the vertex data for hit detection
        // Increased radius for easier hovering
        v.indicatorArea = {
          x: indicatorX,
          y: indicatorY,
          radius: isHovered ? 10 : 9
        };
        
        ctx.restore();
      });
    }

    // Draw hover circle if hovering over a vertex
    if (hoverVertex) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(hoverVertex.x + offset.x, hoverVertex.y + offset.y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(120,120,120,0.25)';
      ctx.fill();
      ctx.restore();
    }
    
    // Highlight free-floating vertices in mouse mode
    if (mode === 'mouse') {
      vertices.forEach(v => {
        const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
        if (freeFloatingVertices.has(key)) {
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
            // For vertices with no atom label, use a small box
            ctx.save();
            ctx.beginPath();
            
            const boxSize = 15;
            ctx.rect(
              v.x + offset.x - boxSize/2, 
              v.y + offset.y - boxSize/2,
              boxSize, 
              boxSize
            );
            
            if (isBeingDragged) {
              ctx.strokeStyle = 'rgba(54,98,227,1.0)';
              ctx.lineWidth = 2;
            } else {
              ctx.strokeStyle = 'rgba(54,98,227,0.8)';
              ctx.lineWidth = 1.5;
            }
            
            ctx.stroke();
            ctx.restore();
          }
        }
      });
    }

    // Draw fourth bond preview if in fourth bond mode
    if (fourthBondMode && fourthBondPreview) {
      ctx.save();
      
      const sx1 = fourthBondPreview.startX;
      const sy1 = fourthBondPreview.startY;
      const sx2 = fourthBondPreview.endX;
      const sy2 = fourthBondPreview.endY;
      const previewColor = fourthBondPreview.snappedToVertex ? '#444444' : '#888888';
      
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
        
        drawArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, arrowColor, 3);
        
        // Draw semi-transparent blue circle in the center of forward arrows when in mouse mode
        if (mode === 'mouse') {
          // Calculate center point
          const centerX = (ox1 + ox2) / 2;
          const centerY = (oy1 + oy2) / 2;
          
          // Draw the blue circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI); // Increased from 8 to 10
          ctx.fillStyle = 'rgba(54, 98, 227, 0.6)'; // Semi-transparent blue
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
        
        drawEquilArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, arrowColor, 3, topX1, topX2, bottomX1, bottomX2, index);
        
        // Draw semi-transparent blue circle in the center of equilibrium arrows when in mouse mode
        if (mode === 'mouse') {
          // Calculate center point
          const centerX = (ox1 + ox2) / 2;
          const centerY = oy1; // For equilibrium arrows, use the middle y-coordinate
          
          // Draw the blue circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI); // Increased from 8 to 10
          ctx.fillStyle = 'rgba(54, 98, 227, 0.6)'; // Semi-transparent blue
          ctx.fill();
          ctx.restore();
        }
      } else if (type.startsWith('curve')) {
        const peakX = arrow.peakX !== undefined ? arrow.peakX + offset.x : null;
        const peakY = arrow.peakY !== undefined ? arrow.peakY + offset.y : null;
        // Use blue color for selected arrows in mouse mode
        const isSelected = mode === 'mouse' && selectedArrows.has(index);
        const arrowColor = isSelected ? 'rgb(54,98,227)' : '#000';
        
        drawCurvedArrowOnCanvas(ctx, ox1, oy1, ox2, oy2, type, arrowColor, index, peakX, peakY, arrows);
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
          arrows
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
          drawArrowOnCanvas(ctx, previewX1, previewY1, previewX2, previewY2, 'rgba(0,0,0,0.4)', 3);
        } else if (mode === 'equil') {
          const previewX1 = x - 40;
          const previewY1 = y;
          const previewX2 = x + 40;
          const previewY2 = y;
          // Use same coordinates for top and bottom in the preview
          drawEquilArrowOnCanvas(ctx, previewX1, previewY1, previewX2, previewY2, 'rgba(0,0,0,0.4)', 3, 
            previewX1, previewX2, previewX1, previewX2);
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
        
        const previewX = pastePreviewPosition.x - offset.x;
        const previewY = pastePreviewPosition.y - offset.y;
        
        // Draw preview vertices with atoms
        clipboard.vertices.forEach(vertex => {
          const vx = previewX + vertex.x;
          const vy = previewY + vertex.y;
          
          // Draw atom label if present, otherwise draw vertex circle
          if (vertex.atom) {
            ctx.font = '26px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Handle atom objects with symbol property
            const atomSymbol = typeof vertex.atom === 'string' ? vertex.atom : vertex.atom.symbol;
            ctx.fillText(atomSymbol || '', vx + offset.x, vy + offset.y);
            
            // Draw charge if present
            if (vertex.atom.charge) {
              ctx.font = '15px Arial';
              const chargeSymbol = vertex.atom.charge > 0 ? '+' : '−';
              const chargeX = vx + offset.x + 12;
              const chargeY = vy + offset.y - 10;
              ctx.fillText(chargeSymbol, chargeX, chargeY);
            }
            
            // Draw lone pairs if present
            if (vertex.atom.lonePairs) {
              ctx.fillStyle = '#888';
              const positions = vertex.atom.lonePairOrder || ['top', 'right', 'bottom', 'left'];
              for (let i = 0; i < Math.min(vertex.atom.lonePairs, positions.length); i++) {
                const position = positions[i];
                let dotX, dotY;
                
                switch(position) {
                  case 'top':
                    dotX = vx + offset.x;
                    dotY = vy + offset.y - 20;
                    break;
                  case 'right':
                    dotX = vx + offset.x + 20;
                    dotY = vy + offset.y;
                    break;
                  case 'bottom':
                    dotX = vx + offset.x;
                    dotY = vy + offset.y + 20;
                    break;
                  case 'left':
                    dotX = vx + offset.x - 20;
                    dotY = vy + offset.y;
                    break;
                }
                
                ctx.beginPath();
                ctx.arc(dotX - 3, dotY, 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(dotX + 3, dotY, 2, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }
          // Note: Don't draw anything for vertices without atoms
        });
        
        // Draw preview segments
        clipboard.segments.forEach(segment => {
          const v1 = clipboard.vertices[segment.vertex1Index];
          const v2 = clipboard.vertices[segment.vertex2Index];
          if (v1 && v2) {
            const x1 = previewX + v1.x + offset.x;
            const y1 = previewY + v1.y + offset.y;
            const x2 = previewX + v2.x + offset.x;
            const y2 = previewY + v2.y + offset.y;
            
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            
            // Draw bonds based on their type and order
            if (segment.bondOrder === 1) {
              // Single bond
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            } else if (segment.bondOrder === 2) {
              // Double bond - use the same logic as the main drawing function
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const perpX = -dy / len * 6;
              const perpY = dx / len * 6;
              
              if (segment.flipSmallerLine) {
                // One full line, one shorter line
                ctx.beginPath();
                ctx.moveTo(x1 + perpX, y1 + perpY);
                ctx.lineTo(x2 + perpX, y2 + perpY);
                ctx.stroke();
                
                // Shorter line (80% length, centered)
                const shortenFactor = 0.8;
                const startOffset = (1 - shortenFactor) / 2;
                const shortX1 = x1 - perpX + dx * startOffset;
                const shortY1 = y1 - perpY + dy * startOffset;
                const shortX2 = x1 - perpX + dx * (startOffset + shortenFactor);
                const shortY2 = y1 - perpY + dy * (startOffset + shortenFactor);
                
                ctx.beginPath();
                ctx.moveTo(shortX1, shortY1);
                ctx.lineTo(shortX2, shortY2);
                ctx.stroke();
              } else {
                // Two equal lines
                ctx.beginPath();
                ctx.moveTo(x1 + perpX, y1 + perpY);
                ctx.lineTo(x2 + perpX, y2 + perpY);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(x1 - perpX, y1 - perpY);
                ctx.lineTo(x2 - perpX, y2 - perpY);
                ctx.stroke();
              }
            } else if (segment.bondOrder === 3) {
              // Triple bond
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const perpX = -dy / len * 6;
              const perpY = dx / len * 6;
              
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
            drawArrowOnCanvas(ctx, x1, y1, x2, y2, '#888');
          } else if (arrow.type === 'equilibrium') {
            const topX1 = arrow.topX1 !== undefined ? previewX + arrow.topX1 + offset.x : x1;
            const topX2 = arrow.topX2 !== undefined ? previewX + arrow.topX2 + offset.x : x2;
            const bottomX1 = arrow.bottomX1 !== undefined ? previewX + arrow.bottomX1 + offset.x : x1;
            const bottomX2 = arrow.bottomX2 !== undefined ? previewX + arrow.bottomX2 + offset.x : x2;
            drawEquilArrowOnCanvas(ctx, x1, y1, x2, y2, '#888', 3, topX1, topX2, bottomX1, bottomX2);
          } else if (arrow.type && arrow.type.startsWith('curve')) {
            const peakX = arrow.peakX !== undefined ? previewX + arrow.peakX + offset.x : null;
            const peakY = arrow.peakY !== undefined ? previewY + arrow.peakY + offset.y : null;
            drawCurvedArrowOnCanvas(ctx, x1, y1, x2, y2, arrow.type, '#888', -1, peakX, peakY);
          }
        });
        
        ctx.restore();
      }
  }, [segments, vertices, vertexAtoms, vertexTypes, offset, hoverVertex, hoverSegmentIndex, arrows, arrowPreview, curvedArrowStartPoint, mode, countBondsAtVertex, verticesWith3Bonds, fourthBondMode, fourthBondSource, fourthBondPreview, isSelecting, selectionStart, selectionEnd, selectedSegments, selectedVertices, selectedArrows, selectionBounds, isPasteMode, clipboard, pastePreviewPosition]);

  function drawArrowOnCanvas(ctx, x1, y1, x2, y2, color = "#000", width = 3) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw filled triangle arrowhead shifted to the right from the end tip
    const angle = Math.atan2(y2 - y1, x2 - x1);
    // Offset the entire triangle to the right
    const tipOffset = 3; // Move the tip 3px to the right
    const arrowTipX = x2 + tipOffset * Math.cos(angle);
    const arrowTipY = y2 + tipOffset * Math.sin(angle);
    const headlen = 14;
    const arrowX = arrowTipX - headlen * Math.cos(angle);
    const arrowY = arrowTipY - headlen * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(
      arrowX - 7 * Math.sin(angle),
      arrowY + 7 * Math.cos(angle)
    );
    ctx.lineTo(
      arrowX + 7 * Math.sin(angle),
      arrowY - 7 * Math.cos(angle)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Add larger outward-pointing triangles at both ends of the arrow when in mouse mode
    if (mode === 'mouse') {
      // Triangle at the end (tip) - placed further beyond the arrow tip and larger
      const tipTriangleSize = 12; // Doubled from 6 to 12
      // Slightly increase distance from arrow tip
      const tipDistance = 17;
      const tipX = x2 + tipDistance * Math.cos(angle);
      const tipY = y2 + tipDistance * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - tipTriangleSize * Math.cos(angle) - tipTriangleSize * Math.sin(angle),
        tipY - tipTriangleSize * Math.sin(angle) + tipTriangleSize * Math.cos(angle)
      );
      ctx.lineTo(
        tipX - tipTriangleSize * Math.cos(angle) + tipTriangleSize * Math.sin(angle),
        tipY - tipTriangleSize * Math.sin(angle) - tipTriangleSize * Math.cos(angle)
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(54, 98, 227, 0.7)';
      ctx.fill();
      
      // Triangle at the start - placed further beyond the start point and larger
      const startTriangleSize = 12; // Doubled from 6 to 12
      // Slightly increase distance from arrow start
      const startDistance = 17;
      const startX = x1 - startDistance * Math.cos(angle);
      const startY = y1 - startDistance * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + startTriangleSize * Math.cos(angle) - startTriangleSize * Math.sin(angle),
        startY + startTriangleSize * Math.sin(angle) + startTriangleSize * Math.cos(angle)
      );
      ctx.lineTo(
        startX + startTriangleSize * Math.cos(angle) + startTriangleSize * Math.sin(angle),
        startY + startTriangleSize * Math.sin(angle) - startTriangleSize * Math.cos(angle)
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(54, 98, 227, 0.7)';
      ctx.fill();
    }
    
    ctx.restore();
  }

  function drawEquilArrowOnCanvas(ctx, x1, y1, x2, y2, color = "#000", width = 3, topX1, topX2, bottomX1, bottomX2, arrowIndex = -1) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    
    // Use separate coordinates if provided, otherwise use the defaults
    const topStartX = topX1 !== undefined ? topX1 : x1;
    const topEndX = topX2 !== undefined ? topX2 : x2;
    const bottomStartX = bottomX1 !== undefined ? bottomX1 : x1;
    const bottomEndX = bottomX2 !== undefined ? bottomX2 : x2;
    
    // Top arrow: left to right
    ctx.beginPath();
    ctx.moveTo(topStartX, y1 - 5);
    ctx.lineTo(topEndX, y1 - 5);
    ctx.stroke();
    
    // Right arrowhead (filled triangle) - shifted to the right
    const angleR = 0; // horizontal
    const headlen = 14;
    // Offset the entire top triangle to the right
    const tipOffset = 3; // Move the tip 3px to the right
    const rx = topEndX + tipOffset;
    const ry = y1 - 5;
    const arrowX = rx - headlen * Math.cos(angleR);
    const arrowY = ry - headlen * Math.sin(angleR);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(arrowX - 7 * Math.sin(angleR), arrowY + 7 * Math.cos(angleR));
    ctx.lineTo(arrowX + 7 * Math.sin(angleR), arrowY - 7 * Math.cos(angleR));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Add large outward-pointing triangle at the right end in mouse mode
    if (mode === 'mouse') {
      const triangleSize = 16; // Increased from 12 to 16
      const triangleOffset = 18; // Increased from 14 to 18 for better positioning

      // Get hover information for special hover effects
      const { index: hoveredArrowIndex, part: hoveredArrowPart } = isPointInArrowCircle(
        rx + offset.x, ry, true // Pass current coords and skipDistance=true to just check if this is the hovered arrow
      );
      const isHoveredTopEnd = hoveredArrowIndex === arrowIndex && hoveredArrowPart === 'topEnd';
      
      // Right triangle (pointing right) - top half only for equilibrium arrows to avoid overlap
      ctx.beginPath();
      ctx.moveTo(rx + triangleOffset, ry);
      ctx.lineTo(rx + triangleOffset - triangleSize, ry - triangleSize);
      ctx.lineTo(rx + triangleOffset - triangleSize, ry); // Changed: only go to center height, not below
      ctx.closePath();
      // Use darker color when hovered
      ctx.fillStyle = isHoveredTopEnd ? 'rgba(25, 98, 180, 0.85)' : 'rgba(54, 98, 227, 0.7)';
      ctx.fill();
      
      // Top left triangle indicator has been removed
    }
    
    // Bottom arrow: right to left
    ctx.beginPath();
    ctx.moveTo(bottomEndX, y2 + 5);
    ctx.lineTo(bottomStartX, y2 + 5);
    ctx.stroke();
    
    // Left arrowhead (filled triangle) - shifted to the left
    const angleL = Math.PI; // horizontal, left
    // Offset the entire bottom triangle to the left
    const tipOffsetL = 3; // Move the tip 3px to the left
    const lx = bottomStartX - tipOffsetL;
    const ly = y2 + 5;
    const arrowXL = lx - headlen * Math.cos(angleL);
    const arrowYL = ly - headlen * Math.sin(angleL);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(arrowXL - 7 * Math.sin(angleL), arrowYL + 7 * Math.cos(angleL));
    ctx.lineTo(arrowXL + 7 * Math.sin(angleL), arrowYL - 7 * Math.cos(angleL));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Add large outward-pointing triangles at both ends in mouse mode
    if (mode === 'mouse') {
      const triangleSize = 16; // Increased from 12 to 16
      const triangleOffset = 18; // Increased from 14 to 18 for better positioning
      
      // Get hover information for special hover effects
      const { index: hoveredArrowIndex, part: hoveredArrowPart } = isPointInArrowCircle(
        lx + offset.x, ly, true // Pass current coords and skipDistance=true to just check if this is the hovered arrow
      );
      const isHoveredBottomStart = hoveredArrowIndex === arrowIndex && hoveredArrowPart === 'bottomStart';
      
      // Left triangle (pointing left) for bottom arrow - bottom half only for equilibrium arrows to avoid overlap
      ctx.beginPath();
      ctx.moveTo(lx - triangleOffset, ly);
      ctx.lineTo(lx - triangleOffset + triangleSize, ly); // Changed: only go to center height, not above
      ctx.lineTo(lx - triangleOffset + triangleSize, ly + triangleSize);
      ctx.closePath();
      // Use darker color when hovered
      ctx.fillStyle = isHoveredBottomStart ? 'rgba(25, 98, 180, 0.85)' : 'rgba(54, 98, 227, 0.7)';
      ctx.fill();
      
      // Bottom right triangle indicator has been removed
    }
    
    ctx.restore();
  }

  // Helper function to calculate the peak position of a curved arrow
  const calculateCurvedArrowPeak = (x1, y1, x2, y2, type) => {
    // Calculate distance and midpoint between the two points
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    // Perpendicular vector to the line from start to end
    const perpX = -deltaY / (distance || 1);
    const perpY = deltaX / (distance || 1);
    
    // Determine direction and curvature level
    const isTopRow = ['curve0', 'curve1', 'curve2'].includes(type);
    const curvatureMap = {
      'curve0': 0.25, 'curve1': 0.6, 'curve2': 1.0,
      'curve3': 0.25, 'curve4': 0.6, 'curve5': 1.0
    };
    
    // Get curvature factor for this arrow type
    const curveFactor = curvatureMap[type] || 0.5;
    
    // Calculate peak position directly - simpler and more predictable
    const peakHeight = distance * curveFactor;
    
    // Calculate peak position by moving perpendicular to the line
    let peakX, peakY;
    if (isTopRow) {
      // Clockwise arrows (top row) - peak below the line
      peakX = midX - perpX * peakHeight;
      peakY = midY - perpY * peakHeight;
    } else {
      // Counterclockwise arrows (bottom row) - peak above the line
      peakX = midX + perpX * peakHeight;
      peakY = midY + perpY * peakHeight;
    }
    
    return { x: peakX, y: peakY };
  };

  // Draw curved arrows based on type
  function drawCurvedArrowOnCanvas(ctx, x1, y1, x2, y2, type, color = "#000", arrowIndex = -1, peakX = null, peakY = null, arrowsArray = null) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color;

    // Default values
    let startX = x1;
    let startY = y1;
    let endX = x2;
    let endY = y2;
    
    // If peak position is not provided, calculate it based on type
    if (peakX === null || peakY === null) {
      const peakPos = calculateCurvedArrowPeak(startX, startY, endX, endY, type);
      peakX = peakPos.x;
      peakY = peakPos.y;
    }
    
    // Draw using quadratic Bezier curve with the peak as the control point
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(peakX, peakY, endX, endY);
    ctx.stroke();
    
    // Calculate tangent at the end point for the arrowhead
    // For a quadratic Bezier curve, the tangent at t=1 (end point) is the direction from the control point to the end point
    const tangentX = endX - peakX;
    const tangentY = endY - peakY;
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
    
    // Normalize the tangent vector
    const normalizedTangentX = tangentX / tangentLength;
    const normalizedTangentY = tangentY / tangentLength;
    
    // Draw arrowhead - move triangle forward so its center is at the curve end
    const headlen = 14;
    const triangleOffset = 7; // Move triangle forward by half its width
    
    // Move the tip forward along the tangent
    const arrowTipX = endX + triangleOffset * normalizedTangentX;
    const arrowTipY = endY + triangleOffset * normalizedTangentY;
    
    const arrowX = arrowTipX - headlen * normalizedTangentX;
    const arrowY = arrowTipY - headlen * normalizedTangentY;
    
    const angle = Math.atan2(normalizedTangentY, normalizedTangentX);
    
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(
      arrowX - 7 * Math.sin(angle),
      arrowY + 7 * Math.cos(angle)
    );
    ctx.lineTo(
      arrowX + 7 * Math.sin(angle),
      arrowY - 7 * Math.cos(angle)
    );
    ctx.closePath();
    ctx.fill();
    
    // Add blue circles at both endpoints when in mouse mode
    if (mode === 'mouse') {
      const circleRadius = 10;
      
      // Get hover information for special hover effects using the hover state
      const isHoveredStart = hoverCurvedArrow.index === arrowIndex && hoverCurvedArrow.part === 'start';
      const isHoveredEnd = hoverCurvedArrow.index === arrowIndex && hoverCurvedArrow.part === 'end';
      const isHoveredPeak = hoverCurvedArrow.index === arrowIndex && hoverCurvedArrow.part === 'peak';
      
      // Blue circle at start point
      ctx.beginPath();
      ctx.arc(startX, startY, circleRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHoveredStart ? 'rgba(25, 98, 180, 0.85)' : 'rgba(54, 98, 227, 0.6)';
      ctx.fill();
      
      // Blue circle at end point
      ctx.beginPath();
      ctx.arc(endX, endY, circleRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHoveredEnd ? 'rgba(25, 98, 180, 0.85)' : 'rgba(54, 98, 227, 0.6)';
      ctx.fill();
      
      // Blue circle at peak point
      // For quadratic Bezier curves, the actual peak on the curve at t=0.5 is:
      // P(0.5) = 0.25 * P0 + 0.5 * P1 + 0.25 * P2
      // where P0=start, P1=control point (peakX,peakY), P2=end
      if (peakX !== null && peakY !== null) {
        // Calculate the actual point on the curve at t=0.5
        const actualCurvePeakX = 0.25 * startX + 0.5 * peakX + 0.25 * endX;
        const actualCurvePeakY = 0.25 * startY + 0.5 * peakY + 0.25 * endY;
        
        ctx.beginPath();
        ctx.arc(actualCurvePeakX, actualCurvePeakY, circleRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isHoveredPeak ? 'rgba(25, 98, 180, 0.85)' : 'rgba(54, 98, 227, 0.6)';
        ctx.fill();
      } else {
        // Fallback: calculate peak if not provided
        const peakPos = calculateCurvedArrowPeak(startX, startY, endX, endY, type);
        if (peakPos) {
          // Calculate actual curve peak from control point
          const actualCurvePeakX = 0.25 * startX + 0.5 * peakPos.x + 0.25 * endX;
          const actualCurvePeakY = 0.25 * startY + 0.5 * peakPos.y + 0.25 * endY;
          
          ctx.beginPath();
          ctx.arc(actualCurvePeakX, actualCurvePeakY, circleRadius, 0, 2 * Math.PI);
          ctx.fillStyle = isHoveredPeak ? 'rgba(25, 98, 180, 0.85)' : 'rgba(54, 98, 227, 0.6)';
          ctx.fill();
        }
      }
    }
    
    ctx.restore();
  }

  // Check if a point is inside a blue circle indicator
  const isPointInIndicator = useCallback((x, y) => {
    // Check if any indicator was clicked
    for (const vertex of verticesWith3Bonds) {
      if (vertex.indicatorArea) {
        const dx = x - vertex.indicatorArea.x;
        const dy = y - vertex.indicatorArea.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= vertex.indicatorArea.radius) {
          return vertex; // Return the vertex associated with this indicator
        }
      }
    }
    return null; // No indicator was clicked
  }, [verticesWith3Bonds]);

  // Helper functions for selection box intersection
  const isPointInRect = (px, py, x1, y1, x2, y2) => {
    return px >= x1 && px <= x2 && py >= y1 && py <= y2;
  };

  const isLineIntersectingRect = (lx1, ly1, lx2, ly2, rx1, ry1, rx2, ry2) => {
    // Check if either endpoint is inside the rectangle
    if (isPointInRect(lx1, ly1, rx1, ry1, rx2, ry2) || 
        isPointInRect(lx2, ly2, rx1, ry1, rx2, ry2)) {
      return true;
    }
    
    // Check if line intersects with any edge of the rectangle
    const intersectsEdge = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denom) < 1e-10) return false; // parallel lines
      
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
      
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };
    
    // Check intersection with all four edges of rectangle
    return intersectsEdge(lx1, ly1, lx2, ly2, rx1, ry1, rx2, ry1) || // top edge
           intersectsEdge(lx1, ly1, lx2, ly2, rx2, ry1, rx2, ry2) || // right edge
           intersectsEdge(lx1, ly1, lx2, ly2, rx2, ry2, rx1, ry2) || // bottom edge
           intersectsEdge(lx1, ly1, lx2, ly2, rx1, ry2, rx1, ry1);   // left edge
  };

  // Function to update selection based on current selection box
  const updateSelection = useCallback(() => {
    if (!isSelecting) return;
    
    const x1 = Math.min(selectionStart.x, selectionEnd.x);
    const y1 = Math.min(selectionStart.y, selectionEnd.y);
    const x2 = Math.max(selectionStart.x, selectionEnd.x);
    const y2 = Math.max(selectionStart.y, selectionEnd.y);
    
    const newSelectedSegments = new Set();
    const newSelectedVertices = new Set();
    const newSelectedArrows = new Set();
    
    // Check segments
    segments.forEach((segment, index) => {
      const sx1 = segment.x1 + offset.x;
      const sy1 = segment.y1 + offset.y;
      const sx2 = segment.x2 + offset.x;
      const sy2 = segment.y2 + offset.y;
      
      if (isLineIntersectingRect(sx1, sy1, sx2, sy2, x1, y1, x2, y2)) {
        newSelectedSegments.add(index);
      }
    });
    
    // Check vertices
    vertices.forEach((vertex, index) => {
      const vx = vertex.x + offset.x;
      const vy = vertex.y + offset.y;
      
      if (isPointInRect(vx, vy, x1, y1, x2, y2)) {
        newSelectedVertices.add(index);
      }
    });
    
    // Check arrows
    arrows.forEach((arrow, index) => {
      const ax1 = arrow.x1 + offset.x;
      const ay1 = arrow.y1 + offset.y;
      const ax2 = arrow.x2 + offset.x;
      const ay2 = arrow.y2 + offset.y;
      
      if (isLineIntersectingRect(ax1, ay1, ax2, ay2, x1, y1, x2, y2)) {
        newSelectedArrows.add(index);
      }
    });
    
    setSelectedSegments(newSelectedSegments);
    setSelectedVertices(newSelectedVertices);
    setSelectedArrows(newSelectedArrows);
    
    // Store selection bounds if any items are selected
    if (newSelectedSegments.size > 0 || newSelectedVertices.size > 0 || newSelectedArrows.size > 0) {
      setSelectionBounds({ x1, y1, x2, y2 });
    } else {
      setSelectionBounds(null);
    }
  }, [isSelecting, selectionStart, selectionEnd, segments, vertices, arrows, offset]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedSegments(new Set());
    setSelectedVertices(new Set());
    setSelectedArrows(new Set());
    setSelectionBounds(null);
  }, []);
  
  // Copy selected items to clipboard
  const copySelection = useCallback(() => {
    if (selectedSegments.size === 0 && selectedVertices.size === 0 && selectedArrows.size === 0) {
      return; // Nothing to copy
    }
    
    // Calculate bounds of selected items
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    // Include selected vertices in bounds
    selectedVertices.forEach(vertexIndex => {
      const vertex = vertices[vertexIndex];
      if (vertex) {
        minX = Math.min(minX, vertex.x);
        maxX = Math.max(maxX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxY = Math.max(maxY, vertex.y);
      }
    });
    
    // Include vertices of selected segments in bounds
    selectedSegments.forEach(segmentIndex => {
      const segment = segments[segmentIndex];
      if (segment) {
        minX = Math.min(minX, segment.x1);
        maxX = Math.max(maxX, segment.x1);
        minY = Math.min(minY, segment.y1);
        maxY = Math.max(maxY, segment.y1);
        minX = Math.min(minX, segment.x2);
        maxX = Math.max(maxX, segment.x2);
        minY = Math.min(minY, segment.y2);
        maxY = Math.max(maxY, segment.y2);
      }
    });
    
    // Include arrows in bounds
    selectedArrows.forEach(arrowIndex => {
      const arrow = arrows[arrowIndex];
      if (arrow) {
        minX = Math.min(minX, arrow.x1, arrow.x2);
        maxX = Math.max(maxX, arrow.x1, arrow.x2);
        minY = Math.min(minY, arrow.y1, arrow.y2);
        maxY = Math.max(maxY, arrow.y1, arrow.y2);
        
        // Include peak positions for curved arrows
        if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
          minX = Math.min(minX, arrow.peakX);
          maxX = Math.max(maxX, arrow.peakX);
          minY = Math.min(minY, arrow.peakY);
          maxY = Math.max(maxY, arrow.peakY);
        }
      }
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Create a map of vertices that need to be copied (either selected or part of selected segments)
    const verticesToCopy = new Map(); // Map from old vertex ID to new index in copied array
    const copiedVertices = [];
    
    // Add selected vertices
    selectedVertices.forEach(vertexIndex => {
      const vertex = vertices[vertexIndex];
      if (vertex) {
        const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
        if (!verticesToCopy.has(vertexKey)) {
          verticesToCopy.set(vertexKey, copiedVertices.length);
          copiedVertices.push({
            x: vertex.x - centerX,
            y: vertex.y - centerY,
            atom: vertexAtoms[vertexKey] || null,
            type: vertexTypes[vertexKey] || null
          });
        }
      }
    });
    
    // Add vertices from selected segments
    selectedSegments.forEach(segmentIndex => {
      const segment = segments[segmentIndex];
      if (segment) {
        // Find vertices at segment endpoints
        const v1 = vertices.find(v => Math.abs(v.x - segment.x1) < 0.01 && Math.abs(v.y - segment.y1) < 0.01);
        const v2 = vertices.find(v => Math.abs(v.x - segment.x2) < 0.01 && Math.abs(v.y - segment.y2) < 0.01);
        
        if (v1) {
          const v1Key = `${v1.x.toFixed(2)},${v1.y.toFixed(2)}`;
          if (!verticesToCopy.has(v1Key)) {
            verticesToCopy.set(v1Key, copiedVertices.length);
            copiedVertices.push({
              x: v1.x - centerX,
              y: v1.y - centerY,
              atom: vertexAtoms[v1Key] || null,
              type: vertexTypes[v1Key] || null
            });
          }
        }
        
        if (v2) {
          const v2Key = `${v2.x.toFixed(2)},${v2.y.toFixed(2)}`;
          if (!verticesToCopy.has(v2Key)) {
            verticesToCopy.set(v2Key, copiedVertices.length);
            copiedVertices.push({
              x: v2.x - centerX,
              y: v2.y - centerY,
              atom: vertexAtoms[v2Key] || null,
              type: vertexTypes[v2Key] || null
            });
          }
        }
      }
    });
    
    // Copy segments with updated vertex references
    const copiedSegments = [];
    selectedSegments.forEach(segmentIndex => {
      const segment = segments[segmentIndex];
      if (segment && segment.bondOrder > 0) {
        // Find vertex indices for segment endpoints
        const v1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
        const v2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
        
        if (verticesToCopy.has(v1Key) && verticesToCopy.has(v2Key)) {
          copiedSegments.push({
            vertex1Index: verticesToCopy.get(v1Key),
            vertex2Index: verticesToCopy.get(v2Key),
            bondType: segment.bondType,
            bondOrder: segment.bondOrder,
            bondDirection: segment.bondDirection,
            direction: segment.direction,
            upperVertex: segment.upperVertex,
            lowerVertex: segment.lowerVertex,
            flipSmallerLine: segment.flipSmallerLine
          });
        }
      }
    });
    
    // Copy arrows with relative positions
    const copiedArrows = [];
    selectedArrows.forEach(arrowIndex => {
      const arrow = arrows[arrowIndex];
      if (arrow) {
        const copiedArrow = {
          x1: arrow.x1 - centerX,
          y1: arrow.y1 - centerY,
          x2: arrow.x2 - centerX,
          y2: arrow.y2 - centerY,
          type: arrow.type
        };
        
        // Copy additional properties for different arrow types
        if (arrow.type === 'equilibrium') {
          if (arrow.topX1 !== undefined) copiedArrow.topX1 = arrow.topX1 - centerX;
          if (arrow.topX2 !== undefined) copiedArrow.topX2 = arrow.topX2 - centerX;
          if (arrow.bottomX1 !== undefined) copiedArrow.bottomX1 = arrow.bottomX1 - centerX;
          if (arrow.bottomX2 !== undefined) copiedArrow.bottomX2 = arrow.bottomX2 - centerX;
        } else if (arrow.type && arrow.type.startsWith('curve')) {
          if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
            copiedArrow.peakX = arrow.peakX - centerX;
            copiedArrow.peakY = arrow.peakY - centerY;
          }
        }
        
        copiedArrows.push(copiedArrow);
      }
    });
    
    setClipboard({
      vertices: copiedVertices,
      segments: copiedSegments,
      arrows: copiedArrows,
      bounds: {
        minX: minX - centerX,
        maxX: maxX - centerX,
        minY: minY - centerY,
        maxY: maxY - centerY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: 0,
        centerY: 0
      }
    });
    
    // Immediately enter paste mode after copying
    setIsPasteMode(true);
    clearSelection();
  }, [selectedSegments, selectedVertices, selectedArrows, segments, vertices, vertexAtoms, vertexTypes, arrows, clearSelection]);
  

  
  // Cancel paste mode
  const cancelPasteMode = useCallback(() => {
    setIsPasteMode(false);
  }, []);
  
  // Paste clipboard contents at given position
  const pasteAtPosition = useCallback((x, y) => {
    if (!clipboard) return;
    
    const offsetX = x - offset.x;
    const offsetY = y - offset.y;
    
    // Create new vertices
    const newVertexMap = new Map(); // Map from clipboard index to new vertex
    const newVertices = [...vertices];
    const newVertexAtoms = { ...vertexAtoms };
    const newVertexTypes = { ...vertexTypes };
    
    clipboard.vertices.forEach((clipVertex, index) => {
      const newVertex = {
        x: offsetX + clipVertex.x,
        y: offsetY + clipVertex.y
      };
      
      newVertices.push(newVertex);
      newVertexMap.set(index, newVertex);
      
      // Create vertex key for atoms/types
      const vertexKey = `${newVertex.x.toFixed(2)},${newVertex.y.toFixed(2)}`;
      
      if (clipVertex.atom) {
        newVertexAtoms[vertexKey] = clipVertex.atom;
      }
      if (clipVertex.type) {
        newVertexTypes[vertexKey] = clipVertex.type;
      }
    });
    
    // Create new segments
    const newSegments = [...segments];
    clipboard.segments.forEach(clipSegment => {
      const vertex1 = newVertexMap.get(clipSegment.vertex1Index);
      const vertex2 = newVertexMap.get(clipSegment.vertex2Index);
      
      if (vertex1 && vertex2) {
        newSegments.push({
          x1: vertex1.x,
          y1: vertex1.y,
          x2: vertex2.x,
          y2: vertex2.y,
          bondOrder: clipSegment.bondOrder || 1,
          bondType: clipSegment.bondType || null,
          bondDirection: clipSegment.bondDirection,
          direction: clipSegment.direction,
          upperVertex: clipSegment.upperVertex,
          lowerVertex: clipSegment.lowerVertex,
          flipSmallerLine: clipSegment.flipSmallerLine
        });
      }
    });
    
    // Create new arrows
    const newArrows = [...arrows];
    clipboard.arrows.forEach(clipArrow => {
      const newArrow = {
        x1: offsetX + clipArrow.x1,
        y1: offsetY + clipArrow.y1,
        x2: offsetX + clipArrow.x2,
        y2: offsetY + clipArrow.y2,
        type: clipArrow.type
      };
      
      // Copy additional properties
      if (clipArrow.type === 'equilibrium') {
        if (clipArrow.topX1 !== undefined) newArrow.topX1 = offsetX + clipArrow.topX1;
        if (clipArrow.topX2 !== undefined) newArrow.topX2 = offsetX + clipArrow.topX2;
        if (clipArrow.bottomX1 !== undefined) newArrow.bottomX1 = offsetX + clipArrow.bottomX1;
        if (clipArrow.bottomX2 !== undefined) newArrow.bottomX2 = offsetX + clipArrow.bottomX2;
      } else if (clipArrow.type && clipArrow.type.startsWith('curve')) {
        if (clipArrow.peakX !== undefined && clipArrow.peakY !== undefined) {
          newArrow.peakX = offsetX + clipArrow.peakX;
          newArrow.peakY = offsetY + clipArrow.peakY;
        }
      }
      
      newArrows.push(newArrow);
    });
    
    // Update state
    setVertices(newVertices);
    setVertexAtoms(newVertexAtoms);
    setVertexTypes(newVertexTypes);
    setSegments(newSegments);
    setArrows(newArrows);
    
    // Exit paste mode
    setIsPasteMode(false);
  }, [clipboard, vertices, vertexAtoms, vertexTypes, segments, arrows, offset]);

  // Helper function to change mode and clear selection
  const setModeAndClearSelection = useCallback((newMode) => {
    setMode(newMode);
    clearSelection();
    setIsPasteMode(false); // Also cancel paste mode
  }, [clearSelection]);

  // Update selection when selection box changes
  useEffect(() => {
    updateSelection();
  }, [updateSelection, selectionEnd]);

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
    
    // Check fourth bond indicators
    if (verticesWith3Bonds.length > 0) {
      const indicatorVertex = isPointInIndicator(x, y);
      if (indicatorVertex) return true;
    }
    
    return false;
  };

  // Set mode (draw/erase/arrow/text/etc.)
  const selectMode = (m) => {
    // Close any open menus and inputs
    setShowMenu(false);
    setShowAtomInput(false);
    
    // Clear any drawing-in-progress states
    setCurvedArrowStartPoint(null);
    setArrowPreview(null);
    
    // Clear selection state
    setIsSelecting(false);
    setSelectionStart({ x: 0, y: 0 });
    setSelectionEnd({ x: 0, y: 0 });
    
    // Clear hover states when switching modes
    setHoverVertex(null);
    setHoverSegmentIndex(null);
    
    // Update mode
    setMode(m);
  };

  // Handle atom input submission when user presses Enter or clicks outside
  const handleAtomInputSubmit = () => {
    if (menuVertexKey) {
      // If input is empty, remove the atom
      if (!atomInputValue.trim()) {
        const { [menuVertexKey]: _, ...rest } = vertexAtoms;
        setVertexAtoms(rest);
      } else {
        // Otherwise, set the atom with the input value
        setVertexAtoms(prev => ({ ...prev, [menuVertexKey]: atomInputValue.trim() }));
      }
    }
    setShowAtomInput(false);
  };
  
  // Handle atom input key events (Enter to submit, Escape to cancel)
  const handleAtomInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAtomInputSubmit();
    } else if (e.key === 'Escape') {
      setShowAtomInput(false);
    }
  };
  
  // Legacy handler for the pop-up menu (no longer used)
  const handleSelectAtom = (symbol) => {
    if (menuVertexKey) {
      setVertexAtoms(prev => ({ ...prev, [menuVertexKey]: symbol }));
    }
    setShowMenu(false);
  };

  // Function to detect rings whenever molecules change
  const detectRings = useCallback(() => {
    const ringInfo = getRingInfo(vertices, segments, vertexAtoms);
    setDetectedRings(ringInfo.rings);
    
    // For debugging (can be removed in production)

    if (ringInfo.rings.length > 0) {
      // Rings detected
    }
  }, [vertices, segments, vertexAtoms]);

  // Handle clicks for draw vs erase
  const handleClick = useCallback(event => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Handle paste mode click - should work in any mode
    if (isPasteMode) {
      pasteAtPosition(x, y);
      return; // Exit early after pasting
    }

    // Handle fourth bond mode
    if (fourthBondMode) {
      if (fourthBondPreview) {
        // Calculate normalized direction vector from source to end
        const dx = fourthBondPreview.endX - (fourthBondSource.x + offset.x);
        const dy = fourthBondPreview.endY - (fourthBondSource.y + offset.y);
        const length = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / length; // unit vector x
        const uy = dy / length; // unit vector y
        
        // Calculate the endpoint coordinates for the new bond
        const endX = fourthBondSource.x + ux * hexRadius;
        const endY = fourthBondSource.y + uy * hexRadius;
        
        // Add the new segment as a permanent bond using constant length (hexRadius)
        // Use the current stereochemistry mode if active
        const bondType = ['wedge', 'dash', 'ambiguous'].includes(mode) ? mode : null;
        const direction = calculateBondDirection(fourthBondSource.x, fourthBondSource.y, endX, endY);
        
        // Add the new endpoint as a vertex if it doesn't already exist
        const newEndpointVertex = { x: endX, y: endY };
        
        // Check if vertex already exists
        const vertexExists = vertices.some(
          v => Math.abs(v.x - endX) < 0.01 && Math.abs(v.y - endY) < 0.01
        );
        
        if (!vertexExists) {
          setVertices(prevVertices => {
            const newVertices = [...prevVertices, newEndpointVertex];
            // Run ring detection after adding a vertex
            setTimeout(detectRings, 0);
            return newVertices;
          });
        }
        
        setSegments(prevSegments => [
          ...prevSegments,
          {
            x1: fourthBondSource.x,
            y1: fourthBondSource.y,
            x2: endX,
            y2: endY,
            bondOrder: 1, // Single bond
            bondType: bondType, // Apply stereochemistry if in stereochemistry mode
            bondDirection: 1, // Default direction
            direction: direction, // Calculate direction
            flipSmallerLine: false // Default to false
          }
        ]);
        
        // Create a key for the endpoint vertex
        const vertexKey = `${endX.toFixed(2)},${endY.toFixed(2)}`;
        setMenuVertexKey(vertexKey);
        
        // Position the atom input at the endpoint
        setAtomInputPosition({ 
          x: endX + offset.x, 
          y: endY + offset.y 
        });
        
        // Clear any existing value in the atom input
        setAtomInputValue('');
        
        // Show the atom input box for the new endpoint
        setShowAtomInput(true);
        
        // Exit fourth bond mode
        setFourthBondMode(false);
        setFourthBondSource(null);
        setFourthBondPreview(null);
        
        // Also clear the 3-bond indicators as this vertex now has 4 bonds
        setVerticesWith3Bonds(prev => 
          prev.filter(v => 
            !(Math.abs(v.x - fourthBondSource.x) < 0.01 && Math.abs(v.y - fourthBondSource.y) < 0.01)
          )
        );
      }
      return; // Exit early
    }
    
    // Check if we clicked on a blue circle indicator (3-bond vertex)
    // Allow clicking on indicator in both draw and stereochemistry modes
    const isDrawOrStereochemistryMode = mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous';
    const indicatorVertex = isPointInIndicator(x, y);
    if (indicatorVertex && isDrawOrStereochemistryMode) {
      // Enter fourth bond mode with this vertex as source
      setFourthBondMode(true);
      setFourthBondSource(indicatorVertex);
      return; // Exit early
    }

    // --- Handle charge/lone pair assignment ---
    if (mode === 'plus' || mode === 'minus' || mode === 'lone') {
      let foundVertex = null;
      let minV = vertexThreshold;
      for (let v of vertices) {
        const dist = distanceToVertex(x, y, v.x, v.y);
        if (dist <= minV) {
          minV = dist;
          foundVertex = v;
        }
      }
      if (foundVertex) {
        const key = `${foundVertex.x.toFixed(2)},${foundVertex.y.toFixed(2)}`;
        if (vertexAtoms[key]) {
          setVertexAtoms(prev => {
            const prevVal = prev[key];
            let newVal = prevVal;
            if (typeof prevVal === 'string') {
              newVal = { symbol: prevVal };
            }
            if (mode === 'plus') {
              // Toggle +1 charge (cycle: 0 -> +1 -> 0)
              const charge = newVal.charge === 1 ? 0 : 1;
              return { ...prev, [key]: { ...newVal, charge } };
            } else if (mode === 'minus') {
              // Toggle -1 charge (cycle: 0 -> -1 -> 0)
              const charge = newVal.charge === -1 ? 0 : -1;
              return { ...prev, [key]: { ...newVal, charge } };
            } else if (mode === 'lone') {
              // Get vertex type information
              const vertexType = getType(foundVertex, vertexTypes, segments);
              const isTopStatus = getIfTop(foundVertex, segments);
              
              // Calculate lone pair position order for this specific vertex
              const connectedBonds = getConnectedBonds(foundVertex, segments);
              const priorityOrder = getLonePairPositionOrder(connectedBonds, foundVertex);
      
              
              // Increment lone pairs count and store the priority order
              const lonePairs = ((newVal.lonePairs || 0) + 1) % 9;
              return { ...prev, [key]: { ...newVal, lonePairs, lonePairOrder: priorityOrder } };
            }
            return prev;
          });
        }
      }
      return;
    }

    if (mode === 'erase') {
      // Close atom input if open
      setShowAtomInput(false);
      
      // First check if we're erasing an arrow (straight or equilibrium)
      const { index: arrowIndex } = isPointInArrowCircle(x, y, true);
      if (arrowIndex !== -1) {
        // Remove this arrow
        setArrows(arrows => arrows.filter((_, i) => i !== arrowIndex));
        return;
      }
      
      // Check if we're erasing a curved arrow
      const curvedArrowIndex = isPointOnCurvedArrow(x, y);
      if (curvedArrowIndex !== -1) {
        // Remove this curved arrow
        setArrows(arrows => arrows.filter((_, i) => i !== curvedArrowIndex));
        return;
      }
      
      // Erase any bond or atom under cursor
      let bondRemoved = false;
      let removedSegment = null;
      const newSegments = segments.map(seg => {
        if (!bondRemoved) {
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
          if (distSeg <= lineThreshold && seg.bondOrder > 0) {
            bondRemoved = true;
            // Remember the segment we're removing for checking 3-bond vertices
            removedSegment = {...seg};
            // Clear both bondOrder and bondType when erasing, but preserve direction
            const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
            return { 
              ...seg, 
              bondOrder: 0, 
              bondType: null, 
              direction: direction,
              upperVertex: undefined, // Clear double bond vertices
              lowerVertex: undefined, // Clear double bond vertices
              flipSmallerLine: false // Reset to false
            };
          }
        }
        return seg;
      });
      if (bondRemoved) {
        setSegments(newSegments);
        
        // Run ring detection after bond changes
        setTimeout(detectRings, 0);
        // Clear the 3-bond indicator
        setVerticesWith3Bonds([]);
        return;
      }
      // If no bond, erase atom
      for (let v of vertices) {
        const dist = distanceToVertex(x, y, v.x, v.y);
        if (dist <= vertexThreshold) {
          const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
          if (vertexAtoms[key]) {
            const { [key]: _, ...rest } = vertexAtoms;
            setVertexAtoms(rest);
            return;
          }
        }
      }
    } else if (mode === 'arrow' || mode === 'equil' || mode.startsWith('curve')) {
      // Arrow modes: don't do anything on click - arrows are handled separately
      // Arrow placement is handled by handleArrowClick via mouse up events
      return;
    } else if (mode === 'text') {
      // Text mode: Create a vertex at the clicked position and immediately show input box
      
      // Calculate coordinates in the grid reference frame (subtract offset)
      const gridX = x - offset.x;
      const gridY = y - offset.y;
      
      // Create a new vertex at the exact click position
      const newVertex = { x: gridX, y: gridY };
      
      // Add the new vertex
      setVertices(prevVertices => [...prevVertices, newVertex]);
      
      // Mark this vertex as free-floating (created in text mode)
      const vertexKey = `${gridX.toFixed(2)},${gridY.toFixed(2)}`;
      setFreeFloatingVertices(prev => {
        const newSet = new Set(prev);
        newSet.add(vertexKey);
        return newSet;
      });
      
      setMenuVertexKey(vertexKey);
      
      // Position the input box at the clicked position
      setAtomInputPosition({ x, y });
      
      // Clear any existing value in the atom input
      setAtomInputValue('');
      
      // Show the input box
      setShowAtomInput(true);
      return;
    } else if (mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') {
      // Allow bond creation and atom selection in draw and stereochemistry modes
      // Snap to nearest vertex or segment
      let nearestVertex = null;
      let minV = vertexThreshold;
      for (let v of vertices) {
        const dist = distanceToVertex(x, y, v.x, v.y);
        if (dist <= minV) {
          minV = dist;
          nearestVertex = v;
        }
      }
      if (nearestVertex) {
        const key = `${nearestVertex.x.toFixed(2)},${nearestVertex.y.toFixed(2)}`;
        setMenuVertexKey(key);
        
        // Position the input box at the vertex position
        setAtomInputPosition({ x: nearestVertex.x + offset.x, y: nearestVertex.y + offset.y });
        
        // Set initial value if there's an existing atom
        const existingAtom = vertexAtoms[key];
        if (existingAtom) {
          const symbol = existingAtom.symbol || existingAtom;
          setAtomInputValue(symbol);
        } else {
          setAtomInputValue('');
        }
        
        // Show the input box instead of menu
        setShowAtomInput(true);
        return;
      }
      let closestIdx = null;
      let minDist = lineThreshold;
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
        if (distSeg < minDist) {
          minDist = distSeg;
          closestIdx = idx;
        }
      });
      if (closestIdx !== null) {
        setSegments(segments => {
          // Determine bond settings based on mode
          let updatedSegments;
          if (mode === 'draw') {
            // Normal draw mode - cycle through bond orders with no special bond type
            updatedSegments = segments.map((seg, idx) => {
              if (idx === closestIdx) {
                const newBondOrder = seg.bondOrder === 0 ? 1 : seg.bondOrder === 1 ? 2 : 0;
                const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
                
                // Calculate upperVertex and lowerVertex for double bonds
                let upperVertex, lowerVertex;
                if (newBondOrder === 2) {
                  const vertices = calculateDoubleBondVertices(seg.x1, seg.y1, seg.x2, seg.y2, direction);
                  upperVertex = vertices.upperVertex;
                  lowerVertex = vertices.lowerVertex;
                }
                
                return { 
                  ...seg, 
                  bondOrder: newBondOrder,
                  bondType: null, // Clear any special bond type when using normal draw mode
                  direction: direction, // Ensure direction is set
                  upperVertex: upperVertex, // Only set for double bonds
                  lowerVertex: lowerVertex, // Only set for double bonds
                  flipSmallerLine: false // Default to false for all bonds
                };
              }
              return seg;
            });
          } else if (mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') {
            // Stereochemistry modes - handle creation, flipping, or removal
            updatedSegments = segments.map((seg, idx) => {
              if (idx === closestIdx) {
                // Clicked on this segment
                if (seg.bondOrder === 0) {
                  // If no bond exists, create a new stereochemistry bond
                  const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
                  return {
                    ...seg,
                    bondOrder: 1, // Create a single bond
                    bondType: mode, // Set the stereochemistry type
                    bondDirection: 1, // Default direction (forward)
                    direction: direction, // Ensure direction is set
                    flipSmallerLine: false // Default to false
                  };
                } else if (seg.bondOrder === 1) {
                  if (seg.bondType === mode) {
                    // If the same type of stereochemistry already exists, flip the direction
                    // If already flipped, remove the bond
                    if (seg.bondDirection === -1) {
                      // If already flipped, remove the bond
                      const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
                      return {
                        ...seg,
                        bondOrder: 0,
                        bondType: null,
                        bondDirection: 1, // Reset to default
                        direction: direction, // Ensure direction is set
                        upperVertex: undefined, // Clear double bond vertices
                        lowerVertex: undefined, // Clear double bond vertices
                        flipSmallerLine: false // Reset to false
                      };
                    } else {
                      // Flip the direction
                      const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
                      return {
                        ...seg,
                        bondDirection: -1,
                        direction: direction, // Ensure direction is set
                        flipSmallerLine: seg.flipSmallerLine || false // Preserve existing value or default to false
                      };
                    }
                  } else if (seg.bondType === null) {
                    // Convert normal bond to stereochemistry bond
                    const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
                    return {
                      ...seg,
                      bondType: mode,
                      bondDirection: 1, // Reset to default direction
                      direction: direction, // Ensure direction is set
                      flipSmallerLine: seg.flipSmallerLine || false // Preserve existing value or default to false
                    };
                  }
                } else {
                  // For double bonds (bondOrder === 2), don't apply stereochemistry
                  // Just return the segment unchanged
                  return seg;
                }
              }
              return seg;
            });
          } else {
            // Fallback to preserve current segments
            updatedSegments = [...segments];
          }

          // After changing the segment's bondOrder, check both vertices it connects
          // to see if either now has exactly 3 bonds
          const segment = updatedSegments[closestIdx];
          if (segment) {
            const v1 = { x: segment.x1, y: segment.y1 };
            const v2 = { x: segment.x2, y: segment.y2 };
            
            // Create a temporary function to count single bonds for these specific vertices
            // Create functions to check bond conditions
            const hasAnyDoubleBonds = (vertex) => {
              for (const seg of updatedSegments) {
                if (seg.bondOrder === 2) {
                  if ((Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) || 
                      (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)) {
                    return true;
                  }
                }
              }
              return false;
            };

            const countSingleBonds = (vertex) => {
              let count = 0;
              for (const seg of updatedSegments) {
                if (seg.bondOrder === 1) { // Only count single bonds
                  if ((Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) || 
                      (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)) {
                    count++;
                  }
                }
              }
              return count;
            };
            
            // Check if either vertex qualifies for a fourth bond indicator:
            // - Exactly 3 single bonds
            // - No double bonds
            const v1Qualifies = !hasAnyDoubleBonds(v1) && countSingleBonds(v1) === 3;
            const v2Qualifies = !hasAnyDoubleBonds(v2) && countSingleBonds(v2) === 3;
            
            // Update the state with vertices that have exactly 3 single bonds and no double bonds
            if (v1Qualifies || v2Qualifies) {
              const newVerticesWith3Bonds = [];
              if (v1Qualifies) {
                newVerticesWith3Bonds.push({
                  x: v1.x,
                  y: v1.y,
                  key: `${v1.x.toFixed(2)},${v1.y.toFixed(2)}`
                });
              }
              if (v2Qualifies) {
                newVerticesWith3Bonds.push({
                  x: v2.x,
                  y: v2.y,
                  key: `${v2.x.toFixed(2)},${v2.y.toFixed(2)}`
                });
              }
              setVerticesWith3Bonds(newVerticesWith3Bonds);
            } else {
              // If neither vertex qualifies, clear the indicator
              setVerticesWith3Bonds([]);
            }
          }
          
          return updatedSegments;
        });
        return;
      }
    } else {
      // For any other mode (not draw, erase, arrow, equil, curve, plus, minus, lone)
      // Do nothing - this is just to ensure we don't show menu or create bonds for other modes
      return;
    }
  }, [isDragging, segments, vertices, vertexAtoms, offset, mode, distanceToVertex, lineThreshold, vertexThreshold, isPasteMode, pasteAtPosition]);

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
    ctx.strokeStyle = '#000';
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
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // Only set mouseDownOnCanvas if the mouse is inside the canvas
    if (x >= 0 && y >= 0 && x <= canvasRef.current.width && y <= canvasRef.current.height) {
      setMouseDownOnCanvas(true);
    } else {
      setMouseDownOnCanvas(false);
    }
    
    // Handle paste mode click - should work in any mode
    if (isPasteMode) {
      pasteAtPosition(x, y);
      return; // Exit early after pasting
    }
    
    // Check if clicking on an arrow control circle or end triangles in mouse mode
    if (mode === 'mouse') {
      // First check straight/equilibrium arrows
      const { index: arrowIndex, part: arrowPart } = isPointInArrowCircle(x, y);
      if (arrowIndex !== -1) {
        // Store the arrow and its part that is being dragged
        const arrow = arrows[arrowIndex];
        let pointX, pointY;
        
        if (arrow.type === 'equil') {
          if (arrowPart === 'center') {
            // Center of equilibrium arrow
            pointX = (arrow.x1 + arrow.x2) / 2 + offset.x;
            pointY = arrow.y1 + offset.y;
          } else if (arrowPart === 'topStart') {
            // Left end of top equilibrium arrow
            pointX = arrow.x1 + offset.x;
            pointY = arrow.y1 - 5 + offset.y; 
          } else if (arrowPart === 'topEnd') {
            // Right end of top equilibrium arrow
            pointX = arrow.x2 + offset.x;
            pointY = arrow.y1 - 5 + offset.y;
          } else if (arrowPart === 'bottomStart') {
            // Left end of bottom equilibrium arrow
            pointX = arrow.x1 + offset.x;
            pointY = arrow.y2 + 5 + offset.y;
          } else if (arrowPart === 'bottomEnd') {
            // Right end of bottom equilibrium arrow
            pointX = arrow.x2 + offset.x;
            pointY = arrow.y2 + 5 + offset.y;
          }
        } else {
          // Regular arrow
          if (arrowPart === 'center') {
            // Center of regular arrow
            pointX = (arrow.x1 + arrow.x2) / 2 + offset.x;
            pointY = (arrow.y1 + arrow.y2) / 2 + offset.y;
          } else if (arrowPart === 'start') {
            // Start of regular arrow
            pointX = arrow.x1 + offset.x;
            pointY = arrow.y1 + offset.y;
          } else if (arrowPart === 'end') {
            // End of regular arrow
            pointX = arrow.x2 + offset.x;
            pointY = arrow.y2 + offset.y;
          }
        }
        
        setDraggingArrowIndex(arrowIndex);
        // Store which part of the arrow is being dragged
        setDragArrowOffset({
          x: x - pointX,
          y: y - pointY,
          part: arrowPart
        });
        setDragStart({ x, y });
        setIsDragging(true);
        setDidDrag(false);
        return; // Exit early since we're handling an arrow drag
      }
      
      // Then check curved arrows
      const { index: curvedArrowIndex, part: curvedArrowPart } = isPointInCurvedArrowCircle(x, y);
      if (curvedArrowIndex !== -1) {
        // Store the curved arrow and its part that is being dragged
        const arrow = arrows[curvedArrowIndex];
        let pointX, pointY;
        
        if (curvedArrowPart === 'start') {
          // Start of curved arrow
          pointX = arrow.x1 + offset.x;
          pointY = arrow.y1 + offset.y;
        } else if (curvedArrowPart === 'end') {
          // End of curved arrow
          pointX = arrow.x2 + offset.x;
          pointY = arrow.y2 + offset.y;
        } else if (curvedArrowPart === 'peak') {
          // Peak of curved arrow - need to calculate actual curve peak position
          const startX = arrow.x1 + offset.x;
          const startY = arrow.y1 + offset.y;
          const endX = arrow.x2 + offset.x;
          const endY = arrow.y2 + offset.y;
          
          let controlX, controlY;
          if (arrow.peakX !== undefined && arrow.peakY !== undefined) {
            // Use stored control point position
            controlX = arrow.peakX + offset.x;
            controlY = arrow.peakY + offset.y;
          } else {
            // Calculate control point position if not stored
            const peakPos = calculateCurvedArrowPeak(startX, startY, endX, endY, arrow.type);
            if (peakPos) {
              controlX = peakPos.x;
              controlY = peakPos.y;
            }
          }
          
          // Calculate actual curve peak from control point
          pointX = 0.25 * startX + 0.5 * controlX + 0.25 * endX;
          pointY = 0.25 * startY + 0.5 * controlY + 0.25 * endY;
        }
        
        setDraggingArrowIndex(curvedArrowIndex);
        // Store which part of the arrow is being dragged
        setDragArrowOffset({
          x: x - pointX,
          y: y - pointY,
          part: curvedArrowPart
        });
        setDragStart({ x, y });
        setIsDragging(true);
        setDidDrag(false);
        return; // Exit early since we're handling a curved arrow drag
      }
      
      // Find if user clicked on a free-floating vertex or its box
      for (let v of vertices) {
        const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
        
        if (freeFloatingVertices.has(key)) {
          // Check if click is within the box area for free-floating vertices
          if (isPointInVertexBox(x, y, v)) {
            setDraggingVertex(v);
            // Set dragStart for the canvas offset, not vertex dragging
            setDragStart({ x, y });
            setIsDragging(true);
            setDidDrag(false);
            return; // Exit early since we're handling a free vertex drag
          } else {
            // Fallback to circle detection if no atom or box missed
            const dist = distanceToVertex(x, y, v.x, v.y);
            if (dist <= vertexThreshold) {
              setDraggingVertex(v);
              setDragStart({ x, y });
              setIsDragging(true);
              setDidDrag(false);
              return; // Exit early since we're handling a free vertex drag
            }
          }
        }
      }
    }
    
    // Handle selection box in mouse mode (but not in paste mode)
    if (mode === 'mouse' && !isPointOverInteractiveElement(x, y) && !isPasteMode) {
      // Clear any existing selection
      clearSelection();
      
      // Start selection box
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      setIsDragging(true);
      setDidDrag(false);
      setDragStart({ x, y });
      return; // Exit early since we're starting a selection
    }
    
    // Clear selection if clicking on canvas in mouse mode but on an interactive element
    if (mode === 'mouse') {
      clearSelection();
    }
    
    // Only allow canvas dragging if not in mouse mode
    if (mode !== 'mouse') {
      setDragStart({ x, y });
      setIsDragging(true);
      setDidDrag(false);
    }
    
    // Clear the 3-bond indicators when mouse is pressed - unless we're in draw or stereochemistry mode
    const isDrawOrStereochemistryMode = mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous';
    if (!isDrawOrStereochemistryMode) {
      setVerticesWith3Bonds([]);
    }
  };
  const handleMouseMove = event => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    

    
    // Update paste preview position if in paste mode
    if (isPasteMode && !isDragging) {
      setPastePreviewPosition({ x, y });
    }

    // Handle fourth bond preview mode
    if (fourthBondMode && fourthBondSource && !isDragging) {
      const sourceX = fourthBondSource.x + offset.x;
      const sourceY = fourthBondSource.y + offset.y;

      // Calculate direction vector from source to mouse
      const dx = x - sourceX;
      const dy = y - sourceY;
      const currentLength = Math.sqrt(dx * dx + dy * dy);

      // Normalize direction vector (prevents division by zero with || 1)
      const ux = dx / (currentLength || 1);
      const uy = dy / (currentLength || 1);

      // Set endpoint at constant length in exact mouse direction
      const endX = sourceX + ux * hexRadius;
      const endY = sourceY + uy * hexRadius;
      
      // Update preview
      setFourthBondPreview({
        startX: sourceX,
        startY: sourceY,
        endX: endX,
        endY: endY,
        snappedToVertex: false
      });
      return; // Exit early to prevent other mouse move handling
    }

    // Handle dragging if active
    if (isDragging) {
      setDidDrag(true);
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      // Ensure cursor is 'grabbing' during any drag operation
      canvasRef.current.style.cursor = 'grabbing';
      
      // If we're dragging an arrow in mouse mode
      if (mode === 'mouse' && draggingArrowIndex !== null) {
        // Get the arrow being dragged
        const arrow = arrows[draggingArrowIndex];
        if (arrow) {
          const part = dragArrowOffset.part || 'center';
          
          // Update the arrow's position based on which part is being dragged
          setArrows(prevArrows => {
            return prevArrows.map((a, idx) => {
              if (idx === draggingArrowIndex) {
                if (a.type === 'equil') {
                  // Handle equilibrium arrows
                  if (part === 'center') {
                    // When dragging center, move the whole arrow while preserving the relative positions
                    // of all arrow endpoints
                    const newCenterX = x - dragArrowOffset.x - offset.x;
                    const newCenterY = y - dragArrowOffset.y - offset.y;
                    
                    const currentCenterX = (a.x1 + a.x2) / 2;
                    const dx = newCenterX - currentCenterX;
                    
                    // Calculate new positions for all points, preserving their relative distances
                    const newX1 = a.x1 + dx;
                    const newX2 = a.x2 + dx;
                    const newTopX1 = a.topX1 !== undefined ? a.topX1 + dx : newX1;
                    const newTopX2 = a.topX2 !== undefined ? a.topX2 + dx : newX2;
                    const newBottomX1 = a.bottomX1 !== undefined ? a.bottomX1 + dx : newX1;
                    const newBottomX2 = a.bottomX2 !== undefined ? a.bottomX2 + dx : newX2;
                    
                    return {
                      ...a,
                      x1: newX1,
                      y1: newCenterY,
                      x2: newX2,
                      y2: newCenterY,
                      topX1: newTopX1,
                      topX2: newTopX2, 
                      bottomX1: newBottomX1,
                      bottomX2: newBottomX2
                    };
                  } else                  if (part === 'topStart') {
                    // When dragging top left end, adjust only the top arrow's x1 coordinate
                    const newX1 = x - dragArrowOffset.x - offset.x;
                    
                    return {
                      ...a,
                      // Only update topX1, leaving x1 as the overall bounding box
                      topX1: newX1,
                      // Ensure x1 is the leftmost of all points for bounding box purposes
                      x1: Math.min(newX1, a.bottomX1 !== undefined ? a.bottomX1 : a.x1)
                    };
                  } else if (part === 'topEnd') {
                    // When dragging top right end, adjust both ends of the top arrow while keeping center fixed
                    const newX2 = x - dragArrowOffset.x - offset.x;
                    
                    // Calculate the current center of the top arrow
                    const topCurrentX1 = a.topX1 !== undefined ? a.topX1 : a.x1;
                    const topCurrentX2 = a.topX2 !== undefined ? a.topX2 : a.x2;
                    const topCenter = (topCurrentX1 + topCurrentX2) / 2;
                    
                    // Calculate how much the right endpoint moved
                    const rightSideChange = newX2 - topCurrentX2;
                    
                    // Move the left endpoint by the same amount in the opposite direction to maintain center
                    const newX1 = topCurrentX1 - rightSideChange;
                    
                    return {
                      ...a,
                      // Update both ends of the top arrow
                      topX1: newX1,
                      topX2: newX2,
                      // Ensure overall bounding box is updated
                      x1: Math.min(newX1, a.bottomX1 !== undefined ? a.bottomX1 : a.x1),
                      x2: Math.max(newX2, a.bottomX2 !== undefined ? a.bottomX2 : a.x2)
                    };
                  } else if (part === 'bottomStart') {
                    // When dragging bottom left end, adjust both ends of the bottom arrow while keeping center fixed
                    const newX1 = x - dragArrowOffset.x - offset.x;
                    
                    // Calculate the current center of the bottom arrow
                    const bottomCurrentX1 = a.bottomX1 !== undefined ? a.bottomX1 : a.x1;
                    const bottomCurrentX2 = a.bottomX2 !== undefined ? a.bottomX2 : a.x2;
                    const bottomCenter = (bottomCurrentX1 + bottomCurrentX2) / 2;
                    
                    // Calculate how much the left endpoint moved
                    const leftSideChange = newX1 - bottomCurrentX1;
                    
                    // Move the right endpoint by the same amount in the opposite direction to maintain center
                    const newX2 = bottomCurrentX2 - leftSideChange;
                    
                    return {
                      ...a,
                      // Update both ends of the bottom arrow
                      bottomX1: newX1,
                      bottomX2: newX2,
                      // Ensure overall bounding box is updated
                      x1: Math.min(newX1, a.topX1 !== undefined ? a.topX1 : a.x1),
                      x2: Math.max(newX2, a.topX2 !== undefined ? a.topX2 : a.x2)
                    };
                  } else if (part === 'bottomEnd') {
                    // When dragging bottom right end, adjust only the bottom arrow's x2 coordinate
                    const newX2 = x - dragArrowOffset.x - offset.x;
                    
                    return {
                      ...a,
                      // Only update bottomX2, leaving x2 as the overall bounding box
                      bottomX2: newX2,
                      // Ensure x2 is the rightmost of all points for bounding box purposes
                      x2: Math.max(newX2, a.topX2 !== undefined ? a.topX2 : a.x2)
                    };
                  }
                } else if (a.type && a.type.startsWith('curve')) {
                  // Handle curved arrows
                  if (part === 'start') {
                    // When dragging start, adjust only the start coordinates
                    const newX1 = x - dragArrowOffset.x - offset.x;
                    const newY1 = y - dragArrowOffset.y - offset.y;
                    
                    return {
                      ...a,
                      x1: newX1,
                      y1: newY1,
                      // Keep x2,y2 unchanged
                    };
                  } else if (part === 'end') {
                    // When dragging end, adjust only the end coordinates
                    const newX2 = x - dragArrowOffset.x - offset.x;
                    const newY2 = y - dragArrowOffset.y - offset.y;
                    
                    return {
                      ...a,
                      x2: newX2,
                      y2: newY2,
                      // Keep x1,y1 unchanged
                    };
                  } else if (part === 'peak') {
                    // When dragging peak, we need to calculate the control point position
                    // that would place the curve peak at the mouse position
                    
                    // Get the endpoints
                    const startX = a.x1;
                    const startY = a.y1;
                    const endX = a.x2;
                    const endY = a.y2;
                    
                    // Target position for the curve peak (where the mouse is)
                    const targetPeakX = x - dragArrowOffset.x - offset.x;
                    const targetPeakY = y - dragArrowOffset.y - offset.y;
                    
                    // Calculate control point that gives us this curve peak
                    // From: curvePeak = 0.25 * start + 0.5 * control + 0.25 * end
                    // Solving for control: control = 2 * curvePeak - 0.5 * start - 0.5 * end
                    const newControlX = 2 * targetPeakX - 0.5 * startX - 0.5 * endX;
                    const newControlY = 2 * targetPeakY - 0.5 * startY - 0.5 * endY;
                    
                    return {
                      ...a,
                      peakX: newControlX,
                      peakY: newControlY,
                      // Keep x1,y1,x2,y2 unchanged
                    };
                  }
                } else {
                  // Handle regular arrows
                  if (part === 'center') {
                    // When dragging center, move the whole arrow
                    const newCenterX = x - dragArrowOffset.x - offset.x;
                    const newCenterY = y - dragArrowOffset.y - offset.y;
                    const halfLengthX = (a.x2 - a.x1) / 2;
                    const halfLengthY = (a.y2 - a.y1) / 2;
                    
                    return {
                      ...a,
                      x1: newCenterX - halfLengthX,
                      y1: newCenterY - halfLengthY,
                      x2: newCenterX + halfLengthX,
                      y2: newCenterY + halfLengthY
                    };
                  } else if (part === 'start') {
                    // When dragging start, only move the start point (x1,y1)
                    const newX1 = x - dragArrowOffset.x - offset.x;
                    const newY1 = y - dragArrowOffset.y - offset.y;
                    
                    return {
                      ...a,
                      x1: newX1,
                      y1: newY1,
                      // Keep x2,y2 unchanged
                    };
                  } else if (part === 'end') {
                    // When dragging end, only move the end point (x2,y2)
                    const newX2 = x - dragArrowOffset.x - offset.x;
                    const newY2 = y - dragArrowOffset.y - offset.y;
                    
                    return {
                      ...a,
                      x2: newX2,
                      y2: newY2,
                      // Keep x1,y1 unchanged
                    };
                  }
                }
              }
              return a;
            });
          });
          
          setDragStart({ x, y });
        }
      }
      // If we're dragging a free-floating vertex in mouse mode
      else if (mode === 'mouse' && draggingVertex) {
        // Update the position of the vertex being dragged
        setVertices(prevVertices => {
          return prevVertices.map(v => {
            // Check if this is the vertex we're dragging
            if (Math.abs(v.x - draggingVertex.x) < 0.01 && Math.abs(v.y - draggingVertex.y) < 0.01) {
              // Update the freeFloatingVertices Set with the new position
              const oldKey = `${draggingVertex.x.toFixed(2)},${draggingVertex.y.toFixed(2)}`;
              const newKey = `${(draggingVertex.x + dx).toFixed(2)},${(draggingVertex.y + dy).toFixed(2)}`;
              
              setFreeFloatingVertices(prev => {
                const newSet = new Set(prev);
                newSet.delete(oldKey);
                newSet.add(newKey);
                return newSet;
              });
              
              // Also update any segments connected to this vertex
              setSegments(prevSegments => {
                return prevSegments.map(seg => {
                  if (Math.abs(seg.x1 - draggingVertex.x) < 0.01 && Math.abs(seg.y1 - draggingVertex.y) < 0.01) {
                    return { ...seg, x1: draggingVertex.x + dx, y1: draggingVertex.y + dy };
                  }
                  if (Math.abs(seg.x2 - draggingVertex.x) < 0.01 && Math.abs(seg.y2 - draggingVertex.y) < 0.01) {
                    return { ...seg, x2: draggingVertex.x + dx, y2: draggingVertex.y + dy };
                  }
                  return seg;
                });
              });
              
              // Also update the atom label positions
              setVertexAtoms(prevAtoms => {
                const oldKey = `${draggingVertex.x.toFixed(2)},${draggingVertex.y.toFixed(2)}`;
                const newKey = `${(draggingVertex.x + dx).toFixed(2)},${(draggingVertex.y + dy).toFixed(2)}`;
                
                if (prevAtoms[oldKey]) {
                  const { [oldKey]: atom, ...rest } = prevAtoms;
                  return { ...rest, [newKey]: atom };
                }
                return prevAtoms;
              });
              
              // Return the updated vertex
              return { ...v, x: draggingVertex.x + dx, y: draggingVertex.y + dy };
            }
            return v;
          });
        });
        
        // Update the draggingVertex reference with its new position
        setDraggingVertex(prevVertex => ({
          x: prevVertex.x + dx,
          y: prevVertex.y + dy
        }));
        
        setDragStart({ x, y });
      } else if (isSelecting) {
        // Update selection box
        setSelectionEnd({ x, y });
      } else {
        // Regular canvas drag - move the entire view (only if not in mouse mode)
        if (mode !== 'mouse') {
          setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          setDragStart({ x, y });
        }
      }
      
      setHoverVertex(null);
      setHoverSegmentIndex(null);
      setHoverCurvedArrow({ index: -1, part: null }); // Clear curved arrow hover when dragging
      return;
    }
      
    // Handle hover effects for vertices and segments in various modes
    if (mode === 'draw' || mode === 'erase' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous' || mode === 'mouse') {
      // Check if mouse is over an arrow control circle or triangle in mouse mode
      if (mode === 'mouse') {
        const { index: arrowIndex, part: arrowPart } = isPointInArrowCircle(x, y);
        if (arrowIndex !== -1) {
          const arrow = arrows[arrowIndex];
          // Change cursor based on the part of the arrow being hovered
          if (arrowPart === 'center') {
            // Center - 4-way move cursor for moving the whole arrow
            canvasRef.current.style.cursor = 'move';
          } else if (arrow.type === 'equil' && (arrowPart === 'topStart' || arrowPart === 'topEnd' || 
                    arrowPart === 'bottomStart' || arrowPart === 'bottomEnd')) {
            // Equilibrium arrow ends - horizontal resize cursor (vertically locked)
            canvasRef.current.style.cursor = 'ew-resize';
          } else if (arrowPart === 'start' || arrowPart === 'end') {
            // Regular arrow ends - 4-way move cursor for free movement
            canvasRef.current.style.cursor = 'move';
          }
          
          setHoverVertex(null);
          setHoverSegmentIndex(null);
          setHoverIndicator(null); // Clear indicator hover when over arrow
          return;
        } else {
          // Check curved arrows if no straight arrow was found
          const { index: curvedArrowIndex, part: curvedArrowPart } = isPointInCurvedArrowCircle(x, y);
          if (curvedArrowIndex !== -1) {
            // Change cursor to indicate curved arrow endpoint manipulation - 4-way move cursor
            canvasRef.current.style.cursor = 'move';
            
            // Update curved arrow hover state
            setHoverCurvedArrow({ index: curvedArrowIndex, part: curvedArrowPart });
            
            setHoverVertex(null);
            setHoverSegmentIndex(null);
            setHoverIndicator(null); // Clear indicator hover when over curved arrow
            return;
          } else {
            // Reset cursor if not over any arrow part
            canvasRef.current.style.cursor = 'default';
            // Clear curved arrow hover state
            setHoverCurvedArrow({ index: -1, part: null });
          }
        }
      }
      
      // Check if mouse is over a fourth bond indicator triangle in draw and stereochemistry modes
      const isDrawOrStereochemistryMode = mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous';
      if (isDrawOrStereochemistryMode && verticesWith3Bonds.length > 0) {
        let foundIndicator = null;
        
        // Check each indicator
        for (const vertex of verticesWith3Bonds) {
          if (vertex.indicatorArea) {
            const dx = x - vertex.indicatorArea.x;
            const dy = y - vertex.indicatorArea.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= vertex.indicatorArea.radius) {
              foundIndicator = vertex;
              break;
            }
          }
        }
        
        // Update hover state
        if (foundIndicator) {
          setHoverIndicator(foundIndicator);
          canvasRef.current.style.cursor = 'pointer'; // Show pointer cursor when hovering over indicator
          setHoverVertex(null); // Clear vertex hover when over indicator
          setHoverSegmentIndex(null); // Clear segment hover when over indicator
          return; // Exit early since we found an indicator
        } else {
          setHoverIndicator(null); // Clear indicator hover when not over any
        }
      } else {
        setHoverIndicator(null); // Clear indicator hover when not in appropriate mode
      }
      
      let found = null;
      for (let v of vertices) {
        const dist = distanceToVertex(x, y, v.x, v.y);
        if (dist <= vertexThreshold) {
          found = v;
          break;
        }
      }
      
      // Set hover vertex in draw, erase modes, or for free-floating vertices in mouse mode
      if (mode === 'draw' || mode === 'erase') {
        setHoverVertex(found);
      } else if (mode === 'mouse') {
        // In mouse mode, check both exact vertex matches and box areas for free-floating vertices
        if (found) {
          // If directly found a vertex by circle detection
          const key = `${found.x.toFixed(2)},${found.y.toFixed(2)}`;
          if (freeFloatingVertices.has(key)) {
            setHoverVertex(found);
            canvasRef.current.style.cursor = 'pointer'; // Change cursor when hovering over draggable vertex
          } else {
            setHoverVertex(null);
            canvasRef.current.style.cursor = 'default';
          }
        } else {
          // If no direct vertex hit, check if we're inside any free-floating vertex boxes
          let foundInBox = null;
          
          for (let v of vertices) {
            const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
            if (freeFloatingVertices.has(key) && isPointInVertexBox(x, y, v)) {
              foundInBox = v;
              break;
            }
          }
          
          if (foundInBox) {
            setHoverVertex(foundInBox);
            canvasRef.current.style.cursor = 'pointer'; // Show pointer cursor when hovering over box
          } else {
            setHoverVertex(null);
            canvasRef.current.style.cursor = 'default';
          }
        }
      } else {
        // For stereochemistry modes, don't highlight vertices, but keep segments hoverable
        setHoverVertex(null);
      }
      
      // Only set hoverSegmentIndex if not hovering a vertex
      if (!found) {
        let closestIdx = null;
        let minDist = lineThreshold;
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
          if (distSeg < minDist) {
            minDist = distSeg;
            closestIdx = idx;
          }
        });
        setHoverSegmentIndex(closestIdx);
      } else {
        setHoverSegmentIndex(null);
      }
    } else {
      // For other modes, clear all hover indicators
      setHoverVertex(null);
      setHoverSegmentIndex(null);
      setHoverCurvedArrow({ index: -1, part: null }); // Clear curved arrow hover when not in mouse mode
    }
  };
  const handleMouseUp = event => {
    // Handle selection box completion
    if (isSelecting) {
      setIsSelecting(false);
      // Here we would handle the selected elements, but for now just clear the selection
      // TODO: Implement selection logic for copy/paste functionality
    }
    
    setIsDragging(false);
    
    // Reset cursor to default
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    
    // Reset dragging vertex if we were dragging one
    if (draggingVertex) {
      setDraggingVertex(null);
    }
    
    // Reset arrow dragging state if we were dragging an arrow
    if (draggingArrowIndex !== null) {
      setDraggingArrowIndex(null);
      setDragArrowOffset({ x: 0, y: 0 });
    }
    
    // Only restore hover state in draw/erase/stereochemistry modes
    const isDrawOrStereochemistryMode = mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous';
    
    if (!isDrawOrStereochemistryMode) {
      setHoverVertex(null);
      setHoverSegmentIndex(null);
      
      // Clear 3-bond indicators if not in draw or stereochemistry modes
      setVerticesWith3Bonds([]);
    } else if (mode !== 'draw') {
      // For stereochemistry modes, clear vertex hover but keep segments hoverable
      setHoverVertex(null);
    }
    
    // Cancel fourth bond mode if right-click
    if (event.button === 2 && fourthBondMode) {
      setFourthBondMode(false);
      setFourthBondSource(null);
      setFourthBondPreview(null);
    }
    
    // Only place arrows if:
    // 1. Not a drag
    // 2. Mouse down started on the canvas
    // 3. Mouse up is also on the canvas
    // 4. In an arrow mode
    if (
      !didDrag &&
      mouseDownOnCanvas &&
      (mode === 'arrow' || mode === 'equil' || mode.startsWith('curve'))
    ) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= canvasRef.current.width && y <= canvasRef.current.height) {
        handleArrowClick(event);
      }
    }
    
    setMouseDownOnCanvas(false);
  };

  // Arrow mouse handlers
  const handleArrowMouseMove = (event) => {
    if (mode !== 'arrow' && mode !== 'equil' && !mode.startsWith('curve')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // For curved arrows with existing start point, show the curve preview
    if (mode.startsWith('curve') && curvedArrowStartPoint) {
      setArrowPreview({ 
        x1: curvedArrowStartPoint.x + offset.x,
        y1: curvedArrowStartPoint.y + offset.y,
        x2: x, 
        y2: y,
        isCurved: true
      });
    } else {
      // Standard preview for regular arrows or first click of curved arrows
      setArrowPreview({ x, y });
    }
  };



  const handleArrowClick = (event) => {
    if (mode !== 'arrow' && mode !== 'equil' && !mode.startsWith('curve')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height) {
      // Rest of your arrow click handling code
      if (mode === 'arrow') {
        setArrows(arrows => [...arrows, { 
          x1: x - 40 - offset.x, 
          y1: y - offset.y, 
          x2: x + 40 - offset.x, 
          y2: y - offset.y, 
          type: 'arrow' 
        }]);
        setArrowPreview(null);
        return;
      }
      if (mode === 'equil') {
        setArrows(arrows => [...arrows, { 
          x1: x - 40 - offset.x, 
          y1: y - offset.y, 
          x2: x + 40 - offset.x, 
          y2: y - offset.y, 
          // Track separate lengths for top and bottom arrows
          topX1: x - 40 - offset.x,
          topX2: x + 40 - offset.x,
          bottomX1: x - 40 - offset.x,
          bottomX2: x + 40 - offset.x,
          type: 'equil' 
        }]);
        setArrowPreview(null);
        return;
      }
      // Two-click curved arrow logic
      if (mode.startsWith('curve')) {
        // If this is the first click, store the start point
        if (!curvedArrowStartPoint) {
          setCurvedArrowStartPoint({ x: x - offset.x, y: y - offset.y });
        } else {
          // This is the second click, create the curved arrow
          const startX = curvedArrowStartPoint.x;
          const startY = curvedArrowStartPoint.y;
          const endX = x - offset.x;
          const endY = y - offset.y;
          
          // Calculate initial peak position based on arrow type
          const peakPos = calculateCurvedArrowPeak(startX, startY, endX, endY, mode);
          
          setArrows(arrows => [...arrows, {
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            peakX: peakPos.x,
            peakY: peakPos.y,
            type: mode
          }]);
          // Clear the start point and preview
          setCurvedArrowStartPoint(null);
          setArrowPreview(null);
        }
      }
    }
  };

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const { newSegments, newVertices } = generateGrid(width, height);
    setSegments(newSegments);
       setVertices(newVertices);
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const { newSegments: s, newVertices: v } = generateGrid(width, height);
      setSegments(s);
      setVertices(v);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [generateGrid]);

  // Update vertex types whenever vertices, segments, or atoms change
  useEffect(() => {
    const newVertexTypes = determineVertexTypes(vertices, segments, vertexAtoms);
    setVertexTypes(newVertexTypes);
  }, [vertices, segments, vertexAtoms]);

  useEffect(() => drawGrid(), [segments, vertices, vertexAtoms, vertexTypes, offset, arrowPreview, mode, drawGrid, fourthBondPreview, fourthBondMode, fourthBondSource, hoverCurvedArrow]);

  // Erase all handler
  const handleEraseAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { newSegments, newVertices } = generateGrid(canvas.width, canvas.height);
    setSegments(newSegments);
    setVertices(newVertices);
    setVertexAtoms({});
    setVertexTypes({}); // Reset vertex types
    setOffset({ x: 0, y: 0 });
    setShowMenu(false);
    setShowAtomInput(false);
    setArrows([]); // Clear all arrows as well
  };

  // Add keyboard handler for ESC key to cancel curved arrow and selection
  useEffect(() => {
    const handleKeyDown = (e) => {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [curvedArrowStartPoint, isSelecting]);

  // Add keyboard handler for ESC key to close atom input
  useEffect(() => {
    const handleKeyDown = (e) => {
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
    
    // Reset cursor when mode changes
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    
    // Only clear 3-bond indicators when not in draw or stereochemistry modes
    const isDrawOrStereochemistryMode = mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous';
    if (!isDrawOrStereochemistryMode) {
      setVerticesWith3Bonds([]);
    }
  }, [mode]);

  // Effect to run ring detection whenever vertices or segments change
  useEffect(() => {
    detectRings();
  }, [segments, vertices, detectRings]);

  // Handle keyboard events for the fourth bond mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC key cancels fourth bond mode
      if (e.key === 'Escape' && fourthBondMode) {
        setFourthBondMode(false);
        setFourthBondSource(null);
        setFourthBondPreview(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fourthBondMode]);
  
  // Handle keyboard events for copy/paste
  useEffect(() => {
    const handleKeyDown = (e) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSegments, selectedVertices, selectedArrows, clipboard, isPasteMode, copySelection, cancelPasteMode]);

  // Helper function to format atom text with subscript numbers
  const formatAtomText = (text) => {
    // Split the text into segments (numbers vs non-numbers)
    const segments = [];
    let currentSegment = '';
    let isCurrentNumber = false;
    
    // Process each character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isNumber = /[0-9]/.test(char);
      
      // If type changed or at the start, create a new segment
      if (i === 0 || isNumber !== isCurrentNumber) {
        if (currentSegment) {
          segments.push({ text: currentSegment, isNumber: isCurrentNumber });
        }
        currentSegment = char;
        isCurrentNumber = isNumber;
      } else {
        // Continue building the current segment
        currentSegment += char;
      }
    }
    
    // Add the final segment
    if (currentSegment) {
      segments.push({ text: currentSegment, isNumber: isCurrentNumber });
    }
    
    // Helper function to determine proper kerning based on character pair
    const getKerningStyle = (segment, index) => {
      if (!segment.isNumber || index === 0) return {};
      
      // Get previous segment (which must be letters)
      const prevSegment = segments[index-1];
      if (!prevSegment || prevSegment.isNumber) return {};
      
      // Apply kerning based on the last character of previous segment
      const lastChar = prevSegment.text.slice(-1);
      
      // Fine-tuned kerning adjustments for common elements to match canvas rendering
      if (['C', 'O'].includes(lastChar)) {
        return { marginLeft: '-3px' }; // More kerning for round letters
      } else if (['F', 'P', 'S'].includes(lastChar)) {
        return { marginLeft: '-2.8px' }; // Medium-high adjustment 
      } else if (['N', 'E', 'B'].includes(lastChar)) {
        return { marginLeft: '-2.5px' }; // Medium kerning
      } else if (['H', 'T', 'I', 'L'].includes(lastChar)) {
        return { marginLeft: '-1.7px' }; // Less kerning for narrow letters
      } else if (['l', 'i'].includes(lastChar)) {
        return { marginLeft: '-1.3px' }; // Minimal kerning for very narrow letters
      }
      
      return { marginLeft: '-2.3px' }; // Default kerning
    };
    
    // Render the segments with improved styling to match canvas rendering
    return (
      <span style={{ fontWeight: '40', color: 'black' }}>
        {segments.map((segment, index) => (
          <span
            key={index}
            style={segment.isNumber ? {
              fontSize: '0.58em',        // Smaller size for proper subscript appearance (matching canvas 15px)
              position: 'relative',
              bottom: '-4px',            // Precisely positioned to match canvas rendering
              fontWeight: '40',
              ...getKerningStyle(segment, index) // Apply fine-tuned character-specific kerning
            } : {}}
          >
            {segment.text}
          </span>
        ))}
      </span>
    );
  };

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
      background: '#fff',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      zIndex: 0
    }}>
      {/* Toolbar */}
      <div style={{
        width: 'min(240px, 25vw)',
        minWidth: '160px',
        maxWidth: '100vw',
        height: 'auto',
        minHeight: '92vh',
        background: 'linear-gradient(to bottom, rgb(19,26,38), rgb(15,40,30))',
        backgroundImage: `
          linear-gradient(45deg, rgba(255,255,255,0.015) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.015) 75%),
          linear-gradient(45deg, rgba(255,255,255,0.015) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.015) 75%),
          linear-gradient(to bottom, rgb(21,28,40), rgb(15,40,32))`,
        backgroundSize: 'calc(min(280px, 25vw) * 0.28) calc(min(280px, 25vw) * 0.28), calc(min(280px, 25vw) * 0.28) calc(min(280px, 25vw) * 0.28), 100% 100%',
        backgroundPosition: '0 0, calc(min(280px, 25vw) * 0.14) calc(min(280px, 25vw) * 0.14), 0 0',
        padding: 'calc(min(280px, 25vw) * 0.031) calc(min(280px, 25vw) * 0.0375) calc(min(280px, 25vw) * 0.0625) calc(min(280px, 25vw) * 0.0375)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 'max(4px, min(calc(min(280px, 25vw) * 0.031), 2vh))',
        position: 'absolute',
        top: '2vh',
        left: 'max(calc(4vw - 28px), 8px)',
        bottom: '4vh',
        borderRadius: presetMenuVisualState 
          ? 'calc(min(280px, 25vw) * 0.031) calc(min(280px, 25vw) * 0.031) 0 calc(min(280px, 25vw) * 0.031)' // Square off bottom-right when expanded
          : 'calc(min(280px, 25vw) * 0.031)', // Normal rounded corners when collapsed
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        border: 'calc(min(280px, 25vw) * 0.009) solid rgba(0, 208, 24, 0.53)',
        zIndex: 2,
        justifyContent: 'space-between',
        alignItems: 'stretch',
        touchAction: 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.2) transparent'
      }}>
        {/* Toolbar Title */}
        <div style={{
          color: '#888',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginBottom: 'calc(min(280px, 25vw) * 0.006)',
          textAlign: 'left',
          userSelect: 'none',
        }}>Create</div>
        {/* Draw/Erase Buttons as icon buttons side by side */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 0 }}>
          <button
            onClick={() => setModeAndClearSelection('draw')}
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'draw' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Draw Mode"
          >
            {/* Pencil SVG */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'mouse' ? 'draw' : 'mouse';
              setModeAndClearSelection(newMode);
            }}
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'mouse' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Mouse Mode"
          >
            {/* Mouse cursor SVG - bigger with handle */}
            <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none">
              <path d="M6 3L12 17L14.5 12.5L19 10.5L6 3Z" fill="#fff" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
              <rect x="16.3" y="16" width="3.5" height="7" rx="1.5" fill="#fff" stroke="#fff" strokeWidth="0.5" transform="rotate(316 12.75 18.5)"/>
            </svg>
          </button>
        </div>
        {/* Erase and Text mode buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 0, marginTop: 'max(2px, calc(min(280px, 25vw) * 0.006))' }}>
          <button
            onClick={() => setModeAndClearSelection('erase')}
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'erase' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Erase Mode"
          >
            {/* Minimalist Eraser: Rotated rectangle, bifurcated */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none">
              <g transform="rotate(45 13 13)">
                <rect x="6" y="10" width="14" height="6" rx="1.5" fill="#fff" stroke="#fff" strokeWidth="1.5"/>
                <line x1="13" y1="10" x2="13" y2="16" stroke="#23395d" strokeWidth="1.5"/>
              </g>
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'text' ? 'draw' : 'text';
              setModeAndClearSelection(newMode);
            }}
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'text' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Text Mode"
          >
            {/* Text "T" SVG - bigger and Times New Roman font */}
            <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none">
              <text x="5" y="18" fill="#fff" style={{ font: 'bold 20px "Times New Roman", serif' }}>T</text>
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
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'plus' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Add Positive Charge"
          >
            {/* Plus sign in circle SVG */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="9" stroke="#fff" strokeWidth="2.2" fill="none" />
              <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
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
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'minus' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Add Negative Charge"
          >
            {/* Minus sign in circle SVG */}
            <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="9" stroke="#fff" strokeWidth="2.2" fill="none" />
              <line x1="8.5" y1="13" x2="17.5" y2="13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => { 
              const newMode = mode === 'lone' ? 'draw' : 'lone';
              setModeAndClearSelection(newMode);
            }}
            style={{
              flex: 1,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'lone' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(320px, 33.33vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              height: 'min(44px, 7vh)',
            }}
            title="Add Lone Pair"
          >
            {/* Two dots SVG */}
            <svg width="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" height="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" viewBox="0 0 22 22" fill="none">
              <circle cx="7" cy="11" r="2.6" fill="#fff" />
              <circle cx="15" cy="11" r="2.6" fill="#fff" />
            </svg>
          </button>
        </div>
        
        {/* Reactions Section Title */}
        <div style={{
          color: '#888',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(8px, min(calc(min(280px, 25vw) * 0.031), 2vh))',
          textAlign: 'left',
          userSelect: 'none',
        }}>Reactions</div>
        {/* Arrow and Equilibrium Arrow Buttons side by side */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          <button
            onClick={() => setModeAndClearSelection('arrow')}
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'arrow' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
            }}
            title="Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="6" y1="13" x2="32" y2="13" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <polygon points="32,7 44,13 32,19" fill="white" />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('equil')}
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'equil' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
            }}
            title="Equilibrium Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Top arrow: left to right */}
              <line x1="8" y1="10" x2="34" y2="10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <polygon points="34,5 44,10 34,15" fill="white" />
              {/* Bottom arrow: right to left */}
              <line x1="38" y1="18" x2="12" y2="18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <polygon points="12,13 2,18 12,23" fill="white" />
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
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve2' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Counterclockwise semicircle (top left)"
          ><ArrowCCWSemicircleTopLeft /></button>
          {/* Arrow 2: CW Semicircle (Top Center) */}
          <button
            onClick={() => setModeAndClearSelection('curve1')}
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve1' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise semicircle (top center)"
          ><ArrowCWSemicircleTopCenter /></button>
          {/* Arrow 3: CW Quarter-circle (Top Right) */}
          <button
            onClick={() => setModeAndClearSelection('curve0')}
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve0' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise quarter (top right)"
          ><ArrowCWQuarterTopRight /></button>
          {/* Arrow 4: CCW Semicircle (Bottom Left) */}
          <button
            onClick={() => setModeAndClearSelection('curve5')}
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve5' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Counterclockwise semicircle (bottom left)"
          ><ArrowCCWSemicircleBottomLeft /></button>
          {/* Arrow 5: CW Semicircle (Bottom Center) */}
          <button
            onClick={() => setModeAndClearSelection('curve4')}
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve4' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise semicircle (bottom center)"
          ><ArrowCWSemicircleBottomCenter /></button>
          {/* Arrow 6: CW Quarter-circle (Bottom Right) */}
          <button
            onClick={() => setModeAndClearSelection('curve3')}
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve3' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clockwise quarter (bottom right)"
          ><ArrowCWQuarterBottomRight /></button>
        </div>
        {/* Stereochemistry Section Title */}
        <div style={{
          color: '#888',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(8px, min(calc(min(280px, 25vw) * 0.031), 2vh))',
          textAlign: 'left',
          userSelect: 'none',
        }}>Stereochemistry</div>
        {/* Stereochemistry buttons - wedge, dash, ambiguous */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          <button
            onClick={() => setModeAndClearSelection('wedge')}
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'wedge' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
            }}
            title="Wedge Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="6,13 38,6 38,20" fill="white" />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('dash')}
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'dash' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
            }}
            title="Dash Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Updated dash bond icon to better reflect actual appearance with perpendicular lines that get progressively wider */}
              <g transform="translate(6, 13)">
                <line x1="0" y1="0" x2="32" y2="0" stroke="#fff" strokeWidth="1" strokeOpacity="0.0" />
                <line x1="3" y1="-1" x2="3" y2="1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="-2" x2="9" y2="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="15" y1="-3" x2="15" y2="3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="-4" x2="21" y2="4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="27" y1="-5" x2="27" y2="5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <line x1="33" y1="-6" x2="33" y2="6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('ambiguous')}
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'ambiguous' ? 'rgb(54,98,227)' : '#23395d',
              border: 'none',
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background 0.2s',
              outline: 'none',
              padding: 0,
            }}
            title="Ambiguous Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d= " M 4 13 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0"
                stroke="white"
                stroke-width="3"
                fill="none"
                linecap="round"
                />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: '10px' }} />
        <button
          onClick={() => { 
            handleEraseAll(); 
            clearSelection(); 
          }}
          style={{
            width: '100%',
            padding: 'calc(min(280px, 25vw) * 0.019) 0',
            backgroundColor: '#23395d',
            color: '#fff',
            border: 'none',
            borderRadius: 'calc(min(280px, 25vw) * 0.025)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.044), 2vh))',
            fontWeight: 700,
            marginTop: 0,
            marginBottom: 'max(6px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
            outline: 'none',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'max(6px, calc(min(280px, 25vw) * 0.025))',
          }}
        >
          {/* Taller Trash Can SVG */}
          <svg width="max(20px, calc(min(280px, 25vw) * 0.081))" height="max(24px, calc(min(280px, 25vw) * 0.094))" viewBox="0 0 26 30" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="18" height="18" rx="2.5"/>
            <path d="M9 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/>
            <line x1="11" y1="13" x2="11" y2="22"/>
            <line x1="15" y1="13" x2="15" y2="22"/>
          </svg>
                </button>
      </div>
      


      {/* Preset Menu - expands to the right */}
      <div style={{
        width: isPresetMenuExpanded ? '650px' : '0px', // Animate from 0 to full width
        minWidth: '0px', // Ensure it can collapse to 0
        height: '160px', // Much shorter than main toolbar
        overflow: 'hidden', // Hide content during slide animation
        pointerEvents: isPresetMenuExpanded ? 'auto' : 'none', // Disable interactions when collapsed
          background: 'linear-gradient(to bottom, rgb(16,32,34), rgb(15,40,30))',
          backgroundImage: `
            linear-gradient(45deg, rgba(255,255,255,0.015) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.015) 75%),
            linear-gradient(45deg, rgba(255,255,255,0.015) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.015) 75%),
            linear-gradient(to bottom, rgb(17,35,36), rgb(15,40,32))`,
          backgroundSize: 'calc(min(280px, 25vw) * 0.28) calc(min(280px, 25vw) * 0.28), calc(min(280px, 25vw) * 0.28) calc(min(280px, 25vw) * 0.28), 100% 100%',
          backgroundPosition: 'calc(-1 * (min(240px, 25vw) + max(calc(4vw - 28px), 8px)) + -2.2px) calc(-1 * (92vh - 160px - 4vh) + -8px), calc(-1 * (min(240px, 25vw) + max(calc(4vw - 28px), 8px)) + calc(min(280px, 25vw) * 0.14) + -2.2px) calc(-1 * (92vh - 160px - 4vh) + calc(min(280px, 25vw) * 0.14) + -8px), 0 0',
          padding: '12px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'absolute',
          bottom: '4vh', // Align with bottom of toolbar
          left: `calc(min(240px, 25vw) + max(calc(4vw - 28px), 8px) - 2.2px)`, // Overlap the main toolbar by 8px
          visibility: isPresetMenuExpanded ? 'visible' : 'hidden', // Completely hide when collapsed
          borderRadius: '0 8px 8px 0', // Square off top-left and bottom-left corners to connect seamlessly with main toolbar
          border: 'calc(min(280px, 25vw) * 0.009) solid rgba(0, 208, 24, 0.53)',
          borderLeft: 'none', // Remove left border to seamlessly attach to main toolbar
          zIndex: 4, // Above main toolbar (which is zIndex: 2) and button (which is zIndex: 3)
          touchAction: 'none',
          transition: 'all 0.5s ease-out', // Smooth slide animation
        }}>
          {/* Preset Menu Title */}
          <div style={{
            color: '#888',
            fontWeight: 600,
            fontSize: '14px',
            letterSpacing: '0.04em',
            textAlign: 'left',
            userSelect: 'none',
            marginBottom: '4px',
            whiteSpace: 'nowrap', // Prevent text wrapping during animation
          }}>Presets</div>
          
          {/* Placeholder content grid */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            flexWrap: 'nowrap', // Prevent wrapping during animation
            justifyContent: 'flex-start',
            alignItems: 'center',
            flex: 1,
            minWidth: '0', // Allow shrinking during animation
          }}>
            {/* Placeholder preset buttons */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                style={{
                  width: '95px',
                  height: '95px',
                  backgroundColor: '#23395d',
                  border: 'none', // Remove border
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0, // Maintain button size during animation
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2a4470'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#23395d'}
              >
                {i}
              </div>
            ))}
          </div>
        </div>
        
        {/* Vertical Preset Menu Toggle Button - attached to toolbar */}
      <button
        onClick={() => {
          if (isPresetMenuExpanded) {
            // Collapsing: Start animation immediately, change visual state after animation
            setIsPresetMenuExpanded(false);
            setTimeout(() => setPresetMenuVisualState(false), 500);
          } else {
            // Expanding: Change visual state immediately, start animation
            setPresetMenuVisualState(true);
            setIsPresetMenuExpanded(true);
          }
        }}
        style={{
          position: 'absolute',
          bottom: '5vh', // Position just above the bottom of the toolbar
          left: isPresetMenuExpanded 
            ? `calc(min(240px, 25vw) + max(calc(4vw - 28px), 8px) + 650px - 2.2px)` // When expanded, move to right side of preset menu (650px width) minus 2.2px
            : `calc(min(240px, 25vw) + max(calc(4vw - 28px), 8px) - 2.2px)`, // When collapsed, attach to main toolbar minus 2.2px
          transform: 'translateY(-10px)', // Small offset to sit just above the toolbar bottom
          width: '16px',
          height: '130px', // Shorter than before (was 170px)
          background: isPresetMenuExpanded ? 'rgb(54,98,227)' : 'linear-gradient(to bottom, rgb(35, 52, 69), rgb(28, 74, 56))',
          borderTop: 'calc(min(280px, 25vw) * 0.009) solid rgba(0, 208, 24, 0.53)', // Dark green border matching toolbar
          borderRight: 'calc(min(280px, 25vw) * 0.009) solid rgba(0, 208, 24, 0.53)', // Dark green border matching toolbar
          borderBottom: 'calc(min(280px, 25vw) * 0.009) solid rgba(0, 208, 24, 0.53)', // Dark green border matching toolbar
          borderLeft: isPresetMenuExpanded ? 'none' : 'none', // No left border to seamlessly attach (to toolbar or preset menu)
          borderRadius: '0 8px 8px 0', // Always round the right side
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'background 0.2s, left 0.5s ease-out', // Smooth background and position transitions
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0',
          zIndex: 3,
        }}
        title={isPresetMenuExpanded ? "Collapse Presets" : "Expand Presets"}
      >
        {/* Small white triangle pointing right */}
        <svg 
          width="10" 
          height="10" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: isPresetMenuExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path
            d="M9 18L15 12L9 6"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      
      {/* Canvas wrapper fills all except toolbar area */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        pointerEvents: 'none', // let toolbar be clickable
      }}>
        <canvas
          ref={canvasRef}
          onClick={e => { handleClick(e); }}
          onMouseDown={handleMouseDown}
          onMouseMove={e => { handleMouseMove(e); handleArrowMouseMove(e); }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            cursor: isPasteMode ? 'copy' : (mode === 'text' ? 'text' : 'default'),
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
              onChange={(e) => setAtomInputValue(e.target.value)}
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
                border: 'none',
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
      {selectionBounds && (selectedSegments.size > 0 || selectedVertices.size > 0 || selectedArrows.size > 0) && !isPasteMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            copySelection();
          }}
          style={{
            position: 'absolute',
            top: `${selectionBounds.y1 + offset.y - 40}px`,
            left: `${selectionBounds.x1 + offset.x + (selectionBounds.x2 - selectionBounds.x1) / 2}px`,
            transform: 'translateX(-50%)',
            zIndex: 4,
            backgroundColor: 'rgb(54, 98, 227)',
            color: 'white',
            border: 'none',
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
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
                backgroundColor: '#23395d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2a4470'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#23395d'}
            >
              Close
            </button>
          </div>
        </>
      )}
      
      {/* Bottom Right Toolbar - Export and About */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 3,
      }}>
        <button
          onClick={() => {
            // Export functionality will be implemented later

          }}
          style={{
            width: '80px',
            height: '36px',
            backgroundColor: '#23395d',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'background 0.2s',
            outline: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: '#fff',
            fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
          }}
          title="Export"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2a4470'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#23395d'}
        >
          Export
        </button>
        
        <button
          onClick={() => {
            setShowAboutPopup(true);
          }}
          style={{
            width: '80px',
            height: '36px',
            backgroundColor: '#23395d',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'background 0.2s',
            outline: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: '#fff',
            fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
          }}
          title="About"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2a4470'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#23395d'}
        >
          About
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
function ArrowCCWSemicircleTopLeft() {
  // manually made
  const angle = -3 * Math.PI / 4;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 34 A14 14 0 1 1 36 20" stroke="white" 
      strokeWidth="3.5" 
      fill="none" 
      strokeLinecap="round"/>
      <polygon points="29,20 43,20 36,28" fill="white"/>
    </svg>
  );
}
// 2. Clockwise Semicircle (Top Center)
function ArrowCWSemicircleTopCenter() {
  // manually made
  const angle = -3 * Math.PI / 4;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24 A12 12 0 0 1 36 24" stroke="white"
      strokeWidth="3.5"
      fill="none"
      strokeLinecap="round"/>
      <polygon points="29,24 43,20 38,29" fill="white"/>
    </svg>
  );
}
// 3. Clockwise Quarter-circle (Top Right)
function ArrowCWQuarterTopRight() {
  // manually made
  const angle = -3 * Math.PI / 4;
  return (
    <svg width="48" height="48" viewBox="0 6 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 32 A22 22 0 0 1 38 32" stroke="white"
       strokeWidth="3.5"
        fill="none"
       strokeLinecap="round"/>
      <polygon points="31,35 40,25 42,35" fill="white"/>
    </svg>

  );
}
// 4. Counterclockwise Semicircle (Bottom Left)
function ArrowCCWSemicircleBottomLeft() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(1,-1) translate(0,-45)">
        <path d="M14 34 A14 14 0 1 1 36 20" 
          stroke="white"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"/>
        <polygon points="29,20 43,20 36,28" fill="white"/>
      </g>
    </svg>
  );
}
// 5. Clockwise Semicircle (Bottom Center)
function ArrowCWSemicircleBottomCenter() {
  // Arc: start at (10,34), end at (34,10), r=16, large-arc, sweep=1
  // Arrowhead at (34,10), tangent is -45deg
  const angle = -Math.PI/4;
  return (
    <svg width="48" height="48" viewBox="0 4 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Arc remains the same */}
      <path d="M12 24 A12 12 0 0 0 36 24"
        stroke="white"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      {/* Arrowhead flipped downward */}
      <polygon points="29,24 38,19 42,28" fill="white"/>
    </svg>
  );
}
// 6. Clockwise Quarter-circle (Bottom Right)
function ArrowCWQuarterBottomRight() {
  // Arc: start at (10,22), end at (34,34), r=12, large-arc=0, sweep=1
  // Arrowhead at (34,34), tangent is 30deg
  const angle = Math.atan2(12,24); // 26.56deg
  return (
    <svg width="48" height="48" viewBox="0 15 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 38 A22 22 0 0 0 38 38"
        stroke="white"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      {/* Arrowhead flipped downward */}
      <polygon points="33,33 43,43 43,33" fill="white"/>
    </svg>
  );
}

export default HexGridWithToolbar;