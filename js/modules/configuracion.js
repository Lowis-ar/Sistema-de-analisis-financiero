// js/modules/configuracion.js

let activeConfigTab = 'zonas';
// Variables para control de datos y correlativos
let zonasData = [];
let asesoresData = [];
let politicasData = []; // Nueva variable para almacenar políticas

async function loadConfiguracionModule() {
    showLoading();
    renderConfigLayout();
    await loadTabContent(activeConfigTab);
}

function renderConfigLayout() {
    const content = `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Configuración Corporativa</h2>
            
            <div class="flex border-b border-gray-200">
                <button onclick="switchConfigTab('zonas')" id="tab-zonas" class="px-6 py-2 border-b-2 font-medium text-sm transition-colors border-blue-500 text-blue-600">Zonas</button>
                <button onclick="switchConfigTab('asesores')" id="tab-asesores" class="px-6 py-2 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700">Asesores</button>
                <button onclick="switchConfigTab('politicas')" id="tab-politicas" class="px-6 py-2 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700">Políticas de Crédito</button>
            </div>

            <div id="configWorkspace" class="animate-fade-in">
                <!-- Contenido Dinámico -->
            </div>
        </div>
    `;
    document.getElementById('main-content').innerHTML = content;
}

async function switchConfigTab(tab) {
    activeConfigTab = tab;
    
    // Actualizar estilos tabs
    ['zonas', 'asesores', 'politicas'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(t === tab) {
            btn.className = "px-6 py-2 border-b-2 font-medium text-sm transition-colors border-blue-500 text-blue-600";
        } else {
            btn.className = "px-6 py-2 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700";
        }
    });

    // Cargar contenido
    document.getElementById('configWorkspace').innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i></div>';
    await loadTabContent(tab);
}

async function loadTabContent(tab) {
    try {
        const data = await apiCall(`configuracion.php?action=${tab}`);
        const container = document.getElementById('configWorkspace');
        
        // Guardamos los datos en variables globales para poder editarlos fácilmente
        if (tab === 'zonas') {
            zonasData = Array.isArray(data) ? data : []; 
            renderZonas(zonasData, container);
        }
        else if (tab === 'asesores') {
            asesoresData = Array.isArray(data) ? data : [];
            renderAsesores(asesoresData, container);
        }
        else if (tab === 'politicas') {
            politicasData = Array.isArray(data) ? data : []; // Guardamos políticas
            renderPoliticas(politicasData, container);
        }
        
    } catch(e) { console.error(e); }
}

// --- RENDERIZADORES DE TABLAS ---

