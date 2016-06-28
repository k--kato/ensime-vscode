import * as vscode from 'vscode'

const HOVER_NONE = "<none>"

interface ISymbolClient {
    getSymbolAtPoint(path : string, offset : number, callback : (msg : any) => any)
}

export function registerTypeHoverProvider(client : ISymbolClient) : vscode.HoverProvider {
    return {
        provideHover(document, position, token) {
            let p = new Promise<vscode.Hover>((resolve, reject) => {
                client.getSymbolAtPoint(document.fileName, document.offsetAt(position), (msg) => {
                    if(msg.type.fullName != HOVER_NONE)
                    {
                        resolve(new vscode.Hover(msg.type.fullName))
                    }
                    else
                    {
                        reject(msg.type.fullName)
                    }
                })
            })
            return p
        }
    }
}