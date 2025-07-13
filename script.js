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

    function updateCardUI() {
        if (Object.keys(lastData).length === 0) return;

        const now = Date.now();
        const lastSeen = lastData.last_seen || 0;
        // --- CAMBIO AQUÍ: Cambiado de 90000 a 30000 ---
        const isOnline = (now - lastSeen) < 30000; 
        const isActive = lastData.status === true;

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
    // ... (el resto de la función no necesita cambios)
}

// =================================================================
//  LÓGICA DE LA PANTALLA DE DETALLE
// =================================================================
function showDetailScreen(deviceId) {
    currentDetailDevice = deviceId;
    showScreen('detail');
    detailAlarmName.textContent = deviceId;
    detailContentDiv.innerHTML = `
        <div class="alarm-card">
            <div class="detail-status-row">
                <h3>Estado General</h3>
                <label class="switch">
                    <input type="checkbox" id="detail-toggle-${deviceId}">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="status-box" id="detail-status-box-${deviceId}">Cargando...</div>
            <h3 style="margin-top: 20px;">Estado Conexión</h3>
            <div class="message-box" id="detail-connection-${deviceId}">Calculando...</div>
            <h3 style="margin-top: 20px;">Sirena</h3>
            <div class="message-box" id="detail-ringing-${deviceId}">Cargando...</div>
            <button id="log-button">Log conexiones</button>
        </div>
    `;

    document.getElementById('log-button').addEventListener('click', () => {
        showLogScreen(deviceId);
    });

    const detailToggle = document.getElementById(`detail-toggle-${deviceId}`);
    const detailStatusBox = document.getElementById(`detail-status-box-${deviceId}`);
    const detailConnection = document.getElementById(`detail-connection-${deviceId}`);
    const detailRinging = document.getElementById(`detail-ringing-${deviceId}`);
    const alarmRef = database.ref(`alarms/${deviceId}`);

    const detailCallback = (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const isActive = data.status === true;
            detailToggle.checked = isActive;
            detailStatusBox.textContent = isActive ? 'Activada' : 'Desactivada';
            detailStatusBox.className = isActive ? 'status-box status-box-active' : 'status-box status-box-inactive';
            const isRinging = data.ringing === true;
            detailRinging.textContent = isRinging ? "¡SONANDO!" : "Silencio";
            detailRinging.style.color = isRinging ? "#ff453a" : "#d1d1d6";
            const now = Date.now();
            const lastSeen = data.last_seen || 0;
            const secondsAgo = Math.floor((now - lastSeen) / 1000);
            if (secondsAgo < 90) {
                detailConnection.textContent = "En línea";
                detailConnection.style.color = "#34c759";
            } else {
                detailConnection.textContent = "Desconectado";
                detailConnection.style.color = "#ff453a";
            }
        }
    };

    alarmRef.on('value', detailCallback);
    activeListeners[`detail_${deviceId}`] = { path: `alarms/${deviceId}`, callback: detailCallback };

    detailToggle.addEventListener('change', () => {
        database.ref(`alarms/${deviceId}/status`).set(detailToggle.checked);
    });
}

// =================================================================
//  LÓGICA PANTALLA DE LOG
// =================================================================
function showLogScreen(deviceId) {
    showScreen('log');
    detailAlarmNameLog.textContent = `Log: ${deviceId}`;
    logContentDiv.innerHTML = 'Cargando registros...';

    const logRef = database.ref(`alarms/${deviceId}/connection_log`);
    const logCallback = (snapshot) => {
        logContentDiv.innerHTML = '';
        if (!snapshot.exists()) {
            logContentDiv.innerHTML = 'No hay registros.';
            return;
        }
        let entries = [];
        snapshot.forEach((childSnapshot) => {
            entries.push(childSnapshot.val());
        });

        entries.reverse().forEach(log => {
            const date = new Date(log.timestamp);
            const formattedDate = date.toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            const entryDiv = document.createElement('div');
            entryDiv.className = 'log-entry';
            if (log.event === 'connected') {
                entryDiv.className += ' log-entry-connected';
                entryDiv.textContent = `[${formattedDate}] Conectado`;
            } else {
                entryDiv.className += ' log-entry-disconnected';
                entryDiv.textContent = `[${formattedDate}] Desconectado`;
            }
            logContentDiv.appendChild(entryDiv);
        });
    };

    logRef.orderByChild('timestamp').limitToLast(50).on('value', logCallback);
    activeListeners[`log_${deviceId}`] = { path: `alarms/${deviceId}/connection_log`, callback: logCallback };
}

// =================================================================
//  BOTONES DE NAVEGACIÓN Y LOGIN/LOGOUT
// =================================================================
backToDashboardButton.addEventListener('click', () => {
    const deviceId = currentDetailDevice;
    const listenerInfo = activeListeners[`detail_${deviceId}`];
    if (listenerInfo) {
        database.ref(listenerInfo.path).off('value', listenerInfo.callback);
        delete activeListeners[`detail_${deviceId}`];
    }
    showScreen('dashboard');
});

backToDetailButton.addEventListener('click', () => {
    const listenerInfo = activeListeners[`log_${currentDetailDevice}`];
    if (listenerInfo) {
        database.ref(listenerInfo.path).off('value', listenerInfo.callback);
        delete activeListeners[`log_${currentDetailDevice}`];
    }
    showDetailScreen(currentDetailDevice);
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('login-error');
    loginError.textContent = '';
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            loginError.textContent = "Error: Email o contraseña incorrectos.";
            console.error("Error de login:", error.code, error.message);
        });
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});
