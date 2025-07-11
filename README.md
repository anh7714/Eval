# 평가 시스템 (Evaluation System)

## 개요
돌봄SOS 서비스 제공기관 선정을 위한 종합 평가 시스템입니다. 관리자는 평가 항목을 설정하고 평가위원을 관리할 수 있으며, 평가위원은 각 평가대상을 체계적으로 평가할 수 있습니다.

## 주요 기능

### 관리자 기능
- 📋 **평가 항목 관리**: 카테고리별 평가 항목 설정 및 관리
- 👥 **평가위원 관리**: 평가위원 계정 생성 및 관리
- 🏢 **평가대상 관리**: 평가 대상 기관 등록 및 관리
- 📊 **평가 결과 조회**: 실시간 평가 진행 상황 및 결과 확인
- 🖨️ **보고서 출력**: 평가 결과 보고서 생성 및 출력

### 평가위원 기능
- 📝 **평가 수행**: 체계적인 평가 양식을 통한 평가 진행
- 📈 **진행률 확인**: 개인별 평가 진행률 실시간 확인
- 💾 **임시 저장**: 평가 중 임시 저장 및 이어서 작성

### 공통 기능
- 🔐 **보안 인증**: 역할 기반 접근 제어
- 📱 **반응형 디자인**: 모바일 및 태블릿 지원
- 🌐 **실시간 동기화**: 데이터 실시간 업데이트

## 기술 스택

### Frontend
- **React** - 사용자 인터페이스
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **Vite** - 빌드 도구
- **React Query** - 데이터 상태 관리

### Backend
- **Node.js** - 서버 런타임
- **Express** - 웹 프레임워크
- **TypeScript** - 타입 안정성
- **Supabase** - 데이터베이스 및 인증
- **Drizzle ORM** - 데이터베이스 ORM

### Database
- **PostgreSQL** (Supabase)
- **실시간 데이터베이스** 지원

## 설치 및 실행

### 필요 조건
- Node.js 18.0 이상
- npm 또는 yarn

### 환경 설정
1. 저장소 클론
```bash
git clone https://github.com/anh7714/Eval.git
cd Eval
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_TLS_REJECT_UNAUTHORIZED=0
```

4. 개발 서버 실행
```bash
npm run dev
```

## 프로젝트 구조
```
├── client/                 # 프론트엔드 소스
│   ├── src/
│   │   ├── components/     # 재사용 가능한 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   └── lib/           # 유틸리티 함수
├── server/                # 백엔드 소스
│   ├── index.ts           # 서버 진입점
│   ├── routes.ts          # API 라우터
│   └── storage-supabase-api.ts  # 데이터베이스 API
├── shared/                # 공통 스키마 및 타입
└── package.json
```

## 주요 API 엔드포인트

### 관리자 API
- `GET /api/admin/evaluation-items` - 평가 항목 조회
- `POST /api/admin/evaluation-items` - 평가 항목 생성
- `GET /api/admin/candidates` - 평가대상 조회
- `POST /api/admin/candidates` - 평가대상 생성
- `GET /api/admin/results` - 평가 결과 조회

### 평가위원 API
- `GET /api/evaluator/candidates` - 평가대상 목록
- `POST /api/evaluator/evaluation` - 평가 제출
- `GET /api/evaluator/progress` - 평가 진행률

## 데이터베이스 스키마

### 주요 테이블
- `evaluation_items` - 평가 항목
- `evaluation_categories` - 평가 카테고리
- `candidates` - 평가 대상
- `evaluators` - 평가위원
- `evaluations` - 평가 결과
- `system_config` - 시스템 설정

## 기여하기
1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 라이선스
MIT License

## 연락처
- 개발자: [GitHub Profile](https://github.com/anh7714)
- 이슈 제보: [GitHub Issues](https://github.com/anh7714/Eval/issues) 