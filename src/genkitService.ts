import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export class GenkitService {
    private ai: any;
    private currentSession: any;

    constructor() {
        this.initializeGenkit();
    }

    private initializeGenkit() {
        const config = vscode.workspace.getConfiguration('genkitChat');
        const apiKey = config.get<string>('apiKey');

        if (!apiKey) {
            vscode.window.showErrorMessage('Please configure your Google AI API key in settings.');
            return;
        }

        // Initialize Genkit with Google AI
        this.ai = genkit({
            plugins: [googleAI({ apiKey })]
        });

        this.setupTools();
        this.createNewSession();
    }

    private setupTools() {
        // File operations tool
        const readFileTool = this.ai.defineTool(
            {
                name: 'readFile',
                description: 'Read the contents of a file in the workspace',
                inputSchema: z.object({
                    filePath: z.string().describe('The relative path to the file from workspace root')
                })
            },
            async (input: { filePath: string }) => {
                try {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (!workspaceFolder) {
                        return 'No workspace is open';
                    }

                    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, input.filePath);
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    return `File: ${input.filePath}\n\`\`\`\n${document.getText()}\n\`\`\``;
                } catch (error) {
                    return `Error reading file: ${error}`;
                }
            }
        );

        // Write file tool
        const writeFileTool = this.ai.defineTool(
            {
                name: 'writeFile',
                description: 'Write content to a file in the workspace',
                inputSchema: z.object({
                    filePath: z.string().describe('The relative path to the file from workspace root'),
                    content: z.string().describe('The content to write to the file')
                })
            },
            async (input: { filePath: string; content: string }) => {
                try {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (!workspaceFolder) {
                        return 'No workspace is open';
                    }

                    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, input.filePath);
                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(input.content, 'utf8'));
                    return `Successfully wrote to ${input.filePath}`;
                } catch (error) {
                    return `Error writing file: ${error}`;
                }
            }
        );

        // Search files tool
        const searchFilesTool = this.ai.defineTool(
            {
                name: 'searchFiles',
                description: 'Search for files in the workspace by pattern',
                inputSchema: z.object({
                    pattern: z.string().describe('The glob pattern to search for files'),
                    exclude: z.string().optional().describe('Pattern to exclude from search')
                })
            },
            async (input: { pattern: string; exclude?: string }) => {
                try {
                    const files = await vscode.workspace.findFiles(
                        input.pattern,
                        input.exclude || '{**/node_modules/**,**/.git/**}'
                    );

                    const filePaths = files.map(uri =>
                        vscode.workspace.asRelativePath(uri)
                    ).slice(0, 50); // Limit results

                    return `Found ${filePaths.length} files:\n${filePaths.join('\n')}`;
                } catch (error) {
                    return `Error searching files: ${error}`;
                }
            }
        );

        // Execute terminal command tool
        const executeCommandTool = this.ai.defineTool(
            {
                name: 'executeCommand',
                description: 'Execute a command in the VS Code terminal',
                inputSchema: z.object({
                    command: z.string().describe('The command to execute')
                })
            },
            async (input: { command: string }) => {
                try {
                    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('AI Chat');
                    terminal.sendText(input.command);
                    terminal.show();
                    return `Executed command: ${input.command}`;
                } catch (error) {
                    return `Error executing command: ${error}`;
                }
            }
        );

        // Store tools for use in chat
        this.tools = [readFileTool, writeFileTool, searchFilesTool, executeCommandTool];
    }

    private tools: any[] = [];

    private getSystemPrompt(): string {
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

    public createNewSession() {
        this.currentSession = this.ai.createSession({
            initialState: {
                sessionId: Date.now().toString(),
                messageCount: 0
            }
        });
    }

    public async sendMessage(message: string): Promise<string> {
        try {
            if (!this.ai) {
                throw new Error('Genkit not initialized. Please configure your API key.');
            }

            const config = vscode.workspace.getConfiguration('genkitChat');

            const chat = this.currentSession.chat({
                system: this.getSystemPrompt(),
                tools: this.tools,
                config: {
                    temperature: config.get<number>('temperature') || 0.7,
                    maxOutputTokens: config.get<number>('maxTokens') || 8192
                }
            });

            const response = await chat.send(message);

            // Update session state
            await this.currentSession.updateState({
                messageCount: (this.currentSession.state.messageCount || 0) + 1
            });

            return response.text || 'No response generated';
        } catch (error) {
            console.error('Error sending message:', error);
            return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        }
    }

    public async sendMessageStream(message: string): Promise<AsyncIterableIterator<string>> {
        try {
            if (!this.ai) {
                throw new Error('Genkit not initialized. Please configure your API key.');
            }

            const config = vscode.workspace.getConfiguration('genkitChat');

            const chat = this.currentSession.chat({
                system: this.getSystemPrompt(),
                tools: this.tools,
                config: {
                    temperature: config.get<number>('temperature') || 0.7,
                    maxOutputTokens: config.get<number>('maxTokens') || 8192
                }
            });

            const { stream } = await chat.sendStream(message);

            return this.createTextStream(stream);
        } catch (error) {
            console.error('Error sending message stream:', error);
            throw error;
        }
    }

    private async* createTextStream(stream: AsyncIterable<any>): AsyncIterableIterator<string> {
        for await (const chunk of stream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    }

    public clearSession() {
        this.createNewSession();
    }
}
