'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ensimeClient = require("ensime-client")
import * as isScalaSource from './utils'
import logapi = require("loglevel")
let parseDotEnsime = ensimeClient.dotEnsimeUtils.parseDontEnsime

let InstanceManager = ensimeClient.InstanceManager
let Instance = ensimeClient.Instance

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    //Get console log level from workspace settings (or user settings)
    let logLevel = vscode.workspace.getConfiguration('Ensime.logLevel').toString()
    
    logapi.getLogger('ensime.client').setLevel(logLevel)
    logapi.getLogger('ensime.server-update').setLevel(logLevel)
    logapi.getLogger('ensime.startup').setLevel(logLevel)
    logapi.getLogger('ensime.autocomplete-plus-provider').setLevel(logLevel)
    logapi.getLogger('ensime.refactorings').setLevel(logLevel)
    log = logapi.getLogger('ensime.main')
    log.setLevel(logLevel)
    
    //TODO: Install Dependencies if not there (Pretty sure this isn't possible in VSCode)
    
    this.subscriptions = []
    
    this.showTypesControllers = new WeakMap
    this.implicitControllers = new WeakMap
    this.autotypecheckControllers = new WeakMap

    this.instanceManager = new InstanceManager

    this.addCommandsForStoppedState()
    this.someInstanceStarted = false
    
    //TODO: ShowTypes hover handler
    //TODO: ImportSuggestison
    //clientLookup = (editor) => this.clientOfEditor(editor)
    //this.autocompletePlusProvider = new AutocompletePlusProvider(clientLookup)
  
    //this.importSuggestions = new ImportSuggestions()
    //this.refactorings = new Refactorings

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "ensime-vscode" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
        console.log(ensimeClient)
        console.log("Please show ensime")
        //vscode.window.showInformationMessage(ensime)
    });
    
    let startCommand = vscode.commands.registerCommand('extension.start', () => {
        console.log("TODO: Make this function start ensime")
    })

    context.subscriptions.push(disposable);
}

/*function observeEditor(editor : vscode.TextEditor) {
    if (isScalaSource.isScalaSource(editor))
    {
        let instanceLookup = () => this.instanceManager.instanceOfFile(editor.document.fileName)
        let clientLookup = () => instanceLookup()?.client
        if(vscode.workspace.getConfiguration('Ensime.enableTypeTooltip'))
        {
            if (!this.showTypesControllers.get(editor))
            {
                this.showTypesControllers.set(editor, new ShowTypes(editor, clientLookup))
            } 
        }
        if (!this.implicitControllers.get(editor))
        {
            this.implicitControllers.set(editor, new Implicits(editor, instanceLookup))
        }
        if (this.autotypecheckControllers.get(editor))
        {
            this.autotypecheckControllers.set(editor, new AutoTypecheck(editor, clientLookup))
        }

        this.subscriptions.pushback (editor.(() =>
            this.deleteControllers(editor)
        )
    }
}*/

// this method is called when your extension is deactivated
export function deactivate() {
}

function startInstance(dotEnsimePath : string) {
    //Add stuff with implicit info view (see ensime-atom source)
    let dotEnsime = parseDotEnsime(dotEnsimePath)
    //TODO: Typechecking
    //TODO: Status bar
    startClient(dotEnsime, /*this.statusbarOutput(statusbarView, typechecking)*/, (client) => {
        vscode.window.showInformationMessage('Hello World!');
        
        //TODO: vscode specific ui state of an instance
        
        let instance = new Instance(dotEnsime, client, /* ui */)
        this.instanceManager.registerInstance(instance)
        
        if(!this.activeInstance)
        {
            this.activeInstance = instance
        }
        
        client.post({ "typehint" : "ConnectionInfoReq" }, (msg) => {})
        
        this.switchToInstance(instance)
    })
}