/**
 * 自由診療メニュー / 健診メニュー 配信 API (Google Apps Script)
 * 
 * このスクリプトは、スプレッドシートの「拡張機能」＞「Apps Script」に貼り付けて
 * ウェブアプリとしてデプロイして使用します。
 * 
 * リクエストURLのパラメータ `?sheet=シート名` によって取得元のシートを切り替えます。
 * 例:
 * - ?sheet=自由診療  (Wellnessサイト上部用)
 * - ?sheet=健診メニュー (Wellnessサイト下部 / 健診サイト用)
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // URLの末尾パラメータ（?sheet=シート名）を取得。指定がない場合はデフォルトで "自由診療" とする
  var sheetName = "自由診療";
  if (e && e.parameter && e.parameter.sheet) {
    sheetName = e.parameter.sheet;
  }
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.getActiveSheet(); // 指定シートが見つからない場合はアクティブシートをフォールバック
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var jsonArray = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // status（A列）が空の行はスキップ
    
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var val = row[j];
      if (header === "featured") {
        val = (val === true || val === "true" || val === 1 || val === "1");
      }
      obj[header] = val;
    }
    jsonArray.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(jsonArray))
    .setMimeType(ContentService.MimeType.JSON);
}
