import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import type { CategoryOption, InsertCategoryOption } from "@shared/schema";

const categoryOptionSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  type: z.enum(["main", "sub"]),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

type CategoryOptionForm = z.infer<typeof categoryOptionSchema>;

export default function CategoryOptionsPage() {
  const [open, setOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<CategoryOption | null>(null);

  const { data: categoryOptions = [], isLoading } = useQuery({
    queryKey: ["/api/admin/category-options"],
  });

  const mainCategories = (categoryOptions as CategoryOption[]).filter(
    (option: CategoryOption) => option.type === "main"
  );

  const createMutation = useMutation({
    mutationFn: async (data: InsertCategoryOption) => {
      return apiRequest("/api/admin/category-options", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-options"] });
      toast({ title: "카테고리 옵션이 추가되었습니다." });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "카테고리 옵션 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; option: Partial<InsertCategoryOption> }) => {
      return apiRequest(`/api/admin/category-options/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.option),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-options"] });
      toast({ title: "카테고리 옵션이 수정되었습니다." });
      setOpen(false);
      setEditingOption(null);
    },
    onError: () => {
      toast({ title: "카테고리 옵션 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/category-options/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-options"] });
      toast({ title: "카테고리 옵션이 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "카테고리 옵션 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const form = useForm<CategoryOptionForm>({
    resolver: zodResolver(categoryOptionSchema),
    defaultValues: {
      name: "",
      type: "main",
      parentId: null,
      sortOrder: 0,
      isActive: true,
    },
  });

  const handleEdit = (option: CategoryOption) => {
    setEditingOption(option);
    form.reset({
      name: option.name,
      type: option.type,
      parentId: option.parentId,
      sortOrder: option.sortOrder,
      isActive: option.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = async (data: CategoryOptionForm) => {
    if (!data.name?.trim()) {
      form.setError("name", { message: "이름은 필수입니다" });
      return;
    }

    const submitData: InsertCategoryOption = {
      name: data.name.trim(),
      type: data.type,
      parentId: data.type === "sub" ? data.parentId : null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    };

    if (editingOption) {
      updateMutation.mutate({ id: editingOption.id, option: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleAdd = () => {
    setEditingOption(null);
    form.reset({
      name: "",
      type: "main",
      parentId: null,
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">카테고리 옵션 관리</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              옵션 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOption ? "카테고리 옵션 수정" : "카테고리 옵션 추가"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>타입</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="타입을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="main">주 카테고리</SelectItem>
                          <SelectItem value="sub">하위 카테고리</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("type") === "sub" && (
                  <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>상위 카테고리</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="상위 카테고리를 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mainCategories.map((category: CategoryOption) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정렬 순서</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    취소
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingOption ? "수정" : "추가"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>카테고리 옵션 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(categoryOptions as CategoryOption[]).map((option: CategoryOption) => {
              const parentCategory = option.parentId
                ? (categoryOptions as CategoryOption[]).find((m: CategoryOption) => m.id === option.parentId)
                : null;

              return (
                <div
                  key={option.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm text-gray-500 space-x-2">
                      <span className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                        {option.type === "main" ? "주 카테고리" : "하위 카테고리"}
                      </span>
                      {parentCategory && (
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                          상위: {parentCategory.name}
                        </span>
                      )}
                      <span className="bg-green-100 px-2 py-1 rounded text-green-800">
                        순서: {option.sortOrder}
                      </span>
                      {!option.isActive && (
                        <span className="bg-red-100 px-2 py-1 rounded text-red-800">
                          비활성화
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(option)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(option.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {(categoryOptions as CategoryOption[]).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 카테고리 옵션이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}