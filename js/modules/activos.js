// js/modules/activos.js - VERSIÓN COMPLETA Y FUNCIONAL CON CÁLCULOS CORREGIDOS

let activosView = 'list';
let currentModal = null;
let currentTab = 'activos'; // 'activos' o 'bajas'

// ==================== CONSTANTES DE CONFIGURACIÓN ====================
const SUCURSALES = [
    { codigo: '2322-001', nombre: 'Matriz - Centro' },
    { codigo: '2322-002', nombre: 'Sucursal Norte' },
    { codigo: '2322-003', nombre: 'Sucursal Sur' },
    { codigo: '2322-004', nombre: 'Sucursal Este' },
    { codigo: '2322-005', nombre: 'Sucursal Oeste' }
];

const DEPARTAMENTOS = [
    { codigo: '5670', nombre: 'Dirección General' },
    { codigo: '5671', nombre: 'Gerencia' },
    { codigo: '5672', nombre: 'Administración' },
    { codigo: '5673', nombre: 'Contabilidad' },
    { codigo: '5674', nombre: 'Recursos Humanos' },
    { codigo: '5675', nombre: 'Tecnología (TI)' },
    { codigo: '5676', nombre: 'Ventas' },
    { codigo: '5677', nombre: 'Marketing' },
    { codigo: '5678', nombre: 'Operaciones' },
    { codigo: '5679', nombre: 'Almacén' },
    { codigo: '5680', nombre: 'Producción' },
    { codigo: '5681', nombre: 'Mantenimiento' },
    { codigo: '5682', nombre: 'Logística' },
    { codigo: '5683', nombre: 'Servicio al Cliente' }
];

const DEPRECIACION_LISR = {
    '0100': { label: 'Edificaciones', porcentaje: 0.05, vida_util: 20 },
    '0200': { label: 'Mobiliario y equipo', porcentaje: 0.10, vida_util: 10 },
    '0300': { label: 'Equipo de transporte', porcentaje: 0.25, vida_util: 4 },
    '0400': { label: 'Maquinaria y equipo', porcentaje: 0.10, vida_util: 10 },
    '0500': { label: 'Equipo de cómputo', porcentaje: 0.30, vida_util: 4 },
    '0600': { label: 'Herramientas', porcentaje: 0.30, vida_util: 4 },
    '0700': { label: 'Instalaciones', porcentaje: 0.10, vida_util: 10 },
    '0800': { label: 'Equipo médico', porcentaje: 0.20, vida_util: 5 }
};

// ==================== SISTEMA DE MODALES INTEGRADO ====================
function showModal(title, content, buttons = []) {
    // Cerrar modal anterior si existe
    if (currentModal) {
        currentModal.remove();
    }
    
    // Botones por defecto
    const defaultButtons = [{
        text: 'Cerrar',
        class: 'btn-secondary',
        onClick: 'closeModal()'
    }];
    
    const modalButtons = buttons.length > 0 ? buttons : defaultButtons;
    
    // Crear HTML del modal
    const modalHTML = `
        <div id="customModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style="z-index: 9999;">
            <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-bold text-gray-800">${title}</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-4">${content}</div>
                <div class="p-4 border-t flex justify-end space-x-3">
                    ${modalButtons.map(btn => `
                        <button class="btn ${btn.class}" onclick="${btn.onClick}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Agregar al body
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
    currentModal = modalDiv;
}

function closeModal() {
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
    }
}

// ==================== FUNCIONES AUXILIARES ====================
function formatCurrency(amount) {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('es-SV', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-SV', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showLoading() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="flex justify-center items-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        `;
    }
}

// ==================== FUNCIÓN CORREGIDA DE CÁLCULO DE DEPRECIACIÓN ====================
function calcularDepreciacionDiariaExacta(activo) {
    if (!activo.fecha_compra || !activo.valor) {
        return {
            diaria: 0,
            acumulada: 0,
            valorLibros: activo.valor || 0,
            diasTranscurridos: 0,
            diasDepreciables: 0
        };
    }
    
    const hoy = new Date();
    const fechaCompra = new Date(activo.fecha_compra);
    
    // Si la fecha de compra es futura, no hay depreciación
    if (fechaCompra > hoy) {
        const porcentajeDep = activo.porcentaje_depreciacion || DEPRECIACION_LISR[activo.tipo_codigo]?.porcentaje || 0;
        const depreciacionDiaria = (activo.valor * porcentajeDep) / 365;
        
        return {
            diaria: depreciacionDiaria,
            acumulada: 0,
            valorLibros: activo.valor,
            diasTranscurridos: 0,
            diasDepreciables: 0
        };
    }
    
    // Diferencia en días
    const diffTiempo = hoy.getTime() - fechaCompra.getTime();
    const diasTranscurridos = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
    
    // Depreciación diaria
    const porcentajeDep = activo.porcentaje_depreciacion || DEPRECIACION_LISR[activo.tipo_codigo]?.porcentaje || 0;
    const depreciacionAnual = activo.valor * porcentajeDep;
    const depreciacionDiaria = depreciacionAnual / 365;
    
    // Vida útil en días
    const vidaUtil = activo.vida_util || DEPRECIACION_LISR[activo.tipo_codigo]?.vida_util || 1;
    const diasVidaUtil = vidaUtil * 365;
    
    // Días depreciables (no puede superar la vida útil)
    const diasDepreciables = Math.min(diasTranscurridos, diasVidaUtil);
    
    // Depreciación acumulada
    const depreciacionAcumulada = depreciacionDiaria * diasDepreciables;
    
    // Valor en libros (nunca negativo)
    const valorLibros = Math.max(0, activo.valor - depreciacionAcumulada);
    
    return {
        diaria: depreciacionDiaria,
        acumulada: depreciacionAcumulada,
        valorLibros: valorLibros,
        diasTranscurridos: diasTranscurridos,
        diasDepreciables: diasDepreciables
    };
}

