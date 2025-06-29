import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemName } from "../../contexts/SystemNameContext";
import { Link } from "react-router-dom";

const SystemSettings = () => {
  const { user, signOut } = useAuth();
  const { refresh: refreshSystemName } = useSystemName();
  const [systemName, setSystemName] = useState("");
  const [systemNameSaved, setSystemNameSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 비밀번호 변경
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // 시스템 초기화
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchSystemName();
  }, []);

  const fetchSystemName = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_config")
      .select("evaluation_title")
      .order("id", { ascending: true })
      .limit(1)
      .single();
    if (!error && data) {
      setSystemName(data.evaluation_title);
    }
    setLoading(false);
  };

  const handleSystemNameSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("system_config")
      .update({ evaluation_title: systemName })
      .eq("id", 1); // id=1이 기본
    setLoading(false);
    setSystemNameSaved(!error);
    refreshSystemName(); // 저장 후 Context 갱신
    setTimeout(() => setSystemNameSaved(false), 2000);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordChanged(false);
    if (!newPassword || newPassword !== newPasswordConfirm) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError("비밀번호 변경 실패: " + error.message);
    } else {
      setPasswordChanged(true);
      setNewPassword("");
      setNewPasswordConfirm("");
      setTimeout(() => setPasswordChanged(false), 2000);
    }
  };

  const handleSystemReset = async () => {
    if (
      !window.confirm(
        "정말로 시스템의 모든 데이터를 영구적으로 삭제하고 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    )
      return;
    setResetting(true);
    // 주요 테이블 전체 삭제
    const tables = [
      "scores",
      "evaluation_progress",
      "evaluation_items",
      "evaluation_categories",
      "candidates",
      "evaluators",
      "admins"
    ];
    try {
      for (const table of tables) {
        await supabase.from(table).delete().neq("id", 0);
      }
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      alert("초기화 실패: " + e.message);
    }
    setResetting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 시스템 이름 설정 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <span role="img" aria-label="system">��️</span> 시스템 이름 설정
          </h2>
          <p className="text-gray-500 mb-4">앱 전체에 표시될 시스템의 이름을 설정합니다.</p>
          <label className="block mb-2 font-semibold">시스템 이름</label>
          <input
            type="text"
            value={systemName}
            onChange={e => setSystemName(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-4"
            disabled={loading}
          />
          <button
            onClick={handleSystemNameSave}
            className="bg-blue-700 text-white px-6 py-2 rounded"
            disabled={loading}
          >
            이름 저장
          </button>
          {systemNameSaved && (
            <div className="mt-2 text-green-600 font-semibold">저장되었습니다!</div>
          )}
        </div>

        {/* 관리자 비밀번호 변경 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <span role="img" aria-label="key">🔑</span> 관리자 비밀번호 관리
          </h2>
          <p className="text-gray-500 mb-4">일반 관리자 비밀번호를 변경하거나 초기화합니다.</p>
          {passwordChanged && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-2 rounded mb-2">
              비밀번호가 변경되었습니다.
            </div>
          )}
          <input
            type="password"
            placeholder="새 비밀번호 입력"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <input
            type="password"
            placeholder="새 비밀번호 다시 입력"
            value={newPasswordConfirm}
            onChange={e => setNewPasswordConfirm(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-4"
          />
          <button
            onClick={handlePasswordChange}
            className="bg-blue-700 text-white px-6 py-2 rounded"
          >
            비밀번호 변경
          </button>
          {passwordError && (
            <div className="mt-2 text-red-600 font-semibold">{passwordError}</div>
          )}
        </div>
      </div>

      {/* 시스템 초기화 */}
      <div className="mt-10 bg-white rounded-lg shadow p-6 border-2 border-red-300">
        <h2 className="text-xl font-bold mb-2 text-red-700 flex items-center gap-2">
          <span role="img" aria-label="reset">↻</span> 시스템 초기화
        </h2>
        <p className="text-red-600 mb-4">
          시스템의 모든 데이터를 영구적으로 삭제하고 초기 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          onClick={handleSystemReset}
          className="w-full bg-red-600 text-white py-3 rounded text-lg font-bold"
          disabled={resetting}
        >
          시스템 전체 데이터 초기화
        </button>
      </div>
    </div>
  );
};

export default SystemSettings; 