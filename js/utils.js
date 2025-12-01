const VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val)
};

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(amount);
}

function generarCodigoActivo(inst, unidad, tipo, correlativo) {
    return `${inst}-${unidad}-${tipo}-${correlativo.toString().padStart(4, '0')}`;
}

function calcularCuota(monto, tasaAnual, plazoMeses) {
    if (!monto || !tasaAnual || !plazoMeses) return 0;
    const tasaMensual = (tasaAnual / 100) / 12;
    return (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
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
        danger: "btn-danger",
        success: "btn-success"
    };
    
    return `<button type="${type}" onclick="${onClick}" ${disabled ? 'disabled' : ''} class="${baseStyle} ${variants[variant]} ${className}">
        ${children}
    </button>`;
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
    } z-50`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Añade esto al final de utils.js
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
// Añade aquí las otras funciones que necesites exponer globalmente