// ==================== FUNCIONES PRINCIPALES ====================
function loadActivos() {
    showLoading();
    
    setTimeout(async () => {
        try {
            const activos = await apiCall('activos.php');
            
            if (activos && !activos.error) {
                renderActivos(activos);
            } else {
                document.getElementById('main-content').innerHTML = `
                    <div class="card">
                        <h2 class="text-2xl font-bold text-gray-800 mb-6">Activos Fijos</h2>
                        <div class="text-center py-8 text-red-500">
                            <p>Error al cargar activos</p>
                            <p class="text-sm">${activos?.error || 'Error desconocido'}</p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Activos Fijos</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error de conexión</p>
                        <p class="text-sm">No se pudo conectar al servidor</p>
                    </div>
                </div>
            `;
        }
    }, 300);
}

// Función para cargar bajas
async function loadBajas() {
    showLoading();
    
    try {
        const bajas = await apiCall('activos.php?action=bajas');
        
        if (bajas && !bajas.error) {
            renderBajas(bajas);
        } else {
            showModal('Error', 'Error al cargar el historial de bajas');
            loadActivos(); // Volver a la vista de activos
        }
    } catch (error) {
        showModal('Error', 'Error de conexión con el servidor');
        loadActivos(); // Volver a la vista de activos
    }
}

function renderActivos(activos) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Activos Fijos</h2>
                <div class="flex space-x-2">
                    <button onclick="mostrarReporteDepreciacion()" class="btn btn-secondary">
                        <i class="fas fa-calculator mr-2"></i> Depreciación
                    </button>
                    <button onclick="showNewActivoForm()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Nuevo Activo
                    </button>
                </div>
            </div>
            
            <!-- Pestañas para alternar entre activos y bajas -->
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-4">
                    <button onclick="switchTab('activos')" 
                            class="${currentTab === 'activos' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200">
                        <i class="fas fa-building mr-2"></i> Activos Activos
                        <span class="ml-1 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            ${activos.filter(a => !a.estado || a.estado === 'activo').length}
                        </span>
                    </button>
                    <button onclick="switchTab('bajas')" 
                            class="${currentTab === 'bajas' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200">
                        <i class="fas fa-trash-alt mr-2"></i> Historial de Bajas
                    </button>
                </nav>
            </div>
            
            ${currentTab === 'activos' ? (
                activosView === 'list' ? renderActivosList(activos) : renderNewActivoForm()
            ) : renderBajasSection()}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Si estamos en la pestaña de bajas, cargarlas
    if (currentTab === 'bajas') {
        loadBajas();
    }
}

function switchTab(tab) {
    currentTab = tab;
    activosView = 'list';
    loadActivos();
}

