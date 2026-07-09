// ==========================================
// My Diary 今日の目的ウィジェット (究極・完全防御版)
// ==========================================

// ① あなたのVercelの基本URL
// （※ご自身の実際のURLに書き換えてください。末尾の「/」は自動除去されます）
const BASE_URL = "https://my-diary-app-nine.vercel.app".replace(/\/+$/, "");

// ② ウィジェット設定の「Parameter」から秘密のトークンを読み込む
const TOKEN = (args.widgetParameter || "").trim();

// APIとアプリのURLを自動生成
const API_URL = `${BASE_URL}/api/widget?token=${encodeURIComponent(TOKEN)}`;
const APP_URL = `${BASE_URL}/?mode=growth&focus=purpose`;

const REFRESH_MINUTES = 30;

async function fetchDiaryData() {
  if (!TOKEN) {
    return { error: "ウィジェットの『Parameter』にトークンを設定してください" };
  }

  try {
    const req = new Request(API_URL);
    req.headers = { "Cache-Control": "no-cache" };
    return await req.loadJSON();
  } catch (err) {
    console.log(err);
    return null;
  }
}

function shortenText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

function createWidget(data) {
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
  w.url = APP_URL;

  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [
    new Color("#FAF9F6"),
    new Color("#F0F4F0")
  ];
  w.backgroundGradient = gradient;
  w.setPadding(16, 16, 14, 16);

  const titleTxt = w.addText("🎯 今日の目的");
  titleTxt.font = Font.boldSystemFont(14);
  titleTxt.textColor = new Color("#8FA391");
  w.addSpacer(8);

  let purposeText = "データの取得に失敗しました";
  let purposeColor = new Color("#B0B0B0");

  if (data) {
    if (data.error) {
      purposeText = data.error; 
      purposeColor = new Color("#D98C8C");
    } else {
      purposeText = data.purpose || "🎯 今日の目的は未設定です";
      purposeColor = new Color("#4A4A4A");
    }
  }

  const purposeTxt = w.addText(shortenText(purposeText, 80));
  purposeTxt.font = Font.systemFont(16);
  purposeTxt.textColor = purposeColor;
  purposeTxt.minimumScaleFactor = 0.6;
  purposeTxt.lineLimit = 4;
  w.addSpacer();

  const dateText = data && data.date ? data.date : "Date Unknown";
  const dateTxt = w.addText(dateText);
  dateTxt.font = Font.systemFont(10);
  dateTxt.textColor = new Color("#A3B5A5");
  dateTxt.rightAlignText();

  return w;
}

(async () => {
  const data = await fetchDiaryData();
  const widget = createWidget(data);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }
  Script.complete();
})();