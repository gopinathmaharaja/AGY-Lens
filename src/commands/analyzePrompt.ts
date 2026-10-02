import * as vscode from 'vscode';
import { PromptAnalyzer } from '../analytics/promptAnalyzer';

export async function analyzePromptCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  let text = editor?.document.getText(editor.selection).trim();

  if (!text) {
    text = await vscode.window.showInputBox({
      prompt: 'Enter prompt to evaluate with Prompt Quality Engine',
      placeHolder: 'e.g. Implement authentication middleware for Node.js Express service'
    });
  }

  if (!text) return;

  const result = PromptAnalyzer.analyze(text);
  const scoreMsg = `Prompt Score: ${result.score}/100 (${result.category})`;
  const detail =
    result.missingItems.length > 0
      ? `\nMissing: ${result.missingItems.join(', ')}`
      : '\nGreat job! Well-structured prompt with clear context and constraints.';

  const action = await vscode.window.showInformationMessage(
    `${scoreMsg}${detail}`,
    'Improve Prompt',
    'Open Dashboard'
  );

  if (action === 'Improve Prompt') {
    vscode.commands.executeCommand('antigravity.improvePrompt', text);
  } else if (action === 'Open Dashboard') {
    vscode.commands.executeCommand('antigravity.openDashboard');
  }
}
