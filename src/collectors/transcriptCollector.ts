import * as fs from 'fs';
import * as readline from 'readline';
import { TranscriptParser, ParsedConversation } from '../parsers/transcriptParser';

export class TranscriptCollector {
  private lineOffsets: Map<string, number> = new Map();

  public async collect(filePath: string, conversationId: string): Promise<ParsedConversation | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      const lines: string[] = [];
      for await (const line of rl) {
        if (line.trim()) {
          lines.push(line);
        }
      }

      this.lineOffsets.set(conversationId, lines.length);
      return TranscriptParser.parseAllLines(lines, conversationId);
    } catch {
      return null;
    }
  }

  public getProcessedLineCount(conversationId: string): number {
    return this.lineOffsets.get(conversationId) || 0;
  }
}
