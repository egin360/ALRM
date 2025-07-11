// =================================================================
//  PASO 1: CONFIGURACIÓN E INICIALIZACIÓN
// =================================================================

// Pega aquí tu objeto de configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR2dogshBUZ9fhQTUU5gJOERjPmThW4Uw",
  authDomain: "alrm-egin360.firebaseapp.com",
  databaseURL: "https://alrm-egin360-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "alrm-egin360",
  storageBucket: "alrm-egin360.firebasestorage.app",
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
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const alarmsListDiv = document.getElementById('alarms-list');
const backButton = document.getElementById('back-button');
const detailAlarmName = document.getElementById('detail-alarm-name');
const detailContentDiv = document.getElementById('detail-content');

let activeListeners = {};

// =================================================================
//  LÓGICA DE NAVEGACIÓN Y VISTAS
// =================================================================
function showScreen(screenName) {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'none';
    detailContainer.style.display = 'none';

    if (screenName === 'login') loginContainer.style.display = 'block';
    if (screenName === 'dashboard') dashboardContainer.style.display = 'block';
    if (screenName === 'detail') detailContainer.style.display = 'block';
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
            database.ref(listener.path).off('value', listener.callback);
            if(listener.interval) clearInterval(listener.interval);
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

    function updateCardUI() {
        if (Object.keys(lastData).length === 0) return;

        const now = Date.now();
        const lastSeen = lastData.last_seen || 0;
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

    alarmRef.once('value', (snapshot) => {
        lastData = snapshot.val() || { status: false, last_seen: 0 };
        updateCardUI();
    });

    const alarmCallback = (snapshot) => {
        lastData = snapshot.val() || lastData;
        updateCardUI();
    };
    alarmRef.on('value', alarmCallback);
    
    const checkInterval = setInterval(() => {
        if (!document.body.contains(item)) {
            clearInterval(checkInterval);
            const listenerInfo = activeListeners[deviceId];
            if(listenerInfo) {
                database.ref(listenerInfo.path).off('value', listenerInfo.callback);
                delete activeListeners[deviceId];
            }
            return;
        }
        updateCardUI();
    }, 3000);

    activeListeners[deviceId] = { path: `alarms/${deviceId}`, callback: alarmCallback, interval: checkInterval };
    
    switchLabel.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    
    switchInput.addEventListener('change', () => {
        if (!switchLabel.classList.contains('switch-disabled')) {
            database.ref(`alarms/${deviceId}/status`).set(switchInput.checked);
        }
    });

    item.addEventListener('click', () => {
        showDetailScreen(deviceId);
    });
}


// =================================================================
//  LÓGICA DE LA PANTALLA DE DETALLE
// =================================================================
function showDetailScreen(deviceId) {
    showScreen('detail');
    detailAlarmName.textContent = deviceId;
    detailContentDiv.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'alarm-card';
    // --- CAMBIO AQUÍ ---
    card.innerHTML = `
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
    `;
    detailContentDiv.appendChild(card);
    
    // El resto de la función 'showDetailScreen' no necesita cambios...
    const detailToggle = document.getElementById(`detail-toggle-${deviceId}`);
    const detailStatusBox = document.getElementById(`detail-status-box-${deviceId}`);
    const detailConnection = document.getElementById(`detail-connection-${deviceId}`);
    const detailRinging = document.getElementById(`detail-ringing-${deviceId}`);
    
    const alarmRef = database.ref(`alarms/${deviceId}`);

    const detailCallback = (snapshot) => {
        const data = snapshot.val();
        if(data) {
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
            if (secondsAgo < 30) {
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

// --- CAMBIO AQUÍ ---
// El botón de volver ahora está dentro del 'detail-container', por lo que
// el event listener debe estar dentro de la función que lo crea.
// Sin embargo, es más fácil si lo dejamos fuera y se lo asignamos al elemento
// que ya teníamos referenciado.
backButton.addEventListener('click', () => {
    const deviceId = detailAlarmName.textContent;
    const listenerInfo = activeListeners[`detail_${deviceId}`];
    if (listenerInfo) {
        database.ref(listenerInfo.path).off('value', listenerInfo.callback);
        delete activeListeners[`detail_${deviceId}`];
    }
    showScreen('dashboard');
});


// =================================================================
//  MANEJADORES DE EVENTOS DE LOGIN/LOGOUT
// =================================================================
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