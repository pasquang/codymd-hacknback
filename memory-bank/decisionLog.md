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
[2025-06-21 11:38:26] - **SAMPLE DATA INTEGRATION DECISION**: Connected loadSampleData() function to onboarding completion process
- **Decision**: Call loadSampleData() immediately after setUserProfile() in OnboardingFlow handleComplete function
- **Rationale**: Provides immediate value to users by populating timeline with realistic care tasks upon setup completion, eliminating empty state and demonstrating application functionality
- **Implementation**: Modified OnboardingFlow.tsx to include loadSampleData import and function call in completion sequence
- **Impact**: Users now see 6 sample tasks (medication, wound care, exercise, hydration, restrictions) with proper scheduling, priorities, and interactive controls immediately after onboarding
- **Testing**: Temporarily modified PDF upload validation to allow completion without file upload for testing purposes
[2025-06-21 11:45:17] - **WIREFRAME-BASED TIMELINE ARCHITECTURE DECISION**: Completely redesigned timeline component to match care-tracker-wireframe.html specifications
- **Decision**: Replace existing card-based timeline with wireframe-accurate vertical timeline design
- **Rationale**: 
  - Original timeline didn't match the medical-grade interface shown in wireframes
  - Wireframe design provides better visual hierarchy for critical recovery information
  - Emergency information prominence is crucial for patient safety
  - Time-based vertical layout better represents hourly recovery schedule
- **Implementation**: 
  - Rebuilt TimelineView.tsx with wireframe structure (header, emergency, controls, timeline)
  - Added comprehensive CSS matching wireframe styling exactly
  - Implemented interactive features: emergency accordion, task checkboxes, view toggles
  - Maintained existing Zustand state management and task completion logic
- **Impact**: 
  - Timeline now provides medical-grade user experience matching wireframe
  - Emergency information prominently displayed for patient safety
  - Better visual distinction between activity types (can-do/cannot-do/caution)
  - Improved mobile responsiveness and accessibility
  - All existing functionality preserved while dramatically improving UX
[2025-06-21 11:48:15] - **PDF INTEGRATION ANALYSIS DECISION**: Comprehensive analysis of Claude PDF output vs Care Tracker requirements completed
- **Current PDF Output Limitations**: 
  - Only provides basic time_frames with time/unit/message/type fields
  - Missing critical Care Tracker data types: id, title, description, TaskType enums, priority, scheduling, instructions, metadata
  - Lacks medical context: emergency info, medication details, procedure information
  - Generic type classification (0/1) instead of specific TaskType enums (MEDICATION, WOUND_CARE, etc.)
- **Required Enhancements**:
  - Enhanced schema with procedure_info, emergency_info, structured tasks array, medications array
  - Proper TaskType/TaskPriority/TaskCategory mapping
  - Metadata extraction (confidence, source, pageNumber)
  - Scheduled timing and duration estimation
  - Step-by-step instructions array
- **Integration Strategy**:
  - Phase 1: API design with POST /api/pdf/upload, GET /api/tasks endpoints
  - Phase 2: Enhanced PDF parser with Claude API integration
  - Phase 3: Frontend integration replacing loadSampleData() with real API calls
  - Phase 4: Real-time features and notification system
- **Impact**: This analysis provides clear roadmap for transforming basic PDF text extraction into comprehensive medical care task management system
[2025-06-21 11:58:49] - **PRIORITY SYSTEM REDESIGN DECISION**: Replaced TaskPriority enum with binary TaskActionType system
- **User Request**: Replace priority levels (high, medium, low) with simple "do or do not" flag using red and green colors
- **Implementation**: 
  - Removed TaskPriority enum (LOW/MEDIUM/HIGH/CRITICAL)
  - Added TaskActionType enum with DO (green) and DO_NOT (red) values
  - Updated all CareTask interfaces to use actionType instead of priority
  - Modified sample data: most tasks set to DO, activity restrictions set to DO_NOT
  - Updated TimelineView.tsx to use actionType for styling (DO_NOT tasks get caution styling)
  - Updated careStore.ts filtering logic to use actionType
- **Rationale**: 
  - Simplifies user interface to binary decision making
  - Aligns with Claude PDF output which already uses type 0/1 system
  - Red/green color coding provides clear visual distinction
  - Reduces cognitive load for patients in recovery
- **Impact**: 
  - All TypeScript compilation errors resolved
  - Application now uses simplified binary action system
  - Better alignment with medical discharge instruction format
  - Clearer visual hierarchy with red (restrictions) vs green (recommended actions)
[2025-06-21 12:46:58] - **Form Input Bug Fix**: Resolved critical React state issue where form inputs only allowed single character entry. Root cause was component functions being redefined on every render, breaking React's reconciliation. Solution: Moved screen rendering logic directly into switch statement within renderCurrentScreen function to prevent component recreation on each render.