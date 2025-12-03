// js/modules/creditos_corp.js

let creditosData = [];

// ==========================================
// 1. CARGA INICIAL Y LISTADO
// ==========================================

async function loadCreditosCorpModule() {
    showLoading();
    try {
        const creditos = await apiCall('creditos_corp.php?action=list');
        creditosData = Array.isArray(creditos) ? creditos : [];
        renderVistaPrincipal(creditosData);
    } catch(e) { 
        console.error(e);
        document.getElementById('main-content').innerHTML = '<p class="text-red-500 p-4">Error al cargar la cartera.</p>';
    }
}

function renderVistaPrincipal(creditos) {
    const content = `
        <div class="space-y-6 animate-fade-in">
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
                ${renderKpi('Refinanciados', contarEstado(creditos, 'refinanciado'), 'purple')}
            </div>

            <!-- Tabla -->
            <div class="card overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-100 text-gray-600 uppercase">
                        <tr>
                            <th class="p-3">Contrato</th>
                            <th class="p-3">Cliente</th>
                            <th class="p-3">Tipo</th>
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
        
        <!-- Modal Plan Pagos -->
        <div id="modalPlanPagos" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-lg w-11/12 md:w-3/4 max-h-[90vh] flex flex-col shadow-2xl">
                <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 class="font-bold text-lg text-blue-800">Plan de Pagos</h3>
                    <button onclick="cerrarPlanPagos()" class="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
                </div>
                <div class="p-0 overflow-auto flex-1" id="contenidoPlanPagos"></div>
                <div class="p-4 border-t bg-gray-50 text-right rounded-b-lg">
                    <button onclick="cerrarPlanPagos()" class="btn btn-secondary px-6">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('main-content').innerHTML = content;
}

function renderFilas(creditos) {
    if(creditos.length === 0) return '<tr><td colspan="6" class="p-4 text-center text-gray-400">Sin cartera activa</td></tr>';
    
    return creditos.map(c => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-3 font-mono text-blue-600 font-bold">${c.codigo_contrato}</td>
            <td class="p-3">
                <div class="font-bold text-gray-800">${c.cliente_nombre || 'N/A'}</div>
                <div class="text-xs text-gray-500">${c.cliente_doc || ''}</div>
            </td>
            <td class="p-3">${c.tipo_credito}</td>
            <td class="p-3 text-right font-bold">${formatCurrency(c.saldo_capital)}</td>
            <td class="p-3 text-center">${renderBadge(c.estado)}</td>
            <td class="p-3 text-center flex justify-center gap-2">
                ${c.estado === 'activo' || c.estado === 'mora' ? `
                    <button onclick="showFormularioPago(${c.id})" class="text-green-600 hover:text-green-800" title="Abonar">
                        <i class="fas fa-money-bill-wave fa-lg"></i>
                    </button>
                    <!-- BOTÓN REFINANCIAR NUEVO -->
                    <button onclick="prepararRefinanciamiento(${c.id})" class="text-purple-600 hover:text-purple-800" title="Refinanciar Deuda">
                        <i class="fas fa-sync-alt fa-lg"></i>
                    </button>
                ` : ''}
                <button onclick="verPlanPagos(${c.id})" class="text-blue-600 hover:text-blue-800" title="Ver Plan">
                    <i class="fas fa-list-alt fa-lg"></i>
                </button>
            </td>
        </tr>
    `).join('');
}
// ==========================================
// 2. LÓGICA DEL PLAN DE PAGOS (NUEVO)
// ==========================================
async function prepararRefinanciamiento(creditoId) {
    showLoading();
    try {
        // Obtenemos los datos actuales del crédito
        const data = await apiCall(`creditos_corp.php?action=datos_pago&id=${creditoId}`);
        const credito = data.credito;
        const calculos = data.calculos; // Intereses al día de hoy

        // Calculamos deuda total a cancelar
        const saldoCapital = parseFloat(credito.saldo_capital);
        const interesesTotales = parseFloat(calculos.total_interes_pendiente);
        const deudaTotal = saldoCapital + interesesTotales;

        // Preparamos objeto de configuración para el formulario
        const configRefinancia = {
            esRefinanciamiento: true,
            idAnterior: credito.id,
            codigoAnterior: credito.codigo_contrato,
            clienteId: credito.cliente_id,
            montoMinimo: deudaTotal,
            saldoCapital: saldoCapital,
            intereses: interesesTotales
        };

        // Abrimos el formulario estándar pero con datos pre-cargados
        showNuevoCreditoCorp(configRefinancia);

    } catch (e) {
        console.error(e);
        showModal('Error', 'No se pudieron obtener los datos para refinanciar.');
        loadCreditosCorpModule();
    }
}

