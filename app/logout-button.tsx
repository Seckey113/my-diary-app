"use client";
import { logout } from "./auth";

export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await logout();
        window.location.reload();
      }}
      className="text-[#A3B5A5] hover:text-[#8FA391] text-xs font-bold transition flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white"
    >
      🔒 ログアウト
    </button>
  );
}