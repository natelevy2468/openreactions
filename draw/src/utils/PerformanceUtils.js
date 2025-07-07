/**
 * Performance utilities for optimizing the chemical drawing application
 */

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed 
 * since the last time the debounced function was invoked
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Request Animation Frame throttle - ensures function runs at most once per frame
 */
export function rafThrottle(func) {
  let rafId = null;
  
  return function(...args) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, args);
        rafId = null;
      });
    }
  };
}

/**
 * Performance measurement wrapper
 */
export function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  // Log if exceeds frame budget (16.67ms for 60fps)
  if (duration > 16.67) {
    console.warn(`⚠️ Performance: ${name} took ${duration.toFixed(2)}ms`);
  } else if (duration > 8) {
    console.log(`📊 Performance: ${name} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Async performance measurement
 */
export async function measurePerformanceAsync(name, fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (duration > 16.67) {
    console.warn(`⚠️ Performance: ${name} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Create a performance monitor that tracks average execution time
 */
export function createPerformanceMonitor(name, sampleSize = 10) {
  const samples = [];
  
  return {
    measure(fn) {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      
      samples.push(duration);
      if (samples.length > sampleSize) {
        samples.shift();
      }
      
      return result;
    },
    
    getStats() {
      if (samples.length === 0) return null;
      
      const sum = samples.reduce((a, b) => a + b, 0);
      const avg = sum / samples.length;
      const max = Math.max(...samples);
      const min = Math.min(...samples);
      
      return {
        name,
        samples: samples.length,
        avg: avg.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        last: samples[samples.length - 1].toFixed(2)
      };
    },
    
    logStats() {
      const stats = this.getStats();
      if (stats) {
        console.log(`📊 ${name} Performance:`, stats);
      }
    }
  };
}

/**
 * Batch DOM updates using requestAnimationFrame
 */
export function batchUpdates(updates) {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      updates();
      resolve();
    });
  });
}

/**
 * Create a function that batches multiple calls into a single execution
 */
export function createBatcher(fn, delay = 0) {
  let scheduled = false;
  let args = [];
  
  const execute = () => {
    const batch = args;
    args = [];
    scheduled = false;
    fn(batch);
  };
  
  return function(...newArgs) {
    args.push(newArgs);
    
    if (!scheduled) {
      scheduled = true;
      if (delay > 0) {
        setTimeout(execute, delay);
      } else {
        requestAnimationFrame(execute);
      }
    }
  };
}

/**
 * Memoize function results based on arguments
 */
export function memoize(fn, resolver) {
  const cache = new Map();
  
  return function(...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}

/**
 * Check if viewport contains a point
 */
export function isInViewport(x, y, width, height, padding = 100) {
  return x >= -padding && 
         x <= width + padding && 
         y >= -padding && 
         y <= height + padding;
}

/**
 * Check if viewport contains a rectangle
 */
export function isRectInViewport(x, y, rectWidth, rectHeight, viewWidth, viewHeight, padding = 100) {
  return x + rectWidth >= -padding && 
         x <= viewWidth + padding && 
         y + rectHeight >= -padding && 
         y <= viewHeight + padding;
}

/**
 * Check if viewport contains a line segment
 */
export function isSegmentInViewport(x1, y1, x2, y2, width, height, padding = 100) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  return maxX >= -padding && 
         minX <= width + padding && 
         maxY >= -padding && 
         minY <= height + padding;
} 