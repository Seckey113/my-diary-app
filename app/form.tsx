"use client";
import { useRef, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation"; 

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function DiaryForm({ clientAction }: { clientAction: (formData: FormData) => Promise<void> }) {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "growth" ? "growth" : "diary";
  const focus = searchParams.get("focus");

  const [activeTab, setActiveTab] = useState<"diary" | "growth">(initialMode);

  const purposeRef = useRef<HTMLInputElement>(null);
  const thoughtProcessRef = useRef<HTMLTextAreaElement>(null);
  const actionFactRef = useRef<HTMLTextAreaElement>(null);
  const nextActionRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTab === "growth") {
      if (focus === "purpose") setTimeout(() => purposeRef.current?.focus(), 100);
      if (focus === "thoughtProcess") setTimeout(() => thoughtProcessRef.current?.focus(), 100);
      if (focus === "actionFact") setTimeout(() => actionFactRef.current?.focus(), 100);
      if (focus === "nextAction") setTimeout(() => nextActionRef.current?.focus(), 100);
    } else {
      if (focus === "content") setTimeout(() => contentRef.current?.focus(), 100);
    }
  }, [focus, activeTab]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <form action={clientAction} className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-[#EBE8E0] mb-10 flex flex-col">
      
      {/* ⭐️ タブ切り替えスイッチ */}
      <div className="flex bg-[#F0F4F0] p-1.5 rounded-xl mb-6">
        <button type="button" onClick={() => setActiveTab("diary")} className={`flex-1 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${activeTab === "diary" ? "bg-white text-[#6B7D6C] shadow-sm" : "text-[#A3B5A5] hover:bg-[#E6EBE6]"}`}>
          📝 日記モード
        </button>
        <button type="button" onClick={() => setActiveTab("growth")} className={`flex-1 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${activeTab === "growth" ? "bg-white text-[#6B7D6C] shadow-sm" : "text-[#A3B5A5] hover:bg-[#E6EBE6]"}`}>
          🎯 目的・振り返り
        </button>
      </div>

      <div className="mb-5">
        <input type="date" name="date" defaultValue={getToday()} style={{ WebkitAppearance: "none" }} className="appearance-none block w-full px-3 py-3 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#4A4A4A] font-bold transition" />
      </div>

      {/* 📝 日記モードの入力欄 */}
      <div className={activeTab === "diary" ? "space-y-5 block" : "hidden"}>
        <input type="text" name="title" placeholder="今日のタイトル（無題でもOK）" className="w-full p-3 border-b-2 border-[#EBE8E0] focus:border-[#8FA391] bg-transparent outline-none text-[#333333] text-lg sm:text-xl font-bold placeholder-[#B0B0B0] transition" />
        <textarea ref={contentRef} name="content" placeholder="今日あったエピソード..." onChange={autoResize} rows={4} className="w-full p-4 bg-[#F9FBF9] border border-[#EBE8E0] rounded-2xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] resize-none transition leading-relaxed" />
        <input type="text" name="tags" placeholder="タグ（複数ある場合は「、」で区切る）" className="w-full p-4 bg-[#F9FBF9] border border-[#EBE8E0] rounded-2xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] transition" />
      </div>

      {/* 🎯 目的・振り返りモードの入力欄 */}
      <div className={activeTab === "growth" ? "space-y-6 block" : "hidden"}>
        <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#F2EFE9]">
          <label className="block text-sm font-bold text-[#6B7D6C] mb-2 flex items-center gap-1.5"><span className="text-lg">🎯</span> 今日の目的</label>
          <input ref={purposeRef} type="text" name="purpose" placeholder="今日はどんな1日にしたいですか？" className="w-full p-4 bg-white border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] font-medium transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#888888] mb-2 flex items-center gap-1.5"><span className="text-lg">🧠</span> 目的に対して、何を考えましたか？</label>
          <textarea ref={thoughtProcessRef} name="thoughtProcess" placeholder="なぜそうしようと思った？ 何を大切にしようとした？" onChange={autoResize} rows={2} className="w-full p-4 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#444444] resize-none transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#888888] mb-2 flex items-center gap-1.5"><span className="text-lg">✅</span> 実際に何を行動しましたか？</label>
          <textarea ref={actionFactRef} name="actionFact" placeholder="どんな行動を取った？ 何を進めた？" onChange={autoResize} rows={2} className="w-full p-4 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#444444] resize-none transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#888888] mb-2 flex items-center gap-1.5"><span className="text-lg">➡️</span> 明日に活かすなら、次の一手は？</label>
          <textarea ref={nextActionRef} name="nextAction" placeholder="明日はどう動く？" onChange={autoResize} rows={2} className="w-full p-4 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#444444] resize-none transition" />
        </div>
      </div>

      <button type="submit" className="mt-8 w-full bg-[#8FA391] hover:bg-[#7C907E] text-white font-bold text-lg py-4 rounded-2xl transition shadow-sm tracking-widest">
        記録する
      </button>
    </form>
  );
}