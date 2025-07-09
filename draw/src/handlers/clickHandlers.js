/**
 * Core logic for handling clicks in the hex grid drawing interface.
 * This file contains the extracted handleClick logic to improve performance and maintainability.
 */

export function handleClickCore(event, state, actions) {
  const {
    // State variables
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
  } = state;

  const {
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
  } = actions;

  // Only block clicks if we're dragging the canvas or selecting, not if we're dragging vertices
  if (isDragging && !draggingVertex) return;
  // Don't handle clicks if a drag just occurred
  if (didDrag) return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Don't handle clicks in paste mode - paste is handled on mouse down
  if (isPasteMode) {
    return; // Exit early, paste is handled elsewhere
  }

  // Handle fourth bond confirmation in draw mode and stereochemistry modes (any click confirms the spinning preview)
  if ((mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && fourthBondSource && fourthBondPreview) {
    // Track the source vertex being used for fourth bond creation
    if (fourthBondSource) {
      trackVertexEdit(fourthBondSource);
    }
    
    // Capture state before creating fourth bond
    captureState();
    
    // Calculate normalized direction vector from source to preview end
    const dx = fourthBondPreview.endX - (fourthBondSource.x + offset.x);
    const dy = fourthBondPreview.endY - (fourthBondSource.y + offset.y);
    const length = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / length;
    const uy = dy / length;
    
    // Calculate the endpoint coordinates for the new bond
    const endX = fourthBondSource.x + ux * hexRadius;
    const endY = fourthBondSource.y + uy * hexRadius;
    
    // Add the new endpoint as a vertex if it doesn't already exist
    // If snapped to grid, make it an on-grid vertex, otherwise off-grid
    const newEndpointVertex = { 
      x: endX, 
      y: endY, 
      isOffGrid: !(fourthBondPreview.snappedToGrid || false)
    };
    
    // Check if vertex already exists
    const vertexExists = vertices.some(
      v => Math.abs(v.x - endX) < 0.01 && Math.abs(v.y - endY) < 0.01
    );
    
    if (!vertexExists) {
      setVertices(prevVertices => {
        // Use targeted merging for new off-grid vertex
        if (newEndpointVertex.isOffGrid) {
          const result = checkAndMergeNewVertex(newEndpointVertex, prevVertices);
          setTimeout(detectRings, 0);
          return result.newVertices;
        } else {
        const newVertices = [...prevVertices, newEndpointVertex];
        setTimeout(detectRings, 0);
        return newVertices;
        }
      });
    }
    
    const direction = calculateBondDirection(fourthBondSource.x, fourthBondSource.y, endX, endY);
    const bondOrder = mode === 'triple' ? 3 : 1; // Triple bond in triple mode, single bond otherwise
    const bondType = ['wedge', 'dash', 'ambiguous'].includes(mode) ? mode : null; // Apply stereochemistry if in stereochemistry mode
    const newBond = {
      x1: fourthBondSource.x,
      y1: fourthBondSource.y,
      x2: endX,
      y2: endY,
      bondOrder: bondOrder,
      bondType: bondType,
      bondDirection: 1,
      direction: direction,
      flipSmallerLine: false
    };
    
    setSegments(prevSegments => [...prevSegments, newBond]);
    
    // Clear the spinning preview
    setFourthBondMode(false);
    setFourthBondSource(null);
    setFourthBondPreview(null);
    
    return; // Exit early, bond created
  }

  // Handle vertex clicks for freebond functionality in draw mode, triple mode, and stereochemistry modes
  const isDrawOrStereochemistryMode = mode === 'draw' || mode === 'triple' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous';
  if (isDrawOrStereochemistryMode) {
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
      // Track the vertex being used for bond creation
      trackVertexEdit(nearestVertex);
      
      // All modes (draw, triple, and stereochemistry) implement freebond functionality with spinnable preview
      // If we don't have a source yet, set this vertex as the source and start spinning preview
      if (!fourthBondSource) {
        setFourthBondSource(nearestVertex);
        setFourthBondMode(true); // Activate fourth bond mode for preview
        
        // Generate initial preview pointing toward the click position
        const sourceScreenX = nearestVertex.x + offset.x;
        const sourceScreenY = nearestVertex.y + offset.y;
        const dx = x - sourceScreenX;
        const dy = y - sourceScreenY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // If click is very close to vertex, default to pointing right
        let endX, endY;
        if (length < 10) {
          endX = sourceScreenX + hexRadius;
          endY = sourceScreenY;
        } else {
          // Point toward click position at hexRadius distance
          const ux = dx / length;
          const uy = dy / length;
          endX = sourceScreenX + ux * hexRadius;
          endY = sourceScreenY + uy * hexRadius;
        }
        
        // Find closest vertex for snapping with different tolerances for grid vs off-grid vertices
        const gridX = endX - offset.x;
        const gridY = endY - offset.y;
        
        // First try to find off-grid vertices with tight tolerance (exact clicking)
        let closestGrid = null;
        for (const vertex of vertices) {
          if (vertex.isOffGrid === true) {
            const distance = Math.sqrt((vertex.x - gridX) ** 2 + (vertex.y - gridY) ** 2);
            if (distance <= 8) { // Very tight tolerance for off-grid vertices
              closestGrid = { vertex, distance };
              break;
            }
          }
        }
        
        // If no off-grid vertex found, try grid vertices with normal tolerance
        if (!closestGrid) {
          closestGrid = findClosestGridVertex(gridX, gridY, 30);
        }
        
        setFourthBondPreview({
          startX: sourceScreenX,
          startY: sourceScreenY,
          endX: endX,
          endY: endY,
          snappedToGrid: !!closestGrid,
          snappedToVertex: !!closestGrid
        });
        
        return; // Exit early, freebond source set
      }
      // If we already have a source, any click (including on the same vertex) will be handled
      // by the fourth bond confirmation logic above, so we don't need to do anything here
      // Just return to let the confirmation logic handle it
      return;
    }
  }

  // Handle bond preview clicks (lower priority than vertices)
  if (bondPreviews.length > 0 && isDrawOrStereochemistryMode) {
    for (const preview of bondPreviews) {
      if (isPointOnBondPreview(x, y, preview, offset)) {
        // Track which vertex this bond preview starts from
        const sourceVertex = vertices.find(v => 
          Math.abs(v.x - preview.x1) < 0.01 && Math.abs(v.y - preview.y1) < 0.01
        );
        if (sourceVertex) {
          trackVertexEdit(sourceVertex);
        }
        
        // Capture state before creating bond
        captureState();
        
        // Create new bond with appropriate bond order based on mode
        const bondOrder = mode === 'triple' ? 3 : 1; // Triple bond in triple mode, single bond otherwise
        const newBond = {
          x1: preview.x1,
          y1: preview.y1,
          x2: preview.x2,
          y2: preview.y2,
          bondOrder: bondOrder,
          bondType: null,
          bondDirection: 1,
          direction: calculateBondDirection(preview.x1, preview.y1, preview.x2, preview.y2),
          flipSmallerLine: false
        };
        
        // Create new off-grid vertex at the end of the bond
        const newVertex = {
          x: preview.x2,
          y: preview.y2,
          isOffGrid: true
        };
        
        // Check if vertex already exists at this position
        const vertexExists = vertices.some(
          v => Math.abs(v.x - preview.x2) < 0.01 && Math.abs(v.y - preview.y2) < 0.01
        );
        
        // Update state
        setSegments(prevSegments => {
          const updatedSegments = [...prevSegments, newBond];
          return updatedSegments;
        });
        
        if (!vertexExists) {
          // Use targeted merging for new off-grid vertex from bond preview
          setVertices(prevVertices => {
            const result = checkAndMergeNewVertex(newVertex, prevVertices);
            return result.newVertices;
          });
          trackVertexEdit(newVertex);
        }
        
        // Run ring detection after adding bond/vertex
        setTimeout(detectRings, 0);
        
        return; // Exit early, bond preview click handled
      }
    }
  }

  // Handle fourth bond mode (triggered by blue triangle) or draw/stereochemistry mode with source
  if (fourthBondMode || ((mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && fourthBondSource)) {
    if (fourthBondPreview) {
      // Track the source vertex being used for fourth bond creation
      if (fourthBondSource) {
        trackVertexEdit(fourthBondSource);
      }
      
      // Capture state before creating fourth bond
      captureState();
      
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
      // Use the current mode to determine bond order and type
      const bondType = ['wedge', 'dash', 'ambiguous'].includes(mode) ? mode : null;
      const bondOrder = mode === 'triple' ? 3 : 1; // Triple bond in triple mode, single bond otherwise
      const direction = calculateBondDirection(fourthBondSource.x, fourthBondSource.y, endX, endY);
      
      // Add the new endpoint as a vertex if it doesn't already exist
      // If snapped to grid, make it an on-grid vertex, otherwise off-grid
      const newEndpointVertex = { 
        x: endX, 
        y: endY, 
        isOffGrid: !(fourthBondPreview.snappedToGrid || false)
      };
      
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
      
      const newBond = {
        x1: fourthBondSource.x,
        y1: fourthBondSource.y,
        x2: endX,
        y2: endY,
        bondOrder: bondOrder, // Single bond in draw mode, triple bond in triple mode
        bondType: bondType, // Apply stereochemistry if in stereochemistry mode
        bondDirection: 1, // Default direction
        direction: direction, // Calculate direction
        flipSmallerLine: false // Default to false
      };
      
      setSegments(prevSegments => [...prevSegments, newBond]);
      
      // Fourth bond created successfully - no automatic atom input
      
      // Exit fourth bond mode and clear source after bond creation
      if (fourthBondMode) {
        setFourthBondMode(false);
      }
      // Always clear the source after creating a bond
      setFourthBondSource(null);
      setFourthBondPreview(null);
    }
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
      // Track that this vertex was last edited
      trackVertexEdit(foundVertex);
      // Capture state before modifying charges/lone pairs
      captureState();
      setVertexAtoms(prev => {
        const prevVal = prev[key];
        let newVal = prevVal;
        
        // If no atom exists, create a default one (usually Carbon)
        if (!prevVal) {
          newVal = { symbol: '' }; // Empty symbol for implicit carbon
        } else if (typeof prevVal === 'string') {
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
    return;
  }

  if (mode === 'erase') {
    // Close atom input if open
    setShowAtomInput(false);
    
    // First check if we're erasing an arrow (straight or equilibrium)
    const { index: arrowIndex } = isPointInArrowCircle(x, y, true);
    if (arrowIndex !== -1) {
      // Capture state before erasing arrow
      captureState();
      // Remove this arrow
      setArrows(arrows => arrows.filter((_, i) => i !== arrowIndex));
      return;
    }
    
    // Check if we're erasing a curved arrow
    const curvedArrowIndex = isPointOnCurvedArrow(x, y);
    if (curvedArrowIndex !== -1) {
      // Capture state before erasing curved arrow
      captureState();
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
          // Remember the segment we're removing for checking orphaned vertices
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
      // Capture state before erasing bond
      captureState();
      
      // Check if we need to remove orphaned off-grid vertices
      const verticesToCheck = [
        { x: removedSegment.x1, y: removedSegment.y1 },
        { x: removedSegment.x2, y: removedSegment.y2 }
      ];
      
      // Count bonds at each vertex after removing this bond
      const getConnectedBondCount = (vx, vy, segmentsToCheck) => {
        return segmentsToCheck.filter(seg => 
          seg.bondOrder > 0 && (
            (Math.abs(seg.x1 - vx) < 0.01 && Math.abs(seg.y1 - vy) < 0.01) ||
            (Math.abs(seg.x2 - vx) < 0.01 && Math.abs(seg.y2 - vy) < 0.01)
          )
        ).length;
      };
      
      // Find vertices that should be removed (off-grid vertices with no remaining bonds)
      const verticesToRemove = [];
      verticesToCheck.forEach(checkVertex => {
        const vertex = vertices.find(v => 
          Math.abs(v.x - checkVertex.x) < 0.01 && Math.abs(v.y - checkVertex.y) < 0.01
        );
        
        if (vertex && vertex.isOffGrid === true) {
          const remainingBonds = getConnectedBondCount(checkVertex.x, checkVertex.y, newSegments);
          if (remainingBonds === 0) {
            verticesToRemove.push(vertex);
          }
        }
      });
      
      // Update segments
      setSegments(newSegments);
      
      // Remove orphaned off-grid vertices
      if (verticesToRemove.length > 0) {
        setVertices(prevVertices => 
          prevVertices.filter(v => !verticesToRemove.some(removeV => 
            Math.abs(v.x - removeV.x) < 0.01 && Math.abs(v.y - removeV.y) < 0.01
          ))
        );
        
        // Also remove any atom labels for removed vertices
        setVertexAtoms(prevAtoms => {
          const newAtoms = { ...prevAtoms };
          verticesToRemove.forEach(vertex => {
            const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
            delete newAtoms[key];
          });
          return newAtoms;
        });
        
        // Remove from free floating vertices set
        setFreeFloatingVertices(prevSet => {
          const newSet = new Set(prevSet);
          verticesToRemove.forEach(vertex => {
            const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
            newSet.delete(key);
          });
          return newSet;
        });
      }
      
      // Run ring detection after bond changes
      setTimeout(detectRings, 0);
      // Clear bond previews to force regeneration
      setBondPreviews([]);
      setHoverBondPreview(null);
      return;
    }
    // If no bond, erase atom
    for (let v of vertices) {
      const dist = distanceToVertex(x, y, v.x, v.y);
      if (dist <= vertexThreshold) {
        const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
        if (vertexAtoms[key]) {
          // Capture state before erasing atom
          captureState();
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
    // Text mode: Allow clicking on existing vertices to edit their text, or create new vertices
    
    // Check if we're clicking on an existing vertex
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
      // Clicking on existing vertex - edit its text
      trackVertexEdit(nearestVertex);
      const key = `${nearestVertex.x.toFixed(2)},${nearestVertex.y.toFixed(2)}`;
      setMenuVertexKey(key);
      
      // Position the input box at the vertex position
      // Account for the toolbar offset: 50px top for tab bar + sidebar width from left
      const toolbarWidth = Math.min(240, window.innerWidth * 0.22); // min(240px, 22vw)
      const toolbarHeight = 50; // top offset for tab bar
      setAtomInputPosition({ 
        x: nearestVertex.x + offset.x + toolbarWidth, 
        y: nearestVertex.y + offset.y + toolbarHeight 
      });
      
      // Set initial value if there's an existing atom
      const existingAtom = vertexAtoms[key];
      if (existingAtom) {
        const symbol = existingAtom.symbol || existingAtom;
        console.log('📝 Loading existing atom for editing:', symbol, 'from:', existingAtom);
        setAtomInputValue(symbol);
      } else {
        setAtomInputValue('');
      }
      
      // Show the input box
      setShowAtomInput(true);
      return;
    } else {
      // Clicking on empty space - create new vertex and open text input
      
      // Capture state before creating new vertex
      captureState();
      
      // Calculate coordinates in the grid reference frame (subtract offset)
      const gridX = x - offset.x;
      const gridY = y - offset.y;
      
      // Create a new vertex at the exact click position (on-grid)
      const newVertex = { x: gridX, y: gridY, isOffGrid: false };
      
      // Add the new vertex and track it - no merging needed for text mode vertices
      updateVerticesWithTracking(prevVertices => [...prevVertices, newVertex], newVertex);
      
      // Add the new text mode vertex to freeFloatingVertices set so it can be moved
      const newVertexKey = `${gridX.toFixed(2)},${gridY.toFixed(2)}`;
      setFreeFloatingVertices(prevSet => new Set([...prevSet, newVertexKey]));
      
      // Set up text input for the new vertex
      setMenuVertexKey(newVertexKey);
      
      // Position the input box at the vertex position
      // Account for the toolbar offset: 50px top for tab bar + sidebar width from left
      const toolbarWidth = Math.min(240, window.innerWidth * 0.22); // min(240px, 22vw)
      const toolbarHeight = 50; // top offset for tab bar
      setAtomInputPosition({ 
        x: x + toolbarWidth, 
        y: y + toolbarHeight 
      });
      
      // Start with empty text
      setAtomInputValue('');
      
      // Show the input box
      setShowAtomInput(true);
      return;
    }
  } else if (mode === 'draw' || mode === 'triple' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') {
    // Allow bond creation in draw and stereochemistry modes
    // (Vertex detection has been moved to the top for higher priority)
    let closestIdx = null;
    let minDist = lineThreshold;
    let closestBondIdx = null;
    let minBondDist = lineThreshold;
    
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
      
      // Track closest segment overall
      if (distSeg < minDist) {
        minDist = distSeg;
        closestIdx = idx;
      }
      
      // Track closest actual bond (bondOrder > 0) separately
      if (seg.bondOrder > 0 && distSeg < minBondDist) {
        minBondDist = distSeg;
        closestBondIdx = idx;
      }
    });
    
    // Prioritize actual bonds over grid lines when both are within threshold
    if (closestBondIdx !== null) {
      closestIdx = closestBondIdx;
    }
    if (closestIdx !== null) {
      // Track which vertices are involved in this bond for molecule tracking
      const segment = segments[closestIdx];
      if (segment) {
        // Find and track one of the vertices involved in the bond
        const v1 = vertices.find(v => 
          Math.abs(v.x - segment.x1) < 0.01 && Math.abs(v.y - segment.y1) < 0.01
        );
        if (v1) {
          trackVertexEdit(v1);
        }
      }
      
      // Capture state before modifying bonds
      captureState();
      
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
              
              const updatedSegment = { 
                ...seg, 
                bondOrder: newBondOrder,
                bondType: null, // Clear any special bond type when using normal draw mode
                direction: direction, // Ensure direction is set
                upperVertex: upperVertex, // Only set for double bonds
                lowerVertex: lowerVertex, // Only set for double bonds
                flipSmallerLine: false // Default to false for all bonds
              };
              
              // If this is becoming a triple bond, check bond context before applying linear geometry
              if (newBondOrder === 3) {
                // Check if either vertex has existing bonds to orient the triple bond linearly
                const v1 = { x: seg.x1, y: seg.y1 };
                const v2 = { x: seg.x2, y: seg.y2 };
                
                const v1Bonds = segments.filter((s, idx) => 
                  idx !== closestIdx && s.bondOrder > 0 &&
                  ((Math.abs(s.x1 - v1.x) < 0.01 && Math.abs(s.y1 - v1.y) < 0.01) ||
                   (Math.abs(s.x2 - v1.x) < 0.01 && Math.abs(s.y2 - v1.y) < 0.01))
                );
                
                const v2Bonds = segments.filter((s, idx) => 
                  idx !== closestIdx && s.bondOrder > 0 &&
                  ((Math.abs(s.x1 - v2.x) < 0.01 && Math.abs(s.y1 - v2.y) < 0.01) ||
                   (Math.abs(s.x2 - v2.x) < 0.01 && Math.abs(s.y2 - v2.y) < 0.01))
                );
                
                // If BOTH vertices have existing bonds, skip linear geometry (keep existing structure)
                const bothVerticesHaveBonds = v1Bonds.length > 0 && v2Bonds.length > 0;
                
                // Only apply linear geometry if not both vertices have bonds
                if (!bothVerticesHaveBonds && (v1Bonds.length > 0 || v2Bonds.length > 0)) {
                  let anchorVertex, otherVertex, anchorBonds;
                  
                  if (v1Bonds.length > 0) {
                    anchorVertex = v1;
                    otherVertex = v2;
                    anchorBonds = v1Bonds;
                  } else {
                    anchorVertex = v2;
                    otherVertex = v1;
                    anchorBonds = v2Bonds;
                  }
                  
                  // Calculate the direction of existing bonds from the anchor vertex
                  const existingBond = anchorBonds[0]; // Use first bond for orientation
                  let existingBondAngle;
                  
                  if (Math.abs(existingBond.x1 - anchorVertex.x) < 0.01 && Math.abs(existingBond.y1 - anchorVertex.y) < 0.01) {
                    // Anchor is at the start of the existing bond
                    existingBondAngle = Math.atan2(existingBond.y2 - anchorVertex.y, existingBond.x2 - anchorVertex.x);
                  } else {
                    // Anchor is at the end of the existing bond
                    existingBondAngle = Math.atan2(existingBond.y1 - anchorVertex.y, existingBond.x1 - anchorVertex.x);
                  }
                  
                  // Orient triple bond 180° from the existing bond
                  const tripleBondAngle = existingBondAngle + Math.PI;
                  const newOtherX = anchorVertex.x + Math.cos(tripleBondAngle) * hexRadius;
                  const newOtherY = anchorVertex.y + Math.sin(tripleBondAngle) * hexRadius;
                  
                  // Update the segment coordinates for linear orientation
                  if (anchorVertex === v1) {
                    updatedSegment.x2 = newOtherX;
                    updatedSegment.y2 = newOtherY;
                  } else {
                    updatedSegment.x1 = newOtherX;
                    updatedSegment.y1 = newOtherY;
                  }
                  
                  // Update the direction based on new coordinates
                  updatedSegment.direction = calculateBondDirection(updatedSegment.x1, updatedSegment.y1, updatedSegment.x2, updatedSegment.y2);
                  
                  // Store the vertex update to be applied immediately after segment update
                  updatedSegment._needsVertexUpdate = {
                    newOtherX,
                    newOtherY,
                    originalX1: seg.x1,
                    originalY1: seg.y1,
                    originalX2: seg.x2,
                    originalY2: seg.y2,
                    anchorVertex: anchorVertex, // The vertex that stays on-grid
                    otherVertex: otherVertex    // The vertex that becomes off-grid
                  };
                } else if (!bothVerticesHaveBonds) {
                  // No existing bonds and not both vertices have bonds, mark vertices as off-grid
                  updatedSegment._needsVertexUpdate = {
                    newOtherX: seg.x2, // Keep original coordinates
                    newOtherY: seg.y2,
                    originalX1: seg.x1,
                    originalY1: seg.y1,
                    originalX2: seg.x2,
                    originalY2: seg.y2
                  };
                }
                // If both vertices have bonds, do nothing special - keep existing structure
              }
              
              return updatedSegment;
            }
            return seg;
          });
        } else if (mode === 'triple') {
          // Triple bond mode - any existing bond (1 or 2) goes to 3, only 3 goes to 0, 0 goes to 3
          updatedSegments = segments.map((seg, idx) => {
            if (idx === closestIdx) {
              const newBondOrder = seg.bondOrder === 3 ? 0 : 3;
              const direction = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
              
              const updatedSegment = { 
                ...seg, 
                bondOrder: newBondOrder,
                bondType: null, // Clear any special bond type when using triple bond mode
                direction: direction, // Ensure direction is set
                upperVertex: undefined, // Clear double bond vertices for triple bonds
                lowerVertex: undefined, // Clear double bond vertices for triple bonds
                flipSmallerLine: false // Default to false for all bonds
              };
              
              // If this is becoming a triple bond, check bond context before applying linear geometry
              if (newBondOrder === 3) {
                // Check if either vertex has existing bonds to orient the triple bond linearly
                const v1 = { x: seg.x1, y: seg.y1 };
                const v2 = { x: seg.x2, y: seg.y2 };
                
                const v1Bonds = segments.filter((s, idx) => 
                  idx !== closestIdx && s.bondOrder > 0 &&
                  ((Math.abs(s.x1 - v1.x) < 0.01 && Math.abs(s.y1 - v1.y) < 0.01) ||
                   (Math.abs(s.x2 - v1.x) < 0.01 && Math.abs(s.y2 - v1.y) < 0.01))
                );
                
                const v2Bonds = segments.filter((s, idx) => 
                  idx !== closestIdx && s.bondOrder > 0 &&
                  ((Math.abs(s.x1 - v2.x) < 0.01 && Math.abs(s.y1 - v2.y) < 0.01) ||
                   (Math.abs(s.x2 - v2.x) < 0.01 && Math.abs(s.y2 - v2.y) < 0.01))
                );
                
                // If BOTH vertices have existing bonds, skip linear geometry (keep existing structure)
                const bothVerticesHaveBonds = v1Bonds.length > 0 && v2Bonds.length > 0;
                
                // Only apply linear geometry if not both vertices have bonds
                if (!bothVerticesHaveBonds && (v1Bonds.length > 0 || v2Bonds.length > 0)) {
                  let anchorVertex, otherVertex, anchorBonds;
                  
                  if (v1Bonds.length > 0) {
                    anchorVertex = v1;
                    otherVertex = v2;
                    anchorBonds = v1Bonds;
                  } else {
                    anchorVertex = v2;
                    otherVertex = v1;
                    anchorBonds = v2Bonds;
                  }
                  
                  // Calculate the direction of existing bonds from the anchor vertex
                  const existingBond = anchorBonds[0]; // Use first bond for orientation
                  let existingBondAngle;
                  
                  if (Math.abs(existingBond.x1 - anchorVertex.x) < 0.01 && Math.abs(existingBond.y1 - anchorVertex.y) < 0.01) {
                    // Anchor is at the start of the existing bond
                    existingBondAngle = Math.atan2(existingBond.y2 - anchorVertex.y, existingBond.x2 - anchorVertex.x);
                  } else {
                    // Anchor is at the end of the existing bond
                    existingBondAngle = Math.atan2(existingBond.y1 - anchorVertex.y, existingBond.x1 - anchorVertex.x);
                  }
                  
                  // Orient triple bond 180° from the existing bond
                  const tripleBondAngle = existingBondAngle + Math.PI;
                  const newOtherX = anchorVertex.x + Math.cos(tripleBondAngle) * hexRadius;
                  const newOtherY = anchorVertex.y + Math.sin(tripleBondAngle) * hexRadius;
                  
                  // Update the segment coordinates for linear orientation
                  if (anchorVertex === v1) {
                    updatedSegment.x2 = newOtherX;
                    updatedSegment.y2 = newOtherY;
                  } else {
                    updatedSegment.x1 = newOtherX;
                    updatedSegment.y1 = newOtherY;
                  }
                  
                  // Update the direction based on new coordinates
                  updatedSegment.direction = calculateBondDirection(updatedSegment.x1, updatedSegment.y1, updatedSegment.x2, updatedSegment.y2);
                  
                  // Store the vertex update to be applied immediately after segment update
                  updatedSegment._needsVertexUpdate = {
                    newOtherX,
                    newOtherY,
                    originalX1: seg.x1,
                    originalY1: seg.y1,
                    originalX2: seg.x2,
                    originalY2: seg.y2,
                    anchorVertex: anchorVertex, // The vertex that stays on-grid
                    otherVertex: otherVertex    // The vertex that becomes off-grid
                  };
                } else if (!bothVerticesHaveBonds) {
                  // No existing bonds and not both vertices have bonds, mark vertices as off-grid
                  updatedSegment._needsVertexUpdate = {
                    newOtherX: seg.x2, // Keep original coordinates
                    newOtherY: seg.y2,
                    originalX1: seg.x1,
                    originalY1: seg.y1,
                    originalX2: seg.x2,
                    originalY2: seg.y2
                  };
                }
                // If both vertices have bonds, do nothing special - keep existing structure
              }
              
              return updatedSegment;
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
                const updatedSegment = {
                  ...seg,
                  bondOrder: 1, // Create a single bond
                  bondType: mode, // Set the stereochemistry type
                  bondDirection: 1, // Default direction (forward)
                  direction: direction, // Ensure direction is set
                  flipSmallerLine: false // Default to false
                };
                
                // For stereochemistry bonds, respect grid placement if vertices are on grid
                // Check if both vertices are on grid positions
                const v1OnGrid = findClosestGridVertex(seg.x1, seg.y1, 5) && findClosestGridVertex(seg.x1, seg.y1, 5).distance < 5;
                const v2OnGrid = findClosestGridVertex(seg.x2, seg.y2, 5) && findClosestGridVertex(seg.x2, seg.y2, 5).distance < 5;
                
                // Only mark as needing vertex updates if we need to force off-grid behavior
                // If both vertices are on grid, keep them on grid
                if (!v1OnGrid || !v2OnGrid) {
                updatedSegment._needsVertexUpdate = {
                  newOtherX: seg.x2, // Keep original coordinates
                  newOtherY: seg.y2,
                  originalX1: seg.x1,
                  originalY1: seg.y1,
                  originalX2: seg.x2,
                    originalY2: seg.y2,
                    respectGrid: true // Flag to indicate we should respect grid positions
                };
                }
                
                return updatedSegment;
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
        }
        
        // Check if any segments need vertex updates (for triple bond linear positioning)
        const segmentsNeedingVertexUpdate = updatedSegments.filter(seg => seg._needsVertexUpdate);
        
        if (segmentsNeedingVertexUpdate.length > 0) {
          // Apply vertex updates immediately (synchronously) within the same state update cycle
          setVertices(prevVertices => {
            let newVertices = [...prevVertices];
            
            segmentsNeedingVertexUpdate.forEach(seg => {
              const update = seg._needsVertexUpdate;
              
              // For triple bond linear positioning, only mark the moved vertex as off-grid
              if (update.anchorVertex && update.otherVertex) {
                // Triple bond case with linear positioning
                newVertices = newVertices.map(vertex => {
                  const anchorMatch = Math.abs(vertex.x - update.anchorVertex.x) < 0.01 && Math.abs(vertex.y - update.anchorVertex.y) < 0.01;
                  const otherMatch = Math.abs(vertex.x - update.otherVertex.x) < 0.01 && Math.abs(vertex.y - update.otherVertex.y) < 0.01;
                  const newVertexMatch = Math.abs(vertex.x - update.newOtherX) < 0.01 && Math.abs(vertex.y - update.newOtherY) < 0.01;
                  
                  if (anchorMatch) {
                    // Keep anchor vertex on-grid (don't change isOffGrid status)
                    return vertex;
                  } else if (otherMatch || newVertexMatch) {
                    // Mark moved vertex as off-grid
                    return { ...vertex, isOffGrid: true };
                  }
                  return vertex;
                }).filter(vertex => {
                  // Remove the old position of the moved vertex (if different from new position)
                  const isOldMovedVertex = Math.abs(vertex.x - update.otherVertex.x) < 0.01 && Math.abs(vertex.y - update.otherVertex.y) < 0.01;
                  const isPositionChanging = Math.abs(update.otherVertex.x - update.newOtherX) > 0.01 || Math.abs(update.otherVertex.y - update.newOtherY) > 0.01;
                  return !(isOldMovedVertex && isPositionChanging);
                });
              } else {
                // Handle stereochemistry bonds and other cases
                if (update.respectGrid) {
                  // For stereochemistry bonds with respectGrid flag, only mark vertices as off-grid if they're not on grid
                  newVertices = newVertices.map(vertex => {
                    const v1Match = Math.abs(vertex.x - update.originalX1) < 0.01 && Math.abs(vertex.y - update.originalY1) < 0.01;
                    const v2Match = Math.abs(vertex.x - update.originalX2) < 0.01 && Math.abs(vertex.y - update.originalY2) < 0.01;
                    const newVertexMatch = Math.abs(vertex.x - update.newOtherX) < 0.01 && Math.abs(vertex.y - update.newOtherY) < 0.01;
                    
                    if (v1Match || v2Match || newVertexMatch) {
                      // Check if this vertex is on grid
                      const closestGrid = findClosestGridVertex(vertex.x, vertex.y, 5);
                      const isOnGrid = closestGrid && closestGrid.distance < 5;
                      // Only mark as off-grid if it's not actually on grid
                      return { ...vertex, isOffGrid: !isOnGrid };
                    }
                    return vertex;
                  }).filter(vertex => {
                    // Remove vertices that are being repositioned (if they match the old position that's being moved)
                    // Only remove if the new position is different from the old position
                    const isBeingMoved = (
                      (Math.abs(vertex.x - update.originalX2) < 0.01 && Math.abs(vertex.y - update.originalY2) < 0.01) &&
                      (Math.abs(update.originalX2 - update.newOtherX) > 0.01 || Math.abs(update.originalY2 - update.newOtherY) > 0.01)
                    );
                    return !isBeingMoved;
                  });
                } else {
                  // Fallback for other cases - mark all vertices as off-grid
                newVertices = newVertices.map(vertex => {
                  const v1Match = Math.abs(vertex.x - update.originalX1) < 0.01 && Math.abs(vertex.y - update.originalY1) < 0.01;
                  const v2Match = Math.abs(vertex.x - update.originalX2) < 0.01 && Math.abs(vertex.y - update.originalY2) < 0.01;
                  const newVertexMatch = Math.abs(vertex.x - update.newOtherX) < 0.01 && Math.abs(vertex.y - update.newOtherY) < 0.01;
                  
                  if (v1Match || v2Match || newVertexMatch) {
                    return { ...vertex, isOffGrid: true };
                  }
                  return vertex;
                }).filter(vertex => {
                  // Remove vertices that are being repositioned (if they match the old position that's being moved)
                  // Only remove if the new position is different from the old position
                  const isBeingMoved = (
                    (Math.abs(vertex.x - update.originalX2) < 0.01 && Math.abs(vertex.y - update.originalY2) < 0.01) &&
                    (Math.abs(update.originalX2 - update.newOtherX) > 0.01 || Math.abs(update.originalY2 - update.newOtherY) > 0.01)
                  );
                  return !isBeingMoved;
                });
                }
              }
              
              // Check if we need to add a new vertex at the new position
              const newVertexExists = newVertices.some(v => 
                Math.abs(v.x - update.newOtherX) < 0.01 && Math.abs(v.y - update.newOtherY) < 0.01
              );
              
              if (!newVertexExists) {
                // For new vertices, check if they should be on grid or off grid
                let isOffGrid = true; // Default to off-grid
                if (update.respectGrid) {
                  const closestGrid = findClosestGridVertex(update.newOtherX, update.newOtherY, 5);
                  isOffGrid = !(closestGrid && closestGrid.distance < 5);
                }
                newVertices.push({ x: update.newOtherX, y: update.newOtherY, isOffGrid: isOffGrid });
              }
            });
            
            // Remove any duplicate vertices at the same position
            const seenVertices = new Set();
            newVertices = newVertices.filter(vertex => {
              const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
              if (seenVertices.has(key)) {
                return false; // Remove duplicate
              }
              seenVertices.add(key);
              return true;
            });
            
            return newVertices;
          });
          
          // Clear bond previews immediately to prevent floating previews
          setBondPreviews([]);
          setHoverBondPreview(null);
        }
        
        // Clean up the temporary properties
        const cleanedSegments = updatedSegments.map(seg => {
          const { _needsVertexUpdate, ...cleanSeg } = seg;
          return cleanSeg;
        });
        
        return cleanedSegments;
      });
      return;
    }
    
    // If we reach here in draw or stereochemistry mode and have a fourth bond source but no preview, clear it
    if ((mode === 'draw' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && fourthBondSource) {
      setFourthBondSource(null);
      setFourthBondPreview(null);
    }
    
    // In draw, triple, or stereochemistry mode, if clicking on empty space, find closest vertex and start bond preview
    if ((mode === 'draw' || mode === 'triple' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous') && !fourthBondSource) {
      // Find the closest vertex to the click position
      let closestVertex = null;
      let minDistance = Infinity;
      const maxDistance = 150; // Maximum distance to consider (in pixels)
      
      for (let v of vertices) {
        const dist = distanceToVertex(x, y, v.x, v.y);
        if (dist < minDistance && dist <= maxDistance) {
          minDistance = dist;
          closestVertex = v;
        }
      }
      
      // If we found a close enough vertex, start bond preview from it
      if (closestVertex) {
        setFourthBondSource(closestVertex);
        setFourthBondMode(true); // Activate fourth bond mode for preview
        
        // Generate initial preview pointing from vertex toward click position
        const sourceScreenX = closestVertex.x + offset.x;
        const sourceScreenY = closestVertex.y + offset.y;
        const dx = x - sourceScreenX;
        const dy = y - sourceScreenY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Point toward click position at hexRadius distance
        const ux = dx / length;
        const uy = dy / length;
        const endX = sourceScreenX + ux * hexRadius;
        const endY = sourceScreenY + uy * hexRadius;
        
        // Find closest vertex for snapping with different tolerances for grid vs off-grid vertices
        const gridX = endX - offset.x;
        const gridY = endY - offset.y;
        
        // First try to find off-grid vertices with tight tolerance (exact clicking)
        let closestGrid = null;
        for (const vertex of vertices) {
          if (vertex.isOffGrid === true) {
            const distance = Math.sqrt((vertex.x - gridX) ** 2 + (vertex.y - gridY) ** 2);
            if (distance <= 8) { // Very tight tolerance for off-grid vertices
              closestGrid = { vertex, distance };
              break;
            }
          }
        }
        
        // If no off-grid vertex found, try grid vertices with normal tolerance
        if (!closestGrid) {
          closestGrid = findClosestGridVertex(gridX, gridY, 30);
        }
        
        setFourthBondPreview({
          startX: sourceScreenX,
          startY: sourceScreenY,
          endX: endX,
          endY: endY,
          snappedToGrid: !!closestGrid,
          snappedToVertex: !!closestGrid
        });
        
        return;
      }
    }
  } else {
    // For any other mode (not draw, erase, arrow, equil, curve, plus, minus, lone)
    // Do nothing - this is just to ensure we don't show menu or create bonds for other modes
    return;
  }
} 