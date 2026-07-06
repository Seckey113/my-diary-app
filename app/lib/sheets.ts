import { google } from "googleapis";
import crypto from "crypto";
import { unstable_cache } from "next/cache"; // ⭐️ キャッシュ機能をインポート

const ALGORITHM = "aes-256-cbc";
const PASSWORD = process.env.ENCRYPTION_PASSWORD || "default-fallback-secure-password-string";
const ENCRYPTION_KEY = crypto.scryptSync(PASSWORD, "salt-string", 32);
const IV_LENGTH = 16;

const SHEET_DATA = "Data";
const SHEET_REVIEWS = "Reviews";

function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  if (!text) return "";
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = textParts.join(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    return text;
  }
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function normalizeDateKey(dateStr: string) {
  if (!dateStr) return "";
  const normalized = String(dateStr).replace(/-/g, "/");
  const parts = normalized.split("/");
  if (parts.length !== 3) return String(dateStr);
  const year = parts[0];
  const month = parts[1].padStart(2, "0");
  const day = parts[2].padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/* =========================================================================
   📝 日記エピソード用関数（Dataシート / A〜H列）
========================================================================= */

// ⭐️ 内部関数：スプレッドシートから直接生データを読み込む
async function readDiariesFromSheet() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A:H`,
  });

  const rows = response.data.values;
  if (!rows) return [];

  const diaries = [];
  const now = new Date().getTime();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;

    const id = row[0];
    const date = row[1] || "";
    const title = decrypt(row[2] || "");
    const content = decrypt(row[3] || "");
    const tags = decrypt(row[4] || "");
    const createdAt = row[5] || "";
    const updatedAt = row[6] || "";
    const deletedAt = row[7] || null;

    if (deletedAt) {
      const deletedTime = new Date(deletedAt).getTime();
      if (now - deletedTime > thirtyDaysInMs) continue;
    }

    diaries.push({ id, date, title, content, tags, createdAt, updatedAt, deletedAt });
  }
  return diaries;
}

// ⭐️ 画面表示用：爆速のキャッシュ版！
export const getDiaries = unstable_cache(
  async () => {
    return readDiariesFromSheet();
  },
  ["my_diaries_cache"],
  { tags: ["diaries"] }
);

export async function addDiary(date: string, title: string, content: string, tags: string) {
  const sheets = await getSheetsClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[id, date, encrypt(title), encrypt(content), encrypt(tags), now, now, ""]],
    },
  });
}

export async function updateDiary(id: string, date: string, title: string, content: string, tags: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A:A`,
  });

  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;
  const rowNumber = rowIndex + 1;
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!B${rowNumber}:E${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[date, encrypt(title), encrypt(content), encrypt(tags)]] },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!G${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[now]] },
  });
}

export async function deleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A:A`,
  });
  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!H${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [[new Date().toISOString()]] },
  });
}

export async function restoreDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A:A`,
  });
  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!H${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [[""]] },
  });
}

export async function permanentlyDeleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A:A`,
  });
  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_DATA}!A${rowIndex + 1}:H${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [["", "", "", "", "", "", "", ""]] },
  });
}

/* =========================================================================
   🎯 目的・振り返り用関数（Reviewsシート / A〜I列）
========================================================================= */

// ⭐️ 内部関数：スプレッドシートから直接生データを読み込む
async function readReviewsFromSheet() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_REVIEWS}!A:I`,
  });

  const rows = response.data.values;
  if (!rows) return [];

  const reviews = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;

    reviews.push({
      date: normalizeDateKey(row[0] || ""),
      purpose: decrypt(row[1] || ""),
      thoughtProcess: decrypt(row[2] || ""),
      actionFact: decrypt(row[3] || ""),
      nextAction: decrypt(row[4] || ""),
      purposeWrittenAt: row[5] || "",
      reflectedAt: row[6] || "",
      createdAt: row[7] || "",
      updatedAt: row[8] || "",
    });
  }
  return reviews;
}

// ⭐️ 画面表示用：爆速のキャッシュ版！
export const getReviews = unstable_cache(
  async () => {
    return readReviewsFromSheet();
  },
  ["my_reviews_cache"],
  { tags: ["reviews"] }
);

// ⭐️ 保存直前のマージ用：絶対にキャッシュを通さない最新の生データ！
export async function getReviewsFresh() {
  return readReviewsFromSheet();
}

export async function upsertReview(
  date: string, purpose: string, thoughtProcess: string, actionFact: string, nextAction: string
) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_REVIEWS}!A:A`,
  });

  const rows = response.data.values || [];
  const targetDate = normalizeDateKey(date);
  const rowIndex = rows.findIndex((row) => normalizeDateKey(row[0] || "") === targetDate);
  
  const now = new Date().toISOString();
  const hasPurpose = purpose.trim().length > 0;
  const hasReflection = thoughtProcess.trim().length > 0 || actionFact.trim().length > 0 || nextAction.trim().length > 0;

  if (rowIndex === -1) {
    const purposeWrittenAt = hasPurpose ? now : "";
    const reflectedAt = hasReflection ? now : "";

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_REVIEWS}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          targetDate, encrypt(purpose), encrypt(thoughtProcess), encrypt(actionFact), encrypt(nextAction),
          purposeWrittenAt, reflectedAt, now, now
        ]],
      },
    });
  } else {
    const rowNumber = rowIndex + 1;
    const existingRowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_REVIEWS}!A${rowNumber}:I${rowNumber}`,
    });
    const existingRow = existingRowResponse.data.values?.[0] || [];
    const existingPurposeWrittenAt = existingRow[5] || "";
    
    const nextPurposeWrittenAt = hasPurpose ? (existingPurposeWrittenAt || now) : "";
    const nextReflectedAt = hasReflection ? now : "";

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_REVIEWS}!B${rowNumber}:G${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          encrypt(purpose), encrypt(thoughtProcess), encrypt(actionFact), encrypt(nextAction),
          nextPurposeWrittenAt, nextReflectedAt
        ]],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_REVIEWS}!I${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[now]] },
    });
  }
}