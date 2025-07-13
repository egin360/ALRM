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

        let deviceOrder = ["donosti", "lasarte"];
        if (uid === "nUIqvaWUhjceO3OvtiaCfG1pBxJ3") {
            deviceOrder = ["lasarte", "donosti"];
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
    detailAlarmName.textContent = deviceId;
    detailContentDiv.innerHTML = `...`; // (El contenido de esta función no cambia)
    // ... (El resto de la función no cambia)
}

// =================================================================
//  LÓGICA PANTALLA DE LOG
// =================================================================
function showLogScreen(deviceId) {
    // ... (Esta función no necesita cambios) ...
}

// --- FUNCIÓN DE ESCRITURA DE LOG CON TRANSACCIÓN ---
function writeToConnectionLog(deviceId, newEvent) {
    const logRef = database.ref(`alarms/${deviceId}/connection_log`);
    
    // Usamos una transacción para evitar escrituras duplicadas
    logRef.transaction((currentLogData) => {
        // Si no hay ningún log, creamos el primero
        if (currentLogData === null) {
            const newLogId = database.ref().push().key;
            return { [newLogId]: { event: newEvent, timestamp: firebase.database.ServerValue.TIMESTAMP } };
        }

        // Buscamos la entrada más reciente en el log
        let lastTimestamp = 0;
        let lastEventInDB = null;
        for (const key in currentLogData) {
            if (currentLogData[key].timestamp > lastTimestamp) {
                lastTimestamp = currentLogData[key].timestamp;
                lastEventInDB = currentLogData[key].event;
            }
        }
        
        // Si el nuevo evento es diferente al último, lo añadimos. Si no, no hacemos nada.
        if (lastEventInDB !== newEvent) {
            console.log(`Escribiendo nuevo evento en el log: '${newEvent}' para ${deviceId}`);
            const newLogId = database.ref().push().key;
            currentLogData[newLogId] = { event: newEvent, timestamp: firebase.database.ServerValue.TIMESTAMP };
        }
        
        // Devolvemos los datos actualizados para que Firebase los guarde
        return currentLogData;

    }, (error, committed, snapshot) => {
        if (error) {
            console.error('La transacción del log falló:', error);
        } else if (!committed) {
            console.log('No se escribió en el log (probablemente porque otra app ya lo hizo).');
        } else {
            console.log('Log de conexión actualizado con éxito.');
        }
    });
}

// =================================================================
//  BOTONES DE NAVEGACIÓN Y LOGIN/LOGOUT
// =================================================================
// ... (El resto del script no necesita cambios) ...

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
