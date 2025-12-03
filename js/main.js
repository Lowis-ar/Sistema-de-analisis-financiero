// Configuración global
const API_BASE = 'api/';

// ==========================================
// 1. UTILIDADES DE FORMATO Y UI
// ==========================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatNIT(value) {
    // Formato: 0000-000000-000-0
    let v = value.replace(/\D/g, '').substring(0, 14);
    let parts = [];
    if (v.length > 0) parts.push(v.substring(0, 4));
    if (v.length > 4) parts.push(v.substring(4, 10));
    if (v.length > 10) parts.push(v.substring(10, 13));
    if (v.length > 13) parts.push(v.substring(13, 14));
    return parts.join('-');
}

function createCard(children, className = "") {
    return `<div class="card ${className}">${children}</div>`;
}

function getBadgeEstado(estado) {
    const estilos = {
        'tramite': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'vigente': 'bg-green-100 text-green-800 border-green-200',
        'deteriorada': 'bg-red-100 text-red-800 border-red-200',
        'ejecucion': 'bg-orange-100 text-orange-800 border-orange-200',
        'liberada': 'bg-gray-100 text-gray-800 border-gray-200',
        'normal': 'bg-blue-100 text-blue-800 border-blue-200',
        'mora': 'bg-red-100 text-red-800 border-red-200',
        'incobrable': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const clase = estilos[estado] || 'bg-gray-100 text-gray-800';
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full border ${clase}">${estado.toUpperCase()}</span>`;
}

function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 transition-opacity duration-300 ${
        type === 'error' ? 'bg-red-500 text-white' : 
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    // Añadir icono según tipo
    const icon = type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'success' ? 'fa-check-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icon} mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
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
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function showLoading() {
    const content = document.getElementById('main-content');
    if (content) {
        content.innerHTML = `
            <div class="flex justify-center items-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        `;
    }
}

// ==========================================
// 2. CONEXIÓN API ROBUSTA
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
        
        const response = await fetch(API_BASE + endpoint, options);
        
        // Verificar errores HTTP (404, 500, etc)
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("❌ El servidor devolvió HTML en lugar de JSON:", text);
            throw new Error("Respuesta inválida del servidor (HTML). Revisa la consola.");
        }

    } catch (error) {
        console.error('Error en API call:', error);
        showModal('Error de Conexión', error.message);
        return { error: error.message }; // Retornar objeto de error seguro
    }
}

// ==========================================
// 3. FUNCIONES DE CÁLCULO
// ==========================================

function calcularCuota(monto, tasaAnual, plazoMeses) {
    if (!monto || !tasaAnual || !plazoMeses) return 0;
    const tasaMensual = (tasaAnual / 100) / 12;
    return (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
}

// ==========================================
// 4. CONSTANTES Y VALIDACIONES
// ==========================================

const VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val),
    nrc: (val) => /^\d{2,8}$/.test(val)
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

// ==========================================
// 5. HACER FUNCIONES GLOBALES
// ==========================================

window.formatCurrency = formatCurrency;
window.formatNIT = formatNIT;
window.createCard = createCard;
window.getBadgeEstado = getBadgeEstado;
window.showNotification = showNotification;
window.showModal = showModal;
window.closeModal = closeModal;
window.showLoading = showLoading;
window.apiCall = apiCall;
window.calcularCuota = calcularCuota;
window.VALIDATORS = VALIDATORS;


// Función para mostrar menú de créditos
function showPrestamosMenu() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Créditos</h2>
                    <p class="text-gray-600 text-sm">Seleccione el tipo de cliente</p>
                </div>
                <button onclick="showDashboard()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left mr-2"></i> Volver
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Tarjeta Personas Naturales -->
                <div class="card cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" 
                     onclick="showPrestamosNaturales()">
                    <div class="text-center p-8">
                        <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user text-3xl text-blue-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Personas Naturales</h3>
                        <p class="text-gray-600 mb-4">Préstamos para individuos con garantías personales o hipotecarias</p>
                        <div class="space-y-2 text-left">
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2"></i>
                                <span class="text-sm">Fiador (Aval)</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2"></i>
                                <span class="text-sm">Codeudor Solidario</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2"></i>
                                <span class="text-sm">Hipoteca</span>
                            </div>
                        </div>
                        <button class="btn btn-primary mt-6 w-full">
                            <i class="fas fa-arrow-right mr-2"></i> Acceder
                        </button>
                    </div>
                </div>
                
                <!-- Tarjeta Personas Jurídicas -->
                <div class="card cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" 
                     onclick="showPrestamosJuridicos()">
                    <div class="text-center p-8">
                        <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-building text-3xl text-green-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Personas Jurídicas</h3>
                        <p class="text-gray-600 mb-4">Préstamos para empresas con garantías mobiliarias y comerciales</p>
                        <div class="space-y-2 text-left">
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2"></i>
                                <span class="text-sm">Garantía Mobiliaria</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2"></i>
                                <span class="text-sm">Prenda Industrial</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2"></i>
                                <span class="text-sm">Fideicomiso</span>
                            </div>
                        </div>
                        <button class="btn btn-success mt-6 w-full">
                            <i class="fas fa-arrow-right mr-2"></i> Acceder
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Estadísticas rápidas -->
            <div class="card">
                <h3 class="text-lg font-bold mb-4">Resumen General de Créditos</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <p class="text-sm text-blue-800">Total Activos</p>
                        <p class="text-2xl font-bold text-blue-900">0</p>
                        <p class="text-xs text-blue-600">Préstamos vigentes</p>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <p class="text-sm text-green-800">Cartera Total</p>
                        <p class="text-2xl font-bold text-green-900">$0.00</p>
                        <p class="text-xs text-green-600">Saldo pendiente</p>
                    </div>
                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                        <p class="text-sm text-purple-800">En Mora</p>
                        <p class="text-2xl font-bold text-purple-900">0</p>
                        <p class="text-xs text-purple-600">Préstamos atrasados</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

function loadModule(modulePath) {
    showLoading();
    try {
        // Remover el script anterior si existe
        const existingScript = document.querySelector(`script[src="${modulePath}"]`);
        if (existingScript) {
            existingScript.remove();
        }
        
        // Cargar el nuevo script
        const script = document.createElement('script');
        script.src = modulePath;
        script.onload = function() {
            console.log('Módulo cargado:', modulePath);
        };
        script.onerror = function() {
            showModal('Error', 'No se pudo cargar el módulo: ' + modulePath);
            showDashboard();
        };
        
        document.head.appendChild(script);
        
    } catch (error) {
        console.error('Error al cargar módulo:', error);
        showModal('Error', 'Error al cargar el módulo');
        showDashboard();
    }
}

// Función específica para cobros naturales
function loadCobrosNaturalesModule() {
    loadModule('js/modules/cobros_naturales.js');
}

// Hacer funciones disponibles globalmente
window.loadModule = loadModule;
window.loadCobrosNaturalesModule = loadCobrosNaturalesModule;

// Hacer función disponible globalmente
window.showPrestamosMenu = showPrestamosMenu;
