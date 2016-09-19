import * as vscode from 'vscode'
import {InstanceManager} from '../extension'
import {serverProtocol} from 'ensime-client'
import logapi = require("loglevel")

const log = logapi.getLogger('ensime.definitions')

export function definitionsProvider(instanceManager: InstanceManager) : vscode.DefinitionProvider {

    const provider : vscode.DefinitionProvider = {

       provideDefinition(document: vscode.TextDocument, 
            position: vscode.Position,
            token: vscode.CancellationToken) : Thenable<vscode.Definition> {
           log.debug('provideDefinition called for ', document.fileName)
           const instance = instanceManager.instanceOfFile(document.fileName)
           if (!instance) {
               return new Promise((r, _) => r([]))
           }
           return instance.api.getSymbolAtPoint(document.fileName, document.offsetAt(position)).then((symbol) => {
               const pos = symbol.declPos
               // TODO: Gotta be a smarter way in ts to do this, at least localise in client code
               if(pos.typehint == 'OffsetSourcePosition') {
                   const offsetPos = <serverProtocol.OffsetSourcePosition> pos
                   const uri = vscode.Uri.file(offsetPos.file)
                   const openedDoc = vscode.workspace.textDocuments.find(doc => doc.fileName == offsetPos.file);
                   if (openedDoc) {
                       const pos = openedDoc.positionAt(offsetPos.offset)
                       return new vscode.Location(uri, pos);
                   } else {
                       return vscode.workspace.openTextDocument(uri).then(definitionDoc => {
                           vscode.window.showTextDocument(definitionDoc)
                           const pos = definitionDoc.positionAt(offsetPos.offset)
                           return new vscode.Location(uri, pos);
                       });
                   }
               } else if(pos.typehint == 'LineSourcePosition') {
                   const linePos = <serverProtocol.LineSourcePosition> pos
                   return new vscode.Location(vscode.Uri.file(linePos.file), new vscode.Position(linePos.line, 0))
               }
           });
        }
    };

    log.debug('registering definitions provider: ', provider)
    return provider
}