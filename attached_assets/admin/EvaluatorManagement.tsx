import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ExcelUpload from "../../components/ExcelUpload";
import { PencilSquareIcon, MinusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Evaluator {
  id: number;
  name: string;
  email: string;
  department: string;
  password: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EvaluatorManagement = () => {
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvaluator, setEditingEvaluator] = useState<Evaluator | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });

  useEffect(() => {
    fetchEvaluators();
  }, []);

  const fetchEvaluators = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluators")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setEvaluators(data || []);
    } catch (error) {
      console.error("평가위원 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEvaluator) {
        // 수정
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          department: formData.department,
          updated_at: new Date().toISOString(),
        };
        
        // 비밀번호가 입력된 경우에만 업데이트
        if (formData.password) {
          updateData.password = formData.password;
        }

        const { error } = await supabase
          .from("evaluators")
          .update(updateData)
          .eq("id", editingEvaluator.id);

        if (error) throw error;
      } else {
        // 추가
        const { error } = await supabase
          .from("evaluators")
          .insert([{
            ...formData,
            password: formData.password || "evaluator123", // 기본 비밀번호
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingEvaluator(null);
      resetForm();
      fetchEvaluators();
    } catch (error) {
      console.error("평가위원 저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const handleEdit = (evaluator: Evaluator) => {
    setEditingEvaluator(evaluator);
    setFormData({
      name: evaluator.name,
      email: evaluator.email || "",
      department: evaluator.department || "",
      password: "", // 보안상 비밀번호는 표시하지 않음
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("evaluators")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchEvaluators();
    } catch (error) {
      console.error("평가위원 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleToggleActive = async (evaluator: Evaluator) => {
    try {
      const { error } = await supabase
        .from("evaluators")
        .update({ 
          is_active: !evaluator.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", evaluator.id);

      if (error) throw error;
      fetchEvaluators();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경에 실패했습니다.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      department: "",
      password: "",
    });
  };

  const handleExcelUpload = async (data: any[]) => {
    try {
      const evaluatorsData = data.map((row, index) => ({
        name: row.name || row.이름 || row.성명 || "",
        email: row.email || row.이메일 || "",
        department: row.department || row.부서 || row.소속 || "",
        password: row.password || row.비밀번호 || "evaluator123",
      }));

      const { error } = await supabase
        .from("evaluators")
        .insert(evaluatorsData);

      if (error) throw error;
      
      alert("엑셀 데이터가 성공적으로 업로드되었습니다.");
      fetchEvaluators();
    } catch (error) {
      console.error("엑셀 업로드 실패:", error);
      alert("엑셀 업로드에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                부서
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {evaluators.map((evaluator) => (
              <tr key={evaluator.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {evaluator.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {evaluator.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {evaluator.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      evaluator.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {evaluator.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(evaluator.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(evaluator)}
                    className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
                    title="수정"
                  >
                    <PencilSquareIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(evaluator)}
                    className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none ${evaluator.is_active ? "text-red-600" : "text-green-600"}`}
                    title={evaluator.is_active ? "비활성화" : "활성화"}
                  >
                    <MinusCircleIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleDelete(evaluator.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none text-red-600"
                    title="삭제"
                  >
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEvaluator ? "평가위원 수정" : "평가위원 추가"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    이름 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    부서
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {editingEvaluator ? "새 비밀번호 (변경시에만 입력)" : "비밀번호"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editingEvaluator ? "변경하지 않으려면 비워두세요" : "evaluator123"}
                  />
                  {!editingEvaluator && (
                    <p className="text-xs text-gray-500 mt-1">
                      비워두면 기본 비밀번호(evaluator123)가 설정됩니다.
                    </p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingEvaluator(null);
                      resetForm();
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    {editingEvaluator ? "수정" : "추가"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorManagement; 