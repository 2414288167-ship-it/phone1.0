"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation"; // ✅ 新增路由
import {
  ArrowLeft,
  Search,
  Plus,
  ChevronLeft,
  MoreVertical,
  X,
  User, // ✅ 新增图标
  Upload, // ✅ 新增图标
} from "lucide-react";
// 引入未读消息 Hook
import { useUnread } from "@/context/UnreadContext";

// --- 扩展接口定义 ---
interface Contact {
  id: string;
  name: string;
  subtitle?: string;
  avatar?: string;
  remark?: string;
  aiName?: string;
  myNickname?: string;
  // ✅ 为了支持导入功能，扩展了这些字段
  firstMessage?: string;
  aiPersona?: string;
  worldBook?: string;
  group?: string;
  userPersonaId?: string;
}

interface ContactEditData {
  remark: string;
  aiName: string;
  myNickname: string;
  aiAvatar: string;
  myAvatar: string;
}

interface ChatSettings {
  allowNewHeartbeat: boolean;
  independentBackstageActivity: boolean;
  independentActionCooldown: number;
  shortTermMemoryTokens: number;
  longTermMemoryTokens: number;
  autoSummarizeLongMemory: boolean;
  autoSummarizationInterval: number;
  otherMemoryMounting: boolean;
  currentConversationTokens: number;
  estimateContextTokens: number;
  enableRealTimeWeather: boolean;
  enableTTSSynthesis: boolean;
  voiceId: string;
  voiceLanguage: string;
  enableMusicComposition: boolean;
  enablePrivateMode: boolean;
  enableTodoSync: boolean;
}

// ✅ 新增：世界书导入用的接口
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

const sampleContacts: Contact[] = [
  {
    id: "1",
    name: "哼呀鬼",
    subtitle: "[在办公室，刚结束一个案情...]",
    avatar: "🐱",
    remark: "哼呀鬼",
    aiName: "沈墨",
    myNickname: "我",
  },
];

const defaultChatSettings: ChatSettings = {
  allowNewHeartbeat: false,
  independentBackstageActivity: true,
  independentActionCooldown: 10,
  shortTermMemoryTokens: 30,
  longTermMemoryTokens: 10,
  autoSummarizeLongMemory: false,
  autoSummarizationInterval: 20,
  otherMemoryMounting: false,
  currentConversationTokens: 2910,
  estimateContextTokens: 8880,
  enableRealTimeWeather: false,
  enableTTSSynthesis: false,
  voiceId: "minimax voice_id",
  voiceLanguage: "自动识别 (Auto)",
  enableMusicComposition: false,
  enablePrivateMode: false,
  enableTodoSync: false,
};

