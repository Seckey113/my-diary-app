"use client"; // 画面のリアルタイムな動き（状態変化）を扱うための宣言

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

// ⭐️ 「保存中...」のときだけボタンの見た目と文字を変えるための、ボタン専用のミニアプリ
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full text-white font-bold py-3 px-4 rounded-lg transition ${
        pending 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      {pending ? "保存しています..." : "保存する"}
    </button>
  );
}

// ⭐️ フォーム全体の部品
export function DiaryForm({ clientAction }: { clientAction: (formData: FormData) => Promise<void> }) {
  const [, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    await clientAction(formData);
    return null;
  }, null);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
      <h2 className="text-xl font-bold mb-4">新しい日記を書く</h2>
      <form 
        action={formAction} 
        onSubmit={(e) => {
          const form = e.currentTarget;
          setTimeout(() => form.reset(), 50);
        }}
        className="space-y-4"
      >
        {/* ⭐️ 新しく追加したカレンダー（日付選択）入力欄 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            日付（未選択の場合は今日の日付になります）
          </label>
          <input
            name="date"
            type="date"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 cursor-pointer"
          />
        </div>

        <div>
          <input
            name="title"
            type="text"
            placeholder="今日のタイトル（例: 最終面接だった！）"
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <textarea
            name="content"
            placeholder="今日はどんな一日でしたか？"
            required
            rows={4}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <input
            name="tags"
            type="text"
            placeholder="タグ（例: 就活, 思考, 趣味）"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <SubmitButton />
      </form>
    </div>
  );
}