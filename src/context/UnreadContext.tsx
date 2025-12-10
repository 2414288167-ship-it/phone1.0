"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";

// 提示音 Base64
const SHORT_DING =
  "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgRYWFgAAAALAAADYW1pbm9yX3ZlcnNpb24AMABUWFhYAAAAEAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQy//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAZAAABxwADBQoMDxETFhcZGx4hIyUnKSwuMTM2ODs9P0JERkdJS0xOUVJTVldeYWNjZmhpbG5xc3Z4ent9foCDhIWIio2OkJOVl5mbnp+goqOmqKqsrrCztLm7vb/CxMbHycvMz9HT1dfZ3N3f4OLj5efp7O3v8PHy9Pf5+/0AAAAATGF2YzU4LjkxLjEwMAAAAAAAAAAAAAAA//uQZAAP8AAAaQAAAADgAAA0gAAAAABAAABpAAAABAAAADSAAAAENuCngAAAAAAABMAJBNwF/wAAAAAAD/8zM/jQngAAAAA//7kGQAD/AAAGkAAAAEAAAANIAAAAAAQAAAaQAAAAQAAAA0gAAABAAAAEAAAAAAABAAAAAAAAAAAAAAH/4AAQSkZGROhEUkL/8zM/jQngAAAAA//7kGQAD/AAAGkAAAAEAAAANIAAAAAAQAAAaQAAAAQAAAA0gAAABAAAAEAAAAAAABAAAAAAAAAAAAAAH/4AAQSkZGROhEUkL/8zM/jQngAAAAA//7kGQAD/AAAGkAAAAEAAAANIAAAAAAQAAAaQAAAAQAAAA0gAAABAAAAEAAAAAAABAAAAAAAAAAAAAAH/4AAQSkZGROhEUkL/8zM/jQngAAAAA//7kGQAD/AAAGkAAAAEAAAANIAAAAAAQAAAaQAAAAQAAAA0gAAABAAAAEAAAAAAABAAAAAAAAAAAAAAH/4AAQSkZGROhEUkL/8zM/jQngAAAAA";

const DEFAULT_RINGTONE: Ringtone = {
  id: "default",
  name: "默认提示音 (叮)",
  url: SHORT_DING,
};

interface Ringtone {
  id: string;
  name: string;
  url: string;
}

interface UnreadContextType {
  unreadCounts: { [key: string]: number };
  totalUnread: number;
  incrementUnread: (id: string, content: string, count?: number) => void;
  clearUnread: (id: string) => void;

  ringtones: Ringtone[];
  currentRingtoneId: string;
  addRingtone: (name: string, file: File) => Promise<void>;
  selectRingtone: (id: string) => void;
  deleteRingtone: (id: string) => void;
  playCurrentRingtone: () => void;
}

const UnreadContext = createContext<UnreadContextType | null>(null);

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>(
    {}
  );

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // 铃声状态
  const [ringtones, setRingtones] = useState<Ringtone[]>([DEFAULT_RINGTONE]);
  const [currentRingtoneId, setCurrentRingtoneId] = useState<string>("default");

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // --- 初始化加载 ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. 加载未读数
      const savedCounts = localStorage.getItem("unread_counts");
      if (savedCounts) {
        try {
          setUnreadCounts(JSON.parse(savedCounts));
        } catch (e) {}
      }

      // 2. 加载自定义铃声
      const savedRingtones = localStorage.getItem("custom_ringtones");
      if (savedRingtones) {
        try {
          const parsed = JSON.parse(savedRingtones);
          // 确保默认铃声在第一个
          const customOnly = parsed.filter((r: any) => r.id !== "default");
          setRingtones([DEFAULT_RINGTONE, ...customOnly]);
        } catch (e) {
          console.error("加载铃声失败", e);
        }
      }

      // 3. 加载当前选中的 ID
      const savedCurrentId = localStorage.getItem("current_ringtone_id");
      if (savedCurrentId) {
        // 这里直接设置 State，不触发保存操作
        setCurrentRingtoneId(savedCurrentId);
      }

      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []); // 空依赖数组，确保只在挂载时执行一次

  // 自动保存未读数 (这个没问题，保留)
  useEffect(() => {
    localStorage.setItem("unread_counts", JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  // 🔥🔥🔥 核心修改：删除了自动保存 currentRingtoneId 的 useEffect 🔥🔥🔥
  // 防止页面加载时因为初始值是 "default" 而覆盖了本地存储

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const addRingtone = async (name: string, file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const newRingtone = {
          id: Date.now().toString(),
          name,
          url: base64,
        };

        setRingtones((prev) => {
          const updated = [...prev, newRingtone];
          const customOnly = updated.filter((r) => r.id !== "default");
          localStorage.setItem("custom_ringtones", JSON.stringify(customOnly));
          return updated;
        });

        // 添加后自动选中并保存
        selectRingtone(newRingtone.id);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 🔥🔥🔥 修改：在选择时手动保存 🔥🔥🔥
  const selectRingtone = (id: string) => {
    setCurrentRingtoneId(id);
    localStorage.setItem("current_ringtone_id", id);
  };

  // 🔥🔥🔥 修改：删除时如果涉及到当前选中，也要手动更新存储 🔥🔥🔥
  const deleteRingtone = (id: string) => {
    if (id === "default") return;

    setRingtones((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      const customOnly = updated.filter((r) => r.id !== "default");
      localStorage.setItem("custom_ringtones", JSON.stringify(customOnly));
      return updated;
    });

    if (currentRingtoneId === id) {
      setCurrentRingtoneId("default");
      localStorage.setItem("current_ringtone_id", "default");
    }
  };

  const playCurrentRingtone = () => {
    try {
      const ringtone =
        ringtones.find((r) => r.id === currentRingtoneId) || DEFAULT_RINGTONE;
      if (ringtone && ringtone.url) {
        const audio = new Audio(ringtone.url);
        audio.volume = 0.8;
        audio.play().catch((e) => console.error("播放失败", e));
      }
    } catch (e) {}
  };

  const incrementUnread = (id: string, content: string, count: number = 1) => {
    const chatId = String(id);
    const currentPath = pathnameRef.current;

    if (currentPath === `/chat/${chatId}`) {
      console.log(`[Unread] 正处于聊天窗口 ${chatId}，不显示红点`);
      return;
    }

    setUnreadCounts((prev) => {
      const newCount = (prev[chatId] || 0) + count;
      return { ...prev, [chatId]: newCount };
    });

    try {
      const contactsStr = localStorage.getItem("contacts");
      if (contactsStr) {
        const contacts = JSON.parse(contactsStr);
        const contact = contacts.find((c: any) => String(c.id) === chatId);
        const isAlertOn = contact ? contact.alertEnabled !== false : true;
        if (isAlertOn) {
          playCurrentRingtone();
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("新消息", { body: content, tag: chatId, silent: true });
    }
  };

  const clearUnread = (id: string) => {
    const chatId = String(id);
    setUnreadCounts((prev) => {
      if (!prev[chatId]) return prev;
      const newCounts = { ...prev };
      delete newCounts[chatId];
      return newCounts;
    });
  };

  return (
    <UnreadContext.Provider
      value={{
        unreadCounts,
        totalUnread,
        incrementUnread,
        clearUnread,
        ringtones,
        currentRingtoneId,
        addRingtone,
        selectRingtone,
        deleteRingtone,
        playCurrentRingtone,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => {
  const context = useContext(UnreadContext);
  if (!context) throw new Error("useUnread error");
  return context;
};
