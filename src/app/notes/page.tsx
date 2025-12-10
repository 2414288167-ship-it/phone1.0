"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Upload, FileText, Trash2, Save } from "lucide-react";

// --- 1. 定义数据类型 ---
interface BookContent {
  keys: string[];
  comment: string;
  content: string;
  enabled: boolean; // 🔥 关键字段：控制是否启用
}

interface Book {
  id: string;
  name: string;
  content: BookContent[];
  categoryId: number;
}

interface Category {
  name: string;
  id: number;
}

interface WorldBookData {
  type: string;
  version: number;
  timestamp: number;
  books: Book[];
  categories: Category[];
}

export default function NotesPage() {
  // --- 2. 状态管理 ---
  const [data, setData] = useState<WorldBookData | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | "all">("all");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 3. 初始化 ---
  useEffect(() => {
    const savedData = localStorage.getItem("worldbook_data");
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (e) {
        console.error("读取缓存失败", e);
      }
    }
  }, []);

  // --- 4. 核心功能 ---

  const saveDataToLocal = (newData: WorldBookData) => {
    setData(newData);
    localStorage.setItem("worldbook_data", JSON.stringify(newData));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json: WorldBookData = JSON.parse(text);
        if (!json.books || !json.categories) {
          alert("文件格式不正确");
          return;
        }
        saveDataToLocal(json);
        alert("导入成功！");
      } catch (error) {
        alert("JSON 解析失败");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleDeleteItem = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!data) return;
    if (!confirm("确定要删除这个条目吗？")) return;
    const newBooks = data.books.filter((book) => book.id !== bookId);
    saveDataToLocal({ ...data, books: newBooks });
  };

  const handleClearAll = () => {
    if (confirm("⚠️ 确定要清空所有数据吗？")) {
      setData(null);
      localStorage.removeItem("worldbook_data");
    }
  };

  // 🔥 新增：切换启用/禁用状态
  const handleToggleEnable = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation(); // 防止进入详情页
    if (!data) return;

    const newBooks = data.books.map((book) => {
      if (book.id === bookId) {
        // 深拷贝 content 数组
        const newContent = [...book.content];
        if (newContent.length > 0) {
          // 切换第一个 content 的 enabled 状态
          // 如果 enabled 字段不存在，默认为 true，取反就是 false
          const currentState = newContent[0].enabled !== false;
          newContent[0] = { ...newContent[0], enabled: !currentState };
        }
        return { ...book, content: newContent };
      }
      return book;
    });

    saveDataToLocal({ ...data, books: newBooks });
  };

  // 在编辑页切换状态
  const handleToggleEnableInEdit = () => {
    if (!editingBook) return;
    const newContent = [...editingBook.content];
    if (newContent.length > 0) {
      const currentState = newContent[0].enabled !== false;
      newContent[0] = { ...newContent[0], enabled: !currentState };
    }
    setEditingBook({ ...editingBook, content: newContent });
  };

  const handleCardClick = (book: Book) => {
    setEditingBook(JSON.parse(JSON.stringify(book)));
  };

  const handleSaveEdit = () => {
    if (!data || !editingBook) return;
    const newBooks = data.books.map((b) =>
      b.id === editingBook.id ? editingBook : b
    );
    saveDataToLocal({ ...data, books: newBooks });
    setEditingBook(null);
  };

  // --- 5. 视图渲染 ---

  const renderListView = () => {
    const filteredBooks =
      activeTabId === "all"
        ? data?.books || []
        : data?.books.filter((book) => book.categoryId === activeTabId) || [];

    return (
      <>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="p-2 -ml-2 text-blue-500 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">世界书</h1>
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-blue-500 hover:bg-gray-100 rounded-full"
            >
              <Upload size={22} />
            </button>
            {data && (
              <button
                onClick={handleClearAll}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full"
              >
                <Trash2 size={22} />
              </button>
            )}
          </div>
        </header>

        <div className="bg-white sticky top-14 z-10 shadow-sm border-t border-gray-100">
          <div className="flex px-4 overflow-x-auto no-scrollbar gap-6">
            <button
              onClick={() => setActiveTabId("all")}
              className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTabId === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              全部
            </button>
            {data?.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTabId(cat.id)}
                className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTabId === cat.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <main className="p-4 pb-20">
          {!data || data.books.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-400 gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <FileText size={32} />
              </div>
              <p>暂无数据</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition"
              >
                导入 JSON 文件
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredBooks.map((book) => {
                const isEnabled = book.content?.[0]?.enabled !== false;
                return (
                  <div
                    key={book.id}
                    onClick={() => handleCardClick(book)}
                    className={`group relative bg-white p-4 rounded-xl shadow-sm border transition-all active:scale-95 duration-200 cursor-pointer flex flex-col justify-between min-h-[110px] ${
                      isEnabled
                        ? "border-green-100 ring-1 ring-green-500/10"
                        : "border-gray-100 opacity-60"
                    }`}
                  >
                    {/* 顶部：标题 + 开关 */}
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 flex-1">
                        {book.name}
                      </h3>

                      {/* 🔥 列表页开关 */}
                      <div
                        onClick={(e) => handleToggleEnable(e, book.id)}
                        className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          isEnabled ? "bg-[#07c160]" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                            isEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {book.content?.[0]?.content.slice(0, 50) || "暂无内容"}
                    </p>

                    <div className="mt-3 flex justify-between items-end">
                      <span className="text-[10px] text-gray-300">
                        {
                          data.categories.find((c) => c.id === book.categoryId)
                            ?.name
                        }
                      </span>
                      <button
                        onClick={(e) => handleDeleteItem(e, book.id)}
                        className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </>
    );
  };

  const renderDetailView = () => {
    if (!editingBook || !data) return null;

    const currentContent = editingBook.content[0] || {
      content: "",
      comment: "",
      enabled: true,
    };
    const isEnabled = currentContent.enabled !== false;

    return (
      <div className="fixed inset-0 z-50 bg-[#f2f4f8] flex flex-col h-[100dvh]">
        <header className="bg-white px-4 h-14 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
          <button
            onClick={() => setEditingBook(null)}
            className="p-2 -ml-2 text-blue-500 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>

          <h1 className="text-lg font-bold text-gray-900 truncate max-w-[150px]">
            {editingBook.name}
          </h1>

          <div className="flex items-center gap-3">
            {/* 🔥 详情页开关 */}
            <div
              onClick={handleToggleEnableInEdit}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                isEnabled ? "bg-[#07c160]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                  isEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>

            <button
              onClick={handleSaveEdit}
              className="text-blue-600 font-bold px-2 py-1 rounded hover:bg-blue-50"
            >
              保存
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-400 ml-1">
              书名
            </label>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <input
                type="text"
                value={editingBook.name}
                onChange={(e) =>
                  setEditingBook({ ...editingBook, name: e.target.value })
                }
                className="w-full px-4 py-3 outline-none text-gray-800 text-lg rounded-xl"
                placeholder="输入书名"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-400 ml-1">
              分类
            </label>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4">
              <select
                value={editingBook.categoryId}
                onChange={(e) =>
                  setEditingBook({
                    ...editingBook,
                    categoryId: parseInt(e.target.value),
                  })
                }
                className="w-full py-3 outline-none text-gray-800 bg-transparent"
              >
                {data.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 flex-1 flex flex-col min-h-0">
            <label className="text-sm font-medium text-gray-400 ml-1">
              内容 {isEnabled ? "(已启用)" : "(已禁用)"}
            </label>
            <div
              className={`bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[300px] transition-opacity ${
                isEnabled ? "opacity-100" : "opacity-60 bg-gray-50"
              }`}
            >
              <textarea
                value={currentContent.content}
                onChange={(e) => {
                  const newContentArr = [...editingBook.content];
                  if (newContentArr.length > 0) {
                    newContentArr[0] = {
                      ...newContentArr[0],
                      content: e.target.value,
                    };
                  } else {
                    newContentArr.push({
                      content: e.target.value,
                      keys: [editingBook.name],
                      comment: "",
                      enabled: true,
                    });
                  }
                  setEditingBook({ ...editingBook, content: newContentArr });
                }}
                className="w-full h-full p-4 outline-none text-gray-800 text-sm leading-relaxed resize-none font-mono rounded-xl bg-transparent overflow-y-auto"
                placeholder="输入内容..."
              />
            </div>
          </div>
          <div className="h-4 shrink-0"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f2f4f8] text-gray-800">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />
      {editingBook ? renderDetailView() : renderListView()}
    </div>
  );
}
