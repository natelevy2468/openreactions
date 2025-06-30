// Text formatting utilities

// Helper function to format atom text with subscript numbers
export const formatAtomText = (text) => {
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