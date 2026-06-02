"use client";

import { useState } from "react";

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload(); // 画面を再読み込みして最新データを取得
  };

  return (
    <button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border shadow-sm transition-all duration-300
        ${isRefreshing 
          ? "bg-[#F0F4F0] text-[#A3B5A5] border-[#EBE8E0]" 
          : "bg-white text-[#8FA391] border-[#EBE8E0] hover:border-[#8FA391] hover:bg-[#F9FBF9]"
        }
      `}
    >
      <span className={`text-base leading-none ${isRefreshing ? "animate-spin" : ""}`}>
        ↻
      </span>
      {isRefreshing ? "更新中..." : "更新"}
    </button>
  );
}