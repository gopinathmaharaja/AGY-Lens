import * as vscode from 'vscode';
import { PromptImprover } from '../analytics/promptImprover';

export async function improvePromptCommand(initialText?: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  let text = initialText || editor?.document.getText(editor.selection).trim();

  if (!text) {
    text = await vscode.window.showInputBox({
      prompt: 'Enter prompt to improve',
      placeHolder: 'e.g. Fix the database query error'
    });
  }

  if (!text) return;

  const improved = PromptImprover.improve(text, {
    workspaceName: vscode.workspace.name,
    activeFile: editor?.document.fileName ? vscode.workspace.asRelativePath(editor.document.fileName) : undefined,
    language: editor?.document.languageId
  });

  const doc = await vscode.workspace.openTextDocument({
    content: improved,
    language: 'markdown'
  });

  await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });

  const choice = await vscode.window.showInformationMessage(
    'Improved prompt generated. What would you like to do?',
    'Copy to Clipboard',
    'Replace Selection'
  );

  if (choice === 'Copy to Clipboard') {
    await vscode.env.clipboard.writeText(improved);
    vscode.window.showInformationMessage('Improved prompt copied to clipboard!');
  } else if (choice === 'Replace Selection' && editor && !editor.selection.isEmpty) {
    editor.edit((editBuilder) => {
      editBuilder.replace(editor.selection, improved);
    });
  }
}
