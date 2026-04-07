document.addEventListener('DOMContentLoaded', () => {
  // Load saved credentials
  chrome.storage.local.get(['retailer', 'clientId', 'clientSecret'], (result) => {
    if (result.retailer) document.getElementById('retailer').value = result.retailer;
    if (result.clientId) document.getElementById('clientId').value = result.clientId;
    if (result.clientSecret) document.getElementById('clientSecret').value = result.clientSecret;
  });

  document.getElementById('startBtn').addEventListener('click', async () => {
    const retailer = document.getElementById('retailer').value.trim();
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    const statusEl = document.getElementById('status');

    if (!retailer || !clientId || !clientSecret) {
      statusEl.innerText = 'Vui lòng nhập đủ thông tin KiotViet!';
      statusEl.style.color = 'red';
      return;
    }

    // Save credentials
    chrome.storage.local.set({ retailer, clientId, clientSecret });
    statusEl.innerText = 'Đang lấy Token từ KiotViet...';
    statusEl.style.color = 'black';

    try {
      // 1. Lấy Token
      const tokenParams = new URLSearchParams();
      tokenParams.append('scopes', 'PublicApi.Access');
      tokenParams.append('grant_type', 'client_credentials');
      tokenParams.append('client_id', clientId);
      tokenParams.append('client_secret', clientSecret);

      const tokenRes = await fetch('https://id.kiotviet.vn/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Sai Client ID/Secret (Mã: ${tokenRes.status})`);
      }
      const tokenData = await tokenRes.json();

      statusEl.innerText = 'Đang tải sản phẩm...';

      // 2. Lấy Sản phẩm
      const productsRes = await fetch('https://public.api.kiotviet.vn/products?pageSize=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Retailer': retailer
        }
      });

      if (!productsRes.ok) {
        throw new Error(`Sai tên gian hàng (Mã: ${productsRes.status})`);
      }
      
      const productsData = await productsRes.json();
      
      if (!productsData.data || productsData.data.length === 0) {
        throw new Error('Gian hàng chưa có sản phẩm nào.');
      }

      const product = productsData.data[0];
      const postContent = `🔥 HÀNG MỚI VỀ 🔥\n\n📦 ${product.fullName}\n💰 Giá: ${product.basePrice.toLocaleString('vi-VN')} VNĐ\n\nInbox ngay để chốt đơn!`;

      statusEl.innerText = 'Đang mở Facebook...';

      // 3. Gửi lệnh sang background để mở tab Facebook
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
