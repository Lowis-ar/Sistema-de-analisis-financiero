let clientesView = 'list';

function loadClientes() {
    showLoading();
    
    setTimeout(async () => {
        const clientes = await apiCall('clientes.php');
        
        if (clientes && !clientes.error) {
            renderClientes(clientes);
        } else {
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Clientes</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error al cargar clientes: ${clientes?.error || 'Error desconocido'}</p>
                    </div>
                </div>
            `;
        }
    }, 300);
}

function renderClientes(clientes) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                <button onclick="showNewClienteForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Cliente
                </button>
            </div>
            
            ${clientesView === 'list' ? renderClientesList(clientes) : renderNewClienteForm()}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

function renderClientesList(clientes) {
    if (clientes.length === 0) {
        return `
            <div class="card text-center py-12">
                <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay clientes registrados</h3>
                <p class="text-gray-500 mb-6">Comienza agregando tu primer cliente</p>
                <button onclick="showNewClienteForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Agregar Cliente
                </button>
            </div>
        `;
    }
    
    const clientesHTML = clientes.map(cliente => `
        <div class="card border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg">${cliente.nombre}</h3>
                    <p class="text-sm text-gray-500">${cliente.codigo} • ${cliente.tipo === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-bold ${cliente.calificacion === 'A' ? 'bg-green-100 text-green-800' : 
                    cliente.calificacion === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                    ${cliente.calificacion}
                </span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div><span class="font-medium">DUI/NIT:</span> ${cliente.dui || 'N/A'}</div>
                <div><span class="font-medium">Teléfono:</span> ${cliente.telefono || 'N/A'}</div>
                <div><span class="font-medium">Ingresos:</span> ${formatCurrency(cliente.ingresos)}</div>
                <div><span class="font-medium">Egresos:</span> ${formatCurrency(cliente.egresos)}</div>
                <div class="col-span-2">
                    <span class="font-medium">Capacidad de pago:</span>
                    <span class="font-bold ${cliente.capacidad_pago >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${formatCurrency(cliente.capacidad_pago)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${clientesHTML}
        </div>
    `;
}

function showNewClienteForm() {
    clientesView = 'form';
    loadClientes();
}

function renderNewClienteForm() {
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">Nuevo Cliente</h3>
                <button onclick="cancelNewCliente()" class="btn btn-secondary">
                    <i class="fas fa-times mr-2"></i> Cancelar
                </button>
            </div>
            
            <form id="formCliente" onsubmit="saveCliente(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label for="tipo">Tipo de Persona *</label>
                        <select id="tipo" class="w-full p-2 border rounded" required onchange="updateClienteForm()">
                            <option value="natural">Persona Natural</option>
                            <option value="juridica">Persona Jurídica</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="codigo">Código Cliente *</label>
                        <input type="text" id="codigo" class="w-full p-2 border rounded" required placeholder="CLI-001">
                    </div>
                    
                    <div class="input-group">
                        <label for="nombre">Nombre Completo *</label>
                        <input type="text" id="nombre" class="w-full p-2 border rounded" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="dui" id="label-dui">DUI (Ej: 00000000-0)</label>
                        <input type="text" id="dui" class="w-full p-2 border rounded" placeholder="00000000-0">
                    </div>
                    
                    <div class="input-group">
                        <label for="telefono">Teléfono</label>
                        <input type="text" id="telefono" class="w-full p-2 border rounded" placeholder="2222-2222">
                    </div>
                    
                    <div class="input-group">
                        <label for="ingresos">Ingresos Mensuales ($)</label>
                        <input type="number" id="ingresos" class="w-full p-2 border rounded" value="0" step="0.01" onchange="updateClienteForm()">
                    </div>
                    
                    <div class="input-group">
                        <label for="egresos">Egresos Mensuales ($)</label>
                        <input type="number" id="egresos" class="w-full p-2 border rounded" value="0" step="0.01" onchange="updateClienteForm()">
                    </div>
                </div>
                
                <div class="input-group mt-4">
                    <label for="direccion">Dirección</label>
                    <textarea id="direccion" class="w-full p-2 border rounded" rows="3"></textarea>
                </div>
                
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-sm text-blue-800">Capacidad de Pago Estimada</p>
                            <p id="capacidad-pago" class="text-2xl font-bold text-blue-900">$0.00</p>
                        </div>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save mr-2"></i> Guardar Cliente
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
}

function updateClienteForm() {
    const ingresos = parseFloat(document.getElementById('ingresos')?.value || 0);
    const egresos = parseFloat(document.getElementById('egresos')?.value || 0);
    const capacidad = ingresos - egresos;
    
    const capacidadElement = document.getElementById('capacidad-pago');
    if (capacidadElement) {
        capacidadElement.textContent = formatCurrency(capacidad);
    }
    
    // Actualizar label de DUI/NIT
    const tipo = document.getElementById('tipo')?.value;
    const labelDui = document.getElementById('label-dui');
    if (labelDui) {
        labelDui.textContent = tipo === 'natural' ? 'DUI (Ej: 00000000-0)' : 'NIT';
        const duiInput = document.getElementById('dui');
        if (duiInput) {
            duiInput.placeholder = tipo === 'natural' ? '00000000-0' : '0614-161090-103-6';
        }
    }
}

function cancelNewCliente() {
    clientesView = 'list';
    loadClientes();
}

async function saveCliente(event) {
    event.preventDefault();
    
    const formData = {
        tipo: document.getElementById('tipo').value,
        codigo: document.getElementById('codigo').value,
        nombre: document.getElementById('nombre').value,
        dui: document.getElementById('dui').value,
        telefono: document.getElementById('telefono').value,
        ingresos: parseFloat(document.getElementById('ingresos').value || 0),
        egresos: parseFloat(document.getElementById('egresos').value || 0),
        direccion: document.getElementById('direccion').value
    };
    
    // Validaciones
    if (formData.tipo === 'natural' && formData.dui && !VALIDATORS.dui(formData.dui)) {
        showModal('Error', 'Formato de DUI inválido. Use: 00000000-0');
        return;
    }
    
    if (formData.telefono && !VALIDATORS.telefono(formData.telefono)) {
        showModal('Error', 'Formato de teléfono inválido. Use: 2222-2222');
        return;
    }
    
    const result = await apiCall('clientes.php', 'POST', formData);
    
    if (result && result.success) {
        showModal('Éxito', result.message);
        clientesView = 'list';
        loadClientes();
    } else {
        showModal('Error', result?.error || 'Error al guardar cliente');
    }
}

// Hacer funciones disponibles globalmente
window.showNewClienteForm = showNewClienteForm;
window.cancelNewCliente = cancelNewCliente;
window.saveCliente = saveCliente;
window.updateClienteForm = updateClienteForm;