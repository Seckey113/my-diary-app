import { getDiaries, addDiary, deleteDiary } from "./lib/sheets";
import { revalidatePath } from "next/cache";
import { DiaryForm } from "./form";
import { SearchBar } from "./search-bar";

// ⭐️ 検索キーワードを黄色くハイライトする専用の部品（空欄の時の安全策を追加）
function Highlight({ text, query }: { text?: string; query: string }) {
  if (!text) return null;
  if (!query) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 text-gray-900 px-1 rounded-sm">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}

// ⭐️ Next.js 15 対応：searchParams を「Promise（非同期）」として受け取る
export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const diaries = await getDiaries();
  
  // ⭐️ await を使って、URLからキーワードを確実に取りこぼさず受け取る
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
    
    // ⭐️ タグなどが空欄だった場合のエラーを防ぐ安全策
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
                          <div key={diary.id} className="p-6 border border-[#EBE8E0] rounded-2xl shadow-sm bg-white hover:shadow-md transition duration-300">
                            <div className="flex justify-between items-start mb-5">
                              <div>
                                <span className="font-bold text-xl block mb-1 text-[#333333]">
                                  <Highlight text={diary.title} query={searchQuery} />
                                </span>
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
                            <p className="text-[#555555] whitespace-pre-wrap leading-relaxed tracking-wide">
                              <Highlight text={diary.content} query={searchQuery} />
                            </p>
                            {diary.tags && (
                              <div className="mt-6">
                                <span className="inline-block bg-[#F0F2EF] text-[#6B7D6C] text-xs px-3.5 py-1.5 rounded-full font-medium tracking-wide">
                                  <Highlight text={diary.tags} query={searchQuery} />
                                </span>
                              </div>
                            )}
                          </div>
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