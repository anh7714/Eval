import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ResultsManagement from "./ResultsManagement";
import EvaluatorManagement from "./EvaluatorManagement";
import CandidateManagement from "./CandidateManagement";
import EvaluationItemManagement from "./EvaluationItemManagement";
import SystemSettings from "./SystemSettings";
import { ChartBarIcon, UsersIcon, ClipboardIcon, CheckCircleIcon, CogIcon } from "@heroicons/react/24/solid";

const tabs = [
  { name: "평가 결과 관리", icon: <ChartBarIcon className="w-5 h-5" /> },
  { name: "평가위원 관리", icon: <CheckCircleIcon className="w-5 h-5" /> },
  { name: "평가 대상자 관리", icon: <UsersIcon className="w-5 h-5" /> },
  { name: "평가 항목 관리", icon: <ClipboardIcon className="w-5 h-5" /> },
  { name: "시스템 설정", icon: <CogIcon className="w-5 h-5" /> },
];

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs[0].name);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="w-full min-h-screen px-8 py-8 bg-gray-50">
      <h1 className="font-pt text-4xl font-bold tracking-tight text-primary mb-8">관리자 페이지</h1>
      <nav className="flex justify-center gap-8 mb-8 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`py-3 px-6 text-lg font-semibold border-b-2 transition-colors ${
              activeTab === tab.name
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-primary/80"
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.name}</span>
          </button>
        ))}
      </nav>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeTab === "평가 결과 관리" && <ResultsManagement />}
        {activeTab === "평가위원 관리" && <EvaluatorManagement />}
        {activeTab === "평가 대상자 관리" && <CandidateManagement />}
        {activeTab === "평가 항목 관리" && <EvaluationItemManagement />}
        {activeTab === "시스템 설정" && <SystemSettings />}
      </section>
    </div>
  );
};

export default AdminDashboard; 