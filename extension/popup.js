document.addEventListener('DOMContentLoaded', () => {
  // Load saved credentials
  chrome.storage.local.get(['retailer', 'accessToken'], (result) => {
    if (result.retailer) document.getElementById('retailer').value = result.retailer;
    if (result.accessToken) document.getElementById('accessToken').value = result.accessToken;
  });

  document.getElementById('startBtn').addEventListener('click', async () => {
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
    statusEl.innerText = 'Đang tải sản phẩm từ KiotViet...';
    statusEl.style.color = 'black';

    try {
      // Gọi API lấy Sản phẩm trực tiếp bằng Token (Bỏ qua bước xin Token)
      const productsRes = await fetch('https://public.api.kiotviet.vn/products?pageSize=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Retailer': retailer
        }
      });

      if (!productsRes.ok) {
        if (productsRes.status === 401) {
          throw new Error('Token không hợp lệ hoặc đã hết hạn (Lỗi 401)');
        }
        throw new Error(`Lỗi kết nối KiotViet (Mã: ${productsRes.status})`);
      }
      
      const productsData = await productsRes.json();
      
      if (!productsData.data || productsData.data.length === 0) {
        throw new Error('Gian hàng chưa có sản phẩm nào.');
      }

      const product = productsData.data[0];
      const postContent = `🔥 HÀNG MỚI VỀ 🔥\n\n📦 ${product.fullName}\n💰 Giá: ${product.basePrice.toLocaleString('vi-VN')} VNĐ\n\nInbox ngay để chốt đơn!`;

      statusEl.innerText = 'Đang mở Facebook...';

      // Gửi lệnh sang background để mở tab Facebook
      chrome.runtime.sendMessage(
        { action: 'openFacebook', content: postContent },
        (response) => {
          statusEl.innerText = 'Đã mở Facebook! Vui lòng chờ Extension tự động điền.';
          statusEl.style.color = 'green';
        }
      );

    } catch (error) {
      console.error(error);
      statusEl.innerText = 'Lỗi: ' + error.message;
      statusEl.style.color = 'red';
    }
  });
});
