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
    messageDiv.className = 'message ' + message.sender;
    messageDiv.id = 'message-' + message.id;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.sender === 'user' ? 'U' : 'AI';

    const content = document.createElement('div');
    content.className = 'message-content';

    if (message.streaming) {
        content.innerHTML = '<span class="streaming-indicator"></span>';
    } else {
        content.innerHTML = formatMessage(message.text);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function updateMessage(messageId, text) {
    const messageDiv = document.getElementById('message-' + messageId);
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
        .replace(/```([\s\S]*)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^`]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function clearMessages() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-text">Start a conversation</div>
            <div class="empty-state-subtitle">Ask me anything about your code!</div>
        </div>
    `;
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
