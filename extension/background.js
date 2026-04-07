chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAndPost') {
    handleFetchAndPost(request.credentials)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Indicates asynchronous response
  }
});

async function handleFetchAndPost(credentials) {
  // 1. Fetch Token
  const tokenParams = new URLSearchParams();
  tokenParams.append('scopes', 'PublicApi.Access');
  tokenParams.append('grant_type', 'client_credentials');
  tokenParams.append('client_id', credentials.clientId);
  tokenParams.append('client_secret', credentials.clientSecret);

  const tokenRes = await fetch('https://id.kiotviet.vn/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });

  if (!tokenRes.ok) throw new Error('Sai thông tin KiotViet');
  const tokenData = await tokenRes.json();

  // 2. Fetch Products
  const productsRes = await fetch('https://public.api.kiotviet.vn/products?pageSize=1', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Retailer': credentials.retailer
    }
  });

  if (!productsRes.ok) throw new Error('Lỗi lấy sản phẩm');
  const productsData = await productsRes.json();
  
  if (!productsData.data || productsData.data.length === 0) {
    throw new Error('Không có sản phẩm nào');
  }

  const product = productsData.data[0];
  const postContent = `🔥 HÀNG MỚI VỀ 🔥\n\n📦 ${product.fullName}\n💰 Giá: ${product.basePrice.toLocaleString('vi-VN')} VNĐ\n\nInbox ngay để chốt đơn!`;

  // 3. Mở tab Facebook
  chrome.tabs.create({ url: 'https://www.facebook.com/' }, (tab) => {
    // Đợi tab load xong rồi inject script tự động đăng
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        // Bơm script vào trang Facebook để tự động click và gõ
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: autoPostOnFacebook,
          args: [postContent]
        });
      }
    });
  });
}

// Script này sẽ chạy TRỰC TIẾP trên trang Facebook.com
function autoPostOnFacebook(content) {
  console.log("Extension đang bắt đầu tự động đăng...");
  
  setTimeout(() => {
    // 1. Tìm ô "Bạn đang nghĩ gì"
    const spans = Array.from(document.querySelectorAll('span'));
    const postBox = spans.find(s => s.textContent.includes("Bạn đang nghĩ gì") || s.textContent.includes("What's on your mind"));
    
    if (postBox) {
      postBox.click();
      
      // 2. Đợi popup hiện lên và tìm ô nhập liệu
      setTimeout(() => {
        const textBox = document.querySelector('div[role="textbox"][contenteditable="true"]');
        if (textBox) {
          // Focus và copy nội dung vào clipboard, sau đó dán (cách an toàn nhất trên FB)
          textBox.focus();
          document.execCommand('insertText', false, content);
          
          // 3. Tìm nút Đăng
          setTimeout(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            const postBtn = buttons.find(b => b.getAttribute('aria-label') === 'Đăng' || b.getAttribute('aria-label') === 'Post');
            
            if (postBtn) {
              // Bỏ comment dòng dưới nếu muốn nó TỰ ĐỘNG BẤM ĐĂNG LUÔN
              // postBtn.click(); 
              console.log("Đã điền xong! Vui lòng tự bấm Đăng.");
            }
          }, 2000);
        }
      }, 3000);
    } else {
      alert("Extension không tìm thấy ô đăng bài. Hãy chắc chắn bạn đã đăng nhập Facebook.");
    }
  }, 3000);
}
