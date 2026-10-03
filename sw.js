// Service Worker ของ "ธนาคารเศรษฐี"
// เป้าหมาย: ให้ติดตั้งเป็นแอปได้ (installable) + เปิดได้แม้เน็ตหลุดชั่วคราว
// แต่ "ไม่" แคชข้อมูลเกม/Firestore เด็ดขาด เพื่อไม่ให้จอค้างข้อมูลเก่า (บั๊กเดิมที่เคยแก้)
const CACHE = 'bb-shell-v4';
const SHELL = ['./index.html', './manifest.json', './pwa/icon-192.png', './pwa/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // ปล่อยผ่าน: POST/PUT ของ Firestore ไม่แตะ
  const url = new URL(req.url);
  // เฉพาะไฟล์ของแอปเราเอง (same-origin) เท่านั้น — ปล่อย Firestore/ฟอนต์/สคริปต์ CDN ให้วิ่งตรงเสมอ
  if (url.origin !== self.location.origin) return;

  // หน้า index.html: ต้องพยายามเอาของใหม่สุดก่อนเสมอ (กันจอค้าง) แคชไว้ใช้ตอนไม่มีเน็ตเท่านั้น
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/bb/')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // ไฟล์อื่นของแอป (manifest, ไอคอน): cache-first เร็วดี แล้วอัปเดตเบื้องหลัง
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then((res) => {
      caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
