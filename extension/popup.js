document.addEventListener('DOMContentLoaded', () => {
  // Load saved credentials
  chrome.storage.local.get(['retailer', 'accessToken'], (result) => {
    if (result.retailer) document.getElementById('retailer').value = result.retailer;
    if (result.accessToken) document.getElementById('accessToken').value = result.accessToken;
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    const retailer = document.getElementById('retailer').value.trim();
    const accessToken = document.getElementById('accessToken').value.trim();
    const statusEl = document.getElementById('status');

    if (!retailer || !accessToken) {
      statusEl.innerText = 'Vui lòng nhập Tên gian hàng và Access Token!';
      statusEl.style.color = 'red';
      return;
    }

    // Save credentials
    chrome.storage.local.set({ retailer, accessToken });
    statusEl.innerText = 'Đang gửi yêu cầu lấy sản phẩm...';
    statusEl.style.color = 'black';

    // Gửi toàn bộ việc gọi API sang background.js để tránh lỗi CORS của Popup
    chrome.runtime.sendMessage(
      { 
        action: 'fetchProductsAndPost', 
        credentials: { retailer, accessToken } 
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
