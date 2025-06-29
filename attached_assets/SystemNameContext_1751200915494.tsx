import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const SystemNameContext = createContext<{ name: string; refresh: () => void }>({
  name: "",
  refresh: () => {},
});

export const useSystemName = () => useContext(SystemNameContext);

export const SystemNameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [name, setName] = useState("시스템 이름");

  const fetchName = async () => {
    const { data } = await supabase
      .from("system_config")
      .select("evaluation_title")
      .order("id", { ascending: true })
      .limit(1)
      .single();
    if (data?.evaluation_title) setName(data.evaluation_title);
  };

  useEffect(() => {
    fetchName();
  }, []);

  return (
    <SystemNameContext.Provider value={{ name, refresh: fetchName }}>
      {children}
    </SystemNameContext.Provider>
  );
}; 