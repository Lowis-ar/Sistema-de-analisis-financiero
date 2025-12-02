let clientesView = 'list';
let clientesCount = 0;
let editingClienteId = null;

// Expresiones Regulares para validaciones locales
const CLIENTE_VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nrc: (val) => /^\d{2,8}$/.test(val)
};

// Función para cargar el contador de clientes
async function loadClientesCount() {
    try {
        const clientes = await apiCall('clientes.php');
        if (clientes && !clientes.error) {
            clientesCount = clientes.length;
            return clientesCount;
        }
    } catch (error) {
        console.error('Error al contar clientes:', error);
    }
    return 0;
}

// Función para generar código de cliente automático
function generarCodigoCliente() {
    const nuevoNumero = clientesCount + 1;
    // Prefijo CLI para Naturales, EMP para Jurídicos (opcional, aquí usamos CLI genérico)
    return `CLI${String(nuevoNumero).padStart(3, '0')}`;
}

async function loadClientes() {
    showLoading();

    // Cargar contador primero
    await loadClientesCount();

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
            
            ${clientesView === 'list' ? renderClientesList(clientes) : ''}
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

    // Mostrar contador en el encabezado
    const headerHTML = `
        <div class="mb-4 p-3 bg-blue-50 rounded-lg">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-sm text-blue-800">Total de clientes registrados</p>
                    <p class="text-2xl font-bold text-blue-900">${clientesCount}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-blue-800">Próximo código disponible</p>
                    <p class="text-lg font-bold text-blue-900">${generarCodigoCliente()}</p>
                </div>
            </div>
        </div>
    `;

    const clientesHTML = clientes.map(cliente => {
        const isJuridico = cliente.tipo === 'juridico' || cliente.tipo === 'JURIDICO';
        // Mapear campos visuales
        const nombreDisplay = cliente.nombre || cliente.razon_social;
        const docDisplay = cliente.dui || cliente.nit;
        const tipoLabel = isJuridico ? 'Persona Jurídica' : 'Persona Natural';
        const icon = isJuridico ? 'fa-building' : 'fa-user';

        return `
        <div class="card border-l-4 ${isJuridico ? 'border-purple-500' : 'border-blue-500'} hover:shadow-lg transition-shadow cursor-pointer" 
             onclick="showEditClienteForm(${cliente.id})">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                        <i class="fas ${icon} text-gray-400"></i>
                        <h3 class="font-bold text-lg">${nombreDisplay}</h3>
                    </div>
                    <p class="text-sm text-gray-500">${cliente.codigo} • ${tipoLabel}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-3 py-1 rounded-full text-sm font-bold ${cliente.calificacion === 'A' ? 'bg-green-100 text-green-800' :
                        cliente.calificacion === 'B' ? 'bg-yellow-100 text-yellow-800' : 
                        cliente.calificacion === 'C' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
                        ${cliente.calificacion || 'A'}
                    </span>
                    <button onclick="event.stopPropagation(); deleteCliente(${cliente.id}, '${nombreDisplay}')" 
                            class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div><span class="font-medium">${isJuridico ? 'NIT:' : 'DUI:'}</span> ${docDisplay || 'N/A'}</div>
                <div><span class="font-medium">Teléfono:</span> ${cliente.telefono || 'N/A'}</div>
                ${isJuridico ? `<div><span class="font-medium">NRC:</span> ${cliente.nrc || 'N/A'}</div>` : ''}
                <div><span class="font-medium">Ingresos:</span> ${formatCurrency(cliente.ingresos)}</div>
                <div class="col-span-2 mt-2 pt-2 border-t">
                    <span class="font-medium">Capacidad de pago:</span>
                    <span class="font-bold ${cliente.capacidad_pago >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${formatCurrency(cliente.capacidad_pago)}
                    </span>
                </div>
            </div>
        </div>
    `}).join('');

    return `
        ${headerHTML}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${clientesHTML}
        </div>
    `;
}

async function showNewClienteForm() {
    showLoading();
    await loadClientesCount();
    clientesView = 'form';
    editingClienteId = null;

    setTimeout(() => {
        const content = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">Nuevo Cliente</h2>
                    <button onclick="cancelNewCliente()" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
                ${renderFormulario()}
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
        // Inicializar estado del formulario
        toggleClienteFields(); 
    }, 100);
}

