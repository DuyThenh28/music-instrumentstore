import type { CustomMessageTriggerHandler } from "aws-lambda";

// Cognito CustomMessage trigger: chỉ tuỳ biến nội dung email OTP (đăng ký / quên mật khẩu),
// việc gửi thật vẫn do Cognito thực hiện qua cấu hình email nội bộ của nó (xem docs/blueprint.md Phụ lục A.1).
export const handler: CustomMessageTriggerHandler = async (event) => {
  const code = event.request.codeParameter;
  const displayName = event.request.userAttributes?.name || event.userName;

  switch (event.triggerSource) {
    case "CustomMessage_SignUp":
      event.response.emailSubject = "Xác nhận đăng ký tài khoản - Music Instrument Store";
      event.response.emailMessage = `Xin chào ${displayName},<br/>Mã xác nhận đăng ký tài khoản của bạn là: <strong>${code}</strong>.<br/>Vui lòng không chia sẻ mã này cho bất kỳ ai.`;
      break;
    case "CustomMessage_ForgotPassword":
      event.response.emailSubject = "Mã đặt lại mật khẩu - Music Instrument Store";
      event.response.emailMessage = `Xin chào ${displayName},<br/>Mã xác nhận để đặt lại mật khẩu của bạn là: <strong>${code}</strong>.<br/>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.`;
      break;
    case "CustomMessage_ResendCode":
      event.response.emailSubject = "Mã xác nhận mới - Music Instrument Store";
      event.response.emailMessage = `Mã xác nhận mới của bạn là: <strong>${code}</strong>.`;
      break;
    default:
      break;
  }

  return event;
};
