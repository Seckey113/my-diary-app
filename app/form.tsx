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
  existingReviews = [],
}: {
  clientAction: (formData: FormData) => Promise<void>;
  existingReviews?: any[];
}) {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "growth" ? "growth" : "diary";
  const focus = searchParams.get("focus");

  const [activeTab, setActiveTab] = useState<"diary" | "growth">(initialMode);
  const [selectedDate, setSelectedDate] = useState(getToday());

  // 保存完了表示と、エラーメッセージを管理する状態
  const [isSaved, setIsSaved] = useState(false);
  const [formError, setFormError] = useState(""); 
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const purposeRef = useRef<HTMLInputElement>(null);
  const thoughtProcessRef = useRef<HTMLTextAreaElement>(null);
  const actionFactRef = useRef<HTMLTextAreaElement>(null);
  const nextActionRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 現在選択されている日付のデータを先読み
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

  // 画面を離れたときにタイマーを解除
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
        // 送信開始時に、前回の成功表示とエラー表示をリセット
        setIsSaved(false);
        setFormError("");

        // FormDataから値を取り出し、前後の空白を削除
        const getValue = (name: string) => String(formData.get(name) || "").trim();

        // 現在のタブごとに「完全な空欄」かどうかを判定
        const isDiaryEmpty = !getValue("title") && !getValue("content") && !getValue("tags");
        const isGrowthEmpty = !getValue("purpose") && !getValue("thoughtProcess") && !getValue("actionFact") && !getValue("nextAction");

        // 日記タブで完全に空欄なら、保存せずにエラーを表示
        if (activeTab === "diary" && isDiaryEmpty) {
          setFormError("日記エピソードの内容を1つ以上入力してください。");
          return; 
        }

        // 目的・振り返りタブで完全に空欄なら、保存せずにエラーを表示
        if (activeTab === "growth" && isGrowthEmpty) {
          setFormError("目的・振り返りの内容を1つ以上入力してください。");
          return; 
        }

        // --- ⭐️ 入力がある場合のみ、ここから下の保存処理が走る ---
        try {
          // 既存のServer Actionを実行
          await clientAction(formData);

          // 保存完了後に、ボタンを「保存しました！」表示にする
          setIsSaved(true);

          // すでにタイマーが動いている場合は一度止める
          if (savedTimerRef.current) {
            clearTimeout(savedTimerRef.current);
          }

          // 2秒後に通常の「記録する」表示へ戻す
          savedTimerRef.current = setTimeout(() => {
            setIsSaved(false);
          }, 2000);
        } catch (error) {
          console.error(error);
          // ⭐️ API制限や通信エラーの時は赤い文字で知らせる
          setFormError("保存中にエラーが発生しました。通信環境等を確認してもう一度お試しください。");
        }
      }}
      className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-[#EBE8E0] mb-10 flex flex-col"
    >
      <input type="hidden" name="entryType" value={activeTab} />

      {/* タブ切り替え */}
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

      {/* 日付 */}
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

      {/* 日記タブの入力欄 */}
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

      {/* 目的・振り返りタブの入力欄 */}
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

      {/* エラーがある場合だけ、ボタンの上に赤いメッセージを表示 */}
      {formError && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-500"
        >
          {formError}
        </p>
      )}

      {/* 魔法の保存ボタン */}
      <SubmitButton isSaved={isSaved} />
    </form>
  );
}