async function showEditClienteForm(clienteId) {
    showLoading();
    try {
        const cliente = await apiCall(`clientes.php?id=${clienteId}`);
        
        if (cliente && !cliente.error) {
            editingClienteId = clienteId;
            clientesView = 'form';
            
            setTimeout(() => {
                const content = `
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-800">Editar Cliente</h2>
                            <button onclick="cancelNewCliente()" class="btn btn-secondary">
                                <i class="fas fa-times mr-2"></i> Cancelar
                            </button>
                        </div>
                        ${renderFormulario(cliente)}
                    </div>
                `;
                document.getElementById('main-content').innerHTML = content;
                // Inicializar estado del formulario con datos cargados
                toggleClienteFields();
                // Actualizar cálculos
                updateClienteFormCalculos();
            }, 100);
        } else {
            showModal('Error', 'No se pudo cargar el cliente para editar');
            loadClientes();
        }
    } catch (error) {
        console.error('Error al cargar cliente:', error);
        showModal('Error', 'Error al cargar los datos del cliente');
        loadClientes();
    }
}

// Función unificada para renderizar el formulario (Nuevo y Edición)
function renderFormulario(cliente = null) {
    const codigo = cliente ? cliente.codigo : generarCodigoCliente();
    const tipo = cliente ? (cliente.tipo === 'JURIDICO' ? 'juridica' : cliente.tipo) : 'natural';
    
    // Mapeo de valores
    const nombreVal = cliente ? (cliente.nombre || cliente.razon_social || '') : '';
    const docVal = cliente ? (cliente.dui || cliente.nit || '') : '';
    
    return `
        <div class="card">
            <form id="formCliente" onsubmit="saveCliente(event)">
                <input type="hidden" id="clienteId" value="${cliente ? cliente.id : ''}">
                
                <div class="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <label class="block font-bold mb-2 text-gray-700">Tipo de Cliente</label>
                    <div class="flex gap-6">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" name="tipo_cliente" value="natural" 
                                ${tipo === 'natural' ? 'checked' : ''} 
                                onchange="toggleClienteFields()"
                                class="form-radio text-blue-600 h-5 w-5">
                            <span class="ml-2">Persona Natural</span>
                        </label>
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="radio" name="tipo_cliente" value="juridica" 
                                ${tipo === 'juridica' ? 'checked' : ''} 
                                onchange="toggleClienteFields()"
                                class="form-radio text-blue-600 h-5 w-5">
                            <span class="ml-2">Persona Jurídica (Empresa)</span>
                        </label>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label>Código Cliente</label>
                        <input type="text" id="codigo" class="w-full p-2 border rounded bg-gray-100" 
                               required readonly value="${codigo}">
                    </div>

                    <div class="input-group md:col-span-2">
                        <label id="lbl-nombre">Nombre Completo *</label>
                        <input type="text" id="nombre" class="w-full p-2 border rounded" required
                               value="${nombreVal}"
                               oninput="validateNombreInput(this)"
                               placeholder="Ej: Juan Pérez">
                        <div class="text-xs mt-1 text-gray-500" id="nombre-hint"></div>
                    </div>

                    <div class="input-group">
                        <label id="lbl-documento">DUI *</label>
                        <input type="text" id="documento" class="w-full p-2 border rounded" 
                               value="${docVal}"
                               oninput="formatDocumentoInput(this)"
                               placeholder="00000000-0">
                        <div class="text-xs mt-1 text-gray-500" id="documento-hint">Formato: 00000000-0</div>
                    </div>

                    <div class="juridico-field hidden input-group">
                        <label>Nombre Comercial</label>
                        <input type="text" id="nombre_comercial" class="w-full p-2 border rounded"
                               value="${cliente?.nombre_comercial || ''}">
                    </div>

                    <div class="juridico-field hidden input-group">
                        <label>NRC (Registro IVA) *</label>
                        <input type="text" id="nrc" class="w-full p-2 border rounded"
                               value="${cliente?.nrc || ''}" placeholder="Ej: 123456-7">
                    </div>

                    <div class="juridico-field hidden input-group">
                        <label>Giro Económico</label>
                        <input type="text" id="giro" class="w-full p-2 border rounded"
                               value="${cliente?.giro_economico || ''}">
                    </div>

                    <div class="juridico-field hidden input-group md:col-span-2">
                        <label>Representante Legal</label>
                        <input type="text" id="representante" class="w-full p-2 border rounded"
                               value="${cliente?.representante_legal || ''}">
                    </div>

                    <div class="input-group">
                        <label>Teléfono *</label>
                        <input type="text" id="telefono" class="w-full p-2 border rounded" 
                               value="${cliente?.telefono || ''}"
                               oninput="formatTelefonoInput(this)"
                               placeholder="2222-2222">
                    </div>

                    <div class="input-group md:col-span-2">
                        <label>Dirección</label>
                        <textarea id="direccion" class="w-full p-2 border rounded" rows="2">${cliente?.direccion || ''}</textarea>
                    </div>

                    <div class="md:col-span-2 bg-blue-50 p-4 rounded border border-blue-200 mt-2">
                        <h4 class="font-bold text-blue-800 mb-3">Análisis Financiero</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="input-group">
                                <label>Ingresos Mensuales ($)</label>
                                <input type="number" id="ingresos" class="w-full p-2 border rounded bg-white" 
                                       value="${cliente?.ingresos || 0}" step="0.01" oninput="updateClienteFormCalculos()">
                            </div>
                            <div class="input-group">
                                <label>Egresos Mensuales ($)</label>
                                <input type="number" id="egresos" class="w-full p-2 border rounded bg-white" 
                                       value="${cliente?.egresos || 0}" step="0.01" oninput="updateClienteFormCalculos()">
                            </div>
                            <div class="input-group text-center">
                                <label class="text-xs text-gray-500 uppercase">Capacidad Neta</label>
                                <div id="txtCapacidad" class="text-xl font-bold text-gray-800">$0.00</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 pt-6 border-t mt-6">
                    <button type="submit" class="btn btn-success flex-1">
                        <i class="fas fa-save mr-2"></i> Guardar Cliente
                    </button>
                    <button type="button" onclick="cancelNewCliente()" class="btn btn-secondary flex-1">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Lógica de interfaz: Mostrar/Ocultar campos
function toggleClienteFields() {
    const isJuridico = document.querySelector('input[name="tipo_cliente"][value="juridica"]').checked;
    
    // Elementos
    const lblNombre = document.getElementById('lbl-nombre');
    const lblDoc = document.getElementById('lbl-documento');
    const inputDoc = document.getElementById('documento');
    const fieldsJuridico = document.querySelectorAll('.juridico-field');
    const inputNombre = document.getElementById('nombre');

    if (isJuridico) {
        // Modo Jurídico
        lblNombre.textContent = 'Razón Social *';
        inputNombre.placeholder = 'Ej: Industrias S.A. de C.V.';
        
        lblDoc.textContent = 'NIT *';
        inputDoc.placeholder = '0614-161090-103-6';
        document.getElementById('documento-hint').textContent = 'Formato: 0000-000000-000-0 (14 dígitos)';
        
        // Mostrar campos extra
        fieldsJuridico.forEach(el => el.classList.remove('hidden'));
    } else {
        // Modo Natural
        lblNombre.textContent = 'Nombre Completo *';
        inputNombre.placeholder = 'Ej: Juan Pérez';
        
        lblDoc.textContent = 'DUI *';
        inputDoc.placeholder = '00000000-0';
        document.getElementById('documento-hint').textContent = 'Formato: 00000000-0 (9 dígitos)';
        
        // Ocultar campos extra
        fieldsJuridico.forEach(el => el.classList.add('hidden'));
    }
}

// Validaciones y Formatos
function formatDocumentoInput(input) {
    const isJuridico = document.querySelector('input[name="tipo_cliente"][value="juridica"]').checked;
    let value = input.value.replace(/\D/g, ''); // Solo números

    if (isJuridico) {
        // Formato NIT: 0000-000000-000-0 (14 digitos)
        value = value.slice(0, 14);
        let formatted = '';
        if (value.length > 0) formatted += value.substring(0, 4);
        if (value.length > 4) formatted += '-' + value.substring(4, 10);
        if (value.length > 10) formatted += '-' + value.substring(10, 13);
        if (value.length > 13) formatted += '-' + value.substring(13, 14);
        input.value = formatted;
        
        validateField(input, CLIENTE_VALIDATORS.nit(formatted));
    } else {
        // Formato DUI: 00000000-0 (9 digitos)
        value = value.slice(0, 9);
        let formatted = '';
        if (value.length > 0) formatted += value.substring(0, 8);
        if (value.length > 8) formatted += '-' + value.substring(8, 9);
        input.value = formatted;

        validateField(input, CLIENTE_VALIDATORS.dui(formatted));
    }
}

function formatTelefonoInput(input) {
    let value = input.value.replace(/\D/g, '').slice(0, 8);
    if (value.length > 4) {
        value = value.substring(0, 4) + '-' + value.substring(4, 8);
    }
    input.value = value;
    validateField(input, CLIENTE_VALIDATORS.telefono(value));
}

function validateNombreInput(input) {
    // Permitir letras, espacios, puntos, comas y guiones (para empresas)
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,-]+$/;
    validateField(input, regex.test(input.value) && input.value.length > 3);
}

function validateField(input, isValid) {
    if (isValid) {
        input.style.borderColor = '#10b981'; // Verde
        input.style.backgroundColor = '#f0fdf4';
    } else {
        input.style.borderColor = '#ef4444'; // Rojo
        input.style.backgroundColor = '#fef2f2';
    }
}

function updateClienteFormCalculos() {
    const ing = parseFloat(document.getElementById('ingresos').value) || 0;
    const egr = parseFloat(document.getElementById('egresos').value) || 0;
    const cap = ing - egr;
    
    const txtCap = document.getElementById('txtCapacidad');
    txtCap.textContent = formatCurrency(cap);
    txtCap.className = cap >= 0 
        ? "text-xl font-bold text-green-600" 
        : "text-xl font-bold text-red-600";
}

function cancelNewCliente() {
    clientesView = 'list';
    editingClienteId = null;
    loadClientes();
}

// Guardar Cliente (Lógica unificada)
async function saveCliente(event) {
    event.preventDefault();

    const isJuridico = document.querySelector('input[name="tipo_cliente"][value="juridica"]').checked;
    
    // Recolectar datos comunes
    const formData = {
        tipo: isJuridico ? 'juridico' : 'natural',
        codigo: document.getElementById('codigo').value,
        telefono: document.getElementById('telefono').value,
        direccion: document.getElementById('direccion').value,
        ingresos: parseFloat(document.getElementById('ingresos').value || 0),
        egresos: parseFloat(document.getElementById('egresos').value || 0)
    };

    // Recolectar datos específicos y validar
    if (isJuridico) {
        formData.razon_social = document.getElementById('nombre').value;
        formData.nombre_comercial = document.getElementById('nombre_comercial').value;
        formData.nit = document.getElementById('documento').value;
        formData.nrc = document.getElementById('nrc').value;
        formData.giro_economico = document.getElementById('giro').value;
        formData.representante_legal = document.getElementById('representante').value;

        if (!CLIENTE_VALIDATORS.nit(formData.nit)) {
            showModal('Error', 'El NIT ingresado no es válido (Debe tener 14 dígitos).');
            return;
        }
        if (!CLIENTE_VALIDATORS.nrc(formData.nrc)) {
            showModal('Error', 'El NRC es inválido.');
            return;
        }
        if (!formData.razon_social) {
            showModal('Error', 'La Razón Social es obligatoria.');
            return;
        }
    } else {
        formData.nombre = document.getElementById('nombre').value;
        formData.dui = document.getElementById('documento').value;

        if (!CLIENTE_VALIDATORS.dui(formData.dui)) {
            showModal('Error', 'El DUI ingresado no es válido (Debe tener 9 dígitos).');
            return;
        }
        if (!formData.nombre) {
            showModal('Error', 'El nombre es obligatorio.');
            return;
        }
    }

    if (!CLIENTE_VALIDATORS.telefono(formData.telefono)) {
        showModal('Error', 'El teléfono debe tener formato 2222-2222.');
        return;
    }

    // Mostrar loading en botón
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        let result;
        // Determinar endpoint y método
        // NOTA: Asegúrate de que tu backend acepte 'clientes.php' para ambos o usa la lógica de endpoint diferenciado
        const endpoint = isJuridico ? 'includes/clientes_juridicos.php' : 'includes/clientes.php';
        
        if (editingClienteId) {
            // Actualizar
            result = await apiCall(`${endpoint}?id=${editingClienteId}`, 'PUT', formData);
        } else {
            // Crear
            result = await apiCall(endpoint, 'POST', formData);
        }

        if (result && (result.success || result.id)) {
            showModal('Éxito', 'Cliente guardado correctamente.');
            clientesView = 'list';
            editingClienteId = null;
            loadClientes();
        } else {
            showModal('Error', result?.error || 'No se pudo guardar el cliente.');
        }
    } catch (error) {
        console.error(error);
        showModal('Error', 'Error de conexión con el servidor.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Función para eliminar cliente
async function deleteCliente(id, nombre) {
    if (confirm(`¿Está seguro de eliminar al cliente "${nombre}"? Esta acción no se puede deshacer.`)) {
        showLoading();
        try {
            // Intenta borrar primero como cliente genérico
            const result = await apiCall(`clientes.php?id=${id}`, 'DELETE');
            
            if (result && result.success) {
                showModal('Éxito', result.message);
                if (editingClienteId === id) {
                    editingClienteId = null;
                    clientesView = 'list';
                }
                loadClientes();
            } else {
                showModal('Error', result?.error || 'Error al eliminar cliente');
                loadClientes();
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            showModal('Error', 'Ocurrió un error al intentar eliminar');
            loadClientes();
        }
    }
}

function loadClientesModule() {
    if (typeof loadClientes === 'function') {
        loadClientes();
    } else {
         document.getElementById('main-content').innerHTML = `
            <div class="card p-8 text-center">
                <h2 class="text-2xl font-bold mb-4">Módulo de Activos</h2>
                <p class="text-gray-500">Módulo en construcción o función loadActivos() no encontrada.</p>
            </div>
        `;
    }
}