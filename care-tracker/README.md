# Care Tracker Frontend

A Next.js-based medical recovery companion application that transforms complex discharge instructions into an intuitive timeline-based interface.

## 🚀 Overview

Care Tracker helps patients organize their recovery journey with a personalized care plan. The application features a streamlined onboarding process and timeline-based task management for post-procedure care.

## 🛠️ Technology Stack

### Core Framework
- **[Next.js 14](https://nextjs.org/)** `^14.2.15` - React framework with App Router
- **[React 18](https://react.dev/)** `^18.3.1` - UI library
- **[TypeScript](https://www.typescriptlang.org/)** `^5.6.3` - Type-safe JavaScript

### State Management & Data
- **[Zustand](https://zustand-demo.pmnd.rs/)** `^5.0.1` - Lightweight state management with sessionStorage persistence
- **[Zod](https://zod.dev/)** `^3.23.8` - TypeScript-first schema validation

### UI & Styling
- **Custom CSS Utilities** - Utility-first CSS approach without framework dependencies
- **[Lucide React](https://lucide.dev/)** `^0.460.0` - Beautiful & consistent icon library

### Utilities
- **[date-fns](https://date-fns.org/)** `^4.1.0` - Modern JavaScript date utility library

## 🧪 Development & Testing

### Development Dependencies
- **[@types/node](https://www.npmjs.com/package/@types/node)** `^22.9.0` - Node.js type definitions
- **[@types/react](https://www.npmjs.com/package/@types/react)** `^18.3.12` - React type definitions
- **[@types/react-dom](https://www.npmjs.com/package/@types/react-dom)** `^18.3.1` - React DOM type definitions

### Testing Framework
- **[Jest](https://jestjs.io/)** `^29.7.0` - JavaScript testing framework
- **[@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)** `^16.0.1` - React testing utilities
- **[@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/)** `^6.6.3` - Custom Jest matchers
- **[@types/jest](https://www.npmjs.com/package/@types/jest)** `^29.5.14` - Jest type definitions

### Code Quality
- **[ESLint](https://eslint.org/)** `^8.57.1` - JavaScript/TypeScript linter
- **[eslint-config-next](https://nextjs.org/docs/app/building-your-application/configuring/eslint)** `^14.2.15` - Next.js ESLint configuration

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint
```

## 🏗️ Project Structure

```
care-tracker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css         # Custom CSS utilities
│   │   ├── layout.tsx          # Root layout component
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── onboarding/         # Onboarding flow components
│   │   ├── timeline/           # Timeline view components
│   │   └── ui/                 # Shared UI components
│   ├── store/                  # Zustand state management
│   │   └── careStore.ts        # Main application store
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts            # Shared types and Zod schemas
│   ├── data/                   # Sample data and mock content
│   │   └── sampleTasks.ts      # Demo recovery tasks
│   └── lib/                    # Utility functions
│       └── utils.ts            # Helper functions
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.js             # Next.js configuration
└── README.md                  # This file
```

## 🎯 Key Features

### Onboarding Flow
- **2-step streamlined process**
- **Automatic date/time defaults** - Pre-fills with current date and time
- **PDF upload capability** - Drag-and-drop interface for discharge instructions
- **Form validation** - Real-time validation with user feedback

### State Management
- **Zustand store** with sessionStorage persistence
- **Type-safe state** with TypeScript interfaces
- **Zod schema validation** for data integrity

### Custom CSS Architecture
- **Utility-first approach** without framework dependencies
- **Responsive design** with mobile-first methodology
- **WCAG 2.1 accessibility compliance**
- **Custom utility classes** for consistent styling

## 🔧 Development Notes

### Styling Architecture
The application uses a custom CSS utility system instead of Tailwind CSS to eliminate build tool complexity while maintaining a utility-first approach. All styles are defined in `src/app/globals.css`.

### State Persistence
User data is automatically saved to sessionStorage using Zustand's persistence middleware, ensuring data survives page refreshes during the session.

### Type Safety
The application leverages TypeScript throughout with comprehensive type definitions and Zod schemas for runtime validation.

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start development server**: `npm run dev`
4. **Open browser**: Navigate to `http://localhost:3000`

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production-ready application |
| `npm start` | Start production server |
| `npm test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint code analysis |

## 🔍 Dependencies Explained

### Production Dependencies

- **Next.js**: Provides the React framework with built-in routing, API routes, and optimization
- **React & React DOM**: Core UI library for building component-based interfaces
- **Zustand**: Lightweight state management solution with excellent TypeScript support
- **Zod**: Runtime type validation that complements TypeScript's compile-time checking
- **Lucide React**: Comprehensive icon library with consistent design and tree-shaking support
- **date-fns**: Modular date utility library for handling date formatting and calculations

### Development Dependencies

- **TypeScript**: Adds static type checking to JavaScript for better developer experience
- **Jest & Testing Library**: Comprehensive testing framework with React-specific utilities
- **ESLint**: Code quality tool that enforces consistent coding standards
- **Type Definitions**: Provides TypeScript support for Node.js, React, and Jest

## 🎨 Design Philosophy

- **Simplicity**: Clean, intuitive interface focused on user needs
- **Accessibility**: WCAG 2.1 compliant design for inclusive user experience
- **Performance**: Optimized bundle size and runtime performance
- **Maintainability**: Clear code structure with comprehensive type safety

## 📈 Future Enhancements

- Timeline visualization implementation
- Advanced task management features
- Real-time notifications
- Progressive Web App (PWA) capabilities
- Enhanced PDF processing

---

**Version**: 1.0.0  
**License**: Private  
**Last Updated**: June 2025