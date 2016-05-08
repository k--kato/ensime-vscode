//Download and startup ensime server
let fs = require("fs")
let path = require("path")

let ensimeClient = require("ensime-client")

let utils = require('./utils')
let packageDir = utils.packageDir, withSbt = utils.withSbt, mkClasspathFilename = utils.mkClasspathFilename, mkAssemblyJarFilebame = utils.mkAssemblyJarFilename

let updateServer = ensimeClient.ensimeServerUpdate
let parseDotEnsime = ensimeClient.dotEnsimeUtils.parseDotEnsime
let startServerFromFile = ensimeClient.startServerFromFile
let startServerFromAssemblyJar = ensimeClient.startServerFromAssemblyJar

let updateEnsimeServerWithCoursier = require ('./ensime-server-update-coursier')
let startupLog = require('loglevel').getLogger('ensime.startup')

