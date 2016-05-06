//Download and startup ensime server
let fs = require("fs")
let path = require("path")

let ensimeClient = require("ensime-client")

//TODO: Implement {packageDir, withSbt, mkClasspathFileName, mkAssemblyJarFileName} = require('./utils')

let updateServer = ensimeClient.ensimeServerUpdate
let parseDotEnsime = ensimeClient.dotEnsimeUtils.parseDotEnsime
let startServerFromFile = ensimeClient.startServerFromFile
let startServerFromAssemblyJar = ensimeClient.startServerFromAssemblyJar

//TODO: Implement updateEnsimeServerWithCoursier = require './ensime-server-update-coursier'
let startupLog = require('loglevel').getLogger('ensime.startup')