export const ContactsList: React.FC = () => {
  const router = useRouter(); // ✅ 初始化路由
  const { unreadCounts } = useUnread();

  const [showCreate, setShowCreate] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // --- ✅ 新增：弹窗逻辑状态 ---
  const [createStep, setCreateStep] = useState<"menu" | "manual_input">("menu");
  const [newAiName, setNewAiName] = useState("");
  const [newRemark, setNewRemark] = useState("");

  const [editData, setEditData] = useState<ContactEditData>({
    remark: "",
    aiName: "",
    myNickname: "",
    aiAvatar: "🐱",
    myAvatar: "🤖",
  });
  const [chatSettings, setChatSettings] =
    useState<ChatSettings>(defaultChatSettings);

  const [showAvatarPicker, setShowAvatarPicker] = useState<"ai" | "my" | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null); // ✅ 导入文件 Input

  // 初始化加载
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contacts");
      if (saved) {
        try {
          setContacts(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      } else {
        setContacts(sampleContacts);
      }
    }
  }, []);

  // 监听消息更新
  useEffect(() => {
    const handleChatUpdate = () => {
      setRefreshKey((prev) => prev + 1);
      const saved = localStorage.getItem("contacts");
      if (saved) setContacts(JSON.parse(saved));
    };
    window.addEventListener("chat_updated", handleChatUpdate);
    return () => window.removeEventListener("chat_updated", handleChatUpdate);
  }, []);

  const handleSettingChange = (key: keyof ChatSettings, value: any) => {
    setChatSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleEditClick = () => {
    if (selectedContact) {
      setEditData({
        remark: selectedContact.remark || selectedContact.name,
        aiName: selectedContact.aiName || "沈墨",
        myNickname: selectedContact.myNickname || "我",
        aiAvatar: selectedContact.avatar || "🐱",
        myAvatar: "🤖",
      });
      setIsEditing(true);
    }
  };

  const getMessagePreview = (contactId: string): string => {
    if (typeof window === "undefined") return "";
    try {
      const messagesStr = localStorage.getItem(`chat_${contactId}`);
      if (messagesStr) {
        const messages = JSON.parse(messagesStr);
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          let content = lastMessage.content;
          if (content.length > 30) content = content.substring(0, 30) + "...";
          return content;
        }
      }
    } catch (e) {
      console.error("Failed to get message preview:", e);
    }
    return "";
  };

  const handleSaveEdit = () => {
    if (selectedContact) {
      const updatedContact: Contact = {
        ...selectedContact,
        remark: editData.remark,
        aiName: editData.aiName,
        myNickname: editData.myNickname,
        avatar: editData.aiAvatar.startsWith("data:")
          ? editData.aiAvatar
          : editData.aiAvatar,
        name: editData.remark,
      };

      setContacts((prevContacts) =>
        prevContacts.map((c) =>
          c.id === selectedContact.id ? updatedContact : c
        )
      );
      setSelectedContact(updatedContact);

      const contactsData = contacts.map((c) =>
        c.id === selectedContact.id ? updatedContact : c
      );
      localStorage.setItem("contacts", JSON.stringify(contactsData));

      setIsEditing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (showAvatarPicker === "ai") {
          setEditData({ ...editData, aiAvatar: base64 });
        } else if (showAvatarPicker === "my") {
          setEditData({ ...editData, myAvatar: base64 });
        }
        setShowAvatarPicker(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- ✅ 核心功能：点击加号的处理 ---
  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🟢 点击了加号，打开新弹窗");
    setCreateStep("menu");
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateStep("menu");
    setNewAiName("");
    setNewRemark("");
  };

  // --- ✅ 核心功能：确认创建 ---
  const handleConfirmCreate = () => {
    if (!newAiName.trim()) {
      alert("请输入角色名字");
      return;
    }
    const finalRemark = newRemark.trim() || newAiName;

    const newContact: Contact = {
      id: Date.now().toString(),
      name: newAiName,
      remark: finalRemark,
      aiName: newAiName,
      avatar: "🐱",
      subtitle: "新创建的角色",
      myNickname: "我",
      group: "未分组",
      userPersonaId: "default",
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    localStorage.setItem("contacts", JSON.stringify(updatedContacts));

    closeCreateModal();
    router.push(`/chat/${newContact.id}`);
  };

  // --- ✅ 核心功能：导入角色卡 (.json) ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        const charName = data.name || data.char_name || "未知角色";
        const charPersona = data.description || data.persona || "";
        const firstMes = data.first_mes || data.greeting || "";
        const scenario = data.scenario || "";
        const charAvatar = "🐱";

        // 自动提取并导入世界书
        let importedWorldBookId = "";
        const worldBookData = data.character_book || data.lorebook;

        if (
          worldBookData &&
          (worldBookData.entries || worldBookData.entries_list)
        ) {
          const existingWBStr = localStorage.getItem("worldbook_data");
          let existingWB = existingWBStr
            ? JSON.parse(existingWBStr)
            : { categories: [] };

          const newCategoryId = Date.now();
          const entriesRaw =
            worldBookData.entries || worldBookData.entries_list || [];

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
            name: `${charName}的世界书`,
            entries: newEntries,
          };

          existingWB.categories.push(newCategory);
          localStorage.setItem("worldbook_data", JSON.stringify(existingWB));

          importedWorldBookId = String(newCategoryId);
          alert(`✅ 检测到世界书，已自动导入：${newCategory.name}`);
        }

        const newContact: Contact = {
          id: Date.now().toString(),
          name: charName,
          remark: charName,
          aiName: charName,
          avatar: charAvatar,
          subtitle: firstMes.slice(0, 20) + "...",
          firstMessage: firstMes,
          aiPersona: `${charPersona}\n\n[Scenario]: ${scenario}`,
          worldBook: importedWorldBookId || "default",
          myNickname: "我",
          group: "未分组",
          userPersonaId: "default",
        };

        const updatedContacts = [...contacts, newContact];
        setContacts(updatedContacts);
        localStorage.setItem("contacts", JSON.stringify(updatedContacts));

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

        closeCreateModal();
        router.push(`/chat/${newContact.id}`);
      } catch (err) {
        console.error(err);
        alert("导入失败：请确保文件是标准的 JSON 角色卡格式。");
      }
    };
    reader.readAsText(file);
  };

  const openFilePicker = (type: "ai" | "my") => {
    setShowAvatarPicker(type);
    fileInputRef.current?.click();
  };

  const aiPresetAvatars = [
    "🐱",
    "🤖",
    "👨‍🎓",
    "👩‍🎨",
    "🧙",
    "🧚",
    "🧜",
    "🦸",
    "🧙‍♀️",
    "👽",
    "🤡",
    "🎭",
    "💀",
    "👻",
    "🎃",
  ];
  const myPresetAvatars = [
    "🤖",
    "👨",
    "👩",
    "👨‍💼",
    "👩‍💼",
    "👨‍🎓",
    "👩‍🎓",
    "🧑",
    "👨‍🎨",
    "👩‍🎨",
    "🧔",
    "👴",
    "👵",
    "🧓",
    "🤷",
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      {/* ✅ 新增：导入 input */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 text-blue-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-medium">消息 ({contacts.length})</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-sky-500">
            <Search className="w-5 h-5" />
          </button>
          {/* 🔥 关键修改：绑定 handlePlusClick */}
          <button
            className="p-2 text-sky-500"
            onClick={handlePlusClick}
            aria-label="create new"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      {!selectedContact ? (
        <>
          {/* Contacts list */}
          <main className="px-4 pt-2 pb-28">
            <ul className="divide-y">
              {contacts.map((c) => {
                const preview = getMessagePreview(c.id);
                const unreadCount = unreadCounts[String(c.id)] || 0;

                return (
                  <li
                    key={c.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <Link
                      href={`/chat/${c.id}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-100">
                          {c.avatar && c.avatar.startsWith("data:") ? (
                            <Image
                              src={c.avatar}
                              alt={c.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-2xl">{c.avatar || "🐱"}</div>
                          )}
                        </div>
                        {/* 🔴 红点保留 */}
                        {unreadCount > 0 && (
                          <div className="absolute -top-1.5 -right-1.5 z-50 min-w-[1.2rem] h-[1.2rem] bg-red-500 text-white text-[10px] font-bold px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 ml-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-base font-medium text-gray-900 truncate">
                            {c.remark || c.name}
                          </h3>
                          <span className="text-xs text-gray-400"></span>
                        </div>
                        <div
                          className={`text-sm truncate ${
                            unreadCount > 0
                              ? "text-gray-800 font-medium"
                              : "text-gray-400"
                          }`}
                        >
                          {preview || c.subtitle || "点击开始聊天"}
                        </div>
                      </div>
                    </Link>
                    <button
                      className="p-2 text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectedContact(c)}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </main>
        </>
      ) : (
        <>
          {/* Chat Info Panel (包含完整设置) */}
          <main className="pb-28 overflow-y-auto">
            {/* ... Info Header ... */}
            <header className="sticky top-0 z-50 bg-white border-b flex items-center justify-between px-4 h-14">
              <button
                className="p-2 text-blue-500 flex items-center gap-1"
                onClick={() => {
                  setSelectedContact(null);
                  setIsEditing(false);
                }}
              >
                <ChevronLeft className="w-5 h-5" />
                <span>返回</span>
              </button>
              <h1 className="text-lg font-bold flex-1 text-center">
                {isEditing ? "编辑信息" : "聊天详情"}
              </h1>
              {isEditing ? (
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium active:scale-95 transition"
                >
                  保存
                </button>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium active:scale-95 transition"
                >
                  编辑
                </button>
              )}
            </header>

            <section className="p-4 space-y-4">
              {/* ... Basic Info ... */}
              {isEditing ? (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b">
                    <label className="block text-sm font-medium mb-2">
                      备注名 / 群名
                    </label>
                    <input
                      type="text"
                      value={editData.remark}
                      onChange={(e) =>
                        setEditData({ ...editData, remark: e.target.value })
                      }
                      className="w-full bg-gray-50 border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="p-4 border-b">
                    <label className="block text-sm font-medium mb-2">
                      对方本名 (AI识别用)
                    </label>
                    <input
                      type="text"
                      value={editData.aiName}
                      onChange={(e) =>
                        setEditData({ ...editData, aiName: e.target.value })
                      }
                      className="w-full bg-gray-50 border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="p-4 border-b">
                    <label className="block text-sm font-medium mb-2">
                      我的昵称
                    </label>
                    <input
                      type="text"
                      value={editData.myNickname}
                      onChange={(e) =>
                        setEditData({ ...editData, myNickname: e.target.value })
                      }
                      className="w-full bg-gray-50 border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="p-4 border-b">
                    <label className="block text-sm font-medium mb-2">
                      对方头像
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg border flex items-center justify-center text-lg">
                        {editData.aiAvatar.startsWith("data:") ? (
                          <Image
                            src={editData.aiAvatar}
                            alt="AI"
                            width={48}
                            height={48}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          editData.aiAvatar
                        )}
                      </div>
                      <button
                        onClick={() => openFilePicker("ai")}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                      >
                        图库
                      </button>
                      <button
                        onClick={() => setShowAvatarPicker("ai")}
                        className="bg-gray-100 px-3 py-1 rounded text-sm hover:bg-gray-200 transition"
                      >
                        预设
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <label className="block text-sm font-medium mb-2">
                      我的头像
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg border flex items-center justify-center text-lg">
                        {editData.myAvatar.startsWith("data:") ? (
                          <Image
                            src={editData.myAvatar}
                            alt="My"
                            width={48}
                            height={48}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          editData.myAvatar
                        )}
                      </div>
                      <button
                        onClick={() => openFilePicker("my")}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                      >
                        图库
                      </button>
                      <button
                        onClick={() => setShowAvatarPicker("my")}
                        className="bg-gray-100 px-3 py-1 rounded text-sm hover:bg-gray-200 transition"
                      >
                        预设
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 flex items-center justify-between border-b">
                    <div>备注名 / 群名</div>
                    <div className="text-gray-500 text-sm">
                      {editData.remark}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between border-b">
                    <div>对方本名 (AI识别用)</div>
                    <div className="text-gray-500 text-sm">
                      {editData.aiName}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between border-b">
                    <div>我的昵称</div>
                    <div className="text-gray-500 text-sm">
                      {editData.myNickname}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2">对方头像</div>
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-12 bg-gray-200 rounded border flex items-center justify-center text-xs">
                        {editData.aiAvatar}
                      </div>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        更换
                      </button>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        图库
                      </button>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        挂件
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2">我的头像</div>
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-12 bg-gray-200 rounded border flex items-center justify-center text-xs">
                        {editData.myAvatar}
                      </div>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        更换
                      </button>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        图库
                      </button>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        挂件
                      </button>
                      <button className="bg-gray-100 px-3 py-1 rounded text-sm">
                        预设
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2">好友分组</div>
                    <select className="w-full bg-gray-50 border rounded px-3 py-2 text-sm">
                      <option>未分组</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Chat Settings Section (你强调不能少的设置部分，我全部复制回来了) */}
              {!isEditing && (
                <div>
                  <div className="text-xs text-gray-500 px-2 mb-2">
                    人聊天设置
                  </div>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>注入最新心声</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "allowNewHeartbeat",
                              !chatSettings.allowNewHeartbeat
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.allowNewHeartbeat
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.allowNewHeartbeat
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        回复前注入上一轮的内容独白
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>启用独立后台活动</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "independentBackstageActivity",
                              !chatSettings.independentBackstageActivity
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.independentBackstageActivity
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.independentBackstageActivity
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        允许角色在后台主动发消息
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>独立行动冷却 (分钟)</div>
                      <input
                        type="number"
                        value={chatSettings.independentActionCooldown}
                        onChange={(e) =>
                          handleSettingChange(
                            "independentActionCooldown",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-16 bg-gray-50 border rounded px-2 py-1 text-right"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>短期记忆条数</div>
                      <input
                        type="number"
                        value={chatSettings.shortTermMemoryTokens}
                        onChange={(e) =>
                          handleSettingChange(
                            "shortTermMemoryTokens",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-16 bg-gray-50 border rounded px-2 py-1 text-right"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>挂载记忆条数</div>
                      <input
                        type="number"
                        value={chatSettings.longTermMemoryTokens}
                        onChange={(e) =>
                          handleSettingChange(
                            "longTermMemoryTokens",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-16 bg-gray-50 border rounded px-2 py-1 text-right"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>自动总结长期记忆</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "autoSummarizeLongMemory",
                              !chatSettings.autoSummarizeLongMemory
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.autoSummarizeLongMemory
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.autoSummarizeLongMemory
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        对话达到一定长度自动提炼
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>自动总结间隔 (条)</div>
                      <input
                        type="number"
                        value={chatSettings.autoSummarizationInterval}
                        onChange={(e) =>
                          handleSettingChange(
                            "autoSummarizationInterval",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-16 bg-gray-50 border rounded px-2 py-1 text-right"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>挂载其他聊天记忆</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "otherMemoryMounting",
                              !chatSettings.otherMemoryMounting
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.otherMemoryMounting
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.otherMemoryMounting
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>当前对话条数</div>
                      <div className="text-gray-500 text-sm">
                        {chatSettings.currentConversationTokens} 条
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>预估上下文 Token</div>
                      <div className="text-gray-500 text-sm">
                        {chatSettings.estimateContextTokens} Tokens
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>启用实时天气同步</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "enableRealTimeWeather",
                              !chatSettings.enableRealTimeWeather
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.enableRealTimeWeather
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.enableRealTimeWeather
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>启用语音合成 (TTS)</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "enableTTSSynthesis",
                              !chatSettings.enableTTSSynthesis
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.enableTTSSynthesis
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.enableTTSSynthesis
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>语音 ID</div>
                      <div className="text-gray-500 text-sm">
                        {chatSettings.voiceId}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2">语音语言/方言</div>
                      <select
                        value={chatSettings.voiceLanguage}
                        onChange={(e) =>
                          handleSettingChange("voiceLanguage", e.target.value)
                        }
                        className="w-full bg-gray-50 border rounded px-3 py-2 text-sm"
                      >
                        <option>自动识别 (Auto)</option>
                        <option>中文</option>
                        <option>英文</option>
                      </select>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>启用乐谱合成</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "enableMusicComposition",
                              !chatSettings.enableMusicComposition
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.enableMusicComposition
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.enableMusicComposition
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        允许角色发送乐谱并自动演奏
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>启用旁白模式</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "enablePrivateMode",
                              !chatSettings.enablePrivateMode
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.enablePrivateMode
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.enablePrivateMode
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        AI每轮回复都会附带环境或心理描写(灰色系统字)
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>启用待办事项同步</div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "enableTodoSync",
                              !chatSettings.enableTodoSync
                            )
                          }
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            chatSettings.enableTodoSync
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-0.5 transition-transform ${
                              chatSettings.enableTodoSync
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        并启后，AI将读取【今日】及【未完成】的待办事项。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>
        </>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-14 flex items-center justify-around">
        <button className="flex flex-col items-center text-sky-600 text-sm">
          消息
        </button>
        <button className="flex flex-col items-center text-gray-500 text-sm">
          动态
        </button>
        <button className="flex flex-col items-center text-gray-500 text-sm">
          回忆
        </button>
        <button className="flex flex-col items-center text-gray-500 text-sm">
          收藏
        </button>
        <button className="flex flex-col items-center text-gray-500 text-sm">
          NPC
        </button>
      </nav>

      {/* 🔥🔥🔥🔥 新版创建弹窗 (z-index 9999 + 阻止冒泡) 🔥🔥🔥🔥 */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeCreateModal}
        >
          <div
            className="relative w-[85%] max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {createStep === "menu" && (
              <>
                <div className="p-4 text-center border-b border-gray-100 font-medium">
                  创建新聊天
                </div>
                <button
                  onClick={() => setCreateStep("manual_input")}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      手动创建角色
                    </div>
                    <div className="text-xs text-gray-500">
                      自定义名字和头像
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      从角色卡导入
                    </div>
                    <div className="text-xs text-gray-500">支持 .json 格式</div>
                  </div>
                </button>
                <div className="p-2 bg-gray-50">
                  <button
                    onClick={closeCreateModal}
                    className="w-full py-3 bg-white text-gray-600 rounded-lg shadow-sm font-medium hover:bg-gray-100"
                  >
                    取消
                  </button>
                </div>
              </>
            )}

            {createStep === "manual_input" && (
              <div className="flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-medium">填写信息</span>
                  <button
                    onClick={() => setCreateStep("menu")}
                    className="text-sm text-gray-500"
                  >
                    返回
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      角色名字 <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={newAiName}
                      onChange={(e) => setNewAiName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white transition-colors outline-none focus:border-blue-500"
                      placeholder="例如：沈墨"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      备注名
                    </label>
                    <input
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white transition-colors outline-none focus:border-blue-500"
                      placeholder="例如：哼呀鬼"
                    />
                  </div>
                </div>
                <div className="p-4 flex gap-3 bg-gray-50">
                  <button
                    onClick={closeCreateModal}
                    className="flex-1 py-2 bg-white border rounded-lg text-gray-600 font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmCreate}
                    className="flex-1 py-2 bg-[#07c160] text-white rounded-lg shadow-md font-medium"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Avatar Preset Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAvatarPicker(null)}
          />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {showAvatarPicker === "ai" ? "选择对方头像" : "选择我的头像"}
              </h3>
              <button
                onClick={() => setShowAvatarPicker(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3 p-4">
              {(showAvatarPicker === "ai"
                ? aiPresetAvatars
                : myPresetAvatars
              ).map((avatar, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (showAvatarPicker === "ai") {
                      setEditData({ ...editData, aiAvatar: avatar });
                    } else if (showAvatarPicker === "my") {
                      setEditData({ ...editData, myAvatar: avatar });
                    }
                    setShowAvatarPicker(null);
                  }}
                  className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl hover:bg-gray-200 transition hover:scale-110 cursor-pointer"
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsList;
