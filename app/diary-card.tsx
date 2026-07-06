"use client";
import { useState, useTransition, useEffect } from "react";

function formatToZeroPadding(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
  return dateStr;
}

// 日付パースの安全対策（Safariのバグ回避）
function formatDateForInput(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 検索文字のエスケープ処理
function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Highlight({ text, query }: { text?: string; query: string }) {
  if (!text) return null;
  if (!query) return <>{text}</>;
  
  const safeQuery = escapeRegExp(query);
  const parts = text.split(new RegExp(`(${safeQuery})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 text-gray-900 px-1 rounded-sm">{part}</span>
      ) : part )}
    </>
  );
}

export function DiaryCard({ 
  diary, searchQuery, onUpdateBasic, onUpdateGrowth, onDelete 
}: { 
  diary: any; searchQuery: string; 
  onUpdateBasic: (formData: FormData) => Promise<void>; 
  onUpdateGrowth: (formData: FormData) => Promise<void>; 
  onDelete: (formData: FormData) => Promise<void>; 
}) {
  const [activeTab, setActiveTab] = useState<"diary" | "growth">("diary");
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isNoTitle = diary.title === "無題";
  const isNoContent = diary.content === "エピソード記録なし";
  const isNoTags = diary.tags === "タグなし";
  
  const hasGrowthData = !!(diary.purpose || diary.thoughtProcess || diary.actionFact || diary.nextAction);

  // ⭐️ 検索語が「日記側」と「目的・振り返り側」のどちらにヒットしているかを判定
  const lowerSearchQuery = searchQuery.toLowerCase();

  const diarySearchText = [
    diary.title || "",
    diary.content || "",
    diary.tags || "",
  ].join("\n").toLowerCase();

  const growthSearchText = [
    diary.purpose || "",
    diary.thoughtProcess || "",
    diary.actionFact || "",
    diary.nextAction || "",
  ].join("\n").toLowerCase();

  const isDiaryMatched = searchQuery !== "" && diarySearchText.includes(lowerSearchQuery);
  const isGrowthMatched = searchQuery !== "" && growthSearchText.includes(lowerSearchQuery);

  // ⭐️ 検索時のタブ自動切り替え機能（完全版）
  useEffect(() => {
    // 振り返り側だけにヒットしたら振り返りタブを開く
    if (isGrowthMatched && !isDiaryMatched) {
      setActiveTab("growth");
    }
    // 日記側だけにヒットしたら日記タブを開く
    else if (isDiaryMatched && !isGrowthMatched) {
      setActiveTab("diary");
    }
  }, [isGrowthMatched, isDiaryMatched]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const startEditing = (mode: "diary" | "growth") => {
    setActiveTab(mode);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="p-4 sm:p-6 border-2 border-[#8FA391] rounded-2xl shadow-md bg-white transition duration-300">
        {activeTab === "diary" ? (
          <form action={(formData) => { startTransition(async () => { await onUpdateBasic(formData); setIsEditing(false); }); }} className="space-y-4">
            <input type="hidden" name="id" value={diary.id} />
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#8FA391]">📝 日記モードの編集</span>
            </div>
            <input type="date" name="date" defaultValue={formatDateForInput(diary.date)} className="w-full p-2.5 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl outline-none text-[#555555]" />
            <input type="text" name="title" defaultValue={isNoTitle ? "" : diary.title} placeholder="無題" className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none" />
            <textarea name="content" defaultValue={isNoContent ? "" : diary.content} placeholder="エピソード記録なし" rows={4} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
            <input type="text" name="tags" defaultValue={isNoTags ? "" : diary.tags} placeholder="タグなし" className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none text-[#555555]" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-[#888888] bg-[#F0F4F0] rounded-lg">キャンセル</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-bold text-white bg-[#8FA391] rounded-lg">{isPending ? "保存中..." : "保存する"}</button>
            </div>
          </form>
        ) : (
          <form action={(formData) => { startTransition(async () => { await onUpdateGrowth(formData); setIsEditing(false); }); }} className="space-y-4">
            <input type="hidden" name="id" value={diary.id} />
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#8FA391]">🎯 目的・振り返りの編集</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#888888] mb-1">🎯 今日の目的</label>
              <input type="text" name="purpose" defaultValue={diary.purpose} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#888888] mb-1">🧠 何を考えたか</label>
              <textarea name="thoughtProcess" defaultValue={diary.thoughtProcess} rows={2} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#888888] mb-1">✅ 実際に何をしたか</label>
              <textarea name="actionFact" defaultValue={diary.actionFact} rows={2} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#888888] mb-1">➡️ 次の一手</label>
              <textarea name="nextAction" defaultValue={diary.nextAction} rows={2} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-[#888888] bg-[#F0F4F0] rounded-lg">キャンセル</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-bold text-white bg-[#8FA391] rounded-lg">{isPending ? "保存中..." : "保存する"}</button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 border border-[#EBE8E0] rounded-2xl shadow-sm bg-white flex flex-col h-full relative">
      
      {/* ⭐️ カード上部のタブスイッチ */}
      <div className="flex justify-between items-start mb-5 border-b border-[#F0F0F0] pb-3">
        <span className="text-sm text-[#8FA391] font-bold block mt-1">
          {formatToZeroPadding(diary.date)}
        </span>
        <div className="flex bg-[#F0F4F0] p-1 rounded-lg shadow-inner">
          <button onClick={() => setActiveTab("diary")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === "diary" ? "bg-white text-[#6B7D6C] shadow-sm" : "text-[#A3B5A5] hover:bg-[#E6EBE6]"}`}>
            📝 日記
          </button>
          <button onClick={() => setActiveTab("growth")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === "growth" ? "bg-white text-[#6B7D6C] shadow-sm" : "text-[#A3B5A5] hover:bg-[#E6EBE6]"}`}>
            🎯 振り返り
            {hasGrowthData && activeTab !== "growth" && <span className="w-1.5 h-1.5 bg-[#D98C8C] rounded-full"></span>}
          </button>
        </div>
      </div>
      
      {/* 📝 日記モード表示 */}
      {activeTab === "diary" ? (
        <div onDoubleClick={() => startEditing("diary")} className="mb-2 touch-manipulation">
          <h3 className={`text-lg sm:text-xl break-words leading-snug mb-3 ${isNoTitle ? "text-[#B0B0B0] italic font-medium" : "text-[#333333] font-bold"}`}>
            <Highlight text={diary.title} query={searchQuery} />
          </h3>
          <p className={`whitespace-pre-wrap leading-[1.8] ${isNoContent ? "text-[#B0B0B0] italic text-sm" : "text-[#444444] text-[15px] sm:text-base"}`}>
            <Highlight text={diary.content} query={searchQuery} />
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {diary.tags && !isNoTags && diary.tags.split("、").map((tag: string, index: number) => {
              const cleanTag = tag.trim().startsWith("#") ? tag.trim().substring(1) : tag.trim();
              if (!cleanTag) return null;
              return (
                <span key={index} className="inline-block bg-[#F0F2EF] text-[#6B7D6C] text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                  <span className="text-[#A3B5A5] mr-0.5">#</span><Highlight text={cleanTag} query={searchQuery} />
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        /* 🎯 目的・振り返りモード表示 */
        <div onDoubleClick={() => startEditing("growth")} className="mb-2 space-y-4 touch-manipulation">
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#F2EFE9]">
            <span className="text-xs font-bold text-[#8FA391] block mb-1">🎯 今日の目的</span>
            <p className={`text-[15px] font-bold ${!diary.purpose ? "text-[#B0B0B0] italic" : "text-[#333333]"}`}>
              <Highlight text={diary.purpose || "未設定"} query={searchQuery} />
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#A3B5A5] block mb-1">🧠 何を考えたか</span>
            <p className={`text-sm leading-[1.6] ${!diary.thoughtProcess ? "text-[#B0B0B0] italic" : "text-[#555555]"}`}>
              <Highlight text={diary.thoughtProcess || "未記入"} query={searchQuery} />
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#A3B5A5] block mb-1">✅ 実際に何をしたか</span>
            <p className={`text-sm leading-[1.6] ${!diary.actionFact ? "text-[#B0B0B0] italic" : "text-[#555555]"}`}>
              <Highlight text={diary.actionFact || "未記入"} query={searchQuery} />
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#A3B5A5] block mb-1">➡️ 次の一手</span>
            <p className={`text-sm leading-[1.6] ${!diary.nextAction ? "text-[#B0B0B0] italic" : "text-[#555555]"}`}>
              <Highlight text={diary.nextAction || "未記入"} query={searchQuery} />
            </p>
          </div>
        </div>
      )}
      
      {/* ⭐️ フッター（編集・削除ボタン） */}
      <div className="mt-auto pt-4 flex justify-end gap-2 border-t border-dashed border-[#F0F0F0]">
        <button type="button" onClick={() => startEditing(activeTab)} className="text-[#8FA391] text-xs font-medium border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-3 py-2 bg-[#F9FBF9]">
          {activeTab === "diary" ? "日記を編集" : "振り返りを編集"}
        </button>
        <form action={onDelete}>
          <input type="hidden" name="id" value={diary.id} />
          <button type="submit" className="text-[#D98C8C] text-xs font-medium border border-[#F2D6D6] hover:border-[#E8BDBD] rounded-lg px-3 py-2 bg-[#FDF5F5]">
            削除
          </button>
        </form>
      </div>

    </div>
  );
}