importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCekF_xNVSQ2bgLNN6H8_nuL4lUVgib-N4",
  authDomain: "vivo-c9ef7.firebaseapp.com",
  projectId: "vivo-c9ef7",
  storageBucket: "vivo-c9ef7.firebasestorage.app",
  messagingSenderId: "1020057072983",
  appId: "1:1020057072983:web:aa4785924ed1c5f2f73a12",
  measurementId: "G-51PN1WTTLL"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || '⏰ Напоминание', {
    body: body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'reminder',
    vibrate: [200, 100, 200],
  });
});
