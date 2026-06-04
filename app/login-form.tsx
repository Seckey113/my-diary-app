"use client";
import { useState, useTransition } from "react";
import { login } from "./auth";

export function LoginForm() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await login(formData);
      if (!res.success) {
        setError(res.error || "エラーが発生しました");
      } else {
        window.location.reload(); // 成功したら画面をリロードして日記を表示
      }
    });
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-[#EBE8E0] transform transition-all">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#8FA391] tracking-wider mb-2">My Diary!!</h1>
        <p className="text-[#888888] text-xs font-medium tracking-widest">私だけにしか語れない物語</p>
      </div>
      
      <form action={handleSubmit} className="space-y-5">
        <div>
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            className="w-full p-4 bg-[#FCF9F2] border border-[#EBE8E0] rounded-2xl focus:ring-2 focus:ring-[#8FA391] outline-none text-[#4A4A4A] transition text-center tracking-widest text-lg"
            required
          />
        </div>
        
        {error && <p className="text-[#D98C8C] text-xs text-center font-bold">{error}</p>}
        
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#8FA391] hover:bg-[#7C907E] text-white font-bold py-4 rounded-2xl transition shadow-sm tracking-widest"
        >
          {isPending ? "認証中..." : "ロックを解除"}
        </button>
      </form>
    </div>
  );
}