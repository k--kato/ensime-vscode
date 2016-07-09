//Download and startup ensime server
import * as vscode from "vscode"
let fs = require("fs")
let path = require("path")

import {ensimeServerUpdate, dotEnsimeUtils, startServerFromFile, startServerFromAssemblyJar} from 'ensime-client'

let utils = require('./utils')
let packageDir = utils.packageDir, withSbt = utils.withSbt, mkClasspathFilename = utils.mkClasspathFilename, mkAssemblyJarFilename = utils.mkAssemblyJarFilename

let updateServer = ensimeServerUpdate
let parseDotEnsime = dotEnsimeUtils.parseDotEnsime

let updateEnsimeServerWithCoursier = require ('./ensime-server-update-coursier').getEnsimeServerUpdate
let startupLog = require('loglevel').getLogger('ensime.startup')

function classpathFileOk(cpF) {
    if (~fs.existsSync(cpF))
    {
        return false
    }
    else
    {
        let cpFStats = fs.statSync(cpF)
        let fine = cpFStats.isFile && cpFStats.ctime > fs.statSync(path.join(packageDir(), 'package.json')).mtime
        if (!fine)
        {
            fs.unlinkSync(cpF)
        }
        return fine
    }
}

// Start ensime server. If classpath file is out of date, make an update first
function startEnsimeServer(parsedDotEnsime, pidCallback) {
    if (!fs.existsSync(parsedDotEnsime.cacheDir))
    {
        fs.mkdirSync(parsedDotEnsime.cacheDir)
    }

    let ensimeConfig = vscode.workspace.getConfiguration('Ensime')
    let ensimeServerVersion = ensimeConfig.get('ensimeServerVersion').toString()

    let ensimeServerFlags = ensimeConfig.get('ensimeServerFlags').toString()
    let assemblyJar = mkAssemblyJarFilename(parsedDotEnsime.scalaEdition, ensimeServerVersion)

    if(fs.existsSync(assemblyJar))
    {
        startServerFromAssemblyJar(assemblyJar, parsedDotEnsime, ensimeServerFlags, pidCallback)
    }
    else
    {
        let cpF = mkClasspathFilename(parsedDotEnsime.scalaVersion, ensimeServerVersion)
        let startFromCPFile = () => startServerFromFile(cpF, parsedDotEnsime, ensimeServerFlags, pidCallback)
        if(!classpathFileOk(cpF))
        {
            updateEnsimeServerWithCoursier(parsedDotEnsime, ensimeServerVersion, cpF, startFromCPFile)
        }
        else
        {
            startFromCPFile()
        }
    }
}

export var startClient = (require ('ensime-client')).ensimeClientStartup(startEnsimeServer)