import { getDiaries, addDiary, deleteDiary, updateDiary, restoreDiary, permanentlyDeleteDiary } from "./lib/sheets"; // ⭐️ 新機能2つを読み込みに追加
import { revalidatePath } from "next/cache";
import { DiaryForm } from "./form";
import { SearchBar } from "./search-bar";
import { DiaryCard } from "./diary-card";
import { RefreshButton } from "./refresh-button"; // ⭐️ これを追加！

// URLや小数の「意味のある記号」は守る賢い変換ツール
function formatPunctuation(text: string) {
  if (!text) return "";
  const placeholders: string[] = [];
  let tempText = text.replace(/[a-zA-Z0-9\-_]+(?:[.,][a-zA-Z0-9\-_]+)+/g, (match) => {
    placeholders.push(match);
    return `__PLACEHOLDER_${placeholders.length - 1}__`;
  });
  tempText = tempText.replace(/[,，]/g, "、").replace(/[\.．]/g, "。");
  placeholders.forEach((placeholder, index) => {
    tempText = tempText.replace(`__PLACEHOLDER_${index}__`, () => placeholder);
  });
  return tempText;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const diaries = await getDiaries();
  
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q || "";

  async function createDiary(formData: FormData) {
    "use server";
    const dateInput = formData.get("date") as string;
    const title = formatPunctuation(formData.get("title") as string);
    const content = formatPunctuation(formData.get("content") as string);
    const tags = formatPunctuation(formData.get("tags") as string);
    if (!title || !content) return;
    const d = dateInput ? new Date(dateInput) : new Date();
const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    await addDiary(date, title, content, tags);
    revalidatePath("/");
  }

  async function editDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const dateInput = formData.get("date") as string;
    const title = formatPunctuation(formData.get("title") as string);
    const content = formatPunctuation(formData.get("content") as string);
    const tags = formatPunctuation(formData.get("tags") as string);
    if (!id || !title || !content) return;
    const d = dateInput ? new Date(dateInput) : new Date();
const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
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

  // ⭐️ 新規追加：ゴミ箱から復元する処理
  async function recoverDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;
    await restoreDiary(id);
    revalidatePath("/");
  }

  // ⭐️ 新規追加：ゴミ箱から完全に消去する処理
  async function purgeDiary(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;
    await permanentlyDeleteDiary(id);
    revalidatePath("/");
  }

  // ⭐️ データを「通常の日記」と「ゴミ箱の中身」に仕分ける
  const activeDiaries = diaries.filter((diary) => !diary.deletedAt);
  const trashDiaries = diaries.filter((diary) => diary.deletedAt);

  // 検索とグループ化は「通常の日記（activeDiaries）」だけに適用する
  const filteredDiaries = activeDiaries.filter((diary) => {
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

  const groupedDiaries: Record<string, Record<string, typeof activeDiaries>> = {};
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
        {/* ⭐️ タイトルと更新ボタンを横並びにする */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-[#8FA391] tracking-wider">My Diary!!</h1>
          <RefreshButton />
        </div>

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
                          <span className="text-xs font-normal text-[#9CA3AF] bg-white px-2 py-0.5 rounded-full border border-[#EBE8E0]">{groupedDiaries[year][month].length}件</span>
                        </div>
                        <span className="text-xs transition-transform duration-300 group-open/month:rotate-180 text-[#8FA391]">▼</span>
                      </summary>
                      <div className="p-4 space-y-5 bg-white">
                        {groupedDiaries[year][month].map((diary) => (
                          <DiaryCard key={diary.id} diary={diary} searchQuery={searchQuery} onUpdate={editDiary} onDelete={removeDiary} />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>

        {/* ⭐️ 新規追加：ゴミ箱コーナー（ゴミ箱に中身がある時だけ一番下に表示されます） */}
        {trashDiaries.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[#EBE8E0]">
            <details className="group bg-white rounded-2xl shadow-sm border border-[#F2D6D6] overflow-hidden">
              <summary className="cursor-pointer p-5 font-bold text-[#D98C8C] bg-[#FDF5F5] hover:bg-[#FAF0F0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <span>🗑️ 最近削除した項目</span>
                  <span className="text-xs font-normal text-[#D98C8C] bg-white px-2 py-0.5 rounded-full border border-[#F2D6D6]">{trashDiaries.length}件</span>
                </div>
                <span className="text-sm transition-transform duration-300 group-open:rotate-180 text-[#D98C8C]">▼</span>
              </summary>
              
              <div className="p-4 space-y-4 bg-[#FAF9F6]">
                {trashDiaries.map((diary) => {
                  // 削除した日から何日経ったかを計算し、「残り何日で完全消去か」を出す
                  const deletedTime = new Date(diary.deletedAt).getTime();
                  const now = new Date().getTime();
                  const daysLeft = Math.max(1, 30 - Math.floor((now - deletedTime) / (1000 * 60 * 60 * 24)));

                  return (
                    <div key={diary.id} className="p-4 sm:p-5 border border-[#F2D6D6] rounded-xl bg-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 opacity-80">
                      <div>
                        <span className="font-bold text-[#555555] block mb-1">{diary.title}</span>
                        <span className="text-xs text-[#D98C8C] font-medium">残り {daysLeft} 日で完全に削除されます</span>
                      </div>
                      <div className="flex gap-2">
                        <form action={recoverDiary}>
                          <input type="hidden" name="id" value={diary.id} />
                          <button type="submit" className="text-[#8FA391] hover:text-[#7C907E] text-xs font-bold border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-4 py-2 bg-white transition">
                            復元する
                          </button>
                        </form>
                        <form action={purgeDiary}>
                          <input type="hidden" name="id" value={diary.id} />
                          <button type="submit" className="text-white text-xs font-bold bg-[#D98C8C] hover:bg-[#C57676] rounded-lg px-4 py-2 transition shadow-sm">
                            完全に削除
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        )}

      </main>
    </div>
  );
}