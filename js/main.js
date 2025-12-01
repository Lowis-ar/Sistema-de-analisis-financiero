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