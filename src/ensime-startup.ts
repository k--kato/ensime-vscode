//Download and startup ensime server
import * as vscode from "vscode"
let fs = require("fs")
let path = require("path")
import logapi = require("loglevel")
import {fileUtils, DotEnsime, ensimeServerUpdate, dotEnsimeUtils, startServerFromFile, startServerFromAssemblyJar, clientStarterFromServerStarter} from 'ensime-client'

const log = logapi.getLogger('ensime.startup')

let utils = require('./utils')
let packageDir = utils.packageDir, withSbt = utils.withSbt, mkClasspathFilename = utils.mkClasspathFilename, mkAssemblyJarFilename = utils.mkAssemblyJarFilename

let updateServer = ensimeServerUpdate
let parseDotEnsime = dotEnsimeUtils.parseDotEnsime

import {updateEnsimeServerWithCoursier} from './ensime-server-update-coursier'

let startupLog = require('loglevel').getLogger('ensime.startup')

function classpathFileOk(cpF) {
    if (~fs.existsSync(cpF)) {
        return false
    } else {
        let cpFStats = fs.statSync(cpF)
        let fine = cpFStats.isFile && cpFStats.ctime > fs.statSync(path.join(packageDir(), 'package.json')).mtime
        if (!fine) {
            fs.unlinkSync(cpF)
        }
        return fine
    }
}

// Start ensime server. If classpath file is out of date, make an update first
function startEnsimeServer(parsedDotEnsime: DotEnsime) {
    log.debug('starting Ensime server for', parsedDotEnsime.rootDir)
    vscode.window.showInformationMessage("Starting Ensime server")
    if (!fs.existsSync(parsedDotEnsime.cacheDir)) {
        fs.mkdirSync(parsedDotEnsime.cacheDir)
    }

    const ensimeConfig = vscode.workspace.getConfiguration('Ensime')
    const ensimeServerVersion = ensimeConfig.get('ensimeServerVersion').toString()

    const ensimeServerFlags = ensimeConfig.get('ensimeServerFlags').toString()
    const assemblyJar = mkAssemblyJarFilename(parsedDotEnsime.scalaEdition, ensimeServerVersion)

    if(fs.existsSync(assemblyJar)) {
        log.debug('starting from assemblyJar')
        return startServerFromAssemblyJar(assemblyJar, parsedDotEnsime, ensimeServerFlags)
    } else {
        log.debug('starting from classpath file (coursier)')
        let cpF = mkClasspathFilename(parsedDotEnsime.scalaVersion, ensimeServerVersion)
        const startFromCPFile = () => startServerFromFile(cpF, parsedDotEnsime, ensimeServerFlags)
    
        if(!classpathFileOk(cpF)) {
            log.debug('No classpath file found matching versions, creating with coursier')
            return fileUtils.ensureExists(packageDir()).then((packageDir) => {
                const p = updateEnsimeServerWithCoursier(parsedDotEnsime, ensimeServerVersion, cpF)
                return p.then(
                    (thang) => {
                        log.debug('got thang', thang, 'starting from cp file')
                        return startFromCPFile();
                    },
                    (failure) => {
                        log.error(failure)
                    }
                    )
            });
        } else {
            log.debug('classpath file ok, using')
            return startFromCPFile()
        }
    }
}


export const startClient = clientStarterFromServerStarter(startEnsimeServer)
