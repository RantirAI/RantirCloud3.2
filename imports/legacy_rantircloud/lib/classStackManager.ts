/**
 * Class Stack Manager
 * Handles conversion between legacy and new class stack formats
 * Manages active class selection and type assignments
 */

import { ClassStackItem, ClassType } from '@/types/classes';

/**
 * Convert legacy appliedClasses array to new ClassStackItem format
 */
export function convertLegacyToClassStack(
  appliedClasses: string[],
  autoClass?: string,
  activeClass?: string
): {
  classStack: ClassStackItem[];
  activeClass: string | null;
} {
  const stack: ClassStackItem[] = [];
  
  // Add applied classes as secondary by default
  appliedClasses.forEach(name => {
    stack.push({
      name,
      type: 'secondary',
      editable: false
    });
  });
  
  // Add auto-class if exists
  if (autoClass && !appliedClasses.includes(autoClass)) {
    stack.push({
      name: autoClass,
      type: 'secondary',
      editable: false
    });
  }
  
  // Determine active class
  const finalActiveClass = activeClass || (stack.length > 0 ? stack[stack.length - 1].name : null);
  
  // Mark active class
  if (finalActiveClass) {
    const activeIndex = stack.findIndex(item => item.name === finalActiveClass);
    if (activeIndex >= 0) {
      stack[activeIndex].type = 'primary';
      stack[activeIndex].editable = true;
    }
  }
  
  return { classStack: stack, activeClass: finalActiveClass };
}

/**
 * Set a class as active (primary) in the stack
 */
export function setActiveClassInStack(
  classStack: ClassStackItem[],
  className: string
): ClassStackItem[] {
  return classStack.map(item => ({
    ...item,
    type: item.name === className ? 'primary' : 'secondary',
    editable: item.name === className
  }));
}

/**
 * Add a class to the stack
 */
export function addClassToStack(
  classStack: ClassStackItem[],
  className: string,
  makeActive: boolean = true
): ClassStackItem[] {
  // Check if class already exists
  if (classStack.some(item => item.name === className)) {
    // If exists and should be active, just set it active
    if (makeActive) {
      return setActiveClassInStack(classStack, className);
    }
    return classStack;
  }
  
  // Add new class
  const newStack = classStack.map(item => ({
    ...item,
    type: makeActive ? 'secondary' as ClassType : item.type,
    editable: makeActive ? false : item.editable
  }));
  
  newStack.push({
    name: className,
    type: makeActive ? 'primary' : 'secondary',
    editable: makeActive
  });
  
  return newStack;
}

/**
 * Remove a class from the stack
 */
export function removeClassFromStack(
  classStack: ClassStackItem[],
  className: string
): {
  classStack: ClassStackItem[];
  newActiveClass: string | null;
} {
  const wasActive = classStack.find(item => item.name === className)?.type === 'primary';
  const newStack = classStack.filter(item => item.name !== className);
  
  let newActiveClass: string | null = null;
  
  // If removed class was active, make the last class active
  if (wasActive && newStack.length > 0) {
    newActiveClass = newStack[newStack.length - 1].name;
    newStack[newStack.length - 1].type = 'primary';
    newStack[newStack.length - 1].editable = true;
  }
  
  return { classStack: newStack, newActiveClass };
}

/**
 * Get the active class from a stack
 */
export function getActiveClassFromStack(classStack: ClassStackItem[]): string | null {
  const activeItem = classStack.find(item => item.type === 'primary' && item.editable);
  return activeItem ? activeItem.name : null;
}

/**
 * Convert ClassStackItem array to simple string array (for backward compatibility)
 */
export function classStackToStringArray(classStack: ClassStackItem[]): string[] {
  return classStack.map(item => item.name);
}

/**
 * Check if a class is active in the stack
 */
export function isClassActive(classStack: ClassStackItem[], className: string): boolean {
  const item = classStack.find(item => item.name === className);
  return item?.type === 'primary' && item?.editable === true;
}

/**
 * Get class type from stack
 */
export function getClassType(classStack: ClassStackItem[], className: string): ClassType | null {
  const item = classStack.find(item => item.name === className);
  return item ? item.type : null;
}
