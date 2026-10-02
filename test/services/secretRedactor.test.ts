import { describe, it, expect } from 'vitest';
import { SecretRedactor } from '../../src/services/secretRedactor';

describe('SecretRedactor', () => {
  it('should redact OpenAI API keys', () => {
    const input = 'Use key sk-proj-1234567890abcdef1234567890 for API calls';
    const result = SecretRedactor.redact(input);
    expect(result.redactedText).toContain('[REDACTED_OPENAI_KEY]');
    expect(result.redactedText).not.toContain('sk-proj-1234567890abcdef1234567890');
    expect(result.detectedSecrets).toContain('OpenAI API Key');
  });

  it('should redact AWS Access Keys', () => {
    const input = 'My key is AKIAIOSFODNN7EXAMPLE in us-east-1';
    const result = SecretRedactor.redact(input);
    expect(result.redactedText).toContain('[REDACTED_AWS_KEY]');
    expect(result.detectedSecrets).toContain('AWS Access Key');
  });

  it('should redact Bearer tokens and JWTs', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
    const result = SecretRedactor.redact(input);
    expect(result.redactedText).toContain('[REDACTED_JWT]');
    expect(result.detectedSecrets).toContain('JWT Token');
  });

  it('should leave safe text unchanged', () => {
    const input = 'Please refactor the user controller to add pagination';
    const result = SecretRedactor.redact(input);
    expect(result.redactedText).toBe(input);
    expect(result.detectedSecrets.length).toBe(0);
  });
});
