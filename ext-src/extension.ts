import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
// import * as axe from 'axe-core';

/**
 * Manages webview panels
 */
class AccessibilityReportViewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: AccessibilityReportViewPanel | undefined;

  private static readonly viewType = 'AccessibilityReport';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private readonly builtAppFolder: string;
  private disposables: vscode.Disposable[] = [];

  private browser: Browser | undefined;
  private page: Page | undefined;

  public static createOrShow(extensionPath: string): AccessibilityReportViewPanel {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    // Otherwise, create Accessibility Report panel.
    if (AccessibilityReportViewPanel.currentPanel) {
      AccessibilityReportViewPanel.currentPanel.panel.reveal(column);
    } else {
      AccessibilityReportViewPanel.currentPanel = new AccessibilityReportViewPanel(extensionPath, column || vscode.ViewColumn.One);
    }
    return AccessibilityReportViewPanel.currentPanel;
  }

  private constructor(extensionPath: string, column: vscode.ViewColumn) {
    this.extensionPath = extensionPath;
    this.builtAppFolder = 'dist';

    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(AccessibilityReportViewPanel.viewType, 'Accessibility Report', column, {
      // Enable javascript in the webview
      enableScripts: true,

      retainContextWhenHidden: true,

      localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, this.builtAppFolder))]
    });

    // Set the webview's initial html content
    this.panel.webview.html = this._getHtmlForWebview();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: any) => {
        switch (message.command) {
          case 'launch':
            this.launch(message.url);
            break;
          case 'runAxe':
            this.runAxe();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  launch(url: string) {
    (async () => {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: false,
          args: [
            '--window-size=1600,940'
          ]
        });
        this.browser.on('disconnected', () => {
          this.browser = undefined;
          this.page = undefined;
        });
      }

      if (!this.page) {
        const pages = await this.browser.pages();
        this.page = pages[0];
      }

      if (this.page) {
        await this.page.goto(url);
        await this.page.setViewport({
          width: 1600,
          height: 900
        });

        // add axe-core to the pages
        await this.page.addScriptTag({
          path: require.resolve('axe-core')
        });
      }
    })();
  }

  runAxe() {
    if (this.browser && this.page) {
      (async () => {
        if (this.page) {
          // run axe on the page
          const axeResults = await this.page.evaluate(
            `
            (async () => {
              return await axe.run({
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa']
                }
              });
            })();
            `
          );
          this.panel.webview.postMessage({
            command: 'report',
            axeResults
          });
        }
      })();
    }
  }

  public dispose() {
    AccessibilityReportViewPanel.currentPanel = undefined;

    // Clean up our resources
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Returns html of the start page (index.html)
   */
  private _getHtmlForWebview() {
    // path to dist folder
    const appDistPath = path.join(this.extensionPath, 'dist');
    const appDistPathUri = vscode.Uri.file(appDistPath);

    // path as uri
    const baseUri = this.panel.webview.asWebviewUri(appDistPathUri);

    // get path to index.html file from dist folder
    const indexPath = path.join(appDistPath, 'index.html');

    // read index file from file system
    let indexHtml = fs.readFileSync(indexPath, { encoding: 'utf8' });

    // update the base URI tag
    indexHtml = indexHtml.replace('<base href="/">', `<base href="${String(baseUri)}/">`);

    return indexHtml;
  }
}

/**
 * Activates extension
 * @param context vscode extension context
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-accessibility-report', () => {
      AccessibilityReportViewPanel.createOrShow(context.extensionPath);
    })
  );
}
