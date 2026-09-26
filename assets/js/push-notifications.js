(function () {
  "use strict";

  /*
   * Web Push client for Infograf+.
   *
   * The UI is enabled now. The server endpoint and VAPID public key are
   * intentionally kept as configuration so they can be connected to the
   * Cloudflare Worker without exposing any private key in the website.
   */
  var CONFIG = {
    subscribeEndpoint: "https://calm-dream-ae41.dilgash-ibrahim.workers.dev/api/push/subscribe",
    vapidPublicKey: "BDoEDt_pE-834xoltoSLEfj9wCXNJszfxHy1I7rfZ8FOcF7i1f0EnIBxez2U3Up9pRCAYhicfcvu2GcVnhxS7e4"
  };

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

  function getButton() {
    return document.getElementById("notification-toggle");
  }

  function setState(button, subscribed, loading) {
    if (!button) return;
    button.classList.toggle("is-subscribed", !!subscribed);
    button.classList.toggle("is-loading", !!loading);
    button.disabled = !!loading;

    if (subscribed) {
      button.setAttribute("aria-label", "إشعارات Infograf+ مفعّلة");
      button.setAttribute("title", "إشعارات Infograf+ مفعّلة");
    } else {
      button.setAttribute("aria-label", "تفعيل إشعارات Infograf+");
      button.setAttribute("title", "تفعيل إشعارات Infograf+");
    }
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

  async function getRegistration() {
    if (!("serviceWorker" in navigator)) throw new Error("service_worker_unsupported");
    return navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }

  async function getExistingSubscription() {
    if (!("serviceWorker" in navigator)) return null;
    var registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration || !registration.pushManager) return null;
    return registration.pushManager.getSubscription();
  }

  async function saveSubscription(subscription) {
    if (!CONFIG.subscribeEndpoint) throw new Error("push_endpoint_missing");

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

    return response.json().catch(function () { return { ok: true }; });
  }

  async function subscribe() {
    var button = getButton();
    if (!button) return;

    if (!window.isSecureContext || !("Notification" in window) || !("PushManager" in window)) {
      window.alert("هذا المتصفح لا يدعم إشعارات Infograf+ بهذه الطريقة.");
      return;
    }

    if (!CONFIG.vapidPublicKey) {
      window.alert("زر الإشعارات جاهز، لكن خدمة الإشعارات لم تُربط بالخادم بعد.");
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
    } catch (error) {
      console.error("Infograf+ push subscription error:", error);
      window.alert("تعذر تفعيل الإشعارات حاليًا. حاول مرة أخرى لاحقًا.");
      setState(button, false, false);
    }
  }

  async function init() {
    var button = getButton();
    if (!button) return;

    setState(button, false, false);

    try {
      var existing = await getExistingSubscription();
      setState(button, !!existing && Notification.permission === "granted", false);
    } catch (error) {}

    button.addEventListener("click", subscribe);
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
