var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// services/auth-triggers/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var handler = async (event) => {
  const code = event.request.codeParameter;
  const displayName = event.request.userAttributes?.name || event.userName;
  switch (event.triggerSource) {
    case "CustomMessage_SignUp":
      event.response.emailSubject = "X\xE1c nh\u1EADn \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n - Music Instrument Store";
      event.response.emailMessage = `Xin ch\xE0o ${displayName},<br/>M\xE3 x\xE1c nh\u1EADn \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n l\xE0: <strong>${code}</strong>.<br/>Vui l\xF2ng kh\xF4ng chia s\u1EBB m\xE3 n\xE0y cho b\u1EA5t k\u1EF3 ai.`;
      break;
    case "CustomMessage_ForgotPassword":
      event.response.emailSubject = "M\xE3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u - Music Instrument Store";
      event.response.emailMessage = `Xin ch\xE0o ${displayName},<br/>M\xE3 x\xE1c nh\u1EADn \u0111\u1EC3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u c\u1EE7a b\u1EA1n l\xE0: <strong>${code}</strong>.<br/>N\u1EBFu b\u1EA1n kh\xF4ng y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u, vui l\xF2ng b\u1ECF qua email n\xE0y.`;
      break;
    case "CustomMessage_ResendCode":
      event.response.emailSubject = "M\xE3 x\xE1c nh\u1EADn m\u1EDBi - Music Instrument Store";
      event.response.emailMessage = `M\xE3 x\xE1c nh\u1EADn m\u1EDBi c\u1EE7a b\u1EA1n l\xE0: <strong>${code}</strong>.`;
      break;
    default:
      break;
  }
  return event;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
