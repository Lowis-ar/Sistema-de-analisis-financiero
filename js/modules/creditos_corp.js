// js/modules/creditos_corp.js

let creditosData = [];

async function loadCreditosCorpModule() {
    showLoading();
    try {
        const creditos = await apiCall('creditos_corp.php?action=list');
        creditosData = Array.isArray(creditos) ? creditos : [];
        renderVistaPrincipal(creditosData);
    } catch(e) { console.error(e); }
}

function renderVistaPrincipal(creditos) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Cartera Corporativa</h2>
                    <p class="text-sm text-gray-500">Gestión de Créditos Jurídicos, Garantías y Mora</p>
                </div>
                <button onclick="showNuevoCreditoCorp()" class="btn btn-primary">
                    <i class="fas fa-file-signature mr-2"></i> Crear Solicitud
                </button>
            </div>

            <!-- Dashboard de Cartera -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${renderKpi('Total Créditos', creditos.length, 'blue')}
                ${renderKpi('Cartera Activa', contarEstado(creditos, 'activo'), 'green')}
                ${renderKpi('En Mora', contarEstado(creditos, 'mora'), 'red')}
                ${renderKpi('Incobrables', contarEstado(creditos, 'incobrable'), 'gray')}
            </div>

            <!-- Tabla -->
            <div class="card overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-100 text-gray-600 uppercase">
                        <tr>
                            <th class="p-3">Contrato</th>
                            <th class="p-3">Cliente / Empresa</th>
                            <th class="p-3">Línea Crédito</th>
                            <th class="p-3 text-right">Monto</th>
                            <th class="p-3 text-right">Saldo</th>
                            <th class="p-3 text-center">Estado</th>
                            <th class="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${renderFilas(creditos)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('main-content').innerHTML = content;
}

