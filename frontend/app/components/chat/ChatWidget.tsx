"use client";

import "../common/AmplifyConfig";
import { useState, useRef, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { MessageSquare, Send, X, ArrowUpRight } from "lucide-react";

interface Message {
  text: string;
  sender: "user" | "bot" | "staff" | "system";
  senderName?: string;
  createdAt?: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Chào bạn! Tôi là trợ lý ảo AI của Music Store. Tôi có thể giúp gì cho bạn hôm nay?", sender: "bot", senderName: "Trợ lý ảo" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"BOT" | "HUMAN_WAITING" | "HUMAN_CONNECTED" | "CLOSED">("BOT");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [userProfile, setUserProfile] = useState<{ email?: string; name?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Khởi tạo SessionId định danh cuộc hội thoại của khách hàng (lưu ở sessionStorage để giữ phiên khi F5)
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = sessionStorage.getItem("chat_session_id");
      if (!id) {
        id = `session-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
        sessionStorage.setItem("chat_session_id", id);
      }
      return id;
    }
    return `session-temp-${Date.now()}`;
  });

  // Lấy thông tin tài khoản nếu đã đăng nhập
  useEffect(() => {
    const checkUser = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (token) {
          const { fetchUserAttributes } = await import("aws-amplify/auth");
          const attrs = await fetchUserAttributes();
          setUserProfile({
            email: attrs.email,
            name: attrs.name || attrs.given_name || attrs.family_name || attrs.email,
          });
        }
      } catch (err) {
        console.log("Chat user checking: guest mode active", err);
      }
    };
    checkUser();
  }, []);

  // Lấy lịch sử hội thoại khi mở khung chat
  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessionStatus(data.session.status);
          setAssignedStaff(data.session.assignedStaffName || "");
        }
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: any) => ({
              text: m.text,
              sender: m.sender.toLowerCase() as any,
              senderName: m.senderName,
              createdAt: m.createdAt,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling liên tục khi đang ở chế độ kết nối con người để cập nhật tin nhắn của nhân viên
  useEffect(() => {
    if (!isOpen || (sessionStatus !== "HUMAN_WAITING" && sessionStatus !== "HUMAN_CONNECTED")) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setSessionStatus(data.session.status);
            setAssignedStaff(data.session.assignedStaffName || "");
          }
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              if (data.messages.length > prev.length) {
                return data.messages.map((m: any) => ({
                  text: m.text,
                  sender: m.sender.toLowerCase() as any,
                  senderName: m.senderName,
                  createdAt: m.createdAt,
                }));
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("Polling chat messages error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, sessionStatus, sessionId]);

  // Yêu cầu kết nối nhân viên tư vấn
  const handleRequestHuman = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setSessionStatus("HUMAN_WAITING");
        await fetchHistory();
      }
    } catch (err) {
      console.error("Request human connection error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi tin nhắn mới
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsgText = input.trim();
    setInput("");

    const tempUserMessage: Message = {
      text: userMsgText,
      sender: "user",
      senderName: userProfile?.name || "Khách",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userMsgText,
          sessionId,
          userEmail: userProfile?.email || "",
          userName: userProfile?.name || "Khách",
        }),
      });

      if (!res.ok) throw new Error("Gửi tin nhắn thất bại");

      const data = await res.json();
      
      // Nếu là chế độ BOT, cập nhật phản hồi tự động ngay lập tức
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach((msg: string) => {
          setMessages((prev) => [
            ...prev,
            { text: msg, sender: "bot", senderName: "Trợ lý ảo", createdAt: new Date().toISOString() }
          ]);
        });
      }
      
      // Tải lại lịch sử để đồng bộ trạng thái mới (nếu có chuyển đổi)
      await fetchHistory();
    } catch (error) {
      console.error("Send message error:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Đang mất kết nối Internet, vui lòng thử lại.", sender: "system" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-55 font-sans">
      {isOpen ? (
        <div className="w-[360px] sm:w-[380px] h-[520px] bg-white dark:bg-[#06261d] rounded-2xl border border-slate-100 dark:border-primary-container/20 shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#003527] to-[#064e3b] dark:from-[#002117] dark:to-[#031d16] text-white flex justify-between items-center shadow-sm">
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-sm font-bold tracking-wide">Trợ Lý Music Store</span>
              <span className="text-[10px] text-emerald-350 dark:text-emerald-400 mt-0.5 truncate flex items-center gap-1.5 font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${sessionStatus === "HUMAN_CONNECTED" ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
                {sessionStatus === "BOT" && "🤖 Trợ lý ảo tự động (AI)"}
                {sessionStatus === "HUMAN_WAITING" && "⏳ Đang kết nối nhân viên..."}
                {sessionStatus === "HUMAN_CONNECTED" && `💬 Nhân viên ${assignedStaff} đang hỗ trợ`}
                {sessionStatus === "CLOSED" && "🔒 Phiên hỗ trợ kết thúc"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sessionStatus === "BOT" && (
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-[10px] font-bold bg-[#fe932c] hover:bg-[#d97706] dark:bg-secondary text-primary dark:text-[#002B1F] px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Gặp nhân viên hỗ trợ"
                >
                  Nhân viên <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#02140f] transition-colors duration-300">
            {messages.map((msg, index) => {
              if (msg.sender === "system") {
                return (
                  <div key={index} className="text-center text-[11px] text-slate-500 dark:text-emerald-100/40 italic py-1 px-4 leading-relaxed bg-slate-100/50 dark:bg-[#031d16]/30 rounded-lg max-w-xs mx-auto">
                    {msg.text}
                  </div>
                );
              }

              const isUser = msg.sender === "user";
              return (
                <div key={index} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-slate-400 dark:text-emerald-100/40 mb-1 px-1">
                    {isUser ? msg.senderName || "Bạn" : msg.senderName || (msg.sender === "staff" ? "Nhân viên" : "Trợ lý")}
                  </span>
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                      isUser
                        ? "bg-[#003527] text-white rounded-tr-none dark:bg-[#fe932c] dark:text-[#002B1F]"
                        : "bg-white dark:bg-[#06261d] text-slate-800 dark:text-emerald-50 rounded-tl-none border border-slate-100 dark:border-primary-container/20"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-slate-400 dark:text-emerald-100/40 mb-1 px-1">
                  Đang xử lý
                </span>
                <div className="bg-white dark:bg-[#06261d] text-slate-400 dark:text-emerald-100/40 italic rounded-2xl rounded-tl-none px-4 py-2.5 text-sm border border-slate-100 dark:border-primary-container/20 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white dark:bg-[#06261d] border-t border-slate-100 dark:border-primary-container/20 flex items-center gap-2 transition-colors duration-300">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={sessionStatus === "CLOSED"}
              placeholder={sessionStatus === "CLOSED" ? "Phiên hỗ trợ đã đóng" : "Nhập yêu cầu..."}
              className="flex-1 bg-slate-50 dark:bg-[#031d16] border border-slate-100 dark:border-primary-container/20 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-emerald-50 placeholder-slate-400 outline-none focus:border-[#003527] dark:focus:border-[#fe932c] transition-all disabled:opacity-55 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || sessionStatus === "CLOSED"}
              className="w-10 h-10 shrink-0 bg-[#003527] dark:bg-[#fe932c] hover:bg-[#064e3b] dark:hover:bg-[#d97706] text-white dark:text-[#002B1F] flex items-center justify-center rounded-xl transition-all active:scale-[0.93] disabled:opacity-40 disabled:scale-100 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-[#003527] to-[#064e3b] dark:from-[#fe932c] dark:to-[#d97706] hover:from-[#064e3b] hover:to-[#003527] dark:hover:from-[#d97706] dark:hover:to-[#fe932c] text-white dark:text-[#002B1F] flex items-center justify-center rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.25)] hover:-translate-y-1 transition-all duration-300 cursor-pointer active:scale-95 group border-none"
        >
          <MessageSquare className="w-6 h-6 transition-transform duration-300 group-hover:rotate-6" />
        </button>
      )}
    </div>
  );
}