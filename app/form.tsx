"use client";

import { useRef, useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 日付の表記ゆれを揃えて比較するためのヘルパー関数
function normalizeDateKey(dateStr: string) {
  if (!dateStr) return "";
  const normalized = String(dateStr).replace(/-/g, "/");
  const parts = normalized.split("/");
  if (parts.length !== 3) return String(dateStr);
  return `${parts[0]}/${parts[1].padStart(2, "0")}/${parts[2].padStart(2, "0")}`;
}

// 保存ボタン専用のコンポーネント
// 親の <form> が送信中かどうかを useFormStatus で取得します
function SubmitButton({ isSaved }: { isSaved: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`
        mt-8 w-full text-white font-bold text-lg py-4 rounded-2xl
        transition-all duration-200 shadow-sm tracking-widest
        ${
          pending
            ? "bg-gray-400 cursor-not-allowed opacity-80"
            : isSaved
              ? "bg-green-500"
              : "bg-[#8FA391] hover:bg-[#7C907E] active:scale-[0.98]"
        }
      `}
    >
      {pending ? "⏳ 保存中..." : isSaved ? "✅ 保存しました！" : "記録する"}
    </button>
  );
}

export function DiaryForm({
  clientAction,
  existingReviews = [], // page.tsx から既存の振り返りデータ群を受け取る
}: {
  clientAction: (formData: FormData) => Promise<void>;
  existingReviews?: any[];
}) {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "growth" ? "growth" : "diary";
  const focus = searchParams.get("focus");

  const [activeTab, setActiveTab] = useState<"diary" | "growth">(initialMode);

  // 選択されている日付を管理する状態
  const [selectedDate, setSelectedDate] = useState(getToday());

  // 保存完了表示を一時的に出すための状態
  const [isSaved, setIsSaved] = useState(false);

  // 「保存しました！」を消すタイマーを管理します
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const purposeRef = useRef<HTMLInputElement>(null);
  const thoughtProcessRef = useRef<HTMLTextAreaElement>(null);
  const actionFactRef = useRef<HTMLTextAreaElement>(null);
  const nextActionRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 現在選択されている日付の「既存の目的・振り返りデータ」を探して先読みします
  const currentKey = normalizeDateKey(selectedDate);
  const currentReview = existingReviews.find((r) => normalizeDateKey(r.date) === currentKey) || {
    purpose: "",
    thoughtProcess: "",
    actionFact: "",
    nextAction: "",
  };

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

  // 画面を離れたときにタイマーが残らないようにします
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const autoResize = (e: ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <form
      action={async (formData) => {
        // 送信開始時に、前回の「保存しました！」表示を消します
        setIsSaved(false);

        // 既存のServer Actionを実行します
        await clientAction(formData);

        // 保存完了後に、ボタンを「保存しました！」表示にします
        setIsSaved(true);

        // すでにタイマーが動いている場合は一度止めます
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }

        // 2秒後に通常の「記録する」表示へ戻します
        savedTimerRef.current = setTimeout(() => {
          setIsSaved(false);
        }, 2000);
      }}
      className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-[#EBE8E0] mb-10 flex flex-col"
    >
      {/* 現在どちらのタブを保存しようとしているかをサーバー側へ伝えます */}
      <input type="hidden" name="entryType" value={activeTab} />

      {/* タブ切り替えスイッチ */}
      <div className="flex bg-[#F0F4F0] p-1.5 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("diary")}
          className={`flex-1 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${
            activeTab === "diary"
              ? "bg-white text-[#6B7D6C] shadow-sm"
              : "text-[#A3B5A5] hover:bg-[#E6EBE6]"
          }`}
        >
          📝 日記エピソード
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("growth")}
          className={`flex-1 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${
            activeTab === "growth"
              ? "bg-white text-[#6B7D6C] shadow-sm"
              : "text-[#A3B5A5] hover:bg-[#E6EBE6]"
          }`}
        >
          🎯 目的・振り返り
        </button>
      </div>

      {/* 日付入力欄 */}
      <div className="mb-5">
        <input
          type="date"
          name="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ WebkitAppearance: "none" }}
          className="appearance-none block w-full px-3 py-3 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#4A4A4A] font-bold transition"
        />
      </div>

      {/* 日記モードの入力欄 */}
      <div className={activeTab === "diary" ? "space-y-5 block" : "hidden"}>
        <input
          type="text"
          name="title"
          placeholder="今日の一言"
          className="w-full p-3 border-b-2 border-[#EBE8E0] focus:border-[#8FA391] bg-transparent outline-none text-[#333333] text-lg sm:text-xl font-bold placeholder-[#B0B0B0] transition"
        />

        <textarea
          ref={contentRef}
          name="content"
          placeholder="今日あった出来事、会話、エピソード..."
          onChange={autoResize}
          rows={4}
          className="w-full p-4 bg-[#F9FBF9] border border-[#EBE8E0] rounded-2xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] resize-none transition leading-relaxed"
        />

        <input
          type="text"
          name="tags"
          placeholder="タグ（複数ある場合は「、」で区切る）"
          className="w-full p-4 bg-[#F9FBF9] border border-[#EBE8E0] rounded-2xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#555555] transition"
        />
      </div>

      {/* 目的・振り返りモードの入力欄 */}
      {/* key={selectedDate} により、日付が変わったときに初期値を現在のReviewデータにリセットします */}
      <div key={selectedDate} className={activeTab === "growth" ? "space-y-6 block" : "hidden"}>
        <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#F2EFE9]">
          <label className="block text-sm font-bold text-[#6B7D6C] mb-2 flex items-center gap-1.5">
            <span className="text-lg">🎯</span> 今日の目的
          </label>

          <input
            ref={purposeRef}
            type="text"
            name="purpose"
            defaultValue={currentReview.purpose}
            placeholder="朝：今日はどんな1日にしたいですか？"
            className="w-full p-4 bg-white border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#333333] font-medium transition"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#888888] mb-2 flex items-center gap-1.5">
            <span className="text-lg">🧠</span> 目的に対して、何を考えましたか？
          </label>

          <textarea
            ref={thoughtProcessRef}
            name="thoughtProcess"
            defaultValue={currentReview.thoughtProcess}
            placeholder="夜：なぜそうしようと思った？ 何を大切にしようとした？"
            onChange={autoResize}
            rows={2}
            className="w-full p-4 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#444444] resize-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#888888] mb-2 flex items-center gap-1.5">
            <span className="text-lg">✅</span> 実際に何を行動しましたか？
          </label>

          <textarea
            ref={actionFactRef}
            name="actionFact"
            defaultValue={currentReview.actionFact}
            placeholder="夜：どんな行動を取った？ 何を進めた？"
            onChange={autoResize}
            rows={2}
            className="w-full p-4 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#444444] resize-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#888888] mb-2 flex items-center gap-1.5">
            <span className="text-lg">➡️</span> 明日に活かすなら、次の一手は？
          </label>

          <textarea
            ref={nextActionRef}
            name="nextAction"
            defaultValue={currentReview.nextAction}
            placeholder="夜：明日はどう動く？"
            onChange={autoResize}
            rows={2}
            className="w-full p-4 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#444444] resize-none transition"
          />
        </div>
      </div>

      <SubmitButton isSaved={isSaved} />
    </form>
  );
}