# AST Grep Rules

Collection of AST-based linting rules for TypeScript codebases using [ast-grep](https://ast-grep.github.io/).

## Available Rules

| File              | ID          | Severity | Description                                 |
| ----------------- | ----------- | -------- | ------------------------------------------- |
| `impl-todo.yml`   | impl-todo   | warning  | Detects TODO, FIXME, HACK, and XXX comments |
| `no-mock.yml`     | no-mock     | warning  | Detects usage of MOCK-related identifiers   |
| `no-tsignore.yml` | no-tsignore | warning  | Detects usage of @ts-ignore comments        |
