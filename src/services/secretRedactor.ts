export interface RedactionResult {
  redactedText: string;
  detectedSecrets: string[];
}

export class SecretRedactor {
  private static readonly PATTERNS: { type: string; regex: RegExp; replaceWith: string }[] = [
    {
      type: 'AWS Access Key',
      regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
      replaceWith: '[REDACTED_AWS_KEY]'
    },
    {
      type: 'OpenAI API Key',
      regex: /sk-(?:live|test|proj)?[a-zA-Z0-9_-]{20,}/g,
      replaceWith: '[REDACTED_OPENAI_KEY]'
    },
    {
      type: 'Google / Gemini API Key',
      regex: /AIzaSy[A-Za-z0-9_-]{33}/g,
      replaceWith: '[REDACTED_GEMINI_KEY]'
    },
    {
      type: 'GitHub Token',
      regex: /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}/g,
      replaceWith: '[REDACTED_GITHUB_TOKEN]'
    },
    {
      type: 'JWT Token',
      regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
      replaceWith: '[REDACTED_JWT]'
    },
    {
      type: 'Bearer Token',
      regex: /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
      replaceWith: 'Bearer [REDACTED_BEARER_TOKEN]'
    },
    {
      type: 'Private Key',
      regex: /-----BEGIN(?:[A-Z ]+)?PRIVATE KEY-----[\\s\\S]*?-----END(?:[A-Z ]+)?PRIVATE KEY-----/g,
      replaceWith: '[REDACTED_PRIVATE_KEY]'
    },
    {
      type: 'Database Connection String',
      regex: /(?:postgres|postgresql|mongodb|mongodb\+srv|mysql|redis):\/\/[^\s"'`]+/gi,
      replaceWith: '[REDACTED_DB_URL]'
    },
    {
      type: 'Password In Config',
      regex: /(["']?(?:password|passwd|secret|api_key|token)["']?\s*[:=]\s*["'])([^"'\s]{4,})(["'])/gi,
      replaceWith: '$1[REDACTED]$3'
    }
  ];

  public static redact(text: string): RedactionResult {
    if (!text) {
      return { redactedText: '', detectedSecrets: [] };
    }

    let result = text;
    const detected: Set<string> = new Set();

    for (const pattern of this.PATTERNS) {
      if (pattern.regex.test(result)) {
        detected.add(pattern.type);
        result = result.replace(pattern.regex, pattern.replaceWith);
      }
    }

    return {
      redactedText: result,
      detectedSecrets: Array.from(detected)
    };
  }

  public static hasSecrets(text: string): boolean {
    if (!text) return false;
    return this.PATTERNS.some((p) => {
      p.regex.lastIndex = 0;
      return p.regex.test(text);
    });
  }
}
