import * as vscode from 'vscode'
import {instanceManager} from '../extension'
import logapi = require("loglevel")

const log = logapi.getLogger('ensime.completions')

export function completionsProvider()  {

    const provider : vscode.CompletionItemProvider = {

		provideCompletionItems(document: vscode.TextDocument, 
                position: vscode.Position, 
                token: vscode.CancellationToken): Thenable<vscode.CompletionList> {
            log.debug('provideCompletionItems called for ', document.fileName)
            const instance = instanceManager.instanceOfFile(document.fileName)
            if(instance) {
                return instance.api.getCompletions(document.fileName, document.getText(), document.offsetAt(position), 30).then(response => {
                    log.debug('completions received: ', response.completions)
                    const completions = response.completions.map(completion => {
                        const toInsert = 
                            completion.toInsert ? completion.toInsert : completion.name
                        return new vscode.CompletionItem(toInsert)
                    })
                    return new vscode.CompletionList(completions, true)
                })
            } else {
                return new Promise((r, _) => r([]))
            }
        }

	
	}

    log.debug('registering completions provider: ', provider)
    return provider
}
