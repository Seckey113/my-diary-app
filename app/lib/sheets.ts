import { google } from "googleapis";
import crypto from "crypto"; // Node.js標準の暗号化モジュール

// ⭐️ 環境変数からパスワードを読み込み、32バイトの強固な暗号鍵を自動生成する
const ALGORITHM = "aes-256-cbc";
const PASSWORD = process.env.ENCRYPTION_PASSWORD || "default-fallback-secure-password-string";
const ENCRYPTION_KEY = crypto.scryptSync(PASSWORD, "salt-string", 32); // 32バイトの鍵に変換
const IV_LENGTH = 16; // 初期化ベクトル（暗号を毎回ランダムにバラけさせるための調味料）

// 🔒 文字列を暗号化する関数
function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // IV（ランダムな値）と暗号文をコロンで繋いで保存する
  return iv.toString("hex") + ":" + encrypted;
}

// 🔓 暗号化された文字列を元に戻す（復号化）関数
function decrypt(text: string): string {
  if (!text) return "";
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    
    // ⭐️ 修正箇所：Buffer.from(...) での変換をやめ、文字列（hex）のまま渡すように変更
    const encryptedText = textParts.join(":"); 
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // 万が一復号化に失敗した場合（昔の暗号化されていないデータなど）はそのまま返す
    return text;
  }
}

// 認証クライアントの作成
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

// 日記一覧の取得（読み込み時に復号化する）
// ⭐️ 修正箇所1：getDiaries（H列まで読み込むように変更）
export async function getDiaries() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:H", // ⭐️ A列から【H列】まで範囲を広げる
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
    const date = row[1];
    const title = decrypt(row[2]);
    const content = decrypt(row[3]);
    const tags = row[4] ? decrypt(row[4]) : "";
    
    // row[5] は F列 (createdAt)
    // row[6] は G列 (updatedAt)
    const deletedAt = row[7] || null; // ⭐️ row[7] つまり【H列】をゴミ箱判定に使う！

    if (deletedAt) {
      const deletedTime = new Date(deletedAt).getTime();
      if (now - deletedTime > thirtyDaysInMs) {
        continue; // 30日経過していたら完全に見えなくする
      }
    }

    diaries.push({ id, date, title, content, tags, deletedAt });
  }
  return diaries;
}

// 日記の追加（保存時に暗号化する）
// ⭐️ 引数の先頭に `date: string` を追加します
export async function addDiary(date: string, title: string, content: string, tags: string) {
  const sheets = await getSheetsClient();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const encryptedTitle = encrypt(title);
  const encryptedContent = encrypt(content);
  const encryptedTags = encrypt(tags);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        // ⭐️ 自動生成した日付ではなく、画面から受け取った `date` をそのまま保存します
        [id, date, encryptedTitle, encryptedContent, encryptedTags, now, now],
      ],
    },
  });
}

// 日記の削除（行の再書き込み時にも暗号化を維持する）
// ⭐️ 修正箇所2：deleteDiary（H列に削除日を書く）
export async function deleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:A",
  });

  const rows = response.data.values;
  if (!rows) return;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  const rowNumber = rowIndex + 1;
  const deletedAt = new Date().toISOString(); 

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Data!H${rowNumber}`, // ⭐️ ゴミ箱マークを【H列】に書き込む
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[deletedAt]],
    },
  });
}

// ⭐️ 新しく追加する更新用の関数
export async function updateDiary(id: string, date: string, title: string, content: string, tags: string) {
  const sheets = await getSheetsClient();
  
  // まずは全データを取得して、更新したい日記の「行番号」を見つけます
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:A", // IDの列だけ取得
  });
  
  const rows = response.data.values;
  if (!rows) return;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  const rowNumber = rowIndex + 1; // スプレッドシートの行番号は1から始まるため

  // 暗号化してセキュリティを保ったまま上書き
  const encryptedTitle = encrypt(title);
  const encryptedContent = encrypt(content);
  const encryptedTags = encrypt(tags);

  // 見つけた行のB列（日付）〜E列（タグ）を上書きします
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Data!B${rowNumber}:E${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [date, encryptedTitle, encryptedContent, encryptedTags],
      ],
    },
  });
}

// ⭐️ 修正箇所3：restoreDiary（H列を空にする）
export async function restoreDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:A",
  });

  const rows = response.data.values;
  if (!rows) return;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  const rowNumber = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Data!H${rowNumber}`, // ⭐️ 復元する時は【H列】を空っぽにする
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[""]],
    },
  });
}

// ⭐️ 修正箇所4：permanentlyDeleteDiary（A〜H列まで全て消去）
export async function permanentlyDeleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:A",
  });

  const rows = response.data.values;
  if (!rows) return;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return;

  const rowNumber = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Data!A${rowNumber}:H${rowNumber}`, // ⭐️ A列から【H列】までまるごと指定
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["", "", "", "", "", "", "", ""]], // ⭐️ 空文字を8個(A,B,C,D,E,F,G,H)に増やす！
    },
  });
}