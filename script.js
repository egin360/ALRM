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

function
