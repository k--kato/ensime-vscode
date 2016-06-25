'use strict';
import * as vscode from 'vscode';

import {Ensime} from './ensime';

let ensime: Ensime;

export function activate(context: vscode.ExtensionContext) {

    const ensime: Ensime = new Ensime(context);

    const startEnsime = vscode.commands.registerCommand('ensime.startEnsime', () => {
        ensime.start();
    });

    const goToDefinitionOfCursor = vscode.commands.registerCommand('ensime.goToDefinitionOfCursor', () => {
        ensime.goToDefinitionOfCursor();
    });

    context.subscriptions.push(ensime);
    context.subscriptions.push(startEnsime);
    context.subscriptions.push(goToDefinitionOfCursor);

}
