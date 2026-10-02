import { PromptAnalysis, PromptCategory } from '../types/usage';
import { PromptClassifier } from './promptClassifier';
import { SecretRedactor } from '../services/secretRedactor';

export class PromptAnalyzer {
  public static analyze(rawPrompt: string): PromptAnalysis {
    const trimmed = (rawPrompt || '').trim();
    const { redactedText, detectedSecrets } = SecretRedactor.redact(trimmed);
    const category = PromptClassifier.classify(trimmed);

    if (!trimmed) {
      return {
        score: 0,
        dimensionScores: {
          clarity: 0,
          context: 0,
          requirements: 0,
          constraints: 0,
          expectedOutput: 0,
          acceptanceCriteria: 0,
          scope: 0
        },
        missingItems: ['Prompt is empty'],
        strengths: [],
        suggestions: ['Enter a prompt describing the task, context, and requirements.'],
        category: 'Other',
        isVague: true,
        redactedPrompt: '',
        detectedSecrets: []
      };
    }

    const lower = trimmed.toLowerCase();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Clarity (max 20)
    let clarity = 0;
    const actionVerbs = /\b(create|build|implement|fix|refactor|update|add|remove|delete|inspect|analyze|test|write|generate|explain|compare)\b/i;
    if (actionVerbs.test(trimmed)) clarity += 8;
    if (wordCount >= 6) clarity += 6;
    const vaguePatterns = /^(fix this|help|not working|broken|do it|error|please fix|why)$/i;
    const isVague = vaguePatterns.test(trimmed) || wordCount < 4;
    if (!isVague) clarity += 6;

    // 2. Context (max 15)
    let context = 0;
    const techPattern = /\b(typescript|javascript|python|java|go|rust|c\+\+|react|vue|angular|node|express|fastapi|docker|sql|postgres|mongodb|html|css|tailwind|api|sdk)\b/i;
    if (techPattern.test(trimmed)) context += 5;
    const fileCodePattern = /([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]{1,4}|`[^`]+`|\bfunction\b|\bclass\b|\bconst\b|\binterface\b)/i;
    if (fileCodePattern.test(trimmed)) context += 5;
    const statePattern = /\b(currently|existing|when|because|scenario|environment|version|previously)\b/i;
    if (statePattern.test(trimmed)) context += 5;

    // 3. Requirements (max 15)
    let requirements = 0;
    const hasList = /(^|\n)\s*([-*•\d\.]|\d+\))\s+/m.test(trimmed);
    const reqKeywords = /\b(must|should|need to|require|requirements|ensure|support|handle)\b/i;
    if (hasList) requirements += 8;
    if (reqKeywords.test(trimmed)) requirements += 7;

    // 4. Constraints (max 15)
    let constraints = 0;
    const constraintKeywords = /\b(do not|without|avoid|preserve|backward compatible|performance|limit|max|only|keep|strictly|never)\b/i;
    if (constraintKeywords.test(trimmed)) constraints += 15;
    else if (wordCount > 30) constraints += 5;

    // 5. Expected output (max 15)
    let expectedOutput = 0;
    const outputKeywords = /\b(expected|return|output|format|produce|result|generate|diff|json|markdown|table|file)\b/i;
    if (outputKeywords.test(trimmed)) expectedOutput += 15;
    else if (wordCount > 25) expectedOutput += 5;

    // 6. Acceptance criteria (max 10)
    let acceptanceCriteria = 0;
    const acKeywords = /\b(acceptance criteria|verify|tests? pass|test coverage|validation|benchmark|check that|assert)\b/i;
    if (acKeywords.test(trimmed)) acceptanceCriteria += 10;

    // 7. Scope (max 10)
    let scope = 0;
    const scopeKeywords = /\b(in file|in component|in module|within|specifically|only in|single file|this function)\b/i;
    if (scopeKeywords.test(trimmed)) {
      scope += 10;
    } else if (wordCount < 120 && wordCount > 8) {
      scope += 7;
    } else {
      scope += 4;
    }

    const totalScore = Math.min(
      100,
      clarity + context + requirements + constraints + expectedOutput + acceptanceCriteria + scope
    );

    const missingItems: string[] = [];
    const suggestions: string[] = [];
    const strengths: string[] = [];

    if (clarity >= 14) strengths.push('Clear objective and action verb');
    else {
      missingItems.push('Actionable clarity');
      suggestions.push('Specify the exact action verb (e.g. "Implement", "Refactor", "Debug").');
    }

    if (context >= 10) strengths.push('Good technical context or code references');
    else {
      missingItems.push('Technical context or code references');
      suggestions.push('Mention relevant file names, languages, frameworks, or error stack traces.');
    }

    if (requirements >= 10) strengths.push('Structured requirements');
    else {
      missingItems.push('Explicit requirements');
      suggestions.push('List explicit requirements or breakdown with bullet points.');
    }

    if (constraints >= 10) strengths.push('Explicit constraints defined');
    else {
      missingItems.push('Constraints');
      suggestions.push('Add constraints (e.g., "Do not change API contract", "Keep backward compatibility").');
    }

    if (expectedOutput >= 10) strengths.push('Specified expected output');
    else {
      missingItems.push('Expected output structure');
      suggestions.push('Specify what the assistant should produce (e.g., code diff, tests, explanation).');
    }

    if (acceptanceCriteria >= 8) strengths.push('Defined acceptance criteria');
    else {
      missingItems.push('Acceptance criteria');
      suggestions.push('Define how success is verified (e.g., "Unit tests pass", "No lint errors").');
    }

    return {
      score: totalScore,
      dimensionScores: {
        clarity,
        context,
        requirements,
        constraints,
        expectedOutput,
        acceptanceCriteria,
        scope
      },
      missingItems,
      strengths,
      suggestions,
      category,
      isVague,
      redactedPrompt: redactedText,
      detectedSecrets
    };
  }
}
