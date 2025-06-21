# Decision Log

This file records architectural and implementation decisions using a list format.
2025-06-21 10:34:56 - Log of updates made.

## Decision: Data Persistence Strategy

**Decision**: Use Zustand with sessionStorage persistence for all application state
**Rationale**: Provides automatic state hydration, type safety, and aligns with technical plan specifications
**Implementation Details**: Configure Zustand store with createJSONStorage(() => sessionStorage) as specified

## Decision: Real-time Updates Approach

**Decision**: Start with polling for notifications, implement Web Push API as enhancement
**Rationale**: Polling is simpler for demo scope, Web Push can be added later without architectural changes
**Implementation Details**: Use setInterval for periodic updates, design notification system to support both approaches

## Decision: Component Architecture

**Decision**: Build custom component library using Tailwind CSS and Lucide React icons
**Rationale**: Full control over design, no external dependencies, aligns with wireframe designs
**Implementation Details**: Create base components (Button, Card, Progress) with consistent API patterns

## Decision: Testing Strategy

**Decision**: Test-driven development with pragmatic approach for demo iteration
**Rationale**: Ensures code quality while allowing flexibility during rapid prototyping phase
**Implementation Details**: Jest + React Testing Library, focus on core user flows, allow test failures during iteration

## Decision: Browser Support & Performance

**Decision**: Target Chrome, Safari, Edge with WCAG 2.1 compliance and good Lighthouse scores
**Rationale**: Covers majority of users while maintaining high quality standards
**Implementation Details**: Mobile-first responsive design, Core Web Vitals optimization, accessibility testing
[2025-06-21 11:01:29] - STYLING ARCHITECTURE DECISION: Switched from Tailwind CSS to Custom CSS Utilities
- **Issue**: PostCSS configuration conflicts with Tailwind CSS preventing application from running
- **Decision**: Adopt custom CSS utility classes approach instead of Tailwind CSS
- **Rationale**: 
  - Application functionality takes priority over specific styling framework
  - Custom utilities provide full control and no build dependencies
  - Maintains utility-first approach similar to Tailwind
  - Eliminates PostCSS configuration complexity
- **Impact**: 
  - Remove all Tailwind CSS dependencies and configuration files
  - Update technical implementation plan to reflect custom CSS approach
  - Continue with utility-first styling methodology
  - No impact on application functionality or user experience
[2025-06-21 11:07:22] - **IMPLEMENTATION PLAN UPDATED**: Created comprehensive updated technical implementation plan reflecting custom CSS utilities approach. Document includes completed Phase 1 achievements, updated architecture decisions, and roadmap for Phase 2-5. Plan now accurately reflects Tailwind-free codebase and custom styling methodology.
[2025-06-21 11:13:19] - **ONBOARDING FLOW SIMPLIFIED**: Redesigned onboarding from 3-step to 2-step process based on user feedback. Removed emergency contact and doctor information collection (now using default placeholders). Added discharge time field with current time default. Implemented comprehensive PDF upload step with drag-and-drop interface, file validation, and user feedback. This streamlines the user experience while maintaining core functionality for care timeline generation.