"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      /* ⭐️ ボタンの色をセージグリーン（#8FA391）に変更し、角を丸く（rounded-xl） */
      className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm ${
        pending 
          ? "bg-[#D1D5DB] cursor-not-allowed" 
          : "bg-[#8FA391] hover:bg-[#7C907E]"
      }`}
    >
      {pending ? "そっと保存しています..." : "日記を保存する"}
    </button>
  );
}

export function DiaryForm({ clientAction }: { clientAction: (formData: FormData) => Promise<void> }) {
  const [, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    await clientAction(formData);
    return null;
  }, null);

  return (
    /* ⭐️ フォーム全体の角を丸め、余白を少し広げてゆったりと */
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#EBE8E0] mb-12">
      <h2 className="text-xl font-bold mb-6 text-[#555555]">新しい日記を書く</h2>
      <form 
        action={formAction} 
        onSubmit={(e) => {
          const form = e.currentTarget;
          setTimeout(() => form.reset(), 50);
        }}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-[#888888] mb-2">
            日付（未選択の場合は今日になります）
          </label>
          {/* ⭐️ 選択時の枠線（ring）をセージグリーンに変更 */}
          <input
            name="date"
            type="date"
            className="w-full p-3 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#555555] cursor-pointer transition"
          />
        </div>

        <div>
          <input
            name="title"
            type="text"
            placeholder="今日のタイトル（例: 久しぶりの再会）"
            required
            className="w-full p-3 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#333333] transition"
          />
        </div>
        <div>
          <textarea
            name="content"
            placeholder="どんな出来事がありましたか？感情や気付きも自由に書いてみましょう。"
            required
            rows={5}
            className="w-full p-3 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#333333] leading-relaxed transition resize-none"
          />
        </div>
        <div>
          <input
            name="tags"
            type="text"
            placeholder="タグ（例: 友人, 感謝, 気づき）"
            className="w-full p-3 border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#555555] transition"
          />
        </div>
        
        <SubmitButton />
      </form>
    </div>
  );
}