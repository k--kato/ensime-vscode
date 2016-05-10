import * as vscode from "vscode"
import * as path from "path"
let updateLog = require('loglevel').getLogger('ensime.server-update')
let packageDir = (require('./utils')).packageDir

function getPidLogger() {
  let serverUpdateLog = vscode.window.createOutputChannel("ensime-server-update-log")

  return (pid) => {
    pid.stdout.on('data', (chunk) => serverUpdateLog.appendLine(chunk.toString('utf8')))
    pid.stderr.on('data', (chunk) => serverUpdateLog.appendLine(chunk.toString('utf8')))
  }
}

function failure(msg, code) {
  updateLog.error(msg, code)
  vscode.window.showErrorMessage(msg)
}


export function getEnsimeServerUpdate(context : vscode.ExtensionContext) {
  let tempdir = packageDir(context) + path.sep + "ensime_update_coursier"
  return (require ('ensime-client')).ensimeServerUpdate(tempdir, getPidLogger, failure)
}