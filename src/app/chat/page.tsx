"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  Compass,
  User,
  ChevronLeft,
  X,
  Upload,
} from "lucide-react";
import { SwipeableItem } from "@/components/SwipeableItem";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUnread } from "@/context/UnreadContext";

// --- 接口定义 ---

interface Contact {
  id: string;
  name: string;
  avatar: string;
  remark?: string;
  intro?: string;
  aiName?: string;
  myNickname?: string;
  isPinned?: boolean;
  // 新增字段以支持完整功能
  description?: string;
  firstMessage?: string;
  worldBookId?: string; // 关联的世界书ID
}

// 世界书数据结构接口
interface WorldBookEntry {
  id: number;
  keys: string[];
  content: string;
  enabled: boolean;
}

interface WorldBookCategory {
  id: number;
  name: string;
  entries: WorldBookEntry[];
}

export const dynamic = "force-dynamic";

// --- 工具函数：PNG 解析 (核心修复) ---

/**
 * 从 PNG 文件 ArrayBuffer 中提取 tEXt 块数据 (TavernAI 格式)
 */
const extractPngMetadata = (buffer: ArrayBuffer): string | null => {
  const view = new DataView(buffer);

  // 检查 PNG 签名
  if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
    return null;
  }

  let offset = 8;
  const decoder = new TextDecoder("utf-8"); // 用于解码 PNG 块本身的结构

  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset);
    const type = decoder.decode(new Uint8Array(buffer, offset + 4, 4));

    // 我们寻找 tEXt 块
    if (type === "tEXt") {
      const dataStart = offset + 8;
      const data = new Uint8Array(buffer, dataStart, length);

      // tEXt 格式: keyword + null separator + text
      let separatorIndex = -1;
      for (let i = 0; i < length; i++) {
        if (data[i] === 0) {
          separatorIndex = i;
          break;
        }
      }

      if (separatorIndex !== -1) {
        const keyword = decoder.decode(data.slice(0, separatorIndex));
        const text = decoder.decode(data.slice(separatorIndex + 1));

        // TavernAI 使用 'chara' 关键字存储 Base64 编码的 JSON
        if (keyword === "chara") {
          try {
            // 🔥🔥🔥 核心修复：Base64 解码 -> 二进制 -> UTF-8 字符串 🔥🔥🔥
            const binaryString = atob(text);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder("utf-8").decode(bytes);
          } catch (e) {
            console.error("Base64 decode failed", e);
            return text;
          }
        }
      }
    }

    // 移动到下一个块 (Length + Type + Data + CRC)
    offset += length + 12;
  }

  return null;
};

// --- 组件部分 ---

