// public/sw.js

self.addEventListener("install", (event) => {
  // Service Worker 安装后立即激活
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 接管所有页面
  event.waitUntil(self.clients.claim());
});

// 监听通知点击事件（点击通知后打开聊天窗口）
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 如果已经有打开的窗口，就聚焦它
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        // 如果没有打开，就打开首页
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});
