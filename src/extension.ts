import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';
import { GenkitService } from './genkitService';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chat extension is now active!');

    // Initialize Genkit service
    const genkitService = new GenkitService();

    // Create chat provider
    const chatProvider = new ChatProvider(context, genkitService);

    // Register the chat view
    const chatView = vscode.window.createTreeView('genkitChatView', {
        treeDataProvider: chatProvider,
        showCollapseAll: false
    });

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('genkitChat.openChat', () => {
        chatProvider.openChatPanel();
    });

    const clearHistoryCommand = vscode.commands.registerCommand('genkitChat.clearHistory', () => {
        chatProvider.clearHistory();
    });

    const newSessionCommand = vscode.commands.registerCommand('genkitChat.newSession', () => {
        chatProvider.newSession();
    });

    // Add to subscriptions
    context.subscriptions.push(
        chatView,
        openChatCommand,
        clearHistoryCommand,
        newSessionCommand
    );

    // Open chat panel on activation
    chatProvider.openChatPanel();
}

export function deactivate() {
    console.log('AI Chat extension is now deactivated!');
}