// 创建角色弹窗组件
function CreateCharacterModal({
  isOpen,
  onClose,
  onCreateManual,
  onImportCard,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateManual: () => void;
  onImportCard: (file: File) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">创建新聊天</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          {/* 手动创建角色 */}
          <button
            onClick={onCreateManual}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            手动创建角色
          </button>

          {/* 导入角色卡 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-gray-200"
          >
            <Upload className="w-5 h-5 text-blue-500" />
            <div className="flex flex-col items-start">
              <span className="text-sm">导入角色卡</span>
              <span className="text-[10px] text-gray-500">
                支持 .json / .png (含世界书)
              </span>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImportCard(file);
              }
              // 重置 value 允许重复选择同一文件
              e.target.value = "";
            }}
          />
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// 手动创建角色对话框
function ManualCreateModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, remark: string) => void;
}) {
  const [name, setName] = useState("");
  const [remark, setRemark] = useState("");

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim(), remark.trim());
      setName("");
      setRemark("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">创建新角色</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {/* 角色名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              角色名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入角色名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
            />
          </div>

          {/* 备注名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注名 (列表显示)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="请输入备注名（可选）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatListPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { unreadCounts, totalUnread } = useUnread();

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualCreateModal, setShowManualCreateModal] = useState(false);

  // 默认数据
  const defaultContacts: Contact[] = [
    {
      id: "1",
      name: "哼呀鬼",
      avatar: "🐱",
      remark: "哼呀鬼",
      intro: "在办公室...",
      isPinned: false,
    },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("contacts");
        let parsedContacts = saved ? JSON.parse(saved) : defaultContacts;
        if (!saved)
          localStorage.setItem("contacts", JSON.stringify(defaultContacts));

        const contactsWithLatestMsg = parsedContacts.map((contact: Contact) => {
          const chatHistoryStr = localStorage.getItem(`chat_${contact.id}`);
          if (chatHistoryStr) {
            try {
              const messages = JSON.parse(chatHistoryStr);
              if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                return { ...contact, intro: lastMsg.content };
              }
            } catch (e) {}
          }
          return contact;
        });
        setContacts(sortContacts(contactsWithLatestMsg));
      } catch (e) {
        setContacts(defaultContacts);
      }
      setIsLoaded(true);
    }
  }, []);

  const sortContacts = (list: Contact[]) => {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  };

  const handleAddContact = () => {
    setShowCreateModal(true);
  };

  const handleCreateManual = () => {
    setShowCreateModal(false);
    setShowManualCreateModal(true);
  };

  const handleConfirmCreate = (name: string, remark: string) => {
    const randomId = Date.now().toString();
    const newContact: Contact = {
      id: randomId,
      name: name,
      avatar: "🤖",
      remark: remark,
      intro: "你好",
      aiName: name,
      myNickname: "我",
      isPinned: false,
    };
    const updated = [newContact, ...contacts];
    setContacts(sortContacts(updated));
    localStorage.setItem("contacts", JSON.stringify(updated));
    setShowManualCreateModal(false);

    setTimeout(() => router.push(`/chat/${randomId}`), 300);
  };

  // --- 核心：导入角色卡处理逻辑 ---
  const handleImportCard = async (file: File) => {
    try {
      let characterData: any = null;
      let cardAvatar: string = "🤖"; // 默认头像

      if (file.type === "application/json") {
        // 1. JSON 格式
        const text = await file.text();
        characterData = JSON.parse(text);
      } else if (file.type === "image/png") {
        // 2. PNG 格式 (TavernAI)
        const arrayBuffer = await file.arrayBuffer();

        // 尝试提取元数据
        const extractedJson = extractPngMetadata(arrayBuffer);

        if (extractedJson) {
          try {
            const parsed = JSON.parse(extractedJson);
            // Tavern格式可能是 { data: {...} } 或者直接是对象
            characterData = parsed.data || parsed;
          } catch (e) {
            console.error("JSON parse error from PNG", e);
          }
        }

        // 如果提取成功，生成该图片的 Base64 作为头像
        if (characterData) {
          // 重新读取 blob 转 base64 用于显示头像
          const base64Avatar = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          cardAvatar = base64Avatar;
        } else {
          alert("未能在图片中找到有效的角色数据 (Tavern/V2格式)");
          return;
        }
      }

      if (characterData) {
        // 规范化数据字段 (兼容不同版本的 JSON 格式)
        const charName =
          characterData.name || characterData.char_name || "导入角色";
        const charDesc =
          characterData.description || characterData.personality || "";
        const charScenario = characterData.scenario || "";
        const charIntro =
          characterData.first_mes || characterData.greeting || "你好";

        // --- 世界书提取逻辑 ---
        let importedWorldBookId = "";
        const wbData = characterData.character_book || characterData.lorebook;

        if (wbData && (wbData.entries || wbData.entries_list)) {
          // 读取现有世界书
          const existingWBStr = localStorage.getItem("worldbook_data");
          let existingWB = existingWBStr
            ? JSON.parse(existingWBStr)
            : { categories: [] };

          // 创建新分组
          const newCategoryId = Date.now();
          const entriesRaw = wbData.entries || wbData.entries_list || [];

          const newEntries: WorldBookEntry[] = entriesRaw.map(
            (entry: any, index: number) => ({
              id: Date.now() + index,
              keys: entry.keys || entry.key || [],
              content: entry.content || "",
              enabled: entry.enabled ?? true,
            })
          );

          const newCategory: WorldBookCategory = {
            id: newCategoryId,
            name: `${charName}的世界书 (导入)`,
            entries: newEntries,
          };

          // 保存世界书到 localStorage
          existingWB.categories.push(newCategory);
          localStorage.setItem("worldbook_data", JSON.stringify(existingWB));

          importedWorldBookId = String(newCategoryId);
          alert(
            `✅ 已自动导入角色内置世界书，包含 ${newEntries.length} 个条目`
          );
        }
        // -----------------------

        const randomId = Date.now().toString();
        const newContact: Contact = {
          id: randomId,
          name: charName,
          avatar: cardAvatar,
          remark: charName,
          intro: charIntro,
          aiName: charName,
          myNickname: "我",
          isPinned: false,
          // 保存完整设定
          description: `${charDesc}\n\n[Scenario]: ${charScenario}`,
          firstMessage: charIntro,
          worldBookId: importedWorldBookId,
        };

        const updated = [newContact, ...contacts];
        setContacts(sortContacts(updated));
        localStorage.setItem("contacts", JSON.stringify(updated));

        // 初始化第一条消息
        const initialMsg = [
          {
            id: Date.now().toString(),
            role: "assistant",
            content: charIntro,
            timestamp: new Date(),
            type: "text",
          },
        ];
        localStorage.setItem(`chat_${randomId}`, JSON.stringify(initialMsg));

        setShowCreateModal(false);

        // 自动进入聊天
        setTimeout(() => router.push(`/chat/${randomId}`), 300);
      }
    } catch (error) {
      console.error("导入角色卡失败:", error);
      alert("导入失败，请检查文件格式。支持 TavernAI PNG 或 JSON。");
    }
  };

  const handlePin = (id: string) => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, isPinned: !c.isPinned } : c
    );
    setContacts(sortContacts(updated));
    localStorage.setItem("contacts", JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    if (confirm("确认删除？")) {
      const updated = contacts.filter((c) => c.id !== id);
      setContacts(updated);
      localStorage.setItem("contacts", JSON.stringify(updated));
      localStorage.removeItem(`chat_${id}`);
    }
  };

  const handleRead = (_id: string) => {};

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden">
      <header className="px-4 h-14 flex items-center justify-between bg-[#ededed] border-b border-gray-200 shrink-0 z-20 relative">
        <button
          onClick={() => router.push("/")}
          className="p-1 -ml-2 text-gray-900 active:bg-gray-200 rounded-full z-30"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium text-gray-900 absolute left-1/2 transform -translate-x-1/2">
          消息 ({contacts.length})
        </h1>
        <div className="flex gap-4 z-30">
          <button className="text-gray-900 p-1">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={handleAddContact} className="text-gray-900 p-1">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-16">
        {contacts.map((contact) => {
          const unreadCount = unreadCounts[String(contact.id)] || 0;
          return (
            <SwipeableItem
              key={contact.id}
              isPinned={contact.isPinned}
              onPin={() => handlePin(contact.id)}
              onDelete={() => handleDelete(contact.id)}
              onRead={() => handleRead(contact.id)}
            >
              <Link
                href={`/chat/${contact.id}`}
                className={`flex items-center gap-3 px-4 py-3 active:bg-gray-100 transition-colors ${
                  contact.isPinned ? "bg-gray-50" : "bg-white"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl overflow-hidden">
                    {contact.avatar?.startsWith("http") ||
                    contact.avatar?.startsWith("data:") ? (
                      <Image
                        src={contact.avatar}
                        alt={contact.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{contact.avatar}</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 z-50 min-w-[1.125rem] h-[1.125rem] bg-red-500 text-white text-[10px] font-bold px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-medium text-base text-gray-900 truncate">
                      {contact.remark || contact.name}
                    </h3>
                    <span className="text-xs text-gray-300">刚刚</span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      unreadCount > 0 ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {unreadCount > 0 ? `[${unreadCount}条] ` : ""}
                    {contact.intro || "点击开始聊天..."}
                  </p>
                </div>
              </Link>
            </SwipeableItem>
          );
        })}
      </div>

      <div className="h-16 bg-[#f7f7f7] border-t border-gray-200 flex items-center justify-around text-[11px] shrink-0 fixed bottom-0 w-full z-30 pb-1 safe-area-bottom">
        <div className="flex flex-col items-center justify-center h-full w-1/4 cursor-default text-[#07c160]">
          <div className="relative">
            <MessageSquare className="w-7 h-7 mb-0.5 fill-current" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[0.5rem] h-2 w-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </div>
          <span>微信</span>
        </div>
        <Link
          href="/contacts"
          className="flex flex-col items-center justify-center h-full w-1/4 text-gray-900 hover:text-[#07c160] transition-colors"
        >
          <Users className="w-7 h-7 mb-0.5" />
          <span>通讯录</span>
        </Link>
        <Link
          href="/discover"
          className="flex flex-col items-center justify-center h-full w-1/4 text-gray-900 hover:text-[#07c160] transition-colors"
        >
          <Compass className="w-7 h-7 mb-0.5" />
          <span>发现</span>
        </Link>
        <Link
          href="/me"
          className="flex flex-col items-center justify-center h-full w-1/4 text-gray-900 hover:text-[#07c160] transition-colors"
        >
          <User className="w-7 h-7 mb-0.5" />
          <span>我</span>
        </Link>
      </div>

      {/* 弹窗 */}
      <CreateCharacterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateManual={handleCreateManual}
        onImportCard={handleImportCard}
      />

      <ManualCreateModal
        isOpen={showManualCreateModal}
        onClose={() => setShowManualCreateModal(false)}
        onConfirm={handleConfirmCreate}
      />
    </div>
  );
}
