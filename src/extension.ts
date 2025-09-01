import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';
import { GenkitService } from './genkitService';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chat extension is now active!');
    console.log('Extension context:', context.extensionPath);

    // Initialize Genkit service
    const genkitService = new GenkitService();

    // Create chat provider
    const chatProvider = new ChatProvider(context, genkitService);
    console.log('Chat provider created successfully');

    // Register the chat view provider
    const chatViewProvider = vscode.window.registerWebviewViewProvider(
        'genkitChatView',
        chatProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );
    console.log('Chat view provider registered successfully');

    // Try to get the webview view directly
    setTimeout(() => {
        vscode.commands.executeCommand('workbench.view.extension.genkit-chat-sidebar').then(() => {
            console.log('Sidebar opened, trying to get webview view...');
            // Try to access the webview view directly
            const webviewView = vscode.window.activeTextEditor?.document.uri;
            console.log('Active editor:', webviewView);
        });
    }, 3000);

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('genkitChat.openChat', () => {
        vscode.commands.executeCommand('genkitChatView.focus');
    });

    const clearHistoryCommand = vscode.commands.registerCommand('genkitChat.clearHistory', () => {
        chatProvider.clearHistory();
    });

    const newSessionCommand = vscode.commands.registerCommand('genkitChat.newSession', () => {
        chatProvider.newSession();
    });

    const refreshViewCommand = vscode.commands.registerCommand('genkitChat.refreshView', () => {
        chatProvider.forceResolve();
        vscode.commands.executeCommand('genkitChatView.focus');
        console.log('Forced view refresh');
    });

    const showChatCommand = vscode.commands.registerCommand('genkitChat.showChat', () => {
        console.log('Show chat command executed');
        vscode.commands.executeCommand('workbench.view.extension.genkit-chat-sidebar').then(() => {
            console.log('Sidebar opened');
            setTimeout(() => {
                vscode.commands.executeCommand('genkitChatView.focus').then(() => {
                    console.log('View focused');
                });
            }, 500);
        });
    });

    const forceInitCommand = vscode.commands.registerCommand('genkitChat.forceInit', () => {
        console.log('Force init command executed');
        // Try to get the webview view directly
        vscode.commands.executeCommand('workbench.view.extension.genkit-chat-sidebar');
        setTimeout(() => {
            vscode.commands.executeCommand('genkitChatView.focus');
            // Also try to trigger a refresh
            chatProvider.forceResolve();
        }, 1000);
    });

    const createWebviewCommand = vscode.commands.registerCommand('genkitChat.createWebview', () => {
        console.log('Create webview command executed');
        try {
            // Create a new webview panel as a test
            const panel = vscode.window.createWebviewPanel(
                'genkitChat',
                'AI Chat',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [context.extensionUri]
                }
            );
            
            panel.webview.html = chatProvider.getWebviewContent(panel.webview);
            console.log('Webview panel created successfully');
        } catch (error) {
            console.error('Error creating webview panel:', error);
        }
    });

    const testWebviewCommand = vscode.commands.registerCommand('genkitChat.testWebview', () => {
        console.log('Test webview command executed');
        try {
            const panel = vscode.window.createWebviewPanel(
                'testWebview',
                'Test Webview',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true
                }
            );
            
            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Webview</title>
                </head>
                <body>
                    <h1>Test Webview Working!</h1>
                    <p>If you can see this, webviews are working.</p>
                </body>
                </html>
            `;
            console.log('Test webview panel created successfully');
        } catch (error) {
            console.error('Error creating test webview:', error);
        }
    });

    // Add to subscriptions
    context.subscriptions.push(
        chatViewProvider,
        openChatCommand,
        clearHistoryCommand,
        newSessionCommand,
        refreshViewCommand,
        showChatCommand,
        forceInitCommand,
        createWebviewCommand,
        testWebviewCommand
    );

    // Force webview resolution after a short delay
    setTimeout(() => {
        console.log('Attempting to force webview resolution...');
        vscode.commands.executeCommand('workbench.view.extension.genkit-chat-sidebar').then(() => {
            console.log('Sidebar command executed');
            setTimeout(() => {
                vscode.commands.executeCommand('genkitChatView.focus').then(() => {
                    console.log('Focus command executed');
                }, (err: any) => {
                    console.log('Focus command failed:', err);
                });
            }, 1000);
        }, (err: any) => {
            console.log('Sidebar command failed:', err);
        });
    }, 2000);
}

export function deactivate() {
    console.log('AI Chat extension is now deactivated!');
}
