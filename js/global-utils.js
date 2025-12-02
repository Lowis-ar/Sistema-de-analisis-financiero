// js/global-utils.js
// Funciones globales que deben estar disponibles en todos los módulos

// ==========================================
// FUNCIONES DE UI
// ==========================================

function createCard(children, className = "") {
    return `<div class="card ${className}">${children}</div>`;
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
    notification.textContent = message;
    
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

// ==========================================
// FUNCIONES DE FORMATO
// ==========================================

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('es-SV', { 
        style: 'currency', 
        currency: 'USD' 
    }).format(amount);
}

function formatNIT(value) {
    if (!value) return '';
    let v = value.replace(/\D/g, '').substring(0, 14);
    let parts = [];
    if (v.length > 0) parts.push(v.substring(0, 4));
    if (v.length > 4) parts.push(v.substring(4, 10));
    if (v.length > 10) parts.push(v.substring(10, 13));
    if (v.length > 13) parts.push(v.substring(13, 14));
    return parts.join('-');
}

// ==========================================
// FUNCIONES DE VALIDACIÓN
// ==========================================

const VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val),
    nrc: (val) => /^\d{2,8}$/.test(val)
};

// ==========================================
// FUNCIONES DE CÁLCULO
// ==========================================

function calcularCuota(monto, tasaAnual, plazoMeses) {
    if (!monto || !tasaAnual || !plazoMeses) return 0;
    const tasaMensual = (tasaAnual / 100) / 12;
    return (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
}

// ==========================================
// FUNCIONES DE API
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
        
        const response = await fetch('api/' + endpoint, options);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Respuesta inválida del servidor:", text);
            throw new Error("Respuesta inválida del servidor");
        }

    } catch (error) {
        console.error('Error en API call:', error);
        showNotification('Error de conexión: ' + error.message, 'error');
        return { error: error.message };
    }
}

// ==========================================
// EXPORTAR AL OBJETO GLOBAL
// ==========================================

window.createCard = createCard;
window.showNotification = showNotification;
window.getBadgeEstado = getBadgeEstado;
window.formatCurrency = formatCurrency;
window.formatNIT = formatNIT;
window.VALIDATORS = VALIDATORS;
window.calcularCuota = calcularCuota;
window.apiCall = apiCall;