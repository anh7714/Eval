import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Home, Users, GraduationCap, ClipboardList, BarChart3, Settings } from "lucide-react";

const navigation = [
  { name: "대시보드", href: "/admin/dashboard", icon: Home },
  { name: "평가위원 관리", href: "/admin/evaluators", icon: Users },
  { name: "대상자 관리", href: "/admin/candidates", icon: GraduationCap },
  { name: "평가항목 관리", href: "/admin/evaluation-items", icon: ClipboardList },
  { name: "결과 관리", href: "/admin/results", icon: BarChart3 },
  { name: "시스템 설정", href: "/admin/settings", icon: Settings },
];

export default function AdminNav() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      toast({ title: "로그아웃", description: "성공적으로 로그아웃되었습니다." });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="bg-white border-b">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between py-4">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={`flex items-center gap-2 text-sm font-medium pb-4 border-b-2 transition-colors ${
                      isActive
                        ? "text-blue-700 border-blue-700"
                        : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </div>
          <Button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </nav>
      </div>
    </div>
  );
}
