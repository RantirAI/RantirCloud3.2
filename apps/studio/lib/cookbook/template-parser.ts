import { RecipeContext } from 'types/cookbook'

/**
 * Parses template variables in the format {{context.variable}}, {{input.field}}, {{env.VAR}}
 * and replaces them with actual values from the provided context
 */
export function parseTemplateVariables(
  template: string,
  context: RecipeContext,
  inputValues?: Record<string, any>,
  envValues?: Record<string, string>
): string {
  const scopedContext: RecipeContext = {
    ...context,
    context,
    ...(inputValues ? { ...inputValues, input: inputValues } : {}),
    ...(envValues ? { ...envValues, env: envValues } : {}),
  }

  // Supports {{context.foo}}, {{input.foo}}, {{env.FOO}}, and bare {{foo}}
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, path) => {
    const value = getNestedValue(scopedContext, String(path).trim())
    return value !== undefined ? String(value) : match
  })
}

/**
 * Gets a nested value from an object using dot notation
 * e.g., getNestedValue({ foo: { bar: 'baz' }}, 'foo.bar') returns 'baz'
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

export function parseTemplateStructure<T>(
  value: T,
  context: RecipeContext,
  inputValues?: Record<string, any>,
  envValues?: Record<string, string>
): T {
  if (typeof value === 'string') {
    return parseTemplateVariables(value, context, inputValues, envValues) as T
  }

  if (Array.isArray(value)) {
    return value.map((entry) => parseTemplateStructure(entry, context, inputValues, envValues)) as T
  }

  if (value !== null && typeof value === 'object') {
    const parsed = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        parseTemplateStructure(nestedValue, context, inputValues, envValues),
      ])
    )
    return parsed as T
  }

  return value
}

/**
 * Extracts all template variables from a string
 * Returns an array of objects with the variable type and path
 */
export function extractTemplateVariables(template: string): Array<{
  type: 'context' | 'input' | 'env'
  path: string
}> {
  const variables: Array<{ type: 'context' | 'input' | 'env'; path: string }> = []
  const regex = /\{\{(context|input|env)\.([^}]+)\}\}/g
  let match

  while ((match = regex.exec(template)) !== null) {
    variables.push({
      type: match[1] as 'context' | 'input' | 'env',
      path: match[2],
    })
  }

  return variables
}

/**
 * Validates if all required template variables are available in the context
 */
export function validateTemplateVariables(
  template: string,
  context: RecipeContext,
  inputValues?: Record<string, any>,
  envValues?: Record<string, string>
): { valid: boolean; missingVariables: string[] } {
  const variables = extractTemplateVariables(template)
  const missingVariables: string[] = []

  for (const variable of variables) {
    let value: any

    switch (variable.type) {
      case 'context':
        value = getNestedValue(context, variable.path)
        break
      case 'input':
        value = inputValues ? getNestedValue(inputValues, variable.path) : undefined
        break
      case 'env':
        value = envValues ? envValues[variable.path] : undefined
        break
    }

    if (value === undefined) {
      missingVariables.push(`{{${variable.type}.${variable.path}}}`)
    }
  }

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  }
}
