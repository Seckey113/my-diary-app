import {
  getDiaries,
  addDiary,
  deleteDiary,
  updateDiaryBasic,
  updateDiaryGrowth,
  restoreDiary,
  permanentlyDeleteDiary,
} from "./lib/sheets";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { DiaryForm } from "./form";
import { SearchBar } from "./search-bar";
import { DiaryCard } from "./diary-card";
import { RefreshButton } from "./refresh-button";
import { LoginForm } from "./login-form";
import { LogoutButton } from "./logout-button";

// URLや小数の「意味のある記号」は守りつつ、通常の句読点だけを日本語向けに整える関数
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
    tempText = tempText.replace(
      `__PLACEHOLDER_${index}__`,
      () => placeholder
    );
  });

  return tempText;
}

// ⭐️ 強化版：yyyy/MM/dd または yyyy-MM-dd 形式の日付を安全に Date に変換する関数
function parseDiaryDate(dateStr: string) {
  if (!dateStr) return null;

  // "/" と "-" の両方に対応する
  const normalized = dateStr.replace(/-/g, "/");
  const parts = normalized.split("/");

  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) return null;

  // JavaScriptの month は 0 始まりなので、1を引く
  return new Date(year, month - 1, day);
}

// ⭐️ 新規追加：input type="date" から来る yyyy-MM-dd 形式を、保存用の yyyy/MM/dd 形式に変換する関数
// new Date() を使うとタイムゾーンで日付がズレる可能性があるため、手動で分解する
function formatDateInputToDiaryDate(dateInput: string) {
  if (!dateInput) {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(now.getDate()).padStart(2, "0")}`;
  }

  const parts = dateInput.split("-");

  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${year}/${month}/${day}`;
  }

  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(now.getDate()).padStart(2, "0")}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("diary_auth");

  if (!authCookie || authCookie.value !== "authenticated") {
    return (
      <div
        className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 sm:px-8"
        style={{
          fontFamily:
            '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Zen Maru Gothic", sans-serif',
        }}
      >
        <LoginForm />
      </div>
    );
  }

  const diaries = await getDiaries();
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q || "";

  // 新規日記を作成する処理
  async function createDiary(formData: FormData) {
    "use server";

    const dateInput = String(formData.get("date") ?? "");

    const rawTitle = formatPunctuation(String(formData.get("title") ?? ""));
    const rawContent = formatPunctuation(String(formData.get("content") ?? ""));
    const rawTags = formatPunctuation(String(formData.get("tags") ?? ""));

    const rawPurpose = formatPunctuation(String(formData.get("purpose") ?? ""));
    const rawThoughtProcess = formatPunctuation(
      String(formData.get("thoughtProcess") ?? "")
    );
    const rawActionFact = formatPunctuation(
      String(formData.get("actionFact") ?? "")
    );
    const rawNextAction = formatPunctuation(
      String(formData.get("nextAction") ?? "")
    );

    const title = rawTitle.trim() === "" ? "無題" : rawTitle.trim();
    const content =
      rawContent.trim() === "" ? "エピソード記録なし" : rawContent.trim();
    const tags = rawTags.trim() === "" ? "タグなし" : rawTags.trim();

    const purpose = rawPurpose.trim();
    const thoughtProcess = rawThoughtProcess.trim();
    const actionFact = rawActionFact.trim();
    const nextAction = rawNextAction.trim();

    if (
      title === "無題" &&
      content === "エピソード記録なし" &&
      tags === "タグなし" &&
      !purpose &&
      !thoughtProcess &&
      !actionFact &&
      !nextAction
    ) {
      return;
    }

    // ⭐️ 修正：安全な手動パース処理に置き換え
    const date = formatDateInputToDiaryDate(dateInput);

    const now = new Date().toISOString();
    const purposeWrittenAt = purpose ? now : "";
    const reflectedAt =
      thoughtProcess || actionFact || nextAction ? now : "";

    await addDiary(
      date,
      title,
      content,
      tags,
      purpose,
      thoughtProcess,
      actionFact,
      nextAction,
      purposeWrittenAt,
      reflectedAt
    );

    revalidatePath("/");
  }

  // 日記モード用の編集処理
  async function editDiaryBasic(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const dateInput = String(formData.get("date") ?? "");
    const rawTitle = formatPunctuation(String(formData.get("title") ?? ""));
    const rawContent = formatPunctuation(String(formData.get("content") ?? ""));
    const rawTags = formatPunctuation(String(formData.get("tags") ?? ""));

    const title = rawTitle.trim() === "" ? "無題" : rawTitle.trim();
    const content =
      rawContent.trim() === "" ? "エピソード記録なし" : rawContent.trim();
    const tags = rawTags.trim() === "" ? "タグなし" : rawTags.trim();

    // ⭐️ 修正：安全な手動パース処理に置き換え
    const date = formatDateInputToDiaryDate(dateInput);

    await updateDiaryBasic(id, date, title, content, tags);
    revalidatePath("/");
  }

  // 目的・振り返りモード用の編集処理
  async function editDiaryGrowth(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const rawPurpose = formatPunctuation(String(formData.get("purpose") ?? ""));
    const rawThoughtProcess = formatPunctuation(
      String(formData.get("thoughtProcess") ?? "")
    );
    const rawActionFact = formatPunctuation(
      String(formData.get("actionFact") ?? "")
    );
    const rawNextAction = formatPunctuation(
      String(formData.get("nextAction") ?? "")
    );

    const purpose = rawPurpose.trim();
    const thoughtProcess = rawThoughtProcess.trim();
    const actionFact = rawActionFact.trim();
    const nextAction = rawNextAction.trim();

    await updateDiaryGrowth(id, purpose, thoughtProcess, actionFact, nextAction);
    revalidatePath("/");
  }

  async function removeDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await deleteDiary(id);
    revalidatePath("/");
  }

  async function recoverDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await restoreDiary(id);
    revalidatePath("/");
  }

  async function purgeDiary(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await permanentlyDeleteDiary(id);
    revalidatePath("/");
  }

  const activeDiaries = diaries.filter((diary) => !diary.deletedAt);
  const trashDiaries = diaries.filter((diary) => diary.deletedAt);

  const filteredDiaries = activeDiaries.filter((diary) => {
    if (!searchQuery) return true;

    const lowerQuery = searchQuery.toLowerCase();

    const safeTitle = diary.title || "";
    const safeContent = diary.content || "";
    const safeTags = diary.tags || "";
    const safePurpose = diary.purpose || "";
    const safeThoughtProcess = diary.thoughtProcess || "";
    const safeActionFact = diary.actionFact || "";
    const safeNextAction = diary.nextAction || "";

    return (
      safeTitle.toLowerCase().includes(lowerQuery) ||
      safeContent.toLowerCase().includes(lowerQuery) ||
      safeTags.toLowerCase().includes(lowerQuery) ||
      safePurpose.toLowerCase().includes(lowerQuery) ||
      safeThoughtProcess.toLowerCase().includes(lowerQuery) ||
      safeActionFact.toLowerCase().includes(lowerQuery) ||
      safeNextAction.toLowerCase().includes(lowerQuery)
    );
  });

  const sortedDiaries = [...filteredDiaries].sort((a, b) => {
    const dateA = parseDiaryDate(a.date);
    const dateB = parseDiaryDate(b.date);

    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;

    return timeB - timeA;
  });

  const groupedDiaries: Record<string, Record<string, typeof activeDiaries>> = {};

  sortedDiaries.forEach((diary) => {
    const d = parseDiaryDate(diary.date);
    const year = !d ? "年不明" : `${d.getFullYear()}年`;
    const month = !d ? "月不明" : `${d.getMonth() + 1}月`;

    if (!groupedDiaries[year]) groupedDiaries[year] = {};
    if (!groupedDiaries[year][month]) groupedDiaries[year][month] = [];

    groupedDiaries[year][month].push(diary);
  });

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] py-12 px-2 sm:px-8"
      style={{
        fontFamily:
          '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Zen Maru Gothic", sans-serif',
      }}
    >
      <main className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-[#8FA391] tracking-wider">
            My Diary!!
          </h1>

          <div className="flex items-center gap-1">
            <LogoutButton />
            <RefreshButton />
          </div>
        </div>

        <Suspense
          fallback={
            <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-[#EBE8E0] mb-10 text-[#9CA3AF] text-center">
              入力フォームを読み込み中...
            </div>
          }
        >
          <DiaryForm clientAction={createDiary} />
        </Suspense>

        <SearchBar />

        <div className="space-y-6">
          {Object.keys(groupedDiaries).length === 0 ? (
            <p className="text-[#9CA3AF] text-center py-12">
              {searchQuery
                ? `「${searchQuery}」に一致する日記は見つかりませんでした。`
                : "まだ日記がありません。最初の日記を記録しましょう！"}
            </p>
          ) : (
            Object.keys(groupedDiaries)
              .sort((a, b) => b.localeCompare(a))
              .map((year, index) => (
                <details
                  key={year}
                  className="group bg-white rounded-2xl shadow-sm border border-[#EBE8E0] overflow-hidden"
                  open={index === 0 || searchQuery !== ""}
                >
                  <summary className="cursor-pointer p-5 font-bold text-xl text-[#8FA391] bg-[#F9FBF9] hover:bg-[#F0F4F0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                    {year}
                    <span className="text-sm transition-transform duration-300 group-open:rotate-180">
                      ▼
                    </span>
                  </summary>

                  <div className="p-2 sm:p-4 space-y-4">
                    {Object.keys(groupedDiaries[year])
                      .sort((a, b) => parseInt(b) - parseInt(a))
                      .map((month, mIndex) => (
                        <details
                          key={month}
                          className="group/month bg-[#FAF9F6] rounded-xl border border-[#EBE8E0] overflow-hidden"
                          open={
                            (index === 0 && mIndex === 0) || searchQuery !== ""
                          }
                        >
                          <summary className="cursor-pointer p-4 font-bold text-lg text-[#6B7D6C] hover:bg-[#EBE8E0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                            <div className="flex items-center gap-3">
                              {month}
                              <span className="text-xs font-normal text-[#9CA3AF] bg-white px-2 py-0.5 rounded-full border border-[#EBE8E0]">
                                {groupedDiaries[year][month].length}件
                              </span>
                            </div>

                            <span className="text-xs transition-transform duration-300 group-open/month:rotate-180 text-[#8FA391]">
                              ▼
                            </span>
                          </summary>

                          <div className="p-2 sm:p-4 space-y-5 bg-white">
                            {groupedDiaries[year][month].map((diary) => (
                              <DiaryCard
                                key={diary.id}
                                diary={diary}
                                searchQuery={searchQuery}
                                onUpdateBasic={editDiaryBasic}
                                onUpdateGrowth={editDiaryGrowth}
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

        {trashDiaries.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[#EBE8E0]">
            <details className="group bg-white rounded-2xl shadow-sm border border-[#F2D6D6] overflow-hidden">
              <summary className="cursor-pointer p-5 font-bold text-[#D98C8C] bg-[#FDF5F5] hover:bg-[#FAF0F0] transition flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <span>🗑️ 最近削除した項目</span>
                  <span className="text-xs font-normal text-[#D98C8C] bg-white px-2 py-0.5 rounded-full border border-[#F2D6D6]">
                    {trashDiaries.length}件
                  </span>
                </div>

                <span className="text-sm transition-transform duration-300 group-open:rotate-180 text-[#D98C8C]">
                  ▼
                </span>
              </summary>

              <div className="p-4 space-y-4 bg-[#FAF9F6]">
                {trashDiaries.map((diary) => {
                  const deletedTime = new Date(diary.deletedAt).getTime();
                  const now = new Date().getTime();
                  const daysLeft = Math.max(
                    1,
                    30 -
                      Math.floor(
                        (now - deletedTime) / (1000 * 60 * 60 * 24)
                      )
                  );

                  return (
                    <div
                      key={diary.id}
                      className="p-4 sm:p-5 border border-[#F2D6D6] rounded-xl bg-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 opacity-80"
                    >
                      <div>
                        <span className="font-bold text-[#555555] block mb-1">
                          {diary.title}
                        </span>
                        <span className="text-xs text-[#D98C8C] font-medium">
                          残り {daysLeft} 日で完全に削除されます
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <form action={recoverDiary}>
                          <input type="hidden" name="id" value={diary.id} />
                          <button
                            type="submit"
                            className="text-[#8FA391] hover:text-[#7C907E] text-xs font-bold border border-[#EBE8E0] hover:border-[#8FA391] rounded-lg px-4 py-2 bg-white transition"
                          >
                            復元する
                          </button>
                        </form>

                        <form action={purgeDiary}>
                          <input type="hidden" name="id" value={diary.id} />
                          <button
                            type="submit"
                            className="text-white text-xs font-bold bg-[#D98C8C] hover:bg-[#C57676] rounded-lg px-4 py-2 transition shadow-sm"
                          >
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