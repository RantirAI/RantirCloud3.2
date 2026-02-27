import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onSelectAll?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onDuplicate?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs or textareas
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const { ctrlKey, metaKey, shiftKey, altKey, key } = event;
    const isCtrlOrCmd = ctrlKey || metaKey;

    // History shortcuts
    if (isCtrlOrCmd && !shiftKey && !altKey) {
      switch (key.toLowerCase()) {
        case 'z':
          event.preventDefault();
          config.onUndo?.();
          break;
        case 'y':
          event.preventDefault();
          config.onRedo?.();
          break;
        case 'c':
          event.preventDefault();
          config.onCopy?.();
          break;
        case 'x':
          event.preventDefault();
          config.onCut?.();
          break;
        case 'v':
          event.preventDefault();
          config.onPaste?.();
          break;
        case 's':
          event.preventDefault();
          config.onSave?.();
          break;
        case 'a':
          event.preventDefault();
          config.onSelectAll?.();
          break;
        case 'g':
          event.preventDefault();
          config.onGroup?.();
          break;
        case 'd':
          event.preventDefault();
          config.onDuplicate?.();
          break;
      }
    }

    // Ctrl+Shift shortcuts
    if (isCtrlOrCmd && shiftKey && !altKey) {
      switch (key.toLowerCase()) {
        case 'z':
          event.preventDefault();
          config.onRedo?.();
          break;
        case 'g':
          event.preventDefault();
          config.onUngroup?.();
          break;
      }
    }

    // Single key shortcuts
    if (!isCtrlOrCmd && !shiftKey && !altKey) {
      switch (key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          config.onDelete?.();
          break;
        case 'Escape':
          event.preventDefault();
          config.onEscape?.();
          break;
      }
    }
  }, [config]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}