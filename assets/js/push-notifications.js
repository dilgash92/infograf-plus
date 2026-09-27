(function () {
  "use strict";

  var CONFIG = {
    subscribeEndpoint: "https://calm-dream-ae41.dilgash-ibrahim.workers.dev/api/push/subscribe",
    vapidPublicKey: "BMf0OcEiHeCaxXEq2QdV1aG9Jk1dad0wB4N519Da_PnRNh3453c-hxQ0cAFd55gUSIj-v8L1ydRbhopPY8zpLWQ"
  };

  var DB_NAME = "infograf-plus-notifications";
  var DB_VERSION = 1;
  var STORE_NAME = "notifications";

  var CATEGORY_COLORS = {
    "صحة": "#22A06B",
    "اقتصاد ومال": "#D99A00",
    "العالم": "#0043F7",
    "سياسة": "#921E7A",
    "منوع": "#E74F1B",
    "رياضة": "#A71C1C",
    "علوم": "#555555",
    "سفر": "#FC8FC5",
    "سيارات": "#2A2A2D",
    "تقنية": "#13CBFF"
  };

  function getButton() { return document.getElementById("notification-toggle"); }
  function getPanel() { return document.getElementById("notification-panel"); }
  function getList() { return document.getElementById("notification-list"); }
  function getBadge() { return document.getElementById("notification-badge"); }

  function setState(button, subscribed, loading) {
    if (!button) return;
    button.classList.toggle("is-subscribed", !!subscribed);
    button.classList.toggle("is-loading", !!loading);
    button.disabled = !!loading;

    var panel = getPanel();
    if (panel) button.setAttribute("aria-expanded", String(!panel.hidden));

    button.setAttribute(
      "aria-label",
      subscribed ? "فتح إشعارات Infograf+" : "تفعيل إشعارات Infograf+"
    );
    button.setAttribute(
      "title",
      subscribed ? "إشعارات Infograf+" : "تفعيل إشعارات Infograf+"
    );
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!("indexedDB" in window)) {
        reject(new Error("indexeddb_unsupported"));
        return;
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
          store.createIndex("read", "read");
        }
      };

      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  async function getNotifications() {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readonly");
      var request = tx.objectStore(STORE_NAME).getAll();

      request.onsuccess = function () {
        var items = request.result || [];
        items.sort(function (a, b) { return b.createdAt - a.createdAt; });
        resolve(items);
      };

      request.onerror = function () { reject(request.error); };
    });
  }

  async function setRead(id, read) {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readwrite");
      var store = tx.objectStore(STORE_NAME);
      var request = store.get(id);

      request.onsuccess = function () {
        if (!request.result) return;
        request.result.read = !!read;
        store.put(request.result);
      };

      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function formatTime(timestamp) {
    try {
      return new Intl.DateTimeFormat("ar-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(timestamp));
    } catch (error) {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
      }[char];
    });
  }

  function updateBadge(items) {
    var badge = getBadge();
    if (!badge) return;

    var count = items.filter(function (item) {
      return !item.read;
    }).length;

    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;

    var button = getButton();
    if (button) {
      button.setAttribute(
        "aria-label",
        count ? "الإشعارات، " + count + " غير مقروءة" : "فتح إشعارات Infograf+"
      );
    }
  }

  async function refreshNotifications() {
    try {
      var items = await getNotifications();
      updateBadge(items);

      var list = getList();
      if (!list) return;

      if (!items.length) {
        list.innerHTML = '<div class="notification-empty">لا توجد إشعارات بعد.</div>';
        return;
      }

      list.innerHTML = items.slice(0, 20).map(function (item) {
        var unreadClass = item.read ? "" : " is-unread";

        return (
          '<a class="notification-item' + unreadClass + '" href="' +
          escapeHtml(item.url || "/") +
          '" data-notification-id="' + escapeHtml(item.id) + '">' +
            '<span class="notification-item-dot" aria-hidden="true"></span>' +
            '<span class="notification-item-content">' +
              '<strong>' + escapeHtml(item.title || "Infograf+") + "</strong>" +
              '<span>' + escapeHtml(item.body || "إنفوغرافيك جديد على Infograf+") + "</span>" +
              '<time>' + escapeHtml(formatTime(item.createdAt)) + "</time>" +
            "</span>" +
          "</a>"
        );
      }).join("");

      Array.from(list.querySelectorAll(".notification-item")).forEach(function (item) {
        item.addEventListener("click", function () {
          var id = item.getAttribute("data-notification-id");
          if (!id) return;
          setRead(id, true).then(refreshNotifications).catch(function () {});
        });
      });
    } catch (error) {
      console.warn("Infograf+ notification history error:", error);
    }
  }

  function togglePanel(forceOpen) {
    var panel = getPanel();
    var button = getButton();
    if (!panel) return;

    var open = forceOpen === undefined ? panel.hidden : !!forceOpen;
    panel.hidden = !open;

    if (button) {
      button.setAttribute("aria-expanded", String(open));
    }

    if (open) refreshNotifications();
  }

  async function getRegistration() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("service_worker_unsupported");
    }

    return navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }

  async function getExistingSubscription() {
    if (!("serviceWorker" in navigator)) return null;

    var registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration || !registration.pushManager) return null;

    return registration.pushManager.getSubscription();
  }

  async function saveSubscription(subscription) {
    if (!CONFIG.subscribeEndpoint) {
      throw new Error("push_endpoint_missing");
    }

    var response = await fetch(CONFIG.subscribeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        origin: window.location.origin
      })
    });

    if (!response.ok) {
      var message = "push_subscription_failed";

      try {
        var data = await response.json();
        if (data && data.error) message = data.error;
      } catch (error) {}

      throw new Error(message);
    }

    return response.json().catch(function () {
      return { ok: true };
    });
  }

  function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isIOSHomeScreenWebApp() {
    return (
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true
    );
  }

  function showIOSInstallHelp() {
    window.alert(
      "لتفعيل إشعارات Infograf+ على iPhone أو iPad:\n\n" +
      "1. افتح Infograf+ في Safari.\n" +
      "2. اضغط زر المشاركة (□↑).\n" +
      "3. اختر «إضافة إلى الشاشة الرئيسية».\n" +
      "4. فعّل «فتح كتطبيق ويب» ثم اضغط «إضافة».\n" +
      "5. افتح Infograf+ من الأيقونة الجديدة على الشاشة الرئيسية.\n" +
      "6. اضغط جرس الإشعارات واسمح بالإشعارات.\n\n" +
      "مهم: على iPhone لا تعمل إشعارات الويب بالطريقة نفسها من تبويب Safari العادي؛ يجب فتح الموقع كتطبيق ويب من الشاشة الرئيسية."
    );
  }

  async function subscribe() {
    var button = getButton();
    if (!button) return;

    if (isIOSDevice() && !isIOSHomeScreenWebApp()) {
      showIOSInstallHelp();
      return;
    }

    if (
      !window.isSecureContext ||
      !("Notification" in window) ||
      !("PushManager" in window)
    ) {
      window.alert(
        "إشعارات Infograf+ غير متاحة في هذا المتصفح. جرّب فتح الموقع من متصفح يدعم Web Push."
      );
      return;
    }

    if (!CONFIG.vapidPublicKey) {
      window.alert("زر الإشعارات جاهز، لكن مفتاح VAPID العام غير مضبوط.");
      return;
    }

    setState(button, false, true);

    try {
      var permission = Notification.permission;

      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        window.alert("لم يتم السماح بالإشعارات. يمكنك تفعيلها لاحقًا من إعدادات المتصفح.");
        setState(button, false, false);
        return;
      }

      var registration = await getRegistration();
      var subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(CONFIG.vapidPublicKey)
        });
      }

      await saveSubscription(subscription);

      setState(button, true, false);
      togglePanel(true);
    } catch (error) {
      console.error("Infograf+ push subscription error:", error);
      window.alert("تعذر تفعيل الإشعارات حاليًا. حاول مرة أخرى لاحقًا.");
      setState(button, false, false);
    }
  }

  async function handleButtonClick() {
    var existing = null;

    try {
      existing = await getExistingSubscription();
    } catch (error) {}

    if (existing && Notification.permission === "granted") {
      togglePanel();
      return;
    }

    await subscribe();
  }

  function init() {
    var button = getButton();
    if (!button) return;

    getExistingSubscription()
      .then(function (existing) {
        var subscribed = !!existing && Notification.permission === "granted";
        setState(button, subscribed, false);

        // Re-sync an existing subscription with the current Worker/KV.
        // This repairs subscriptions created before the Worker/KV fix.
        if (subscribed) {
          saveSubscription(existing).catch(function (error) {
            console.warn("Infograf+ push subscription sync error:", error);
          });
        }
      })
      .catch(function () {});

    button.addEventListener("click", handleButtonClick);

    var markReadButton = document.getElementById("notification-mark-read");
    if (markReadButton) {
      markReadButton.addEventListener("click", function () {
        getNotifications()
          .then(function (items) {
            return Promise.all(
              items
                .filter(function (item) { return !item.read; })
                .map(function (item) { return setRead(item.id, true); })
            );
          })
          .then(refreshNotifications)
          .catch(function () {});
      });
    }

    document.addEventListener("click", function (event) {
      var panel = getPanel();
      if (!panel || panel.hidden) return;

      if (
        !panel.contains(event.target) &&
        !button.contains(event.target)
      ) {
        togglePanel(false);
      }
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", function (event) {
        if (!event.data) return;

        if (
          event.data.type === "infograf-notification" ||
          event.data.type === "infograf-notification-read"
        ) {
          refreshNotifications();
        }
      });
    }

    refreshNotifications();
  }

  window.InfografPush = {
    categoryColors: CATEGORY_COLORS,
    config: CONFIG
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();