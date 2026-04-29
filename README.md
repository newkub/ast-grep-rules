# AST Grep CLI Tool

CLI tool for managing and running ast-grep rules with AI-powered rule generation and code explanation capabilities.

## Why

Traditional linting tools often miss structural code issues that require AST analysis. This tool provides:
- **AST-based pattern matching** for precise code structure detection
- **AI-powered rule generation** for custom linting rules
- **Code explanation** using OpenAI for better understanding
- **Extensible rule system** with categorized rules
- **TypeScript-first** implementation with full type safety

## Key Concept

AST Grep uses Abstract Syntax Tree analysis to match code patterns rather than text, enabling more precise and context-aware linting rules that understand code structure.

## Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Pattern Matching** | AST-based rule matching with YAML configuration | More precise than regex, understands code structure |
| **AI Rule Generation** | Generate rules using natural language descriptions | Faster rule creation, no AST knowledge required |
| **Code Explanation** | AI-powered code analysis and explanation | Better code understanding and documentation |
| **Multiple Commands** | scan, fix, list, categories, explain, write | Complete workflow for code analysis |
| **JSON Output** | All commands support JSON output | Easy integration with CI/CD pipelines |
| **Severity Filtering** | Filter results by severity levels | Focus on critical issues first |
| **Category Organization** | Rules organized by category (nouse, typescript) | Better rule management and discovery |

## Installation

```json
// package.json
{
  "scripts": {
    "build": "bunup",
    "dev": "bun run src/index.ts",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "test": "bun test",
    "verify": "bun run typecheck && bun run lint && bun run test"
  }
}
```

```bash
# Terminal commands
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run verification (typecheck + lint + test)
bun run verify
```

## Usage

### Basic Commands

```bash
# List all available rules
ast-grep list

# List rules by category
ast-grep list --category nouse

# Scan current directory
ast-grep scan

# Scan specific paths
ast-grep scan src/ tests/

# Run specific rules
ast-grep scan --rules impl-todo,no-mock

# Filter by severity
ast-grep scan --severity warning

# Output as JSON
ast-grep scan --json
```

### AI Features (requires OPENAI_API_KEY)

```bash
# Explain code file
ast-grep explain src/index.ts

# Generate new rule
ast-grep write --description "Detect console.log usage" --rule no-console

# Preview rule without writing
ast-grep write --description "Find unused imports" --preview
```

### Rule Categories

```bash
# List all categories
ast-grep categories

# Available categories:
# - nouse: Rules for code quality and best practices
# - typescript: TypeScript-specific configuration rules
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Optional (for AI commands) |

### Rule Structure

Rules are defined in YAML format in the `rules/` directory:

```yaml
# Example rule structure
id: impl-todo
message: TODO comment found. Address the pending task or convert to an issue tracker.
severity: warning
language: typescript
rule:
  kind: comment
  regex: 'TODO|FIXME|HACK|XXX'
```

### Severity Levels

- `error`: Critical issues that must be fixed
- `warning`: Important issues that should be addressed
- `info`: Suggestions for improvement
- `hint`: Minor style suggestions

## Reference

### CLI Reference

| Command | Description | Benefit |
|---------|-------------|---------|
| `list` | List available rules | Discover available linting rules |
| `scan [paths...]` | Scan code for issues | Find code quality problems |
| `fix [paths...]` | Scan and automatically fix issues | Auto-fix common problems |
| `categories` | List rule categories | Understand rule organization |
| `explain <file>` | Explain code using AI | Get AI-powered code analysis |
| `write` | Generate ast-grep rule using AI | Create custom rules easily |

### Available Rules

| ID | Category | Severity | Description |
|----|----------|----------|-------------|
| `impl-todo` | nouse | warning | Detects TODO, FIXME, HACK, and XXX comments |
| `no-mock` | nouse | warning | Detects usage of MOCK-related identifiers |
| `no-tsignore` | nouse | warning | Detects usage of @ts-ignore comments |
| `nuxt-tsconfig-references` | typescript | error | Ensures Nuxt tsconfig.json includes all required references |

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

**Key points:**
- Commercial use allowed
- Modification allowed
- Distribution allowed
- Private use allowed
- Liability disclaimer
- Warranty disclaimer
