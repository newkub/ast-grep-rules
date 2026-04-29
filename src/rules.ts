/**
 * Rule loading and management functionality
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import type { Rule, RuleCategory } from './types';
import { defaultCategories, getCategoryDescription } from './utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RULES_DIR = join(__dirname, '../rules');

/**
 * Load all rule categories from the filesystem
 */
export async function loadRules(): Promise<RuleCategory[]> {
  const categories: RuleCategory[] = [];

  for (const dir of defaultCategories) {
    const category = await loadCategory(dir);
    if (category) {
      categories.push(category);
    }
  }

  return categories;
}

/**
 * Load a specific rule category
 */
export async function loadCategory(categoryName: string): Promise<RuleCategory | null> {
  const categoryPath = join(RULES_DIR, categoryName);
  
  try {
    const allFiles = await readdir(categoryPath);
    const ruleFiles = allFiles.filter((f) => f.endsWith('.yml'));

    if (ruleFiles.length === 0) {
      return null;
    }

    const rules: Rule[] = [];
    
    for (const file of ruleFiles) {
      try {
        const content = await readFile(join(categoryPath, file), 'utf-8');
        const rule = parse(content) as Rule;
        
        // Validate rule structure
        if (isValidRule(rule)) {
          rules.push(rule);
        } else {
          console.warn(`Invalid rule in file: ${file}`);
        }
      } catch (error) {
        console.warn(`Failed to parse rule file ${file}:`, error);
      }
    }

    if (rules.length === 0) {
      return null;
    }

    return {
      name: categoryName,
      description: getCategoryDescription(categoryName),
      rules,
    };
  } catch (error) {
    // Directory doesn't exist or can't be read
    return null;
  }
}

/**
 * Load a specific rule by ID
 */
export async function loadRuleById(id: string): Promise<Rule | null> {
  const categories = await loadRules();
  
  for (const category of categories) {
    const rule = category.rules.find((r) => r.id === id);
    if (rule) {
      return rule;
    }
  }
  
  return null;
}

/**
 * Get all available rule IDs
 */
export async function getAllRuleIds(): Promise<string[]> {
  const categories = await loadRules();
  return categories.flatMap((c) => c.rules.map((r) => r.id));
}

/**
 * Filter rules by category
 */
export function filterRulesByCategory(
  categories: RuleCategory[], 
  categoryName?: string
): Rule[] {
  if (!categoryName) {
    return categories.flatMap((c) => c.rules);
  }
  
  const category = categories.find((c) => c.name === categoryName);
  return category ? category.rules : [];
}

/**
 * Filter rules by specific rule IDs
 */
export function filterRulesByIds(rules: Rule[], ruleIds?: string[]): Rule[] {
  if (!ruleIds || ruleIds.length === 0) {
    return rules;
  }
  
  return rules.filter((r) => ruleIds.includes(r.id));
}

/**
 * Validate rule structure
 */
function isValidRule(rule: unknown): rule is Rule {
  if (!rule || typeof rule !== 'object') {
    return false;
  }
  
  const r = rule as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.message === 'string' &&
    typeof r.severity === 'string' &&
    ['error', 'warning', 'info', 'hint'].includes(r.severity) &&
    typeof r.language === 'string' &&
    r.rule !== undefined
  );
}
