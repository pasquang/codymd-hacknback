# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2025-06-21 10:34:37 - Log of updates made will be appended as footnotes to the end of this file.

## Project Goal

Care Tracker is a frontend web application that transforms complex medical discharge instructions into an intuitive, timeline-based recovery companion. The app helps patients follow their post-procedure care plans through personalized daily schedules, smart notifications, and progress tracking.

## Key Features

* **PDF Document Processing**: Upload and parse medical discharge instructions
* **Interactive Timeline View**: Hourly and daily views of recovery activities
* **Smart Notifications**: Contextual reminders for medications, restrictions, and milestones
* **Progress Analytics**: Visual tracking of completion rates and recovery milestones
* **Task Management**: Comprehensive view of all activities with filtering and search
* **Onboarding Flow**: Guided setup with patient information and preferences
* **Emergency Information**: Quick access to critical warning signs and contact numbers

## Overall Architecture

**Frontend Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand for state management
**Key Components**: Timeline container, activity cards, notification system, progress tracking
**Data Models**: Timeline activities, user profiles, care documents, emergency information
**Demo Features**: Mock PDF parsing, session storage, sample data for heart catheterization recovery