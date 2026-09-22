// ─────────────────────────────────────────────────────────────────────────────
// whysogood — Feedback Collector
// Google Apps Script — paste this entire file into script.google.com
// Sheet ID: 1rO29dXXfRcmwKAAeC3B9AWyvNgFLeS0gEdUK4AmUuIk
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_ID = '1rO29dXXfRcmwKAAeC3B9AWyvNgFLeS0gEdUK4AmUuIk';

/**
 * Handles POST requests from the feedback widget.
 * Expects JSON body: { url, priority, feedback }
 */
function doPost(e) {
  try {
    var ss     = SpreadsheetApp.openById(SHEET_ID);
    var sheet  = ss.getSheets()[0];           // first sheet tab

    // Ensure header row exists on first call
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'URL', 'Priority', 'Feedback']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      sheet.setFrozenRows(1);
      // Column widths for readability
      sheet.setColumnWidth(1, 180);  // Timestamp
      sheet.setColumnWidth(2, 320);  // URL
      sheet.setColumnWidth(3, 140);  // Priority
      sheet.setColumnWidth(4, 500);  // Feedback
    }

    // Parse payload
    var data     = JSON.parse(e.postData.contents);
    var url      = data.url      || '(unknown)';
    var priority = data.priority || '(none)';
    var feedback = data.feedback || '';

    // Timestamp in IST (UTC+5:30)
    var now      = new Date();
    var ist      = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    var ts       = Utilities.formatDate(ist, 'UTC', 'yyyy-MM-dd HH:mm:ss') + ' IST';

    sheet.appendRow([ts, url, priority, feedback]);

    return buildResponse({ success: true });
  } catch (err) {
    return buildResponse({ success: false, error: err.message });
  }
}

/** Helper — returns a JSON response with CORS headers */
function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Quick test — run this manually from the Apps Script editor to verify */
function testAppend() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheets()[0];
  sheet.appendRow([
    new Date().toISOString(),
    'https://whysogood.app/test',
    'Must have',
    'Test row from Apps Script editor'
  ]);
  Logger.log('Test row appended successfully.');
}
