"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Upload,
  FileText,
  Trash2,
  Save,
  FolderOpen,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation"; // ✅ 引入 useSearchParams

// --- 1. 定义数据类型 ---
interface BookContent {
  keys: string[];
  comment: string;
  content: string;
  enabled: boolean;
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
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ 获取 URL 参数

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
        const parsed = JSON.parse(savedData);
        if (!parsed.books) parsed.books = [];
        if (!parsed.categories) parsed.categories = [];
        setData(parsed);

        // 🔥🔥🔥 核心修改：处理跳转逻辑 🔥🔥🔥
        const targetCatId = searchParams.get("catId");
        const targetBookId = searchParams.get("bookId");

        if (targetCatId) {
          // 1. 选中对应的分类 Tab
          setActiveTabId(Number(targetCatId));

          // 2. 如果指定了具体的书/条目 ID，自动打开编辑/详情窗口
          if (targetBookId && parsed.books) {
            const targetBook = parsed.books.find(
              (b: Book) => b.id === targetBookId
            );
            if (targetBook) {
              setEditingBook(targetBook);
            }
          }
        } else if (parsed.categories.length > 0) {
          // 无参数时默认行为
          setActiveTabId(parsed.categories[0].id);
        }
      } catch (e) {
        console.error("读取缓存失败", e);
      }
    }
  }, [searchParams]); // 依赖 searchParams 变化

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

        const finalData = {
          type: "worldbook",
          version: 1,
          timestamp: Date.now(),
          books: json.books || [],
          categories: json.categories || [],
        };

        saveDataToLocal(finalData);
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

  // 🔥🔥🔥 核心修改：智能删除按钮逻辑 🔥🔥🔥
  const handleSmartDelete = () => {
    if (!data) return;

    if (activeTabId === "all") {
      // 模式 1: 清空所有
      if (
        confirm(
          "⚠️ 高能预警：确定要清空【所有】世界书数据吗？\n此操作不可恢复！"
        )
      ) {
        setData(null);
        localStorage.removeItem("worldbook_data");
      }
    } else {
      // 模式 2: 删除当前分类
      const targetCategory = data.categories.find((c) => c.id === activeTabId);
      if (!targetCategory) return;

      if (
        confirm(
          `🗑️ 确定要删除整本《${targetCategory.name}》吗？\n\n该分类下的所有设定也将被删除。`
        )
      ) {
        // 1. 过滤掉该分类下的书
        const newBooks = data.books.filter((b) => b.categoryId !== activeTabId);
        // 2. 过滤掉该分类
        const newCategories = data.categories.filter(
          (c) => c.id !== activeTabId
        );

        saveDataToLocal({
          ...data,
          books: newBooks,
          categories: newCategories,
        });
        setActiveTabId("all"); // 删完后回到“全部”
      }
    }
  };

  const handleToggleEnable = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!data) return;

    const newBooks = data.books.map((book) => {
      if (book.id === bookId) {
        const newContent = [...book.content];
        if (newContent.length > 0) {
          const currentState = newContent[0].enabled !== false;
          newContent[0] = { ...newContent[0], enabled: !currentState };
        }
        return { ...book, content: newContent };
      }
      return book;
    });

    saveDataToLocal({ ...data, books: newBooks });
  };

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

    // 获取当前显示的标题（用于Header）
    const currentTitle =
      activeTabId === "all"
        ? "世界书"
        : data?.categories.find((c) => c.id === activeTabId)?.name || "世界书";

    return (
      <>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-sm px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>

          <h1 className="text-lg font-bold text-gray-900 truncate max-w-[200px]">
            {currentTitle}
          </h1>

          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-blue-500 hover:bg-gray-100 rounded-full"
              title="导入文件"
            >
              <Upload size={22} />
            </button>

            {/* 🔥🔥🔥 智能删除按钮：根据当前Tab决定是删全部还是删分类 🔥🔥🔥 */}
            {data && (
              <button
                onClick={handleSmartDelete}
                className={`p-2 rounded-full transition-colors ${
                  activeTabId === "all"
                    ? "text-gray-400 hover:text-red-500 hover:bg-red-50" // 全部模式下灰色，防误触
                    : "text-red-500 hover:bg-red-50" // 分类模式下红色，显眼
                }`}
                title={
                  activeTabId === "all" ? "清空所有数据" : "删除当前世界书"
                }
              >
                <Trash2 size={22} />
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white sticky top-14 z-10 shadow-sm border-t border-gray-100">
          <div className="flex px-4 overflow-x-auto no-scrollbar gap-6 h-12 items-center">
            <button
              onClick={() => setActiveTabId("all")}
              className={`h-full text-sm font-medium whitespace-nowrap border-b-2 transition-colors px-2 ${
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
                className={`h-full text-sm font-medium whitespace-nowrap border-b-2 transition-colors px-2 ${
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
          {!data ||
          (data.books.length === 0 && data.categories.length === 0) ? (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-400 gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <FileText size={32} />
              </div>
              <p>暂无世界书数据</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition"
              >
                导入 JSON 文件
              </button>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-400 gap-2">
              <FolderOpen size={48} className="text-gray-200" />
              <p className="text-sm">该分类下暂无设定</p>
              <p className="text-xs text-gray-300">请尝试重新导入或检查文件</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredBooks.map((book) => {
                const isEnabled = book.content?.[0]?.enabled !== false;
                // 获取第一条内容的 keys 作为显示
                const keys = book.content?.[0]?.keys?.join(", ") || book.name;
                const contentText = book.content?.[0]?.content || "暂无内容";

                return (
                  <div
                    key={book.id}
                    onClick={() => handleCardClick(book)}
                    className={`group relative bg-white p-4 rounded-xl shadow-sm border transition-all active:scale-95 duration-200 cursor-pointer flex flex-col justify-between min-h-[120px] ${
                      isEnabled
                        ? "border-green-100 ring-1 ring-green-500/10"
                        : "border-gray-100 opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 flex-1 text-sm leading-tight">
                        {keys}
                      </h3>

                      {/* 列表页开关 */}
                      <div
                        onClick={(e) => handleToggleEnable(e, book.id)}
                        className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          isEnabled ? "bg-[#07c160]" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                            isEnabled ? "translate-x-3.5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-3 mt-2 leading-relaxed">
                      {contentText}
                    </p>

                    <div className="mt-3 flex justify-between items-end">
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                        {data.categories.find((c) => c.id === book.categoryId)
                          ?.name || "未分类"}
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
      keys: [],
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
            编辑条目
          </h1>

          <div className="flex items-center gap-3">
            {/* 详情页开关 */}
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
              className="text-blue-600 font-bold px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm"
            >
              保存
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">
              触发关键词 (Keys)
            </label>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <input
                type="text"
                value={
                  currentContent.keys
                    ? currentContent.keys.join(", ")
                    : editingBook.name
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const newKeys = val
                    .split(/[,，]/)
                    .map((k) => k.trim())
                    .filter((k) => k);

                  const newContentArr = [...editingBook.content];
                  if (newContentArr.length > 0) {
                    newContentArr[0] = { ...newContentArr[0], keys: newKeys };
                  } else {
                    newContentArr.push({
                      content: "",
                      comment: "",
                      enabled: true,
                      keys: newKeys,
                    });
                  }
                  setEditingBook({
                    ...editingBook,
                    name: val,
                    content: newContentArr,
                  });
                }}
                className="w-full px-4 py-3 outline-none text-gray-800 text-base rounded-xl"
                placeholder="例如：学校, 教室"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">
              分类 (Category)
            </label>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 relative">
              <select
                value={editingBook.categoryId}
                onChange={(e) =>
                  setEditingBook({
                    ...editingBook,
                    categoryId: parseInt(e.target.value),
                  })
                }
                className="w-full py-3 outline-none text-gray-800 bg-transparent appearance-none"
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
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">
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
                placeholder="输入世界书条目内容..."
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
