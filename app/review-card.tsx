"use client";
import { useState, useTransition } from "react";

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

// ⭐️ その日の「目的と振り返り」をドカッと表示する専用カード！
export function ReviewCard({ 
  review, searchQuery, onUpdate 
}: { 
  review: any; searchQuery: string; 
  onUpdate: (formData: FormData) => Promise<void>; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 全部空っぽなら「未記入状態」として扱う
  const isEmpty = !review.purpose && !review.thoughtProcess && !review.actionFact && !review.nextAction;

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  if (isEditing) {
    return (
      <div className="p-4 sm:p-6 border-2 border-[#8FA391] rounded-2xl shadow-md bg-white transition duration-300">
        <form action={(formData) => { startTransition(async () => { await onUpdate(formData); setIsEditing(false); }); }} className="space-y-4">
          <input type="hidden" name="date" value={review.date} />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-[#8FA391]">🎯 目的・振り返りの編集</span>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#888888] mb-1">🎯 今日の目的</label>
            <input type="text" name="purpose" defaultValue={review.purpose} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#888888] mb-1">🧠 何を考えたか</label>
            <textarea name="thoughtProcess" defaultValue={review.thoughtProcess} rows={2} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#888888] mb-1">✅ 実際に何をしたか</label>
            <textarea name="actionFact" defaultValue={review.actionFact} rows={2} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#888888] mb-1">➡️ 次の一手</label>
            <textarea name="nextAction" defaultValue={review.nextAction} rows={2} onChange={autoResize} className="w-full p-2.5 border border-[#EBE8E0] rounded-xl outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-[#888888] bg-[#F0F4F0] rounded-lg">キャンセル</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-bold text-white bg-[#8FA391] rounded-lg">{isPending ? "保存中..." : "保存する"}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div onDoubleClick={() => setIsEditing(true)} className={`p-4 sm:p-6 bg-white border rounded-2xl shadow-sm touch-manipulation relative group ${isEmpty ? "border-dashed border-[#C0C0C0]" : "border-[#EBE8E0]"}`}>
      {isEmpty ? (
        // 未記入状態の親切なUI
        <div className="text-center py-6 cursor-pointer" onClick={() => setIsEditing(true)}>
          <p className="text-[#8FA391] text-sm font-bold mb-2">🎯 この日の目的・振り返りは未記入です</p>
          <p className="text-[#B0B0B0] text-xs">タップして追加する</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#F2EFE9]">
            <span className="text-xs font-bold text-[#8FA391] block mb-1">🎯 今日の目的</span>
            <p className={`text-[15px] font-bold ${!review.purpose ? "text-[#B0B0B0] italic" : "text-[#333333]"}`}>
              <Highlight text={review.purpose || "未設定"} query={searchQuery} />
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#A3B5A5] block mb-1">🧠 何を考えたか</span>
            <p className={`text-sm leading-[1.6] ${!review.thoughtProcess ? "text-[#B0B0B0] italic" : "text-[#555555]"}`}>
              <Highlight text={review.thoughtProcess || "未記入"} query={searchQuery} />
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#A3B5A5] block mb-1">✅ 実際に何をしたか</span>
            <p className={`text-sm leading-[1.6] ${!review.actionFact ? "text-[#B0B0B0] italic" : "text-[#555555]"}`}>
              <Highlight text={review.actionFact || "未記入"} query={searchQuery} />
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#A3B5A5] block mb-1">➡️ 次の一手</span>
            <p className={`text-sm leading-[1.6] ${!review.nextAction ? "text-[#B0B0B0] italic" : "text-[#555555]"}`}>
              <Highlight text={review.nextAction || "未記入"} query={searchQuery} />
            </p>
          </div>
        </div>
      )}
      
      {/* フッター（編集ボタン） */}
      {!isEmpty && (
        <div className="mt-4 pt-4 border-t border-dashed border-[#F0F0F0] flex justify-end">
          <button type="button" onClick={() => setIsEditing(true)} className="text-[#8FA391] text-xs font-medium border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-3 py-2 bg-[#F9FBF9]">
            振り返りを編集
          </button>
        </div>
      )}
    </div>
  );
}