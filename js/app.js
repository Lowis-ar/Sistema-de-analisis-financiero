// ==========================================
// ESTADO GLOBAL Y UTILIDADES
// ==========================================
const appState = {
    activeTab: 'dashboard'
};

// Función de seguridad por si main.js falla
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicación iniciada');
    initializeApp();
});

function initializeApp() {
    loadDashboard();
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
}

function setActiveTab(tab) {
    console.log('📌 Cambiando a tab:', tab);
    appState.activeTab = tab;
    updateActiveTabButtons();
    renderCurrentTab();
}

function updateActiveTabButtons() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('bg-blue-600');
        button.classList.add('hover:bg-slate-700');
    });
    
    const activeButtons = document.querySelectorAll(`[onclick*="${appState.activeTab}"]`);
    activeButtons.forEach(button => {
        button.classList.add('bg-blue-600');
        button.classList.remove('hover:bg-slate-700');
    });
}

function renderCurrentTab() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    switch (appState.activeTab) {
        case 'dashboard': loadDashboard(); break;
        case 'clientes': loadClientesModule(); break;
        case 'creditos': loadPrestamosModule(); break;
        case 'garantias': loadGarantiasModule(); break;
        case 'activos': loadActivosModule(); break;
        default: loadDashboard();
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
                        <div class="p-2 bg-blue-50 rounded-lg"><i class="fas fa-chart-line text-blue-600"></i></div>
                    </div>
                </div>
                <div class="card border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Cartera en Mora</p>
                            <h3 class="text-3xl font-bold text-red-600 mt-2">$0.00</h3>
                        </div>
                        <div class="p-2 bg-red-50 rounded-lg"><i class="fas fa-exclamation-triangle text-red-600"></i></div>
                    </div>
                </div>
                <div class="card border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Garantías Registradas</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2">0</h3>
                        </div>
                        <div class="p-2 bg-green-50 rounded-lg"><i class="fas fa-shield-alt text-green-600"></i></div>
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
// MÓDULO CLIENTES (Con Fetch Real)
// ==========================================
async function loadClientesModule() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                <button id="btnNuevoCliente" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Cliente
                </button>
            </div>
            <div id="clientesContent">
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-gray-500 mt-2">Cargando cartera de clientes...</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    document.getElementById('btnNuevoCliente')?.addEventListener('click', showClienteForm);

    // Llamada a la API
    const clientes = await apiCall('clientes.php');

    const container = document.getElementById('clientesContent');
    
    if (!clientes || clientes.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-4 text-gray-300"></i>
                    <p>No hay clientes registrados.</p>
                </div>
            </div>`;
        return;
    }

    const rows = clientes.map(c => {
        const isJuridico = c.tipo === 'JURIDICO' || c.tipo === 'juridica';
        const badgeTipo = isJuridico 
            ? '<span class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full border border-purple-200">Empresa</span>'
            : '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full border border-blue-200">Natural</span>';
        const icono = isJuridico ? '<i class="fas fa-building text-gray-400"></i>' : '<i class="fas fa-user text-gray-400"></i>';

        return `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-3 font-mono text-sm text-blue-600">${c.codigo}</td>
                <td class="p-3"><div class="flex items-center gap-2">${icono}<span class="font-medium">${c.nombre || c.razon_social}</span></div></td>
                <td class="p-3">${badgeTipo}</td>
                <td class="p-3 text-sm text-gray-600">${c.dui || c.nit || '-'}</td>
                <td class="p-3 text-sm">${c.telefono || '-'}</td>
                <td class="p-3 text-right">
                    <button class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 text-sm uppercase">
                            <th class="p-3 border-b">Código</th>
                            <th class="p-3 border-b">Nombre</th>
                            <th class="p-3 border-b">Tipo</th>
                            <th class="p-3 border-b">Documento</th>
                            <th class="p-3 border-b">Teléfono</th>
                            <th class="p-3 border-b text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">${rows}</tbody>
                </table>
            </div>
            <div class="p-3 bg-gray-50 text-xs text-gray-500 text-right">Mostrando ${clientes.length} registro(s)</div>
        </div>
    `;
}

function showClienteForm() {
    const content = `
        <div class="card">
            <h3 class="text-lg font-bold mb-4">Registrar Nuevo Cliente</h3>
            <form id="formCliente" class="space-y-4">
                
                <div class="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                    <label class="block font-bold mb-2 text-gray-700">Tipo de Persona</label>
                    <div class="flex gap-6">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" name="tipo_cliente" value="natural" checked class="form-radio text-blue-600 h-5 w-5">
                            <span class="ml-2">Persona Natural</span>
                        </label>
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" name="tipo_cliente" value="juridico" class="form-radio text-blue-600 h-5 w-5">
                            <span class="ml-2">Persona Jurídica (Empresa)</span>
                        </label>
                    </div>
                </div>

                <div id="camposNatural" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group md:col-span-2">
                        <label>Nombre Completo</label>
                        <input type="text" name="nombre" class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Juan Antonio Perez">
                    </div>
                    <div class="input-group">
                        <label>DUI</label>
                        <input type="text" name="dui" class="w-full p-2 border rounded" placeholder="00000000-0">
                    </div>
                    <div class="input-group">
                        <label>Fecha de Nacimiento</label>
                        <input type="date" name="fecha_nacimiento" class="w-full p-2 border rounded">
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
                    <div class="input-group">
                        <label>Fecha Constitución</label>
                        <input type="date" name="fecha_constitucion" class="w-full p-2 border rounded">
                    </div>
                    
                    <div class="input-group md:col-span-2 bg-slate-50 p-3 rounded border">
                        <p class="font-bold text-sm text-gray-600 mb-2 border-b pb-1">Representante Legal</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="representante" class="w-full p-2 border rounded bg-white" placeholder="Nombre Completo">
                            <input type="text" name="dui_representante" class="w-full p-2 border rounded bg-white" placeholder="DUI Representante">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div class="input-group">
                        <label>Teléfono</label>
                        <input type="text" name="telefono" class="w-full p-2 border rounded" placeholder="2222-2222">
                    </div>
                    <div class="input-group">
                        <label>Dirección Física</label>
                        <input type="text" name="direccion" class="w-full p-2 border rounded" placeholder="Colonia, Calle, #Casa">
                    </div>
                </div>

                <div class="bg-blue-50 p-4 rounded border border-blue-200 mt-4">
                    <h4 class="font-bold text-blue-800 mb-3"><i class="fas fa-chart-line mr-2"></i>Análisis Financiero</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="input-group">
                            <label class="text-blue-900">Ingresos Mensuales ($)</label>
                            <input type="number" id="inpIngresos" name="ingresos" class="w-full p-2 border rounded font-bold text-green-700" value="0" min="0" step="0.01">
                        </div>
                        <div class="input-group">
                            <label class="text-blue-900">Egresos Mensuales ($)</label>
                            <input type="number" id="inpEgresos" name="egresos" class="w-full p-2 border rounded font-bold text-red-700" value="0" min="0" step="0.01">
                        </div>
                        
                        <div class="input-group bg-white p-2 rounded border text-center">
                            <label class="text-xs text-gray-500 uppercase">Capacidad Neta</label>
                            <div id="txtCapacidad" class="text-xl font-bold text-gray-800">$0.00</div>
                            <div id="badgeCalificacion" class="inline-block px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-600 mt-1">Sin Datos</div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 pt-4 border-t mt-4">
                    <button type="submit" class="btn btn-success flex-1 md:flex-none justify-center">
                        <i class="fas fa-save mr-2"></i> Guardar Cliente
                    </button>
                    <button type="button" id="btnCancelarCliente" class="btn btn-secondary flex-1 md:flex-none justify-center">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('clientesContent').innerHTML = content;
    
    // --- LÓGICA DE INTERFAZ ---

    // 1. Toggle Persona Natural vs Juridica
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

    // 2. Cálculo Automático de Capacidad de Pago
    const inpIngresos = document.getElementById('inpIngresos');
    const inpEgresos = document.getElementById('inpEgresos');
    const txtCapacidad = document.getElementById('txtCapacidad');
    const badgeCalif = document.getElementById('badgeCalificacion');

    function calcularFinanzas() {
        const ing = parseFloat(inpIngresos.value) || 0;
        const egr = parseFloat(inpEgresos.value) || 0;
        const capacidad = ing - egr;

        // Formato moneda
        txtCapacidad.textContent = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(capacidad);
        
        // Color segun resultado
        if(capacidad > 0) txtCapacidad.className = "text-xl font-bold text-green-600";
        else txtCapacidad.className = "text-xl font-bold text-red-600";

        // Determinar Calificación Preliminar
        let calificacion = 'D';
        let claseBadge = 'bg-red-100 text-red-800';

        if (capacidad > 800) { calificacion = 'A'; claseBadge = 'bg-green-100 text-green-800'; }
        else if (capacidad > 400) { calificacion = 'B'; claseBadge = 'bg-blue-100 text-blue-800'; }
        else if (capacidad > 0) { calificacion = 'C'; claseBadge = 'bg-yellow-100 text-yellow-800'; }

        badgeCalif.textContent = `Categoría ${calificacion}`;
        badgeCalif.className = `inline-block px-2 py-0.5 text-xs rounded mt-1 ${claseBadge}`;
    }

    inpIngresos.addEventListener('input', calcularFinanzas);
    inpEgresos.addEventListener('input', calcularFinanzas);

    // 3. Manejo del Submit
    document.getElementById('btnCancelarCliente')?.addEventListener('click', loadClientesModule);
    
    document.getElementById('formCliente')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const tipoCliente = formData.get('tipo_cliente');
        let endpoint = '';
        let payload = {};

        if (tipoCliente === 'juridico') {
            endpoint = 'clientes_juridicos.php';
            const nit = formData.get('nit');
            if (!nit) { showModal('Error', 'El NIT es obligatorio'); return; }

            payload = {
                razon_social: formData.get('razon_social'),
                nombre_comercial: formData.get('nombre_comercial'),
                nit: nit,
                nrc: formData.get('nrc'),
                giro_economico: formData.get('giro'),
                representante_legal: formData.get('representante'),
                dui_representante: formData.get('dui_representante'),
                direccion: formData.get('direccion'),
                telefono: formData.get('telefono'),
                fecha_constitucion: formData.get('fecha_constitucion')
            };
        } else {
            endpoint = 'clientes.php';
            const codigoAuto = 'CN-' + Math.floor(Math.random() * 100000);
            
            payload = {
                tipo: 'natural',
                codigo: codigoAuto, 
                nombre: formData.get('nombre'),
                dui: formData.get('dui'),
                ingresos: formData.get('ingresos'),
                egresos: formData.get('egresos'), // AHORA SÍ ENVIAMOS EGRESOS
                direccion: formData.get('direccion'),
                telefono: formData.get('telefono')
            };
        }

        const btnSubmit = this.querySelector('button[type="submit"]');
        const btnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const response = await apiCall(endpoint, 'POST', payload);

            if (response && (response.success || response.id)) {
                showModal('Éxito', `Cliente guardado correctamente.`);
                loadClientesModule();
            } else {
                const errorMsg = (response && response.error) ? response.error : 'Error desconocido.';
                showModal('Error', errorMsg);
            }
        } catch (error) {
            console.error(error);
            showModal('Error', 'Error de conexión con el servidor.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = btnText;
        }
    });
}

