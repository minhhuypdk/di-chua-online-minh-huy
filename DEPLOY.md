# Đi Chùa Online Của Minh Huy 🏯

## Mở website
Vào **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.

Địa chỉ dự kiến: https://minhhuypdk.github.io/di-chua-online-minh-huy/

## Chơi cùng bạn bè
Hiện tại có giao diện nickname, phòng, link mời, trò chơi 3D và tương tác đơn. Để bật danh sách online, chat và thông báo hoạt động chung:

1. Tạo Supabase project tại https://supabase.com/.
2. Lấy Project URL và publishable/anon key (không dùng service_role/secret key).
3. Điền hai giá trị trong `config.js` và commit.
4. Đảm bảo Realtime public channels được phép trong cấu hình Supabase.
5. Mở hai trình duyệt/thiết bị, nhập cùng mã phòng `CHUA-MINHHUY` để thử.

**Giới hạn:** Không đồng bộ avatar người khác trong cảnh 3D; không có đăng nhập hay xác thực nickname; chat chỉ realtime, không lưu lịch sử. Không dùng tiền thật. Chưa kiểm thử thực tế trong trình duyệt.

## Game gốc
Repository `namnt22295/di-chua-xoa-stress-3d` không bị chỉnh sửa. Đây là phiên bản độc lập lấy cảm hứng từ ý tưởng game chùa 3D.
