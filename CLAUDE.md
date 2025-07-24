# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite and hot reload
- `npm run build` - Build the application (runs TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Build and preview the production application locally
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare bindings

## Architecture Overview

This is a React + TypeScript application deployed on Cloudflare Workers, built with Vite and using SWC for fast refresh.
This is a demo app being built to showcase the capabilities of Cloudflare Sandbox SDK https://github.com/cloudflare/sandbox-sdk
Always refer to the github readme file to understand the capabilities of the sandbox sdk.

### Key Components:
- **Frontend**: React 19 application in `/src/` with TypeScript support
- **Backend**: Cloudflare Worker in `/worker/index.ts` handling API routes under `/api/`
- **Build System**: Vite with Cloudflare plugin for Workers integration
- **Deployment**: Cloudflare Workers with SPA asset serving

### Project Structure:
- `/src/` - React frontend application
- `/worker/index.ts` - Cloudflare Worker entry point with API handlers
- `/public/` - Static assets served by Cloudflare
- `wrangler.jsonc` - Cloudflare Workers configuration
- `vite.config.ts` - Vite configuration with React and Cloudflare plugins

### Configuration Files:
- Multiple TypeScript configs: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.worker.json`
- ESLint configuration in `eslint.config.js`
- Wrangler configuration in `wrangler.jsonc` with SPA handling enabled

### Important Instructions:
- There should be **NO SIMULATIONS**, **MOCKS** or mock data stuff like that!   
- Refer to cloudflare docs to understand everything about cloudflare workers, and Refer to our README.md '/Users/ashishsingh/Desktop/sandboxsdk-demo-app/README.md' to understand the sandbox sdk!

The worker handles API routes and falls back to serving the React SPA for all other requests.