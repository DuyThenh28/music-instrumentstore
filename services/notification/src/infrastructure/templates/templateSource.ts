// Template được khai báo dạng chuỗi TS (thay vì file .hbs/.txt riêng) vì pipeline build hiện tại
// (esbuild --bundle ra 1 file index.js) không có bước copy asset — khai báo dạng module để esbuild
// bundle thẳng vào cùng file, tránh phải đọc file rời ở runtime.
export const emailTemplates: Record<
  string,
  { subject: string; html: string; text: string }
> = {
  "order-placed": {
    subject: "Đã nhận đơn hàng #{{orderId}} - Music Instrument Store",
    html: "<h2>Đơn hàng của bạn đã được ghi nhận</h2><p>Mã đơn: <strong>#{{orderId}}</strong></p><p>Tổng thanh toán: <strong>{{amount}}đ</strong></p>",
    text: "Đơn hàng #{{orderId}} đã được ghi nhận. Tổng thanh toán: {{amount}}đ.",
  },
  "order-confirmation": {
    subject: "Xác nhận thanh toán đơn hàng #{{orderId}}",
    html: "<h2>Thanh toán thành công!</h2><p>Đơn hàng <strong>#{{orderId}}</strong> đã thanh toán {{amount}}đ.</p><p>Chúng tôi sẽ chuẩn bị hàng và giao sớm nhất.</p>",
    text: "Đơn hàng #{{orderId}} đã thanh toán thành công. Số tiền: {{amount}}đ.",
  },
  "order-cancelled": {
    subject: "Đơn hàng #{{orderId}} đã bị hủy",
    html: "<h2>Đơn hàng của bạn đã bị hủy</h2><p>Mã đơn: <strong>#{{orderId}}</strong></p><p>Lý do: {{reason}}</p>",
    text: "Đơn hàng #{{orderId}} đã bị hủy. Lý do: {{reason}}",
  },
};

export const smsTemplates: Record<string, string> = {
  "order-cancelled": "[Music Store] Don hang #{{orderId}} da bi huy. Ly do: {{reason}}",
};
