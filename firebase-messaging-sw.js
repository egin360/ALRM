// Scripts para que Firebase funcione en segundo plano
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD34L8aMEbxgSBy56OWIWGklRiq_-dnxe4",
    authDomain: "alrm-egin360.firebaseapp.com",
    databaseURL: "https://alrm-egin360-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "alrm-egin360",
    storageBucket: "alrm-egin360.appspot.com",
    messagingSenderId: "631536838875",
    appId: "1:631536838875:web:0850c1fe09cf3a998644fe"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Muestra la notificación cuando llega
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'icono.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});