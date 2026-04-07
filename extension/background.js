chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openFacebook') {
    chrome.tabs.create({ url: 'https://www.facebook.com/' }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: autoPostOnFacebook,
            args: [request.content]
          });
        }
      });
    });
    sendResponse({ success: true });
  }
  return true;
});

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
