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

**Giới hạn:** Avatar, tên và vị trí người chơi được truyền qua Presence; chat và hoạt động dùng Broadcast. Không có đăng nhập hay xác thực nickname; chat không lưu lịch sử. Cúng dường chỉ dùng xu ảo, không có thanh toán thật.

## Chẩn đoán Realtime và kết quả kiểm thử (05/11/2026)

`config.js` hiện dùng URL project HTTPS và khóa `sb_publishable_...` dành cho trình duyệt. Không cần khóa bí mật để dùng public Presence/Broadcast; tuyệt đối không đưa `service_role` hoặc `sb_secret_...` vào mã nguồn. Việc khóa có được project chấp nhận hay không vẫn cần handshake thành công để xác minh.

Hai phiên Chromium độc lập, cùng phòng `CHUA-MINHHUY`, đều tái hiện lỗi `CHANNEL_ERROR · channel error: transport failure`. DevTools ghi `Establishing a tunnel via proxy server failed`; proxy trả `403 Forbidden` với nội dung `No approved upstream IPv4 address` ngay khi CONNECT tới `zzphwbedtxbhajkpavqp.supabase.co:443`. `esm.sh` tải được. Supabase đã nằm trong allowlist nhưng tunnel vẫn bị từ chối; chưa có phản hồi xác thực hoặc đăng ký channel từ Supabase. Chưa thể xác minh multiplayer thật hoặc kết luận API key/Policies sai.

Cần quản trị môi trường kiểm tra khả năng phân giải DNS/upstream IPv4 và chính sách proxy cho project này, đồng thời chủ project xác nhận project đang hoạt động và URL đúng trong Supabase Dashboard. Không tắt TLS hoặc đổi sang khóa bí mật để xử lý lỗi transport.

Mã sử dụng Supabase JS ghim phiên bản `2.119.0`, public channel `temple:CHUA-MINHHUY`, Presence key riêng từng trang và Broadcast có ACK. Khi thoát, kết nối cũ được hủy; callback/import trễ không được tạo lại phòng. Chat chỉ hiển thị ở phía gửi sau khi máy chủ xác nhận, và giữ lại nội dung khi gửi lỗi.

### Kiểm thử tại máy phát triển

Chạy `python3 -m http.server 8000 --bind 127.0.0.1` từ thư mục repository. Không cần npm install hay build cho ứng dụng.

Bộ kiểm thử `node tests/realtime-smoke.cjs` cần Playwright cài sẵn và Chromium ở `/usr/bin/chromium` (hoặc đặt `CHROMIUM_PATH`); có thể đổi máy chủ bằng `TEMPLE_TEST_URL`. Bộ kiểm thử dùng SDK thật và máy chủ Phoenix **mô phỏng** qua Playwright để kiểm tra xử lý Presence/Broadcast trong hai browser context độc lập. Đây không phải bằng chứng Supabase thật hoạt động. Kết quả mô phỏng: đạt Presence/avatar/nhãn tên/chuyển động, chat hai chiều, thông báo hoạt động, phản hồi khi gửi lỗi, thoát/vào lại và thoát khi CDN còn tải. Kiểm thử live sau sửa: vẫn bị proxy chặn ở cả hai phiên; cả sáu nút chơi đơn vẫn hoạt động (tổng 18 xu), thoát được và không có lỗi JavaScript.

Sau khi gỡ chặn mạng, mở hai trình duyệt độc lập hoặc thường/ẩn danh, dùng hai nickname khác nhau và phòng `CHUA-MINHHUY`:

1. Cả hai thấy “Đã kết nối”, danh sách Online có hai nickname, mỗi cảnh có avatar và nhãn tên của người còn lại.
2. Di chuyển WASD ở từng phía; phía kia thấy vị trí và hướng nhân vật thay đổi.
3. Gửi chat hai chiều, gồm câu dài hơn 40 ký tự; người nhận thấy đủ nội dung tối đa 180 ký tự.
4. Thỉnh chuông/thả hoa đăng ở từng phía; phía kia nhận thông báo hoạt động.
5. Thoát một phiên: avatar biến mất; vào lại không xuất hiện avatar trùng. Thử thoát ngay lúc đang tải SDK.
6. Trong DevTools → Network → WS, kiểm tra handshake `101`, phản hồi join `ok`, Presence và Broadcast. HTTP 401/403 từ Supabase cần kiểm tra URL/key/quyền public channel; lỗi tunnel từ proxy cần xử lý mạng trước. Không chia sẻ URL WebSocket có query key trong log công khai.

### Đưa thay đổi lên GitHub Pages

Commit và push các file đã sửa cùng thư mục `tests` lên nhánh `main` (hoặc merge pull request vào `main`). Trong GitHub → Settings → Pages chọn “Deploy from a branch”, nhánh `main`, thư mục `/(root)`. Chờ deployment thành công trong Actions, tải lại trang bằng hard refresh rồi chạy checklist hai trình duyệt ở trên. Không cần đưa thư mục tests vào bất kỳ bước build nào. Sau khi Pull Request được hợp nhất vào `main`, kiểm tra deployment Pages trong Actions. Việc commit/push nhánh đề xuất không tự hợp nhất Pull Request hoặc xác nhận multiplayer thật đã hoạt động.

## Game gốc
Repository `namnt22295/di-chua-xoa-stress-3d` không bị chỉnh sửa. Đây là phiên bản độc lập lấy cảm hứng từ ý tưởng game chùa 3D.
