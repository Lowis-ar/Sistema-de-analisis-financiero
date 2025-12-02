// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const API_BASE = 'api/';

// ==========================================
// FUNCIONES DE UTILIDAD (UI & FORMATOS)
// ==========================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

// Helper para NIT (0000-000000-000-0)
function formatNIT(value) {
    let v = value.replace(/\D/g, '').substring(0, 14);
    let parts = [];
    if (v.length > 0) parts.push(v.substring(0, 4));
    if (v.length > 4) parts.push(v.substring(4, 10));
    if (v.length > 10) parts.push(v.substring(10, 13));
    if (v.length > 13) parts.push(v.substring(13, 14));
    return parts.join('-');
}

function showModal(title, message) {
    const modal = document.getElementById('modal');
    if (modal) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        alert(`${title}: ${message}`);
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('flex');
}

function showLoading() {
    document.getElementById('main-content').innerHTML = `
        <div class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
}

// ==========================================
// NAVEGACIÓN Y TABS
// ==========================================

function showDashboard() {
    if(typeof loadDashboard === 'function') loadDashboard();
    updateActiveTab('dashboard');
}

function showClientes() {
    if(typeof loadClientesModule === 'function') loadClientesModule(); // Usamos la versión nueva del módulo
    updateActiveTab('clientes');
}

function showPrestamos() {
    if(typeof loadPrestamosModule === 'function') loadPrestamosModule();
    updateActiveTab('creditos');
}

function showActivos() {
    if(typeof loadActivosModule === 'function') loadActivosModule();
    updateActiveTab('activos');
}

function showGarantias() {
    if (typeof loadGarantiasModule === 'function') {
        loadGarantiasModule();
    }
    updateActiveTab('garantias');
}

// Función unificada para manejar la clase 'active' en los botones
function updateActiveTab(activeTab) {
    // 1. Sincronizar estado global si existe app.js
    if (typeof appState !== 'undefined') {
        appState.activeTab = activeTab;
    }

    // 2. Limpiar estilos anteriores
    document.querySelectorAll('.tab-btn, .tab-button').forEach(btn => {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('hover:bg-slate-700');
    });
    
    // 3. Definir palabras clave para encontrar el botón correcto
    const tabKeywords = {
        'dashboard': ['Dashboard'],
        'clientes': ['Clientes'],
        'creditos': ['Créditos', 'Credit'],
        'activos': ['Activos'],
        'garantias': ['Garantías', 'Garantias']
    };

    const keywords = tabKeywords[activeTab] || [];

    // 4. Activar el botón correcto
    const buttons = document.querySelectorAll('.tab-btn, .tab-button');
    buttons.forEach(btn => {
        const text = btn.textContent;
        const onclickAttr = btn.getAttribute('onclick') || '';
        const dataTab = btn.getAttribute('data-tab') || '';

        // Coincidencia por Texto, OnClick o Data-Attribute
        const matchText = keywords.some(k => text.includes(k));
        const matchFunc = onclickAttr.includes(activeTab);
        const matchData = dataTab === activeTab;

        if (matchText || matchFunc || matchData) {
            btn.classList.add('bg-blue-600');
            btn.classList.remove('hover:bg-slate-700');
        }
    });
}

// ==========================================
// API CALL (ROBUSTA Y SEGURA)
// ==========================================
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        // Logs para depuración
        console.log(`📡 Conectando a: ${API_BASE}${endpoint}`);

        const response = await fetch(API_BASE + endpoint, options);
        
        // Validar si el servidor respondió con error (404, 500, etc)
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        // Intentar obtener texto primero para validar si es JSON o HTML
        const text = await response.text();
        
        try {
            return JSON.parse(text); // Intentamos convertir a JSON
        } catch (e) {
            console.error("❌ Respuesta no válida (HTML recibido):", text);
            throw new Error("El servidor devolvió datos inválidos (HTML). Revisa la ruta del archivo PHP.");
        }

    } catch (error) {
        console.error('Error en API call:', error);
        showModal('Error de Conexión', error.message);
        return null; // Retornamos null para que la UI sepa que falló
    }
}

// ==========================================
// VALIDACIONES Y CONSTANTES
// ==========================================

const VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val), // Formato SV: 0614-010190-102-1
    nrc: (val) => /^\d{2,8}$/.test(val) // NRC simple
};

const TIPOS_PRESTAMO = [
    { id: 'personal', nombre: 'Personal', tasa_base: 12 },
    { id: 'hipotecario', nombre: 'Hipotecario', tasa_base: 8 },
    { id: 'agricola', nombre: 'Agrícola', tasa_base: 6 },
    { id: 'construccion', nombre: 'Construcción', tasa_base: 9 },
    { id: 'empresa', nombre: 'Capital Semilla/Empresa', tasa_base: 10 }
];

const PORCENTAJES_DEPRECIACION = {
    edificaciones: { porcentaje: 0.05, vida: 20, label: 'Edificaciones (5%)' },
    maquinaria: { porcentaje: 0.20, vida: 5, label: 'Maquinaria (20%)' },
    vehiculos: { porcentaje: 0.25, vida: 4, label: 'Vehículos (25%)' },
    otros: { porcentaje: 0.50, vida: 2, label: 'Otros Bienes (50%)' }
};

const CONFIG_GARANTIAS = {
    estados: {
        'tramite': { label: 'En Trámite', class: 'bg-yellow-100 text-yellow-800' },
        'vigente': { label: 'Vigente', class: 'bg-green-100 text-green-800' },
        'deteriorada': { label: 'Deteriorada', class: 'bg-red-100 text-red-800' },
        'ejecucion': { label: 'En Ejecución', class: 'bg-orange-100 text-orange-800' },
        'liberada': { label: 'Liberada', class: 'bg-gray-100 text-gray-800' }
    },
    tipos: {
        1: 'Prenda sin Desplazamiento',
        2: 'Inventario',
        3: 'Cesión de Derechos',
        4: 'Acciones',
        5: 'Depósito a Plazo'
    }
};