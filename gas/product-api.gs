// ================================================
// んだばいカフェ 商品データAPI ＋ 写真URL自動変換
// Googleフォーム → Sheets「商品一覧」 → doGet(JSON) → サイト
// ================================================

// --- CONFIG（ここを編集してください） ---
var SHEET_ID = 'ここにスプレッドシートIDを入力';
var PHOTO_FOLDER_ID = 'ここにDriveフォルダIDを入力';
var ADMIN_EMAIL = 'ここに秀夫さんのメールアドレス';
// ----------------------------------------

// ================================================
// API: 商品データをJSON返却
// ================================================
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('商品一覧');
    var data = sheet.getDataRange().getValues();
    var products = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // L列（index 11）: 表示フラグがFALSEならスキップ
      var displayFlag = row[11];
      if (displayFlag === false || String(displayFlag).toUpperCase() === 'FALSE') continue;

      // 商品名が空の行はスキップ
      if (!row[1]) continue;

      products.push({
        id: i,
        name: row[1],          // B: 商品名
        category: row[2],      // C: カテゴリ
        price: row[3],         // D: 価格
        description: row[4],   // E: 説明
        volume: row[5],        // F: 内容量
        photoUrl: row[10],     // K: 写真公開URL
        baseUrl: row[7],       // H: BASE URL
        tags: row[8],          // I: タグ
        story: row[9],         // J: 備考（ストーリー）
        sortOrder: Number(row[12]) || 999  // M: 並び順
      });
    }

    products.sort(function (a, b) { return a.sortOrder - b.sortOrder; });

    return ContentService
      .createTextOutput(JSON.stringify({ products: products, updated: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ products: [], error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ================================================
// トリガー: フォーム送信時に写真URLを自動変換
// ================================================
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('商品一覧');
  var lastRow = sheet.getLastRow();

  // G列（index 7, 1-based col 7）: 写真ファイルリンク
  var photoCell = sheet.getRange(lastRow, 7).getValue();
  if (photoCell) {
    var publicUrl = convertToPublicUrl(photoCell);
    sheet.getRange(lastRow, 11).setValue(publicUrl); // K列: 公開URL
  }

  // L列: 表示フラグ デフォルトTRUE
  sheet.getRange(lastRow, 12).setValue(true);

  // M列: 並び順 デフォルト999
  if (!sheet.getRange(lastRow, 13).getValue()) {
    sheet.getRange(lastRow, 13).setValue(999);
  }

  sendNewProductNotification(lastRow);
}

// ================================================
// Drive写真を公開URL（サムネイル）に変換
// ================================================
function convertToPublicUrl(driveLink) {
  try {
    var fileId = extractFileId(driveLink);
    if (!fileId) return '';

    var file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 直リンクは重いのでサムネイル（幅800）を使用
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
  } catch (err) {
    Logger.log('写真URL変換エラー: ' + err.message);
    return '';
  }
}

// ================================================
// DriveリンクからファイルIDを抽出
// ================================================
function extractFileId(link) {
  if (!link) return null;

  var match1 = link.match(/id=([a-zA-Z0-9_-]+)/);          // ?id=XXXX
  if (match1) return match1[1];

  var match2 = link.match(/\/d\/([a-zA-Z0-9_-]+)/);         // /d/XXXX/view
  if (match2) return match2[1];

  if (link.indexOf(',') > -1) {                              // 複数ファイル→先頭
    return extractFileId(link.split(',')[0].trim());
  }
  return null;
}

// ================================================
// 新商品登録通知（管理者宛）
// ================================================
function sendNewProductNotification(row) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('商品一覧');
  var name = sheet.getRange(row, 2).getValue();
  var price = sheet.getRange(row, 4).getValue();
  var category = sheet.getRange(row, 3).getValue();

  var subject = '【んだばい】新商品登録: ' + name;
  var body = '新しい商品が登録されました。\n\n'
    + '商品名: ' + name + '\n'
    + 'カテゴリ: ' + category + '\n'
    + '価格: ¥' + Number(price).toLocaleString() + '\n\n'
    + 'スプレッドシートで確認:\n'
    + 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '\n\n'
    + '表示フラグ（L列）・並び順（M列）をご確認ください。';

  MailApp.sendEmail({ to: ADMIN_EMAIL, subject: subject, body: body });
}

// ================================================
// 初回セットアップ: フォーム送信トリガーを設置（1回だけ手動実行）
// ================================================
function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SHEET_ID).onFormSubmit().create();
  Logger.log('トリガー設置完了');
}
