#!/usr/bin/env node
import { cac } from 'cac';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Import split modules
import { handleListCommand, handleScanCommand, handleFixCommand, handleCategoriesCommand, handleExplainCommand, handleWriteCommand } from './commands';
import { loadRules } from './rules';
import { scan } from './scanner';
import { colors } from './utils';
import type { Rule, RuleCategory, ScanResult } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI setup
async function main() {
  try {
    const packageJson = JSON.parse(
      await readFile(join(__dirname, '../package.json'), 'utf-8')
    );

    const cli = cac('ast-grep-cli');

    cli
      .version(packageJson.version)
      .option('-v, --verbose', 'Enable verbose output')
      .help();

    cli
      .command('list', 'List all available rules')
      .option('-c, --category <category>', 'Filter by category')
      .option('-j, --json', 'Output as JSON')
      .action(async (options: { category?: string; json?: boolean }) => {
        await handleListCommand(options);
      });

    cli
      .command('scan [paths...]', 'Scan code for issues')
      .option('-r, --rules <rules...>', 'Rule IDs to run')
      .option('-c, --category <category>', 'Run rules from specific category')
      .option('-j, --json', 'Output as JSON')
      .option('--severity <level>', 'Minimum severity level', { default: 'info' })
      .action(async (paths: string[], options: { rules?: string[]; category?: string; json?: boolean; severity?: string }) => {
        // Default to current directory if no paths provided
        const targetPaths = paths && paths.length > 0 ? paths : ['.'];
        await handleScanCommand(targetPaths, options);
      });

    cli
      .command('fix [paths...]', 'Scan and automatically fix issues')
      .option('-r, --rules <rules...>', 'Rule IDs to run')
      .option('-c, --category <category>', 'Run rules from specific category')
      .option('-d, --dry-run', 'Show what would be fixed without making changes')
      .action(async (paths: string[], options: { rules?: string[]; category?: string; dryRun?: boolean }) => {
        // Default to current directory if no paths provided
        const targetPaths = paths && paths.length > 0 ? paths : ['.'];
        await handleFixCommand(targetPaths, options);
      });

    cli
      .command('categories', 'List all rule categories')
      .action(async () => {
        await handleCategoriesCommand();
      });

    cli
      .command('explain <file>', 'Explain code using AI')
      .option('-j, --json', 'Output as JSON')
      .option('-l, --language <lang>', 'Language for explanation', { default: 'English' })
      .action(async (file: string, options: { json?: boolean; language?: string }) => {
        await handleExplainCommand(file, options);
      });

    cli
      .command('write', 'Generate ast-grep rule using AI')
      .option('-r, --rule <id>', 'Rule ID')
      .option('-d, --description <desc>', 'Description of the rule to create')
      .option('-o, --output <path>', 'Output file path')
      .option('-p, --preview', 'Preview without writing')
      .action(async (options: { rule?: string; description?: string; output?: string; preview?: boolean }) => {
        await handleWriteCommand(options);
      });

    cli.parse();

    // Show help if no command was matched
    if (!cli.matchedCommand && !process.argv.slice(2).includes('--help') && !process.argv.slice(2).includes('-h') && !process.argv.slice(2).includes('-v') && !process.argv.slice(2).includes('--version')) {
      cli.outputHelp();
    }
  } catch (error) {
    console.error(colors.red(`CLI Error: ${error}`));
    process.exit(1);
  }
}

// Export for testing
export { loadRules, scan };
export type { Rule, RuleCategory, ScanResult };

// Run CLI if this file is executed directly
main().catch((error) => {
  console.error(colors.red(`Fatal error: ${error}`));
  process.exit(1);
});
