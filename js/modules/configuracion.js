// js/modules/configuracion.js

let activeConfigTab = 'zonas';

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
        
        if (tab === 'zonas') renderZonas(data, container);
        else if (tab === 'asesores') renderAsesores(data, container);
        else if (tab === 'politicas') renderPoliticas(data, container);
        
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
        
        <!-- Modal Zona (Hidden by default logic, injected here for simplicity or use global modal) -->
        <div id="formZone" class="hidden mt-4 p-4 bg-gray-50 rounded border">
            <form onsubmit="saveZona(event)" class="flex gap-2 items-end">
                <input type="hidden" id="z_id">
                <div class="flex-1"><label class="text-xs">Nombre</label><input id="z_nombre" class="w-full p-1 border rounded" required></div>
                <div class="w-24"><label class="text-xs">Código</label><input id="z_codigo" class="w-full p-1 border rounded" required></div>
                <div class="flex-1"><label class="text-xs">Responsable</label><input id="z_responsable" class="w-full p-1 border rounded"></div>
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
        
        <!-- Formulario Inline Simple -->
        <div id="formAsesor" class="hidden mt-4 p-4 bg-blue-50 rounded border border-blue-200">
            <h4 class="text-sm font-bold mb-2">Registrar Asesor</h4>
            <form onsubmit="saveAsesor(event)" class="grid grid-cols-4 gap-2">
                <input id="a_nombre" placeholder="Nombre Completo" class="p-2 border rounded" required>
                <input id="a_codigo" placeholder="Código (ASE-001)" class="p-2 border rounded" required>
                <input id="a_telefono" placeholder="Teléfono" class="p-2 border rounded">
                <select id="a_zona" class="p-2 border rounded" required><option>Cargando zonas...</option></select>
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
            <h4 class="text-sm font-bold mb-2">Nueva Política de Crédito</h4>
            <form onsubmit="savePolitica(event)" class="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div class="md:col-span-2"><input id="p_nombre" placeholder="Nombre (Ej: Hipotecario)" class="w-full p-2 border rounded" required></div>
                <div><input type="number" id="p_tasa" placeholder="Tasa %" class="w-full p-2 border rounded" step="0.01" required></div>
                <div><input type="number" id="p_mora" placeholder="Mora %" class="w-full p-2 border rounded" step="0.01" required></div>
                <div><input type="number" id="p_plazo" placeholder="Plazo (m)" class="w-full p-2 border rounded" required></div>
                <div><input type="number" id="p_comision" placeholder="Comis. %" class="w-full p-2 border rounded" step="0.01" value="0"></div>
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
    document.getElementById('z_id').value = '';
    document.getElementById('z_nombre').value = '';
    document.getElementById('z_codigo').value = '';
}

function editZona(id, nom, cod, resp) {
    document.getElementById('formZone').classList.remove('hidden');
    document.getElementById('z_id').value = id;
    document.getElementById('z_nombre').value = nom;
    document.getElementById('z_codigo').value = cod;
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
}

async function savePolitica(e) {
    e.preventDefault();
    const payload = {
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
            // Recargar la pestaña activa
            loadTabContent(activeConfigTab);
        } else {
            showModal('Error', res.error);
        }
    } catch(e) { console.error(e); }
}