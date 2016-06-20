'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ensimeClient = require("ensime-client")
let startClient = require("./ensime-startup").startClient
import * as isScalaSource from './utils'
import logapi = require("loglevel")
import dialog = require("dialog")
let parseDotEnsime = ensimeClient.dotEnsimeUtils.parseDontEnsime
let dotEnsimesFilter, allDotEnsimesInPaths = ensimeClient.dotEnsimeUtils.dotEnsimesFilter, ensimeClient.dotEnsimeUtils.allDotEnsimesInPaths

let InstanceManager = ensimeClient.InstanceManager
let Instance = ensimeClient.Instance

export var instanceManager

export var activeInstance

var mainLog

var typeHover

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    //Get console log level from workspace settings (or user settings)
    let logLevel = vscode.workspace.getConfiguration('Ensime').logLevel.toString()

    logapi.getLogger('ensime.client').setLevel(logLevel)
    logapi.getLogger('ensime.server-update').setLevel(logLevel)
    logapi.getLogger('ensime.startup').setLevel(logLevel)
    logapi.getLogger('ensime.autocomplete-plus-provider').setLevel(logLevel)
    logapi.getLogger('ensime.refactorings').setLevel(logLevel)

    mainLog = logapi.getLogger('ensime.main')
    mainLog.setLevel(logLevel)

    //TODO: Install Dependencies if not there (Pretty sure this isn't possible in VSCode)

    this.subscriptions = []

    this.showTypesControllers = new WeakMap
    this.implicitControllers = new WeakMap
    this.autotypecheckControllers = new WeakMap

    instanceManager = new InstanceManager

    //this.addCommandsForStoppedState()
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
        dialog.info("This should work")
        //vscode.window.showInformationMessage(ensime)
    });

    let startCommand = vscode.commands.registerCommand('extension.start', () => {
        console.log("Attempting to start ENSIME")
        selectAndBootAnEnsime()
    })

    context.subscriptions.push(disposable);
    context.subscriptions.push(startCommand)


function statusbarOutput(statusbarItem, typechecking) {
    return (msg) => {
        let typehint = msg.typehint

        if(typehint == 'AnalyzerReadyEvent')
        {
            statusbarItem.setText('Analyzer ready!')
        }

        else if(typehint == 'FullTypeCheckCompleteEvent')
        {
            statusbarItem.setText('Full typecheck finished!')
        }

        else if(typehint == 'IndexerReadyEvent')
        {
            statusbarItem.setText('Indexer ready!')
        }

        else if(typehint == 'CompilerRestartedEvent')
        {
            statusbarItem.setText('Compiler restarted!')
        }

        else if(typehint == 'ClearAllScalaNotesEvent')
        {
            //TODO: Implement
            //typechecking?.clearScalaNotes()
        }

        else if(typehint == 'NewScalaNotesEvent')
        {
            //TODO: Implement
            //typechecking?.addScalaNotes(msg)
        }

        else if(typehint.startsWith('SendBackgroundMessageEvent'))
        {
            statusbarItem.setText(msg.detail)
        }
    }
}

function startInstance(dotEnsimePath) {
    console.log("startInstance")
    //# Register model-view mappings
    //@subscriptions.add atom.views.addViewProvider ImplicitInfo, (implicitInfo) ->
      //result = new ImplicitInfoView().initialize(implicitInfo)
      //result


    //# remove start command and add others
    //@stoppedCommands.dispose()

    //# FIXME: - we have had double commands for each instance :) This is a quick and dirty fix
    //if(not @someInstanceStarted)
      //@addCommandsForStartedState()
      //@someInstanceStarted = true
    console.log(dotEnsimePath)
    let dotEnsime = ensimeClient.dotEnsimeUtils.parseDotEnsime(dotEnsimePath)

    let typechecking = undefined
    //if(indieLinterRegistry)
    {
      //let typechecking = TypeCheckingFeature(@indieLinterRegistry.register("Ensime: #{dotEnsimePath}"))
    }

    //TODO: Implement the vscode equivalent of this
    //statusbarView = new StatusbarView()
    //statusbarView.init()
    let statusbarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
    //statusbarItem.destroy = statusbarItem.dispose

    startClient(dotEnsime, statusbarOutput(statusbarItem, typechecking), (client) => {
      vscode.window.showInformationMessage("Ensime connected!")

      typeHover = vscode.languages.registerHoverProvider('scala', {
        provideHover(document, position, token) {
            var p = new Promise<vscode.Hover>((resolve, reject) => {
                client.getSymbolAtPoint(document.fileName, document.offsetAt(position), (msg) => {
                    resolve(new vscode.Hover(msg.type.fullName))
                })
            })
            return p
        }
    });


      //# atom specific ui state of an instance
      let ui = null //TODO: Implement the vscode equivalent of this
      /*let ui = {
        "statusbarView" : statusbarView,
        "typechecking" : typechecking,
        destroy : () => {
          //statusbarView.destroy()
          //typechecking?.destroy()
        }
      }*/

      let instance = new Instance(dotEnsime, client, ui)

      instanceManager.registerInstance(instance)

      if (!activeInstance)
      {
        activeInstance = instance
      }

      client.post({"typehint":"ConnectionInfoReq"}, (msg) => {})

      switchToInstance(instance)
    })
}
function selectDotEnsime(callback, filterMethod = (dotEnsime) => true) {
    let dirs = [vscode.workspace.rootPath]

    console.log("selectDotEnsime")
    let dotEnsimeUris = vscode.workspace.findFiles("**/.ensime", "node_modules", 10)
    console.log(dotEnsimeUris)
    let toString = (uris: vscode.Uri[]) => uris.map((uri) => uri.fsPath)
    dotEnsimeUris.then((uris) => {
      if(!uris) {
          vscode.window.showErrorMessage("You are not in a workspace. Please open a project before using ENSIME.")
          return
      }

      let dotEnsimes = toString(uris)

      let filteredDotEnsime = dotEnsimes.filter(filterMethod)

      if(filteredDotEnsime.length == 0)
      {
        vscode.window.showErrorMessage("No .ensime file found. Please generate with `sbt gen-ensime` or similar")
      }
      else if (filteredDotEnsime.length == 1)
      {
        console.log("callback")
        console.log(filteredDotEnsime)
        callback(filteredDotEnsime[0])
      }
      else
      {
          vscode.window.showQuickPick(filteredDotEnsime
          ).then((item) => callback(item))
      }
    })
}

function selectAndBootAnEnsime() {
    console.log("selectAndBootAnEnsime ")
    console.log(this)
    selectDotEnsime(
      (selectedDotEnsime) => startInstance(selectedDotEnsime),
      (dotEnsime) => { return !instanceManager.isStarted(dotEnsime) }
    )
}

function switchToInstance(instance) {
  mainLog.trace(['changed from ', activeInstance, ' to ', instance])
  if(instance != activeInstance)
  {
    activeInstance = instance

    if(instance)
    {
        //instance.ui.statusbarView.show()
    }
  }
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
}
// this method is called when your extension is deactivated
export function deactivate() {
}