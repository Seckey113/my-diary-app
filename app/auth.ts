"use server";
import { cookies } from "next/headers";

export async function login(formData: FormData) {
  const password = formData.get("password") as string;
  const correctPassword = process.env.APP_PASSWORD;

  if (!correctPassword) {
    return { success: false, error: "サーバーにパスワードが設定されていません" };
  }

  if (password === correctPassword) {
    // ⭐️ 合格したら、ブラウザに「30日間有効な許可証(Cookie)」を持たせる
    const cookieStore = await cookies();
    cookieStore.set("diary_auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30日間（毎回入力する手間を省く）
      path: "/",
    });
    return { success: true };
  } else {
    return { success: false, error: "パスワードが間違っています" };
  }
}

export async function logout() {
  // ⭐️ ログアウト時は許可証を破棄する
  const cookieStore = await cookies();
  cookieStore.delete("diary_auth");
}