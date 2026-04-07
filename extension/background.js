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
    // 1. Gọi API lấy Sản phẩm trực tiếp bằng Token
    const productsRes = await fetch('https://public.api.kiotviet.vn/products?pageSize=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Retailer': credentials.retailer
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

    // 2. Mở tab Facebook và tự động đăng
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
    // Bắt lỗi TypeError: Failed to fetch (Lỗi mạng hoặc CORS)
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Bị chặn kết nối (CORS) hoặc sai định dạng Token. Hãy kiểm tra lại Token.');
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
