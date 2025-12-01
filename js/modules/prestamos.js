let prestamosView = 'list';
let clientesList = [];

function loadPrestamos() {
    showLoading();
    
    setTimeout(async () => {
        const [prestamos, clientes] = await Promise.all([
            apiCall('prestamos.php'),
            apiCall('clientes.php')
        ]);
        
        if (prestamos && !prestamos.error) {
            clientesList = clientes || [];
            renderPrestamos(prestamos);
        } else {
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Créditos</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error al cargar créditos</p>
                    </div>
                </div>
            `;
        }
    }, 300);
}

function renderPrestamos(prestamos) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Créditos</h2>
                <button onclick="showNewPrestamoForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Crédito
                </button>
            </div>
            
            ${prestamosView === 'list' ? renderPrestamosList(prestamos) : renderNewPrestamoForm()}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

function renderPrestamosList(prestamos) {
    if (prestamos.length === 0) {
        return `
            <div class="card text-center py-12">
                <i class="fas fa-credit-card text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay créditos registrados</h3>
                <p class="text-gray-500 mb-6">Comienza otorgando tu primer crédito</p>
                <button onclick="showNewPrestamoForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Otorgar Crédito
                </button>
            </div>
        `;
    }
    
    return `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white rounded-lg overflow-hidden">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 text-left">Cliente</th>
                        <th class="p-3 text-left">Tipo</th>
                        <th class="p-3 text-right">Monto</th>
                        <th class="p-3 text-right">Saldo</th>
                        <th class="p-3 text-center">Estado</th>
                        <th class="p-3 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${prestamos.map(prestamo => `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-3">${prestamo.cliente_nombre}</td>
                            <td class="p-3">${prestamo.tipo}</td>
                            <td class="p-3 text-right">${formatCurrency(prestamo.monto)}</td>
                            <td class="p-3 text-right font-bold">${formatCurrency(prestamo.saldo_actual)}</td>
                            <td class="p-3 text-center">
                                <span class="px-3 py-1 rounded-full text-sm ${prestamo.estado === 'normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${prestamo.estado}
                                </span>
                            </td>
                            <td class="p-3 text-center">
                                <button onclick="procesarPago(${prestamo.id})" class="btn btn-primary text-sm px-3 py-1">
                                    <i class="fas fa-money-bill mr-1"></i> Pagar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showNewPrestamoForm() {
    prestamosView = 'form';
    loadPrestamos();
}

function renderNewPrestamoForm() {
    const clientesOptions = clientesList.map(cliente => 
        `<option value="${cliente.id}">${cliente.nombre} (${cliente.codigo})</option>`
    ).join('');
    
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">Nuevo Crédito</h3>
                <button onclick="cancelNewPrestamo()" class="btn btn-secondary">
                    <i class="fas fa-times mr-2"></i> Cancelar
                </button>
            </div>
            
            <form id="formPrestamo" onsubmit="savePrestamo(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label for="cliente_id">Cliente *</label>
                        <select id="cliente_id" class="w-full p-2 border rounded" required>
                            <option value="">Seleccionar cliente</option>
                            ${clientesOptions}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="tipo">Tipo de Crédito *</label>
                        <select id="tipo" class="w-full p-2 border rounded" required onchange="updateTipoPrestamo()">
                            ${TIPOS_PRESTAMO.map(tipo => 
                                `<option value="${tipo.id}">${tipo.nombre}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="monto">Monto ($) *</label>
                        <input type="number" id="monto" class="w-full p-2 border rounded" required min="1" step="0.01" onchange="calcularCuota()">
                    </div>
                    
                    <div class="input-group">
                        <label for="plazo">Plazo (meses) *</label>
                        <input type="number" id="plazo" class="w-full p-2 border rounded" required min="1" value="12" onchange="calcularCuota()">
                    </div>
                    
                    <div class="input-group">
                        <label for="tasa">Tasa de interés anual (%) *</label>
                        <input type="number" id="tasa" class="w-full p-2 border rounded" required min="0.1" step="0.1" value="12" onchange="calcularCuota()">
                    </div>
                    
                    <div class="input-group">
                        <label for="garantia">Garantía</label>
                        <input type="text" id="garantia" class="w-full p-2 border rounded">
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-sm text-blue-800">Cuota Mensual Estimada</p>
                            <p id="cuota-estimada" class="text-2xl font-bold text-blue-900">$0.00</p>
                        </div>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-file-contract mr-2"></i> Otorgar Crédito
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
}

function updateTipoPrestamo() {
    const tipoSelect = document.getElementById('tipo');
    const tasaInput = document.getElementById('tasa');
    
    if (tipoSelect && tasaInput) {
        const tipo = tipoSelect.value;
        const tipoData = TIPOS_PRESTAMO.find(t => t.id === tipo);
        if (tipoData) {
            tasaInput.value = tipoData.tasa_base;
            calcularCuota();
        }
    }
}

function calcularCuota() {
    const monto = parseFloat(document.getElementById('monto')?.value || 0);
    const tasa = parseFloat(document.getElementById('tasa')?.value || 0);
    const plazo = parseInt(document.getElementById('plazo')?.value || 12);
    
    if (monto > 0 && tasa > 0 && plazo > 0) {
        const tasaMensual = (tasa / 100) / 12;
        let cuota;
        
        if (tasaMensual === 0) {
            cuota = monto / plazo;
        } else {
            const factor = Math.pow(1 + tasaMensual, plazo);
            cuota = (monto * tasaMensual * factor) / (factor - 1);
        }
        
        const cuotaElement = document.getElementById('cuota-estimada');
        if (cuotaElement) {
            cuotaElement.textContent = formatCurrency(cuota);
        }
    }
}

function cancelNewPrestamo() {
    prestamosView = 'list';
    loadPrestamos();
}

async function savePrestamo(event) {
    event.preventDefault();
    
    const formData = {
        cliente_id: document.getElementById('cliente_id').value,
        tipo: document.getElementById('tipo').value,
        monto: parseFloat(document.getElementById('monto').value),
        plazo: parseInt(document.getElementById('plazo').value),
        tasa: parseFloat(document.getElementById('tasa').value),
        garantia: document.getElementById('garantia').value
    };
    
    const result = await apiCall('prestamos.php', 'POST', formData);
    
    if (result && result.success) {
        showModal('Éxito', `${result.message}<br>Cuota mensual: ${formatCurrency(result.cuota)}`);
        prestamosView = 'list';
        loadPrestamos();
    } else {
        showModal('Error', result?.error || 'Error al crear crédito');
    }
}

function procesarPago(prestamoId) {
    showModal('Próxima función', 'El módulo de pagos estará disponible en la próxima versión');
}

// Hacer funciones disponibles globalmente
window.showNewPrestamoForm = showNewPrestamoForm;
window.cancelNewPrestamo = cancelNewPrestamo;
window.savePrestamo = savePrestamo;
window.updateTipoPrestamo = updateTipoPrestamo;
window.calcularCuota = calcularCuota;
window.procesarPago = procesarPago;