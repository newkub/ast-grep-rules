/**
 * File scanning and rule matching functionality
 */

import { findInFiles, Lang } from '@ast-grep/napi';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Rule, ScanResult } from './types';
import { languageMap, supportedExtensions, globToRegex } from './utils';

/**
 * Scan files for rule violations
 */
export async function scan(paths: string[], rules: Rule[]): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const path of paths) {
    try {
      const files = await getFilesRecursive(path);
      
      for (const file of files) {
        const scanResults = await scanFile(file, rules);
        results.push(...scanResults);
      }
    } catch (error) {
      console.warn(`Failed to scan path ${path}:`, error);
    }
  }

  return results;
}

/**
 * Scan a single file with all rules
 */
export async function scanFile(file: string, rules: Rule[]): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const ext = getFileExtension(file);
  const lang = languageMap[ext];
  
  if (!lang) {
    return results;
  }

  for (const rule of rules) {
    if (shouldSkipRule(rule, file)) {
      continue;
    }

    try {
      const ruleResults = await applyRule(file, lang, rule);
      results.push(...ruleResults);
    } catch (error) {
      console.warn(`Failed to apply rule ${rule.id} to file ${file}:`, error);
    }
  }

  return results;
}

/**
 * Apply a single rule to a file
 */
async function applyRule(
  file: string, 
  lang: Lang, 
  rule: Rule
): Promise<ScanResult[]> {
  return new Promise((resolve) => {
    findInFiles(
      lang,
      {
        paths: [file],
        matcher: { rule: rule.rule as Record<string, unknown> },
      },
      (err, nodes) => {
        if (err || !nodes) {
          resolve([]);
          return;
        }

        const results: ScanResult[] = [];
        
        for (const node of nodes) {
          const range = node.range();
          results.push({
            file,
            line: range.start.line,
            column: range.start.column,
            ruleId: rule.id,
            message: rule.message,
            severity: rule.severity,
            fix: rule.fix,
          });
        }

        resolve(results);
      }
    );
  });
}

/**
 * Get all files recursively from a directory
 */
async function getFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other common ignore directories
        if (shouldSkipDirectory(entry.name)) {
          continue;
        }
        files.push(...await getFilesRecursive(fullPath));
      } else if (entry.isFile() && isSupportedFile(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory can't be read, skip it
  }

  return files;
}

/**
 * Check if a file should be skipped based on rule patterns
 */
function shouldSkipRule(rule: Rule, file: string): boolean {
  if (!rule.files || rule.files.length === 0) {
    return false;
  }
  
  return rule.files.some((pattern) => {
    const regex = globToRegex(pattern);
    return regex.test(file);
  });
}

/**
 * Check if a directory should be skipped
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    'node_modules',
    '.git',
    '.next',
    '.nuxt',
    'dist',
    'build',
    'coverage',
    '.vscode',
    '.idea',
  ];
  
  return skipDirs.includes(dirName) || dirName.startsWith('.');
}

/**
 * Check if a file is supported for scanning
 */
function isSupportedFile(fileName: string): boolean {
  return supportedExtensions.some((ext) => fileName.endsWith(ext));
}

/**
 * Get file extension from file path
 */
function getFileExtension(file: string): string {
  const parts = file.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Group scan results by file
 */
export function groupResultsByFile(results: ScanResult[]): Record<string, ScanResult[]> {
  return results.reduce((acc, result) => {
    acc[result.file] = acc[result.file] || [];
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, ScanResult[]>);
}

/**
 * Filter results by severity
 */
export function filterResultsBySeverity(
  results: ScanResult[], 
  minSeverity: string = 'info'
): ScanResult[] {
  const severityOrder = ['hint', 'info', 'warning', 'error'];
  const minIndex = severityOrder.indexOf(minSeverity);
  
  if (minIndex === -1) {
    return results;
  }
  
  return results.filter((result) => {
    const index = severityOrder.indexOf(result.severity);
    return index >= minIndex;
  });
}
