let selectedClienteFinanciero = null;

// Carga inicial: Muestra selector de clientes
async function loadFinancieroModule() {
    // Aquí sí usamos showLoading porque estamos cargando el módulo entero
    showLoading(); 
    
    try {
        const clientes = await apiCall('financiero.php'); 
        
        const options = Array.isArray(clientes) ? clientes.map(c => 
            `<option value="${c.id}">${c.razon_social} (NIT: ${c.nit})</option>`
        ).join('') : '';

        const content = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">Información Financiera (Empresas)</h2>
                </div>

                <div class="card border-l-4 border-purple-500">
                    <div class="flex gap-4 items-end">
                        <div class="flex-1">
                            <label class="block font-bold text-gray-700 mb-2">Seleccione Empresa para analizar:</label>
                            <select id="selectClienteFinanciero" class="w-full p-3 border rounded text-lg">
                                <option value="">-- Buscar Cliente Jurídico --</option>
                                ${options}
                            </select>
                        </div>
                        <button onclick="cargarHistorialFinanciero()" class="btn btn-primary h-12 px-6">
                            <i class="fas fa-search mr-2"></i> Consultar
                        </button>
                    </div>
                </div>

                <div id="financieroWorkspace" class="hidden"></div>
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    } catch (e) {
        console.error(e);
        document.getElementById('main-content').innerHTML = '<p class="text-red-500 p-4">Error cargando módulo.</p>';
    }
}

