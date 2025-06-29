import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import Select, { components } from "react-select";

const EvaluatorLogin = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [evaluators, setEvaluators] = useState<any[]>([]); // 평가위원 목록

  const navigate = useNavigate();

  useEffect(() => {
    // 평가위원 목록 불러오기
    const fetchEvaluators = async () => {
      const { data, error } = await supabase
        .from("evaluators")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (!error) setEvaluators(data || []);
    };
    fetchEvaluators();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 평가위원 테이블에서 인증 확인
      const { data, error } = await supabase
        .from("evaluators")
        .select("*")
        .eq("name", name)
        .eq("password", password)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        throw new Error("이름 또는 비밀번호가 올바르지 않습니다.");
      }

      // 로그인 성공 - 세션에 평가위원 정보 저장
      localStorage.setItem("evaluator", JSON.stringify(data));
      navigate("/evaluator/dashboard");
    } catch (error: any) {
      setError(error.message || "로그인에 실패했습니다.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  // react-select 옵션 변환
  const options = evaluators.map(ev => ({
    value: ev.name,
    label: ev.name,
  }));

  // 체크마크 커스텀
  const Option = (props: any) => (
    <components.Option {...props}>
      <span style={{
        display: "inline-block",
        width: 24,
        color: props.isSelected ? "#7c3aed" : "transparent", // purple-600
        fontSize: 18,
        marginRight: 2,
      }}>
        {props.isSelected ? "✔" : ""}
      </span>
      {props.label}
    </components.Option>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 컴포넌트가 상단에 위치한다고 가정 */}
      <main className="container mx-auto py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-lg border bg-white text-gray-900 shadow-sm w-full max-w-md">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-10 rounded-2xl shadow-xl w-[480px] flex flex-col gap-5 border border-gray-100"
            >
              <div className="flex flex-col items-center mb-2">
                {/* 아이콘 */}
                <div className="bg-blue-50 rounded-full p-4 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-users h-14 w-14 text-blue-800"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="tracking-tight mt-4 text-2xl font-bold text-center">
                  평가 위원 로그인
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  이름을 선택하고 비밀번호를 입력하세요.
                </div>
              </div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm text-center">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium leading-none text-gray-900">평가 위원</label>
                <Select
                  options={options}
                  value={options.find(opt => opt.value === name) || null}
                  onChange={opt => setName(opt?.value || "")}
                  placeholder="이름을 선택하세요"
                  isSearchable={false}
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      minHeight: 40,
                      fontSize: 14,
                      fontWeight: 400,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      boxShadow: "none",
                      paddingLeft: 0,
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#111827", // gray-900
                      paddingLeft: 0,
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#9ca3af",
                      paddingLeft: 0,
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      fontSize: 14,
                      fontWeight: 400,
                      backgroundColor: state.isSelected
                        ? "#ede9fe"
                        : state.isFocused
                        ? "#ede9fe"
                        : "#fff",
                      color: "#1e293b",
                      paddingTop: 10,
                      paddingBottom: 10,
                      paddingLeft: 12,
                      borderRadius: 0,
                      display: "flex",
                      alignItems: "center",
                    }),
                    menu: (provided) => ({
                      ...provided,
                      zIndex: 20,
                      borderRadius: 8,
                    }),
                    dropdownIndicator: (provided) => ({
                      ...provided,
                      padding: 8,
                    }),
                    indicatorSeparator: () => ({
                      display: "none",
                    }),
                  }}
                  value={name ? options.find(opt => opt.value === name) : null}
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
                {loading ? "로그인 중..." : "채점 페이지로 이동"}
              </button>

              {/* 테스트용 계정 정보 */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <p className="font-semibold text-yellow-800 mb-2">테스트용 계정:</p>
                <p className="text-yellow-700">이름: 평가위원1</p>
                <p className="text-yellow-700">비밀번호: evaluator123</p>
                <p className="text-xs text-yellow-600 mt-1">
                  * 관리자 페이지에서 평가위원을 먼저 추가하세요
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EvaluatorLogin; 