function renderZonas(data, container) {
    const rows = data.map(z => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-3 font-bold">${z.codigo}</td>
            <td class="p-3">${z.nombre}</td>
            <td class="p-3 text-gray-500">${z.responsable || '-'}</td>
            <td class="p-3 text-right">
                <button onclick="editZona(${z.id}, '${z.nombre}', '${z.codigo}', '${z.responsable}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteItem('delete_zona', ${z.id})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="card">
            <div class="flex justify-between mb-4">
                <h3 class="font-bold text-gray-700">Zonas Geográficas</h3>
                <button onclick="openModalZona()" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Nueva Zona</button>
            </div>
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-100 uppercase text-xs"><tr><th class="p-3">Código</th><th class="p-3">Nombre</th><th class="p-3">Responsable</th><th class="p-3 text-right">Acciones</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="4" class="p-4 text-center">Sin registros</td></tr>'}</tbody>
            </table>
        </div>
        
        <div id="formZone" class="hidden mt-4 p-4 bg-gray-50 rounded border">
            <h4 class="text-sm font-bold mb-2 text-blue-800" id="zoneTitle">Nueva Zona</h4>
            <form onsubmit="saveZona(event)" class="flex gap-2 items-end">
                <input type="hidden" id="z_id">
                <div class="flex-1">
                    <label class="text-xs text-gray-600">Nombre Zona *</label>
                    <input id="z_nombre" class="w-full p-1 border rounded" placeholder="Ej: Zona Central" required>
                </div>
                <div class="w-32">
                    <label class="text-xs text-gray-600">Código (Auto)</label>
                    <input id="z_codigo" class="w-full p-1 border rounded bg-gray-100 font-mono font-bold" readonly>
                </div>
                <div class="flex-1">
                    <label class="text-xs text-gray-600">Responsable</label>
                    <input id="z_responsable" class="w-full p-1 border rounded" placeholder="Nombre del Gerente">
                </div>
                <button type="submit" class="btn btn-success py-1">Guardar</button>
                <button type="button" onclick="document.getElementById('formZone').classList.add('hidden')" class="btn btn-secondary py-1">X</button>
            </form>
        </div>
    `;
}

function renderAsesores(data, container) {
    const rows = data.map(a => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-3 font-mono text-blue-600">${a.codigo_empleado}</td>
            <td class="p-3 font-bold">${a.nombre}</td>
            <td class="p-3">${a.zona_nombre || 'Sin Zona'}</td>
            <td class="p-3">${a.telefono}</td>
            <td class="p-3 text-right">
                <button onclick="deleteItem('delete_asesor', ${a.id})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="card">
            <div class="flex justify-between mb-4">
                <h3 class="font-bold text-gray-700">Equipo de Asesores</h3>
                <button onclick="openModalAsesor()" class="btn btn-primary btn-sm"><i class="fas fa-user-plus"></i> Nuevo Asesor</button>
            </div>
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-100 uppercase text-xs"><tr><th class="p-3">Código</th><th class="p-3">Nombre</th><th class="p-3">Zona</th><th class="p-3">Teléfono</th><th class="p-3 text-right">Acciones</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="5" class="p-4 text-center">Sin registros</td></tr>'}</tbody>
            </table>
        </div>
        
        <div id="formAsesor" class="hidden mt-4 p-4 bg-blue-50 rounded border border-blue-200">
            <h4 class="text-sm font-bold mb-2 text-blue-800">Registrar Nuevo Asesor</h4>
            <form onsubmit="saveAsesor(event)" class="grid grid-cols-4 gap-2">
                <div>
                    <label class="text-xs text-gray-600">Nombre Completo *</label>
                    <input id="a_nombre" class="w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="text-xs text-gray-600">Código (Auto)</label>
                    <input id="a_codigo" class="w-full p-2 border rounded bg-gray-100 font-mono font-bold" readonly required>
                </div>
                <div>
                    <label class="text-xs text-gray-600">Teléfono</label>
                    <input id="a_telefono" class="w-full p-2 border rounded" placeholder="2222-2222">
                </div>
                <div>
                    <label class="text-xs text-gray-600">Zona Asignada *</label>
                    <select id="a_zona" class="w-full p-2 border rounded" required><option value="">Cargando...</option></select>
                </div>
                <div class="col-span-4 text-right mt-2">
                    <button type="button" onclick="document.getElementById('formAsesor').classList.add('hidden')" class="btn btn-secondary text-sm">Cancelar</button>
                    <button type="submit" class="btn btn-success text-sm">Guardar Asesor</button>
                </div>
            </form>
        </div>
    `;
}

function renderPoliticas(data, container) {
    const rows = data.map(p => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-3 font-bold text-blue-800">${p.nombre}</td>
            <td class="p-3 text-center">${p.tasa_interes_anual}%</td>
            <td class="p-3 text-center text-red-600">${p.tasa_mora_anual}%</td>
            <td class="p-3 text-center">${p.plazo_maximo_meses} m</td>
            <td class="p-3 text-center">${p.comision_admin}%</td>
            <td class="p-3 text-right">
                <!-- BOTÓN EDITAR AGREGADO AQUÍ -->
                <button onclick="editPolitica(${p.id})" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteItem('delete_politica', ${p.id})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="card">
            <div class="flex justify-between mb-4">
                <h3 class="font-bold text-gray-700">Políticas de Crédito (Productos)</h3>
                <button onclick="openModalPolitica()" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Nueva Política</button>
            </div>
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-100 uppercase text-xs">
                    <tr>
                        <th class="p-3">Nombre Producto</th>
                        <th class="p-3 text-center">Tasa Anual</th>
                        <th class="p-3 text-center">Mora Anual</th>
                        <th class="p-3 text-center">Plazo Máx</th>
                        <th class="p-3 text-center">Comisión</th>
                        <th class="p-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="6" class="p-4 text-center">Sin registros</td></tr>'}</tbody>
            </table>
        </div>

        <!-- Formulario Politica -->
        <div id="formPolitica" class="hidden mt-4 p-4 bg-green-50 rounded border border-green-200">
            <h4 class="text-sm font-bold mb-2 text-green-800" id="politicaTitle">Nueva Política de Crédito</h4>
            <form onsubmit="savePolitica(event)" class="grid grid-cols-2 md:grid-cols-6 gap-2">
                <!-- CAMPO OCULTO ID AGREGADO -->
                <input type="hidden" id="p_id"> 
                
                <div class="md:col-span-2">
                    <label class="text-xs text-gray-600">Nombre *</label>
                    <input id="p_nombre" placeholder="Ej: Hipotecario" class="w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="text-xs text-gray-600">Tasa % *</label>
                    <input type="number" id="p_tasa" placeholder="%" class="w-full p-2 border rounded" step="0.01" min="0" required>
                </div>
                <div>
                    <label class="text-xs text-gray-600">Mora % *</label>
                    <input type="number" id="p_mora" placeholder="%" class="w-full p-2 border rounded" step="0.01" min="0" required>
                </div>
                <div>
                    <label class="text-xs text-gray-600">Plazo (m) *</label>
                    <input type="number" id="p_plazo" placeholder="Meses" class="w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="text-xs text-gray-600">Comis. %</label>
                    <input type="number" id="p_comision" placeholder="%" class="w-full p-2 border rounded" step="0.01" min="0" value="0">
                </div>
                <div class="md:col-span-6 text-right mt-2">
                    <button type="button" onclick="document.getElementById('formPolitica').classList.add('hidden')" class="btn btn-secondary text-sm">Cancelar</button>
                    <button type="submit" class="btn btn-success text-sm">Guardar Política</button>
                </div>
            </form>
        </div>
    `;
}

// --- LOGICA DE FORMULARIOS ---

function openModalZona() {
    document.getElementById('formZone').classList.remove('hidden');
    document.getElementById('zoneTitle').textContent = 'Nueva Zona';
    document.getElementById('z_id').value = '';
    document.getElementById('z_nombre').value = '';
    document.getElementById('z_responsable').value = '';
    
    // Generar Código Automático
    const nextId = zonasData.length + 1;
    const autoCode = `ZON-${String(nextId).padStart(3, '0')}`;
    
    const inputCodigo = document.getElementById('z_codigo');
    inputCodigo.value = autoCode;
    inputCodigo.readOnly = true; 
}

function editZona(id, nom, cod, resp) {
    document.getElementById('formZone').classList.remove('hidden');
    document.getElementById('zoneTitle').textContent = 'Editar Zona';
    document.getElementById('z_id').value = id;
    document.getElementById('z_nombre').value = nom;
    document.getElementById('z_codigo').value = cod;
    document.getElementById('z_codigo').readOnly = true; 
    document.getElementById('z_responsable').value = resp;
}

async function saveZona(e) {
    e.preventDefault();
    const payload = {
        id: document.getElementById('z_id').value,
        nombre: document.getElementById('z_nombre').value,
        codigo: document.getElementById('z_codigo').value,
        responsable: document.getElementById('z_responsable').value
    };
    await sendData('save_zona', payload);
    loadTabContent('zonas');
}

async function openModalAsesor() {
    const form = document.getElementById('formAsesor');
    form.classList.remove('hidden');
    
    document.getElementById('a_nombre').value = '';
    document.getElementById('a_telefono').value = '';
    
    // Generar Código Automático
    const nextId = asesoresData.length + 1;
    const autoCode = `ASE-${String(nextId).padStart(3, '0')}`;
    
    const inputCodigo = document.getElementById('a_codigo');
    inputCodigo.value = autoCode;
    inputCodigo.readOnly = true; 
    
    // Cargar zonas para el select
    const zonas = await apiCall('configuracion.php?action=zonas');
    const select = document.getElementById('a_zona');
    select.innerHTML = zonas.map(z => `<option value="${z.id}">${z.nombre}</option>`).join('');
}

async function saveAsesor(e) {
    e.preventDefault();
    const payload = {
        nombre: document.getElementById('a_nombre').value,
        codigo: document.getElementById('a_codigo').value,
        telefono: document.getElementById('a_telefono').value,
        zona_id: document.getElementById('a_zona').value
    };
    await sendData('save_asesor', payload);
    loadTabContent('asesores');
}

function openModalPolitica() {
    document.getElementById('formPolitica').classList.remove('hidden');
    document.getElementById('politicaTitle').textContent = 'Nueva Política de Crédito';
    document.getElementById('p_id').value = ''; // Limpiar ID
    document.getElementById('p_nombre').value = '';
    document.getElementById('p_tasa').value = '';
    document.getElementById('p_mora').value = '';
    document.getElementById('p_plazo').value = '';
    document.getElementById('p_comision').value = '0';
}

// NUEVA FUNCIÓN PARA EDITAR POLÍTICA
function editPolitica(id) {
    // Buscar la política en los datos cargados globalmente
    const politica = politicasData.find(p => p.id == id);
    
    if (politica) {
        document.getElementById('formPolitica').classList.remove('hidden');
        document.getElementById('politicaTitle').textContent = 'Editar Política de Crédito';
        
        // Llenar campos
        document.getElementById('p_id').value = politica.id;
        document.getElementById('p_nombre').value = politica.nombre;
        document.getElementById('p_tasa').value = politica.tasa_interes_anual;
        document.getElementById('p_mora').value = politica.tasa_mora_anual;
        document.getElementById('p_plazo').value = politica.plazo_maximo_meses;
        document.getElementById('p_comision').value = politica.comision_admin;
    }
}

async function savePolitica(e) {
    e.preventDefault();
    const payload = {
        id: document.getElementById('p_id').value, // Enviar ID si existe
        nombre: document.getElementById('p_nombre').value,
        tasa: document.getElementById('p_tasa').value,
        mora: document.getElementById('p_mora').value,
        plazo: document.getElementById('p_plazo').value,
        comision: document.getElementById('p_comision').value,
        dias_incobrable: 90
    };
    await sendData('save_politica', payload);
    loadTabContent('politicas');
}

async function sendData(action, payload) {
    try {
        const res = await apiCall(`configuracion.php?action=${action}`, 'POST', payload);
        if(res.success) showModal('Éxito', 'Registro guardado correctamente');
        else showModal('Error', res.error || 'Error al guardar');
    } catch(e) { console.error(e); }
}

async function deleteItem(action, id) {
    if(!confirm('¿Eliminar registro?')) return;
    try {
        const res = await apiCall(`configuracion.php?action=${action}&id=${id}`, 'DELETE');
        if(res.success) {
            loadTabContent(activeConfigTab);
        } else {
            showModal('Error', res.error);
        }
    } catch(e) { console.error(e); }
}