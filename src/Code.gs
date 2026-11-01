/** AMS Business Hub — Milestone 001. Independent Apps Script project. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('AMS Business Hub')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getHubHealth() {
  return {
    success: true,
    application: 'AMS Business Hub',
    milestone: '001',
    timestamp: new Date().toISOString()
  };
}
