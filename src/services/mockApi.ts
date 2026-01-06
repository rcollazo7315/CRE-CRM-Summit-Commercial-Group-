
// Helper for safe JSON stringification (prevents circular reference errors)
const safeStringify = (obj: any) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      // Avoid serializing DOM nodes or Window objects which can cause crashes
      if ((typeof Node !== 'undefined' && value instanceof Node) || 
          (typeof Window !== 'undefined' && value instanceof Window)) {
        return '[DOM Object]';
      }
      cache.add(value);
    }
    return value;
  });
};
