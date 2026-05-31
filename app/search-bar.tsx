"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set("q", term);
      // 文字がある時は ?q=〇〇 を付けて、スクロールしない
      startTransition(() => {
        router.replace(`/?${params.toString()}`, { scroll: false });
      });
    } else {
      params.delete("q");
      // ⭐️ 修正箇所：文字が完全に消えて空っぽになった時（元の / に戻る時）も、スクロールしないように設定！
      startTransition(() => {
        router.replace("/", { scroll: false });
      });
    }
  }

  return (
    <div className="mb-8 relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-[#8FA391]">🔍</span>
      </div>
      <input
        type="text"
        placeholder="思い出を検索...（例：アサガオ）"
        defaultValue={searchParams?.get("q")?.toString() || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-10 p-3 bg-white border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#555555] transition shadow-sm"
      />
      {isPending && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-xs text-[#9CA3AF]">検索中...</span>
        </div>
      )}
    </div>
  );
}