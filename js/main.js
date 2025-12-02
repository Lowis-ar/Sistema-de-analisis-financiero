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
// 3. CONSTANTES Y VALIDACIONES
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