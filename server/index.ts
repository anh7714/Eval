import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

// Disable SSL certificate verification for Supabase connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 환경변수 로딩 확인 및 마스킹 출력
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
console.log('🔑 SUPABASE_URL:', supabaseUrl ? supabaseUrl.slice(0, 20) + '...' : '[미설정]');
console.log('🔑 SUPABASE_ANON_KEY:', supabaseAnonKey ? supabaseAnonKey.slice(0, 8) + '...' : '[미설정]');
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  환경변수(SUPABASE_URL, SUPABASE_ANON_KEY)가 누락되었습니다. .env 파일 또는 실행 환경을 확인하세요!');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function initializeSystem() {
  console.log('🔧 Checking system initialization...');
  
  try {
    // 🎯 먼저 Supabase API storage 시스템 초기화
    const { initializeStorage } = await import("./storage-supabase-api");
    await initializeStorage();
    console.log('✅ Storage system initialized');

    // 이제 storage 객체를 import
    const { storage } = await import("./storage-supabase-api");
    
    // 기존 관리자 계정 확인
    const existingAdmin = await storage.getAdminByUsername('admin');
    if (existingAdmin) {
      console.log('✅ Existing admin account found');
    } else {
      console.log('🔧 Creating default admin account...');
      await storage.createAdmin({
        username: 'admin',
        password: 'admin123',
        name: '시스템 관리자'
      });
      console.log('✅ Default admin account created');
    }

    // 기존 시스템 설정 확인
    const existingConfig = await storage.getSystemConfig();
    if (existingConfig) {
      console.log('✅ Existing system config found');
    } else {
      console.log('🔧 Creating default system config...');
      await storage.updateSystemConfig({
        evaluationTitle: '제공기관 선정 심의회 평가표',
        systemName: '평가 기관',
        evaluationEndDate: new Date()
      });
      console.log('✅ Default system config created');
    }

    // 🎯 Supabase에 저장된 템플릿 자동 로드
    console.log('🔍 Checking for existing evaluation templates in Supabase...');
    const existingCategories = await storage.getAllCategories();
    const existingItems = await storage.getAllEvaluationItems();
    
    if (existingCategories.length > 0 && existingItems.length > 0) {
      console.log(`✅ Found existing templates in Supabase:`);
      console.log(`   📋 Categories: ${existingCategories.length}`);
      console.log(`   📝 Evaluation Items: ${existingItems.length}`);
      console.log('🎯 Templates automatically loaded from Supabase!');
      
      // 🔧 ID 기반 점수를 CODE 기반으로 마이그레이션
      console.log('🔄 Starting score migration from ID-based to CODE-based...');
      await storage.migrateScoresToCodeBased();
    } else {
      console.log('⚠️ No evaluation templates found in Supabase');
      console.log('📝 Please create templates via Admin → Evaluation Items Management');
    }

    console.log('✅ System initialization completed');
  } catch (error) {
    console.error('❌ System initialization failed:', error);
  }
}

(async () => {
  await initializeSystem();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5001; // 임시로 5001 포트 사용
  server.listen(port, () => {
    log(`🚀 Server running at http://localhost:${port}`);
  });
})();
