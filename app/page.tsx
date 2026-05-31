import { getDiaries, addDiary, deleteDiary } from "./lib/sheets";
import { revalidatePath } from "next/cache";
import { DiaryForm } from "./form";

export default async function Home() {
  const diaries = await getDiaries();

  async function createDiary(formData: FormData) {
    "use server";
    const dateInput = formData.get("date") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const tags = formData.get("tags") as string;

    if (!title || !content) return;

    const date = dateInput
      ? new Date(dateInput).toLocaleDateString("ja-JP")
      : new Date().toLocaleDateString("ja-JP");

    await addDiary(date, title, content, tags);
    revalidatePath("/");
  }

  async function removeDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;

    await deleteDiary(id);
    revalidatePath("/");
  }

  return (
    /* ⭐️ style属性を追加し、ヒラギノ丸ゴシックを指定します */
    <div 
      className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] py-12 px-4 sm:px-8"
      style={{ fontFamily: '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Zen Maru Gothic", sans-serif' }}
    >
      <main className="max-w-2xl mx-auto">
      
        {/* ⭐️ タイトルを落ち着いたセージグリーンに変更 */}
        <h1 className="text-3xl font-bold text-[#8FA391] mb-10 tracking-wider">My Diary</h1>

        <DiaryForm clientAction={createDiary} />

        <div className="space-y-6">
          {diaries.length === 0 ? (
            <p className="text-[#9CA3AF] text-center py-12">まだ日記がありません。最初の日記を記録しましょう！</p>
          ) : (
            [...diaries].reverse().map((diary) => (
              /* ⭐️ カードの角を大きく丸め（rounded-2xl）、枠線を柔らかい色（#EBE8E0）に */
              <div key={diary.id} className="p-6 sm:p-8 border border-[#EBE8E0] rounded-2xl shadow-sm bg-white hover:shadow-md transition duration-300">
                
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <span className="font-bold text-xl block mb-1 text-[#333333]">{diary.title}</span>
                    <span className="text-sm text-[#8FA391] font-medium">{diary.date}</span>
                  </div>
                  
                  <form action={removeDiary}>
                    <input type="hidden" name="id" value={diary.id} />
                    <button 
                      type="submit" 
                      className="text-[#D98C8C] hover:text-[#C57676] text-sm font-medium border border-[#F2D6D6] hover:border-[#E8BDBD] rounded-lg px-3 py-1.5 transition bg-[#FDF5F5] hover:bg-[#FAF0F0]"
                    >
                      削除
                    </button>
                  </form>
                </div>
                
                <p className="text-[#555555] whitespace-pre-wrap leading-relaxed tracking-wide">{diary.content}</p>
                
                {diary.tags && (
                  <div className="mt-6">
                    {/* ⭐️ タグもセージグリーンに合わせた優しい配色に */}
                    <span className="inline-block bg-[#F0F2EF] text-[#6B7D6C] text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide">
                      {diary.tags}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}