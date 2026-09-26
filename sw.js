/* Infograf+ Web Push Service Worker
 * Receives encrypted Web Push payloads and displays a persistent notification.
 */
self.addEventListener("push", function (event) {
  event.waitUntil((async function () {
    var data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch (error) {
      data = { title: "Infograf+", body: "إنفوغرافيك جديد على Infograf+" };
    }

    var title = data.title || "Infograf+";
    var body = data.body || "إنفوغرافيك جديد على Infograf+";
    var url = data.url || "/";
    var icon = data.icon || "/assets/icons/icon.png?v=3";
    var badge = data.badge || icon;
    var color = data.color || "#635BFF";
    var category = data.category || "";

    var options = {
      body: body,
      icon: icon,
      badge: badge,
      dir: "rtl",
      lang: "ar",
      tag: category ? "infograf-" + category : "infograf-new",
      renotify: true,
      data: {
        url: url,
        category: category,
        color: color
      }
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetUrl = event.notification && event.notification.data
    ? event.notification.data.url
    : "/";

  event.waitUntil((async function () {
    var clientsList = await clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (var i = 0; i < clientsList.length; i++) {
      var client = clientsList[i];
      if ("focus" in client) {
        try {
          await client.navigate(targetUrl);
        } catch (error) {}
        return client.focus();
      }
    }

    return clients.openWindow(targetUrl);
  })());
});
