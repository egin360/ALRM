// =================================================================
//  CONFIGURACIÓN E INICIALIZACIÓN
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCR2dogshBUZ9fhQTUU5gJOERjPmThW4Uw",
    authDomain: "alrm-egin360.firebaseapp.com",
    databaseURL: "https://alrm-egin360-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "alrm-egin360",
    storageBucket: "alrm-egin360.appspot.com",
    messagingSenderId: "631536838875",
    appId: "1:631536838875:web:0850c1fe09cf3a998644fe"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// =================================================================
//  REFERENCIAS A ELEMENTOS HTML
// =================================================================
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const detailContainer = document.getElementById('detail-container');
const logContainer = document.getElementById('log-container');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const alarmsListDiv = document.getElementById('alarms-list');
const backToDashboardButton = document.getElementById('back-to-dashboard-button');
const detailAlarmName = document.getElementById('detail-alarm-name');
const detailContentDiv = document.getElementById('detail-content');
const backToDetailButton = document.getElementById('back-to-detail-button');
const logContentDiv = document.getElementById('log-content');
const detailAlarmNameLog = document.getElementById('detail-alarm-name-log');

let activeListeners = {};
let currentDetailDevice = null;
let lastLoggedEvent = {}; 

// =================================================================
//  LÓGICA DE NAVEGACIÓN Y VISTAS
// =================================================================
function showScreen(screenName) {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'none';
    detailContainer.style.display = 'none';
    logContainer.style.display = 'none';

    if (screenName === 'login') loginContainer.style.display = 'block';
    if (screenName === 'dashboard') dashboardContainer.style.display = 'block';
    if (screenName === 'detail') detailContainer.style.display = 'block';
    if (screenName === 'log') logContainer.style.display = 'block';
}

// =================================================================
//  CONTROLADOR PRINCIPAL (AUTENTICACIÓN)
// =================================================================
auth.onAuthStateChanged((user) => {
    if (user) {
        showScreen('dashboard');
        loadUserDashboard(user.uid);
    } else {
        for (const key in activeListeners) {
            const listener = activeListeners[key];
            if (listener.path) database.ref(listener.path).off('value', listener.callback);
            if (listener.interval) clearInterval(listener.interval);
        }
        activeListeners = {};
        lastLoggedEvent = {};
        showScreen('login');
    }
});

// =================================================================
//  LÓGICA DEL DASHBOARD (PANTALLA PRINCIPAL)
// =================================================================
function loadUserDashboard(uid) {
    const userPermissionsRef = database.ref(`users/${uid}/permissions`);
    userPermissionsRef.once('value', (snapshot) => {
        const permissions = snapshot.val() || {};
        alarmsListDiv.innerHTML = '';

        // --- CAMBIO AQUÍ: Usamos los nombres con mayúscula ---
        let deviceOrder = ["Donosti", "Lasarte"];
        if (uid === "nUIqvaWUhjceO3OvtiaCfG1pBxJ3") {
            deviceOrder = ["Lasarte", "Donosti"];
        }

        deviceOrder.forEach(deviceId => {
            if (permissions[deviceId] === true) {
                createAlarmListItem(deviceId);
            }
        });
    });
}

function createAlarmListItem(deviceId) {
    const item = document.createElement('div');
    item.className = 'alarm-list-item';
    item.dataset.deviceId = deviceId;
    
    // Ahora el deviceId ya viene con mayúscula, no hace falta capitalizar
    item.innerHTML = `
        <div class="alarm-header">
            <span class="alarm-list-item-name">${deviceId}</span>
            <label class="switch">
                <input type="checkbox">
                <span class="slider"></span>
            </label>
        </div>
        <div class="status-box">Cargando...</div>
    `;
    alarmsListDiv.appendChild(item);

    const statusBox = item.querySelector('.status-box');
    const switchInput = item.querySelector('input[type="checkbox"]');
    const switchLabel = item.querySelector('.switch');

    let lastData = {};
    let wasOnline = null;

    function updateCardUI() {
        if (Object.keys(lastData).length === 0) return;
        const now = Date.now();
        const lastSeen = lastData.last_seen || 0;
        const isOnline = (now - lastSeen) < 30000;
        const isActive = lastData.status === true;
        
        if (wasOnline !== null && wasOnline !== isOnline) {
            writeToConnectionLog(deviceId, isOnline ? 'connected' : 'disconnected');
        }
        wasOnline = isOnline;

        switchInput.checked = isActive;
        if (isOnline) {
            item.classList.remove('alarm-list-item-offline');
            switchLabel.classList.remove('switch-disabled');
            statusBox.textContent = isActive ? 'Activada' : 'Desactivada';
            statusBox.className = isActive ? 'status-box status-box-active' : 'status-box status-box-inactive';
        } else {
            item.classList.add('alarm-list-item-offline');
            switchLabel.classList.add('switch-disabled');
            statusBox.textContent = 'Sin Conexión';
            statusBox.className = 'status-box status-box-offline';
        }
    }

    const alarmRef = database.ref(`alarms/${deviceId}`);
    const alarmCallback = (snapshot) => {
        lastData = snapshot.val() || {};
        updateCardUI();
    };

    alarmRef.once('value', (snapshot) => {
        lastData = snapshot.val() || { status: false, last_seen: 0 };
        const now = Date.now();
        wasOnline = (now - (lastData.last_seen || 0)) < 30000;
        updateCardUI();
        alarmRef.on('value', alarmCallback);
        activeListeners[deviceId] = { path: `alarms/${deviceId}`, callback: alarmCallback };
    });

    const checkInterval = setInterval(() => {
        if (!document.body.contains(item)) {
            clearInterval(checkInterval);
            const listenerInfo = activeListeners[deviceId];
            if (listenerInfo) {
                database.ref(listenerInfo.path).off('value', listenerInfo.callback);
                delete activeListeners[deviceId];
            }
            return;
        }
        updateCardUI();
    }, 3000);
    
    activeListeners[`interval_${deviceId}`] = { interval: checkInterval };

    switchLabel.addEventListener('click', (event) => event.stopPropagation());
    switchInput.addEventListener('change', () => {
        if (!switchLabel.classList.contains('switch-disabled')) {
            database.ref(`alarms/${deviceId}/status`).set(switchInput.checked);
        }
    });
    item.addEventListener('click', () => showDetailScreen(deviceId));
}

// =================================================================
//  LÓGICA DE LA PANTALLA DE DETALLE
// =================================================================
function showDetailScreen(deviceId) {
    currentDetailDevice = deviceId;
    showScreen('detail');
    // El deviceId ya viene con mayúscula
    detailAlarmName.textContent = deviceId;
    detailContentDiv.innerHTML = `...`; // El contenido de la tarjeta no cambia
    // ... El resto de la función no cambia ...
}

// =================================================================
//  LÓGICA PANTALLA DE LOG
// =================================================================
function showLogScreen(deviceId) {
    showScreen('log');
    // El deviceId ya viene con mayúscula
    detailAlarmNameLog.textContent = `Log: ${deviceId}`;
    // ... El resto de la función no cambia ...
}

// ... (El resto del script no necesita cambios) ...
