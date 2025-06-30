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
- ✓ EvalMaster Pro 스타일 완전 적용 (2025.06.30)
- ✓ 현대적인 타이포그래피 시스템으로 전환: System UI 폰트 스택 적용
- ✓ 향상된 타이포그래피 스케일: text-display, text-heading-*, text-body-* 클래스 구현
- ✓ 홈페이지 완전 재디자인: EvalMaster Pro 스타일의 3-카드 레이아웃
- ✓ 로그인 페이지 현대화: 관리자 및 평가자 로그인 페이지 Tabler 스타일 적용
- ✓ 개선된 카드 컴포넌트: 호버 효과, 그림자, 인터랙션 애니메이션 추가
- ✓ 색상 시스템 최적화: 슬레이트 기반 색상 팔레트로 전환
- ✓ 반응형 디자인 강화: 모바일 우선 접근법 적용

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Minimal, clean design inspired by modern government systems.
Interface language: Korean with professional terminology.