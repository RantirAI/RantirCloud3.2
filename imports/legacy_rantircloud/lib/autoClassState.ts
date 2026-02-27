// Shared state for auto-class creation to prevent infinite loops
export let isApplyingClass = false;

export const setIsApplyingClass = (value: boolean) => {
  isApplyingClass = value;
};

export const getIsApplyingClass = () => isApplyingClass;

// Track which component is currently being edited
// This component should KEEP its locks when updateClass propagates changes
let currentEditorComponentId: string | null = null;

export const setEditorComponentId = (componentId: string | null) => {
  currentEditorComponentId = componentId;
};

export const getEditorComponentId = () => currentEditorComponentId;
