/**
 * Core types for the ast-grep CLI tool
 */

export interface Rule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable message describing the issue */
  message: string;
  /** Severity level of the issue */
  severity: 'error' | 'warning' | 'info' | 'hint';
  /** Programming language this rule applies to */
  language: string;
  /** AST-grep rule configuration */
  rule: unknown;
  /** Optional fix suggestion */
  fix?: string;
  /** File patterns this rule applies to */
  files?: string[];
}

export interface RuleCategory {
  /** Category name */
  name: string;
  /** Category description */
  description: string;
  /** Rules in this category */
  rules: Rule[];
}

export interface ScanResult {
  /** File path where issue was found */
  file: string;
  /** Line number (0-based) */
  line: number;
  /** Column number (0-based) */
  column: number;
  /** ID of the rule that triggered */
  ruleId: string;
  /** Issue message */
  message: string;
  /** Severity level */
  severity: string;
  /** Optional fix suggestion */
  fix?: string;
}

export interface ScanOptions {
  /** Paths to scan */
  paths: string[];
  /** Specific rule IDs to run */
  rules?: string[];
  /** Categories to include */
  categories?: string[];
  /** Whether to apply fixes */
  fix?: boolean;
  /** Output format */
  json?: boolean;
}

export interface CliOptions {
  /** Enable interactive mode */
  interactive?: boolean;
  /** Path to config file */
  config?: string;
  /** Enable verbose output */
  verbose?: boolean;
}

export interface ListOptions {
  /** Filter by category */
  category?: string;
  /** Output as JSON */
  json?: boolean;
}

export interface ScanCommandOptions {
  /** Specific rule IDs to run */
  rules?: string[];
  /** Run rules from specific category */
  category?: string;
  /** Output as JSON */
  json?: boolean;
  /** Minimum severity level */
  severity?: string;
}

export interface FixCommandOptions {
  /** Specific rule IDs to run */
  rules?: string[];
  /** Run rules from specific category */
  category?: string;
  /** Show what would be fixed without making changes */
  dryRun?: boolean;
}
