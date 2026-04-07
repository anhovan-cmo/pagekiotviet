import puppeteer from 'puppeteer';
import axios from 'axios';

// ==========================================
// CẤU HÌNH THÔNG TIN CỦA BẠN Ở ĐÂY
// ==========================================
const CONFIG = {
  // 1. Cấu hình KiotViet
  KIOTVIET: {
    retailer: 'TEN_GIAN_HANG_CUA_BAN', // VD: mystore
    clientId: 'CLIENT_ID_CUA_BAN',
    clientSecret: 'CLIENT_SECRET_CUA_BAN',
  },
  
  // 2. Cấu hình Facebook Cá Nhân
  FACEBOOK: {
    email: 'EMAIL_HOAC_SO_DIEN_THOAI_FB',
    password: 'MAT_KHAU_FB',
  }
};

// ==========================================
// HÀM 1: LẤY DỮ LIỆU TỪ KIOTVIET (Dùng API cho ổn định)
// ==========================================
async function getKiotVietProducts() {
  console.log('📦 Đang lấy Access Token từ KiotViet...');
  try {
    const tokenRes = await axios.post(
      'https://id.kiotviet.vn/connect/token',
      new URLSearchParams({
        scopes: 'PublicApi.Access',
        grant_type: 'client_credentials',
        client_id: CONFIG.KIOTVIET.clientId,
        client_secret: CONFIG.KIOTVIET.clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    console.log('📦 Đang tải danh sách sản phẩm...');
    const productsRes = await axios.get('https://public.api.kiotviet.vn/products?pageSize=5', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Retailer: CONFIG.KIOTVIET.retailer,
      },
    });

    return productsRes.data.data;
  } catch (error) {
    console.error('❌ Lỗi khi lấy dữ liệu KiotViet:', error.response?.data || error.message);
    return [];
  }
}

// ==========================================
// HÀM 2: TỰ ĐỘNG HÓA TRÌNH DUYỆT ĐỂ ĐĂNG LÊN FACEBOOK
// ==========================================
async function postToFacebookProfile(postContent) {
  console.log('🌐 Đang khởi động trình duyệt...');
  
  // headless: false để bạn có thể nhìn thấy trình duyệt đang làm gì
  // Nếu Facebook yêu cầu xác minh 2 bước (2FA), bạn có thể tự nhập tay
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();

  try {
    console.log('🔑 Đang đăng nhập Facebook...');
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });

    // Điền tài khoản mật khẩu
    await page.type('#email', CONFIG.FACEBOOK.email, { delay: 50 });
    await page.type('#pass', CONFIG.FACEBOOK.password, { delay: 50 });
    
    // Click nút Đăng nhập
    await page.click('[name="login"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Đăng nhập thành công! Đang vào trang cá nhân...');
    
    // Vào thẳng trang cá nhân của bạn
    await page.goto('https://www.facebook.com/me', { waitUntil: 'networkidle2' });

    console.log('📝 Đang tạo bài viết mới...');
    // Tìm và click vào ô "Bạn đang nghĩ gì?"
    // Lưu ý: Selector của Facebook thay đổi rất thường xuyên. 
    // Dùng XPath để tìm thẻ span có chữ "Bạn đang nghĩ gì" hoặc "What's on your mind"
    const postBoxElements = await page.$x("//span[contains(text(), 'Bạn đang nghĩ gì') or contains(text(), 'What\\'s on your mind')]");
    if (postBoxElements.length > 0) {
      await postBoxElements[0].click();
    } else {
      throw new Error('Không tìm thấy ô đăng bài. Giao diện Facebook có thể đã thay đổi.');
    }

    // Đợi popup soạn thảo hiện lên (tìm thẻ div có role="textbox")
    await page.waitForSelector('div[role="textbox"][contenteditable="true"]', { visible: true });
    
    console.log('✍️ Đang nhập nội dung...');
    // Nhập nội dung bài viết
    await page.type('div[role="textbox"][contenteditable="true"]', postContent, { delay: 30 });

    // Đợi 2 giây để Facebook nhận diện xong nội dung
    await new Promise(r => setTimeout(r, 2000));

    console.log('🚀 Đang bấm nút Đăng...');
    // Tìm nút Đăng (Post)
    const postButtonElements = await page.$x("//div[@aria-label='Đăng' or @aria-label='Post'][@role='button']");
    if (postButtonElements.length > 0) {
      await postButtonElements[0].click();
    } else {
      console.log('⚠️ Không tìm thấy nút Đăng, vui lòng tự click trên trình duyệt.');
    }

    // Đợi bài viết được đăng xong
    await new Promise(r => setTimeout(r, 5000));
    console.log('🎉 ĐÃ ĐĂNG BÀI THÀNH CÔNG!');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình đăng Facebook:', error);
  } finally {
    console.log('🛑 Đóng trình duyệt sau 10 giây...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
  }
}

// ==========================================
// CHẠY CHƯƠNG TRÌNH CHÍNH
// ==========================================
async function main() {
  // 1. Lấy sản phẩm từ KiotViet
  const products = await getKiotVietProducts();
  
  if (products.length === 0) {
    console.log('Không có sản phẩm nào để đăng.');
    return;
  }

  // Chọn sản phẩm đầu tiên làm ví dụ
  const product = products[0];
  
  // 2. Tạo nội dung bài đăng
  const postContent = `🔥 SIÊU PHẨM MỚI VỀ 🔥\n\n📦 ${product.fullName}\n💰 Giá chỉ: ${product.basePrice.toLocaleString('vi-VN')} VNĐ\n\nNhanh tay inbox để chốt đơn nhé mọi người ơi! Số lượng có hạn! 🏃‍♂️💨`;

  console.log('Nội dung chuẩn bị đăng:\n', postContent);

  // 3. Đăng lên Facebook cá nhân
  await postToFacebookProfile(postContent);
}

main();
