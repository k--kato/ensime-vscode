import * as vscode from 'vscode'
import {InstanceManager} from '../extension'
import {serverProtocol} from 'ensime-client'

export function definitionsProvider(instanceManager: InstanceManager) : vscode.DefinitionProvider {
    return {
       provideDefinition(document: vscode.TextDocument, 
            position: vscode.Position,
            token: vscode.CancellationToken) : Thenable<vscode.Definition> {
           const instance = instanceManager.instanceOfFile(document.fileName)
           return instance.api.getSymbolAtPoint(document.fileName, document.offsetAt(position)).then((symbol) => {
               const pos = symbol.declPos
               // TODO: Gotta be a smarter way in ts to do this, at least localise in client code
               if(pos.typehint == 'OffsetSourcePosition') {
                   const offsetPos = <serverProtocol.OffsetSourcePosition> pos
                   // TODO: How to we resolve a character offset into a row,col position before we have the buffer?
                   const uri = vscode.Uri.file(offsetPos.file)
                   return new vscode.Location(uri, new vscode.Position(offsetPos.row-1, offsetPos.col))
               } else if(pos.typehint == 'LineSourcePosition') {
                   const linePos = <serverProtocol.LineSourcePosition> pos
                   return new vscode.Location(vscode.Uri.file(linePos.file), new vscode.Position(linePos.line, 0))
               }
           });
        }
    };
}