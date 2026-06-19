function onOpen() {
  OrderTrackerApp.addMenu();
}

function doGet() {
  return OrderTrackerWeb.doGet();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupOrderTracker() {
  return OrderTrackerApp.setup();
}

function openTrackerPal() {
  return OrderTrackerApp.openTrackerPal();
}

function syncOrders() {
  return OrderTrackerApp.syncOrders();
}

function backfillOrders() {
  return OrderTrackerApp.backfillOrders();
}

function addManualOrder() {
  return OrderTrackerApp.addManualOrder();
}

function importManualEntry() {
  return OrderTrackerApp.importManualEntry();
}

function sendDailySummary() {
  return OrderTrackerApp.sendDailySummary();
}

function installTriggers() {
  return OrderTrackerApp.installTriggers();
}

function removeTriggers() {
  return OrderTrackerApp.removeTriggers();
}

function healthCheck() {
  return OrderTrackerApp.healthCheck();
}

function showDashboard() {
  return OrderTrackerApp.showDashboard();
}

function showOrders() {
  return OrderTrackerApp.showOrders();
}

function getTrackerPalState() {
  return OrderTrackerWeb.getState();
}

function addTrackerPalManualOrder(entry) {
  return OrderTrackerWeb.addManualOrder(entry);
}

function setTrackerPalReceived(rowIndex, received) {
  return OrderTrackerWeb.setReceived(rowIndex, received);
}

function updateTrackerPalStatus(rowIndex, status) {
  return OrderTrackerWeb.updateStatus(rowIndex, status);
}

function syncTrackerPalNow() {
  return OrderTrackerWeb.syncNow();
}

function backfillTrackerPalNow() {
  return OrderTrackerWeb.backfillNow();
}
