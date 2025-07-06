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
- ✓ 코드 롤백 완료 (2025.06.30)
- ✓ 홈페이지와 로그인 페이지들을 이전 안정된 상태로 복원
- ✓ 기본 Tailwind CSS 및 shadcn/ui 컴포넌트 시스템 유지
- ✓ 그라데이션 배경과 모던한 카드 레이아웃 보존
- ✓ 반응형 디자인 및 다크모드 지원 유지
- ✓ TanStack Query v5 호환성 수정 및 시스템 설정 저장 기능 복원 (2025.07.01)
- ✓ 관리자 계정 자동 생성 기능 구현 (admin/admin123)
- ✓ 누락된 API 엔드포인트 추가 및 세션 인증 문제 해결
- ✓ 관리자 비밀번호 초기화 기능 추가
- ✓ 엑셀 업로드/다운로드 기능 완전 구현 (2025.07.01)
- ✓ 파일 기반 저장소 구현으로 데이터 지속성 확보 (data.json)
- ✓ 후보자 예시파일 다운로드 템플릿 제공
- ✓ Supabase 연결 문제 해결 시도 (SASL 인증 및 DNS 문제로 Replit 환경 제한 확인)
- ✓ Supabase 수동 설정 SQL 스크립트 제공 (supabase-setup.sql)
- ✓ 현재 파일 기반 저장소로 모든 기능 완전 작동
- ✓ 배치 인쇄 기능 완전 구현 (2025.07.04)
- ✓ 화면 표시와 완전히 동일한 인쇄 구조로 개별/배치 인쇄 기능 재구현
- ✓ 2개 테이블 구조 (제목/구분 정보 + 평가 항목) 적용
- ✓ A4 용지 크기와 25mm 상단 여백 설정
- ✓ 정확한 rowspan을 사용한 구분별 항목 병합
- ✓ 배점과 합계 점수 정확한 계산 및 표시
- ✓ 모든 평가위원과 평가대상자 조합으로 심사표 자동 생성
- ✓ 인쇄 미리보기 텍스트 정렬 최적화 (2025.07.04)
- ✓ 유형, 배점, 평가점수 열의 모든 데이터 가운데 정렬 적용
- ✓ 합계 행의 모든 데이터 가운데 정렬 적용
- ✓ 세로 방향 가운데 정렬(vertical-align: middle) 추가
- ✓ 개별 인쇄와 배치 인쇄 모두 동일한 정렬 스타일 적용
- ✓ 평가결과 페이지 구조 완전 재설계 (2025.07.04)
- ✓ 새로운 3단계 구조 구현: 🏆 순위, 📋 상세결과, 📊 통계
- ✓ 순위 섹션 5개 하위 탭: 종합순위, 항목별순위, 동점자처리, 탈락현황, 최종선정
- ✓ 실용적인 합격/불합격 처리 로직 및 기준점수 시스템
- ✓ 관리자 화면과 동일한 상단 헤더 네비게이션 구조
- ✓ 불필요한 중복 코드 제거 및 깔끔한 코드 구조화
- ✓ 용어 통일: "후보자" → "평가대상"으로 전면 변경 (2025.07.04)
- ✓ 헤더 메뉴, 관리자 화면, 평가자 화면 모든 UI 텍스트 수정
- ✓ 일관된 용어 사용으로 사용자 혼동 방지
- ✓ 평가대상 관리 필드명 변경 (2025.07.04)
- ✓ 이름 → 기관명(성명), 부서 → 소속(부서), 직책 → 직책(직급)
- ✓ 엑셀 업로드/다운로드 템플릿과 데이터 내보내기 컬럼명 업데이트
- ✓ 평가자 로그인 UI 개선 (2025.07.04)
- ✓ 평가자명을 관리자가 등록한 평가자 목록에서 선택하는 드롭다운으로 변경
- ✓ 평가자 로그인 화면에서 상단 메뉴 숨김 처리로 로그인 후 화면으로만 접근 가능
- ✓ 전체 애플리케이션 드롭다운 디자인 통합 (2025.07.05)
- ✓ 모든 Select 컴포넌트에 일관된 고급스러운 디자인 적용
- ✓ z-index 9999로 드롭다운 겹침 문제 완전 해결
- ✓ 각 페이지별 색상 테마로 드롭다운 구분 (후보자관리: 파랑/보라, 평가자로그인: 초록, 결과페이지: 호박/인디고)
- ✓ hover 효과와 부드러운 애니메이션으로 사용자 경험 향상
- ✓ GitHub CodeBridge 프로젝트 데이터 통합 (2025.07.06)
- ✓ 마이그레이션 관련 코드 완전 제거 및 시스템 정리
- ✓ CodeBridge 종합평가시스템으로 시스템명 변경
- ✓ 정부기관 평가자 3명 추가 (김평가, 이심사, 박검토)
- ✓ IT 전문 평가 카테고리 4개 구성 (기술역량, 의사소통, 문제해결, 리더십)
- ✓ 세부 평가 항목 9개 생성 (가중치 및 배점 설정 포함)
- ✓ 주요 IT기업 출신 평가대상 5명 추가 (실무 경험 기반 프로필)

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Minimal, clean design inspired by modern government systems.
Interface language: Korean with professional terminology.