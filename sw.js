self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

/* Infograf+ Web Push Service Worker */
const DB_NAME = "infograf-plus-notifications";
const DB_VERSION = 1;
const STORE_NAME = "notifications";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("read", "read");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveNotification(notification) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(notification);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function markNotificationRead(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        request.result.read = true;
        store.put(request.result);
      }
    };

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}


async function waitForPublishedPage(url) {
  let targetUrl;

  try {
    targetUrl = new URL(url || "/", self.location.origin);
  } catch (error) {
    return url || "/";
  }

  // Only poll our own site. External links are opened immediately.
  if (targetUrl.origin !== self.location.origin) {
    return targetUrl.href;
  }

  const maxAttempts = 20;
  const delayMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(targetUrl.href, {
        method: "HEAD",
        cache: "no-store",
        redirect: "follow"
      });

      if (response.ok) {
        return targetUrl.href;
      }

      // Some hosts do not implement HEAD correctly. Fall back to GET.
      if (response.status === 405 || response.status === 501) {
        const getResponse = await fetch(targetUrl.href, {
          method: "GET",
          cache: "no-store",
          redirect: "follow"
        });

        if (getResponse.ok) {
          return targetUrl.href;
        }
      }
    } catch (error) {}

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Do not trap the user indefinitely. Open the target even if publication
  // still has not completed after about one minute.
  return targetUrl.href;
}

async function broadcast(message) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  clientList.forEach(client => client.postMessage(message));
}

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let data = {};

    try {
      data = event.data ? event.data.json() : {};
    } catch (error) {
      data = {};
    }

    const title = data.title || "Infograf+";
    const body = data.body || "إنفوغرافيك جديد على Infograf+";
    const url = data.url || "/";
    const icon = data.icon || "/assets/icons/icon.png?v=3";
    const badge = data.badge || icon;
    const color = data.color || "#635BFF";
    const category = data.category || "";

    const id =
      String(data.id || "") ||
      (Date.now() + "-" + Math.random().toString(36).slice(2));

    const notification = {
      id,
      title,
      body,
      url,
      icon,
      badge,
      color,
      category,
      createdAt: Number(data.createdAt) || Date.now(),
      read: false
    };

    await saveNotification(notification);

    await self.registration.showNotification(title, {
      body,
      icon,
      badge,
      dir: "rtl",
      lang: "ar",
      tag: category ? "infograf-" + category : "infograf-" + id,
      renotify: true,
      data: notification
    });

    await broadcast({
      type: "infograf-notification",
      notification
    });
  })());
});

self.addEventListener("notificationclick", event => {
  const notification = event.notification;
  const data = notification && notification.data
    ? notification.data
    : {};

  notification.close();

  event.waitUntil((async () => {
    if (data.id) {
      try {
        await markNotificationRead(data.id);
      } catch (error) {}
    }

    await broadcast({
      type: "infograf-notification-read",
      id: data.id || null
    });

    // GitHub Pages can take a short time to publish a newly created post.
    // Wait until the notification target actually exists before navigating,
    // so users do not land on the site's 404 page.
    const targetUrl = await waitForPublishedPage(data.url || "/");

    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clientList) {
      if ("focus" in client) {
        try {
          await client.navigate(targetUrl);
        } catch (error) {}

        return client.focus();
      }
    }

    return self.clients.openWindow(targetUrl);
  })());
});