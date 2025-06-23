// Arrow rendering functions - exact copy from HexGridWithToolbar.jsx

export function drawArrowOnCanvas(ctx, x1, y1, x2, y2, color = "#000", width = 3, mode) {
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

export function drawEquilArrowOnCanvas(ctx, x1, y1, x2, y2, color = "#000", width = 3, topX1, topX2, bottomX1, bottomX2, arrowIndex = -1, mode, isPointInArrowCircle, offset) {
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
export const calculateCurvedArrowPeak = (x1, y1, x2, y2, type) => {
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
export function drawCurvedArrowOnCanvas(ctx, x1, y1, x2, y2, type, color = "#000", arrowIndex = -1, peakX = null, peakY = null, arrowsArray = null, mode, hoverCurvedArrow) {
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