// ==========================================
// MÓDULO GARANTÍAS
// ==========================================
function loadGarantiasModule() {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Garantías Mobiliarias</h2>
                    <p class="text-sm text-gray-500">Gestión de Prendas, Inventarios y Cesiones</p>
                </div>
                <button id="btnNuevaGarantia" class="btn btn-primary"><i class="fas fa-shield-alt mr-2"></i> Registrar Garantía</button>
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
                            <option value="1">Cliente Demo 1</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Tipo de Garantía</label>
                        <select class="w-full p-2 border rounded" name="tipo_garantia">
                            <option value="1">Prenda sin Desplazamiento</option>
                            <option value="2">Inventario Rotatorio</option>
                            <option value="3">Cesión de Derechos</option>
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label>Descripción Técnica</label>
                    <textarea class="w-full p-2 border rounded" rows="2"></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="input-group"><label>Valor Comercial</label><input type="number" class="w-full p-2 border rounded"></div>
                    <div class="input-group"><label>Folio RUG</label><input type="text" class="w-full p-2 border rounded"></div>
                    <div class="input-group"><label>Fecha Inscripción</label><input type="date" class="w-full p-2 border rounded"></div>
                </div>
                <div class="flex gap-4 pt-4">
                    <button type="submit" class="btn btn-success"><i class="fas fa-save mr-2"></i> Guardar Garantía</button>
                    <button type="button" id="btnCancelarGarantia" class="btn btn-secondary"><i class="fas fa-times mr-2"></i> Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.getElementById('garantiasContent').innerHTML = content;
    document.getElementById('btnCancelarGarantia')?.addEventListener('click', loadGarantiasModule);
    
    document.getElementById('formGarantia')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Funcionalidad de guardar garantía pendiente de conexión API.');
    });
}

// ==========================================
// MÓDULOS RESTANTES
// ==========================================
function loadPrestamosModule() {
    const content = `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Gestión de Créditos</h2>
            <div class="card"><div class="text-center py-8 text-gray-500"><p>Módulo de Créditos</p></div></div>
        </div>`;
    document.getElementById('main-content').innerHTML = content;
}

function loadActivosModule() {
    const content = `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Gestión de Activos</h2>
            <div class="card"><div class="text-center py-8 text-gray-500"><p>Módulo de Activos</p></div></div>
        </div>`;
    document.getElementById('main-content').innerHTML = content;
}

// Hacer funciones disponibles globalmente
window.setActiveTab = setActiveTab;