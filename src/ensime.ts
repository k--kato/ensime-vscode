'use strict';
import * as vscode from 'vscode';
import * as EnsimeClient from 'ensime-client';
import * as fs from 'fs';
import * as path from 'path';
import {LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, StreamInfo} from 'vscode-languageclient';

import {AutocompletePlusProvider} from './features/autocomplete-plus';
import {ImportSuggestions} from './features/import-suggestions'
import {GoTo} from './features/go-to'

export class Ensime {

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    /*-------------------------------------------------------------------------
     *
     *-----------------------------------------------------------------------*/
    private DEFAULT_ENSIME_SERVER_VERSION: string = "0.9.10-SNAPSHOT";
    private DEFAULT_ENSIME_SERVER_FLAGS: string = "";

    private _context: vscode.ExtensionContext;
    private _activeInstance: EnsimeClient.Instance;
    private _instanceManager = EnsimeClient.InstanceManager;

    /*-------------------------------------------------------------------------
     *
     *-----------------------------------------------------------------------*/
    private extension = vscode.extensions.getExtension('hedefalk.ensime');
    private extensionPath = () => this._context.extensionPath;

    private dotEnsimeUris = vscode.workspace.findFiles("**/.ensime", "node_modules", 10)
    private toString = (uris: vscode.Uri[]) => uris.map((uri) => uri.fsPath)
    private dotEnsimeStrings = this.dotEnsimeUris.then(this.toString)

    private updateDir = () => path.join(this.extensionPath(), "update_coursier");
    private clientLookup = (editor: vscode.TextEditor) => this.clientOfEditor(editor);

    private autocompletePlusProvider = new AutocompletePlusProvider(this.clientLookup);
    private importSuggestions = new ImportSuggestions();
    private goTo = new GoTo();

    /*-------------------------------------------------------------------------
     *
     *-----------------------------------------------------------------------*/
    public start(): void {

        console.log('Congratulations, your extension "ensime-vscode" is now active!');

        const config = vscode.workspace.getConfiguration('ensime');

        const onSelectedDotEnsime = (dotEnsimePath: string) => {
            console.log(dotEnsimePath)
            const dotEnsime: EnsimeClient.DotEnsime = EnsimeClient.dotEnsimeUtils.parseDotEnsime(dotEnsimePath);
            console.log(dotEnsime);

            /*-------------------------------------------------------------------------
             * Server
             *-----------------------------------------------------------------------*/
            const serverStarter = (parsedDotEnsime: EnsimeClient.DotEnsime, pidCallback: (string) => void) => {
                console.log("hej server!");
                if (!fs.existsSync(parsedDotEnsime.cacheDir)) {
                    fs.mkdirSync(parsedDotEnsime.cacheDir);
                }
                const ensimeServerVersion = config.get("ensime.serverVersion", this.DEFAULT_ENSIME_SERVER_VERSION);
                const ensimeServerFlags = config.get("ensime.ensimeServerFlags", this.DEFAULT_ENSIME_SERVER_FLAGS);

                const assemblyJar = this.mkAssemblyJarFileName(parsedDotEnsime.scalaEdition, ensimeServerVersion);

                if (fs.existsSync(assemblyJar))
                    EnsimeClient.startServerFromAssemblyJar(assemblyJar, parsedDotEnsime, ensimeServerFlags, pidCallback);
                else {
                    const cpF = this.mkClasspathFileName(parsedDotEnsime.scalaVersion, ensimeServerVersion);
                    const startFromCPFile =
                        () => EnsimeClient.startServerFromFile(cpF, parsedDotEnsime, ensimeServerFlags, pidCallback);

                    if (!this.classpathFileOk(cpF)) {
                        const nottin     = (s: string, i: string) => { };
                        const pidLogger = () => (string) => { };

                        const serverUpdater =
                            EnsimeClient.ensimeServerUpdate(this.updateDir(), pidLogger, nottin);

                        serverUpdater(parsedDotEnsime, ensimeServerVersion, cpF, startFromCPFile);
                    } else
                        startFromCPFile();
                }
            };


            /*-------------------------------------------------------------------------
             * Client
             *-----------------------------------------------------------------------*/
            const startClient = EnsimeClient.ensimeClientStartup(serverStarter);
            const statusbarView = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
            const generalHandler = (msg) => this.statusbarOutput(statusbarView, msg);
            const callback = (client) => {
                //vscode.window.showInformationMessage("Ensime connected!");

                const statusbarView = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusbarView.text = "ENSIME connected!";
                statusbarView.show();
                const typechecking = undefined;
                const ui = {
                    statusbarView,
                    typechecking,
                    destroy: () => {
                        statusbarView.dispose();
                        //typechecking?.destroy();
                    }
                };
                const instance: EnsimeClient.Instance = new EnsimeClient.Instance(dotEnsime, client, ui);
                this._instanceManager = new EnsimeClient.InstanceManager();
                this._instanceManager.registerInstance(instance);

                if (!this._activeInstance) {
                    this._activeInstance = instance;
                }

                client.post({ "typehint": "ConnectionInfoReq" }, (msg) => { });

                this.switchToInstance(instance);

            };

            startClient(dotEnsime, generalHandler, callback);

        };

        vscode.window.showQuickPick(this.dotEnsimeStrings).then(onSelectedDotEnsime)

    }

