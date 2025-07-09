# EvalFlow

A comprehensive evaluation system for candidate assessment and selection processes.

## 🚀 Features

- **Multi-Role Authentication**: Separate interfaces for administrators and evaluators
- **Candidate Management**: Excel upload support for bulk candidate registration
- **Evaluation Management**: Flexible evaluation criteria and category management
- **Real-time Progress Tracking**: Monitor evaluation progress and completion rates
- **Result Analytics**: Comprehensive reporting and result analysis
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentication**: Session-based authentication
- **File Processing**: Excel file parsing and processing

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/anh7714/EvalFlow.git
cd EvalFlow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
NODE_TLS_REJECT_UNAUTHORIZED=0
```

4. Set up the database:
- Import the database schema to your Supabase project
- The system will automatically create the default admin account

5. Start the development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 👥 Usage

### Administrator Access
- Username: `admin`
- Password: `admin123`
- Access: http://localhost:5173 → Click "관리자"

### Features Available:
- **Candidate Management**: Add, edit, and manage candidates
- **Evaluator Management**: Manage evaluator accounts and permissions
- **Evaluation Setup**: Configure evaluation criteria and categories
- **Progress Monitoring**: Track evaluation progress and completion
- **Result Analysis**: View and export evaluation results

### Evaluator Access
- Use credentials provided by administrator
- Access: http://localhost:5173 → Click "평가자"

## 📁 Project Structure

```
EvalFlow/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage-supabase-api.ts  # Database operations
├── shared/               # Shared TypeScript schemas
└── package.json         # Project dependencies
```

## 🔄 Development

### Available Scripts

- `npm run dev` - Start development servers (frontend + backend)
- `npm run dev:client` - Start frontend only
- `npm run dev:server` - Start backend only
- `npm run build` - Build for production

### API Endpoints

#### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/statistics` - System statistics
- `GET /api/admin/candidates` - Candidate management
- `GET /api/admin/evaluators` - Evaluator management
- `GET /api/admin/evaluation-items` - Evaluation criteria management

#### Evaluator Endpoints
- `POST /api/evaluator/login` - Evaluator authentication
- `GET /api/evaluator/candidates` - Available candidates for evaluation
- `POST /api/evaluator/evaluation` - Submit evaluations
- `GET /api/evaluator/progress` - Evaluation progress

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

Built with ❤️ for efficient evaluation processes 