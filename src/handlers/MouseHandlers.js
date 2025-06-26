// Mouse event handlers

export const handleMouseMove = (
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
) => {
  const rect = canvasRef.current.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Update paste preview position if in paste mode
  if (isPasteMode && !isDragging) {
    setPastePreviewPosition({ x, y });
    
    // Calculate alignment for snapping (no throttling for responsiveness)
    if (clipboard && clipboard.vertices && showSnapPreview) {
      // Try bond alignment first for small rings
      let alignment = calculateBondAlignment(clipboard.vertices, x, y);
      
      // If no bond alignment found, try grid alignment
      if (!alignment) {
        alignment = calculateGridAlignment(clipboard.vertices, x, y);
      }
      
      setSnapAlignment(alignment);
    } else {
      setSnapAlignment(null);
    }
  }

  // Handle fourth bond preview mode (triggered by blue triangle) or draw mode with source
  if ((fourthBondMode || (mode === 'draw' && fourthBondSource)) && fourthBondSource && !isDragging) {
    const sourceX = fourthBondSource.x + offset.x;
    const sourceY = fourthBondSource.y + offset.y;

    // Calculate direction vector from source to mouse
    const dx = x - sourceX;
    const dy = y - sourceY;
    const currentLength = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction vector (prevents division by zero with || 1)
    let ux = dx / (currentLength || 1);
    let uy = dy / (currentLength || 1);

    // Calculate current angle in radians
    const currentAngle = Math.atan2(uy, ux);
    
    // Check for grid snapping - only for on-grid vertices
    const snapThreshold = 15 * Math.PI / 180; // 15 degrees in radians
    let snappedAngle = null;
    let snappedToGrid = false;

    // Only snap if the source vertex is on-grid (not off-grid)
    if (fourthBondSource.isOffGrid !== true) {
      // Find grid lines connected to this specific vertex
      const connectedGridLines = [];
      
      for (const segment of segments) {
        if (segment.bondOrder === 0) { // Grid lines only
          // Check if this grid line connects to our source vertex
          const sourceX = fourthBondSource.x;
          const sourceY = fourthBondSource.y;
          
          const connectsToStart = Math.abs(segment.x1 - sourceX) < 0.01 && Math.abs(segment.y1 - sourceY) < 0.01;
          const connectsToEnd = Math.abs(segment.x2 - sourceX) < 0.01 && Math.abs(segment.y2 - sourceY) < 0.01;
          
          if (connectsToStart || connectsToEnd) {
            // Calculate the direction from source vertex along this grid line
            let directionX, directionY;
            if (connectsToStart) {
              directionX = segment.x2 - segment.x1;
              directionY = segment.y2 - segment.y1;
            } else {
              directionX = segment.x1 - segment.x2;
              directionY = segment.y1 - segment.y2;
            }
            
            const length = Math.sqrt(directionX * directionX + directionY * directionY);
            if (length > 0) {
              const angle = Math.atan2(directionY / length, directionX / length);
              connectedGridLines.push(angle);
            }
          }
        }
      }

      // Check if current angle is close to any of the connected grid line directions
      for (const gridAngle of connectedGridLines) {
        // Calculate shortest angular distance
        let angleDiff = currentAngle - gridAngle;
        // Normalize to [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        if (Math.abs(angleDiff) < snapThreshold) {
          snappedAngle = gridAngle;
          snappedToGrid = true;
          break;
        }
      }
    }

    // Use snapped angle if found, otherwise use original direction
    if (snappedAngle !== null) {
      ux = Math.cos(snappedAngle);
      uy = Math.sin(snappedAngle);
    }

    // Set endpoint at constant length in calculated direction
    const endX = sourceX + ux * hexRadius;
    const endY = sourceY + uy * hexRadius;
    
    // Update preview with snapping indication
    setFourthBondPreview({
      startX: sourceX,
      startY: sourceY,
      endX: endX,
      endY: endY,
      snappedToVertex: false,
      snappedToGrid: snappedToGrid
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
                } else if (part === 'topStart') {
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
  if (mode === 'draw' || mode === 'erase' || mode === 'wedge' || mode === 'dash' || mode === 'ambiguous' || mode === 'mouse' || mode === 'freebond' || mode === 'text') {
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
          return;
        } else {
          // Reset cursor if not over any arrow part
          canvasRef.current.style.cursor = 'default';
          // Clear curved arrow hover state
          setHoverCurvedArrow({ index: -1, part: null });
        }
      }
    }
    

    
    let found = null;
    for (let v of vertices) {
      const dist = distanceToVertex(x, y, v.x, v.y);
      if (dist <= vertexThreshold) {
        found = v;
        break;
      }
    }
    
    // Set hover vertex in draw, erase, freebond modes, or for free-floating vertices in mouse mode, or for any vertex in text mode
    if (mode === 'draw' || mode === 'erase' || mode === 'freebond') {
      setHoverVertex(found);
    } else if (mode === 'text') {
      // In text mode, hover over any vertex to edit its text
      if (found) {
        setHoverVertex(found);
        canvasRef.current.style.cursor = 'pointer'; // Show pointer cursor when hovering over editable vertex
      } else {
        setHoverVertex(null);
        canvasRef.current.style.cursor = 'text'; // Show text cursor when not over a vertex
      }
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
    
    // Only set hoverSegmentIndex if not hovering a vertex and not in text mode
    if (!found && mode !== 'text') {
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
    
    // In text mode, always clear segment hover since only vertices are interactive
    if (mode === 'text') {
      setHoverSegmentIndex(null);
    }
  } else {
    // For other modes, clear all hover indicators
    setHoverVertex(null);
    setHoverSegmentIndex(null);
    setHoverCurvedArrow({ index: -1, part: null }); // Clear curved arrow hover when not in mouse mode
  }
};

export const handleMouseDown = (
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
  captureState,
  // Setters
  setMouseDownOnCanvas,
  setDraggingArrowIndex,
  setDragArrowOffset,
  setDragStart,
  setIsDragging,
  setDidDrag,
  setDraggingVertex,
  setIsSelecting,
  setSelectionStart,
  setSelectionEnd
) => {
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
      
      // Capture state before starting arrow drag
      captureState();
      
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
      
      // Capture state before starting curved arrow drag
      captureState();
      
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
          // Capture state before starting vertex drag
          captureState();
          
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
            // Capture state before starting vertex drag
            captureState();
            
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
  

};

export const handleMouseUp = (
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
  handleArrowClick,
  // Setters
  setIsSelecting,
  setIsDragging,
  setDraggingVertex,
  setDraggingArrowIndex,
  setDragArrowOffset,
  setHoverVertex,
  setHoverSegmentIndex,
  setFourthBondMode,
  setFourthBondSource,
  setFourthBondPreview,
  setMouseDownOnCanvas
) => {
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