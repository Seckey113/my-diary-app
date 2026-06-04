"use client";

import { useState, useTransition } from "react";

function formatDateForInput(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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

  // ⭐️ 判定用の変数を用意（isNoTags を追加）
  const isNoTitle = diary.title === "無題";
  const isNoContent = diary.content === "エピソード記録なし";
  const isNoTags = diary.tags === "タグなし";

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
            <input type="date" name="date" defaultValue={formatDateForInput(diary.date)} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] bg-white cursor-pointer" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">タイトル</label>
            {/* ⭐️ 「無題」の場合は入力欄を空っぽにしてあげる気配り */}
            <input type="text" name="title" defaultValue={isNoTitle ? "" : diary.title} placeholder="無題" className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">エピソード</label>
            {/* ⭐️ 「エピソード記録なし」の場合は入力欄を空っぽにしてあげる気配り */}
            <textarea name="content" defaultValue={isNoContent ? "" : diary.content} placeholder="エピソード記録なし" rows={5} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] resize-none bg-white" />
          </div>

          {/* ⭐️ 「タグなし」の場合は入力欄を空っぽにしてあげる */}
          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">タグ</label>
            <input type="text" name="tags" defaultValue={isNoTags ? "" : diary.tags} placeholder="タグなし" className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] bg-white" />
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
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-5 gap-4">
        <div className="w-full">
          {/* ⭐️ 「無題」の時は文字を薄くして斜体にする */}
          <span className={`text-xl block mb-1 break-words ${isNoTitle ? "text-[#B0B0B0] italic font-medium" : "text-[#333333] font-bold"}`}>
            <Highlight text={diary.title} query={searchQuery} />
          </span>
          <span className="text-sm text-[#8FA391] font-medium">
            {formatToZeroPadding(diary.date)}
          </span>
        </div>

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
      
      {/* ⭐️ エピソードが無い時はクリック判定自体を無くす */}
      <div 
        onClick={() => !isNoContent && setIsExpanded(!isExpanded)} 
        className={`${!isNoContent ? "cursor-pointer group" : ""}`}
      >
        {/* ⭐️ 「エピソード記録なし」の時は文字を薄くして斜体にする */}
        <p className={`whitespace-pre-wrap leading-relaxed tracking-wide transition-all ${isExpanded ? "" : "line-clamp-3"} ${isNoContent ? "text-[#B0B0B0] italic text-sm" : "text-[#555555]"}`}>
          <Highlight text={diary.content} query={searchQuery} />
        </p>
        
        {/* ⭐️ エピソードが無い時は「▼ 続きを読む」を隠す */}
        {!isNoContent && (
          <div className="mt-2 text-sm text-[#A3B5A5] font-medium group-hover:text-[#8FA391] transition">
            {isExpanded ? "▲ 閉じる" : "▼ 続きを読む"}
          </div>
        )}
      </div>
      
      {/* ⭐️ 「タグなし」の時は背景を白にして、文字を薄いグレー＆斜体にする */}
      {diary.tags && (
        <div className="mt-6">
          <span className={`inline-block text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide ${isNoTags ? "bg-white border border-[#EBE8E0] text-[#B0B0B0] italic" : "bg-[#F0F2EF] text-[#6B7D6C]"}`}>
            <Highlight text={diary.tags} query={searchQuery} />
          </span>
        </div>
      )}
    </div>
  );
}