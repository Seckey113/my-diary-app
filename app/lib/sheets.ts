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
export async function getDiaries() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A2:G",
  });

  const rows = response.data.values || [];

  return rows.map((row) => ({
    id: row[0],
    date: row[1],
    // ⭐️ 読み込んだ暗号データを、人間の読める日本語に復号化して画面に渡す！
    title: decrypt(row[2]),
    content: decrypt(row[3]),
    tags: decrypt(row[4]),
    createdAt: row[5],
    updatedAt: row[6],
  }));
}

// 日記の追加（保存時に暗号化する）
export async function addDiary(title: string, content: string, tags: string) {
  const sheets = await getSheetsClient();

  const id = crypto.randomUUID();
  const date = new Date().toLocaleDateString("ja-JP");
  const now = new Date().toISOString();

  // ⭐️ スプレッドシートに書き込む前に、タイトル、本文、タグを暗号化！
  const encryptedTitle = encrypt(title);
  const encryptedContent = encrypt(content);
  const encryptedTags = encrypt(tags);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [id, date, encryptedTitle, encryptedContent, encryptedTags, now, now],
      ],
    },
  });
}

// 日記の削除（行の再書き込み時にも暗号化を維持する）
export async function deleteDiary(id: string) {
  const sheets = await getSheetsClient();
  const diaries = await getDiaries(); // ここで取得されるdiariesはすでに「復号化された生データ」
  const remainingDiaries = diaries.filter((diary) => diary.id !== id);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Data!A2:G",
  });

  if (remainingDiaries.length > 0) {
    const values = remainingDiaries.map((diary) => [
      diary.id,
      diary.date,
      // ⭐️ 再書き込みする際にもう一度暗号化する
      encrypt(diary.title),
      encrypt(diary.content),
      encrypt(diary.tags),
      diary.createdAt,
      new Date().toISOString(),
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Data!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
}