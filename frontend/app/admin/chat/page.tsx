"use client";

import { useEffect, useState, useRef } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import MusicLoading from "../../components/common/MusicLoading";
import { Send, User, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface ChatSession {
  sessionId: string;
  userId: string;
  userName: string;
  status: "BOT" | "HUMAN_WAITING" | "HUMAN_CONNECTED" | "CLOSED";
  assignedStaffId?: string;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  sender: "user" | "bot" | "staff" | "system";
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export default function AdminChatPage() {
  const [waitingSessions, setWaitingSessions] = useState<ChatSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ email: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Tải thông tin Nhân viên đang đăng nhập
  useEffect(() => {
    const getStaff = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (token) {
          const { fetchUserAttributes } = await import("aws-amplify/auth");
          const attrs = await fetchUserAttributes();
          setStaffInfo({
            email: attrs.email || "",
            name: attrs.name || attrs.given_name || attrs.family_name || attrs.email || "Nhân viên",
          });
        }
      } catch (err) {
        console.error("Failed to load staff details:", err);
      }
    };
    getStaff();
  }, []);

  // 2. Fetch danh sách các phiên chat
  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/chat/admin/sessions");
      if (res.ok) {
        const data = await res.json();
        setWaitingSessions(data.waiting || []);
        setActiveSessions(data.active || []);

        // Cập nhật lại thông tin session đang chọn nếu có thay đổi từ DB
        if (selectedSession) {
          const updated = [...(data.waiting || []), ...(data.active || [])].find(
            (s) => s.sessionId === selectedSession.sessionId
          );
          if (updated) {
            setSelectedSession(updated);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Polling danh sách phiên mỗi 5 giây
    return () => clearInterval(interval);
  }, [selectedSession?.sessionId]);

  // 3. Tải tin nhắn của phiên đang được chọn
  const fetchHistory = async (sessId: string) => {
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    fetchHistory(selectedSession.sessionId);
    const interval = setInterval(() => {
      fetchHistory(selectedSession.sessionId);
    }, 2500); // Polling tin nhắn mới mỗi 2.5 giây

    return () => clearInterval(interval);
  }, [selectedSession?.sessionId]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Nhân viên tiếp nhận phiên chat
  const handleAssignSession = async (session: ChatSession) => {
    if (!staffInfo) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat/admin/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          staffId: staffInfo.email,
          staffName: staffInfo.name,
        }),
      });

      if (res.ok) {
        await fetchSessions();
        // Cập nhật session hiện tại sang CONNECTED để hiển thị khung chat
        setSelectedSession({
          ...session,
          status: "HUMAN_CONNECTED",
          assignedStaffId: staffInfo.email,
          assignedStaffName: staffInfo.name,
        });
      }
    } catch (err) {
      console.error("Failed to assign session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Kết thúc hỗ trợ (Đóng phiên chat)
  const handleCloseSession = async () => {
    if (!selectedSession) return;
    if (!confirm("Bạn muốn kết thúc cuộc hội thoại hỗ trợ này?")) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/chat/admin/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.sessionId }),
      });

      if (res.ok) {
        await fetchSessions();
        setSelectedSession(null);
      }
    } catch (err) {
      console.error("Failed to close session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Gửi tin nhắn từ phía Nhân viên
  const handleSendMessage = async () => {
    if (!input.trim() || !selectedSession || !staffInfo || isSending) return;

    const textToSend = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          sessionId: selectedSession.sessionId,
          userEmail: staffInfo.email,
          userName: staffInfo.name,
          sender: "STAFF",
          senderName: staffInfo.name,
        }),
      });

      if (res.ok) {
        // Tải lại lịch sử tin nhắn ngay lập tức
        await fetchHistory(selectedSession.sessionId);
      }
    } catch (err) {
      console.error("Failed to send staff message:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && waitingSessions.length === 0 && activeSessions.length === 0) {
    return <MusicLoading message="Đang tải danh sách cuộc hội thoại hỗ trợ..." height="400px" />;
  }

  return (
    <div className="h-[80vh] flex flex-col md:flex-row gap-6 font-sans">
      
      {/* Cột trái: Hàng đợi và danh sách chat */}
      <div className="w-full md:w-1/3 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">
        
        {/* Header danh sách */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base text-[#002B1F] font-bold">Khách Hàng Đợi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tự động cập nhật mỗi 5 giây</p>
          </div>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {waitingSessions.length} phiên mới
          </span>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          
          {/* Hàng đợi (Waiting Queue) */}
          {waitingSessions.length > 0 ? (
            <div className="pb-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 block mb-2">Đang chờ phục vụ</span>
              {waitingSessions.map((sess) => (
                <div 
                  key={sess.sessionId}
                  onClick={() => setSelectedSession(sess)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    selectedSession?.sessionId === sess.sessionId
                      ? "bg-slate-100 border-[#002B1F]/10"
                      : "bg-red-50/40 border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{sess.userName}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{sess.userId}</p>
                    <span className="text-[9px] text-slate-450 mt-1 block">Yêu cầu lúc: {new Date(sess.updatedAt).toLocaleTimeString("vi-VN")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignSession(sess);
                    }}
                    className="bg-[#002B1F] hover:bg-[#054030] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    Nhận <CheckCircle2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Đang hội thoại (Connected list) */}
          <div className="pt-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 block mb-2">Hội thoại đang hoạt động</span>
            {activeSessions.length > 0 ? (
              activeSessions.map((sess) => {
                const isMine = sess.assignedStaffId === staffInfo?.email;
                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => setSelectedSession(sess)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
                      selectedSession?.sessionId === sess.sessionId
                        ? "bg-slate-100 border-[#002B1F]/15"
                        : "bg-white border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{sess.userName}</h4>
                      {isMine ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0">Bạn hỗ trợ</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[8px] font-medium px-1.5 py-0.5 rounded-full shrink-0 truncate max-w-[80px]">
                          {sess.assignedStaffName || "N/A"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{sess.userId}</p>
                    <span className="text-[9px] text-slate-400 mt-1 block">Hoạt động cuối: {new Date(sess.updatedAt).toLocaleTimeString("vi-VN")}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">Không có phiên hỗ trợ nào đang mở.</div>
            )}
          </div>

        </div>
      </div>

      {/* Cột giữa: Khung chat và nội dung tin nhắn */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">
        {selectedSession ? (
          <>
            {/* Header Khung Chat */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-base font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-sm font-bold text-slate-800 truncate">{selectedSession.userName}</h3>
                  <span className="text-[10px] text-slate-400 truncate block">{selectedSession.userId}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedSession.status === "HUMAN_CONNECTED" ? (
                  <button
                    type="button"
                    onClick={handleCloseSession}
                    className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-rose-150"
                  >
                    Kết thúc <XCircle className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAssignSession(selectedSession)}
                    className="flex items-center gap-1 bg-[#002B1F] hover:bg-[#054030] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Tiếp nhận hỗ trợ <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Body Tin Nhắn */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
              {messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isStaff = msg.sender === "staff";
                  const isBot = msg.sender === "bot";
                  
                  if (msg.sender === "system") {
                    return (
                      <div key={index} className="text-center text-[10.5px] text-slate-500 italic py-1 bg-slate-100 rounded-lg max-w-sm mx-auto">
                        {msg.text}
                      </div>
                    );
                  }

                  return (
                    <div key={index} className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}>
                      <span className="text-[9px] text-slate-400 mb-1 px-1">
                        {isStaff ? msg.senderName || "Tôi" : msg.senderName || (isBot ? "Trợ lý ảo" : "Khách")} • {new Date(msg.createdAt).toLocaleTimeString("vi-VN")}
                      </span>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                          isStaff
                            ? "bg-[#002B1F] text-white rounded-tr-none"
                            : isBot
                            ? "bg-slate-200 text-slate-700 rounded-tl-none border border-slate-300/40"
                            : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                  <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs">Đang tải lịch sử tin nhắn...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Tin Nhắn */}
            {selectedSession.status === "HUMAN_CONNECTED" ? (
              <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={`Gửi phản hồi cho ${selectedSession.userName}...`}
                  className="flex-1 bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#002B1F] transition-all"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isSending}
                  className="w-12 h-12 bg-[#002B1F] hover:bg-[#054030] text-white flex items-center justify-center rounded-xl transition-all active:scale-[0.93] disabled:opacity-40 disabled:scale-100 cursor-pointer shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-5 bg-yellow-50 border-t border-yellow-100 text-center text-xs text-yellow-700 shrink-0 font-medium">
                ⚠️ Phiên hỗ trợ này đang ở trạng thái hàng chờ. Vui lòng bấm &ldquo;Tiếp nhận hỗ trợ&rdquo; ở góc trên bên phải để bắt đầu chat.
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 text-2xl mb-4 border border-dashed border-slate-200">
              💬
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-700">Chưa Chọn Phiên Hỗ Trợ</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Vui lòng chọn một phiên chat của khách hàng ở danh sách hàng chờ hoặc hội thoại bên trái để bắt đầu hỗ trợ tư vấn trực tuyến.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
