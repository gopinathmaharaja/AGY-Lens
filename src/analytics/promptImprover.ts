import { PromptAnalyzer } from './promptAnalyzer';
import { PromptCategory } from '../types/usage';

export class PromptImprover {
  public static improve(prompt: string, context?: { workspaceName?: string; activeFile?: string; language?: string }): string {
    const analysis = PromptAnalyzer.analyze(prompt);
    const category = analysis.category;
    const cleanPrompt = (prompt || '').trim();

    const techContext = context?.language
      ? ` in ${context.language}`
      : context?.activeFile
      ? ` in ${context.activeFile}`
      : '';

    let template = '';

    switch (category) {
      case 'Debugging':
        template = `Investigate and resolve the issue: "${cleanPrompt}"${techContext}

Context:
- System: ${context?.workspaceName || 'Current project'}
- Target file(s): ${context?.activeFile || 'Relevant files where error occurs'}

Requirements:
- Identify the exact root cause of the bug or failure.
- Fix the issue with the minimal, cleanest surgical change.
- Ensure existing contracts and edge cases remain intact.
- Add or update relevant automated tests to prevent regression.

Expected Output:
1. Root cause summary
2. Precise code changes with explanations
3. Verification / test commands`;
        break;

      case 'Database':
        template = `Optimize and implement the database task: "${cleanPrompt}"${techContext}

Context:
- Target database / schema in ${context?.workspaceName || 'current project'}

Requirements:
- Review the current query or schema structure.
- Ensure optimal indexing, query performance, and connection safety.
- Maintain data integrity and transaction safety where appropriate.
- Provide migrations or schema updates if needed.

Expected Output:
1. Schema / query implementation
2. Performance & indexing rationale
3. Test query or verification steps`;
        break;

      case 'Testing':
        template = `Write comprehensive tests for: "${cleanPrompt}"${techContext}

Context:
- Target module: ${context?.activeFile || 'Target component/service'}

Requirements:
- Cover happy path, edge cases, and failure scenarios.
- Follow modern testing conventions (clear assertions, proper mocking).
- Avoid brittle implementation-dependent assertions.

Expected Output:
1. Test suite code
2. List of covered test cases
3. Instructions to execute tests`;
        break;

      case 'Refactoring':
        template = `Refactor the code: "${cleanPrompt}"${techContext}

Requirements:
- Improve modularity, readability, and maintainability.
- Strictly preserve existing public APIs and external behaviors.
- Eliminate code duplication and simplify complex branches.
- Verify zero regressions with existing tests.

Expected Output:
1. Refactoring breakdown and architectural reasoning
2. Clean code diffs
3. Verification steps`;
        break;

      default:
        template = `Implement the following task: "${cleanPrompt}"${techContext}

Context:
- Project: ${context?.workspaceName || 'Current codebase'}
- Scope: ${context?.activeFile || 'Target components'}

Requirements:
- Implement clean, idiomatic code adhering to project architecture.
- Handle potential error states and input edge cases cleanly.
- Maintain backward compatibility without unnecessary dependencies.
- Include proper type definitions and inline documentation where needed.

Expected Output:
1. Step-by-step implementation summary
2. Complete code changes
3. Verification and test recommendations`;
        break;
    }

    return template;
  }
}
