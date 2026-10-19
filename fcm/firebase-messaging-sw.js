// Service worker de avisos para el PANEL ADMIN (servido bajo /taxicount-admin/).
// Firebase registra por defecto /firebase-messaging-sw.js en la raíz del dominio,
// que ahí no existe; main_admin.dart registra ESTE fichero en ruta relativa. Vive
// en su propia carpeta para que su scope (…/fcm/) no sustituya al service worker
// de Flutter (flutter_service_worker.js, scope de la app). Mismo código que el de
// la raíz (web/firebase-messaging-sw.js).
importScripts('../firebase-messaging-sw.js');
