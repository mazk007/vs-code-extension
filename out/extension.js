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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const chatProvider_1 = require("./chatProvider");
const genkitService_1 = require("./genkitService");
function activate(context) {
    console.log('AI Chat extension is now active!');
    // Initialize Genkit service
    const genkitService = new genkitService_1.GenkitService();
    // Create chat provider
    const chatProvider = new chatProvider_1.ChatProvider(context, genkitService);
    // Register the chat view provider
    const chatViewProvider = vscode.window.registerWebviewViewProvider('genkitChatView', chatProvider);
    // Register commands
    const clearHistoryCommand = vscode.commands.registerCommand('genkitChat.clearHistory', () => {
        chatProvider.clearHistory();
    });
    const newSessionCommand = vscode.commands.registerCommand('genkitChat.newSession', () => {
        chatProvider.newSession();
    });
    // Add to subscriptions
    context.subscriptions.push(chatViewProvider, clearHistoryCommand, newSessionCommand);
}
exports.activate = activate;
function deactivate() {
    console.log('AI Chat extension is now deactivated!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map