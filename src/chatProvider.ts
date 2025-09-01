import * as vscode from 'vscode';
import { GenkitService } from './genkitService';

export class ChatProvider implements vscode.TreeDataProvider<ChatItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChatItem | undefined | null | void> = new vscode.EventEmitter<ChatItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChatItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private chatHistory: ChatMessage[] = [];
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private genkitService: GenkitService
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ChatItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ChatItem): Thenable<ChatItem[]> {
        if (!element) {
            return Promise.resolve([
                new ChatItem('Start chatting...', vscode.TreeItemCollapsibleState.None, 'info')
            ]);
        }
        return Promise.resolve([]);
    }

    public openChatPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'genkitChat',
            'AI Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.setupWebviewMessageHandling();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private setupWebviewMessageHandling() {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(async (message) => {
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
        if (!this.panel) return;

        // Add user message to history
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: messageText,
            sender: 'user',
            timestamp: new Date()
        };
        this.chatHistory.push(userMessage);

        // Update UI with user message
        this.panel.webview.postMessage({
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
        this.panel.webview.postMessage({
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

                this.panel.webview.postMessage({
                    type: 'updateMessage',
                    messageId: assistantMessage.id,
                    text: fullResponse
                });
            }

            // Mark streaming as complete
            assistantMessage.text = fullResponse;
            assistantMessage.streaming = false;

            this.panel.webview.postMessage({
                type: 'finishMessage',
                messageId: assistantMessage.id
            });

        } catch (error) {
            // Handle error
            const errorText = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            assistantMessage.text = errorText;
            assistantMessage.streaming = false;

            this.panel.webview.postMessage({
                type: 'updateMessage',
                messageId: assistantMessage.id,
                text: errorText
            });

            this.panel.webview.postMessage({
                type: 'finishMessage',
                messageId: assistantMessage.id
            });
        }
    }

    public clearHistory() {
        this.chatHistory = [];
        if (this.panel) {
            this.panel.webview.postMessage({ type: 'clearHistory' });
        }
    }

    public newSession() {
        this.genkitService.clearSession();
        this.clearHistory();
        if (this.panel) {
            this.panel.webview.postMessage({ type: 'newSession' });
        }
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }

        .chat-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-panel-background);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chat-title {
            font-weight: 600;
            font-size: 14px;
        }

        .header-buttons {
            display: flex;
            gap: 8px;
        }

        .header-button {
            background: var(--vscode-button-secondaryBackground);
            border: none;
            color: var(--vscode-button-secondaryForeground);
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }

        .header-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            gap: 12px;
            max-width: 100%;
        }

        .message.user {
            flex-direction: row-reverse;
        }

        .message-content {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            padding: 12px 16px;
            max-width: 85%;
            word-wrap: break-word;
        }

        .message.user .message-content {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .message-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            flex-shrink: 0;
        }

        .message.user .message-avatar {
            background: var(--vscode-button-background);
        }

        .streaming-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--vscode-progressBar-background);
            animation: pulse 1.5s ease-in-out infinite;
            margin-left: 4px;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }

        .input-container {
            padding: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-panel-background);
        }

        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .message-input {
            flex: 1;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            padding: 10px 12px;
            font-family: inherit;
            font-size: 14px;
            resize: none;
            min-height: 20px;
            max-height: 120px;
            line-height: 1.4;
        }

        .message-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }

        .send-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .send-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            gap: 12px;
        }

        .empty-state-icon {
            font-size: 48px;
            opacity: 0.5;
        }

        .empty-state-text {
            font-size: 16px;
            font-weight: 500;
        }

        .empty-state-subtitle {
            font-size: 14px;
            opacity: 0.8;
        }

        pre {
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            padding: 8px 12px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            margin: 8px 0;
        }

        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }

        pre code {
            background: transparent;
            padding: 0;
        }
    </style>
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

    <script>
        const vscode = acquireVsCodeApi();
        let isStreaming = false;

        // Auto-resize textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Send message on Enter (but not Shift+Enter)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();

            if (!text || isStreaming) return;

            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });

            input.value = '';
            input.style.height = 'auto';
            updateSendButton(true);
        }

        function clearHistory() {
            vscode.postMessage({ type: 'clearHistory' });
        }

        function newSession() {
            vscode.postMessage({ type: 'newSession' });
        }

        function updateSendButton(disabled) {
            const button = document.getElementById('sendButton');
            button.disabled = disabled;
            isStreaming = disabled;
        }

        function addMessage(message) {
            const container = document.getElementById('chatContainer');
            const emptyState = container.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${message.sender}\`;
            messageDiv.id = \`message-\${message.id}\`;

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = message.sender === 'user' ? 'U' : 'AI';

            const content = document.createElement('div');
            content.className = 'message-content';

            if (message.streaming) {
                content.innerHTML = \`<span class="streaming-indicator"></span>\`;
            } else {
                content.innerHTML = formatMessage(message.text);
            }

            messageDiv.appendChild(avatar);
            messageDiv.appendChild(content);

            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        function updateMessage(messageId, text) {
            const messageDiv = document.getElementById(\`message-\${messageId}\`);
            if (messageDiv) {
                const content = messageDiv.querySelector('.message-content');
                content.innerHTML = formatMessage(text);

                const container = document.getElementById('chatContainer');
                container.scrollTop = container.scrollHeight;
            }
        }

        function finishMessage(messageId) {
            updateSendButton(false);
        }

        function formatMessage(text) {
            // Simple markdown-like formatting
            return text
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>')
                .replace(/\\n/g, '<br>');
        }

        function clearMessages() {
            const container = document.getElementById('chatContainer');
            container.innerHTML = \`
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">Start a conversation</div>
                    <div class="empty-state-subtitle">Ask me anything about your code!</div>
                </div>
            \`;
            updateSendButton(false);
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'addMessage':
                    addMessage(message.message);
                    break;
                case 'updateMessage':
                    updateMessage(message.messageId, message.text);
                    break;
                case 'finishMessage':
                    finishMessage(message.messageId);
                    break;
                case 'clearHistory':
                case 'newSession':
                    clearMessages();
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

class ChatItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
    }
}

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
    streaming?: boolean;
}
