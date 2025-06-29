import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ExcelUpload from "../../components/ExcelUpload";
import { PencilSquareIcon, MinusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";

interface EvaluationCategory {
  id: number;
  category_code: string;
  category_name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

interface EvaluationItem {
  id: number;
  category_id: number;
  item_code: string;
  item_name: string;
  description: string;
  max_score: number;
  weight: number;
  sort_order: number;
  is_active: boolean;
  category: EvaluationCategory;
}

const EvaluationItemManagement = () => {
  const [categories, setCategories] = useState<EvaluationCategory[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EvaluationCategory | null>(null);
  const [editingItem, setEditingItem] = useState<EvaluationItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    category_code: "",
    category_name: "",
    description: "",
    sort_order: 0,
  });
  const [itemForm, setItemForm] = useState({
    category_id: 0,
    item_code: "",
    item_name: "",
    description: "",
    max_score: 100,
    weight: 1.0,
    sort_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 카테고리 조회
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("evaluation_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // 평가 항목 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from("evaluation_items")
        .select(`
          *,
          category:evaluation_categories(*)
        `)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error("데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 관련 함수들
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        // 수정
        const { error } = await supabase
          .from("evaluation_categories")
          .update(categoryForm)
          .eq("id", editingCategory.id);

        if (error) throw error;
      } else {
        // 추가
        const { error } = await supabase
          .from("evaluation_categories")
          .insert([categoryForm]);

        if (error) throw error;
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      console.error("카테고리 저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const handleCategoryEdit = (category: EvaluationCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      category_code: category.category_code,
      category_name: category.category_name,
      description: category.description || "",
      sort_order: category.sort_order,
    });
    setShowCategoryModal(true);
  };

  const handleCategoryDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? 관련된 평가 항목도 함께 삭제됩니다.")) return;

    try {
      const { error } = await supabase
        .from("evaluation_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("카테고리 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      category_code: "",
      category_name: "",
      description: "",
      sort_order: 0,
    });
  };

  // 평가 항목 관련 함수들
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        // 수정
        const { error } = await supabase
          .from("evaluation_items")
          .update(itemForm)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        // 추가
        const { error } = await supabase
          .from("evaluation_items")
          .insert([itemForm]);

        if (error) throw error;
      }

      setShowItemModal(false);
      setEditingItem(null);
      resetItemForm();
      fetchData();
    } catch (error) {
      console.error("평가 항목 저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const handleItemEdit = (item: EvaluationItem) => {
    setEditingItem(item);
    setItemForm({
      category_id: item.category_id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description || "",
      max_score: item.max_score,
      weight: item.weight,
      sort_order: item.sort_order,
    });
    setShowItemModal(true);
  };

  const handleItemDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("evaluation_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("평가 항목 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const resetItemForm = () => {
    setItemForm({
      category_id: 0,
      item_code: "",
      item_name: "",
      description: "",
      max_score: 100,
      weight: 1.0,
      sort_order: 0,
    });
  };

  const handleExcelUpload = async (data: any[]) => {
    try {
      // 카테고리와 항목을 구분하여 처리
      const categoriesData = data.filter(row => row.type === 'category' || row.category_code).map(row => ({
        category_code: row.category_code || row.카테고리코드 || "",
        category_name: row.category_name || row.카테고리명 || "",
        description: row.description || row.설명 || "",
        sort_order: row.sort_order || row.순서 || 0,
      }));

      const itemsData = data.filter(row => row.type === 'item' || row.item_code).map(row => ({
        category_id: row.category_id || 1, // 기본값
        item_code: row.item_code || row.항목코드 || "",
        item_name: row.item_name || row.항목명 || "",
        description: row.description || row.설명 || "",
        max_score: row.max_score || row.최대점수 || 100,
        weight: row.weight || row.가중치 || 1.0,
        sort_order: row.sort_order || row.순서 || 0,
      }));

      if (categoriesData.length > 0) {
        const { error: categoryError } = await supabase
          .from("evaluation_categories")
          .insert(categoriesData);
        if (categoryError) throw categoryError;
      }

      if (itemsData.length > 0) {
        const { error: itemError } = await supabase
          .from("evaluation_items")
          .insert(itemsData);
        if (itemError) throw itemError;
      }
      
      alert("엑셀 데이터가 성공적으로 업로드되었습니다.");
      fetchData();
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 카테고리 관리 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                평가 카테고리 ({categories.length}개)
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      코드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      순서
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.category_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.sort_order}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        <button
                          onClick={() => handleCategoryEdit(category)}
                          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
                          title="수정"
                        >
                          <PencilSquareIcon className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => handleCategoryDelete(category.id)}
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
          </div>

          {/* 평가 항목 관리 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                평가 항목 ({items.length}개)
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">항목명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가중치</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최대점수</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.item_code}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{item.category?.category_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-normal break-words">{item.item_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{item.weight}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{item.max_score}</td>
                      <td className="px-4 py-4 text-center text-sm font-medium">
                        <button
                          onClick={() => handleItemEdit(item)}
                          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 h-10 w-10 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
                          title="수정"
                        >
                          <PencilSquareIcon className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => handleItemDelete(item.id)}
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
          </div>
        </div>
      </div>

      {/* 카테고리 모달 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? "카테고리 수정" : "카테고리 추가"}
              </h3>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    카테고리 코드 *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.category_code}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, category_code: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    카테고리명 *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.category_name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, category_name: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    설명
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
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
                    value={categoryForm.sort_order}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                      resetCategoryForm();
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    {editingCategory ? "수정" : "추가"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 평가 항목 모달 */}
      {showItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? "평가 항목 수정" : "평가 항목 추가"}
              </h3>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    카테고리 *
                  </label>
                  <select
                    required
                    value={itemForm.category_id}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, category_id: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    항목 코드 *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.item_code}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, item_code: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    항목명 *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.item_name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, item_name: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    설명
                  </label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      최대점수
                    </label>
                    <input
                      type="number"
                      value={itemForm.max_score}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, max_score: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      가중치
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={itemForm.weight}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, weight: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    정렬 순서
                  </label>
                  <input
                    type="number"
                    value={itemForm.sort_order}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                      resetItemForm();
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    {editingItem ? "수정" : "추가"}
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

export default EvaluationItemManagement; 