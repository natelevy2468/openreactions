// Arrow-specific event handlers

export const handleArrowMouseMove = (
  event,
  mode,
  canvasRef,
  curvedArrowStartPoint,
  offset,
  setArrowPreview
) => {
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

export const handleArrowClick = (
  event,
  mode,
  canvasRef,
  offset,
  curvedArrowStartPoint,
  calculateCurvedArrowPeak,
  setArrows,
  setArrowPreview,
  setCurvedArrowStartPoint
) => {
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