import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Loader2, Shield } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password, "admin");
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="icon-circle">
            <Shield className="icon-xl" />
          </div>
          <h1 className="main-title text-center">👥 관리자 로그인</h1>
          <p className="body-text text-center text-muted">
            시스템 관리자 권한으로 로그인합니다
          </p>
        </div>

        {error && (
          <div className="mb-6" style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            borderColor: '#fecaca',
            color: '#991b1b',
            borderRadius: 'var(--border-radius)',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">사용자명</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="관리자 사용자명을 입력하세요"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg mb-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="icon animate-pulse" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <div className="text-center">
          <Link href="/">
            <span className="body-text text-muted" style={{ textDecoration: 'none' }}>
              ← 홈으로 돌아가기
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}