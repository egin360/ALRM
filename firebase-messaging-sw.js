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

// ✅ MANEJA TODOS LOS TIPOS DE MENSAJES CORRECTAMENTE
messaging.onBackgroundMessage((payload) => {
    console.log('Mensaje recibido en segundo plano:', payload);
    
    // Identificar el origen del mensaje
    const source = payload.data?.source || 'unknown';
    
    if (source === 'esp32') {
        // 📡 MENSAJES DEL ESP32 - Manejo personalizado
        console.log('Mensaje del ESP32 recibido');
        
        const notificationTitle = payload.data?.title || payload.notification?.title || 'ESP32 Alert';
        const notificationOptions = {
            body: payload.data?.body || payload.notification?.body || 'Sensor notification',
            icon: 'icono.png',
            badge: 'icono.png',
            tag: `esp32_${payload.data?.deviceId || 'sensor'}`, // Evita duplicados del mismo sensor
            data: payload.data,
            requireInteraction: true, // Mantiene la notificación visible
            actions: [
                {
                    action: 'view',
                    title: 'Ver detalles'
                },
                {
                    action: 'dismiss',
                    title: 'Descartar'
                }
            ]
        };
        
        self.registration.showNotification(notificationTitle, notificationOptions);
        
    } else if (source === 'cloud_function') {
        // 🔗 MENSAJES DE TU CLOUD FUNCTION - Dejar que Firebase maneje automáticamente
        console.log('Mensaje de Cloud Function - Firebase lo maneja automáticamente');
        // ❌ NO hacemos nada aquí - Firebase ya muestra la notificación automáticamente
        // porque tu Cloud Function envía un objeto "notification"
        
    } else {
        // 🤔 MENSAJES SIN IDENTIFICAR - Manejo por defecto
        console.log('Mensaje sin identificar, aplicando manejo por defecto');
        
        // Solo mostrar si NO tiene notification object (para evitar duplicados)
        if (!payload.notification && payload.data) {
            const notificationTitle = payload.data.title || 'Notificación';
            const notificationOptions = {
                body: payload.data.body || 'Nueva notificación',
                icon: 'icono.png',
                data: payload.data
            };
            
            self.registration.showNotification(notificationTitle, notificationOptions);
        }
    }
});
