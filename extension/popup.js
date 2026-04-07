document.addEventListener('DOMContentLoaded', () => {
  // Load saved credentials
  chrome.storage.local.get(['retailer', 'clientId', 'clientSecret'], (result) => {
    if (result.retailer) document.getElementById('retailer').value = result.retailer;
    if (result.clientId) document.getElementById('clientId').value = result.clientId;
    if (result.clientSecret) document.getElementById('clientSecret').value = result.clientSecret;
  });

  document.getElementById('startBtn').addEventListener('click', async () => {
    const retailer = document.getElementById('retailer').value;
    const clientId = document.getElementById('clientId').value;
    const clientSecret = document.getElementById('clientSecret').value;
    const statusEl = document.getElementById('status');

    if (!retailer || !clientId || !clientSecret) {
      statusEl.innerText = 'Vui lòng nhập đủ thông tin KiotViet!';
      statusEl.style.color = 'red';
      return;
    }

    // Save credentials
    chrome.storage.local.set({ retailer, clientId, clientSecret });
    statusEl.innerText = 'Đang lấy dữ liệu từ KiotViet...';
    statusEl.style.color = 'black';

    // Send message to background script to fetch data
    chrome.runtime.sendMessage(
      { action: 'fetchAndPost', credentials: { retailer, clientId, clientSecret } },
      (response) => {
        if (response && response.success) {
          statusEl.innerText = 'Đã mở Facebook! Vui lòng chờ Extension tự động điền.';
          statusEl.style.color = 'green';
        } else {
          statusEl.innerText = 'Lỗi: ' + (response?.error || 'Không xác định');
          statusEl.style.color = 'red';
        }
      }
    );
  });
});
