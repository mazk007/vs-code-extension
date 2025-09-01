"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatProvider = void 0;
const vscode = __importStar(require("vscode"));
class ChatProvider {
    constructor(context, genkitService) {
        this.context = context;
        this.genkitService = genkitService;
        this.chatHistory = [];
    }
    resolveWebviewView(webviewView, context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        webviewView.webview.html = this.getWebviewContent(webviewView.webview);
        this.setupWebviewMessageHandling();
    }
    setupWebviewMessageHandling() {
        if (!this.view)
            return;
        this.view.webview.onDidReceiveMessage(async (message) => {
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
    async handleSendMessage(messageText) {
        if (!this.view)
            return;
        // Add user message to history
        const userMessage = {
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
        const assistantMessage = {
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
        }
        catch (error) {
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
    clearHistory() {
        this.chatHistory = [];
        if (this.view) {
            this.view.webview.postMessage({ type: 'clearHistory' });
        }
    }
    newSession() {
        this.genkitService.clearSession();
        this.clearHistory();
        if (this.view) {
            this.view.webview.postMessage({ type: 'newSession' });
        }
    }
    getWebviewContent(webview) {
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview.js'));
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
exports.ChatProvider = ChatProvider;
//# sourceMappingURL=chatProvider.js.map