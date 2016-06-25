import * as vscode from 'vscode';

export class GoTo {

    constructor() {
    }

    public goToTypeAtPoint(clientInstance: any, textBuffer: vscode.TextEditor, bufferPosition: vscode.Position): void {

        const offset: number = textBuffer.selection.active.character;

        clientInstance.getSymbolAtPoint(textBuffer.document.uri.path, offset, (msg) => {
            const pos = msg.declPos;
            //# Sometimes no pos
            if (pos) {
                this.goToPosition(pos);
            }
            else {
                //atom.notifications.addError("No declPos in response from Ensime server, cannot go anywhere :(")
                vscode.window.showErrorMessage("No declPos in response from Ensime server, cannot go anywhere :(");
            }
        });
    }

    public goToPosition(pos: any): void {
        if (pos.typehint == "LineSourcePosition") {
            vscode.workspace.openTextDocument(pos.file).then((editor: vscode.TextDocument) => {
                editor.lineAt(parseInt(pos.line));
            });
            //atom.workspace.open(pos.file, {pending: true}).then (editor) -> editor.setCursorBufferPosition([parseInt(pos.line), 0])
        }
        else {
            vscode.workspace.openTextDocument(pos.file).then((editor: vscode.TextDocument) => {
                const targetEditorPos = editor.positionAt(parseInt(pos.line));
                editor.offsetAt(targetEditorPos);
            });
            // atom.workspace.open(pos.file, {pending: true}).then (editor) -> {
            //     targetEditorPos = editor.getBuffer().positionForCharacterIndex(parseInt(pos.offset))
            //     editor.setCursorBufferPosition(targetEditorPos)
            // }
        }
    }
}