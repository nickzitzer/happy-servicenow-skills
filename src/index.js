/**
 * Happy ServiceNow AI Skills
 * Platform-agnostic AI skills library for ServiceNow
 *
 * @author Happy Technologies LLC
 * @license MIT
 */

export { SkillLoader } from './loader.js';
export { SkillRegistry } from './registry.js';
export { SkillValidator } from './validator.js';

// Re-export skill categories for convenience
export const CATEGORIES = {
  ITSM: 'itsm',
  CMDB: 'cmdb',
  ADMIN: 'admin',
  CATALOG: 'catalog',
  SECURITY: 'security',
  REPORTING: 'reporting'
};

// Supported platforms
export const PLATFORMS = {
  CLAUDE_CODE: 'claude-code',
  CLAUDE_DESKTOP: 'claude-desktop',
  CHATGPT: 'chatgpt',
  CURSOR: 'cursor',
  CUSTOM: 'any'
};

// Default export for convenience
export default {
  SkillLoader: (await import('./loader.js')).SkillLoader,
  SkillRegistry: (await import('./registry.js')).SkillRegistry,
  CATEGORIES,
  PLATFORMS
};
