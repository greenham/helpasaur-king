/**
 * Normalizes a single tag for consistency and URL safety
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters except hyphens
 * - Collapses multiple hyphens to single
 * - Removes leading/trailing hyphens
 */
export const normalizeTag = (tag: string): string => {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Normalizes an array of tags, removing duplicates and empty values
 * @param tags - Array of tags to normalize (may contain null/undefined)
 * @returns Array of normalized, unique tags
 */
export const normalizeTags = (tags?: (string | null | undefined)[]): string[] => {
  if (!tags || !Array.isArray(tags)) return []

  const normalized = tags
    .filter((tag): tag is string => tag !== null && tag !== undefined && typeof tag === 'string')
    .map(tag => normalizeTag(tag))
    .filter(tag => tag.length > 0)

  // Remove duplicates using Set
  return [...new Set(normalized)]
}