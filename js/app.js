// Estado global simplificado
const appState = {
    activeTab: 'dashboard'
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicación iniciada');
    initializeApp();
});

function initializeApp() {
    // Cargar dashboard por defecto
    loadDashboard();
    
    // Agregar event listeners a los botones de navegación
    setupNavigation();
    
    console.log('✅ App inicializada correctamente');
}

function setupNavigation() {
    // Desktop sidebar
    const sidebarButtons = document.querySelectorAll('aside .tab-button');
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('onclick')?.replace("setActiveTab('", "").replace("')", "") || 
                       this.getAttribute('data-tab');
            if (tab) setActiveTab(tab);
        });
    });
    
    // Mobile navigation
    const mobileButtons = document.querySelectorAll('.md\\:hidden .tab-button');
    mobileButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('onclick')?.replace("setActiveTab('", "").replace("')", "") || 
                       this.getAttribute('data-tab');
            if (tab) setActiveTab(tab);
        });
    });
    
    console.log('✅ Navegación configurada');
}

function setActiveTab(tab) {
    console.log('📌 Cambiando a tab:', tab);
    appState.activeTab = tab;
    
    // Actualizar UI
    updateActiveTabButtons();
    renderCurrentTab();
}

function updateActiveTabButtons() {
    // Remover clase activa de todos los botones
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('bg-blue-600');
        button.classList.add('hover:bg-slate-700');
    });
    
    // Agregar clase activa al botón actual
    const activeButtons = document.querySelectorAll(`[onclick*="${appState.activeTab}"]`);
    activeButtons.forEach(button => {
        button.classList.add('bg-blue-600');
        button.classList.remove('hover:bg-slate-700');
    });
}

function renderCurrentTab() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('❌ No se encontró main-content');
        return;
    }

    console.log('🎨 Renderizando:', appState.activeTab);

    switch (appState.activeTab) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clientes':
            loadClientesModule();
            break;
        case 'creditos':
            loadPrestamosModule();
            break;
        case 'garantias': // NUEVO MÓDULO
            loadGarantiasModule();
            break;
        case 'activos':
            loadActivosModule();
            break;
        default:
            loadDashboard();
    }
}

