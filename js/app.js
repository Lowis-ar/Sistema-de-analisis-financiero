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
        case 'activos':
            loadActivosModule();
            break;
        default:
            loadDashboard();
    }
}

// Módulo Dashboard
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
                            <p class="text-sm font-medium text-gray-500 uppercase">Activos Netos</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2">$0.00</h3>
                        </div>
                        <div class="p-2 bg-green-50 rounded-lg">
                            <i class="fas fa-building text-green-600"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
                <p class="text-blue-800">Sistema Financiero - Versión MySQL</p>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

// Módulo Clientes
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
                    <h3 class="text-lg font-bold mb-4">Lista de Clientes</h3>
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-users text-4xl mb-4 text-gray-300"></i>
                        <p>No hay clientes registrados</p>
                        <button id="btnAgregarCliente" class="btn btn-primary mt-4">
                            <i class="fas fa-plus mr-2"></i> Agregar Primer Cliente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Agregar event listeners para los botones de clientes
    document.getElementById('btnNuevoCliente')?.addEventListener('click', showClienteForm);
    document.getElementById('btnAgregarCliente')?.addEventListener('click', showClienteForm);
}
/*
function showClienteForm() {
    const content = `
        <div class="card">
            <h3 class="text-lg font-bold mb-4">Registrar Nuevo Cliente</h3>
            <form id="formCliente" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label>Tipo de Persona</label>
                        <select class="w-full p-2 border rounded">
                            <option value="natural">Persona Natural</option>
                            <option value="juridica">Persona Jurídica</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label>Código Cliente</label>
                        <input type="text" class="w-full p-2 border rounded" placeholder="CLI-001">
                    </div>

                    <div class="input-group">
                        <label>Nombre Completo</label>
                        <input type="text" class="w-full p-2 border rounded" placeholder="Nombre del cliente">
                    </div>

                    <div class="input-group">
                        <label>DUI</label>
                        <input type="text" class="w-full p-2 border rounded" placeholder="00000000-0">
                    </div>

                    <div class="input-group">
                        <label>Teléfono</label>
                        <input type="text" class="w-full p-2 border rounded" placeholder="2222-2222">
                    </div>

                    <div class="input-group">
                        <label>Ingresos Mensuales ($)</label>
                        <input type="number" class="w-full p-2 border rounded" value="0">
                    </div>
                </div>

                <div class="input-group">
                    <label>Dirección</label>
                    <textarea class="w-full p-2 border rounded" rows="3"></textarea>
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
    
    // Event listeners para el formulario
    document.getElementById('formCliente')?.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarCliente();
    });
    
    document.getElementById('btnCancelarCliente')?.addEventListener('click', function() {
        loadClientesModule();
    });
}
*/
function guardarCliente() {
    alert('Cliente guardado exitosamente!');
    loadClientesModule();
}

// Módulo Préstamos
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
        alert('Formulario de nuevo préstamo');
    });
}

// Módulo Activos
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