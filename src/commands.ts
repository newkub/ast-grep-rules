/**
 * CLI command handlers and output formatters
 */

import type { ScanResult, ListOptions, ScanCommandOptions, FixCommandOptions } from './types';
import { 
  colors, 
  getSeverityColor, 
  handleError
} from './utils';
import { 
  loadRules, 
  filterRulesByCategory, 
  filterRulesByIds 
} from './rules';
import { scan, filterResultsBySeverity } from './scanner';

/**
 * Handle list command - display available rules
 */
export async function handleListCommand(options: ListOptions): Promise<void> {
  try {
    const categories = await loadRules();
    let rules = filterRulesByCategory(categories, options.category);

    if (options.category && rules.length === 0) {
      console.error(colors.red(`Category not found: ${options.category}`));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(rules, null, 2));
    } else {
      console.log(colors.bold('Available Rules:'));
      for (const rule of rules) {
        console.log(`  ${colors.cyan(rule.id)} - ${rule.message} (${colors.yellow(rule.severity)})`);
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle scan command - scan files for issues
 */
export async function handleScanCommand(
  paths: string[], 
  options: ScanCommandOptions
): Promise<void> {
  try {
    const categories = await loadRules();
    let rules = filterRulesByCategory(categories, options.category);

    if (options.category && rules.length === 0) {
      console.error(colors.red(`Category not found: ${options.category}`));
      process.exit(1);
    }

    rules = filterRulesByIds(rules, options.rules);

    if (rules.length === 0) {
      console.log(colors.yellow('No rules to run'));
      return;
    }

    console.log(colors.bold(`Scanning ${paths.length} path(s) with ${rules.length} rule(s)...`));
    
    const results = await scan(paths, rules);
    const filteredResults = filterResultsBySeverity(results, options.severity);
    
    const success = await displayScanResults(filteredResults, options);
    
    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle fix command - scan and fix issues
 */
export async function handleFixCommand(
  paths: string[], 
  options: FixCommandOptions
): Promise<void> {
  try {
    const categories = await loadRules();
    let rules = filterRulesByCategory(categories, options.category);

    if (options.category && rules.length === 0) {
      console.error(colors.red(`Category not found: ${options.category}`));
      process.exit(1);
    }

    rules = filterRulesByIds(rules, options.rules);

    if (rules.length === 0) {
      console.log(colors.yellow('No rules to run'));
      return;
    }

    console.log(colors.bold(`Scanning ${paths.length} path(s) with ${rules.length} rule(s)...`));
    
    const results = await scan(paths, rules);
    const fixableResults = results.filter((r) => r.fix);
    
    console.log(colors.yellow('Fix functionality not implemented yet'));
    await displayFixResults(fixableResults, 0, fixableResults.length, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle categories command - list available categories
 */
export async function handleCategoriesCommand(): Promise<void> {
  try {
    const categories = await loadRules();
    
    console.log(colors.bold('Available Categories:'));
    for (const category of categories) {
      console.log(`  ${colors.cyan(category.name)} - ${category.description} (${category.rules.length} rules)`);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Display scan results
 */
async function displayScanResults(
  results: ScanResult[], 
  options: ScanCommandOptions
): Promise<boolean> {
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return results.length === 0;
  }

  if (results.length === 0) {
    console.log(colors.green('No issues found!'));
    return true;
  }

  console.log(colors.bold(`Found ${results.length} issues:`));
  
  // Group by file for better organization
  const resultsByFile = results.reduce((acc, result) => {
    acc[result.file] = acc[result.file] || [];
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, ScanResult[]>);

  for (const [file, fileResults] of Object.entries(resultsByFile)) {
    console.log(`\n${colors.underline(file)}:`);
    
    for (const result of fileResults) {
      const severityColor = getSeverityColor(result.severity);
      console.log(`  ${result.line + 1}:${result.column + 1} - ${severityColor(result.message)} (${colors.gray(result.ruleId)})`);
      
      if (result.fix) {
        console.log(`    ${colors.gray('Fix available:')} ${result.fix}`);
      }
    }
  }

  // Summary
  const errorCount = results.filter(r => r.severity === 'error').length;
  const warningCount = results.filter(r => r.severity === 'warning').length;
  const infoCount = results.filter(r => r.severity === 'info').length;
  const hintCount = results.filter(r => r.severity === 'hint').length;
  
  console.log(`\n${colors.bold('Summary:')}`);
  if (errorCount > 0) console.log(`  ${colors.red(`${errorCount} errors`)}`);
  if (warningCount > 0) console.log(`  ${colors.yellow(`${warningCount} warnings`)}`);
  if (infoCount > 0) console.log(`  ${colors.blue(`${infoCount} info`)}`);
  if (hintCount > 0) console.log(`  ${colors.gray(`${hintCount} hints`)}`);

  return results.length === 0;
}

/**
 * Display fix results
 */
async function displayFixResults(
  results: ScanResult[], 
  fixed: number, 
  skipped: number, 
  options: FixCommandOptions
): Promise<void> {
  const action = options.dryRun ? 'would be fixed' : 'fixed';
  console.log(colors.bold(`${fixed} issues ${action}, ${skipped} skipped`));
  
  if (results.length === 0) {
    console.log(colors.green('No fixable issues found!'));
    return;
  }

  console.log(colors.bold(`Fixable issues:`));
  
  // Group by file
  const resultsByFile = results.reduce((acc, result) => {
    acc[result.file] = acc[result.file] || [];
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, ScanResult[]>);

  for (const [file, fileResults] of Object.entries(resultsByFile)) {
    console.log(`\n${colors.underline(file)}:`);
    
    for (const result of fileResults) {
      const severityColor = getSeverityColor(result.severity);
      console.log(`  ${result.line + 1}:${result.column + 1} - ${severityColor(result.message)} (${colors.gray(result.ruleId)})`);
      console.log(`    ${colors.green('Fix:')} ${result.fix}`);
    }
  }
}