function renderFilas(creditos) {
    if(creditos.length === 0) return '<tr><td colspan="7" class="p-4 text-center text-gray-400">Sin cartera activa</td></tr>';
    return creditos.map(c => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 font-mono text-blue-600 font-bold">${c.codigo_contrato}</td>
            <td class="p-3">
                <div class="font-bold text-gray-800">${c.cliente_nombre}</div>
                <div class="text-xs text-gray-500">${c.cliente_doc || ''}</div>
            </td>
            <td class="p-3">${c.tipo_credito}</td>
            <td class="p-3 text-right">${formatCurrency(c.monto_aprobado)}</td>
            <td class="p-3 text-right font-bold">${formatCurrency(c.saldo_capital)}</td>
            <td class="p-3 text-center">${renderBadge(c.estado)}</td>
            <td class="p-3 text-center">
                <button class="text-blue-600 hover:text-blue-800" title="Ver Plan de Pagos"><i class="fas fa-list-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

async function showNuevoCreditoCorp() {
    showLoading();
    
    // Cargar parámetros y clientes en paralelo
    const [params, clientes] = await Promise.all([
        apiCall('creditos_corp.php?action=params'),
        apiCall('clientes.php')
    ]);

    // Filtrar solo las políticas activas
    const politicasOpts = params.politicas ? params.politicas.map(p => 
        `<option value="${p.id}" 
                 data-tasa="${p.tasa_interes_anual}" 
                 data-mora="${p.tasa_mora_anual}" 
                 data-comision="${p.comision_admin}" 
                 data-plazo="${p.plazo_maximo_meses}">
            ${p.nombre} (Tasa: ${p.tasa_interes_anual}%)
        </option>`
    ).join('') : '';

    const clientesOpts = Array.isArray(clientes) ? clientes.map(c => 
        `<option value="${c.id}">${c.codigo} - ${c.nombre || c.razon_social}</option>`
    ).join('') : '';

    const zonasOpts = params.zonas ? params.zonas.map(z => `<option value="${z.id}">${z.nombre}</option>`).join('') : '';
    const asesoresOpts = params.asesores ? params.asesores.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('') : '';

    const content = `
        <div class="card">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h3 class="text-xl font-bold text-gray-800">Solicitud de Crédito Corporativo</h3>
                <button onclick="loadCreditosCorpModule()" class="btn btn-secondary">Cancelar</button>
            </div>

            <form id="formCreditoCorp" onsubmit="guardarCreditoCorp(event)">
                
                <!-- 1. SELECCIÓN DE CLIENTE Y POLÍTICA -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
                    <div class="input-group">
                        <label>Cliente (Empresa)</label>
                        <select id="cliente_id" class="w-full p-2 border rounded" onchange="cargarGarantiasCliente(this.value)" required>
                            <option value="">-- Seleccionar --</option>
                            ${clientesOpts}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Tipo de Préstamo (Política)</label>
                        <select id="politica_id" class="w-full p-2 border rounded" onchange="cargarPolitica(this)" required>
                            <option value="">-- Seleccionar --</option>
                            ${politicasOpts}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Zona / Sucursal</label>
                        <select id="zona_id" class="w-full p-2 border rounded" required>
                            ${zonasOpts}
                        </select>
                    </div>
                </div>

                <!-- 2. CONDICIONES FINANCIERAS -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="input-group">
                        <label>Monto Solicitado ($)</label>
                        <input type="number" id="monto" class="w-full p-2 border rounded font-bold" step="0.01" required>
                    </div>
                    <div class="input-group">
                        <label>Plazo (Meses)</label>
                        <input type="number" id="plazo" class="w-full p-2 border rounded" required>
                        <p class="text-xs text-gray-500" id="plazo_hint"></p>
                    </div>
                    <div class="input-group">
                        <label>Tasa Interés Anual (%)</label>
                        <input type="number" id="tasa" class="w-full p-2 border rounded bg-gray-100" readonly required>
                    </div>
                    <div class="input-group">
                        <label>Comisión Admin (%)</label>
                        <input type="number" id="comision" class="w-full p-2 border rounded bg-gray-100" readonly>
                    </div>
                </div>

                <div class="mb-6 flex justify-between items-end border-b pb-4">
                    <div class="input-group w-1/4">
                        <label>Día de Pago (1-30)</label>
                        <input type="number" id="dia_pago" class="w-full p-2 border rounded" value="1" min="1" max="30" required>
                    </div>
                    <button type="button" onclick="simularCuota()" class="text-blue-600 font-bold underline mb-2">
                        <i class="fas fa-calculator"></i> Simular Cuota
                    </button>
                </div>

                <!-- 3. GARANTÍAS DISPONIBLES (Mobiliarias, Hipotecas, Fiadores) -->
                <div class="mb-6">
                    <h4 class="font-bold text-gray-700 mb-2">Garantías y Respaldos</h4>
                    <div id="garantiasContainer" class="border rounded p-4 bg-gray-50 min-h-[80px]">
                        <p class="text-gray-400 italic text-center">Seleccione un cliente para ver sus activos registrados...</p>
                    </div>
                </div>

                <!-- 4. ASIGNACIÓN -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="input-group">
                        <label>Asesor de Crédito</label>
                        <select id="asesor_id" class="w-full p-2 border rounded">
                            ${asesoresOpts}
                        </select>
                    </div>
                </div>

                <!-- PREVIEW CUOTA -->
                <div id="previewCuota" class="hidden bg-green-50 p-4 rounded mb-4 text-center border border-green-200">
                    <span class="text-green-800">Cuota Mensual Estimada:</span>
                    <strong class="text-2xl text-green-900 block" id="txtCuota">$0.00</strong>
                </div>

                <div class="pt-4 border-t flex justify-end gap-3">
                    <button type="button" onclick="loadCreditosCorpModule()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-check-circle mr-2"></i> Aprobar Crédito y Contrato
                    </button>
                </div>
            </form>
        </div>
    `;
    document.getElementById('main-content').innerHTML = content;
}

// --- LOGICA DE FORMULARIO ---

function cargarPolitica(select) {
    const opt = select.options[select.selectedIndex];
    if(opt.value) {
        document.getElementById('tasa').value = opt.getAttribute('data-tasa');
        document.getElementById('comision').value = opt.getAttribute('data-comision');
        document.getElementById('plazo').value = 12; // Valor default
        document.getElementById('plazo_hint').textContent = `Máx: ${opt.getAttribute('data-plazo')} meses`;
    }
}

async function cargarGarantiasCliente(clienteId) {
    if(!clienteId) return;
    const container = document.getElementById('garantiasContainer');
    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando garantías...';

    try {
        // Obtenemos las garantías usando la API existente
        const todas = await apiCall('garantias.php'); 
        
        // Filtramos en JS las de este cliente (Lo ideal sería filtrar en SQL)
        const propias = Array.isArray(todas) ? todas.filter(g => g.cliente_id == clienteId) : [];

        if(propias.length === 0) {
            container.innerHTML = `
                <div class="text-center text-orange-500">
                    <p>El cliente no tiene garantías registradas.</p>
                    <button type="button" onclick="showGarantiaForm()" class="underline text-blue-600 text-sm mt-1">Registrar Garantía Ahora</button>
                </div>`;
            return;
        }

        container.innerHTML = propias.map(g => `
            <label class="flex items-center justify-between p-3 hover:bg-white border-b cursor-pointer transition-colors">
                <div class="flex items-center gap-3">
                    <input type="checkbox" name="garantias_check" value="${g.id}" 
                           data-tipo="garantia_bien" 
                           data-valor="${g.valor_realizacion}"
                           data-desc="${g.descripcion_bien}"
                           class="form-checkbox h-5 w-5 text-blue-600 rounded">
                    <div>
                        <p class="font-bold text-gray-800">${g.descripcion_bien}</p>
                        <p class="text-xs text-gray-500">${g.tipo_nombre} • Avalúo: ${formatCurrency(g.valor_comercial)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-xs font-bold text-gray-500">Cobertura Máxima</span>
                    <span class="block text-sm font-bold text-blue-600">${formatCurrency(g.valor_realizacion)}</span>
                </div>
            </label>
        `).join('');
    } catch(e) { container.innerHTML = 'Error cargando datos.'; }
}

async function simularCuota() {
    const m = document.getElementById('monto').value;
    const t = document.getElementById('tasa').value;
    const p = document.getElementById('plazo').value;
    const c = document.getElementById('comision').value;

    if(!m || !t || !p) return alert("Complete monto y plazo");

    const plan = await apiCall(`creditos_corp.php?action=simular&monto=${m}&tasa=${t}&plazo=${p}&comision=${c}`);
    if(plan && plan.length > 0) {
        document.getElementById('previewCuota').classList.remove('hidden');
        document.getElementById('txtCuota').textContent = formatCurrency(plan[0].cuota);
    }
}

async function guardarCreditoCorp(e) {
    e.preventDefault();
    
    // Recopilar Garantías marcadas
    const checks = document.querySelectorAll('input[name="garantias_check"]:checked');
    const garantias = Array.from(checks).map(c => ({
        id: c.value,
        tipo: c.getAttribute('data-tipo'),
        valor: c.getAttribute('data-valor'),
        desc: c.getAttribute('data-desc')
    }));

    if(garantias.length === 0 && !confirm("¿Está seguro de crear este crédito SIN GARANTÍA vinculada? Esto aumenta el riesgo.")) return;

    const opt = document.getElementById('politica_id').options[document.getElementById('politica_id').selectedIndex];

    const payload = {
        cliente_id: document.getElementById('cliente_id').value,
        politica_id: document.getElementById('politica_id').value,
        zona_id: document.getElementById('zona_id').value,
        asesor_id: document.getElementById('asesor_id').value,
        monto: document.getElementById('monto').value,
        plazo: document.getElementById('plazo').value,
        tasa: document.getElementById('tasa').value,
        tasa_mora: opt.getAttribute('data-mora'),
        comision_admin: document.getElementById('comision').value,
        dia_pago: document.getElementById('dia_pago').value,
        garantias: garantias
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
        const res = await apiCall('creditos_corp.php?action=create', 'POST', payload);
        if(res.success) {
            showModal('Éxito', `Crédito ${res.codigo} aprobado y contrato generado.`);
            loadCreditosCorpModule();
        } else {
            showModal('Error', res.error || 'Error al guardar');
        }
    } catch(err) { console.error(err); showModal('Error', 'Fallo de conexión'); } 
    finally { 
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}

// Helpers UI
function renderKpi(title, val, color) {
    return `<div class="card border-l-4 border-${color}-500 p-4"><p class="text-xs uppercase text-gray-500">${title}</p><p class="text-xl font-bold text-${color}-700">${val}</p></div>`;
}
function contarEstado(arr, est) { return arr.filter(c => c.estado === est).length; }
function renderBadge(est) {
    const map = { 'activo': 'bg-green-100 text-green-800', 'mora': 'bg-red-100 text-red-800', 'solicitud': 'bg-yellow-100 text-yellow-800', 'incobrable': 'bg-gray-800 text-white' };
    return `<span class="px-2 py-1 rounded text-xs uppercase font-bold ${map[est] || 'bg-gray-100'}">${est}</span>`;
}
