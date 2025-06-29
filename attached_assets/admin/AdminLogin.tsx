import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // 회원가입
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        alert("회원가입이 완료되었습니다. 이메일을 확인해주세요.");
      } else {
        // 로그인
        await signIn(email, password);
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      setError(error.message || "처리 중 오류가 발생했습니다.");
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto py-12">
        <div className="w-full max-w-md mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-10 rounded-2xl shadow-xl w-[480px] flex flex-col gap-5 border border-gray-100"
          >
            <div className="flex flex-col items-center mb-2">
              <div className="bg-blue-50 rounded-full p-4 mb-2">
                <svg className="w-14 h-14 text-blue-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.25c-2.25 1.25-6.75 2.25-6.75 2.25v5.25c0 5.25 4.5 8.25 6.75 9.25 2.25-1 6.75-4 6.75-9.25V5.5s-4.5-1-6.75-2.25z" /></svg>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">관리자 로그인</h2>
              <p className="text-gray-500 text-xs font-normal">관리자 비밀번호를 입력하여 접속하세요.</p>
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm text-center">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium leading-none text-gray-900">이메일</label>
              <input
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded px-3 py-2 text-sm text-gray-900 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium leading-none text-gray-900">비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded px-3 py-2 text-sm text-gray-900 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium font-sans focus:outline-none focus:ring-2 focus:ring-primary transition disabled:opacity-50"
            >
              {loading ? "로그인 중..." : (isSignUp ? "회원가입" : "로그인")}
            </button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
              </button>
            </div>

            {/* 테스트용 계정 정보 */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-semibold text-yellow-800 mb-2">테스트용 계정:</p>
              <p className="text-yellow-700">이메일: admin@test.com</p>
              <p className="text-yellow-700">비밀번호: admin123</p>
              <p className="text-xs text-yellow-600 mt-1">
                * 위 계정으로 회원가입 후 로그인하세요
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin; 