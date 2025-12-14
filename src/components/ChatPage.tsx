"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import MessageList, { Message } from "@/components/MessageList";
import { InputArea } from "@/components/InputArea";
import {
  Menu,
  ChevronLeft,
  Share,
  Star,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import { useAI } from "@/context/AIContext";
import { useUnread } from "@/context/UnreadContext";
// 🔥 引入通话覆盖层组件
import VoiceCallOverlay from "@/components/VoiceCallOverlay";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface ChatPageProps {
  conversationId: string;
  contactName?: string;
}

interface UserProfile {
  avatar: string;
  personas: { id: string; name: string; avatar: string }[];
}

export default function ChatPage({
  conversationId,
  contactName = "AI助手",
}: ChatPageProps) {
  const { requestAIReply, getChatState, triggerActiveMessage, regenerateChat } =
    useAI();
  const { clearUnread } = useUnread();

  // --- 🔥 滚动控制核心 Ref ---
  const isSticky = useRef(true);
  const isUserInteracting = useRef(false);

  // 容器 Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [myAvatar, setMyAvatar] = useState<string>("");

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 🔥 通话相关状态
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callDirection, setCallDirection] = useState<"outgoing" | "incoming">(
    "outgoing"
  );

  const replyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- 🔥 通话功能逻辑区 ---

  // 格式化秒数
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "已取消";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `通话时长 ${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    return `通话时长 ${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  // 处理通话结束的回调
  const handleCallFinish = (
    status: "completed" | "rejected" | "missed",
    duration: number
  ) => {
    setIsCallOpen(false); // 关闭界面

    let contentText = "";

    // 生成气泡文字
    if (status === "completed") {
      contentText = formatDuration(duration);
    } else {
      // 拒接/取消/未接
      if (callDirection === "outgoing") {
        contentText = "对方已拒绝";
        if (duration === 0) contentText = "已取消";
      } else {
        contentText = "已拒绝";
      }
    }

    // 构建消息对象
    const callMsg: Message = {
      id: Date.now().toString(),
      // role 决定气泡位置：outgoing(我发起的) -> user(右边), incoming(AI发起的) -> assistant(左边)
      role: callDirection === "outgoing" ? "user" : "assistant",
      // @ts-ignore: 忽略这里可能存在的类型检查，确保 MessageList 已更新支持 call_log
      type: "call_log",
      content: contentText,
      timestamp: new Date(),
      status: "sent",
    };

    setMessages((prev) => {
      const newMsgs = [...prev, callMsg];
      if (conversationId) {
        localStorage.setItem(`chat_${conversationId}`, JSON.stringify(newMsgs));
      }
      return newMsgs;
    });

    // 滚动到底部
    isSticky.current = true;
    setTimeout(() => scrollToBottom("auto"), 100);
  };

  // 监听 AI 是否主动发起通话 (检测 [CALL_USER] 标签)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    // 只有 AI 的最新消息才检查，且当前没有通话
    // 🔥 修复点：使用 (lastMsg.status as string) 绕过 TypeScript 的类型检查错误
    if (
      lastMsg.role === "assistant" &&
      (lastMsg.status as string) !== "thinking" &&
      !isCallOpen
    ) {
      if (
        lastMsg.content.includes("[CALL_USER]") ||
        lastMsg.content.includes("【发起语音通话】")
      ) {
        setCallDirection("incoming");
        setIsCallOpen(true);
      }
    }
  }, [messages, isCallOpen]);

  // 暴露给控制台测试：window.testIncomingCall()
  useEffect(() => {
    (window as any).testIncomingCall = () => {
      setCallDirection("incoming");
      setIsCallOpen(true);
    };
  }, []);

  // --- End 通话逻辑 ---

  const reloadMessages = () => {
    if (!conversationId) return;
    const savedMsgs = localStorage.getItem(`chat_${conversationId}`);
    if (savedMsgs) setMessages(JSON.parse(savedMsgs));
  };

  useEffect(() => {
    if (conversationId && typeof window !== "undefined") {
      const contactsStr = localStorage.getItem("contacts");
      let currentContact = null;
      if (contactsStr) {
        const contacts = JSON.parse(contactsStr);
        currentContact = contacts.find(
          (c: any) => String(c.id) === String(conversationId)
        );
        if (currentContact) {
          setContactInfo({
            ...currentContact,
            name: currentContact.remark || currentContact.name,
            aiName: currentContact.aiName || currentContact.name,
            myNickname: "我",
            timeAwareness: currentContact.timeAwareness || false,
            asideMode: currentContact.asideMode || false,
          });
        } else {
          setContactInfo({
            name: contactName,
            avatar: "🐱",
            aiName: contactName,
            myNickname: "我",
          });
        }
      }

      const userProfileStr = localStorage.getItem("user_profile_v4");
      let finalMyAvatar = "";
      if (userProfileStr) {
        try {
          const profile: UserProfile = JSON.parse(userProfileStr);
          const boundPersonaId = currentContact?.userPersonaId || "default";
          const targetPersona = profile.personas?.find(
            (p) => p.id === boundPersonaId
          );
          if (targetPersona && targetPersona.avatar)
            finalMyAvatar = targetPersona.avatar;
          else if (profile.avatar) finalMyAvatar = profile.avatar;
          else if (profile.personas && profile.personas.length > 0)
            finalMyAvatar = profile.personas[0].avatar;
        } catch (e) {
          console.error(e);
        }
      }
      setMyAvatar(finalMyAvatar);

      const savedBg = localStorage.getItem(`chat_bg_${conversationId}`);
      if (savedBg) setBgImage(savedBg);

      reloadMessages();
      clearUnread(conversationId);
    }
  }, [conversationId, clearUnread, contactName]);

  useEffect(() => {
    const handleUpdate = (e: CustomEvent) => {
      if (String(e.detail.conversationId) === String(conversationId)) {
        reloadMessages();
        clearUnread(conversationId);
      }
    };
    window.addEventListener("chat_updated" as any, handleUpdate);
    return () =>
      window.removeEventListener("chat_updated" as any, handleUpdate);
  }, [conversationId, clearUnread]);

  // --- 🔥🔥🔥 核弹级：全页面扫描滚动 🔥🔥🔥 ---
  const forceScrollToBottom = () => {
    const el = document.getElementById("chat-scroller");
    if (el) el.scrollTop = el.scrollHeight;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }

    const allDivs = document.querySelectorAll("div");
    allDivs.forEach((div) => {
      if (
        div.scrollHeight > div.clientHeight &&
        div.style.overflow !== "hidden"
      ) {
        if (div.scrollTop < div.scrollHeight - div.clientHeight - 5) {
          div.scrollTop = div.scrollHeight;
        }
      }
    });

    window.scrollTo(0, document.body.scrollHeight);
  };

  const scrollToBottom = (behavior: "smooth" | "auto" = "auto") => {
    isSticky.current = true;
    isUserInteracting.current = false;

    if (scrollContainerRef.current) {
      if (behavior === "auto") {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  };

  const handleUserInteraction = () => {
    isUserInteracting.current = true;
    isSticky.current = false;

    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      isUserInteracting.current = false;
    }, 1000);
  };

  const handleScroll = () => {
    const container =
      document.getElementById("chat-scroller") || scrollContainerRef.current;
    if (!container) return;

    const div = container as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = div;
    const distance = scrollHeight - scrollTop - clientHeight;

    if (distance > 50) {
      isSticky.current = false;
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
      if (distance < 20) {
        isSticky.current = true;
      }
    }
  };

  useEffect(() => {
    if (!isSelectionMode && isSticky.current && !isUserInteracting.current) {
      scrollToBottom("auto");
    }
  }, [messages, isSelectionMode, isPanelOpen]);

  useEffect(() => {
    if (input.trim().length > 0 && replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  }, [input]);

  const enterSelectionMode = (initialMsgId?: string) => {
    setIsSelectionMode(true);
    if (initialMsgId) {
      setSelectedIds(new Set([initialMsgId]));
    } else {
      setSelectedIds(new Set());
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (msgId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`确定删除这 ${selectedIds.size} 条消息吗？`)) {
      const newMessages = messages.filter((m) => !selectedIds.has(m.id));
      setMessages(newMessages);
      if (conversationId) {
        localStorage.setItem(
          `chat_${conversationId}`,
          JSON.stringify(newMessages)
        );
      }
      exitSelectionMode();
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev) => {
      const newMessages = prev.filter((m) => m.id !== msgId);
      if (conversationId)
        localStorage.setItem(
          `chat_${conversationId}`,
          JSON.stringify(newMessages)
        );
      return newMessages;
    });
  };

  const handleResendMessage = (msg: Message) => {
    if (conversationId && contactInfo) {
      regenerateChat(conversationId, msg.id, contactInfo);
    }
  };

  const handleContinueMessage = (msg: Message) => {
    if (conversationId && contactInfo) {
      triggerActiveMessage(conversationId, contactInfo, "continue");
    }
  };

  const handleEditMessage = (msg: Message) => {
    if (msg.role !== "user" || msg.type !== "text") return;
    setInput(msg.content);
    handleDeleteMessage(msg.id);
  };

  const handleUserSend = (
    text: string,
    type: "text" | "audio" | "image" | "sticker" = "text",
    duration?: number,
    audioUrl?: string,
    tempId?: string,
    imageDesc?: string
  ) => {
    if (type === "text" && !text?.trim()) return;
    let updatedMessages: Message[] = [];
    setMessages((prev) => {
      let newMessages = [...prev];
      if (tempId) {
        newMessages = newMessages.map((msg) =>
          msg.id === tempId
            ? { ...msg, content: text, status: "sent" as const }
            : msg
        );
      } else {
        const finalType = imageDesc ? "sticker" : (type as any);
        const userMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: text || "",
          timestamp: new Date(),
          type: finalType,
          duration: duration,
          audioUrl: audioUrl,
          status: type === "audio" && !text ? "sending" : "sent",
          alt: imageDesc,
        };
        newMessages.push(userMessage);
      }
      if (conversationId)
        localStorage.setItem(
          `chat_${conversationId}`,
          JSON.stringify(newMessages)
        );
      updatedMessages = newMessages;
      return newMessages;
    });
    if (type === "text") setInput("");

    isSticky.current = true;
    isUserInteracting.current = false;
    setTimeout(() => scrollToBottom("auto"), 50);

    const isReadyToSendToAI = !(type === "audio" && !text);
    if (isReadyToSendToAI) {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      replyTimerRef.current = setTimeout(() => {
        if (conversationId && contactInfo)
          requestAIReply(conversationId, contactInfo, updatedMessages);
      }, 6000);
    }
  };

  const aiStatus = conversationId ? getChatState(conversationId) : "idle";
  const getHeaderStatus = () => {
    if (aiStatus === "thinking") return "对方正在思考...";
    if (aiStatus === "typing") return "对方正在输入...";
    return contactInfo?.name || contactName;
  };
  const safeContactInfo = contactInfo || {
    name: contactName,
    avatar: "🐱",
    aiName: contactName,
    myNickname: "我",
  };

  const handleButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("🔥 [ChatPage] 悬浮按钮被点击了！执行核弹级滚动！");

    isUserInteracting.current = false;
    isSticky.current = true;
    setShowScrollButton(false);

    forceScrollToBottom();
    requestAnimationFrame(() => {
      forceScrollToBottom();
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 relative">
      <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="-ml-2 p-2 text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          {safeContactInfo.avatar && (
            <div className="relative w-9 h-9 shrink-0">
              <img
                src={safeContactInfo.avatar}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover border border-gray-200"
              />
              {aiStatus === "idle" && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
          )}
          <div className="flex flex-col justify-center">
            <div className="font-semibold text-base leading-tight">
              {getHeaderStatus()}
            </div>
          </div>
        </div>
        <Link
          href={`/chat/${conversationId}/info`}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <Menu className="w-5 h-5" />
        </Link>
      </header>

      {/* 挂载通话覆盖层 */}
      <VoiceCallOverlay
        isOpen={isCallOpen}
        onClose={handleCallFinish}
        contactInfo={{
          name: safeContactInfo.name,
          avatar: safeContactInfo.avatar || "default_avatar",
        }}
        direction={callDirection}
      />

      <div
        id="chat-scroller"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onWheel={handleUserInteraction}
        onTouchMove={handleUserInteraction}
        onMouseDown={handleUserInteraction}
        className="flex-1 overflow-y-auto px-1 pt-1 pb-7"
        style={{
          backgroundColor: bgImage ? "transparent" : "#f5f5f5",
          backgroundImage: bgImage ? `url(${bgImage})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <MessageList
          messages={messages}
          isLoading={aiStatus === "thinking" || aiStatus === "typing"}
          contactInfo={safeContactInfo}
          contactAvatar={safeContactInfo.avatar}
          myAvatar={myAvatar}
          conversationId={conversationId}
          onDeleteMessage={handleDeleteMessage}
          onResendMessage={handleResendMessage}
          onContinueMessage={handleContinueMessage}
          onEditMessage={handleEditMessage}
          isSelectionMode={isSelectionMode}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onEnterSelectionMode={enterSelectionMode}
        />
        <div className="h-4" />
      </div>

      {showScrollButton && !isSelectionMode && (
        <button
          type="button"
          className="fixed bottom-32 right-4 z-[9999] pointer-events-auto outline-none animate-in fade-in zoom-in duration-200 touch-manipulation"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handleButtonClick}
        >
          <div className="bg-white text-[#07c160] shadow-2xl rounded-full p-3 border border-[#07c160]/30 hover:bg-green-50 active:scale-90 transition-transform pointer-events-none">
            <ChevronDown className="w-6 h-6 stroke-[3]" />
          </div>
        </button>
      )}

      {isSelectionMode ? (
        <div className="h-16 bg-white border-t flex items-center justify-around px-4 z-50 shadow-up shrink-0">
          <button
            onClick={() => alert("暂未实现")}
            className="flex flex-col items-center gap-1"
          >
            <Share className="w-5 h-5 text-gray-600" />
            <span className="text-[10px] text-gray-500">转发</span>
          </button>
          <button
            onClick={() => alert("暂未实现")}
            className="flex flex-col items-center gap-1"
          >
            <Star className="w-5 h-5 text-gray-600" />
            <span className="text-[10px] text-gray-500">收藏</span>
          </button>
          <button
            onClick={handleBatchDelete}
            className="flex flex-col items-center gap-1 text-red-500"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-[10px]">删除</span>
          </button>
          <div className="w-[1px] h-6 bg-gray-200"></div>
          <button
            onClick={exitSelectionMode}
            className="flex flex-col items-center gap-1"
          >
            <X className="w-6 h-6 text-gray-500" />
            <span className="text-[10px] text-gray-500">取消</span>
          </button>
        </div>
      ) : (
        <InputArea
          input={input}
          isLoading={aiStatus === "thinking" || aiStatus === "typing"}
          onInputChange={setInput}
          onSendText={() => handleUserSend(input, "text")}
          onStartCall={() => {
            setCallDirection("outgoing");
            setIsCallOpen(true);
          }}
          onPanelChange={(isOpen) => {
            setIsPanelOpen(isOpen);
            if (isSticky.current) {
              setTimeout(() => scrollToBottom("auto"), 300);
            }
          }}
          onSendAudio={async (text, duration, audioBlob, imageDesc) => {
            if (imageDesc) {
              handleUserSend(text, "image", 0, undefined, undefined, imageDesc);
              return;
            }
            let audioDataUrl = undefined;
            if (audioBlob) audioDataUrl = await blobToBase64(audioBlob);
            const tempId = Date.now().toString();
            handleUserSend("", "audio", duration, audioDataUrl, undefined);
            if (audioBlob) {
              const formData = new FormData();
              formData.append("file", audioBlob);
              const res = await fetch("/api/audio", {
                method: "POST",
                body: formData,
              });
              if (res.ok) {
                const data = await res.json();
                handleUserSend(
                  data.text || "[听不清]",
                  "audio",
                  duration,
                  audioDataUrl,
                  tempId
                );
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, content: "[转写失败]", status: "error" }
                      : m
                  )
                );
              }
            }
          }}
        />
      )}
    </div>
  );
}
