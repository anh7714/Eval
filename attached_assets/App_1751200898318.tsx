import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SystemNameProvider } from "./contexts/SystemNameContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CandidateManagement from "./pages/admin/CandidateManagement";
import EvaluatorManagement from "./pages/admin/EvaluatorManagement";
import EvaluationItemManagement from "./pages/admin/EvaluationItemManagement";
import ResultsManagement from "./pages/admin/ResultsManagement";
import SystemSettings from "./pages/admin/SystemSettings";
import EvaluatorLogin from "./pages/evaluator/EvaluatorLogin";
import EvaluatorDashboard from "./pages/evaluator/EvaluatorDashboard";
import EvaluationForm from "./pages/evaluator/EvaluationForm";

const App: React.FC = () => {
  // const location = useLocation();
  // const isAdminPage = location.pathname.startsWith("/admin");
  return (
    <div className="bg-gray-50 min-h-screen">
      <SystemNameProvider>
        <Header />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/candidates" 
              element={
                <ProtectedRoute>
                  <CandidateManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/evaluators" 
              element={
                <ProtectedRoute>
                  <EvaluatorManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/items" 
              element={
                <ProtectedRoute>
                  <EvaluationItemManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/results" 
              element={
                <ProtectedRoute>
                  <ResultsManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute>
                  <SystemSettings />
                </ProtectedRoute>
              } 
            />
            <Route path="/evaluator/login" element={<EvaluatorLogin />} />
            <Route path="/evaluator/dashboard" element={<EvaluatorDashboard />} />
            <Route path="/evaluator/form/:candidateId" element={<EvaluationForm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </SystemNameProvider>
    </div>
  );
};

export default App; 