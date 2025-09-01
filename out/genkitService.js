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
exports.GenkitService = void 0;
const beta_1 = require("genkit/beta");
const googleai_1 = require("@genkit-ai/googleai");
const zod_1 = require("zod");
const vscode = __importStar(require("vscode"));
class GenkitService {
    constructor() {
        this.tools = [];
        this.initializeGenkit();
    }
    initializeGenkit() {
        // Try different configuration scopes
        const workspaceConfig = vscode.workspace.getConfiguration('genkitChat');
        const globalConfig = vscode.workspace.getConfiguration('genkitChat', null);
        let apiKey = workspaceConfig.get('apiKey') || globalConfig.get('apiKey');
        // Temporary hardcoded API key for development (remove in production)
        if (!apiKey) {
            apiKey = "AIzaSyBExIonqj575sDdPdKTW2kJBB8r10FyZE8";
            console.log('GenkitService: Using hardcoded API key for development');
        }
        // Debug logging
        console.log('GenkitService: Reading configuration...');
        console.log('GenkitService: Workspace API Key:', workspaceConfig.get('apiKey') ? 'Found' : 'Not found');
        console.log('GenkitService: Global API Key:', globalConfig.get('apiKey') ? 'Found' : 'Not found');
        console.log('GenkitService: Final API Key found:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
        if (!apiKey) {
            console.warn('Google AI API key not configured. Chat functionality will be limited.');
            vscode.window.showWarningMessage('Please configure your Google AI API key in settings for full chat functionality.');
            return;
        }
        try {
            // Initialize Genkit with Google AI
            this.ai = (0, beta_1.genkit)({
                plugins: [(0, googleai_1.googleAI)({ apiKey })]
            });
            this.setupTools();
            this.createNewSession();
            console.log('Genkit service initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Genkit:', error);
            vscode.window.showErrorMessage(`Failed to initialize AI service: ${error}`);
        }
    }
    setupTools() {
        // File operations tool
        const readFileTool = this.ai.defineTool({
            name: 'readFile',
            description: 'Read the contents of a file in the workspace',
            inputSchema: zod_1.z.object({
                filePath: zod_1.z.string().describe('The relative path to the file from workspace root')
            })
        }, async (input) => {
            try {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    return 'No workspace is open';
                }
                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, input.filePath);
                const document = await vscode.workspace.openTextDocument(fileUri);
                return `File: ${input.filePath}\n\`\`\`\n${document.getText()}\n\`\`\``;
            }
            catch (error) {
                return `Error reading file: ${error}`;
            }
        });
        // Write file tool
        const writeFileTool = this.ai.defineTool({
            name: 'writeFile',
            description: 'Write content to a file in the workspace',
            inputSchema: zod_1.z.object({
                filePath: zod_1.z.string().describe('The relative path to the file from workspace root'),
                content: zod_1.z.string().describe('The content to write to the file')
            })
        }, async (input) => {
            try {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    return 'No workspace is open';
                }
                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, input.filePath);
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(input.content, 'utf8'));
                return `Successfully wrote to ${input.filePath}`;
            }
            catch (error) {
                return `Error writing file: ${error}`;
            }
        });
        // Search files tool
        const searchFilesTool = this.ai.defineTool({
            name: 'searchFiles',
            description: 'Search for files in the workspace by pattern',
            inputSchema: zod_1.z.object({
                pattern: zod_1.z.string().describe('The glob pattern to search for files'),
                exclude: zod_1.z.string().optional().describe('Pattern to exclude from search')
            })
        }, async (input) => {
            try {
                const files = await vscode.workspace.findFiles(input.pattern, input.exclude || '{**/node_modules/**,**/.git/**}');
                const filePaths = files.map((uri) => vscode.workspace.asRelativePath(uri)).slice(0, 50); // Limit results
                return `Found ${filePaths.length} files:\n${filePaths.join('\n')}`;
            }
            catch (error) {
                return `Error searching files: ${error}`;
            }
        });
        // Execute terminal command tool
        const executeCommandTool = this.ai.defineTool({
            name: 'executeCommand',
            description: 'Execute a command in the VS Code terminal',
            inputSchema: zod_1.z.object({
                command: zod_1.z.string().describe('The command to execute')
            })
        }, async (input) => {
            try {
                const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('AI Chat');
                terminal.sendText(input.command);
                terminal.show();
                return `Executed command: ${input.command}`;
            }
            catch (error) {
                return `Error executing command: ${error}`;
            }
        });
        // Store tools for use in chat
        this.tools = [readFileTool, writeFileTool, searchFilesTool, executeCommandTool];
    }
    getSystemPrompt() {
        return `You are an AI coding assistant integrated into Visual Studio Code, similar to Cursor. You have access to the user's workspace and can help with coding tasks.

**Core Capabilities:**
- Read and analyze code files
- Write and modify files
- Search through the codebase
- Execute terminal commands
- Provide coding assistance and explanations
- Debug and troubleshoot issues
- Suggest improvements and optimizations

**Behavior Guidelines:**
- Be concise but thorough in your responses
- Always consider the context of the current workspace
- When making changes, explain what you're doing and why
- Prefer showing code examples and practical solutions
- Ask for clarification when the request is ambiguous
- Use the available tools to interact with the workspace when needed

**Tool Usage:**
- Use \`readFile\` to examine code files before making suggestions
- Use \`writeFile\` to create or modify files when requested
- Use \`searchFiles\` to find relevant files in the workspace
- Use \`executeCommand\` to run build commands, tests, or other utilities

**Code Style:**
- Follow the existing code style in the project
- Use appropriate TypeScript/JavaScript practices
- Include proper error handling
- Add comments for complex logic
- Suggest modern, efficient solutions

You should act as a knowledgeable coding companion that understands the user's codebase and can provide contextual assistance.`;
    }
    createNewSession() {
        this.currentSession = this.ai.createSession({
            initialState: {
                sessionId: Date.now().toString(),
                messageCount: 0
            }
        });
    }
    async sendMessage(message) {
        try {
            if (!this.ai) {
                throw new Error('Genkit not initialized. Please configure your API key.');
            }
            const config = vscode.workspace.getConfiguration('genkitChat');
            const chat = this.currentSession.chat({
                system: this.getSystemPrompt(),
                tools: this.tools,
                config: {
                    temperature: config.get('temperature') || 0.7,
                    maxOutputTokens: config.get('maxTokens') || 8192
                }
            });
            const response = await chat.send(message);
            // Update session state
            await this.currentSession.updateState({
                messageCount: (this.currentSession.state.messageCount || 0) + 1
            });
            return response.text || 'No response generated';
        }
        catch (error) {
            console.error('Error sending message:', error);
            return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        }
    }
    async sendMessageStream(message) {
        try {
            if (!this.ai) {
                throw new Error('Genkit not initialized. Please configure your API key.');
            }
            const config = vscode.workspace.getConfiguration('genkitChat');
            const chat = this.currentSession.chat({
                system: this.getSystemPrompt(),
                tools: this.tools,
                config: {
                    temperature: config.get('temperature') || 0.7,
                    maxOutputTokens: config.get('maxTokens') || 8192
                }
            });
            const { stream } = await chat.sendStream(message);
            return this.createTextStream(stream);
        }
        catch (error) {
            console.error('Error sending message stream:', error);
            throw error;
        }
    }
    async *createTextStream(stream) {
        for await (const chunk of stream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    }
    clearSession() {
        this.createNewSession();
    }
}
exports.GenkitService = GenkitService;
//# sourceMappingURL=genkitService.js.map