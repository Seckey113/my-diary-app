"use client";

import { useEffect, useState } from "react";

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let isAtTop = false;

    // 画面に指が触れた時の処理
    const handleTouchStart = (e: TouchEvent) => {
      // 画面の一番上にいる時だけ「引っ張り」を有効にする
      if (window.scrollY <= 0) {
        isAtTop = true;
        startY = e.touches[0].clientY;
      } else {
        isAtTop = false;
      }
    };

    // 指を動かしている最中の処理
    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop) return;
      currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      // 下方向に引っ張っている場合
      if (distance > 0) {
        // スクロール量が大きくなりすぎないように調整（ゴムのような抵抗感を持たせる）
        setPullDistance(Math.min(distance * 0.4, 80));
      } else {
        setPullDistance(0);
      }
    };

    // 指を離した時の処理
    const handleTouchEnd = () => {
      if (!isAtTop) return;
      
      if (pullDistance > 60) {
        // 60px以上引っ張って離したら、更新スタート！
        setIsRefreshing(true);
        // 完全にリロードして最新データを読み込む
        window.location.reload();
      } else {
        // 引っ張りが足りなかったら元に戻す
        setPullDistance(0);
      }
      isAtTop = false;
    };

    // イベントリスナーの登録（スマホのタッチ操作を監視）
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance]);

  return (
    <div className="w-full h-full relative bg-[#EBE8E0]">
      {/* ⭐️ 引っ張った時に裏から見えてくる更新インジケーター */}
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

      {/* ⭐️ アプリ全体のコンテンツ（引っ張ると下にスライドする） */}
      <div 
        className="bg-[#FAF9F6] min-h-screen transition-transform duration-300 shadow-[0_0_15px_rgba(0,0,0,0.05)]"
        style={{ 
          transform: `translateY(${isRefreshing ? 80 : pullDistance}px)`,
          zIndex: 10,
          position: "relative"
        }}
      >
        {children}
      </div>
    </div>
  );
}