import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  name: string;
}

interface Evaluator {
  id: number;
  name: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  evaluator: Evaluator | null;
  isAdmin: boolean;
  isEvaluator: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [evaluator, setEvaluator] = useState<Evaluator | null>(null);

  // Check admin session
  const { data: adminData, isLoading: adminLoading } = useQuery({
    queryKey: ["/api/admin/me"],
    retry: false,
  });

  // Check evaluator session
  const { data: evaluatorData, isLoading: evaluatorLoading } = useQuery({
    queryKey: ["/api/evaluator/me"],
    retry: false,
    enabled: !user, // Only check if not admin
  });

  // Update user state based on query results
  useEffect(() => {
    if (adminData && adminData.user) {
      setUser(adminData.user);
      setEvaluator(null);
    } else if (evaluatorData && evaluatorData.evaluator) {
      setEvaluator(evaluatorData.evaluator);
      setUser(null);
    }
  }, [adminData, evaluatorData]);

  const value: AuthContextType = {
    user,
    evaluator,
    isAdmin: !!user,
    isEvaluator: !!evaluator,
    loading: adminLoading || evaluatorLoading,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: value },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}