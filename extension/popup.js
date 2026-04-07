document.addEventListener('DOMContentLoaded', () => {
  // Load saved credentials
  chrome.storage.local.get(['retailer', 'clientId', 'clientSecret'], (result) => {
    if (result.retailer) document.getElementById('retailer').value = result.retailer;
    if (result.clientId) document.getElementById('clientId').value = result.clientId;
    if (result.clientSecret) document.getElementById('clientSecret').value = result.clientSecret;
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    const retailer = document.getElementById('retailer').value.trim();
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    const statusEl = document.getElementById('status');

    if (!retailer || !clientId || !clientSecret) {
      statusEl.innerText = 'Vui lòng nhập đủ 3 thông tin KiotViet!';
      statusEl.style.color = 'red';
      return;
    }

    // Save credentials
    chrome.storage.local.set({ retailer, clientId, clientSecret });
    statusEl.innerText = 'Đang kết nối với KiotViet...';
    statusEl.style.color = 'black';

    // Gửi toàn bộ việc gọi API sang background.js
    chrome.runtime.sendMessage(
      { 
        action: 'fetchProductsAndPost', 
        credentials: { retailer, clientId, clientSecret } 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          statusEl.innerText = 'Lỗi hệ thống: ' + chrome.runtime.lastError.message;
          statusEl.style.color = 'red';
          return;
        }

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