// ==========================================
// MÓDULO DASHBOARD
// ==========================================
function loadDashboard() {
    const content = `
        <div class="space-y-6">
            <h2 class="text-3xl font-bold text-gray-800">Dashboard - Resumen General</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="card border-l-4 border-blue-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Cartera de Créditos</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2">$0.00</h3>
                        </div>
                        <div class="p-2 bg-blue-50 rounded-lg">
                            <i class="fas fa-chart-line text-blue-600"></i>
                        </div>
                    </div>
                </div>

                <div class="card border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Cartera en Mora</p>
                            <h3 class="text-3xl font-bold text-red-600 mt-2">$0.00</h3>
                        </div>
                        <div class="p-2 bg-red-50 rounded-lg">
                            <i class="fas fa-exclamation-triangle text-red-600"></i>
                        </div>
                    </div>
                </div>

                <div class="card border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Garantías Registradas</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2">0</h3>
                        </div>
                        <div class="p-2 bg-green-50 rounded-lg">
                            <i class="fas fa-shield-alt text-green-600"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
                <p class="text-blue-800 font-medium">Sistema Financiero - Clientes Jurídicos & Garantías Activas</p>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

// ==========================================
// MÓDULO CLIENTES (Actualizado para Jurídicos)
// ==========================================
function loadClientesModule() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                <button id="btnNuevoCliente" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Cliente
                </button>
            </div>

            <div id="clientesContent">
                <div class="card">
                    <h3 class="text-lg font-bold mb-4">Cartera de Clientes</h3>
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-users text-4xl mb-4 text-gray-300"></i>
                        <p>No hay clientes registrados</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    document.getElementById('btnNuevoCliente')?.addEventListener('click', showClienteForm);
}

function showClienteForm() {
    const content = `
        <div class="card">
            <h3 class="text-lg font-bold mb-4">Registrar Nuevo Cliente</h3>
            <form id="formCliente" class="space-y-4">
                
                <div class="bg-gray-50 p-4 rounded mb-4">
                    <label class="block font-bold mb-2">Tipo de Cliente</label>
                    <div class="flex gap-4">
                        <label class="inline-flex items-center">
                            <input type="radio" name="tipo_cliente" value="natural" checked class="form-radio text-blue-600">
                            <span class="ml-2">Persona Natural</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="radio" name="tipo_cliente" value="juridico" class="form-radio text-blue-600">
                            <span class="ml-2">Persona Jurídica (Empresa)</span>
                        </label>
                    </div>
                </div>

                <div id="camposNatural" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label>Nombre Completo</label>
                        <input type="text" name="nombre" class="w-full p-2 border rounded" placeholder="Juan Perez">
                    </div>
                    <div class="input-group">
                        <label>DUI</label>
                        <input type="text" name="dui" class="w-full p-2 border rounded" placeholder="00000000-0">
                    </div>
                    <div class="input-group">
                        <label>Ingresos Mensuales</label>
                        <input type="number" name="ingresos" class="w-full p-2 border rounded" value="0">
                    </div>
                </div>

                <div id="camposJuridico" class="grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
                    <div class="input-group md:col-span-2">
                        <label>Razón Social (Nombre Legal)</label>
                        <input type="text" name="razon_social" class="w-full p-2 border rounded" placeholder="Ej: Industrias S.A. de C.V.">
                    </div>
                    <div class="input-group">
                        <label>Nombre Comercial</label>
                        <input type="text" name="nombre_comercial" class="w-full p-2 border rounded">
                    </div>
                    <div class="input-group">
                        <label>NIT Empresa</label>
                        <input type="text" name="nit" class="w-full p-2 border rounded" placeholder="0614-000000-000-0">
                    </div>
                    <div class="input-group">
                        <label>NRC (Registro IVA)</label>
                        <input type="text" name="nrc" class="w-full p-2 border rounded">
                    </div>
                    <div class="input-group">
                        <label>Giro Económico</label>
                        <input type="text" name="giro" class="w-full p-2 border rounded">
                    </div>
                    <div class="input-group md:col-span-2 border-t pt-2 mt-2">
                        <p class="font-bold text-sm text-gray-600 mb-2">Representante Legal</p>
                        <div class="grid grid-cols-2 gap-4">
                            <input type="text" name="representante" class="w-full p-2 border rounded" placeholder="Nombre Representante">
                            <input type="text" name="dui_representante" class="w-full p-2 border rounded" placeholder="DUI Representante">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div class="input-group">
                        <label>Teléfono Contacto</label>
                        <input type="text" name="telefono" class="w-full p-2 border rounded">
                    </div>
                    <div class="input-group">
                        <label>Dirección Física</label>
                        <input type="text" name="direccion" class="w-full p-2 border rounded">
                    </div>
                </div>

                <div class="flex gap-4 pt-4">
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-save mr-2"></i> Guardar Cliente
                    </button>
                    <button type="button" id="btnCancelarCliente" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('clientesContent').innerHTML = content;
    
    // Lógica para mostrar/ocultar campos según tipo
    const radios = document.getElementsByName('tipo_cliente');
    const divNatural = document.getElementById('camposNatural');
    const divJuridico = document.getElementById('camposJuridico');

    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'juridico') {
                divNatural.classList.add('hidden');
                divJuridico.classList.remove('hidden');
            } else {
                divNatural.classList.remove('hidden');
                divJuridico.classList.add('hidden');
            }
        });
    });

    document.getElementById('btnCancelarCliente')?.addEventListener('click', loadClientesModule);
    document.getElementById('formCliente')?.addEventListener('submit', function(e) {
        e.preventDefault();
        // Aquí iría la lógica fetch hacia api/includes/clientes_juridicos.php
        alert('Guardando cliente (Lógica pendiente de integración API)...');
        loadClientesModule();
    });
}

// ==========================================
// NUEVO MÓDULO: GARANTÍAS
// ==========================================
function loadGarantiasModule() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Garantías Mobiliarias</h2>
                    <p class="text-sm text-gray-500">Gestión de Prendas, Inventarios y Cesiones</p>
                </div>
                <button id="btnNuevaGarantia" class="btn btn-primary">
                    <i class="fas fa-shield-alt mr-2"></i> Registrar Garantía
                </button>
            </div>

            <div class="flex gap-4 border-b">
                <button class="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-bold">Activas</button>
                <button class="px-4 py-2 text-gray-500 hover:text-blue-600">Por Vencer (Seguros)</button>
                <button class="px-4 py-2 text-gray-500 hover:text-blue-600">Requieren Avalúo</button>
            </div>

            <div id="garantiasContent">
                <div class="card">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-file-contract text-4xl mb-4 text-gray-300"></i>
                        <p>Seleccione una opción para gestionar garantías</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    document.getElementById('btnNuevaGarantia')?.addEventListener('click', showGarantiaForm);
}

