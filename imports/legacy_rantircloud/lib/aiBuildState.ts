/**
 * Global AI Build State
 * 
 * This module provides a shared flag that both the AI build stream and class store
 * can access to prevent race conditions during AI generation.
 * 
 * Problem: When AI is generating components, the class store's reconciliation
 * and save operations can delete classes or overwrite component state, causing
 * sections to disappear from the canvas.
 * 
 * Solution: Set this flag during AI builds so class operations can skip
 * potentially destructive operations until the build completes.
 */

let isAIBuilding = false;

/**
 * Check if an AI build is currently in progress
 */
export const getIsAIBuilding = (): boolean => isAIBuilding;

/**
 * Set the AI build state
 * Called by useAIAppBuildStream when starting/completing builds
 */
export const setIsAIBuilding = (value: boolean): void => {
  isAIBuilding = value;
  console.log(`[AI Build State] isAIBuilding = ${value}`);
};

// ─── Real-time progress state ────────────────────────────────────────────────

let currentStepMessage = '';
let completedSteps: string[] = [];
let totalExpectedSections = 0;

/** Set the currently-active step label (shown with spinner) */
export const setAIBuildStep = (msg: string): void => {
  currentStepMessage = msg;
};

// ─── Next section indicator ───────────────────────────────────────────────────

let nextSectionName = '';

/** Set the name of the section currently being generated next */
export const setAINextSectionName = (name: string): void => {
  nextSectionName = name;
};

/** Get the name of the section being generated next */
export const getAINextSectionName = (): string => nextSectionName;

/** Get the currently-active step label */
export const getAIBuildStep = (): string => currentStepMessage;

/** Append a completed step (shown with green checkmark) */
export const addAICompletedStep = (msg: string): void => {
  completedSteps = [...completedSteps, msg];
};

/** Get all completed step labels */
export const getAICompletedSteps = (): string[] => completedSteps;

/** Reset all progress state at the start of a new build */
export const clearAIBuildProgress = (): void => {
  completedSteps = [];
  currentStepMessage = '';
  totalExpectedSections = 0;
  nextSectionName = '';
};

/** Set how many sections are expected in total (used for "N of M" counter) */
export const setAITotalSections = (n: number): void => {
  totalExpectedSections = n;
};

/** Get total expected section count */
export const getAITotalSections = (): number => totalExpectedSections;
