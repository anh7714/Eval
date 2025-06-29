import React from "react";
import { Link } from "react-router-dom";
import { useSystemName } from "../contexts/SystemNameContext";

// Lucide Users 아이콘
const UsersIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide lucide-users h-8 w-8 text-blue-800 ${props.className || ''}`}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// 파란색 라인 SVG 아이콘 (Heroicons 스타일)
const ShieldIcon = (props: any) => (
  <svg className={`w-9 h-9 text-blue-800 ${props.className || ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.25c-2.25 1.25-6.75 2.25-6.75 2.25v5.25c0 5.25 4.5 8.25 6.75 9.25 2.25-1 6.75-4 6.75-9.25V5.5s-4.5-1-6.75-2.25z" />
  </svg>
);
const TrophyIcon = (props: any) => (
  <svg className={`w-9 h-9 text-blue-800 ${props.className || ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21h7.5M12 17.25V21m7.5-13.5v2.25A5.25 5.25 0 0114.25 15h-4.5A5.25 5.25 0 014.5 9.75V7.5m15 0V5.25A2.25 2.25 0 0017.25 3h-10.5A2.25 2.25 0 004.5 5.25V7.5m15 0h1.125a2.25 2.25 0 012.25 2.25v.75a2.25 2.25 0 01-2.25 2.25H19.5m-15 0H3.375A2.25 2.25 0 011.125 10.5v-.75A2.25 2.25 0 013.375 7.5H4.5" />
  </svg>
);
// 새로운 Home 아이콘 (Heroicons)
const HomeIcon = () => (
  <svg className="w-7 h-7 text-blue-700 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-7 9 7M4 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6" />
  </svg>
);

const cardClass =
  "group w-[490px] h-[150px] bg-white rounded-2xl shadow transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-gray-200 hover:border-blue-400 flex flex-row items-start py-8 px-10 cursor-pointer select-none";

const HomePage = () => {
  const { name } = useSystemName();

  return (
    <div className="min-h-screen bg-gray-50 font-pt">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary">{name}</h1>
            <p className="mt-4 text-lg text-gray-500">정확하고 효율적인 채점 및 집계 시스템</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 font-pt">
            <Link to="/evaluator/login" className="block group w-full max-w-[608px] h-[150px] mx-auto">
              <div className="rounded-lg border bg-white text-gray-900 shadow-sm h-full transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2 hover:border-primary flex flex-col justify-between">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="flex items-center gap-4">
                    <UsersIcon className="h-8 w-8 text-blue-800" />
                    <div>
                      <div className="tracking-tight text-2xl font-bold">평가 위원</div>
                      <div className="text-sm text-gray-500 mt-1">채점을 진행하고 결과를 제출합니다.</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="flex items-center justify-end text-sm font-semibold text-primary cursor-pointer select-none group-hover:text-primary/80 transition-colors">
                    이동하기
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/admin/login" className="block group w-full max-w-[608px] h-[150px] mx-auto">
              <div className="rounded-lg border bg-white text-gray-900 shadow-sm h-full transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2 hover:border-primary flex flex-col justify-between">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="flex items-center gap-4">
                    <ShieldIcon className="h-8 w-8 text-blue-800" strokeWidth={2} />
                    <div>
                      <div className="tracking-tight text-2xl font-bold">관리자</div>
                      <div className="text-sm text-gray-500 mt-1">시스템 설정을 관리하고 결과를 집계합니다.</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="flex items-center justify-end text-sm font-semibold text-primary cursor-pointer select-none group-hover:text-primary/80 transition-colors">
                    이동하기
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/results" className="block group w-full max-w-[608px] h-[150px] mx-auto">
              <div className="rounded-lg border bg-white text-gray-900 shadow-sm h-full transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2 hover:border-primary flex flex-col justify-between">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="flex items-center gap-4">
                    <TrophyIcon className="h-8 w-8 text-blue-800" strokeWidth={2} />
                    <div>
                      <div className="tracking-tight text-2xl font-bold">채점 결과</div>
                      <div className="text-sm text-gray-500 mt-1">종합 채점 결과를 확인합니다.</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="flex items-center justify-end text-sm font-semibold text-primary cursor-pointer select-none group-hover:text-primary/80 transition-colors">
                    이동하기
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage; 