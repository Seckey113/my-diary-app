import { google } from 'googleapis';

// 1. スプレッドシートに接続するための「鍵」を準備する関数
export async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      // .env.localの改行文字(\n)を正しく読み込むための必須処理
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// 2. 日記のデータを全て取得する関数
export async function getDiaries() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Data!A2:G', // 1行目は見出しなので2行目から取得
  });

  const rows = response.data.values;
  if (!rows) return [];

  // スプレッドシートの行データ（配列）を、プログラムで扱いやすい形（オブジェクト）に変換
  return rows.map((row) => ({
    id: row[0] || '',
    date: row[1] || '',
    title: row[2] || '',
    content: row[3] || '',
    tags: row[4] || '',
    createdAt: row[5] || '',
    updatedAt: row[6] || '',
  }));
}

// --- 既存のコードの下にここから追加 ---

export async function addDiary(title: string, content: string, tags: string) {
  const sheets = await getSheetsClient();

  // 1. 保存するデータを準備する
  const id = crypto.randomUUID(); // 重複しないランダムな暗号（ID）を自動生成
  const date = new Date().toLocaleDateString('ja-JP'); // 今日の日付（YYYY/MM/DD）
  const now = new Date().toISOString(); // 今の正確な時間

  // 2. スプレッドシートの一番下に追記（append）する
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Data!A:G', // シート名「Data」のA列〜G列を指定
    valueInputOption: 'USER_ENTERED', // 人間が手入力したのと同じように保存する設定
    requestBody: {
      values: [
        [id, date, title, content, tags, now, now] // A列〜G列に入る順番
      ],
    },
  });
}

// --- sheets.ts の一番下にここから追加 ---

export async function deleteDiary(id: string) {
  const sheets = await getSheetsClient();
  
  // 1. 現在の全データを一度取得する
  const diaries = await getDiaries();
  
  // 2. 削除したいID「以外」のデータを抽出して残す（フィルター処理）
  const remainingDiaries = diaries.filter(diary => diary.id !== id);
  
  // 3. 一度スプレッドシートのデータ範囲（2行目以降）を真っさらにクリアする
  await sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Data!A2:G',
  });
  
  // 4. 残ったデータがある場合のみ、再度上から順番に綺麗に書き直す
  if (remainingDiaries.length > 0) {
    const values = remainingDiaries.map(diary => [
      diary.id,
      diary.date,
      diary.title,
      diary.content,
      diary.tags,
      diary.createdAt,
      new Date().toISOString() // 更新日時を上書き
    ]);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Data!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }
}