async function verPlanPagos(creditoId) {
    const modal = document.getElementById('modalPlanPagos');
    const container = document.getElementById('contenidoPlanPagos');
    modal.classList.remove('hidden');
    container.innerHTML = '<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i></div>';

    try {
       const plan = await apiCall(`creditos_corp.php?action=detalle_plan&id=${creditoId}`);
        if (!plan || plan.length === 0) { container.innerHTML = '<div class="text-center py-10">Sin plan de pagos.</div>'; return; }

        // Renderizar tabla de amortización
        let html = `
            <table class="w-full text-sm text-left border-collapse">
                <thead class="bg-blue-50 text-blue-800 sticky top-0 shadow-sm">
                    <tr>
                        <th class="p-3 text-center">#</th>
                        <th class="p-3 text-center">Vencimiento</th>
                        <th class="p-3 text-right">Capital</th>
                        <th class="p-3 text-right">Interés</th>
                        <th class="p-3 text-right">Comisión</th>
                        <th class="p-3 text-right font-bold">Cuota Total</th>
                        <th class="p-3 text-right text-gray-500">Saldo</th>
                        <th class="p-3 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
        `;

        plan.forEach(cuota => {
            // Estilos según estado de la cuota
            let estadoClass = 'bg-gray-100 text-gray-600';
            if(cuota.estado === 'pagado') estadoClass = 'bg-green-100 text-green-700';
            if(cuota.estado === 'vencido') estadoClass = 'bg-red-100 text-red-700 font-bold';
            
            // Verificar fecha de hoy para marcar próximas vencidas
            const hoy = new Date().toISOString().split('T')[0];
            const esProximo = cuota.estado === 'pendiente' && cuota.fecha_vencimiento < hoy;
            if(esProximo) estadoClass = 'bg-orange-50 text-orange-600 border border-orange-200';

            html += `
                <tr class="hover:bg-blue-50 transition-colors">
                    <td class="p-3 text-center font-mono">${cuota.numero_cuota}</td>
                    <td class="p-3 text-center">${cuota.fecha_vencimiento}</td>
                    <td class="p-3 text-right">${formatCurrency(cuota.capital_programado)}</td>
                    <td class="p-3 text-right">${formatCurrency(cuota.interes_programado)}</td>
                    <td class="p-3 text-right text-xs text-gray-500">${formatCurrency(cuota.comision_programada || 0)}</td>
                    <td class="p-3 text-right font-bold text-blue-900">${formatCurrency(cuota.cuota_total)}</td>
                    <td class="p-3 text-right text-gray-500 italic">${formatCurrency(cuota.saldo_proyectado)}</td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-1 rounded text-xs uppercase ${estadoClass}">
                            ${esProximo ? 'VENCIDO' : cuota.estado}
                        </span>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-red-500 text-center py-10">Error de conexión al cargar el plan.</p>';
    }
}

function cerrarPlanPagos() {
    document.getElementById('modalPlanPagos').classList.add('hidden');
}

// ==========================================
// 3. FORMULARIO DE SOLICITUD
// ==========================================

async function showNuevoCreditoCorp(refinanciaData = null) {
    showLoading();
    
    try {
        const [params, clientes] = await Promise.all([
            apiCall('creditos_corp.php?action=params'),
            apiCall('clientes.php')
        ]);

        if (!params || !clientes) throw new Error("Datos incompletos.");

        // Construcción de opciones...
        const politicasOpts = params.politicas ? params.politicas.map(p => 
            `<option value="${p.id}" data-tasa="${p.tasa_interes_anual}" data-mora="${p.tasa_mora_anual}" 
                     data-comision="${p.comision_admin}" data-plazo="${p.plazo_maximo_meses}">
                ${p.nombre} (Tasa: ${p.tasa_interes_anual}%)
            </option>`
        ).join('') : '';

        const clientesOpts = Array.isArray(clientes) ? clientes.map(c => 
            `<option value="${c.id}" ${refinanciaData && refinanciaData.clienteId == c.id ? 'selected' : ''}>
                ${c.codigo} - ${c.nombre || c.razon_social}
            </option>`
        ).join('') : '';

        const zonasOpts = params.zonas ? params.zonas.map(z => `<option value="${z.id}">${z.nombre}</option>`).join('') : '';
        const asesoresOpts = params.asesores ? params.asesores.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('') : '';

        // UI Condicional para Refinanciamiento
        let alertaRefinancia = '';
        let montoValue = '';
        let tituloForm = 'Solicitud de Crédito Corporativo';
        let hiddenRefinancia = '';

        if (refinanciaData) {
            tituloForm = `Refinanciamiento de Contrato ${refinanciaData.codigoAnterior}`;
            montoValue = refinanciaData.montoMinimo.toFixed(2);
            hiddenRefinancia = `<input type="hidden" id="refinancia_id" value="${refinanciaData.idAnterior}">`;
            
            alertaRefinancia = `
                <div class="bg-purple-50 border-l-4 border-purple-600 p-4 mb-6 rounded">
                    <div class="flex">
                        <div class="flex-shrink-0"><i class="fas fa-sync-alt text-purple-600"></i></div>
                        <div class="ml-3">
                            <p class="text-sm text-purple-700 font-bold">Resumen de Liquidación:</p>
                            <ul class="text-xs text-purple-600 list-disc ml-4 mt-1">
                                <li>Capital Anterior: ${formatCurrency(refinanciaData.saldoCapital)}</li>
                                <li>Intereses al día: ${formatCurrency(refinanciaData.intereses)}</li>
                                <li><strong>Total a Cancelar: ${formatCurrency(refinanciaData.montoMinimo)}</strong></li>
                            </ul>
                            <p class="text-xs mt-2 text-purple-800">El nuevo monto debe ser igual o mayor a la deuda total.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        const content = `
            <div class="card animate-fade-in">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 class="text-xl font-bold text-gray-800">${tituloForm}</h3>
                    <button onclick="loadCreditosCorpModule()" class="btn btn-secondary">Cancelar</button>
                </div>

                ${alertaRefinancia}

                <form id="formCreditoCorp" onsubmit="guardarCreditoCorp(event)">
                    ${hiddenRefinancia}
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Cliente *</label>
                            <!-- Si es refinanciamiento, bloqueamos el select de cliente -->
                            <select id="cliente_id" class="w-full p-2 border rounded bg-white" 
                                    onchange="cargarGarantiasCliente(this.value)" required 
                                    ${refinanciaData ? 'disabled' : ''}>
                                <option value="">-- Seleccionar --</option>
                                ${clientesOpts}
                            </select>
                            <!-- Input oculto si está disabled -->
                            ${refinanciaData ? `<input type="hidden" id="cliente_id_hidden" value="${refinanciaData.clienteId}">` : ''}
                        </div>
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Política *</label>
                            <select id="politica_id" class="w-full p-2 border rounded" onchange="cargarPolitica(this)" required>
                                <option value="">-- Seleccionar --</option>
                                ${politicasOpts}
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Zona *</label>
                            <select id="zona_id" class="w-full p-2 border rounded" required>
                                <option value="">-- Seleccionar --</option>
                                ${zonasOpts}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Monto Nuevo ($) *</label>
                            <input type="number" id="monto" class="w-full p-2 border rounded font-bold text-blue-900" 
                                   step="0.01" min="${refinanciaData ? refinanciaData.montoMinimo : '0.01'}" 
                                   value="${montoValue}" required>
                        </div>
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Plazo (Meses) *</label>
                            <input type="number" id="plazo" class="w-full p-2 border rounded" min="1" required>
                            <p class="text-xs text-gray-500 mt-1" id="plazo_hint"></p>
                        </div>
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Tasa Anual (%)</label>
                            <input type="number" id="tasa" class="w-full p-2 border rounded bg-gray-100" readonly required>
                        </div>
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Comisión (%)</label>
                            <input type="number" id="comision" class="w-full p-2 border rounded bg-gray-100" readonly>
                        </div>
                    </div>

                    <div class="mb-6 flex justify-between items-end border-b pb-4">
                        <div class="input-group w-40">
                            <label class="text-sm font-bold text-gray-700">Día Pago (1-30) *</label>
                            <input type="number" id="dia_pago" class="w-full p-2 border rounded" value="1" min="1" max="30" required>
                        </div>
                        <button type="button" onclick="simularCuota()" class="text-blue-600 font-bold underline mb-2">
                            <i class="fas fa-calculator"></i> Simular Cuota
                        </button>
                    </div>

                    <div class="mb-6">
                        <h4 class="font-bold text-gray-700 mb-2 border-l-4 border-yellow-500 pl-2">Garantías y Respaldos</h4>
                        <div id="garantiasContainer" class="border rounded p-4 bg-gray-50 min-h-[80px] max-h-[200px] overflow-y-auto">
                            <p class="text-gray-400 italic text-center py-4">
                                ${refinanciaData ? 'Cargando activos...' : 'Seleccione un cliente...'}
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div class="input-group">
                            <label class="text-sm font-bold text-gray-700">Asesor de Crédito</label>
                            <select id="asesor_id" class="w-full p-2 border rounded">
                                <option value="">-- Opcional --</option>
                                ${asesoresOpts}
                            </select>
                        </div>
                    </div>

                    <div id="previewCuota" class="hidden bg-green-50 p-4 rounded mb-4 text-center border border-green-200">
                        <span class="text-green-800 font-medium">Cuota Mensual Estimada:</span>
                        <strong class="text-3xl text-green-900 block mt-1" id="txtCuota">$0.00</strong>
                    </div>

                    <div class="pt-4 border-t flex justify-end gap-3">
                        <button type="button" onclick="loadCreditosCorpModule()" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-success px-6">
                            <i class="fas fa-check-circle mr-2"></i> ${refinanciaData ? 'Aprobar Refinanciamiento' : 'Aprobar Crédito'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;

        // Si es refinanciamiento, cargamos las garantías del cliente preseleccionado
        if (refinanciaData) {
            cargarGarantiasCliente(refinanciaData.clienteId);
        }

    } catch (e) {
        console.error(e);
        document.getElementById('main-content').innerHTML = '<p class="text-red-500 p-4">Error al cargar formulario.</p>';
    }
}

function cargarPolitica(select) {
    const opt = select.options[select.selectedIndex];
    if(opt.value) {
        document.getElementById('tasa').value = opt.getAttribute('data-tasa');
        document.getElementById('comision').value = opt.getAttribute('data-comision');
        document.getElementById('plazo').value = 12; 
        document.getElementById('plazo_hint').textContent = `Máx: ${opt.getAttribute('data-plazo')} meses`;
    }
}

// ==========================================
// 4. FUNCIONES AUXILIARES
// ==========================================

function cargarPolitica(select) {
    const opt = select.options[select.selectedIndex];
    if(opt.value) {
        document.getElementById('tasa').value = opt.getAttribute('data-tasa');
        document.getElementById('comision').value = opt.getAttribute('data-comision');
        document.getElementById('plazo').value = 12; 
        document.getElementById('plazo_hint').textContent = `Máx: ${opt.getAttribute('data-plazo')} meses`;
    }
}

async function cargarGarantiasCliente(clienteId) {
    const container = document.getElementById('garantiasContainer');
    if(!clienteId) return;
    
    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-blue-500"></i> Buscando garantías...</div>';

    try {
        const todas = await apiCall('garantias.php'); 
        const propias = Array.isArray(todas) ? todas.filter(g => g.cliente_id == clienteId) : [];

        if(propias.length === 0) {
            container.innerHTML = '<div class="text-center text-orange-500 py-4"><p>El cliente no tiene garantías registradas.</p></div>';
            return;
        }

        container.innerHTML = propias.map(g => `
            <label class="flex items-center justify-between p-3 hover:bg-white border-b cursor-pointer">
                <div class="flex items-center gap-3">
                    <input type="checkbox" name="garantias_check" value="${g.id}" 
                           data-tipo="garantia_bien" data-valor="${g.valor_realizacion}" data-desc="${g.descripcion_bien}"
                           class="form-checkbox h-5 w-5 text-blue-600 rounded">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${g.descripcion_bien}</p>
                        <p class="text-xs text-gray-500">${g.tipo_nombre} • Avalúo: ${formatCurrency(g.valor_comercial)}</p>
                    </div>
                </div>
                <span class="text-sm font-bold text-green-600">${formatCurrency(g.valor_realizacion)}</span>
            </label>
        `).join('');
    } catch(e) { container.innerHTML = '<p class="text-red-500">Error.</p>'; }
}

async function simularCuota() {
    const m = parseFloat(document.getElementById('monto').value);
    const t = parseFloat(document.getElementById('tasa').value);
    const p = parseFloat(document.getElementById('plazo').value);
    const c = parseFloat(document.getElementById('comision').value) || 0;

    if(isNaN(m) || m <= 0 || isNaN(p)) return showModal('Atención', 'Datos incompletos para simular.');

    try {
        const plan = await apiCall(`creditos_corp.php?action=simular&monto=${m}&tasa=${t}&plazo=${p}&comision=${c}`);
        if(plan && plan.length > 0) {
            document.getElementById('previewCuota').classList.remove('hidden');
            document.getElementById('txtCuota').textContent = formatCurrency(plan[0].cuota);
        }
    } catch(e) { console.error(e); }
}

async function guardarCreditoCorp(e) {
    e.preventDefault();
    
    // Si el select está disabled (refinanciamiento), tomamos el valor del hidden
    let clienteId = document.getElementById('cliente_id').value;
    if (!clienteId && document.getElementById('cliente_id_hidden')) {
        clienteId = document.getElementById('cliente_id_hidden').value;
    }

    const politicaId = document.getElementById('politica_id').value;
    const zonaId = document.getElementById('zona_id').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const plazo = parseInt(document.getElementById('plazo').value);
    
    // Verificar refinanciamiento
    const refinanciaIdInput = document.getElementById('refinancia_id');
    const refinanciaId = refinanciaIdInput ? refinanciaIdInput.value : null;

    if (!clienteId || !politicaId || !zonaId) return showModal('Error', 'Complete campos obligatorios.');
    if (isNaN(monto) || monto <= 0) return showModal('Error', 'Monto inválido.');

    const checks = document.querySelectorAll('input[name="garantias_check"]:checked');
    const garantias = Array.from(checks).map(c => ({
        id: c.value, tipo: c.getAttribute('data-tipo'), valor: c.getAttribute('data-valor'), desc: c.getAttribute('data-desc')
    }));

    if(garantias.length === 0 && !confirm("⚠️ ¿Crear crédito SIN GARANTÍA?")) return;

    const optPolitica = document.getElementById('politica_id').options[document.getElementById('politica_id').selectedIndex];
    
    const payload = {
        cliente_id: clienteId,
        politica_id: politicaId,
        zona_id: zonaId,
        asesor_id: document.getElementById('asesor_id').value,
        monto: monto,
        plazo: plazo,
        tasa: document.getElementById('tasa').value,
        tasa_mora: optPolitica.getAttribute('data-mora'),
        comision_admin: document.getElementById('comision').value,
        dia_pago: document.getElementById('dia_pago').value,
        garantias: garantias,
        refinancia_id: refinanciaId // Enviamos el ID si existe
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    // Importante: Si hay refinancia_id, la acción debería ser 'refinanciar' o el backend debe detectarlo
    // Nuestro backend unificado en 'crearCredito' ya maneja esto, pero para claridad usamos 'refinanciar' si existe
    const action = refinanciaId ? 'refinanciar' : 'create';

    try {
        const res = await apiCall(`creditos_corp.php?action=${action}`, 'POST', payload);
        if(res.success) {
            showModal('¡Éxito!', `Operación completada. Contrato: ${res.codigo}`);
            loadCreditosCorpModule();
        } else {
            showModal('Error', res.error || 'Error al guardar');
        }
    } catch(err) { console.error(err); showModal('Error', 'Fallo de conexión'); } 
    finally { btn.disabled = false; btn.innerHTML = 'Aprobar'; }
}

// Helpers UI
function renderKpi(title, val, color) {
    return `<div class="card border-l-4 border-${color}-500 p-4 shadow-sm"><p class="text-xs uppercase text-gray-500 font-bold">${title}</p><p class="text-xl font-bold text-${color}-700 mt-1">${val}</p></div>`;
}
function contarEstado(arr, est) { return arr.filter(c => c.estado === est).length; }
function renderBadge(est) {
    const map = { 'activo': 'bg-green-100 text-green-800', 'mora': 'bg-red-100 text-red-800', 'refinanciado': 'bg-purple-100 text-purple-800' };
    return `<span class="px-2 py-1 rounded text-xs uppercase font-bold border ${map[est] || 'bg-gray-100'}">${est}</span>`;
}

async function showFormularioPago(creditoId) {
    showLoading();
    try {
        const data = await apiCall(`creditos_corp.php?action=datos_pago&id=${creditoId}`);
        const credito = data.credito;
        const calculos = data.calculos;
        const hoy = new Date().toISOString().split('T')[0];
        
        // Determinar fecha base para el input
        // Si nunca ha pagado, usa desembolso. Si ya pagó, usa ultimo pago.
        const fechaUltimoPago = credito.fecha_ultimo_pago || credito.fecha_desembolso;

        const content = `
            <div class="card animate-fade-in max-w-2xl mx-auto border-t-4 border-green-600">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800"><i class="fas fa-cash-register mr-2"></i> Registrar Cobro</h3>
                        <p class="text-sm text-gray-500">Contrato: ${credito.codigo_contrato}</p>
                    </div>
                    <button onclick="loadCreditosCorpModule()" class="btn btn-secondary">Cancelar</button>
                </div>

                <!-- RESUMEN DE SALDOS -->
                <div class="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded border">
                    <div>
                        <p class="text-xs text-gray-500 uppercase">Saldo Capital Actual</p>
                        <p class="text-2xl font-bold text-blue-800" id="displaySaldo">${formatCurrency(credito.saldo_capital)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500 uppercase">Interés Acumulado Pendiente</p>
                        <p class="text-xl font-bold text-orange-600" id="displayPendiente">${formatCurrency(credito.interes_pendiente)}</p>
                    </div>
                </div>

                <form id="formPago" onsubmit="guardarPago(event)">
                    <input type="hidden" id="pago_credito_id" value="${credito.id}">
                    
                    <!-- DATOS PARA CÁLCULO JS -->
                    <input type="hidden" id="hidden_saldo_capital" value="${credito.saldo_capital}">
                    <input type="hidden" id="hidden_tasa" value="${credito.tasa_interes_aplicada}">
                    <input type="hidden" id="hidden_interes_pendiente" value="${credito.interes_pendiente}">
                    <input type="hidden" id="hidden_fecha_ultimo" value="${fechaUltimoPago}">

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="input-group">
                            <label class="font-bold text-gray-700">Fecha de Pago Real *</label>
                            <input type="date" id="fecha_pago_real" class="w-full p-2 border rounded font-bold" 
                                   value="${hoy}" required onchange="recalcularInteresAlDia()">
                            <p class="text-xs text-gray-500 mt-1">Días desde último pago: <span id="dias_transcurridos" class="font-bold">0</span></p>
                        </div>

                        <div class="input-group">
                            <label class="font-bold text-green-700">Monto a Pagar ($) *</label>
                            <input type="number" id="monto_pagado" class="w-full p-2 border-2 border-green-500 rounded font-bold text-xl" 
                                   step="0.01" value="0.00" oninput="simularDistribucion()" required>
                        </div>
                    </div>

                    <!-- SIMULACIÓN DE DISTRIBUCIÓN -->
                    <div class="bg-blue-50 p-4 rounded mb-6 border border-blue-100">
                        <h4 class="text-sm font-bold text-blue-800 mb-2 border-b border-blue-200 pb-1">Distribución Estimada del Pago</h4>
                        <div class="grid grid-cols-3 gap-2 text-center text-sm">
                            <div class="bg-white p-2 rounded shadow-sm">
                                <span class="block text-xs text-gray-500">1. Interés Pendiente</span>
                                <strong class="text-orange-600" id="sim_pendiente">$0.00</strong>
                            </div>
                            <div class="bg-white p-2 rounded shadow-sm">
                                <span class="block text-xs text-gray-500">2. Interés del Periodo</span>
                                <strong class="text-blue-600" id="sim_periodo">$0.00</strong>
                            </div>
                            <div class="bg-white p-2 rounded shadow-sm border-l-4 border-green-500">
                                <span class="block text-xs text-gray-500">3. A Capital (Resta)</span>
                                <strong class="text-green-700 text-lg" id="sim_capital">$0.00</strong>
                            </div>
                        </div>
                        <div class="mt-2 text-right">
                            <span class="text-xs font-bold text-gray-600">Total Interés a Cubrir: </span>
                            <span class="text-sm font-bold text-red-600" id="sim_total_interes">$0.00</span>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="submit" class="btn btn-success px-6 py-2 shadow-lg hover:shadow-xl transition-shadow">
                            <i class="fas fa-check mr-2"></i> Aplicar Pago
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;
        
        // Iniciar cálculos
        recalcularInteresAlDia();

    } catch (e) {
        console.error(e);
        showModal('Error', 'No se pudo cargar la interfaz de cobro.');
    }
}

function recalcularInteresAlDia() {
    const fechaPago = new Date(document.getElementById('fecha_pago_real').value);
    // Ajustar zona horaria para evitar desfases de día
    const fechaPagoUTC = new Date(fechaPago.getTime() + fechaPago.getTimezoneOffset() * 60000);
    
    const fechaUltimoStr = document.getElementById('hidden_fecha_ultimo').value;
    const fechaUltimo = new Date(fechaUltimoStr);
    const fechaUltimoUTC = new Date(fechaUltimo.getTime() + fechaUltimo.getTimezoneOffset() * 60000);

    const saldoCapital = parseFloat(document.getElementById('hidden_saldo_capital').value);
    const tasaAnual = parseFloat(document.getElementById('hidden_tasa').value);
    
    // Cálculo de días (Diferencia en milisegundos / ms por día)
    const diffTime = fechaPagoUTC - fechaUltimoUTC;
    let dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (dias < 0) dias = 0; // No permitir fechas anteriores
    
    document.getElementById('dias_transcurridos').textContent = dias;

    // Cálculo Bancario: Interés Simple (Saldo * TasaDiaria * Días)
    const interesDiario = (saldoCapital * (tasaAnual / 100)) / 360;
    const interesPeriodo = interesDiario * dias;

    // Guardar en atributo para usar en simulación
    document.getElementById('sim_periodo').dataset.value = interesPeriodo;
    
    // Ejecutar distribución visual
    simularDistribucion();
}

// 2. Distribuye el monto ingresado según la prelación de pagos
function simularDistribucion() {
    const inputMonto = document.getElementById('monto_pagado');
    let monto = parseFloat(inputMonto.value) || 0;
    
    const intPendiente = parseFloat(document.getElementById('hidden_interes_pendiente').value) || 0;
    const intPeriodo = parseFloat(document.getElementById('sim_periodo').dataset.value) || 0;
    const saldoCapital = parseFloat(document.getElementById('hidden_saldo_capital').value) || 0;
    
    const totalInteresExigible = intPendiente + intPeriodo;
    const maximoPagable = totalInteresExigible + saldoCapital;

    // VALIDACIÓN: No permitir pagar más de la deuda total (Liquidación)
    if (monto > maximoPagable + 0.01) {
        monto = maximoPagable;
        inputMonto.value = maximoPagable.toFixed(2);
    }
    
    // Lógica de cascada
    let remanente = monto;
    
    // A. Cubrir Interés Pendiente
    let pagoPendiente = 0;
    if (remanente >= intPendiente) {
        pagoPendiente = intPendiente;
    } else {
        pagoPendiente = remanente;
    }
    remanente -= pagoPendiente;
    
    // B. Cubrir Interés del Periodo
    let pagoPeriodo = 0;
    if (remanente >= intPeriodo) {
        pagoPeriodo = intPeriodo;
    } else {
        pagoPeriodo = remanente;
    }
    remanente -= pagoPeriodo;
    
    // C. Capital
    let pagoCapital = remanente; // Lo que sobre va a capital

    // Actualizar UI
    document.getElementById('sim_pendiente').textContent = formatCurrency(pagoPendiente);
    document.getElementById('sim_periodo').textContent = formatCurrency(pagoPeriodo);
    document.getElementById('sim_capital').textContent = formatCurrency(pagoCapital);
    document.getElementById('sim_total_interes').textContent = formatCurrency(totalInteresExigible);
    
    // Advertencia visual si no cubre intereses
    const lblCapital = document.getElementById('sim_capital');
    if (pagoCapital <= 0 && monto > 0 && monto < maximoPagable) {
        lblCapital.className = "text-red-600 text-lg font-bold";
        lblCapital.textContent = "$0.00 (Insuficiente)";
    } else if (monto >= maximoPagable - 0.01) {
        lblCapital.className = "text-purple-600 text-lg font-bold";
        lblCapital.textContent = formatCurrency(pagoCapital) + " (Liquidación)";
    } else {
        lblCapital.className = "text-green-700 text-lg font-bold";
    }
}

async function guardarPago(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    const payload = {
        credito_id: document.getElementById('pago_credito_id').value,
        monto_pagado: document.getElementById('monto_pagado').value,
        fecha_pago: document.getElementById('fecha_pago_real').value
    };

    try {
        const res = await apiCall('creditos_corp.php?action=registrar_pago', 'POST', payload);
        if(res.success) {
            showModal('Pago Exitoso', `Recibo: ${res.recibo}\n${res.message}`);
            loadCreditosCorpModule();
        } else {
            showModal('Error', res.error || 'Error al procesar pago');
        }
    } catch(err) { console.error(err); } 
    finally { 
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}