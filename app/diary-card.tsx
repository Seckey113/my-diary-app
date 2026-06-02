"use client";

import { useState, useTransition } from "react";

// 日付文字列("2026/5/26")をカレンダー入力用("2026-05-26")に変換する補助ツール
function formatDateForInput(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ⭐️ 提案1：日付を綺麗にゼロ埋め（2026/06/01）にするための専用ツール
function formatToZeroPadding(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
  }
  return dateStr;
}

export function Highlight({ text, query }: { text?: string; query: string }) {
  if (!text) return null;
  if (!query) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 text-gray-900 px-1 rounded-sm">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}

export function DiaryCard({ 
  diary, 
  searchQuery, 
  onUpdate, 
  onDelete 
}: { 
  diary: any; 
  searchQuery: string; 
  onUpdate: (formData: FormData) => Promise<void>; 
  onDelete: (formData: FormData) => Promise<void>; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isEditing) {
    return (
      <div className="p-6 sm:p-8 border-2 border-[#8FA391] rounded-2xl shadow-md bg-[#F9FBF9] transition duration-300">
        <form action={(formData) => {
          startTransition(async () => {
            await onUpdate(formData);
            setIsEditing(false);
          });
        }} className="space-y-4">
          <input type="hidden" name="id" value={diary.id} />
          
          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">日付</label>
            <input type="date" name="date" defaultValue={formatDateForInput(diary.date)} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] bg-white cursor-pointer" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">タイトル</label>
            <input type="text" name="title" defaultValue={diary.title} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] bg-white" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">本文</label>
            <textarea name="content" defaultValue={diary.content} rows={5} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] resize-none bg-white" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">タグ</label>
            <input type="text" name="tags" defaultValue={diary.tags} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] bg-white" />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setIsEditing(false)} disabled={isPending} className="px-4 py-2 text-sm font-medium text-[#888888] hover:bg-[#EBE8E0] rounded-xl transition">
              キャンセル
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-bold text-white bg-[#8FA391] hover:bg-[#7C907E] rounded-xl transition shadow-sm">
              {isPending ? "更新しています..." : "更新する"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 border border-[#EBE8E0] rounded-2xl shadow-sm bg-white hover:shadow-md transition duration-300">
      
      {/* ⭐️ 提案2：スマホでは縦並び(flex-col)、PCでは横並び(sm:flex-row)にして余白を確保 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-5 gap-4">
        
        {/* タイトルと日付エリア（横幅をたっぷり使う） */}
        <div className="w-full">
          <span className="font-bold text-xl block mb-1 text-[#333333] break-words">
            <Highlight text={diary.title} query={searchQuery} />
          </span>
          {/* ⭐️ 提案1：日付表示を formatToZeroPadding 関数に通して綺麗にする */}
          <span className="text-sm text-[#8FA391] font-medium">
            {formatToZeroPadding(diary.date)}
          </span>
        </div>

        {/* ⭐️ ボタンエリア：絶対に押し潰されない(shrink-0)、スマホでは右寄せ(self-end) */}
        <div className="flex gap-2 shrink-0 self-end sm:self-start">
          <button type="button" onClick={() => setIsEditing(true)} className="text-[#8FA391] hover:text-[#7C907E] text-sm font-medium border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-3 py-1.5 transition bg-[#F9FBF9] hover:bg-[#F0F4F0]">
            編集
          </button>
          <form action={onDelete}>
            <input type="hidden" name="id" value={diary.id} />
            <button type="submit" className="text-[#D98C8C] hover:text-[#C57676] text-sm font-medium border border-[#F2D6D6] hover:border-[#E8BDBD] rounded-lg px-3 py-1.5 transition bg-[#FDF5F5] hover:bg-[#FAF0F0]">
              削除
            </button>
          </form>
        </div>
      </div>
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="cursor-pointer group"
      >
        <p className={`text-[#555555] whitespace-pre-wrap leading-relaxed tracking-wide transition-all ${isExpanded ? "" : "line-clamp-3"}`}>
          <Highlight text={diary.content} query={searchQuery} />
        </p>
        <div className="mt-2 text-sm text-[#A3B5A5] font-medium group-hover:text-[#8FA391] transition">
          {isExpanded ? "▲ 閉じる" : "▼ 続きを読む"}
        </div>
      </div>
      
      {diary.tags && (
        <div className="mt-6">
          <span className="inline-block bg-[#F0F2EF] text-[#6B7D6C] text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide">
            <Highlight text={diary.tags} query={searchQuery} />
          </span>
        </div>
      )}
    </div>
  );
}