function showGarantiaForm() {
    const content = `
        <div class="card">
            <h3 class="text-lg font-bold mb-4">Registrar Garantía (Ley de Garantías Mobiliarias)</h3>
            <form id="formGarantia" class="space-y-4">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label>Cliente Propietario</label>
                        <select class="w-full p-2 border rounded" name="cliente_id">
                            <option value="">Seleccione Cliente...</option>
                            <option value="1">Juan Perez (Natural)</option>
                            <option value="2">Industrias La Constancia (Jurídico)</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label>Tipo de Garantía</label>
                        <select class="w-full p-2 border rounded" name="tipo_garantia">
                            <option value="1">Prenda sin Desplazamiento (Maquinaria/Vehículo)</option>
                            <option value="2">Inventario Rotatorio</option>
                            <option value="3">Cesión de Derechos (Facturas)</option>
                            <option value="4">Pignoración de Acciones</option>
                        </select>
                    </div>
                </div>

                <div class="input-group">
                    <label>Descripción Técnica del Bien</label>
                    <textarea class="w-full p-2 border rounded" rows="2" placeholder="Ej: Tractor Marca CAT, Modelo D5, Serie 998877..."></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="input-group">
                        <label>Valor Comercial (Avalúo)</label>
                        <div class="relative">
                            <span class="absolute left-3 top-2 text-gray-500">$</span>
                            <input type="number" class="w-full p-2 pl-6 border rounded" placeholder="0.00">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Folio RUG (CNR)</label>
                        <input type="text" class="w-full p-2 border rounded" placeholder="Registro Garantías">
                    </div>
                    <div class="input-group">
                        <label>Fecha Inscripción</label>
                        <input type="date" class="w-full p-2 border rounded">
                    </div>
                </div>

                <div class="bg-yellow-50 p-4 rounded border border-yellow-200 mt-4">
                    <h4 class="font-bold text-yellow-800 text-sm mb-2"><i class="fas fa-exclamation-circle"></i> Póliza de Seguro (Obligatorio)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Aseguradora" class="w-full p-2 border rounded bg-white">
                        <input type="text" placeholder="No. Póliza" class="w-full p-2 border rounded bg-white">
                        <input type="date" title="Fecha Vencimiento" class="w-full p-2 border rounded bg-white">
                    </div>
                </div>

                <div class="flex gap-4 pt-4">
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-save mr-2"></i> Guardar Garantía
                    </button>
                    <button type="button" id="btnCancelarGarantia" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('garantiasContent').innerHTML = content;
    
    document.getElementById('btnCancelarGarantia')?.addEventListener('click', loadGarantiasModule);
    document.getElementById('formGarantia')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Enviando datos a api/includes/garantias.php...');
        loadGarantiasModule();
    });
}

// ==========================================
// MÓDULO CRÉDITOS
// ==========================================
function loadPrestamosModule() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Créditos</h2>
                <button id="btnNuevoPrestamo" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Crédito
                </button>
            </div>

            <div class="card">
                <h3 class="text-lg font-bold mb-4">Lista de Préstamos</h3>
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-credit-card text-4xl mb-4 text-gray-300"></i>
                    <p>No hay préstamos registrados</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    document.getElementById('btnNuevoPrestamo')?.addEventListener('click', function() {
        alert('Aquí iría el formulario de préstamos vinculando garantías...');
    });
}

// ==========================================
// MÓDULO ACTIVOS
// ==========================================
function loadActivosModule() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Activos Fijos</h2>
                <button id="btnNuevoActivo" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Activo
                </button>
            </div>

            <div class="card">
                <h3 class="text-lg font-bold mb-4">Lista de Activos</h3>
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-building text-4xl mb-4 text-gray-300"></i>
                    <p>No hay activos registrados</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    document.getElementById('btnNuevoActivo')?.addEventListener('click', function() {
        alert('Formulario de nuevo activo');
    });
}

// Hacer funciones disponibles globalmente
window.setActiveTab = setActiveTab;