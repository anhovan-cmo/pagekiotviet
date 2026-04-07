chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchProductsAndPost') {
    handleFetchAndPost(request.credentials)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error("Background Error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Bắt buộc để trả về kết quả bất đồng bộ
  }
});

async function handleFetchAndPost(credentials) {
  try {
    // 1. Lấy Access Token từ Client ID và Client Secret
    const tokenParams = new URLSearchParams();
    tokenParams.append('scopes', 'PublicApi.Access');
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_id', credentials.clientId);
    tokenParams.append('client_secret', credentials.clientSecret);

    const tokenRes = await fetch('https://id.kiotviet.vn/connect/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });

    if (!tokenRes.ok) {
      throw new Error(`Sai Client ID hoặc Client Secret (Mã lỗi: ${tokenRes.status})`);
    }
    
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Gọi API lấy Sản phẩm
    const productsRes = await fetch('https://public.api.kiotviet.vn/products?pageSize=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Retailer': credentials.retailer,
        'Accept': 'application/json'
      }
    });

    if (!productsRes.ok) {
      throw new Error(`Sai tên gian hàng (Retailer) (Mã lỗi: ${productsRes.status})`);
    }
    
    const productsData = await productsRes.json();
    
    if (!productsData.data || productsData.data.length === 0) {
      throw new Error('Gian hàng chưa có sản phẩm nào.');
    }

    const product = productsData.data[0];
    const postContent = `🔥 HÀNG MỚI VỀ 🔥\n\n📦 ${product.fullName}\n💰 Giá: ${product.basePrice.toLocaleString('vi-VN')} VNĐ\n\nInbox ngay để chốt đơn!`;

    // 3. Mở tab Facebook và tự động đăng
    return new Promise((resolve) => {
      chrome.tabs.create({ url: 'https://www.facebook.com/' }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: autoPostOnFacebook,
              args: [postContent]
            });
            resolve();
          }
        });
      });
    });

  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Mất mạng hoặc KiotViet từ chối kết nối. Hãy thử lại.');
    }
    throw error;
  }
}

// Kịch bản chạy trên trang Facebook
function autoPostOnFacebook(content) {
  console.log("Extension đang bắt đầu tự động đăng...");
  
  setTimeout(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    const postBox = spans.find(s => s.textContent.includes("Bạn đang nghĩ gì") || s.textContent.includes("What's on your mind"));
    
    if (postBox) {
      postBox.click();
      
      setTimeout(() => {
        const textBox = document.querySelector('div[role="textbox"][contenteditable="true"]');
        if (textBox) {
          textBox.focus();
          document.execCommand('insertText', false, content);
          
          setTimeout(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            const postBtn = buttons.find(b => b.getAttribute('aria-label') === 'Đăng' || b.getAttribute('aria-label') === 'Post');
            
            if (postBtn) {
              // postBtn.click(); // Bỏ dấu // ở đầu dòng này nếu muốn tự động bấm Đăng
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
