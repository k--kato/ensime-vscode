import * as vscode from 'vscode';
import * as path from 'path'
import * as process from 'process'
import * as which from 'which'
import * as dialog from 'dialog'

export function isScalaSource(editor : vscode.TextEditor) {
    return (path.extname(editor.document.fileName) in ['.scala'])
}

export function withSbt(callback, globalState : vscode.Memento) {
    let configName = 'Ensime.sbtExec'
    let sbtCmd = vscode.workspace.getConfiguration(configName).toString() || globalState.get(configName)
    
    if(sbtCmd)
    {
        callback(sbtCmd)
    }
    else
    {
        //First check PATH
        which('sbt', (er, path) => {
            if(er)
            {
                //Finally, make user manually get find sbtExec
                dialog.showOpenDialog({
                    title: "We need you to point out your SBT executive",
                    properties:['openFile']
                }, (filenames) => {
                    sbtCmd = filenames[0]
                    globalState.update(configName, sbtCmd)
                    callback(sbtCmd)
                })
                
            }
            else
            {
                globalState.update(configName, path)
                callback(path)
            }
        })
        
    }
}


export function mkClasspathFilename(context : vscode.ExtensionContext, scalaVersion, ensimeServerVersion) {
    return path.join(context.extensionPath, `classpath_${scalaVersion}_${ensimeServerVersion}`)
}

export function mkAssemblyJarFilename(context : vscode.ExtensionContext, scalaEdition, ensimeServerVersion) {
    return path.join(
        context.extensionPath,
        "ensime_#{scalaEdition}-#{ensimeServerVersion}-assembly.jar")
}

export function packageDir(context : vscode.ExtensionContext) {
  let packageDir = context.extensionPath
  log.trace('packageDir: ' + packageDir)
  return packageDir
}