function renderActivosList(activos) {
    const activosActivos = activos.filter(a => !a.estado || a.estado === 'activo');
    
    if (activosActivos.length === 0) {
        return `
            <div class="card text-center py-12">
                <i class="fas fa-building text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay activos activos</h3>
                <p class="text-gray-500 mb-6">Comienza registrando tu primer activo fijo</p>
                <button onclick="showNewActivoForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Registrar Activo
                </button>
            </div>
        `;
    }
    
    const activosHTML = activosActivos.map(activo => {
        const dep = calcularDepreciacionDiariaExacta(activo);
        
        const sucursalInfo = SUCURSALES.find(s => s.codigo === activo.institucion) || 
                           { nombre: activo.institucion_nombre || 'N/A' };
        const deptoInfo = DEPARTAMENTOS.find(d => d.codigo === activo.unidad_codigo) || 
                        { nombre: activo.unidad || 'N/A' };
        
        return `
            <div class="card border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="font-bold text-lg text-gray-800">${activo.descripcion}</h3>
                        <p class="text-sm text-gray-600 font-mono">${activo.codigo}</p>
                        <p class="text-xs text-gray-500 mt-1">
                            <i class="fas fa-calendar-alt mr-1"></i> Adquirido: ${formatDate(activo.fecha_compra)}
                        </p>
                        <div class="flex flex-wrap gap-1 mt-1">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                <i class="fas fa-tag mr-1"></i> ${DEPRECIACION_LISR[activo.tipo_codigo]?.label || activo.tipo || 'Sin tipo'}
                            </span>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                <i class="fas fa-building mr-1"></i> ${deptoInfo.nombre}
                            </span>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                <i class="fas fa-map-marker-alt mr-1"></i> ${sucursalInfo.nombre}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="mostrarFormularioBaja(${activo.id})" 
                                class="btn btn-sm btn-danger"
                                title="Dar de baja">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div class="bg-gray-50 p-3 rounded">
                        <p class="text-xs text-gray-500 mb-1">Valor Original</p>
                        <p class="font-bold text-gray-800">${formatCurrency(activo.valor)}</p>
                    </div>
                    <div class="bg-red-50 p-3 rounded">
                        <p class="text-xs text-red-500 mb-1">Dep. Acumulada</p>
                        <p class="font-bold text-red-600">${formatCurrency(dep.acumulada)}</p>
                    </div>
                    <div class="bg-green-50 p-3 rounded">
                        <p class="text-xs text-green-500 mb-1">Valor en Libros</p>
                        <p class="font-bold text-green-600">${formatCurrency(dep.valorLibros)}</p>
                    </div>
                </div>
                
                <div class="mt-4 flex justify-between items-center text-xs text-gray-500">
                    <div>
                        <span class="inline-block mr-3">
                            <i class="fas fa-calendar-day mr-1"></i> Dep. diaria: ${formatCurrency(dep.diaria)}
                        </span>
                        <span class="inline-block">
                            <i class="fas fa-clock mr-1"></i> ${dep.diasTranscurridos} días transcurridos
                        </span>
                    </div>
                    <span class="text-purple-600 font-medium">
                        ${((activo.porcentaje_depreciacion || DEPRECIACION_LISR[activo.tipo_codigo]?.porcentaje || 0) * 100).toFixed(1)}% anual
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${activosHTML}</div>`;
}

function renderBajasSection() {
    return `
        <div class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Cargando historial de bajas...</p>
        </div>
    `;
}

function renderBajas(bajas) {
    if (bajas.length === 0) {
        document.getElementById('main-content').innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Activos Fijos</h2>
                    <div class="flex space-x-2">
                        <button onclick="mostrarReporteDepreciacion()" class="btn btn-secondary">
                            <i class="fas fa-calculator mr-2"></i> Depreciación
                        </button>
                        <button onclick="showNewActivoForm()" class="btn btn-primary">
                            <i class="fas fa-plus mr-2"></i> Nuevo Activo
                        </button>
                    </div>
                </div>
                
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-4">
                        <button onclick="switchTab('activos')" 
                                class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200">
                            <i class="fas fa-building mr-2"></i> Activos Activos
                        </button>
                        <button onclick="switchTab('bajas')" 
                                class="border-red-500 text-red-600 py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200">
                            <i class="fas fa-trash-alt mr-2"></i> Historial de Bajas
                        </button>
                    </nav>
                </div>
                
                <div class="card text-center py-12">
                    <i class="fas fa-trash-alt text-5xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay bajas registradas</h3>
                    <p class="text-gray-500 mb-6">No se han dado de baja activos todavía</p>
                    <button onclick="switchTab('activos')" class="btn btn-primary">
                        <i class="fas fa-arrow-left mr-2"></i> Ver Activos Activos
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    const bajasHTML = bajas.map(baja => {
        // Determinar icono y color según motivo
        let motivoInfo = {
            icon: 'fa-question-circle',
            color: 'text-gray-500',
            bgColor: 'bg-gray-100',
            label: 'Desconocido'
        };
        
        switch(baja.motivo) {
            case 'vendido':
                motivoInfo = {
                    icon: 'fa-dollar-sign',
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    label: 'Vendido'
                };
                break;
            case 'donado':
                motivoInfo = {
                    icon: 'fa-hands-helping',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    label: 'Donado'
                };
                break;
            case 'inhabilitado':
                motivoInfo = {
                    icon: 'fa-ban',
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    label: 'Inhabilitado'
                };
                break;
        }
        
        return `
            <div class="card border-l-4 ${motivoInfo.color.replace('text-', 'border-')}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-start">
                            <div class="${motivoInfo.bgColor} ${motivoInfo.color} p-2 rounded-lg mr-3">
                                <i class="fas ${motivoInfo.icon} text-lg"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg text-gray-800">${baja.descripcion}</h3>
                                <p class="text-sm text-gray-600 font-mono">${baja.codigo}</p>
                                <div class="flex flex-wrap gap-2 mt-2">
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs ${motivoInfo.bgColor} ${motivoInfo.color}">
                                        <i class="fas ${motivoInfo.icon} mr-1"></i> ${motivoInfo.label}
                                    </span>
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                        <i class="fas fa-building mr-1"></i> ${baja.unidad || 'N/A'}
                                    </span>
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                        <i class="fas fa-map-marker-alt mr-1"></i> ${baja.institucion || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div class="bg-gray-50 p-3 rounded">
                                <p class="text-xs text-gray-500 mb-1">Valor Original</p>
                                <p class="font-bold text-gray-800">${formatCurrency(baja.valor_original)}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded">
                                <p class="text-xs text-gray-500 mb-1">Fecha Compra</p>
                                <p class="font-bold text-gray-800">${formatDate(baja.fecha_compra)}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded">
                                <p class="text-xs text-gray-500 mb-1">Fecha Baja</p>
                                <p class="font-bold text-gray-800">${formatDate(baja.fecha_baja)}</p>
                            </div>
                        </div>
                        
                        <!-- Información específica según motivo -->
                        <div class="mt-4 p-3 ${motivoInfo.bgColor} rounded-lg">
                            <p class="text-sm font-medium ${motivoInfo.color} mb-1">
                                <i class="fas ${motivoInfo.icon} mr-1"></i> Detalles de la Baja
                            </p>
                            ${baja.motivo === 'vendido' ? `
                                <div class="space-y-2">
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-600">Valor de venta:</span>
                                        <span class="font-bold text-green-600">${formatCurrency(baja.valor_venta)}</span>
                                    </div>
                                    ${baja.receptor ? `
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm text-gray-600">Comprador:</span>
                                            <span class="font-medium text-gray-800">${baja.receptor}</span>
                                        </div>
                                    ` : ''}
                                    ${baja.observaciones ? `
                                        <div class="mt-2">
                                            <span class="text-sm text-gray-600 block mb-1">Observaciones:</span>
                                            <p class="text-sm text-gray-700 bg-white p-2 rounded">${baja.observaciones}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            ${baja.motivo === 'donado' ? `
                                <div class="space-y-2">
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-600">Institución receptora:</span>
                                        <span class="font-medium text-blue-600">${baja.receptor || 'No especificado'}</span>
                                    </div>
                                    ${baja.valor_venta ? `
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm text-gray-600">Valor donado:</span>
                                            <span class="font-bold text-blue-600">${formatCurrency(baja.valor_venta)}</span>
                                        </div>
                                    ` : ''}
                                    ${baja.observaciones ? `
                                        <div class="mt-2">
                                            <span class="text-sm text-gray-600 block mb-1">Observaciones:</span>
                                            <p class="text-sm text-gray-700 bg-white p-2 rounded">${baja.observaciones}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            ${baja.motivo === 'inhabilitado' ? `
                                <div class="space-y-2">
                                    <div class="text-sm text-gray-700">
                                        <i class="fas fa-exclamation-triangle mr-1 text-red-500"></i>
                                        ${baja.observaciones || 'Activo inhabilitado por obsolescencia o daño irreparable'}
                                    </div>
                                    ${baja.receptor ? `
                                        <div class="flex justify-between items-center mt-2">
                                            <span class="text-sm text-gray-600">Responsable de baja:</span>
                                            <span class="font-medium text-gray-800">${baja.receptor}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Resumen de la transacción -->
                        <div class="mt-3 flex justify-between items-center text-xs text-gray-500">
                            <div>
                                <span class="inline-block mr-3">
                                    <i class="fas fa-calendar-alt mr-1"></i> Registrado: ${formatDate(baja.fecha_registro)}
                                </span>
                            </div>
                            <span class="text-gray-600 font-medium">
                                ID: ${baja.id}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Activos Fijos</h2>
                <div class="flex space-x-2">
                    <button onclick="mostrarReporteDepreciacion()" class="btn btn-secondary">
                        <i class="fas fa-calculator mr-2"></i> Depreciación
                    </button>
                    <button onclick="showNewActivoForm()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Nuevo Activo
                    </button>
                </div>
            </div>
            
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-4">
                    <button onclick="switchTab('activos')" 
                            class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200">
                        <i class="fas fa-building mr-2"></i> Activos Activos
                    </button>
                    <button onclick="switchTab('bajas')" 
                            class="border-red-500 text-red-600 py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200">
                        <i class="fas fa-trash-alt mr-2"></i> Historial de Bajas
                        <span class="ml-1 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            ${bajas.length}
                        </span>
                    </button>
                </nav>
            </div>
            
            <!-- Resumen estadístico -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="card bg-gray-50">
                    <p class="text-sm text-gray-600">Total Bajas</p>
                    <p class="text-2xl font-bold text-gray-800">${bajas.length}</p>
                </div>
                <div class="card bg-green-50">
                    <p class="text-sm text-green-600">Vendidos</p>
                    <p class="text-2xl font-bold text-green-700">${bajas.filter(b => b.motivo === 'vendido').length}</p>
                </div>
                <div class="card bg-blue-50">
                    <p class="text-sm text-blue-600">Donados</p>
                    <p class="text-2xl font-bold text-blue-700">${bajas.filter(b => b.motivo === 'donado').length}</p>
                </div>
                <div class="card bg-red-50">
                    <p class="text-sm text-red-600">Inhabilitados</p>
                    <p class="text-2xl font-bold text-red-700">${bajas.filter(b => b.motivo === 'inhabilitado').length}</p>
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="card">
                <div class="flex flex-col md:flex-row justify-between items-center gap-3">
                    <div>
                        <h3 class="font-bold text-gray-800">Historial de Bajas de Activos</h3>
                        <p class="text-sm text-gray-500">${bajas.length} registros encontrados</p>
                    </div>
                   
                </div>
            </div>
            
            <!-- Lista de bajas -->
            <div class="grid grid-cols-1 gap-4">
                ${bajasHTML}
            </div>
            
            <!-- Información adicional -->
            <div class="bg-gray-50 p-4 rounded-lg border text-sm text-gray-600">
                <h4 class="font-bold text-gray-700 mb-2"><i class="fas fa-info-circle mr-1"></i> Información sobre las bajas</h4>
                <ul class="space-y-1">
                    <li>• <span class="font-medium">Vendidos:</span> Activos que fueron vendidos a terceros</li>
                    <li>• <span class="font-medium">Donados:</span> Activos transferidos sin contraprestación</li>
                    <li>• <span class="font-medium">Inhabilitados:</span> Activos que ya no son útiles por obsolescencia o daño</li>
                    <li>• Los activos dados de baja ya no se deprecian ni forman parte del inventario</li>
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}


function showNewActivoForm() {
    activosView = 'form';
    currentTab = 'activos';
    loadActivos();
}

function renderNewActivoForm() {
    // Generar opciones para los selects
    const tiposOptions = Object.entries(DEPRECIACION_LISR).map(([key, value]) => 
        `<option value="${key}">${value.label} (${(value.porcentaje * 100)}% anual - ${value.vida_util} años)</option>`
    ).join('');
    
    const sucursalesOptions = SUCURSALES.map(sucursal => 
        `<option value="${sucursal.codigo}">${sucursal.nombre} (${sucursal.codigo})</option>`
    ).join('');
    
    const departamentosOptions = DEPARTAMENTOS.map(depto => 
        `<option value="${depto.codigo}">${depto.nombre} (${depto.codigo})</option>`
    ).join('');
    
    return `
        <div class="card max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Nuevo Activo Fijo</h3>
                    <p class="text-sm text-gray-500">Complete todos los campos requeridos (*)</p>
                </div>
                <button onclick="cancelNewActivo()" class="btn btn-secondary">
                    <i class="fas fa-times mr-2"></i> Cancelar
                </button>
            </div>
            
            <form id="formActivo" onsubmit="saveActivo(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="input-group">
                        <label for="descripcion" class="required">Descripción *</label>
                        <input type="text" id="descripcion" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                               required placeholder="Ej: Edificio principal, Vehículo de reparto, Computadora portátil">
                    </div>
                    
                    <div class="input-group">
                        <label for="tipo_codigo" class="required">Tipo de Activo *</label>
                        <select id="tipo_codigo" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                                required onchange="actualizarInfoDepreciacion(this)">
                            <option value="">Seleccione un tipo</option>
                            ${tiposOptions}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="valor" class="required">Valor de Adquisición ($) *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input type="number" id="valor" class="w-full p-3 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                                   required min="0.01" step="0.01" placeholder="0.00">
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="fecha_compra" class="required">Fecha de Compra *</label>
                        <input type="date" id="fecha_compra" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                               required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="input-group">
                        <label for="institucion">Sucursal/Institución</label>
                        <select id="institucion" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                            <option value="">Seleccione una sucursal</option>
                            ${sucursalesOptions}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="unidad_codigo">Departamento/Unidad</label>
                        <select id="unidad_codigo" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                            <option value="">Seleccione un departamento</option>
                            ${departamentosOptions}
                        </select>
                    </div>
                    
                    <div class="input-group md:col-span-2">
                        <label for="caracteristicas">Características Adicionales</label>
                        <textarea id="caracteristicas" class="w-full p-3 border border-gray-300 rounded-lg" 
                                  rows="2" placeholder="Marca, modelo, serie, color, especificaciones..."></textarea>
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p class="text-sm font-medium text-blue-800 mb-1">
                                <i class="fas fa-book mr-1"></i> Información de Depreciación (LISR Artículo 30)
                            </p>
                            <p id="info-depreciacion" class="text-lg font-bold text-blue-900">
                                Seleccione un tipo de activo para ver detalles
                            </p>
                        </div>
                        <button type="submit" class="btn btn-success px-6 py-3">
                            <i class="fas fa-save mr-2"></i> Registrar Activo
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
}

function actualizarInfoDepreciacion(select) {
    const tipo = select.value;
    const infoElement = document.getElementById('info-depreciacion');
    
    if (tipo && DEPRECIACION_LISR[tipo]) {
        const info = DEPRECIACION_LISR[tipo];
        infoElement.innerHTML = `
            <span class="text-blue-700">${info.label}</span><br>
            <span class="text-blue-600">${(info.porcentaje * 100)}% anual • Vida útil: ${info.vida_util} años</span><br>
            <small class="text-blue-500">Depreciación máxima permitida por ley</small>
        `;
    } else {
        infoElement.textContent = 'Seleccione un tipo de activo para ver detalles';
    }
}

function cancelNewActivo() {
    activosView = 'list';
    loadActivos();
}

async function saveActivo(event) {
    event.preventDefault();
    
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';
    btnSubmit.disabled = true;
    
    try {
        // Obtener valores de los selects
        const institucionSelect = document.getElementById('institucion');
        const unidadSelect = document.getElementById('unidad_codigo');
        
        // Obtener el texto seleccionado
        const institucionSeleccionada = institucionSelect.options[institucionSelect.selectedIndex];
        const unidadSeleccionada = unidadSelect.options[unidadSelect.selectedIndex];
        
        const formData = {
            descripcion: document.getElementById('descripcion').value,
            tipo_codigo: document.getElementById('tipo_codigo').value,
            valor: parseFloat(document.getElementById('valor').value),
            fecha_compra: document.getElementById('fecha_compra').value,
            institucion: institucionSelect.value,
            institucion_nombre: institucionSeleccionada.text,
            unidad_codigo: unidadSelect.value,
            unidad: unidadSeleccionada.text,
            caracteristicas: document.getElementById('caracteristicas')?.value || ''
        };
        
        // Validaciones
        if (!formData.tipo_codigo) {
            showModal('Error', 'Seleccione un tipo de activo');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            return;
        }
        
        if (!formData.valor || formData.valor <= 0) {
            showModal('Error', 'Ingrese un valor válido mayor a cero');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            return;
        }
        
        if (!formData.fecha_compra) {
            showModal('Error', 'Seleccione una fecha de compra');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            return;
        }
        
        const result = await apiCall('activos.php', 'POST', formData);
        
        if (result && result.success) {
            showModal('Éxito', `
                <div class="text-center">
                    <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                    <h4 class="text-xl font-bold text-gray-800 mb-2">¡Activo Registrado!</h4>
                    <p class="text-gray-600 mb-4">${result.message}</p>
                    <div class="bg-gray-100 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">Código del activo:</p>
                        <p class="text-lg font-bold text-purple-600 font-mono">${result.codigo}</p>
                    </div>
                </div>
            `);
            activosView = 'list';
            setTimeout(() => loadActivos(), 1500);
        } else {
            showModal('Error', result?.error || 'Error al registrar activo');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    } catch (error) {
        showModal('Error', 'Error de conexión con el servidor');
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
}

// ==================== FUNCIONES DE BAJA ====================
function mostrarFormularioBaja(activoId) {
    // Primero obtener información del activo
    showLoading();
    
    setTimeout(async () => {
        try {
            const activos = await apiCall('activos.php');
            const activo = activos.find(a => a.id == activoId);
            
            if (!activo) {
                showModal('Error', 'Activo no encontrado');
                return;
            }
            
            const modalContent = `
                <div class="max-w-md">
                    <div class="mb-4">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Dar de Baja Activo</h3>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-sm font-medium text-gray-700">${activo.descripcion}</p>
                            <p class="text-xs text-gray-500">${activo.codigo}</p>
                            ${activo.unidad ? `<p class="text-xs text-gray-500 mt-1"><i class="fas fa-building mr-1"></i> ${activo.unidad}</p>` : ''}
                        </div>
                    </div>
                    
                    <form id="formBaja" onsubmit="procesarBaja(event, ${activoId})">
                        <div class="mb-4">
                            <label class="block mb-2 font-medium text-gray-700">Motivo de la Baja *</label>
                            <div class="space-y-2">
                                <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="motivo" value="vendido" class="mr-3" required>
                                    <div>
                                        <span class="font-medium">Vendido</span>
                                        <p class="text-xs text-gray-500">El activo fue vendido a un tercero</p>
                                    </div>
                                </label>
                                <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="motivo" value="donado" class="mr-3">
                                    <div>
                                        <span class="font-medium">Donado</span>
                                        <p class="text-xs text-gray-500">El activo fue donado a una institución</p>
                                    </div>
                                </label>
                                <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="motivo" value="inhabilitado" class="mr-3">
                                    <div>
                                        <span class="font-medium">Inhabilitado</span>
                                        <p class="text-xs text-gray-500">El activo ya no es usable (obsoleto, dañado)</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div id="campo-venta" class="hidden mb-4">
                            <label class="block mb-2 font-medium text-gray-700">Valor de Venta ($)</label>
                            <input type="number" id="valor_venta" class="w-full p-2 border rounded" 
                                   step="0.01" min="0" placeholder="0.00">
                        </div>
                        
                        <div id="campo-receptor" class="hidden mb-4">
                            <label class="block mb-2 font-medium text-gray-700">Receptor/Institución</label>
                            <input type="text" id="receptor" class="w-full p-2 border rounded" 
                                   placeholder="Nombre de la persona o institución">
                        </div>
                        
                        <div id="campo-motivo-detalle" class="hidden mb-4">
                            <label class="block mb-2 font-medium text-gray-700">Motivo Detallado</label>
                            <textarea id="observaciones" class="w-full p-2 border rounded" rows="3" 
                                      placeholder="Especificar por qué el activo está inhabilitado..."></textarea>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block mb-2 font-medium text-gray-700">Fecha de Baja *</label>
                            <input type="date" id="fecha_baja" class="w-full p-2 border rounded" required 
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                            <button type="button" onclick="closeModal()" class="btn btn-secondary px-4">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-danger px-4">
                                <i class="fas fa-trash mr-2"></i> Confirmar Baja
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal('Baja de Activo', modalContent);
            
            // Configurar eventos para mostrar/ocultar campos según motivo
            setTimeout(() => {
                const radioButtons = document.querySelectorAll('input[name="motivo"]');
                radioButtons.forEach(radio => {
                    radio.addEventListener('change', function() {
                        const motivo = this.value;
                        
                        // Ocultar todos los campos adicionales
                        ['campo-venta', 'campo-receptor', 'campo-motivo-detalle'].forEach(id => {
                            const campo = document.getElementById(id);
                            if (campo) campo.classList.add('hidden');
                        });
                        
                        // Mostrar campo correspondiente al motivo
                        if (motivo === 'vendido') {
                            document.getElementById('campo-venta')?.classList.remove('hidden');
                        } else if (motivo === 'donado') {
                            document.getElementById('campo-receptor')?.classList.remove('hidden');
                        } else if (motivo === 'inhabilitado') {
                            document.getElementById('campo-motivo-detalle')?.classList.remove('hidden');
                        }
                    });
                });
            }, 100);
            
        } catch (error) {
            showModal('Error', 'Error al cargar información del activo');
        }
    }, 300);
}

async function procesarBaja(event, activoId) {
    event.preventDefault();
    
    const motivo = document.querySelector('input[name="motivo"]:checked');
    if (!motivo) {
        showModal('Error', 'Seleccione un motivo de baja');
        return;
    }
    
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
    btnSubmit.disabled = true;
    
    try {
        const formData = {
            activo_id: activoId,
            motivo: motivo.value,
            fecha_baja: document.getElementById('fecha_baja').value,
            valor_venta: document.getElementById('valor_venta')?.value || null,
            receptor: document.getElementById('receptor')?.value || null,
            observaciones: document.getElementById('observaciones')?.value || null
        };
        
        const response = await apiCall('activos.php', 'DELETE', formData);
        
        if (response.success) {
            showModal('Éxito', `
                <div class="text-center">
                    <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                    <h4 class="text-xl font-bold text-gray-800 mb-2">¡Baja Exitosa!</h4>
                    <p class="text-gray-600">${response.message}</p>
                    <div class="mt-4 text-sm text-gray-500">
                        <p>El activo ahora aparece en el historial de bajas</p>
                    </div>
                </div>
            `);
            closeModal();
            // Recargar la vista actual
            if (currentTab === 'bajas') {
                loadBajas();
            } else {
                loadActivos();
            }
        } else {
            showModal('Error', response.error || 'Error al procesar baja');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    } catch (error) {
        showModal('Error', 'Error de conexión con el servidor');
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
}

// ==================== REPORTE DE DEPRECIACIÓN CORREGIDO ====================
function mostrarReporteDepreciacion() {
    showLoading();
    
    setTimeout(async () => {
        try {
            const activos = await apiCall('activos.php');
            const activosActivos = activos.filter(a => a.estado === 'activo' || !a.estado);
            
            if (activosActivos.length === 0) {
                document.getElementById('main-content').innerHTML = `
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-800">Reporte de Depreciación Diaria</h2>
                            <button onclick="loadActivos()" class="btn btn-primary">
                                <i class="fas fa-arrow-left mr-2"></i> Volver
                            </button>
                        </div>
                        <div class="card text-center py-12">
                            <i class="fas fa-calculator text-5xl text-gray-300 mb-4"></i>
                            <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay activos activos</h3>
                            <p class="text-gray-500 mb-6">No se puede generar el reporte sin activos</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Calcular totales CORRECTAMENTE
            let totalValorOriginal = 0;
            let totalDepAcumulada = 0;
            let totalDepDiaria = 0;
            
            const filasHTML = activosActivos.map(activo => {
                // Calcular depreciación para este activo
                const dep = calcularDepreciacionDiariaExacta(activo);
                
                // Encontrar nombres de sucursal y departamento
                const sucursalInfo = SUCURSALES.find(s => s.codigo === activo.institucion) || 
                                   { nombre: activo.institucion_nombre || activo.institucion || 'N/A' };
                const deptoInfo = DEPARTAMENTOS.find(d => d.codigo === activo.unidad_codigo) || 
                                { nombre: activo.unidad || 'N/A' };
                
                // Sumar a totales
                totalValorOriginal += parseFloat(activo.valor || 0);
                totalDepAcumulada += parseFloat(dep.acumulada);
                totalDepDiaria += parseFloat(dep.diaria);
                
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="p-3 border-b text-sm">${activo.codigo || 'N/A'}</td>
                        <td class="p-3 border-b">${activo.descripcion || 'Sin descripción'}</td>
                        <td class="p-3 border-b">${DEPRECIACION_LISR[activo.tipo_codigo]?.label || activo.tipo || 'Sin tipo'}</td>
                        <td class="p-3 border-b">${sucursalInfo.nombre}</td>
                        <td class="p-3 border-b">${deptoInfo.nombre}</td>
                        <td class="p-3 border-b text-right font-mono">${formatCurrency(activo.valor || 0)}</td>
                        <td class="p-3 border-b text-right font-mono">${formatCurrency(dep.diaria)}</td>
                        <td class="p-3 border-b text-right font-mono text-red-600">${formatCurrency(dep.acumulada)}</td>
                        <td class="p-3 border-b text-right font-mono text-green-600 font-bold">${formatCurrency(dep.valorLibros)}</td>
                    </tr>
                `;
            }).join('');
            
            // Calcular valor en libros total CORRECTAMENTE
            const totalValorLibros = totalValorOriginal - totalDepAcumulada;
            
            const content = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">Reporte de Depreciación Diaria</h2>
                        <div class="flex space-x-2">
                            <button onclick="loadActivos()" class="btn btn-primary">
                                <i class="fas fa-arrow-left mr-2"></i> Volver
                            </button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="card bg-blue-50 border-blue-200">
                            <p class="text-sm text-blue-600">Valor Total Activos</p>
                            <p class="text-2xl font-bold text-blue-700">${formatCurrency(totalValorOriginal)}</p>
                        </div>
                        <div class="card bg-red-50 border-red-200">
                            <p class="text-sm text-red-600">Dep. Diaria Total</p>
                            <p class="text-2xl font-bold text-red-700">${formatCurrency(totalDepDiaria)}</p>
                        </div>
                        <div class="card bg-orange-50 border-orange-200">
                            <p class="text-sm text-orange-600">Dep. Acumulada</p>
                            <p class="text-2xl font-bold text-orange-700">${formatCurrency(totalDepAcumulada)}</p>
                        </div>
                        <div class="card bg-green-50 border-green-200">
                            <p class="text-sm text-green-600">Valor en Libros</p>
                            <p class="text-2xl font-bold text-green-700">${formatCurrency(totalValorLibros)}</p>
                        </div>
                    </div>
                    
                    <div class="card overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="p-3 text-left font-semibold text-sm">Código</th>
                                    <th class="p-3 text-left font-semibold">Descripción</th>
                                    <th class="p-3 text-left font-semibold">Tipo</th>
                                    <th class="p-3 text-left font-semibold">Sucursal</th>
                                    <th class="p-3 text-left font-semibold">Departamento</th>
                                    <th class="p-3 text-left font-semibold">Valor Original</th>
                                    <th class="p-3 text-left font-semibold">Dep. Diaria</th>
                                    <th class="p-3 text-left font-semibold">Dep. Acumulada</th>
                                    <th class="p-3 text-left font-semibold">Valor Libros</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filasHTML}
                            </tbody>
                            <tfoot class="bg-gray-50 font-bold">
                                <tr>
                                    <td class="p-3" colspan="5">TOTALES</td>
                                    <td class="p-3 text-right">${formatCurrency(totalValorOriginal)}</td>
                                    <td class="p-3 text-right">${formatCurrency(totalDepDiaria)}</td>
                                    <td class="p-3 text-right text-red-600">${formatCurrency(totalDepAcumulada)}</td>
                                    <td class="p-3 text-right text-green-600">${formatCurrency(totalValorLibros)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg border">
                        <h3 class="font-bold text-gray-700 mb-2">Fórmulas de Cálculo:</h3>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• <span class="font-medium">Depreciación Diaria:</span> (Valor Original × Tasa Anual) ÷ 365 días</li>
                            <li>• <span class="font-medium">Depreciación Acumulada:</span> Depreciación Diaria × Días transcurridos desde compra</li>
                            <li>• <span class="font-medium">Valor en Libros:</span> Valor Original - Depreciación Acumulada</li>
                            <li>• <span class="font-medium">Tasas según LISR:</span> Herramientas 30% anual, Transporte 25% anual</li>
                            <li>• Días transcurridos: Diferencia entre fecha actual y fecha de compra</li>
                        </ul>
                    </div>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = content;
            
        } catch (error) {
            console.error('Error al cargar reporte:', error);
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Reporte de Depreciación</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error al cargar el reporte</p>
                        <p class="text-sm">${error.message || 'Error desconocido'}</p>
                    </div>
                    <div class="flex justify-center">
                        <button onclick="loadActivos()" class="btn btn-primary">
                            <i class="fas fa-arrow-left mr-2"></i> Volver
                        </button>
                    </div>
                </div>
            `;
        }
    }, 300);
}

// ==================== FUNCIONES GLOBALES ====================
function loadActivosModule() {
    currentTab = 'activos';
    loadActivos();
}

// Hacer funciones disponibles globalmente
window.loadActivos = loadActivos;
window.loadBajas = loadBajas;
window.switchTab = switchTab;
window.showNewActivoForm = showNewActivoForm;
window.cancelNewActivo = cancelNewActivo;
window.saveActivo = saveActivo;
window.mostrarFormularioBaja = mostrarFormularioBaja;
window.procesarBaja = procesarBaja;
window.loadActivosModule = loadActivosModule;
window.mostrarReporteDepreciacion = mostrarReporteDepreciacion;
window.actualizarInfoDepreciacion = actualizarInfoDepreciacion;
window.showModal = showModal;
window.closeModal = closeModal;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.showLoading = showLoading;
window.calcularDepreciacionDiariaExacta = calcularDepreciacionDiariaExacta;
window.exportarBajasPDF = exportarBajasPDF;
window.exportarBajasExcel = exportarBajasExcel;