/**
 * CLI command handlers and output formatters
 */

import type { ScanResult, ListOptions, ScanCommandOptions, FixCommandOptions, ExplainCommandOptions, WriteCommandOptions } from './types';
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
import { explainCode, generateRule, getOpenAIStatus } from './openai';
import { writeFile } from 'node:fs/promises';

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
        const severityColor = getSeverityColor(rule.severity);
        console.log(`  ${colors.cyan(rule.id)} - ${rule.message} (${severityColor(rule.severity)})`);
      }
      console.log(colors.gray(`\nTotal: ${rules.length} rules`));
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
    
    console.log(colors.bold('Categories:'));
    for (const category of categories) {
      console.log(`  ${colors.cyan(category.name)} - ${category.description} (${colors.yellow(String(category.rules.length))} rules)`);
    }
    const totalRules = categories.reduce((sum, c) => sum + c.rules.length, 0);
    console.log(colors.gray(`\nTotal: ${categories.length} categories, ${totalRules} rules`));
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

/**
 * Handle explain command - explain code using OpenAI
 */
export async function handleExplainCommand(
  filePath: string,
  options: ExplainCommandOptions
): Promise<void> {
  try {
    const status = getOpenAIStatus();
    if (!status.configured) {
      console.error(colors.red('Error: ' + status.message));
      console.log(colors.gray('\nTo use explain command:'));
      console.log(colors.gray('  export OPENAI_API_KEY=your_api_key'));
      process.exit(1);
    }

    console.log(colors.bold(`Analyzing ${filePath}...`));
    const explanation = await explainCode(filePath, options.language);

    if (options.json) {
      console.log(JSON.stringify({ file: filePath, explanation }, null, 2));
    } else {
      console.log();
      console.log(colors.bold('Explanation:'));
      console.log(colors.gray('─'.repeat(60)));
      console.log(explanation);
      console.log(colors.gray('─'.repeat(60)));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle write command - generate rule using OpenAI
 */
export async function handleWriteCommand(options: WriteCommandOptions): Promise<void> {
  try {
    const status = getOpenAIStatus();
    if (!status.configured) {
      console.error(colors.red('Error: ' + status.message));
      console.log(colors.gray('\nTo use write command:'));
      console.log(colors.gray('  export OPENAI_API_KEY=your_api_key'));
      process.exit(1);
    }

    if (!options.description) {
      console.error(colors.red('Error: --description is required'));
      console.log(colors.gray('Example: agr write --description "Detect console.log usage" --rule no-console'));
      process.exit(1);
    }

    const ruleId = options.rule || `rule-${Date.now()}`;
    console.log(colors.bold(`Generating rule "${ruleId}"...`));

    const rule = await generateRule(options.description, ruleId);

    // Format as YAML
    const yamlContent = `id: ${rule.id}
message: ${rule.message}
severity: ${rule.severity}
language: ${rule.language}
rule:
  pattern: ${JSON.stringify(rule.rule)}
${rule.fix ? `fix: ${rule.fix}` : ''}`;

    if (options.preview) {
      console.log();
      console.log(colors.bold('Generated Rule (Preview):'));
      console.log(colors.gray('─'.repeat(60)));
      console.log(yamlContent);
      console.log(colors.gray('─'.repeat(60)));
    } else {
      const outputPath = options.output || `rules/${ruleId}.yml`;
      await writeFile(outputPath, yamlContent, 'utf-8');
      console.log(colors.green(`✓ Rule saved to ${outputPath}`));
    }

    console.log(colors.gray(`\nRule details:`));
    console.log(`  ID: ${colors.cyan(rule.id)}`);
    console.log(`  Message: ${rule.message}`);
    console.log(`  Severity: ${colors.yellow(rule.severity)}`);
    console.log(`  Language: ${colors.cyan(rule.language)}`);
  } catch (error) {
    handleError(error);
  }
}
