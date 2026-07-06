"use client";
import { useState, useTransition } from "react";

function formatToZeroPadding(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
  return dateStr;
}

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

// ⭐️ 純粋な日記エピソード専用のカードになりました！
export function DiaryCard({ 
  diary, searchQuery, onUpdate, onDelete 
}: { 
  diary: any; searchQuery: string; 
  onUpdate: (formData: FormData) => Promise<void>; 
  onDelete: (formData: FormData) => Promise<void>; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isNoTitle = diary.title === "無題";
  const isNoContent = diary.content === "エピソード記録なし";
  const isNoTags = diary.tags === "タグなし";

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  if (isEditing) {
    return (
      <div className="p-4 sm:p-6 border-2 border-[#8FA391] rounded-2xl shadow-md bg-white transition duration-300">
        <form action={(formData) => { startTransition(async () => { await onUpdate(formData); setIsEditing(false); }); }} className="space-y-4">
          <input type="hidden" name="id" value={diary.id} />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-[#8FA391]">📝 日記エピソードの編集</span>
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
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 border border-[#EBE8E0] rounded-2xl shadow-sm bg-white flex flex-col h-full relative">
      <div onDoubleClick={() => setIsEditing(true)} className="mb-2 touch-manipulation">
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
      
      <div className="mt-auto pt-4 flex justify-end gap-2 border-t border-dashed border-[#F0F0F0]">
        <button type="button" onClick={() => setIsEditing(true)} className="text-[#8FA391] text-xs font-medium border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-3 py-2 bg-[#F9FBF9]">
          日記を編集
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