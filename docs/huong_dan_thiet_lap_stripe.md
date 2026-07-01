# Hướng Dẫn Thiết Lập Stripe Trong Môi Trường Phát Triển (Dev)

Tài liệu này hướng dẫn cách thiết lập và cấu hình cổng thanh toán **Stripe** cho dự án **Music Instrument Store** trong môi trường phát triển (development/dev).

Dự án sử dụng mô hình kết hợp:
*   **Frontend**: Ứng dụng Next.js chạy ở môi trường local.
*   **Backend**: Các dịch vụ Serverless chạy trên AWS Lambda (được deploy qua AWS CDK).
*   **Bảo mật**: Các thông tin nhạy cảm như Stripe Secret Key được lưu trong AWS Secrets Manager, trong khi Client-side Publishable Key được lưu tại biến môi trường cục bộ `.env.local` của Frontend.

---

## 1. Lấy API Keys từ Stripe Dashboard (Test Mode)

Để tránh phát sinh giao dịch thật, bạn cần sử dụng các khóa thử nghiệm từ Stripe:

1. Đăng nhập hoặc đăng ký tài khoản tại [Stripe Dashboard](https://dashboard.stripe.com).
2. Hãy chắc chắn rằng bạn đã kích hoạt chế độ **Test Mode** (gạt công tắc góc trên cùng bên phải sang màu cam/chế độ Test).
3. Truy cập vào mục **Developers** -> **API keys**.
4. Sao chép 2 khóa sau:
    *   **Publishable key** (Bắt đầu bằng `pk_test_...`): Dùng cho Client-side hiển thị cổng thanh toán.
    *   **Secret key** (Bắt đầu bằng `sk_test_...`): Dùng cho Server-side để tạo giao dịch (PaymentIntent).

---

## 2. Cấu Hình AWS Secrets Manager

Các Lambda Backend (như `checkout-service` và `payment-webhook`) lấy thông tin Stripe trực tiếp từ AWS Secrets Manager thông qua secret `ecommerce/stripe-credentials`. Sau khi bạn deploy hạ tầng AWS CDK cá nhân/sandbox của mình, hãy thực hiện cập nhật các key này:

1. Đảm bảo bạn đã deploy hạ tầng AWS cá nhân bằng cách chạy lệnh từ thư mục gốc của dự án:
   ```bash
   npm run setup:local
   ```
2. Đăng nhập vào **AWS Console** và truy cập dịch vụ **Secrets Manager**.
3. Tìm Secret có tên là `ecommerce/stripe-credentials`.
4. Click vào **Retrieve secret value** -> Chọn **Edit**.
5. Thay thế giá trị mặc định `'TO_BE_REPLACED_IN_CONSOLE'` bằng các API key thực tế của bạn:
    *   `STRIPE_SECRET_KEY`: Điền giá trị `sk_test_...` lấy từ Bước 1.
    *   `STRIPE_WEBHOOK_SECRET`: Điền giá trị `whsec_...` (Sẽ lấy ở Bước 4 dưới đây).
6. Click **Save** để lưu lại.

---

## 3. Cấu Hình Biến Môi Trường Tại Local Cho Frontend

Tạo hoặc mở file `frontend/.env.local` (nếu chưa có, copy từ `frontend/.env.example`) và điền các giá trị Stripe tương ứng:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

> [!NOTE]
> Dự án hỗ trợ **Mock Mode** (chế độ giả lập). Nếu các biến môi trường Stripe ở trên bị để trống hoặc bắt đầu bằng `dummy` / `TO_BE_REPLACED_IN_CONSOLE`, Backend sẽ tự động trả về `clientSecret` giả lập để bạn có thể dev offline mà không cần kết nối tới Stripe thật.

---

## 4. Thiết Lập Và Cấu Hình Webhook Trong Môi Trường Dev

Để Stripe có thể gửi tín hiệu thanh toán thành công (`checkout.session.completed` hoặc `payment_intent.succeeded`) về Lambda `payment-webhook` trên AWS, bạn có hai cách cấu hình trong môi trường Dev:

### 👉 Cách 1: Sử Phụng Stripe CLI Forwarding (Khuyên dùng khi debug ở local)
Cách này giúp chuyển tiếp trực tiếp các sự kiện từ Stripe về Gateway/Webhook Lambda của bạn mà không cần cấu hình public domain hoặc mở cổng internet.

1. Tải và cài đặt [Stripe CLI](https://docs.stripe.com/stripe-cli) phù hợp với hệ điều hành của bạn.
2. Mở terminal và đăng nhập tài khoản Stripe:
   ```bash
   stripe login
   ```
3. Chạy lệnh lắng nghe và chuyển tiếp sự kiện trực tiếp tới API Gateway URL của bạn (lấy từ biến `NEXT_PUBLIC_API_GATEWAY_URL` trong `.env.local` sau khi chạy `npm run setup:local`):
   ```bash
   stripe listen --forward-to <API_GATEWAY_URL>/webhooks/stripe
   ```
4. Terminal sẽ hiển thị một dòng thông tin dạng:
   > *Ready! Your webhook signing secret is **whsec_xxxxxxxxxxxxx***
5. Sao chép chuỗi `whsec_...` đó và cập nhật vào biến `STRIPE_WEBHOOK_SECRET` trong cả **AWS Secrets Manager** (Bước 2) và file `frontend/.env.local` (Bước 3).

### 👉 Cách 2: Cấu Hình Trực Tiếp Trên Stripe Dashboard
1. Truy cập vào [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks).
2. Click **Add endpoint**.
3. Tại ô **Endpoint URL**, dán đường dẫn: `<API_GATEWAY_URL>/webhooks/stripe`
4. Chọn các sự kiện cần lắng nghe: `checkout.session.completed` và `payment_intent.succeeded`.
5. Nhấp **Add endpoint**, sau đó click vào **Reveal** tại mục **Signing secret** để lấy khóa `whsec_...` và cập nhật vào Secrets Manager & `.env.local`.

---

## 5. Chạy Dự Án Và Kiểm Tra (Testing)

1. Khởi chạy frontend Next.js ở local:
   ```bash
   npm run dev:web
   ```
2. Thực hiện quy trình mua hàng tại `http://localhost:3000`.
3. Khi thực hiện thanh toán qua Stripe, sử dụng các đầu số thẻ test của Stripe (ví dụ: số thẻ `4242 4242 4242 4242`, ngày hết hạn bất kỳ trong tương lai, mã CVC bất kỳ) để test.
4. Kiểm tra logs của Lambda thông qua **CloudWatch** trên AWS Console để kiểm tra tính đúng đắn của luồng thanh toán và webhook.
