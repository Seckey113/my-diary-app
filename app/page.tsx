import { getDiaries, addDiary, deleteDiary, updateDiary } from "./lib/sheets"; // ⭐️ updateDiaryを追加
import { revalidatePath } from "next/cache";
import { DiaryForm } from "./form";
import { SearchBar } from "./search-bar";
import { DiaryCard } from "./diary-card"; // ⭐️ 新しく作った部品を読み込む

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const diaries = await getDiaries();
  
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q || "";

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

  // ⭐️ 新しく追加した「編集・更新」の処理（Server Action）
  async function editDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const dateInput = formData.get("date") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const tags = formData.get("tags") as string;

    if (!id || !title || !content) return;

    const date = dateInput
      ? new Date(dateInput).toLocaleDateString("ja-JP")
      : new Date().toLocaleDateString("ja-JP");

    await updateDiary(id, date, title, content, tags);
    revalidatePath("/");
  }

  async function removeDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;

    await deleteDiary(id);
    revalidatePath("/");
  }

  const filteredDiaries = diaries.filter((diary) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    
    const safeTitle = diary.title || "";
    const safeContent = diary.content || "";
    const safeTags = diary.tags || "";

    return (
      safeTitle.toLowerCase().includes(lowerQuery) ||
      safeContent.toLowerCase().includes(lowerQuery) ||
      safeTags.toLowerCase().includes(lowerQuery)
    );
  });

  const sortedDiaries = [...filteredDiaries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupedDiaries: Record<string, Record<string, typeof diaries>> = {};
  
  sortedDiaries.forEach((diary) => {
    const d = new Date(diary.date);
    const year = isNaN(d.getTime()) ? "年不明" : `${d.getFullYear()}年`;
    const month = isNaN(d.getTime()) ? "月不明" : `${d.getMonth() + 1}月`;

    if (!groupedDiaries[year]) groupedDiaries[year] = {};
    if (!groupedDiaries[year][month]) groupedDiaries[year][month] = [];

    groupedDiaries[year][month].push(diary);
  });

  return (
    <div 
      className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] py-12 px-4 sm:px-8"
      style={{ fontFamily: '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Zen Maru Gothic", sans-serif' }}
    >
      <main className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#8FA391] mb-10 tracking-wider">My Diary!!</h1>

        <DiaryForm clientAction={createDiary} />

        <SearchBar />

        <div className="space-y-6">
          {Object.keys(groupedDiaries).length === 0 ? (
            <p className="text-[#9CA3AF] text-center py-12">
              {searchQuery ? `「${searchQuery}」に一致する日記は見つかりませんでした。` : "まだ日記がありません。最初の日記を記録しましょう！"}
            </p>
          ) : (
            Object.keys(groupedDiaries).sort((a, b) => b.localeCompare(a)).map((year, index) => (
              <details key={year} className="group bg-white rounded-2xl shadow-sm border border-[#EBE8E0] overflow-hidden" open={index === 0 || searchQuery !== ""}>
                <summary className="cursor-pointer p-5 font-bold text-xl text-[#8FA391] bg-[#F9FBF9] hover:bg-[#F0F4F0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                  {year}
                  <span className="text-sm transition-transform duration-300 group-open:rotate-180">▼</span>
                </summary>

                <div className="p-4 space-y-4">
                  {Object.keys(groupedDiaries[year]).sort((a, b) => parseInt(b) - parseInt(a)).map((month, mIndex) => (
                    <details key={month} className="group/month bg-[#FAF9F6] rounded-xl border border-[#EBE8E0] overflow-hidden" open={(index === 0 && mIndex === 0) || searchQuery !== ""}>
                      <summary className="cursor-pointer p-4 font-bold text-lg text-[#6B7D6C] hover:bg-[#EBE8E0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-3">
                          {month}
                          <span className="text-xs font-normal text-[#9CA3AF] bg-white px-2 py-0.5 rounded-full border border-[#EBE8E0]">
                            {groupedDiaries[year][month].length}件
                          </span>
                        </div>
                        <span className="text-xs transition-transform duration-300 group-open/month:rotate-180 text-[#8FA391]">▼</span>
                      </summary>
                      
                      <div className="p-4 space-y-5 bg-white">
                        {groupedDiaries[year][month].map((diary) => (
                          /* ⭐️ 新しく作った DiaryCard コンポーネントに置き換え！ */
                          <DiaryCard 
                            key={diary.id} 
                            diary={diary} 
                            searchQuery={searchQuery} 
                            onUpdate={editDiary} 
                            onDelete={removeDiary} 
                          />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      </main>
    </div>
  );
}