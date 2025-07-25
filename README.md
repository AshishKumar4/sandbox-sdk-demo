# 🚀 Cloudflare Sandbox SDK - Demo Application

> **⚠️ Disclaimer**: This is an **unofficial demo application** showcasing the capabilities of the Cloudflare Sandbox SDK.

A comprehensive, interactive demo application built to showcase the powerful capabilities of the [Cloudflare Sandbox SDK](https://github.com/cloudflare/sandbox-sdk). This demo provides a full-featured web interface for managing sandboxed environments, executing commands, managing files, and monitoring processes - all running on Cloudflare's edge network.

![Sandbox SDK Demo](https://img.shields.io/badge/Cloudflare-Sandbox_SDK-orange?style=for-the-badge&logo=cloudflare)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue?style=for-the-badge&logo=typescript)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge&logo=cloudflare)

## ✨ Features

### 🖥️ **Interactive Terminal**
- Real-time command execution with streaming output
- Command history with intelligent autocomplete
- Support for long-running commands (git clone, npm install, etc.)
- Command analytics showing usage patterns and performance metrics
- Auto-scrolling terminal output

### 📁 **File Management**
- Browse, create, edit, and delete files and directories
- Drag-and-drop file operations (move, rename)
- Syntax highlighting for code files
- Real-time file system updates

### ⚙️ **Process Management**
- Start and manage background processes
- Pre-built process templates (Node.js, Python, Docker, etc.)
- Real-time process monitoring and log streaming
- Process lifecycle management (start, stop, kill)

### 🌐 **Port Management**
- Expose services via public preview URLs
- Automatic port forwarding and routing
- One-click access to running services
- Port status monitoring

### 📊 **Metrics & Monitoring**
- Real-time sandbox performance metrics
- Command execution analytics
- Process resource utilization
- Interactive charts and visualizations

### 🔧 **Startup Scripts**
- Create and manage reusable startup scripts
- Template library for common development environments
- Script selection during sandbox creation
- Version control for startup configurations

### 🔗 **Git Integration**
- Clone repositories directly into sandboxes
- Full git command support
- Branch and commit management
- Integration with popular Git hosting services

## 🏗️ Architecture

This demo application is built using modern web technologies and leverages Cloudflare's infrastructure:

- **Frontend**: React 19 with TypeScript, Vite, and shadcn/ui components
- **Backend**: Cloudflare Workers with Hono framework
- **Container Runtime**: Cloudflare Containers for isolated execution
- **State Management**: Durable Objects for persistent sandbox state
- **Real-time Communication**: Server-Sent Events (SSE) for streaming
- **Styling**: Tailwind CSS with a beautiful, responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers/Containers access
- Docker (for local container development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd sandboxsdk-demo-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Cloudflare**
   - Update `wrangler.jsonc` with your account details
   - Ensure the Dockerfile is properly configured

4. **Development**
   ```bash
   # Start development server
   npm run dev
   
   # In another terminal, start the worker
   npx wrangler dev
   ```

5. **Production Deployment**
   ```bash
   # Build and deploy
   npm run deploy
   ```

## 📚 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run lint` | Run ESLint on the codebase |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run cf-typegen` | Generate TypeScript types for Cloudflare bindings |

## 🎯 Key Components

### Sandbox Management
- **Create Sandboxes**: Spin up new isolated environments instantly
- **Multiple Environments**: Manage multiple sandboxes simultaneously  
- **Status Monitoring**: Real-time status updates and health checks

### Interactive Interface
- **Tabbed Navigation**: Organized interface with Terminal, Files, Processes, Ports, Metrics, and Settings
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: Supports system theme preferences

### Real-time Features
- **Live Updates**: Real-time sandbox status and metrics
- **Streaming Output**: Live command output and process logs
- **Instant Feedback**: Immediate response to user actions

## 🔧 Configuration

### Environment Variables
Configure your environment by updating `wrangler.jsonc`:

```jsonc
{
  "name": "sandboxsdk-demo-app",
  "compatibility_date": "2025-01-01",
  "containers": [
    {
      "class_name": "Sandbox",
      "image": "./Dockerfile",
      "max_instances": 30
    }
  ],
  "durable_objects": {
    "bindings": [
      {
        "name": "Sandbox",
        "class_name": "Sandbox"
      }
    ]
  }
}
```

### Docker Configuration
The included `Dockerfile` provides a pre-configured environment with common development tools.

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface with Cloudflare branding
- **Intuitive Navigation**: Easy-to-use sidebar and tabbed interface
- **Responsive Layout**: Optimized for all screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Performance**: Optimized bundle size and lazy loading

## 🔍 API Reference

The demo includes a comprehensive API built on Cloudflare Workers:

- `/api/sandboxes` - Sandbox CRUD operations
- `/api/sandboxes/:id/execute` - Command execution
- `/api/sandboxes/:id/stream` - Streaming command execution
- `/api/sandboxes/:id/files` - File system operations
- `/api/sandboxes/:id/processes` - Process management
- `/api/sandboxes/:id/ports` - Port management
- `/api/startup-scripts` - Startup script management

## 🤝 Contributing

This is a community demo project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔗 Related Links

- **[Cloudflare Sandbox SDK](https://github.com/cloudflare/sandbox-sdk)** - Official SDK repository
- **[Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)** - Workers platform docs
- **[Cloudflare Containers](https://developers.cloudflare.com/containers/)** - Container runtime docs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Cloudflare developer community
- Inspired by the powerful capabilities of the Cloudflare Sandbox SDK
- Uses the excellent [shadcn/ui](https://ui.shadcn.com/) component library
- Thanks to all contributors and the open-source community

---

<div align="center">
  <p><strong>⚠️ This is an unofficial demo - not maintained by Cloudflare</strong></p>
  <p>For official SDK documentation, visit the <a href="https://github.com/cloudflare/sandbox-sdk">Cloudflare Sandbox SDK repository</a></p>
</div>