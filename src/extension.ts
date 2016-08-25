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

import * as Completions from './features/completions'

export type InstanceManager = ensimeClient.InstanceManager<any> // Maybe need to add ui  here or maybe not
export const instanceManager = new ensimeClient.InstanceManager


export var activeInstance

var mainLog

var typeHover: vscode.Disposable
var completionsDisposable: vscode.Disposable

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
    logapi.getLogger('ensime.completions').setLevel(logLevel)
    mainLog = logapi.getLogger('ensime.main')
    mainLog.setLevel(logLevel)

    this.subscriptions = []

    
    this.someInstanceStarted = false


    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    mainLog.debug('Congratulations, your extension "ensime-vscode" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let startCommand = vscode.commands.registerCommand('ensime.start', () => {
        mainLog.debug('Attempting to start ENSIME')
        selectAndBootAnEnsime()
    })


    const stopCommand = vscode.commands.registerCommand('ensime.stop', () => {
        selectDotEnsime(
            (selectedDotEnsime) => stopInstance(selectedDotEnsime),
            (dotEnsime) => { return instanceManager.isStarted(dotEnsime) }
        );
    });


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

function startInstance(dotEnsimePath: string) {
    mainLog.debug('starting instance: ', dotEnsimePath)
    ensimeClient.dotEnsimeUtils.parseDotEnsime(dotEnsimePath).then((dotEnsime) => {
        let typechecking = undefined

        let statusbarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
        statusbarItem.text = "ENSIME"
        statusbarItem.show()

        startClient(dotEnsime, statusbarOutput(statusbarItem, typechecking)).then((connection) => {
            mainLog.debug('got a connection, creating instance')
            const instance = ensimeClient.makeInstanceOf(dotEnsime, connection, null)

            instanceManager.registerInstance(instance)
            if (! activeInstance)
            activeInstance = instance

            vscode.window.showInformationMessage("Ensime connected!")
            TypeCheck.register(instanceManager)
            const hoverProvider = TypeHoverProvider.hoverProvider(instanceManager)
            typeHover = vscode.languages.registerHoverProvider('scala', hoverProvider);
            completionsDisposable = vscode.languages.registerCompletionItemProvider('scala', Completions.completionsProvider())

           

            instanceManager.registerInstance(instance)

            if (!activeInstance)
            {
                activeInstance = instance
            }

            connection.post({"typehint":"ConnectionInfoReq"}).then( (msg) => {})

            switchToInstance(instance)
        }, (failure) => {
            mainLog.error(failure)
        })
    })
}

function stopInstance(dotEnsimePath: string) {
    ensimeClient.dotEnsimeUtils.parseDotEnsime(dotEnsimePath).then((dotEnsime) => {
        instanceManager.stopInstance(dotEnsime)
    });
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
        completionsDisposable.dispose()
    }
}