import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Download, Save, X, Printer, Edit3, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function EvaluationItemManagement() {
  const [viewMode, setViewMode] = useState<'template' | 'management'>('template');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const { toast } = useToast();

  // 데이터 쿼리들
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/admin/evaluation-items"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const { data: evaluators = [], isLoading: evaluatorsLoading } = useQuery({
    queryKey: ["/api/admin/evaluators"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/admin/candidates"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">평가항목 관리</h1>
              <p className="text-gray-600 mt-1">평가 기준과 항목을 관리하고 평가표를 구성합니다.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setViewMode('template')}
              variant={viewMode === 'template' ? 'default' : 'outline'}
            >
              심사표 보기
            </Button>
            <Button
              onClick={() => setViewMode('management')}
              variant={viewMode === 'management' ? 'default' : 'outline'}
            >
              관리모드
            </Button>
          </div>
        </div>

        {viewMode === 'template' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">평가표 템플릿 보기</h2>
              <p className="text-gray-600">평가표 템플릿을 확인하고 인쇄할 수 있습니다.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">평가항목 관리</h2>
              <p className="text-gray-600">평가 기준과 항목을 추가하고 수정합니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}