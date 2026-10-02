import { PromptCategory } from '../types/usage';

export class PromptClassifier {
  private static readonly RULES: { category: PromptCategory; keywords: RegExp }[] = [
    {
      category: 'Database',
      keywords: /\b(sql|postgres|postgresql|mongodb|mongo|sqlite|mysql|prisma|drizzle|database|table|query|schema|migration|indexes|foreign key)\b/i
    },
    {
      category: 'Debugging',
      keywords: /\b(fix|bug|error|exception|crash|failed|failing|broken|issue|undefined|nullpointer|traceback|syntaxerror|cannot read|infinite loop)\b/i
    },
    {
      category: 'Testing',
      keywords: /\b(test|tests|testing|unit test|integration test|mock|stub|fixture|vitest|jest|pytest|assert|coverage)\b/i
    },
    {
      category: 'Refactoring',
      keywords: /\b(refactor|cleanup|clean up|extract method|extract class|simplify|reorganize|rename|decouple|modernize|dead code)\b/i
    },
    {
      category: 'Code Review',
      keywords: /\b(review|audit|code review|smell|critique|check this code|security check|vulnerability scan)\b/i
    },
    {
      category: 'Architecture',
      keywords: /\b(architecture|system design|scalability|microservice|monolith|hexagonal|clean architecture|component structure|pattern)\b/i
    },
    {
      category: 'DevOps',
      keywords: /\b(docker|dockerfile|kubernetes|k8s|ci\/cd|pipeline|github actions|deploy|deployment|aws|gcp|azure|terraform|nginx)\b/i
    },
    {
      category: 'Documentation',
      keywords: /\b(document|documentation|readme|docstring|jsdoc|api docs|changelog|comments)\b/i
    },
    {
      category: 'Planning',
      keywords: /\b(plan|roadmap|breakdown|sprint|milestone|checklist|estimate|strategy)\b/i
    },
    {
      category: 'Learning',
      keywords: /\b(how does|why does|explain concept|teach me|tutorial|what is the difference|how to use)\b/i
    },
    {
      category: 'Research',
      keywords: /\b(research|find library|compare libraries|alternative to|benchmark|evaluate|pros and cons)\b/i
    },
    {
      category: 'Development',
      keywords: /\b(create|build|implement|develop|add feature|generate|write function|code|scaffold|endpoint|ui|page)\b/i
    }
  ];

  public static classify(prompt: string): PromptCategory {
    if (!prompt || prompt.trim().length === 0) {
      return 'Other';
    }

    const cleanPrompt = prompt.toLowerCase();
    for (const rule of this.RULES) {
      if (rule.keywords.test(cleanPrompt)) {
        return rule.category;
      }
    }

    return 'Other';
  }
}
