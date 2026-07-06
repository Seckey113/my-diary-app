import {
  getDiaries,
  addDiary,
  updateDiary,
  deleteDiary,
  restoreDiary,
  permanentlyDeleteDiary,
  getReviews,
  getReviewsFresh,
  upsertReview,
} from "./lib/sheets";
import { revalidatePath, revalidateTag } from "next/cache"; // ⭐️ revalidateTag を追加！
import { cookies } from "next/headers";
import { Suspense } from "react";
import { DiaryForm } from "./form";
import { SearchBar } from "./search-bar";
import { DiaryCard } from "./diary-card";
import { ReviewCard } from "./review-card";
import { RefreshButton } from "./refresh-button";
import { LoginForm } from "./login-form";
import { LogoutButton } from "./logout-button";

function formatPunctuation(text: string) {
  if (!text) return "";
  const placeholders: string[] = [];
  let tempText = text.replace(
    /[a-zA-Z0-9\-_]+(?:[.,][a-zA-Z0-9\-_]+)+/g,
    (match) => {
      placeholders.push(match);
      return `__PLACEHOLDER_${placeholders.length - 1}__`;
    }
  );
  tempText = tempText.replace(/[,，]/g, "、").replace(/[\.．]/g, "。");
  placeholders.forEach((placeholder, index) => {
    tempText = tempText.replace(`__PLACEHOLDER_${index}__`, () => placeholder);
  });
  return tempText;
}

