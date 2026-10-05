/**
 * Useful Startups — Social Automation Google Sheets bridge
 *
 * Create two tabs:
 *
 * 1) Social Settings
 *    A: Setting        B: Value
 *    enabled           TRUE
 *    linkedin          TRUE
 *    instagram        TRUE
 *    posting_days      Tuesday,Thursday
 *    posting_time      11:00
 *    keywords          startup,AI,funding,fintech
 *    hashtags          #Startups,#AI,#Funding,#Fintech
 *
 * 2) Social Queue
 *    A: article_url
 *    B: article_id
 *    C: force_post
 *    D: posted
 *
 * Deploy this script as a Web App:
 * Execute as: Me
 * Who has access: Anyone
 *
 * Set SCRIPT_SECRET below to a long random value and put the same value
 * in Netlify as SOCIAL_SHEET_SECRET.
 */
const SCRIPT_SECRET = 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET';

function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== SCRIPT_SECRET) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = readSettings(ss.getSheetByName('Social Settings'));
  const queue = readQueue(ss.getSheetByName('Social Queue'));

  return ContentService
    .createTextOutput(JSON.stringify({ settings, queue }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSettings(sheet) {
  if (!sheet) return {};
  const values = sheet.getDataRange().getDisplayValues();
  const result = {};
  values.slice(1).forEach(row => {
    const key = String(row[0] || '').trim();
    if (key) result[key] = row[1] || '';
  });
  return result;
}

function readQueue(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(x => String(x).trim().toLowerCase().replace(/\s+/g, '_'));
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || '');
    return obj;
  });
}
