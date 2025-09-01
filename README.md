# VS Code AI Chat Extension with Genkit

A VS Code extension that provides a Cursor-style chat sidepanel powered by Google's Gemini 2.0 Flash via Genkit. This extension brings AI-powered coding assistance directly into your development environment.

## Features

- 🤖 **AI Chat Interface**: Cursor-style chat sidepanel with streaming responses
- 🔧 **Code Integration**: Read, write, and analyze files in your workspace
- 🔍 **File Search**: Search through your codebase with AI assistance
- 💻 **Terminal Integration**: Execute commands directly from chat
- 🎨 **VS Code Theming**: Seamlessly integrates with your VS Code theme
- ⚡ **Real-time Streaming**: Get responses as they're generated
- 🛠 **Tool Support**: Built-in tools for file operations and workspace interaction

## Prerequisites

- Visual Studio Code 1.60.0 or later
- Node.js 18.0 or later
- Google AI API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Installation

### From Source

1. Clone this repository:
   \`\`\`bash
   git clone <repository-url>
   cd vscode-genkit-chat
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Compile the TypeScript:
   \`\`\`bash
   npm run compile
   \`\`\`

4. Open in VS Code and press `F5` to run the extension in a new Extension Development Host window.

### Package and Install

1. Install vsce (VS Code Extension Manager):
   \`\`\`bash
   npm install -g vsce
   \`\`\`

2. Package the extension:
   \`\`\`bash
   vsce package
   \`\`\`

3. Install the generated `.vsix` file:
   \`\`\`bash
   code --install-extension vscode-genkit-chat-1.0.0.vsix
   \`\`\`

## Configuration

1. Open VS Code Settings (`Ctrl/Cmd + ,`)
2. Search for "AI Chat"
3. Configure the following settings:

### Required Settings

- **API Key**: Your Google AI API key
  \`\`\`json
  "genkitChat.apiKey": "your-google-ai-api-key"
  \`\`\`

### Optional Settings

- **Model**: Choose the Gemini model (default: `gemini-2.0-flash-exp`)
  \`\`\`json
  "genkitChat.model": "gemini-2.0-flash-exp"
  \`\`\`

- **Temperature**: Control response randomness (0-2, default: 0.7)
  \`\`\`json
  "genkitChat.temperature": 0.7
  \`\`\`

- **Max Tokens**: Maximum response length (default: 8192)
  \`\`\`json
  "genkitChat.maxTokens": 8192
  \`\`\`

## Usage

### Opening the Chat

1. The chat panel will open automatically when the extension activates
2. Or use the "AI Chat" view in the Explorer panel
3. Or run the command "Open AI Chat" from the Command Palette (`Ctrl/Cmd + Shift + P`)

### Available Commands

- **New Chat Session**: Start a fresh conversation
- **Clear Chat History**: Clear the current chat history
- **Open AI Chat**: Open the chat panel

### Chat Features

The AI assistant can help you with:

- **Code Analysis**: Ask questions about your codebase
- **File Operations**: Read, write, and modify files
- **Code Generation**: Generate new code or components
- **Debugging**: Help troubleshoot issues
- **Documentation**: Explain code or generate documentation
- **Refactoring**: Suggest improvements and optimizations

### Example Conversations

\`\`\`
You: Can you read the package.json file and tell me about the dependencies?

AI: I'll read your package.json file and analyze the dependencies.
[AI uses readFile tool to examine package.json]
Based on your package.json, I can see you're using...
\`\`\`

\`\`\`
You: Create a new React component for a todo list

AI: I'll create a React todo list component for you.
[AI uses writeFile tool to create the component]
I've created a new TodoList component at src/components/TodoList.tsx...
\`\`\`

## Available Tools

The AI assistant has access to these tools:

### File Operations
- **readFile**: Read and analyze any file in your workspace
- **writeFile**: Create or modify files
- **searchFiles**: Find files using glob patterns

### Terminal Integration
- **executeCommand**: Run terminal commands

## System Prompts

The extension uses carefully crafted system prompts inspired by Cursor to provide:

- Context-aware coding assistance
- Best practice recommendations
- Code style consistency
- Error handling suggestions
- Modern development practices

## Development

### Project Structure

\`\`\`
src/
├── extension.ts       # Main extension entry point
├── genkitService.ts   # Genkit AI service integration
└── chatProvider.ts    # Chat UI and tree view provider
\`\`\`

### Building

\`\`\`bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
vsce package
\`\`\`

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

**Extension not activating**
- Check that you have VS Code 1.60.0 or later
- Ensure the extension is properly installed

**API key errors**
- Verify your Google AI API key is correctly configured
- Check that the API key has the necessary permissions

**No responses from AI**
- Check your internet connection
- Verify the API key is valid and has quota remaining
- Check the VS Code Developer Console for error messages

**Tool execution fails**
- Ensure you have a workspace open
- Check file permissions for the workspace
- Verify the file paths are correct

### Getting Help

If you encounter issues:

1. Check the VS Code Developer Console for error messages
2. Verify your configuration settings
3. Try restarting VS Code
4. Create an issue on the repository with details about the problem

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Genkit](https://firebase.google.com/products/genkit) for AI integration
- Powered by Google's Gemini models
- Inspired by Cursor's chat interface
- Uses VS Code's extension API