function parseDiaryDate(dateStr: string) {
  if (!dateStr) return null;
  const normalized = dateStr.replace(/-/g, "/");
  const parts = normalized.split("/");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateInputToDiaryDate(dateInput: string) {
  if (!dateInput) {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
  }

  const normalized = String(dateInput).replace(/-/g, "/");
  const parts = normalized.split("/");

  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${year}/${month}/${day}`;
  }

  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeDateKey(dateStr: string) {
  if (!dateStr) return "";
  const normalized = String(dateStr).replace(/-/g, "/");
  const parts = normalized.split("/");
  if (parts.length !== 3) return String(dateStr);
  return `${parts[0]}/${parts[1].padStart(2, "0")}/${parts[2].padStart(2, "0")}`;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("diary_auth");

  if (!authCookie || authCookie.value !== "authenticated") {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 sm:px-8" style={{ fontFamily: '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Zen Maru Gothic", sans-serif' }}>
        <LoginForm />
      </div>
    );
  }

  // ⭐️ ここはキャッシュされた超高速データが読み込まれます！
  const diaries = await getDiaries();
  const reviews = await getReviews();
  
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q || "";

  async function createEntry(formData: FormData) {
    "use server";
    
    const entryType = String(formData.get("entryType") ?? "diary");
    const dateInput = String(formData.get("date") ?? "");
    const date = formatDateInputToDiaryDate(dateInput);
    const normalizedDate = normalizeDateKey(date);

    const title = formatPunctuation(String(formData.get("title") ?? "")).trim();
    const content = formatPunctuation(String(formData.get("content") ?? "")).trim();
    const tags = formatPunctuation(String(formData.get("tags") ?? "")).trim();

    const purpose = formatPunctuation(String(formData.get("purpose") ?? "")).trim();
    const thoughtProcess = formatPunctuation(String(formData.get("thoughtProcess") ?? "")).trim();
    const actionFact = formatPunctuation(String(formData.get("actionFact") ?? "")).trim();
    const nextAction = formatPunctuation(String(formData.get("nextAction") ?? "")).trim();

    if (entryType === "diary") {
      const hasEpisode = title !== "" || content !== "" || tags !== "";
      if (!hasEpisode) return;

      await addDiary(date, title || "無題", content || "エピソード記録なし", tags || "タグなし");

      revalidateTag("diaries"); // ⭐️ 日記のキャッシュを明示的に破棄
      revalidatePath("/");
      return;
    }

    if (entryType === "growth") {
      const hasGrowth = purpose !== "" || thoughtProcess !== "" || actionFact !== "" || nextAction !== "";
      if (!hasGrowth) return;

      const latestReviews = await getReviewsFresh();
      const existingReview = latestReviews.find(
        (review) => normalizeDateKey(review.date) === normalizedDate
      );

      const mergedPurpose = purpose || existingReview?.purpose || "";
      const mergedThoughtProcess = thoughtProcess || existingReview?.thoughtProcess || "";
      const mergedActionFact = actionFact || existingReview?.actionFact || "";
      const mergedNextAction = nextAction || existingReview?.nextAction || "";

      await upsertReview(date, mergedPurpose, mergedThoughtProcess, mergedActionFact, mergedNextAction);

      revalidateTag("reviews"); // ⭐️ 振り返りのキャッシュを明示的に破棄
      revalidatePath("/");
    }
  }

  async function editDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const dateInput = String(formData.get("date") ?? "");
    const date = formatDateInputToDiaryDate(dateInput);
    const title = formatPunctuation(String(formData.get("title") ?? "")).trim() || "無題";
    const content = formatPunctuation(String(formData.get("content") ?? "")).trim() || "エピソード記録なし";
    const tags = formatPunctuation(String(formData.get("tags") ?? "")).trim() || "タグなし";
    
    await updateDiary(id, date, title, content, tags);
    
    revalidateTag("diaries"); // ⭐️ キャッシュ破棄
    revalidatePath("/");
  }

  async function editReview(formData: FormData) {
    "use server";
    const dateInput = String(formData.get("date") ?? "");
    const date = formatDateInputToDiaryDate(dateInput);
    if (!date) return;
    const purpose = formatPunctuation(String(formData.get("purpose") ?? "")).trim();
    const thoughtProcess = formatPunctuation(String(formData.get("thoughtProcess") ?? "")).trim();
    const actionFact = formatPunctuation(String(formData.get("actionFact") ?? "")).trim();
    const nextAction = formatPunctuation(String(formData.get("nextAction") ?? "")).trim();
    
    await upsertReview(date, purpose, thoughtProcess, actionFact, nextAction);
    
    revalidateTag("reviews"); // ⭐️ キャッシュ破棄
    revalidatePath("/");
  }

  async function removeDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await deleteDiary(id);
    
    revalidateTag("diaries"); // ⭐️ キャッシュ破棄
    revalidatePath("/");
  }

  async function recoverDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await restoreDiary(id);
    
    revalidateTag("diaries"); // ⭐️ キャッシュ破棄
    revalidatePath("/");
  }

  async function purgeDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await permanentlyDeleteDiary(id);
    
    revalidateTag("diaries"); // ⭐️ キャッシュ破棄
    revalidatePath("/");
  }

  const activeDiaries = diaries.filter((diary) => !diary.deletedAt);
  const trashDiaries = diaries.filter((diary) => diary.deletedAt);

  const lowerQuery = searchQuery.toLowerCase();
  
  const filteredDiaries = activeDiaries.filter((diary) => {
    if (!searchQuery) return true;
    return (
      (diary.title || "").toLowerCase().includes(lowerQuery) ||
      (diary.content || "").toLowerCase().includes(lowerQuery) ||
      (diary.tags || "").toLowerCase().includes(lowerQuery)
    );
  });

  const filteredReviews = reviews.filter((review) => {
    if (!searchQuery) return true;
    return (
      (review.purpose || "").toLowerCase().includes(lowerQuery) ||
      (review.thoughtProcess || "").toLowerCase().includes(lowerQuery) ||
      (review.actionFact || "").toLowerCase().includes(lowerQuery) ||
      (review.nextAction || "").toLowerCase().includes(lowerQuery)
    );
  });

  const dateMap = new Map<string, { review: any; diaries: any[] }>();

  filteredDiaries.forEach((d) => {
    const date = normalizeDateKey(d.date);
    if (!dateMap.has(date)) dateMap.set(date, { review: null, diaries: [] });
    dateMap.get(date)!.diaries.push(d);
  });

  filteredReviews.forEach((r) => {
    const date = normalizeDateKey(r.date);
    if (!dateMap.has(date)) dateMap.set(date, { review: null, diaries: [] });
    dateMap.get(date)!.review = r;
  });

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
    const da = parseDiaryDate(a);
    const db = parseDiaryDate(b);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });

  const groupedData: Record<string, Record<string, { date: string; review: any; diaries: any[] }[]>> = {};

  sortedDates.forEach((dateStr) => {
    const d = parseDiaryDate(dateStr);
    const year = !d ? "年不明" : `${d.getFullYear()}年`;
    const month = !d ? "月不明" : `${d.getMonth() + 1}月`;

    if (!groupedData[year]) groupedData[year] = {};
    if (!groupedData[year][month]) groupedData[year][month] = [];

    groupedData[year][month].push({
      date: dateStr,
      review: dateMap.get(dateStr)!.review,
      diaries: dateMap.get(dateStr)!.diaries,
    });
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] py-12 px-2 sm:px-8" style={{ fontFamily: '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Zen Maru Gothic", sans-serif' }}>
      <main className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-[#8FA391] tracking-wider">My Diary!!</h1>
          <div className="flex items-center gap-1">
            <LogoutButton />
            <RefreshButton />
          </div>
        </div>

        <Suspense fallback={<div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-[#EBE8E0] mb-10 text-[#9CA3AF] text-center">入力フォームを読み込み中...</div>}>
          <DiaryForm clientAction={createEntry} existingReviews={reviews} />
        </Suspense>

        <SearchBar />

        <div className="space-y-6">
          {Object.keys(groupedData).length === 0 ? (
            <p className="text-[#9CA3AF] text-center py-12">
              {searchQuery ? `「${searchQuery}」に一致する記録は見つかりませんでした。` : "まだ記録がありません。最初の記録を残しましょう！"}
            </p>
          ) : (
            Object.keys(groupedData).sort((a, b) => b.localeCompare(a)).map((year, index) => (
              <details key={year} className="group bg-white rounded-2xl shadow-sm border border-[#EBE8E0] overflow-hidden" open={index === 0 || searchQuery !== ""}>
                <summary className="cursor-pointer p-5 font-bold text-xl text-[#8FA391] bg-[#F9FBF9] hover:bg-[#F0F4F0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                  {year}
                  <span className="text-sm transition-transform duration-300 group-open:rotate-180">▼</span>
                </summary>
                
                <div className="p-2 sm:p-4 space-y-8">
                  {Object.keys(groupedData[year]).sort((a, b) => parseInt(b) - parseInt(a)).map((month, mIndex) => (
                    <details key={month} className="group/month bg-[#FAF9F6] rounded-xl border border-[#EBE8E0] overflow-hidden" open={(index === 0 && mIndex === 0) || searchQuery !== ""}>
                      <summary className="cursor-pointer p-4 font-bold text-lg text-[#6B7D6C] hover:bg-[#EBE8E0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-3">
                          {month}
                        </div>
                        <span className="text-xs transition-transform duration-300 group-open/month:rotate-180 text-[#8FA391]">▼</span>
                      </summary>

                      <div className="p-4 sm:p-6 space-y-12 bg-white">
                        {groupedData[year][month].map(({ date, review, diaries }) => (
                          <div key={date} className="relative">
                            <h3 className="text-xl font-bold text-[#8FA391] mb-5 border-b-2 border-[#EBE8E0] pb-2 inline-block">
                              {date}
                            </h3>
                            
                            {(!searchQuery || review) && (
                              <div className="mb-6">
                                <ReviewCard 
                                  review={review ?? {
                                    date,
                                    purpose: "",
                                    thoughtProcess: "",
                                    actionFact: "",
                                    nextAction: "",
                                    purposeWrittenAt: "",
                                    reflectedAt: "",
                                    createdAt: "",
                                    updatedAt: "",
                                  }} 
                                  searchQuery={searchQuery} 
                                  onUpdate={editReview} 
                                />
                              </div>
                            )}

                            {diaries.length > 0 && (
                              <div className="space-y-4 pl-0 sm:pl-4 border-l-0 sm:border-l-4 border-[#F0F4F0]">
                                {diaries.map((diary) => (
                                  <DiaryCard key={diary.id} diary={diary} searchQuery={searchQuery} onUpdate={editDiary} onDelete={removeDiary} />
                                ))}
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
                        <form action={recoverDiary}><input type="hidden" name="id" value={diary.id} /><button type="submit" className="text-[#8FA391] hover:text-[#7C907E] text-xs font-bold border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-4 py-2 bg-white transition">復元する</button></form>
                        <form action={purgeDiary}><input type="hidden" name="id" value={diary.id} /><button type="submit" className="text-white text-xs font-bold bg-[#D98C8C] hover:bg-[#C57676] rounded-lg px-4 py-2 transition shadow-sm">完全に削除</button></form>
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