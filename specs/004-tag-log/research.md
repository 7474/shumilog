# Research: Frontend Core Implementation with React

**Date**: 2025-09-28
**Spec**: [./spec.md](./spec.md)

## Objective
This research document outlines the technical approach for building the core frontend of shumilog using React and Vite. The goal is to replace the existing static HTML page with a dynamic Single-Page Application (SPA) that provides login, log management, and tag management functionalities.

## Technology Stack
- **Framework**: React (latest stable)
- **Build Tool**: Vite
- **Language**: TypeScript
- **API Client**: Hono Client
- **Styling**: [NEEDS CLARIFICATION: CSS Modules, Tailwind CSS, or a component library like Chakra UI?]
- **Testing**: Vitest, React Testing Library

## Key Decisions & Rationale

### 1. React + Vite
- **Decision**: Use React for building the user interface and Vite for the development server and build process.
- **Rationale**:
    - **React**: A mature and popular library with a vast ecosystem of tools and libraries. Its component-based architecture is well-suited for building a modular and maintainable application.
    - **Vite**: Offers a significantly faster development experience compared to older tools like Create React App, thanks to its native ESM-based dev server and fast HMR. It also provides an optimized build process out of the box.

### 2. Hono Client for API Communication
- **Decision**: Use the Hono client library to make requests to the backend API.
- **Rationale**:
    - **Type Safety**: Since the backend is also built with Hono, using the Hono client provides end-to-end type safety between the frontend and backend. This reduces the chance of runtime errors and improves developer experience.
    - **Lightweight**: The client is small and has a minimal footprint.

### 3. Component Strategy
The application will be structured into two main types of components:
- **Page Components**: Located in `src/pages/`, these components represent the main views of the application (e.g., `LoginPage`, `DashboardPage`, `LogsPage`, `TagsPage`).
- **Reusable Components**: Located in `src/components/`, these are smaller, general-purpose components that can be used across different pages (e.g., `Button`, `Input`, `Modal`).

### 4. State Management
- **Decision**: Start with React's built-in state management (useState, useContext) for local and shared state.
- **Rationale**: For the initial scope of the application, a dedicated state management library like Redux or Zustand is likely overkill. React's built-in hooks are sufficient for managing the state of individual components and sharing state between them. We can introduce a more complex solution later if needed.

## Unresolved Questions
- **Styling Approach**: The specific styling solution needs to be decided. Tailwind CSS is a strong contender due to its utility-first approach which can speed up development.
- **UI Component Library**: Should we use a pre-built component library like Chakra UI or Material-UI, or build our own components from scratch? Using a library could accelerate development, but might introduce more dependencies and limit design flexibility.

## Next Steps
- Decide on a styling approach.
- Create initial project structure for the React application.
- Implement the login flow.
