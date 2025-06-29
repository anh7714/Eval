import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AdminNav from "@/components/layout/admin-nav";
import ExcelUpload from "@/components/ui/excel-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Upload, ClipboardList } from "lucide-react";

interface EvaluationCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}

interface EvaluationItem {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  description?: string;
  maxScore: number;
  weight: string;
  order: number;
  isActive: boolean;
  categoryName: string;
}

export default function AdminEvaluationItems() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<EvaluationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EvaluationCategory | null>(null);
  
  const [itemFormData, setItemFormData] = useState({
    categoryId: 0,
    code: "",
    name: "",
    description: "",
    maxScore: 100,
    weight: "1.00",
    order: 0,
    isActive: true,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    code: "",
    name: "",
    description: "",
    order: 0,
    isActive: true,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/evaluation-items"],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/evaluation-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-items"] });
      toast({ title: "성공", description: "평가 항목이 추가되었습니다." });
      resetItemForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/evaluation-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-items"] });
      toast({ title: "성공", description: "평가 항목이 수정되었습니다." });
      resetItemForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/evaluation-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-items"] });
      toast({ title: "성공", description: "평가 항목이 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "성공", description: "카테고리가 추가되었습니다." });
      resetCategoryForm();
      setCategoryDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "성공", description: "카테고리가 수정되었습니다." });
      resetCategoryForm();
      setCategoryDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-items"] });
      toast({ title: "성공", description: "카테고리가 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const bulkCreateItemsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const response = await apiRequest("POST", "/api/evaluation-items/bulk", { items });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-items"] });
      toast({ 
        title: "성공", 
        description: `${data.length}개의 평가 항목이 일괄 등록되었습니다.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const resetItemForm = () => {
    setItemFormData({
      categoryId: 0,
      code: "",
      name: "",
      description: "",
      maxScore: 100,
      weight: "1.00",
      order: 0,
      isActive: true,
    });
    setSelectedItem(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      code: "",
      name: "",
      description: "",
      order: 0,
      isActive: true,
    });
    setSelectedCategory(null);
  };

  const handleEditItem = (item: EvaluationItem) => {
    setSelectedItem(item);
    setItemFormData({
      categoryId: item.categoryId,
      code: item.code,
      name: item.name,
      description: item.description || "",
      maxScore: item.maxScore,
      weight: item.weight,
      order: item.order,
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  const handleEditCategory = (category: EvaluationCategory) => {
    setSelectedCategory(category);
    setCategoryFormData({
      code: category.code,
      name: category.name,
      description: category.description || "",
      order: category.order,
      isActive: category.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.categoryId || !itemFormData.code || !itemFormData.name) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (selectedItem) {
      updateItemMutation.mutate({ id: selectedItem.id, data: itemFormData });
    } else {
      createItemMutation.mutate(itemFormData);
    }
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.code || !categoryFormData.name) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data: categoryFormData });
    } else {
      createCategoryMutation.mutate(categoryFormData);
    }
  };

  const handleExcelUpload = (data: any[]) => {
    const items = data.map((row: any) => {
      const categoryCode = row['카테고리코드'] || row['categoryCode'];
      const category = categories?.find((cat: EvaluationCategory) => cat.code === categoryCode);
      
      return {
        categoryId: category?.id || 0,
        code: row['항목코드'] || row['itemCode'],
        name: row['항목명'] || row['name'],
        description: row['설명'] || row['description'],
        maxScore: parseInt(row['최대점수'] || row['maxScore']) || 100,
        weight: parseFloat(row['가중치'] || row['weight']) || 1.0,
        order: parseInt(row['순서'] || row['order']) || 0,
        isActive: true,
      };
    }).filter(item => item.categoryId && item.code && item.name);

    if (items.length === 0) {
      toast({
        title: "업로드 오류",
        description: "올바른 형식의 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    bulkCreateItemsMutation.mutate(items);
  };

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="ml-3 text-slate-600">데이터를 불러오는 중...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">평가항목 관리</h1>
            <p className="text-slate-600">평가 카테고리와 세부 항목을 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <ExcelUpload
              onUpload={handleExcelUpload}
              className="gov-btn-secondary"
              disabled={bulkCreateItemsMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              엑셀 업로드
            </ExcelUpload>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gov-btn-secondary" onClick={resetCategoryForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  카테고리 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCategory ? "카테고리 수정" : "카테고리 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryCode">카테고리 코드 *</Label>
                    <Input
                      id="categoryCode"
                      value={categoryFormData.code}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                      placeholder="예: A, B, C"
                      className="gov-input"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">카테고리명 *</Label>
                    <Input
                      id="categoryName"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      placeholder="예: 기술이해도"
                      className="gov-input"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryDescription">설명</Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      className="gov-input"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryOrder">표시 순서</Label>
                    <Input
                      id="categoryOrder"
                      type="number"
                      value={categoryFormData.order}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, order: parseInt(e.target.value) || 0 })}
                      className="gov-input"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="categoryIsActive"
                      checked={categoryFormData.isActive}
                      onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, isActive: checked })}
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    />
                    <Label htmlFor="categoryIsActive">활성 상태</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCategoryDialogOpen(false)}
                      className="flex-1"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gov-btn-primary"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    >
                      {selectedCategory ? "수정" : "추가"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gov-btn-primary" onClick={resetItemForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  평가항목 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedItem ? "평가항목 수정" : "평가항목 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">카테고리 *</Label>
                    <Select
                      value={itemFormData.categoryId.toString()}
                      onValueChange={(value) => setItemFormData({ ...itemFormData, categoryId: parseInt(value) })}
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    >
                      <SelectTrigger className="gov-input">
                        <SelectValue placeholder="카테고리를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: EvaluationCategory) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.code} - {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemCode">항목 코드 *</Label>
                    <Input
                      id="itemCode"
                      value={itemFormData.code}
                      onChange={(e) => setItemFormData({ ...itemFormData, code: e.target.value })}
                      placeholder="예: A1, A2, B1"
                      className="gov-input"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemName">항목명 *</Label>
                    <Input
                      id="itemName"
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                      placeholder="예: 통돌OS 사업 운영 계획서 검토"
                      className="gov-input"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemDescription">설명</Label>
                    <Textarea
                      id="itemDescription"
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                      className="gov-input"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxScore">최대 점수</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        value={itemFormData.maxScore}
                        onChange={(e) => setItemFormData({ ...itemFormData, maxScore: parseInt(e.target.value) || 0 })}
                        className="gov-input"
                        disabled={createItemMutation.isPending || updateItemMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">가중치</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        value={itemFormData.weight}
                        onChange={(e) => setItemFormData({ ...itemFormData, weight: e.target.value })}
                        className="gov-input"
                        disabled={createItemMutation.isPending || updateItemMutation.isPending}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemOrder">표시 순서</Label>
                    <Input
                      id="itemOrder"
                      type="number"
                      value={itemFormData.order}
                      onChange={(e) => setItemFormData({ ...itemFormData, order: parseInt(e.target.value) || 0 })}
                      className="gov-input"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="itemIsActive"
                      checked={itemFormData.isActive}
                      onCheckedChange={(checked) => setItemFormData({ ...itemFormData, isActive: checked })}
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    />
                    <Label htmlFor="itemIsActive">활성 상태</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gov-btn-primary"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    >
                      {selectedItem ? "수정" : "추가"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Categories Section */}
        <Card className="gov-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              평가 카테고리 ({categories?.length || 0}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>순서</th>
                    <th>코드</th>
                    <th>카테고리명</th>
                    <th>설명</th>
                    <th className="text-center">상태</th>
                    <th className="text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {categories?.map((category: EvaluationCategory) => (
                    <tr key={category.id}>
                      <td className="text-center font-medium">{category.order}</td>
                      <td className="font-mono text-blue-600">{category.code}</td>
                      <td className="font-medium text-slate-900">{category.name}</td>
                      <td className="text-slate-600">{category.description || "-"}</td>
                      <td className="text-center">
                        {category.isActive ? (
                          <span className="gov-badge-completed">활성</span>
                        ) : (
                          <span className="gov-badge-pending">비활성</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCategory(category)}
                            className="p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                            disabled={deleteCategoryMutation.isPending}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!categories || categories.length === 0) && (
              <div className="p-8 text-center text-slate-500">
                등록된 카테고리가 없습니다. 카테고리를 먼저 추가해주세요.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Items Section */}
        <Card className="gov-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              평가 항목 목록 ({items?.length || 0}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>순서</th>
                    <th>카테고리</th>
                    <th>코드</th>
                    <th>항목명</th>
                    <th className="text-center">최대점수</th>
                    <th className="text-center">가중치</th>
                    <th className="text-center">상태</th>
                    <th className="text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item: EvaluationItem) => (
                    <tr key={item.id}>
                      <td className="text-center font-medium">{item.order}</td>
                      <td>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="font-mono text-blue-600">{item.code}</td>
                      <td>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                        )}
                      </td>
                      <td className="text-center font-medium">{item.maxScore}점</td>
                      <td className="text-center">{item.weight}</td>
                      <td className="text-center">
                        {item.isActive ? (
                          <span className="gov-badge-completed">활성</span>
                        ) : (
                          <span className="gov-badge-pending">비활성</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditItem(item)}
                            className="p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            disabled={deleteItemMutation.isPending}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!items || items.length === 0) && (
              <div className="p-8 text-center text-slate-500">
                등록된 평가 항목이 없습니다. 평가 항목을 추가해주세요.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
