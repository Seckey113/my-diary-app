"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm ${
        pending ? "bg-[#D1D5DB] cursor-not-allowed" : "bg-[#8FA391] hover:bg-[#7C907E]"
      }`}
    >
      {pending ? "そっと保存しています..." : "日記を保存する"}
    </button>
  );
}

export function DiaryForm({ clientAction }: { clientAction: (formData: FormData) => Promise<any> }) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    setDate(localStorage.getItem("draft-date") || "");
    setTitle(localStorage.getItem("draft-title") || "");
    setContent(localStorage.getItem("draft-content") || "");
    setTags(localStorage.getItem("draft-tags") || "");
  }, []);

  useEffect(() => {
    localStorage.setItem("draft-date", date);
    localStorage.setItem("draft-title", title);
    localStorage.setItem("draft-content", content);
    localStorage.setItem("draft-tags", tags);
  }, [date, title, content, tags]);

  const [, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    await clientAction(formData);

    setDate("");
    setTitle("");
    setContent("");
    setTags("");
    localStorage.removeItem("draft-date");
    localStorage.removeItem("draft-title");
    localStorage.removeItem("draft-content");
    localStorage.removeItem("draft-tags");

    return null;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <h2 className="text-xl font-bold text-[#6B6357] mb-4 border-b border-[#EBE8E0] pb-2">
        新しい日記を書く
      </h2>

      <div>
        <label className="block text-[13px] text-[#8C8276] font-bold mb-1">
          日付（未選択の場合は今日になります）
        </label>
        {/* ⭐️ スマホのはみ出し防止： block, max-w-full, m-0, box-border, text-base を追加！ */}
        <input
          type="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block w-full max-w-full m-0 box-border p-3 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#4A4A4A] text-base transition"
        />
      </div>

      <div>
        <label className="block text-[13px] text-[#8C8276] font-bold mb-1">
          一言まとめ
        </label>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="今日の出来事を一言で..."
          className="block w-full max-w-full m-0 box-border p-3 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#4A4A4A] text-base transition"
        />
      </div>

      <div>
        <label className="block text-[13px] text-[#8C8276] font-bold mb-1">
          エピソード
        </label>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今日あったこと、考えたこと..."
          rows={5}
          className="block w-full max-w-full m-0 box-border p-3 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#4A4A4A] text-base transition resize-y"
        ></textarea>
      </div>

      <div>
        <label className="block text-[13px] text-[#8C8276] font-bold mb-1">
          タグ（例: 友人、感謝、気づき）
        </label>
        <input
          type="text"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="カンマ（、）区切りで入力"
          className="block w-full max-w-full m-0 box-border p-3 bg-[#FCF9F2] border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#8FA391] focus:border-transparent outline-none text-[#4A4A4A] text-base transition"
        />
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}