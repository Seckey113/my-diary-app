import { getDiaries, addDiary, deleteDiary } from "./lib/sheets"; // ⭐️ deleteDiaryを追加
import { revalidatePath } from "next/cache";
import { DiaryForm } from "./form";

export default async function Home() {
  const diaries = await getDiaries();

  // 保存処理（Server Action）
  async function createDiary(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const tags = formData.get("tags") as string;

    if (!title || !content) return;

    await addDiary(title, content, tags);
    revalidatePath("/");
  }

  // ⭐️ 削除処理（Server Actionを新しく追加）
  async function removeDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;

    // 裏側の削除関数を実行
    await deleteDiary(id);
    
    // 画面を最新状態に更新
    revalidatePath("/");
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600 mb-8">私の日記アプリ</h1>

      <DiaryForm clientAction={createDiary} />

      {/* 過去の日記一覧 */}
      <div className="space-y-4">
        {diaries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">まだ日記がありません。最初の思い出を記録しましょう！</p>
        ) : (
          [...diaries].reverse().map((diary) => (
            <div key={diary.id} className="p-5 border rounded-lg shadow-sm bg-white hover:shadow-md transition">
              
              {/* ⭐️ タイトル部分と削除ボタンを横並びにするためのレイアウト修正 */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-bold text-xl block mb-1">{diary.title}</span>
                  <span className="text-sm text-gray-500">{diary.date}</span>
                </div>
                
                {/* ⭐️ 削除ボタン用のミニフォーム */}
                <form action={removeDiary}>
                  <input type="hidden" name="id" value={diary.id} />
                  <button 
                    type="submit" 
                    className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-100 hover:border-red-300 rounded px-2 py-1 transition bg-red-50/50 hover:bg-red-50"
                  >
                    削除
                  </button>
                </form>
              </div>
              
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{diary.content}</p>
              {diary.tags && (
                <div className="mt-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                    {diary.tags}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}