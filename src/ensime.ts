'use strict';
import * as vscode from 'vscode';
import * as EnsimeClient from 'ensime-client';
import * as fs from 'fs';
import * as path from 'path';

const extension = vscode.extensions.getExtension('hedefalk.ensime');
const extensionPath = () => extension.extensionPath;

// create classpath file name for ensime server startup
function mkClasspathFileName(scalaVersion, ensimeServerVersion) : string {
  return path.join(extensionPath(), `classpath_${scalaVersion}_${ensimeServerVersion}`);
}

function mkAssemblyJarFileName(scalaEdition, ensimeServerVersion) {
  return path.join(extensionPath(), `ensime_${scalaEdition}-${ensimeServerVersion}-assembly.jar`);
}

const updateDir = () => path.join(extensionPath(), "update_coursier")

//  Check that we have a classpath that is newer than atom
//  package.json (updated on release), otherwise delete it
function classpathFileOk(cpF) {
  if(! fs.existsSync(cpF))
    return false;
  else {
    const cpFStats = fs.statSync(cpF)
    const fine = cpFStats.isFile && cpFStats.ctime > fs.statSync(path.join(extensionPath(), 'package.json')).mtime
    if (! fine)
      fs.unlinkSync(cpF)
    return fine;
  }
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ensime-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ensime.startEnsime', () => {
		// The code you place here will be executed every time your command is executed

        let dotEnsimeUris = vscode.workspace.findFiles("**/.ensime", "node_modules", 10)
        let toString = (uris: vscode.Uri[]) => uris.map((uri) => uri.fsPath)
        let dotEnsimeStrings = dotEnsimeUris.then(toString)
        
        vscode.commands.registerCommand("ensime.stopEnsime", () => {
            
        });
        
        
        const config = vscode.workspace.getConfiguration('ensime');
        
        const onSelectedDotEnsime = (dotEnsimePath: string) => {
            console.log(dotEnsimePath)
            let dotEnsime = EnsimeClient.dotEnsimeUtils.parseDotEnsime(dotEnsimePath);
            console.log(dotEnsime);
            
            const serverStarter = function(parsedDotEnsime: EnsimeClient.DotEnsime, pidCallback: (string) => void) {
                console.log("hej server!");
                if (!fs.existsSync(parsedDotEnsime.cacheDir)) {
                    fs.mkdirSync(parsedDotEnsime.cacheDir);
                }
                const ensimeServerVersion = config.get("ensime.serverVersion", "0.9.10-SNAPSHOT");

                //     ensimeServerFlags = atom.config.get('Ensime.ensimeServerFlags')
                const ensimeServerFlags = "";
                
                const assemblyJar = mkAssemblyJarFileName(parsedDotEnsime.scalaEdition, ensimeServerVersion);
                    
                if(fs.existsSync(assemblyJar))
                    EnsimeClient.startServerFromAssemblyJar(assemblyJar, parsedDotEnsime, ensimeServerFlags, pidCallback);
                else {
                    const cpF = mkClasspathFileName(parsedDotEnsime.scalaVersion, ensimeServerVersion);
                    const startFromCPFile =
                        () => EnsimeClient.startServerFromFile(cpF, parsedDotEnsime, ensimeServerFlags, pidCallback);
                    
                    if(! classpathFileOk(cpF)) {
                        const nottin = (s: string, i: string) => {};
                        const pidLogger = () => (string) => {};
                        
                        const serverUpdater =
                            EnsimeClient.ensimeServerUpdate(updateDir(), pidLogger, nottin);
                        // EnsimeClient.ensimeServerUpdate(parsedDotEnsime, ensimeServerVersion, cpF, startFromCPFile);
                    } else
                        startFromCPFile();
                }
            };
            const startClient = EnsimeClient.ensimeClientStartup(serverStarter);
            // startClient(dotEnsime, )
        };
            
        vscode.window.showQuickPick(dotEnsimeStrings).then(onSelectedDotEnsime)
        
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}