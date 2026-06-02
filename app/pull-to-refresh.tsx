"use client";

import { useEffect, useState } from "react";

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // ⭐️ 修正1：iPhone特有のズレを考慮し、「一番上（5px以内）」なら引っ張りを許可
      if (window.scrollY <= 5) {
        isPulling = true;
        startY = e.touches[0].clientY;
      } else {
        isPulling = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      // 画面のトップにいて、下方向に引っ張っている場合
      if (distance > 0 && window.scrollY <= 5) {
        // ⭐️ 修正2：ブラウザの標準スクロールを「強制ストップ」してJSに主導権を握らせる！
        if (e.cancelable) {
          e.preventDefault();
        }
        setPullDistance(Math.min(distance * 0.4, 80));
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;
      isPulling = false;
      
      if (pullDistance > 60) {
        setIsRefreshing(true);
        window.location.reload();
      } else {
        setPullDistance(0);
      }
    };

    // ⭐️ 修正3：強制ストップ（preventDefault）を使うために「passive: false」に変更
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance]);

  return (
    <div className="w-full h-full relative bg-[#EBE8E0]">
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-end pb-4 overflow-hidden transition-opacity duration-300"
        style={{ 
          height: `80px`, 
          opacity: pullDistance / 60,
          zIndex: 0
        }}
      >
        <div className="flex items-center gap-2 text-[#6B7D6C] font-bold text-[13px] bg-[#FAF9F6] border border-[#8FA391] px-5 py-2 rounded-full shadow-sm">
          {isRefreshing ? (
            <span>↻ 更新しています...</span>
          ) : pullDistance > 60 ? (
            <span>↑ 指を離して更新</span>
          ) : (
            <span>↓ 引っ張って更新</span>
          )}
        </div>
      </div>

      <div 
        className="bg-[#FAF9F6] min-h-screen shadow-[0_0_15px_rgba(0,0,0,0.05)]"
        style={{ 
          transform: `translateY(${isRefreshing ? 80 : pullDistance}px)`,
          // ⭐️ 修正4：指で引っ張っている最中はアニメーションを消し、指にピッタリ吸い付かせる
          transition: pullDistance === 0 || isRefreshing ? "transform 0.3s ease-out" : "none",
          zIndex: 10,
          position: "relative"
        }}
      >
        {children}
      </div>
    </div>
  );
}