// Service Worker ของธนาคารเศรษฐี
// - ทำให้ Android ขึ้นปุ่ม "ติดตั้งแอป" ได้
// - หน้าเว็บใช้แบบ "เน็ตก่อน" = ได้เวอร์ชันล่าสุดเสมอ ถ้าเน็ตหลุดค่อยใช้ของที่เก็บไว้ (โหมดเครื่องเดียวเล่นออฟไลน์ได้)
// - ไม่ยุ่งกับ Firebase / ฟอนต์ / เว็บอื่น เพื่อไม่ให้ข้อมูลห้องค้าง
const CACHE = 'bb-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // ลบแคชเวอร์ชันเก่าทิ้ง
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // ปล่อยของนอกเว็บผ่านไปตามปกติ
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
