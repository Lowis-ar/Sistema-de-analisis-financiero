const VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val),
    // AGREGADO: Validación para NRC (Registro de Contribuyente - Empresas)
    nrc: (val) => /^\d{2,8}$/.test(val),
    // AGREGADO: Validación básica para Folio RUG (Registro Garantías)
    rug: (val) => /^[A-Z0-9-]{4,20}$/i.test(val)
};

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

// AGREGADO: Formateador de NIT automático (0000-000000-000-0)
function formatNIT(value) {
    // Elimina todo lo que no sea número
    const v = value.replace(/\D/g, '').substring(0, 14);
    const parts = [];

    if (v.length > 0) parts.push(v.substring(0, 4));
    if (v.length > 4) parts.push(v.substring(4, 10));
    if (v.length > 10) parts.push(v.substring(10, 13));
    if (v.length > 13) parts.push(v.substring(13, 14));

    return parts.join('-');
}

function generarCodigoActivo(inst, unidad, tipo, correlativo) {
    return `${inst}-${unidad}-${tipo}-${correlativo.toString().padStart(4, '0')}`;
}

function calcularCuota(monto, tasaAnual, plazoMeses) {
    if (!monto || !tasaAnual || !plazoMeses) return 0;
    const tasaMensual = (tasaAnual / 100) / 12;
    return (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
}

// AGREGADO: Calcula la cobertura de la garantía vs el préstamo (LTV)
function calcularCoberturaGarantia(valorGarantia, montoPrestamo) {
    if (!montoPrestamo || montoPrestamo === 0) return 0;
    return (valorGarantia / montoPrestamo) * 100;
}

// AGREGADO: Calcula días restantes para vencimiento (Seguros/Avalúos)
function calcularDiasRestantes(fechaVencimiento) {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    
    if (isNaN(vencimiento.getTime())) return null;

    const diffTime = vencimiento - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return diffDays; // Si es negativo, ya venció
}

function calcularDepreciacionActual(activo) {
    const fechaCompra = new Date(activo.fecha_compra);
    const hoy = new Date();
    
    if (isNaN(fechaCompra.getTime())) return { diaria: 0, acumulada: 0, libros: activo.valor };
    
    const diffTime = Math.abs(hoy - fechaCompra);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const depAnual = activo.valor * activo.porcentaje_depreciacion;
    const depDiaria = depAnual / 365;
    
    const depreciacionAcumulada = depDiaria * diffDays;
    const valorLibros = activo.valor - depreciacionAcumulada;
    
    return {
        diaria: depDiaria,
        acumulada: depreciacionAcumulada > activo.valor ? activo.valor : depreciacionAcumulada,
        libros: valorLibros < 0 ? 0 : valorLibros
    };
}

function createCard(children, className = "") {
    return `<div class="card ${className}">${children}</div>`;
}

function createButton({ onClick, children, variant = "primary", className = "", type = "button", disabled = false }) {
    const baseStyle = "btn";
    const variants = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        danger: "btn-danger", // Usar bg-red-600 en CSS
        success: "btn-success"
    };
    
    return `<button type="${type}" onclick="${onClick}" ${disabled ? 'disabled' : ''} class="${baseStyle} ${variants[variant]} ${className}">
        ${children}
    </button>`;
}

// AGREGADO: Generador de Badges (Etiquetas) para Estados de Garantía
function getBadgeEstado(estado) {
    const estilos = {
        'tramite': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'vigente': 'bg-green-100 text-green-800 border-green-200',
        'deteriorada': 'bg-red-100 text-red-800 border-red-200',
        'ejecucion': 'bg-orange-100 text-orange-800 border-orange-200',
        'liberada': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const clase = estilos[estado] || 'bg-gray-100 text-gray-800';
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full border ${clase}">${estado.toUpperCase()}</span>`;
}

function createInputGroup({ label, error, children }) {
    return `
        <div class="input-group">
            <label>${label}</label>
            ${children}
            ${error ? `<p class="error-message"><i class="fas fa-exclamation-circle"></i>${error}</p>` : ''}
        </div>
    `;
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`api/${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('Error en la llamada a la API:', error);
        showNotification('Error de conexión', 'error');
        return null;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${
        type === 'error' ? 'bg-red-500 text-white' : 
        type === 'success' ? 'bg-green-500 text-white' : 
        'bg-blue-500 text-white'
    } z-50 transition-opacity duration-300`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Hacer que las funciones estén disponibles globalmente
window.setActiveTab = setActiveTab;
window.toggleClientesView = toggleClientesView;
window.updateClienteFormData = updateClienteFormData;
window.handleClienteSubmit = handleClienteSubmit;

// AGREGADO: Exponer las nuevas funciones al objeto window
window.formatNIT = formatNIT;
window.calcularCoberturaGarantia = calcularCoberturaGarantia;
window.calcularDiasRestantes = calcularDiasRestantes;
window.getBadgeEstado = getBadgeEstado;
window.VALIDATORS = VALIDATORS; // Exponer validadores actualizados