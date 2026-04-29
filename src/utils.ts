/**
 * Utility functions and constants for the ast-grep CLI tool
 */

import { Lang } from '@ast-grep/napi';

// ANSI color helpers for terminal output
export const colors = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  underline: (s: string) => `\x1b[4m${s}\x1b[0m`,
};

export type Color = keyof typeof colors;

// Language mapping for file extensions to AST-grep languages
export const languageMap: Record<string, Lang> = {
  ts: Lang.TypeScript,
  tsx: Lang.Tsx,
  js: Lang.JavaScript,
  jsx: Lang.JavaScript,
  vue: Lang.Html,
};

// Supported file extensions for scanning
export const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

// Default rule categories to scan
export const defaultCategories = ['nouse', 'typescript'];

// Category descriptions
export const categoryDescriptions: Record<string, string> = {
  nouse: 'Rules for detecting deprecated or prohibited patterns',
  typescript: 'TypeScript-specific code quality rules',
  vue: 'Vue.js component and composable rules',
  rust: 'Rust code analysis rules',
};

/**
 * Get description for a category, with fallback
 */
export function getCategoryDescription(name: string): string {
  return categoryDescriptions[name] || `${name} rules`;
}

/**
 * Convert glob pattern to regex
 */
export function globToRegex(pattern: string): RegExp {
  return new RegExp(
    pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
  );
}

/**
 * Get severity color based on severity level
 */
export function getSeverityColor(severity: string): (s: string) => string {
  switch (severity) {
    case 'error':
      return colors.red;
    case 'warning':
      return colors.yellow;
    default:
      return colors.gray;
  }
}

/**
 * Handle and format errors consistently
 */
export function handleError(error: unknown, exitCode = 1): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(colors.red(`Error: ${message}`));
  process.exit(exitCode);
}
