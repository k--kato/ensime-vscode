import * as vscode from 'vscode'

let diagnosticCollection = vscode.languages.createDiagnosticCollection("ensime-scala")
var diagnosticMap = {}
let documentMap : { [fileNamestring : string] : vscode.TextDocument} = {}

interface Note {
    file : string
    msg : string
    severity : any
    beg : number
    end : number
    line : number
    col : number
}

interface NoteMsg {
    notes : Note[]
}

export function register(client) : vscode.Disposable {
    vscode.workspace.textDocuments
        .filter((d) => d.languageId == "scala")
        .map((d) => documentMap[d.uri.fsPath] = d)

    client.post({"typehint": "TypecheckAllReq"});

    return vscode.workspace.onDidSaveTextDocument((document) => {
        documentMap[document.fileName] = document;
        client.typecheckFile(document.fileName)/*.then((msg) => {
            if(msg.typehint == "NewScalaNotesEvent")
            {
                addNotes(msg)
            }
            else if(msg.typehint == "ClearScalaNotesEvent")
            {
                clearNotes()
            }
            test
        }, (err) => console.log(err))*/
    })
}

export function addNotes(msg : NoteMsg) {

    for(var i = 0; i < msg.notes.length; i++)
    {
        let note = msg.notes[i]
        if(note.file.includes("rep-src"))
        {
            continue
        }
        diagnosticMap[note.file] = (diagnosticMap[note.file] || []).concat(noteToDiag(note).get() || [])
    }

    for (var file in diagnosticMap) {
        if (diagnosticMap.hasOwnProperty(file)) {
            var diagnostics = diagnosticMap[file];
            let uri = vscode.Uri.file(file)
            diagnosticCollection.set(uri, diagnostics)
        }
    }
}

export function clearNotes() {
    diagnosticCollection.clear()
    diagnosticMap = {}
}

function groupBy(arr : Array<any>, fn : (item : any) => any) : Map<any, Array<any>> {
    return arr.reduce((dict, item) => {
        let k = fn(item);
        (dict[k] = dict[k] || []).push(item)
    })
}

function noteSeverityToDiagSeverity(note : Note) {
    switch (note.severity.typehint) {
        case "NoteError":return vscode.DiagnosticSeverity.Error
        case "NoteWarn": return vscode.DiagnosticSeverity.Warning
        default: return vscode.DiagnosticSeverity.Information
    }
}

function noteToDiag(note : Note) : Option<vscode.Diagnostic> {
    console.log(note)
    let doc : vscode.TextDocument = documentMap[vscode.Uri.file(note.file).fsPath]

    if(!doc)
    {
        return Option.none
    }
    else
    {
        let start = doc.positionAt(note.beg)
        let end = doc.positionAt(note.end)

        let val = new vscode.Diagnostic(
            new vscode.Range(
                start,
                end
                //new vscode.Position(note.line - 1, note.col - 1 - (note.end - note.beg)),
                //new vscode.Position(note.line - 1, note.col - 1)
            ),
            note.msg,
            noteSeverityToDiagSeverity(note)
        )
        return new Option(val)
    }
}

class Option<T> {
    private value : T
    private isEmpty : boolean

    static none = new Option(null)

    constructor(val : T) {
        this.value = val;
        this.isEmpty = (val == null)
    }

    map<U>(func : (val : T) => U) {
        if(this.isEmpty)
        {
            return Option.none
        }
        else {
            return new Option(func(this.value))
        }
    }

    get() {
        return this.value;
    }
}