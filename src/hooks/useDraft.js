import { useEffect } from 'react';

export function useDraft(key, state, setState) {
  // Restore on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch {}
    }
    // eslint-disable-next-line
  }, []);

  // Autosave on change
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  // Clear helper
  const clearDraft = () => {
    sessionStorage.removeItem(key);
  };

  return { clearDraft };
}
