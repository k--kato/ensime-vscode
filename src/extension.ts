'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ensimeClient from 'ensime-client'
let { dotEnsimesFilter, allDotEnsimesInPaths, parseDotEnsime} = ensimeClient.dotEnsimeUtils
import { startClient } from './ensime-startup'
import * as isScalaSource from './utils'
import logapi = require("loglevel")
import dialog = require("dialog")

import * as TypeCheck from './features/typecheck'
import * as TypeHoverProvider from './features/typehoverprovider'

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
    let logLevel = vscode.workspace.getConfiguration('Ensime').get("logLevel", "trace").toString()

    logapi.getLogger('ensime.client').setLevel(logLevel)
    logapi.getLogger('ensime.server-update').setLevel(logLevel)
    logapi.getLogger('ensime.startup').setLevel(logLevel)
    logapi.getLogger('ensime.autocomplete-plus-provider').setLevel(logLevel)
    logapi.getLogger('ensime.refactorings').setLevel(logLevel)

    mainLog = logapi.getLogger('ensime.main')
    mainLog.setLevel(logLevel)

    //TODO: Install Dependencies if not there (Pretty sure this isn't possible in VSCode)

    this.subscriptions = []

    instanceManager = new InstanceManager

    this.someInstanceStarted = false

    //TODO: ImportSuggestison
    //TODO: Refactorings
    //TODO: Autocomplete Provider
    //TODO: Implicit Info
    //TODO: Add Commands for started and stopped state

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "ensime-vscode" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let startCommand = vscode.commands.registerCommand('extension.start', () => {
        console.log("Attempting to start ENSIME")
        selectAndBootAnEnsime()
    })

    context.subscriptions.push(startCommand)
}

//TODO: Move message handling into a separate method with calls to a status bar handler when necessary
function statusbarOutput(statusbarItem, typechecking) {
    return (msg) => {
        let typehint = msg.typehint

        if(typehint == 'AnalyzerReadyEvent')
        {
            statusbarItem.text = 'Analyzer ready!'
        }

        else if(typehint == 'FullTypeCheckCompleteEvent')
        {
            statusbarItem.text = 'Full typecheck finished!'
        }

        else if(typehint == 'IndexerReadyEvent')
        {
            statusbarItem.text = 'Indexer ready!'
        }

        else if(typehint == 'CompilerRestartedEvent')
        {
            statusbarItem.text = 'Compiler restarted!'
        }

        else if(typehint == 'ClearAllScalaNotesEvent')
        {
            TypeCheck.clearNotes()
        }

        else if(typehint == 'NewScalaNotesEvent')
        {
            TypeCheck.addNotes(msg)
        }

        else if(typehint.startsWith('SendBackgroundMessageEvent'))
        {
            statusbarItem.text = msg.detail
        }
    }
}

function startInstance(dotEnsimePath) {


    //TODO: remove start command and add others

    //# FIXME: - we have had double commands for each instance :) This is a quick and dirty fix
    // Mocuto: In the atom version, why are started commands being added here rather than in the startClient callback?
    //if(not @someInstanceStarted)
      //@addCommandsForStartedState()
      //@someInstanceStarted = true

    let dotEnsime = ensimeClient.dotEnsimeUtils.parseDotEnsime(dotEnsimePath)

    let typechecking = undefined

    let statusbarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
    statusbarItem.text = "ENSIME"
    statusbarItem.show()

    startClient(dotEnsime, statusbarOutput(statusbarItem, typechecking), (client) => {
        //TODO: Add commands for started state here

        vscode.window.showInformationMessage("Ensime connected!")
        TypeCheck.register(client)
        let hoverProvider = TypeHoverProvider.registerTypeHoverProvider(client)
        typeHover = vscode.languages.registerHoverProvider('scala', hoverProvider);

        let instance = new Instance(dotEnsime, client, null)

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

    let dotEnsimeUris = vscode.workspace.findFiles("**/.ensime", "node_modules", 10)

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
        callback(filteredDotEnsime[0])
      }
      else
      {
          vscode.window.showQuickPick(filteredDotEnsime).then((item) => callback(item))
      }
    })
}

function selectAndBootAnEnsime() {
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

// this method is called when your extension is deactivated
export function deactivate() {
    if(instanceManager)
    {
        instanceManager.destroyAll()
    }
    if(typeHover)
    {
        typeHover.dispose()
    }
    //@subscriptions.dispose()
    //@controlSubscription.dispose()

    //@autocompletePlusProvider?.dispose()
 //@autocompletePlusProvider = null

}