// CORRECCIÓN PRINCIPAL AQUÍ
async function cargarHistorialFinanciero() {
    const clienteId = document.getElementById('selectClienteFinanciero').value;
    if (!clienteId) return showModal('Atención', 'Seleccione una empresa primero.');
    
    selectedClienteFinanciero = clienteId;
    
    // 1. Obtenemos referencia al div ANTES de hacer nada
    const workspace = document.getElementById('financieroWorkspace');
    if (!workspace) return; // Seguridad extra

    // 2. Mostramos el div y ponemos el spinner DENTRO de él (sin borrar el resto de la pantalla)
    workspace.classList.remove('hidden');
    workspace.innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p class="text-gray-500">Cargando estados financieros...</p>
        </div>
    `;

    try {
        const estados = await apiCall(`financiero.php?cliente_id=${clienteId}`);
        renderTablaFinanciera(estados || []);
    } catch (e) {
        console.error(e);
        workspace.innerHTML = '<p class="text-red-500 text-center py-4">Error cargando datos del servidor.</p>';
    }
}

function renderTablaFinanciera(estados) {
    const workspace = document.getElementById('financieroWorkspace');
    if (!workspace) return; // Validación de seguridad

    let html = `
        <div class="flex justify-between items-center mb-4 mt-6">
            <h3 class="text-xl font-bold text-gray-700">Historial de Estados Financieros</h3>
            <button onclick="showFormularioFinanciero()" class="btn btn-success">
                <i class="fas fa-plus mr-2"></i> Nuevo Periodo
            </button>
        </div>
    `;

    if (estados.length === 0) {
        html += `
            <div class="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300">
                <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No hay información financiera registrada para esta empresa.</p>
            </div>
        `;
    } else {
        html += `
            <div class="overflow-x-auto card p-0">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100 text-gray-600 uppercase text-xs">
                        <tr>
                            <th class="p-3">Periodo</th>
                            <th class="p-3">Fecha Corte</th>
                            <th class="p-3 text-right">Total Activos</th>
                            <th class="p-3 text-right">Ventas</th>
                            <th class="p-3 text-right">Utilidad Neta</th>
                            <th class="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${estados.map(e => {
                            const totalActivo = parseFloat(e.activo_corriente || 0) + parseFloat(e.activo_no_corriente || 0);
                            return `
                            <tr class="hover:bg-gray-50">
                                <td class="p-3 font-bold text-blue-600">${e.anio} - ${e.periodo}</td>
                                <td class="p-3">${e.fecha_corte}</td>
                                <td class="p-3 text-right">${formatCurrency(totalActivo)}</td>
                                <td class="p-3 text-right">${formatCurrency(e.ventas_ingresos)}</td>
                                <td class="p-3 text-right font-bold ${e.utilidad_neta < 0 ? 'text-red-600' : 'text-green-600'}">
                                    ${formatCurrency(e.utilidad_neta)}
                                </td>
                                <td class="p-3 text-center">
                                    <button class="text-blue-500 hover:text-blue-700" title="Ver Detalle"><i class="fas fa-eye"></i></button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    workspace.innerHTML = html;
}

// Mostrar formulario de ingreso de datos
function showFormularioFinanciero() {
    const workspace = document.getElementById('financieroWorkspace');
    // Guardamos el historial actual por si cancela (opcional, o recargamos)
    
    workspace.innerHTML = `
        <div class="card border-t-4 border-green-500 animate-fade-in">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">Registrar Balance y Estado de Resultados</h3>
                <button onclick="cargarHistorialFinanciero()" class="btn btn-secondary">Cancelar</button>
            </div>

            <form id="formFinanciero" onsubmit="saveFinanciero(event)">
                <input type="hidden" id="cliente_id" value="${selectedClienteFinanciero}">
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
                    <div class="input-group">
                        <label>Año Fiscal</label>
                        <input type="number" id="anio" class="w-full p-2 border rounded" value="${new Date().getFullYear()}">
                    </div>
                    <div class="input-group">
                        <label>Periodo (Ej: Anual 2024)</label>
                        <input type="text" id="periodo" class="w-full p-2 border rounded" placeholder="Anual / Trimestre 1">
                    </div>
                    <div class="input-group">
                        <label>Fecha de Corte</label>
                        <input type="date" id="fecha_corte" class="w-full p-2 border rounded">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 class="font-bold text-blue-800 border-b-2 border-blue-200 mb-4 pb-1">1. Balance General</h4>
                        
                        <div class="input-group mb-2">
                            <label>Activo Corriente (+)</label>
                            <input type="number" id="activo_corriente" class="w-full p-2 border rounded" step="0.01" oninput="calcBalance()">
                        </div>
                        <div class="input-group mb-4">
                            <label>Activo No Corriente (+)</label>
                            <input type="number" id="activo_no_corriente" class="w-full p-2 border rounded" step="0.01" oninput="calcBalance()">
                        </div>
                        <div class="text-right font-bold text-blue-600 mb-6">Total Activo: <span id="total_activo">$0.00</span></div>

                        <div class="input-group mb-2">
                            <label>Pasivo Corriente (-)</label>
                            <input type="number" id="pasivo_corriente" class="w-full p-2 border rounded" step="0.01" oninput="calcBalance()">
                        </div>
                        <div class="input-group mb-4">
                            <label>Pasivo No Corriente (-)</label>
                            <input type="number" id="pasivo_no_corriente" class="w-full p-2 border rounded" step="0.01" oninput="calcBalance()">
                        </div>
                        <div class="input-group mb-2">
                            <label>Patrimonio</label>
                            <input type="number" id="patrimonio" class="w-full p-2 border rounded" step="0.01" oninput="calcBalance()">
                        </div>
                        
                        <div class="p-2 rounded bg-gray-100 text-center text-sm transition-colors duration-300" id="ecuacion_contable">
                            Activo = Pasivo + Patrimonio
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-green-800 border-b-2 border-green-200 mb-4 pb-1">2. Estado de Resultados</h4>
                        
                        <div class="input-group mb-2">
                            <label>Ventas / Ingresos Totales (+)</label>
                            <input type="number" id="ventas" class="w-full p-2 border rounded font-bold" step="0.01" oninput="calcResultados()">
                        </div>
                        <div class="input-group mb-4">
                            <label>Costo de Ventas (-)</label>
                            <input type="number" id="costos" class="w-full p-2 border rounded" step="0.01" oninput="calcResultados()">
                        </div>
                        <div class="text-right font-bold text-gray-600 mb-4">Utilidad Bruta: <span id="utilidad_bruta">$0.00</span></div>

                        <div class="input-group mb-2">
                            <label>Gastos Operativos (-)</label>
                            <input type="number" id="gastos" class="w-full p-2 border rounded" step="0.01" oninput="calcResultados()">
                        </div>
                        <div class="input-group mb-2">
                            <label>Impuestos (-)</label>
                            <input type="number" id="impuestos" class="w-full p-2 border rounded" step="0.01" oninput="calcResultados()">
                        </div>
                        
                        <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded text-center">
                            <label class="block text-green-800 font-bold mb-1">Utilidad Neta</label>
                            <input type="number" id="utilidad_neta" class="w-full bg-transparent text-center font-bold text-2xl text-green-700 outline-none" readonly value="0.00">
                        </div>
                    </div>
                </div>

                <div class="mt-6 pt-4 border-t flex justify-end">
                    <button type="submit" class="btn btn-primary w-full md:w-auto">
                        <i class="fas fa-save mr-2"></i> Guardar Información Financiera
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Cálculos automáticos
function calcBalance() {
    const ac = parseFloat(document.getElementById('activo_corriente').value) || 0;
    const anc = parseFloat(document.getElementById('activo_no_corriente').value) || 0;
    const pc = parseFloat(document.getElementById('pasivo_corriente').value) || 0;
    const pnc = parseFloat(document.getElementById('pasivo_no_corriente').value) || 0;
    const pat = parseFloat(document.getElementById('patrimonio').value) || 0;

    const totalActivo = ac + anc;
    const totalPasivoPatrimonio = pc + pnc + pat;

    document.getElementById('total_activo').textContent = formatCurrency(totalActivo);
    
    // Validación visual de ecuación contable
    const diff = Math.abs(totalActivo - totalPasivoPatrimonio);
    const divCheck = document.getElementById('ecuacion_contable');
    
    if (diff < 1) { 
        divCheck.className = "p-2 rounded bg-green-100 text-green-800 text-center text-sm font-bold";
        divCheck.innerHTML = '<i class="fas fa-check-circle"></i> Ecuación Cuadrada (Activo = Pasivo + Patrimonio)';
    } else {
        divCheck.className = "p-2 rounded bg-red-100 text-red-800 text-center text-sm font-bold";
        divCheck.innerHTML = `<i class="fas fa-times-circle"></i> Descuadre: ${formatCurrency(totalActivo - totalPasivoPatrimonio)}`;
    }
}

function calcResultados() {
    const ventas = parseFloat(document.getElementById('ventas').value) || 0;
    const costos = parseFloat(document.getElementById('costos').value) || 0;
    const gastos = parseFloat(document.getElementById('gastos').value) || 0;
    const impuestos = parseFloat(document.getElementById('impuestos').value) || 0;

    const bruta = ventas - costos;
    const neta = bruta - gastos - impuestos;

    document.getElementById('utilidad_bruta').textContent = formatCurrency(bruta);
    document.getElementById('utilidad_neta').value = neta.toFixed(2);
}

async function saveFinanciero(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const payload = {
        cliente_id: document.getElementById('cliente_id').value,
        anio: document.getElementById('anio').value,
        periodo: document.getElementById('periodo').value,
        fecha_corte: document.getElementById('fecha_corte').value,
        // Balance
        activo_corriente: document.getElementById('activo_corriente').value,
        activo_no_corriente: document.getElementById('activo_no_corriente').value,
        pasivo_corriente: document.getElementById('pasivo_corriente').value,
        pasivo_no_corriente: document.getElementById('pasivo_no_corriente').value,
        patrimonio: document.getElementById('patrimonio').value,
        // Resultados
        ventas_ingresos: document.getElementById('ventas').value,
        costo_ventas: document.getElementById('costos').value,
        gastos_operativos: document.getElementById('gastos').value,
        otros_gastos_ingresos: 0,
        impuestos: document.getElementById('impuestos').value,
        utilidad_neta: document.getElementById('utilidad_neta').value,
        observaciones: ''
    };

    try {
        const res = await apiCall('financiero.php', 'POST', payload);
        if (res && res.success) {
            showModal('Éxito', 'Estados financieros guardados.');
            cargarHistorialFinanciero(); // Recargar la tabla
        } else {
            showModal('Error', res?.error || 'Error al guardar');
        }
    } catch (err) {
        console.error(err);
        showModal('Error', 'Error de conexión');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}