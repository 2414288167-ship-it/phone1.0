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
  FileJson,
  PenLine,
} from "lucide-react";
import { SwipeableItem } from "@/components/SwipeableItem";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUnread } from "@/context/UnreadContext";

interface Contact {
  id: string;
  name: string;
  avatar: string;
  remark?: string;
  intro?: string;
  aiName?: string;
  myNickname?: string;
  isPinned?: boolean;
  description?: string;
  worldBookId?: string;
}

// 世界书相关接口定义
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

export default function ChatListPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { unreadCounts, totalUnread } = useUnread();

  // --- 🔥 新增：弹窗状态管理 ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<"menu" | "manual">("menu");

  // --- 🔥 新增：手动创建表单状态 ---
  const [newName, setNewName] = useState("");
  const [newRemark, setNewRemark] = useState("");

  // 文件上传引用
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        // 获取最新一条消息作为简介
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

  // --- 🔥 修改：点击加号，不再直接生成机器人，而是打开弹窗 ---
  const handlePlusClick = () => {
    setCreateStep("menu");
    setNewName("");
    setNewRemark("");
    setShowCreateModal(true);
  };

  // --- 🔥 功能实现：手动创建 ---
  const handleManualCreate = () => {
    if (!newName.trim()) {
      alert("请输入角色名字");
      return;
    }
    const randomId = Date.now().toString();
    const newContact: Contact = {
      id: randomId,
      name: newName,
      avatar: "🤖",
      remark: newRemark || newName,
      intro: "你好",
      aiName: newName,
      myNickname: "我",
      isPinned: false,
    };

    const updated = [newContact, ...contacts];
    setContacts(sortContacts(updated));
    localStorage.setItem("contacts", JSON.stringify(updated));

    setShowCreateModal(false);
    router.push(`/chat/${newContact.id}`);
  };

  // --- 🔥 功能实现：导入文件 (JSON) 并自动提取世界书 ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // 1. 解析基本信息
        const charName = data.name || data.char_name || "未知角色";
        const description = data.description || data.persona || "";
        const firstMes = data.first_mes || data.greeting || "你好";
        const scenario = data.scenario || "";

        // 2. 🔥 核心逻辑：自动提取并导入世界书 🔥
        let importedWorldBookId = ""; // 如果导入成功，记录ID
        const wbData = data.character_book || data.lorebook;

        if (wbData) {
          const rawEntries = wbData.entries || wbData.entries_list || [];
          if (rawEntries.length > 0) {
            // 读取本地现有的世界书数据
            const existingWBStr = localStorage.getItem("worldbook_data");
            let existingWB = existingWBStr
              ? JSON.parse(existingWBStr)
              : { categories: [] };

            // 构造新分组
            const newCategoryId = Date.now();
            const newEntries: WorldBookEntry[] = rawEntries.map(
              (entry: any, idx: number) => ({
                id: newCategoryId + idx + 1,
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

            // 保存
            existingWB.categories.push(newCategory);
            localStorage.setItem("worldbook_data", JSON.stringify(existingWB));

            importedWorldBookId = String(newCategoryId);
            alert(`📖 检测到内置世界书，已自动导入为：《${newCategory.name}》`);
          }
        }

        // 3. 创建联系人
        const newContact: Contact = {
          id: Date.now().toString(),
          name: charName,
          avatar: "🐱", // JSON通常没有直接可用的图片URL，给个默认的
          remark: charName,
          intro: firstMes,
          aiName: charName,
          myNickname: "我",
          isPinned: false,
          description: `${description}\n\n[Scenario]: ${scenario}`,
          worldBookId: importedWorldBookId, // 绑定刚才导入的世界书ID
        };

        // 4. 保存联系人
        const updated = [newContact, ...contacts];
        setContacts(sortContacts(updated));
        localStorage.setItem("contacts", JSON.stringify(updated));

        // 5. 保存第一条消息
        if (firstMes) {
          const initialMsg = [
            {
              id: Date.now().toString(),
              role: "assistant",
              content: firstMes,
              timestamp: new Date(),
              type: "text",
            },
          ];
          localStorage.setItem(
            `chat_${newContact.id}`,
            JSON.stringify(initialMsg)
          );
        }

        setShowCreateModal(false);
        router.push(`/chat/${newContact.id}`);
      } catch (err) {
        console.error("导入失败", err);
        alert("导入失败：请确保文件是标准的 TavernAI/V2 JSON 格式。");
      }
    };
    reader.readAsText(file);
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

  const handleRead = (id: string) => {};

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden relative">
      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

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
          {/* 🔥 这里的点击事件已经改为打开弹窗 */}
          <button onClick={handlePlusClick} className="text-gray-900 p-1">
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

      {/* 🔥🔥🔥 全新的创建/导入弹窗 🔥🔥🔥 */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-[320px] bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {createStep === "menu" ? (
              // 1. 菜单模式
              <>
                <div className="py-4 text-center border-b border-gray-100">
                  <h3 className="text-[17px] font-semibold text-gray-900">
                    创建新聊天
                  </h3>
                </div>

                <div className="flex flex-col">
                  {/* 手动创建按钮 */}
                  <button
                    onClick={() => setCreateStep("manual")}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 text-left"
                  >
                    <PenLine className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-500 font-medium text-[16px]">
                      手动创建角色
                    </span>
                  </button>

                  {/* 导入按钮 */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <FileJson className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="text-blue-500 font-medium text-[16px] block">
                        从角色卡导入 (.json)
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        支持自动导入内置世界书
                      </span>
                    </div>
                  </button>
                </div>

                <div className="h-2 bg-gray-100/50"></div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-3.5 text-center text-gray-600 font-medium text-[16px] hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              // 2. 手动填写模式
              <div className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-gray-900 text-[17px]">
                    填写角色信息
                  </h3>
                  <button
                    onClick={() => setCreateStep("menu")}
                    className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    返回
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block font-medium">
                      角色名字 <span className="text-red-500">*</span>
                    </label>
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:border-[#07c160] focus:bg-white transition-all caret-[#07c160]"
                      placeholder="例如：沈墨"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block font-medium">
                      备注名 (列表显示)
                    </label>
                    <input
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:border-[#07c160] focus:bg-white transition-all caret-[#07c160]"
                      placeholder="例如：猫猫头"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 text-[15px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleManualCreate}
                    className="flex-1 py-2.5 text-[15px] font-medium text-white bg-[#07c160] rounded-lg hover:bg-[#06ad56] shadow-md shadow-green-500/20 active:scale-95 transition-all"
                  >
                    确认创建
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
