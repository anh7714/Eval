# Evaluation System

## Overview

This is a comprehensive evaluation management system built for government/professional use cases. The system enables administrators to manage evaluators, candidates, and evaluation criteria, while providing evaluators with an interface to score candidates across multiple dimensions. The platform supports data import/export, progress tracking, and results aggregation.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state, React Context for auth
- **Font**: PT Sans (professional government-style typography)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage
- **File Processing**: XLSX library for Excel import/export functionality

### Build System
- **Frontend Bundler**: Vite with React plugin
- **Development**: Hot module replacement with runtime error overlay
- **TypeScript**: Strict configuration with path mapping
- **Production**: Static file serving with Express

## Key Components

### Authentication System
- **Admin Authentication**: Username/password based admin login
- **Evaluator Authentication**: Name/password based evaluator login
- **Session Management**: Server-side sessions with role-based access control
- **Route Protection**: Protected routes for admin and evaluator areas

### Data Management
- **Excel Import/Export**: Upload candidate lists, evaluator data, and evaluation items
- **Database Schema**: Comprehensive schema covering all evaluation entities
- **Data Validation**: Zod schemas for runtime type validation
- **Progress Tracking**: Real-time evaluation completion status

### User Interfaces
- **Admin Dashboard**: Complete CRUD operations for all system entities
- **Evaluator Interface**: Streamlined evaluation forms with progress indicators
- **Results Display**: Comprehensive scoring and ranking visualizations
- **Responsive Design**: Mobile-friendly layouts with professional styling

## Data Flow

### Admin Workflow
1. Admin logs in through dedicated admin portal
2. System configuration and branding setup
3. Import/manage evaluators, candidates, and evaluation criteria
4. Monitor evaluation progress across all evaluators
5. Generate and export final results

### Evaluator Workflow
1. Evaluator logs in with credentials provided by admin
2. View assigned candidates and evaluation progress
3. Complete evaluation forms with scoring and comments
4. Submit evaluations with final confirmation
5. Track completion status across all assignments

### Data Processing
1. Excel files parsed and validated before import
2. Evaluation scores aggregated with weighted calculations
3. Real-time progress updates across user sessions
4. Results ranked and formatted for export

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL hosting
- **Connection Pooling**: Built-in connection management
- **Environment**: DATABASE_URL configuration required

### Frontend Libraries
- **UI Components**: Comprehensive Radix UI component library
- **Styling**: Tailwind CSS with custom design system
- **Data Fetching**: TanStack Query for server communication
- **File Processing**: XLSX for client-side Excel handling

### Development Tools
- **Replit Integration**: Development environment with cartographer plugin
- **Error Handling**: Runtime error modal for development
- **TypeScript**: Full type safety across frontend and backend

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express API
- **Hot Reloading**: Automatic refresh on file changes
- **Error Overlay**: Development-time error reporting
- **Environment Variables**: Local .env configuration

### Production Build
- **Frontend**: Static assets built with Vite
- **Backend**: Node.js server with bundled dependencies
- **Database**: Drizzle migrations for schema management
- **Process**: Single-command build and deployment

### Environment Configuration
- **Database**: PostgreSQL connection string required
- **Sessions**: Configurable session secret for security
- **File Uploads**: Client-side Excel processing (no server storage)

## Changelog
- June 29, 2025. Initial setup
- June 29, 2025. Updated UI/UX to minimal design with Korean interface improvements

## Recent Changes
- ✓ Redesigned home page with minimal, clean aesthetics
- ✓ Renamed portals: "평가위원", "관리자", "결과 조회" 
- ✓ Reordered portal cards (평가위원 first, then 관리자, then 결과 조회)
- ✓ Added top navigation tabs for better accessibility
- ✓ Removed unnecessary "전문적인 평가 관리 시스템" description section
- ✓ Applied clean white background and subtle shadows
- ✓ Simplified statistics cards with light typography
- ✓ Used minimal icon backgrounds with soft colors

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Minimal, clean design inspired by modern government systems.
Interface language: Korean with professional terminology.