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
    
    // Configurar navegación
    setupNavigation();
    
    console.log('✅ App inicializada correctamente');
}

function setupNavigation() {
    // Seleccionar todos los botones de navegación (Sidebar y Mobile)
    const buttons = document.querySelectorAll('.tab-btn, .tab-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Extraer el nombre del tab del atributo onclick o data-tab
            const rawAttr = this.getAttribute('onclick') || this.getAttribute('data-tab');
            let tabName = '';

            // Limpieza básica para obtener solo el nombre (ej: 'clientes')
            if (rawAttr && rawAttr.includes('setActiveTab')) {
                // Si viene como setActiveTab('clientes'), extraemos lo de adentro
                const match = rawAttr.match(/'([^']+)'/);
                tabName = match ? match[1] : 'dashboard';
            } else {
                tabName = rawAttr || 'dashboard';
            }

            if (tabName) setActiveTab(tabName);
        });
    });
}

// Función global para cambiar de pestaña desde cualquier lugar
window.setActiveTab = function(tab) {
    console.log('📌 Cambiando a tab:', tab);
    appState.activeTab = tab;
    
    updateActiveTabButtons();
    renderCurrentTab();
}

function updateActiveTabButtons() {
    // 1. Resetear todos los botones
    document.querySelectorAll('.tab-btn, .tab-button').forEach(btn => {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('hover:bg-slate-700');
    });
    
    // 2. Definir palabras clave para mapear tab -> botón
    const tabKeywords = {
        'dashboard': ['Dashboard'],
        'clientes': ['Clientes'],
        'creditos': ['Créditos', 'Credit'], // Puede coincidir con cualquiera
        'activos': ['Activos'],
        'garantias': ['Garantías', 'Garantias']
    };

    const keywords = tabKeywords[appState.activeTab] || [];

    // 3. Activar el botón correspondiente
    document.querySelectorAll('.tab-btn, .tab-button').forEach(btn => {
        const text = btn.textContent;
        const onclickAttr = btn.getAttribute('onclick') || '';
        
        const matchText = keywords.some(k => text.includes(k));
        const matchFunc = onclickAttr.includes(appState.activeTab);

        if (matchText || matchFunc) {
            btn.classList.add('bg-blue-600');
            btn.classList.remove('hover:bg-slate-700');
        }
    });
}

function renderCurrentTab() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // SWITCH PRINCIPAL: Aquí se llaman a los archivos externos
    switch (appState.activeTab) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clientes':
            // Esta función está en js/modules/clientes.js
            if(typeof loadClientesModule === 'function') loadClientesModule();
            else console.error('Falta clientes.js');
            break;
        case 'creditos':
            // Esta función debe estar en js/modules/prestamos.js
            if(typeof loadPrestamosModule === 'function') loadPrestamosModule();
            else console.error('Falta prestamos.js');
            break;
        case 'garantias':
            // Esta función está en js/modules/garantias.js
            if(typeof loadGarantiasModule === 'function') loadGarantiasModule();
            else console.error('Falta garantias.js');
            break;
        case 'activos':
            // Esta función debe estar en js/modules/activos.js
            if(typeof loadActivosModule === 'function') loadActivosModule();
            else console.error('Falta activos.js');
            break;
        case 'usuarios':
            if(typeof loadUsuariosModule === 'function') loadUsuariosModule();
            else console.error('Falta usuarios.js');
            break;
        default:
            loadDashboard();
    }
}

// Módulo Dashboard (Integrado aquí por ser simple)
function loadDashboard() {
    const content = `
        <div class="space-y-6">
            <h2 class="text-3xl font-bold text-gray-800">Dashboard</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="card border-l-4 border-blue-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Cartera de Créditos</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2">$0.00</h3>
                        </div>
                        <div class="p-2 bg-blue-50 rounded-lg"><i class="fas fa-chart-line text-blue-600"></i></div>
                    </div>
                </div>

                <div class="card border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Garantías Activas</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2">--</h3>
                        </div>
                        <div class="p-2 bg-green-50 rounded-lg"><i class="fas fa-shield-alt text-green-600"></i></div>
                    </div>
                </div>

                <div class="card border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Mora</p>
                            <h3 class="text-3xl font-bold text-red-600 mt-2">$0.00</h3>
                        </div>
                        <div class="p-2 bg-red-50 rounded-lg"><i class="fas fa-exclamation-triangle text-red-600"></i></div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
                <p class="text-blue-800">Bienvenido al Sistema Financiero Integral.</p>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}