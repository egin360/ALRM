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

// Inicializamos los servicios de Firebase
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
        // Limpiamos listeners activos al cerrar sesión
        for (const key in activeListeners) {
            database.ref(activeListeners[key].path).off('value', activeListeners[key].callback);
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
    
    item.innerHTML = `
        <span class="alarm-list-item-name">${deviceId}</span>
        <label class="switch">
            <input type="checkbox">
            <span class="slider"></span>
        </label>
    `;
    alarmsListDiv.appendChild(item);

    const switchInput = item.querySelector('input[type="checkbox"]');
    const switchLabel = item.querySelector('.switch');
    
    const alarmStatusRef = database.ref(`alarms/${deviceId}/status`);
    
    // El listener solo actualiza el estado del interruptor
    const statusCallback = (snapshot) => {
        switchInput.checked = snapshot.val() === true;
    };
    alarmStatusRef.on('value', statusCallback);
    activeListeners[`${deviceId}_status`] = { path: `alarms/${deviceId}/status`, callback: statusCallback };

    // Detenemos la propagación en el clic del interruptor
    switchLabel.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    
    // Cambiamos el estado en Firebase al tocar el interruptor
    switchInput.addEventListener('change', () => {
        alarmStatusRef.set(switchInput.checked);
    });

    // Navegamos al detalle al pulsar en la tarjeta
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
    detailContentDiv.innerHTML = '<p>Cargando detalles...</p>'; // Placeholder

    // Aquí iría la lógica para mostrar todos los detalles de la alarma
    // (status, ringing, message, last_seen) como hicimos antes,
    // pero por ahora lo dejamos simple para cumplir tus requisitos actuales.
}

backButton.addEventListener('click', () => {
    showScreen('dashboard');
});

// =================================================================
//  MANEJADORES DE EVENTOS DE LOGIN/LOGOUT
// =================================================================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(loginForm.email.value, loginForm.password.value)
        .catch((error) => {
            loginForm.querySelector('.error-message').textContent = "Error: " + error.message;
        });
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});
