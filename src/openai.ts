/**
 * OpenAI integration for code analysis and rule generation
 */

import OpenAI from 'openai';
import { readFile } from 'node:fs/promises';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Explain code using OpenAI
 */
export async function explainCode(filePath: string, language?: string): Promise<string> {
  const code = await readFile(filePath, 'utf-8');

  const prompt = `Explain the following code in ${language || 'English'}. Focus on:
1. What the code does
2. Key patterns and techniques used
3. Potential issues or improvements
4. Best practices demonstrated

Code:
\`\`\`
${code}
\`\`\``;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a code analysis expert. Provide clear, concise explanations of code.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || 'No explanation generated.';
}

/**
 * Generate ast-grep rule using OpenAI
 */
export async function generateRule(description: string, ruleId: string): Promise<{
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  language: string;
  rule: unknown;
  fix?: string;
}> {
  const prompt = `Generate an ast-grep rule for the following description:

"${description}"

Rule ID: ${ruleId}

Provide the rule in YAML format with these fields:
- id: rule identifier
- message: human-readable description of the issue
- severity: one of error, warning, info, hint
- language: programming language (typescript, javascript, etc.)
- rule: the ast-grep rule pattern
- fix (optional): suggested fix

Example rule structure:
\`\`\`yaml
id: no-console
message: Avoid using console.log in production code
severity: warning
language: typescript
rule:
  pattern: console.log($$$ARGS)
  fix: // TODO: Remove console.log
\`\`\``;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at creating ast-grep rules for code analysis. Generate accurate, useful rules.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content || '';

  // Extract YAML from response
  const yamlMatch = content.match(/```yaml\n([\s\S]*?)```/) || content.match(/```\n([\s\S]*?)```/);
  const yamlContent = yamlMatch ? yamlMatch[1] : content;

  // Parse the YAML content (simplified parsing)
  const lines = yamlContent.split('\n');
  const rule: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let yamlLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('id:')) {
      rule.id = line.replace('id:', '').trim();
    } else if (line.startsWith('message:')) {
      rule.message = line.replace('message:', '').trim();
    } else if (line.startsWith('severity:')) {
      rule.severity = line.replace('severity:', '').trim() as 'error' | 'warning' | 'info' | 'hint';
    } else if (line.startsWith('language:')) {
      rule.language = line.replace('language:', '').trim();
    } else if (line.startsWith('rule:')) {
      currentKey = 'rule';
      yamlLines = [];
    } else if (line.startsWith('fix:')) {
      if (currentKey === 'rule' && yamlLines.length > 0) {
        // Parse accumulated rule YAML
        rule.rule = parseYamlLines(yamlLines);
      }
      currentKey = 'fix';
      rule.fix = line.replace('fix:', '').trim();
    } else if (currentKey === 'rule' && line.startsWith('  ')) {
      yamlLines.push(line.slice(2));
    }
  }

  if (currentKey === 'rule' && yamlLines.length > 0) {
    rule.rule = parseYamlLines(yamlLines);
  }

  return {
    id: (rule.id as string) || ruleId,
    message: (rule.message as string) || description,
    severity: (rule.severity as 'error' | 'warning' | 'info' | 'hint') || 'warning',
    language: (rule.language as string) || 'typescript',
    rule: rule.rule || { pattern: description },
    fix: rule.fix as string | undefined,
  };
}

/**
 * Simple YAML line parser
 */
function parseYamlLines(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get OpenAI configuration status
 */
export function getOpenAIStatus(): { configured: boolean; message: string } {
  if (isOpenAIConfigured()) {
    return { configured: true, message: 'OpenAI API key is configured' };
  }
  return {
    configured: false,
    message: 'OpenAI API key not found. Set OPENAI_API_KEY environment variable.',
  };
}

/**
 * Get suggestions for fixing code issues
 */
export async function getFixSuggestions(code: string, issue: string): Promise<string> {
  const prompt = `Given this code with the issue "${issue}", suggest how to fix it:

Code:
\`\`\`
${code}
\`\`\`

Provide a clear fix suggestion.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a code review expert. Provide specific, actionable fix suggestions.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || 'No suggestions available.';
}
