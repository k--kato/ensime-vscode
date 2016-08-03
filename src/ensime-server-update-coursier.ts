import * as vscode from "vscode"
import * as path from "path"
let updateLog = require('loglevel').getLogger('ensime.server-update')
import { packageDir} from './utils'
import {ensimeServerUpdate} from 'ensime-client'

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

export const updateEnsimeServerWithCoursier = ensimeServerUpdate(path.join(packageDir(), "ensime_update_coursier"), failure)