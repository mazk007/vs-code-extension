import * as vscode from 'vscode';
import { GenkitService } from './genkitService';

export class ChatProvider implements vscode.WebviewViewProvider {
    private chatHistory: ChatMessage[] = [];
    private view: vscode.WebviewView | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private genkitService: GenkitService
    ) {
        console.log('ChatProvider: Constructor called');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('ChatProvider: resolveWebviewView called');
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);
        console.log('ChatProvider: Webview HTML set successfully');
        this.setupWebviewMessageHandling();
        console.log('ChatProvider: Message handling setup complete');

        // Show a message to confirm the webview is working
        vscode.window.showInformationMessage('AI Chat webview loaded successfully!');
    }

    private setupWebviewMessageHandling() {
        if (!this.view) return;

        this.view.webview.onDidReceiveMessage(async (message: any) => {
            switch (message.type) {
                case 'sendMessage':
                    await this.handleSendMessage(message.text);
                    break;
                case 'clearHistory':
                    this.clearHistory();
                    break;
                case 'newSession':
                    this.newSession();
                    break;
            }
        });
    }

    private async handleSendMessage(messageText: string) {
        if (!this.view) return;

        // Add user message to history
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: messageText,
            sender: 'user',
            timestamp: new Date()
        };
        this.chatHistory.push(userMessage);

        // Update UI with user message
        this.view.webview.postMessage({
            type: 'addMessage',
            message: userMessage
        });

        // Create assistant message placeholder
        const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: '',
            sender: 'assistant',
            timestamp: new Date(),
            streaming: true
        };
        this.chatHistory.push(assistantMessage);

        // Update UI with assistant message placeholder
        this.view.webview.postMessage({
            type: 'addMessage',
            message: assistantMessage
        });

        try {
            // Stream response from Genkit
            const responseStream = await this.genkitService.sendMessageStream(messageText);
            let fullResponse = '';

            for await (const chunk of responseStream) {
                fullResponse += chunk;

                // Update the streaming message
                const updatedMessage = {
                    ...assistantMessage,
                    text: fullResponse
                };

                this.view.webview.postMessage({
                    type: 'updateMessage',
                    messageId: assistantMessage.id,
                    text: fullResponse
                });
            }

            // Mark streaming as complete
            assistantMessage.text = fullResponse;
            assistantMessage.streaming = false;

            this.view.webview.postMessage({
                type: 'finishMessage',
                messageId: assistantMessage.id
            });

        } catch (error) {
            // Handle error
            const errorText = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            assistantMessage.text = errorText;
            assistantMessage.streaming = false;

            this.view.webview.postMessage({
                type: 'updateMessage',
                messageId: assistantMessage.id,
                text: errorText
            });

            this.view.webview.postMessage({
                type: 'finishMessage',
                messageId: assistantMessage.id
            });
        }
    }

    public clearHistory() {
        this.chatHistory = [];
        if (this.view) {
            this.view.webview.postMessage({ type: 'clearHistory' });
        }
    }

    public newSession() {
        this.genkitService.clearSession();
        this.clearHistory();
        if (this.view) {
            this.view.webview.postMessage({ type: 'newSession' });
        }
    }

    public forceResolve() {
        console.log('ChatProvider: Force resolve called');
        if (this.view) {
            console.log('ChatProvider: View already exists, refreshing...');
            this.view.webview.html = this.getWebviewContent(this.view.webview);
        } else {
            console.log('ChatProvider: No view exists yet');
        }
    }

    public getWebviewContent(webview: vscode.Webview): string {
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'src', 'webview.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'src', 'webview.js'));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat</title>
    <link href="${cssUri}" rel="stylesheet">
</head>
<body>
    <div class="chat-header">
        <div class="chat-title">AI Chat</div>
        <div class="header-buttons">
            <button class="header-button" onclick="newSession()">New</button>
            <button class="header-button" onclick="clearHistory()">Clear</button>
        </div>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-text">Start a conversation</div>
            <div class="empty-state-subtitle">Ask me anything about your code!</div>
        </div>
    </div>

    <div class="input-container">
        <div class="input-wrapper">
            <textarea
                class="message-input"
                id="messageInput"
                placeholder="Ask about your code, request changes, or get help..."
                rows="1"
            ></textarea>
            <button class="send-button" id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script src="${jsUri}"></script>
</body>
</html>`;
    }
}

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
    streaming?: boolean;
}