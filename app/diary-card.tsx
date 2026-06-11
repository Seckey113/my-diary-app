"use client";

import { useState, useTransition, useRef, useEffect } from "react";

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

  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // ⭐️ 新規追加：どこをダブルタップしたかを記憶する変数と、入力欄を操作するためのリモコン（Ref）
  const [editFocus, setEditFocus] = useState<"title" | "content" | "tags" | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  const isNoTitle = diary.title === "無題";
  const isNoContent = diary.content === "エピソード記録なし";
  const isNoTags = diary.tags === "タグなし";

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  }, [diary.content]);

  // ⭐️ 新規追加：編集画面が開いた瞬間、指定された入力欄に自動でカーソルを合わせる魔法
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        if (editFocus === "title" && titleInputRef.current) titleInputRef.current.focus();
        else if (editFocus === "content" && contentInputRef.current) contentInputRef.current.focus();
        else if (editFocus === "tags" && tagsInputRef.current) tagsInputRef.current.focus();
      }, 50); // 画面が切り替わるのを0.05秒だけ待ってからカーソルを当てる
      return () => clearTimeout(timer);
    }
  }, [isEditing, editFocus]);

  // ⭐️ 新規追加：編集モードを開始する専用の関数
  const startEditing = (target: "title" | "content" | "tags" | null = null) => {
    setEditFocus(target);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="p-4 sm:p-8 border-2 border-[#8FA391] rounded-2xl shadow-md bg-[#F9FBF9] transition duration-300">
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
            {/* ⭐️ ref={titleInputRef} を追加してリモコンを受信できるようにする */}
            <input ref={titleInputRef} type="text" name="title" defaultValue={isNoTitle ? "" : diary.title} placeholder="無題" className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">エピソード</label>
            {/* ⭐️ ref={contentInputRef} を追加 */}
            <textarea ref={contentInputRef} name="content" defaultValue={isNoContent ? "" : diary.content} placeholder="エピソード記録なし" rows={7} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] resize-none bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888888] mb-1">タグ（複数ある場合は「、」で区切る）</label>
            {/* ⭐️ ref={tagsInputRef} を追加 */}
            <input ref={tagsInputRef} type="text" name="tags" defaultValue={isNoTags ? "" : diary.tags} placeholder="タグなし" className="w-full p-2.5 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] bg-white" />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setIsEditing(false)} disabled={isPending} className="px-4 py-2 text-sm font-medium text-[#888888] hover:bg-[#EBE8E0] rounded-xl transition">
              キャンセル
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-bold text-white bg-[#8FA391] hover:bg-[#7C907E] rounded-xl transition shadow-sm">
              {isPending ? "更新中..." : "更新する"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 border border-[#EBE8E0] rounded-2xl shadow-sm bg-white hover:shadow-md transition duration-300 flex flex-col h-full">
      
      <div className="mb-4">
        <span className="text-xs text-[#8FA391] font-medium block mb-1">
          {formatToZeroPadding(diary.date)}
        </span>
        {/* ⭐️ タイトル部分：onDoubleClick と touch-manipulation を追加 */}
        <h3 
          onDoubleClick={() => startEditing("title")}
          className={`text-lg sm:text-xl break-words leading-snug touch-manipulation ${isNoTitle ? "text-[#B0B0B0] italic font-medium" : "text-[#333333] font-bold"}`}
        >
          <Highlight text={diary.title} query={searchQuery} />
        </h3>
      </div>
      
      {/* ⭐️ エピソード部分：onDoubleClick と touch-manipulation を追加 */}
      <div 
        onClick={() => !isNoContent && isOverflowing && setIsExpanded(!isExpanded)} 
        onDoubleClick={() => startEditing("content")}
        className={`mb-2 touch-manipulation ${!isNoContent && isOverflowing ? "cursor-pointer group" : ""}`}
      >
        <p 
          ref={contentRef}
          className={`whitespace-pre-wrap leading-[1.8] transition-all ${isExpanded ? "" : "line-clamp-3"} ${isNoContent ? "text-[#B0B0B0] italic text-sm" : "text-[#444444] text-[15px] sm:text-base"}`}
        >
          <Highlight text={diary.content} query={searchQuery} />
        </p>
        
        {!isNoContent && isOverflowing && (
          <div className="mt-2 text-sm text-[#A3B5A5] font-medium group-hover:text-[#8FA391] transition inline-block">
            {isExpanded ? "▲ 閉じる" : "▼ 続きを読む"}
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-4 flex flex-wrap justify-between items-end gap-4 border-t border-dashed border-[#F0F0F0]">
        
        {/* ⭐️ タグ部分：onDoubleClick と touch-manipulation を追加 */}
        <div 
          onDoubleClick={() => startEditing("tags")}
          className="flex flex-wrap gap-2 flex-1 touch-manipulation"
        >
          {diary.tags && (
            isNoTags ? (
              <span className="inline-block text-xs px-3.5 py-1.5 rounded-full font-medium bg-[#FAFAFA] border border-[#EBE8E0] text-[#B0B0B0] italic">
                <Highlight text={diary.tags} query={searchQuery} />
              </span>
            ) : (
              diary.tags.split("、").map((tag: string, index: number) => {
                const trimmedTag = tag.trim();
                if (!trimmedTag) return null;
                const cleanTag = trimmedTag.startsWith("#") ? trimmedTag.substring(1) : trimmedTag;
                return (
                  <span 
                    key={index} 
                    className="inline-block bg-[#F0F2EF] text-[#6B7D6C] text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide shadow-sm"
                  >
                    <span className="text-[#A3B5A5] mr-0.5">#</span>
                    <Highlight text={cleanTag} query={searchQuery} />
                  </span>
                );
              })
            )
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {/* ⭐️ 通常の編集ボタンを押した時は、特にフォーカスせず普通に開く */}
          <button type="button" onClick={() => startEditing(null)} className="text-[#8FA391] hover:text-[#7C907E] text-xs sm:text-sm font-medium border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-3 py-2 transition bg-[#F9FBF9] hover:bg-[#F0F4F0]">
            編集
          </button>
          <form action={onDelete}>
            <input type="hidden" name="id" value={diary.id} />
            <button type="submit" className="text-[#D98C8C] hover:text-[#C57676] text-xs sm:text-sm font-medium border border-[#F2D6D6] hover:border-[#E8BDBD] rounded-lg px-3 py-2 transition bg-[#FDF5F5] hover:bg-[#FAF0F0]">
              削除
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}