import * as vscode from 'vscode';
import * as path from 'path'

export function isScalaSource(editor : vscode.TextEditor) {
    return (path.extname(editor.document.fileName) in ['.scala'])
}