    // create classpath file name for ensime server startup
    private mkClasspathFileName(scalaVersion, ensimeServerVersion): string {
        return path.join(this.extensionPath(), `classpath_${scalaVersion}_${ensimeServerVersion}`);
    }

    private mkAssemblyJarFileName(scalaEdition, ensimeServerVersion) {
        return path.join(this.extensionPath(), `ensime_${scalaEdition}-${ensimeServerVersion}-assembly.jar`);
    }

    //  Check that we have a classpath that is newer than atom
    //  package.json (updated on release), otherwise delete it
    private classpathFileOk(cpF) {
        if (!fs.existsSync(cpF))
            return false;
        else {
            const cpFStats = fs.statSync(cpF)
            const fine = cpFStats.isFile && cpFStats.ctime > fs.statSync(path.join(this.extensionPath(), 'package.json')).mtime
            if (!fine)
                fs.unlinkSync(cpF)
            return fine;
        }
    }

    /*-------------------------------------------------------------------------
     *
     *-----------------------------------------------------------------------*/
    private statusbarOutput = (statusbarView, typechecking) => (msg) => {
        const typehint = msg.typehint

        if (typehint == 'AnalyzerReadyEvent') {
            statusbarView.setText('Analyzer ready!')
        }

        else if (typehint == 'FullTypeCheckCompleteEvent') {
            statusbarView.setText('Full typecheck finished!')
        }

        else if (typehint == 'IndexerReadyEvent') {
            statusbarView.setText('Indexer ready!')
        }

        else if (typehint == 'CompilerRestartedEvent') {
            statusbarView.setText('Compiler restarted!')
        }

        else if (typehint == 'ClearAllScalaNotesEvent') {
            //typechecking ?.clearScalaNotes()
        }

        else if (typehint == 'NewScalaNotesEvent') {
            //typechecking ?.addScalaNotes(msg)
        }

        else if (typehint.startsWith('SendBackgroundMessageEvent')) {
            statusbarView.setText(msg.detail)
        }
    }

    private switchToInstance = (instance) => {
        if (instance != this._activeInstance) {
            if (!this._activeInstance) {
                this._activeInstance.ui.statusbarView.hide();
            }
            this._activeInstance = instance;
            if (instance) {
                instance.ui.statusbarView.show()
            }
        }
    };

    private clientOfEditor = (editor: vscode.TextEditor) => {
        if (editor) {
            if (this._instanceManager) {
                const instance = this._instanceManager.instanceOfFile(editor.document.uri.path);
                if (instance) {
                    return instance.client;
                }
            }
        }
        else {
            if (this._instanceManager) {
                const instance = this._instanceManager.firstInstance();
                if (instance) {
                    return instance.client;
                }
            }
        }
    }

    public goToDefinitionOfCursor() {
        const editor = vscode.window.activeTextEditor;
        //const textBuffer = editor.getBuffer();
        const pos = editor.selection.active;
        this.goTo.goToTypeAtPoint(this.clientOfEditor(editor), editor, pos);
    }


    public dispose() {
        this._instanceManager.destroyAll();
    }

}

