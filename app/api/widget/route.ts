import { NextResponse } from "next/server";
import { getReviews } from "../../lib/sheets";

// Google API / crypto を使うため、Node.js Runtimeで動かすことを明示する
export const runtime = "nodejs";

// Vercelのサーバーが海外にあっても、日本時間の今日を yyyy/MM/dd で作る
function getTodayKeyJST() {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // ⭐️ ウィジェット専用の秘密トークンを環境変数から読む
  const secretToken = process.env.WIDGET_SECRET_TOKEN;

  // 環境変数が未設定、またはURLのtokenが違う場合は拒否する（鉄壁の守り）
  if (!secretToken || token !== secretToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  try {
    // 表示用なので、キャッシュ版のgetReviewsで爆速取得！
    const reviews = await getReviews();
    const todayKey = getTodayKeyJST();

    // 今日のデータを探す
    const todayReview = reviews.find((review) => review.date === todayKey);

    const purpose = todayReview?.purpose || "🎯 今日の目的は未設定です";

    return NextResponse.json(
      {
        date: todayKey,
        purpose,
      },
      {
        headers: {
          // ブラウザや中間サーバーにパスワード付きURLや個人データを残さない
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch data" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}