import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';
import { GenkitService } from './genkitService';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chat extension is now active!');

    // Initialize Genkit service
    const genkitService = new GenkitService();

    // Create chat provider
    const chatProvider = new ChatProvider(context, genkitService);

    // Register the chat view provider
    const chatViewProvider = vscode.window.registerWebviewViewProvider(
        'genkitChatView',
        chatProvider
    );

    // Register commands
    const clearHistoryCommand = vscode.commands.registerCommand('genkitChat.clearHistory', () => {
        chatProvider.clearHistory();
    });

    const newSessionCommand = vscode.commands.registerCommand('genkitChat.newSession', () => {
        chatProvider.newSession();
    });

    // Add to subscriptions
    context.subscriptions.push(
        chatViewProvider,
        clearHistoryCommand,
        newSessionCommand
    );
}

export function deactivate() {
    console.log('AI Chat extension is now deactivated!');
}
