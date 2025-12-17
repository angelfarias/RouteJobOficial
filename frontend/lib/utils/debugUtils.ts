// Debug utility to safely render objects and identify problematic data
export function safeRender(value: any, fallback: string = 'N/A'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    return value.toString();
  }
  
  if (typeof value === 'object') {
    console.warn('⚠️ Attempting to render object as string:', value);
    
    // Handle common object types
    if (value.latitude && value.longitude) {
      return `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // For other objects, return a safe string representation
    return JSON.stringify(value);
  }
  
  return fallback;
}

// Debug function to log object structure
export function debugObject(obj: any, label: string = 'Object'): void {
  console.log(`🔍 Debug ${label}:`, {
    type: typeof obj,
    value: obj,
    keys: obj && typeof obj === 'object' ? Object.keys(obj) : 'N/A'
  });
}