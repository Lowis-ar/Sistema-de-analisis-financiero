// Configuración global
const API_BASE = 'api/';

// Funciones de utilidad
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

function showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').classList.add('flex');
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

// Funciones de navegación
function showDashboard() {
    loadDashboard();
    updateActiveTab('dashboard');
}

function showClientes() {
    loadClientes();
    updateActiveTab('clientes');
}

function showPrestamos() {
    loadPrestamos();
    updateActiveTab('creditos');
}

function showActivos() {
    loadActivos();
    updateActiveTab('activos');
}

function updateActiveTab(activeTab) {
    // Actualizar sidebar
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('hover:bg-slate-700');
    });
    
    // Encontrar y activar el botón correcto
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.textContent.includes(activeTab === 'dashboard' ? 'Dashboard' : 
                                     activeTab === 'clientes' ? 'Clientes' :
                                     activeTab === 'creditos' ? 'Créditos' : 'Activos')) {
            btn.classList.add('bg-blue-600');
            btn.classList.remove('hover:bg-slate-700');
        }
    });
}

// Función para hacer llamadas API
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
        
        const response = await fetch(API_BASE + endpoint, options);
        return await response.json();
    } catch (error) {
        console.error('Error en API call:', error);
        showModal('Error', 'Error de conexión con el servidor');
        return null;
    }
}

// Validaciones
const VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val)
};

// Constantes
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

/* =========================================================================
   EXTENSIÓN: MÓDULO DE GARANTÍAS Y CLIENTES JURÍDICOS
   Agrega esta sección al final de tu archivo main.js
=========================================================================
*/

// 1. Función de navegación para Garantías
function showGarantias() {
    // Intentamos usar la función del módulo si existe (app.js)
    if (typeof loadGarantiasModule === 'function') {
        loadGarantiasModule();
    } else if (typeof loadGarantias === 'function') {
        // Fallback por si acaso se llamó diferente
        loadGarantias();
    }
    
    // Llamamos a la función de UI
    updateActiveTab('garantias');
    
    // Si estamos usando el appState global (app.js), lo sincronizamos
    if (typeof appState !== 'undefined') {
        appState.activeTab = 'garantias';
    }
}

// 2. Sobreescritura de updateActiveTab 
// (Necesaria para que reconozca el nuevo botón de "Garantías")
const originalUpdateActiveTab = updateActiveTab; // Guardamos referencia por seguridad

updateActiveTab = function(activeTab) {
    // Limpiar estilos anteriores
    document.querySelectorAll('.tab-btn, .tab-button').forEach(btn => {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('hover:bg-slate-700');
    });
    
    // Definir palabras clave para cada tab
    const tabKeywords = {
        'dashboard': ['Dashboard'],
        'clientes': ['Clientes'],
        'creditos': ['Créditos', 'Credit'],
        'activos': ['Activos'],
        'garantias': ['Garantías', 'Garantias'] // Nuevo soporte
    };

    const keywords = tabKeywords[activeTab] || [];

    // Encontrar y activar el botón correcto
    const buttons = document.querySelectorAll('.tab-btn, .tab-button');
    buttons.forEach(btn => {
        const text = btn.textContent;
        const onclickAttr = btn.getAttribute('onclick') || '';
        const dataTab = btn.getAttribute('data-tab') || '';

        // Verificamos si el botón coincide por texto, función onclick o data-attribute
        const matchText = keywords.some(k => text.includes(k));
        const matchFunc = onclickAttr.includes(activeTab);
        const matchData = dataTab === activeTab;

        if (matchText || matchFunc || matchData) {
            btn.classList.add('bg-blue-600');
            btn.classList.remove('hover:bg-slate-700');
        }
    });
};

// 3. Nuevos Validadores para El Salvador (Empresas)
// Se agregan al objeto VALIDATORS existente
VALIDATORS.nit = (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val); // Formato 0614-010190-102-1
VALIDATORS.nrc = (val) => /^\d{2,8}$/.test(val); // NRC suele ser numérico simple

// 4. Helper de formateo para Inputs (NIT)
function formatNIT(value) {
    // Elimina caracteres no numéricos
    let v = value.replace(/\D/g, '').substring(0, 14);
    let parts = [];
    
    // Construye: 0000-000000-000-0
    if (v.length > 0) parts.push(v.substring(0, 4));
    if (v.length > 4) parts.push(v.substring(4, 10));
    if (v.length > 10) parts.push(v.substring(10, 13));
    if (v.length > 13) parts.push(v.substring(13, 14));
    
    return parts.join('-');
}

// 5. Configuración visual para Estados de Garantía
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