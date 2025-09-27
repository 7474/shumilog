# Quickstart: Frontend Development

**Date**: 2025-09-28
**Spec**: [./spec.md](./spec.md)

This guide provides instructions for setting up and running the shumilog frontend application locally.

## Prerequisites
- Node.js (v18 or later)
- npm (or a compatible package manager like yarn or pnpm)

## Setup
1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Running the Development Server
Once the dependencies are installed, you can start the Vite development server:

```bash
npm run dev
```

This will start the server, typically on `http://localhost:5173`. The server supports Hot Module Replacement (HMR), so changes you make to the source code will be reflected in the browser automatically without a full page reload.

## Building for Production
To create a production-ready build of the application, run:

```bash
npm run build
```

This command will generate a `dist` directory containing the optimized, static assets for the application. This is the directory that would be deployed to a static hosting service like Cloudflare Pages.

## Running Tests
To run the unit and component tests, use the following command:

```bash
npm run test
```
