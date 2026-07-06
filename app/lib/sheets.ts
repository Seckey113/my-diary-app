import { google } from "googleapis";
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const PASSWORD = process.env.ENCRYPTION_PASSWORD || "default-fallback-secure-password-string";
const ENCRYPTION_KEY = crypto.scryptSync(PASSWORD, "salt-string", 32);
const IV_LENGTH = 16;

const SHEET_NAME = "Data";
const FULL_RANGE = `${SHEET_NAME}!A:N`;

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

// 📖 日記一覧の取得（A〜N列をすべて読み込む）
export async function getDiaries() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: FULL_RANGE,
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

    const purpose = decrypt(row[8] || "");
    const thoughtProcess = decrypt(row[9] || "");
    const actionFact = decrypt(row[10] || "");
    const nextAction = decrypt(row[11] || "");
    const purposeWrittenAt = row[12] || "";
    const reflectedAt = row[13] || "";

    diaries.push({
      id, date, title, content, tags, createdAt, updatedAt, deletedAt,
      purpose, thoughtProcess, actionFact, nextAction, purposeWrittenAt, reflectedAt
    });
  }
  return diaries;
}

// ➕ 日記の追加（新規作成時はすべてN列まで一発で作成）
export async function addDiary(
  date: string, title: string, content: string, tags: string,
  purpose: string = "", thoughtProcess: string = "", actionFact: string = "", nextAction: string = "",
  purposeWrittenAt: string = "", reflectedAt: string = ""
) {
  const sheets = await getSheetsClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: FULL_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          id, date, encrypt(title), encrypt(content), encrypt(tags), now, now, "",
          encrypt(purpose), encrypt(thoughtProcess), encrypt(actionFact), encrypt(nextAction),
          purposeWrittenAt, reflectedAt
        ],
      ],
    },
  });
}

// 📝 修正・進化：【日記モード専用】の更新関数（目的列には絶対に触らない）
export async function updateDiaryBasic(
  id: string, date: string, title: string, content: string, tags: string
) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;
  const rowNumber = rowIndex + 1;
  const now = new Date().toISOString();

  // B列〜E列（基本情報）をピンポイント上書き
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!B${rowNumber}:E${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[date, encrypt(title), encrypt(content), encrypt(tags)]] },
  });

  // G列（更新日時）のみ更新
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!G${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[now]] },
  });
}

// 🎯 【目的・振り返りモード専用】の更新関数
// 日記本文・タイトル・タグには絶対に触らず、I〜N列だけを更新する
export async function updateDiaryGrowth(
  id: string,
  purpose: string,
  thoughtProcess: string,
  actionFact: string,
  nextAction: string
) {
  const sheets = await getSheetsClient();

  // 既存の purposeWrittenAt / reflectedAt を確認するため、A〜N列を読み込む
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: FULL_RANGE,
  });

  const rows = response.data.values;
  if (!rows) return;

  // 指定されたIDの日記が何行目にあるかを探す
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  const rowNumber = rowIndex + 1;
  const now = new Date().toISOString();

  // 既存の記録時刻を取得する
  // M列: purposeWrittenAt
  // N列: reflectedAt
  const originalPurposeWrittenAt = rows[rowIndex][12] || "";

  // 目的が入力されているかを判定する
  const hasPurpose = purpose.trim().length > 0;

  // 目的が初めて入力された場合だけ、目的記入時間を入れる
  // 目的が空になった場合は、purposeWrittenAt も空に戻す
  const nextPurposeWrittenAt = hasPurpose
    ? originalPurposeWrittenAt || now
    : "";

  // 夜の振り返り欄のどれかに入力があるかを判定する
  const hasReflection =
    thoughtProcess.trim().length > 0 ||
    actionFact.trim().length > 0 ||
    nextAction.trim().length > 0;

  // 振り返りがある場合は時刻を入れる
  // 全部空の場合は、未記入扱いにするため reflectedAt も空にする
  const nextReflectedAt = hasReflection ? now : "";

  // I〜N列だけを更新する
  // I: purpose
  // J: thoughtProcess
  // K: actionFact
  // L: nextAction
  // M: purposeWrittenAt
  // N: reflectedAt
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!I${rowNumber}:N${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          encrypt(purpose),
          encrypt(thoughtProcess),
          encrypt(actionFact),
          encrypt(nextAction),
          nextPurposeWrittenAt,
          nextReflectedAt,
        ],
      ],
    },
  });

  // G列の updatedAt も更新する
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!G${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now]],
    },
  });
}

// ゴミ箱へ移動（変更なし）
export async function deleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!H${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[new Date().toISOString()]] },
  });
}

// 日記の復元（変更なし）
export async function restoreDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!H${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[""]] },
  });
}

// 日記の完全削除（A〜N列をまるごと消去に拡張）
export async function permanentlyDeleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const rows = response.data.values;
  if (!rows) return;
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex + 1}:N${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
    },
  });
}