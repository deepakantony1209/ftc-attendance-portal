importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Need to safely load the firebase config here. 
// We must mirror the API keys used in src/firebase.js
const firebaseConfig = {
    apiKey: "AIzaSyBYzWt5wk5kzYq40kg2AeYNFWJV0pzy-fc",
    authDomain: "choir-attendance-portal.firebaseapp.com",
    projectId: "choir-attendance-portal",
    storageBucket: "choir-attendance-portal.firebasestorage.app",
    messagingSenderId: "861979492396",
    appId: "1:861979492396:web:30fbdae4f9d732054fd189",
    measurementId: "G-KPTGPP406H"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/Icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
