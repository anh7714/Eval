import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ExcelUpload from "../../components/ExcelUpload";
import { PencilSquareIcon, MinusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    position: "",
    category: "",
    description: "",
    sort_order: 0,
  });

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error("평가 대상자 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCandidate) {
        // 수정
        const { error } = await supabase
          .from("candidates")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCandidate.id);

        if (error) throw error;
      } else {
        // 추가
        const { error } = await supabase
          .from("candidates")
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingCandidate(null);
      resetForm();
      fetchCandidates();
    } catch (error) {
      console.error("평가 대상자 저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name,
      department: candidate.department || "",
      position: candidate.position || "",
      category: candidate.category || "",
      description: candidate.description || "",
      sort_order: candidate.sort_order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchCandidates();
    } catch (error) {
      console.error("평가 대상자 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleToggleActive = async (candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from("candidates")
        .update({ 
          is_active: !candidate.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidate.id);

      if (error) throw error;
      fetchCandidates();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경에 실패했습니다.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      department: "",
      position: "",
      category: "",
      description: "",
      sort_order: 0,
    });
  };

  const handleExcelUpload = async (data: any[]) => {
    try {
      const candidatesData = data.map((row, index) => ({
        name: row.name || row.이름 || row.성명 || "",
        department: row.department || row.부서 || row.소속 || "",
        position: row.position || row.직급 || row.직책 || "",
        category: row.category || row.분류 || row.카테고리 || "",
        description: row.description || row.설명 || row.비고 || "",
        sort_order: row.sort_order || row.순서 || index + 1,
      }));

      const { error } = await supabase
        .from("candidates")
        .insert(candidatesData);

      if (error) throw error;
      
      alert("엑셀 데이터가 성공적으로 업로드되었습니다.");
      fetchCandidates();
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
                순서
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                부서
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                직급
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                분류
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {candidate.sort_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {candidate.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {candidate.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {candidate.position}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {candidate.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      candidate.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {candidate.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(candidate)}
                    className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
                    title="수정"
                  >
                    <PencilSquareIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(candidate)}
                    className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none ${candidate.is_active ? "text-red-600" : "text-green-600"}`}
                    title={candidate.is_active ? "비활성화" : "활성화"}
                  >
                    <MinusCircleIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleDelete(candidate.id)}
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
                {editingCandidate ? "평가 대상자 수정" : "평가 대상자 추가"}
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
                    직급
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    분류
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    정렬 순서
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCandidate(null);
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
                    {editingCandidate ? "수정" : "추가"}
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

export default CandidateManagement; 