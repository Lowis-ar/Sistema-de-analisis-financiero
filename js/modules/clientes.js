let clientesView = 'list';
let clientesCount = 0;
let editingClienteId = null;

// Expresiones Regulares
const CLIENTE_VALIDATORS = {
    dui: (val) => /^\d{8}-\d{1}$/.test(val),
    nit: (val) => /^\d{4}-\d{6}-\d{3}-\d{1}$/.test(val),
    telefono: (val) => /^\d{4}-\d{4}$/.test(val),
    nrc: (val) => /^\d{2,8}$/.test(val)
};

// --- CARGA DE DATOS ---

async function loadClientesModule() {
    if (typeof loadClientes === 'function') {
        loadClientes();
    }
}

async function loadClientesCount() {
    try {
        const clientes = await apiCall('clientes.php'); // Asegura ruta correcta
        if (clientes && !clientes.error) {
            clientesCount = clientes.length;
            return clientesCount;
        }
    } catch (error) {
        console.error('Error al contar clientes:', error);
    }
    return 0;
}

function generarCodigoCliente() {
    const nuevoNumero = clientesCount + 1;
    return `CLI${String(nuevoNumero).padStart(3, '0')}`;
}

async function loadClientes() {
    showLoading();
    await loadClientesCount();

    setTimeout(async () => {
        // Intentamos cargar clientes.php (general) o ajusta si tienes endpoints separados
        const clientes = await apiCall('clientes.php');

        if (Array.isArray(clientes)) {
            renderClientes(clientes);
        } else {
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Clientes</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error o sin datos: ${clientes?.error || 'No hay conexión con la BD'}</p>
                    </div>
                </div>
            `;
        }
    }, 300);
}

// --- RENDERIZADO DE LISTA ---

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
                <button onclick="showNewClienteForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Agregar Cliente
                </button>
            </div>
        `;
    }

    const headerHTML = `
        <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-sm text-blue-800">Clientes registrados</p>
                    <p class="text-2xl font-bold text-blue-900">${clientesCount}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-blue-800">Siguiente Código</p>
                    <p class="text-lg font-bold text-blue-900">${generarCodigoCliente()}</p>
                </div>
            </div>
        </div>
    `;

    const clientesHTML = clientes.map(cliente => {
        const isJuridico = cliente.tipo === 'juridico' || cliente.tipo === 'JURIDICO';
        const nombreDisplay = cliente.nombre || cliente.razon_social;
        const docDisplay = cliente.dui || cliente.nit;
        const icon = isJuridico ? 'fa-building' : 'fa-user';
        const colorBorder = isJuridico ? 'border-purple-500' : 'border-blue-500';

        return `
        <div class="card border-l-4 ${colorBorder} hover:shadow-lg transition-shadow cursor-pointer" 
             onclick="showEditClienteForm(${cliente.id})">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                        <i class="fas ${icon} text-gray-400"></i>
                        <h3 class="font-bold text-lg text-gray-800">${nombreDisplay}</h3>
                    </div>
                    <p class="text-xs text-gray-500 font-mono mt-1">${cliente.codigo}</p>
                </div>
                <button onclick="event.stopPropagation(); deleteCliente(${cliente.id}, '${nombreDisplay}')" 
                        class="text-red-400 hover:text-red-600 p-1">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600">
                <div>
                    <span class="block text-xs text-gray-400">${isJuridico ? 'NIT' : 'DUI'}</span>
                    ${docDisplay || '-'}
                </div>
                <div>
                    <span class="block text-xs text-gray-400">Teléfono</span>
                    ${cliente.telefono || '-'}
                </div>
                ${isJuridico ? `
                <div class="col-span-2 border-t pt-2 mt-1">
                    <span class="block text-xs text-gray-400">Representante</span>
                    ${cliente.representante_legal || '-'}
                </div>` : ''}
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

// --- FORMULARIOS ---

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
        toggleClienteFields(); 
    }, 100);
}

async function showEditClienteForm(clienteId) {
    showLoading();
    try {
        // Asegúrate de que tu backend soporte ?id=X
        const cliente = await apiCall(`clientes.php?id=${clienteId}`);
        
        // Si el backend devuelve un array con 1 objeto, lo sacamos
        const data = Array.isArray(cliente) ? cliente[0] : cliente;

        if (data && !data.error) {
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
                        ${renderFormulario(data)}
                    </div>
                `;
                document.getElementById('main-content').innerHTML = content;
                toggleClienteFields();
                updateClienteFormCalculos();
            }, 100);
        } else {
            showModal('Error', 'No se pudo cargar el cliente.');
            loadClientes();
        }
    } catch (error) {
        console.error(error);
        loadClientes();
    }
}

function renderFormulario(cliente = null) {
    const codigo = cliente ? cliente.codigo : generarCodigoCliente();
    // Detectar tipo. Si viene de BD suele ser mayúscula 'JURIDICO', normalizamos a 'juridica' para el radio button
    const tipoDB = cliente ? (cliente.tipo || '').toLowerCase() : 'natural';
    const tipo = (tipoDB === 'juridico' || tipoDB === 'juridica') ? 'juridica' : 'natural';
    
    // Valores
    const nombreVal = cliente ? (cliente.nombre || cliente.razon_social || '') : '';
    const docVal = cliente ? (cliente.dui || cliente.nit || '') : '';
    
    // Campos Jurídicos Específicos
    const nrcVal = cliente?.nrc || '';
    const giroVal = cliente?.giro_economico || '';
    const repVal = cliente?.representante_legal || '';
    const duiRepVal = cliente?.dui_representante || '';
    const fechaConstVal = cliente?.fecha_constitucion || '';

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
                               value="${nombreVal}" oninput="validateNombreInput(this)">
                    </div>

                    <div class="input-group">
                        <label id="lbl-documento">DUI *</label>
                        <input type="text" id="documento" class="w-full p-2 border rounded" 
                               value="${docVal}" oninput="formatDocumentoInput(this)">
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
                               value="${nrcVal}" placeholder="Ej: 123456-7">
                    </div>

                    <div class="juridico-field hidden input-group">
                        <label>Giro Económico</label>
                        <input type="text" id="giro" class="w-full p-2 border rounded"
                               value="${giroVal}">
                    </div>

                    <div class="juridico-field hidden input-group">
                        <label>Fecha de Constitución</label>
                        <input type="date" id="fecha_constitucion" class="w-full p-2 border rounded"
                               value="${fechaConstVal}">
                    </div>

                    <div class="juridico-field hidden md:col-span-2 bg-slate-50 p-3 rounded border border-slate-200 mt-2">
                        <p class="font-bold text-sm text-slate-600 mb-2 border-b pb-1">Datos del Representante Legal</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="input-group">
                                <label>Nombre Representante *</label>
                                <input type="text" id="representante" class="w-full p-2 border rounded bg-white"
                                       value="${repVal}">
                            </div>
                            <div class="input-group">
                                <label>DUI Representante *</label>
                                <input type="text" id="dui_representante" class="w-full p-2 border rounded bg-white"
                                       value="${duiRepVal}" oninput="formatRepDui(this)" placeholder="00000000-0">
                            </div>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Teléfono *</label>
                        <input type="text" id="telefono" class="w-full p-2 border rounded" 
                               value="${cliente?.telefono || ''}" oninput="formatTelefonoInput(this)" placeholder="2222-2222">
                    </div>

                    <div class="input-group md:col-span-2">
                        <label>Dirección</label>
                        <textarea id="direccion" class="w-full p-2 border rounded" rows="2">${cliente?.direccion || ''}</textarea>
                    </div>

                    <div class="md:col-span-2 bg-blue-50 p-4 rounded border border-blue-200 mt-2">
                        <h4 class="font-bold text-blue-800 mb-3">Perfil Económico Rápido</h4>
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

// --- LÓGICA DE UI Y VALIDACIÓN ---

function toggleClienteFields() {
    const isJuridico = document.querySelector('input[name="tipo_cliente"][value="juridica"]').checked;
    
    // Labels principales
    const lblNombre = document.getElementById('lbl-nombre');
    const lblDoc = document.getElementById('lbl-documento');
    const inputDoc = document.getElementById('documento');
    const inputNombre = document.getElementById('nombre');
    
    // Campos a mostrar/ocultar
    const fieldsJuridico = document.querySelectorAll('.juridico-field');

    if (isJuridico) {
        lblNombre.textContent = 'Razón Social *';
        inputNombre.placeholder = 'Ej: Industrias S.A. de C.V.';
        lblDoc.textContent = 'NIT Empresa *';
        inputDoc.placeholder = '0614-161090-103-6';
        document.getElementById('documento-hint').textContent = 'Formato: 0000-000000-000-0';
        
        fieldsJuridico.forEach(el => el.classList.remove('hidden'));
    } else {
        lblNombre.textContent = 'Nombre Completo *';
        inputNombre.placeholder = 'Ej: Juan Pérez';
        lblDoc.textContent = 'DUI *';
        inputDoc.placeholder = '00000000-0';
        document.getElementById('documento-hint').textContent = 'Formato: 00000000-0';
        
        fieldsJuridico.forEach(el => el.classList.add('hidden'));
    }
}

// Formateador especial para DUI de Representante (Siempre DUI, aunque sea empresa)
function formatRepDui(input) {
    let value = input.value.replace(/\D/g, '').slice(0, 9);
    if (value.length > 8) {
        value = value.substring(0, 8) + '-' + value.substring(8, 9);
    }
    input.value = value;
    // Validar visualmente
    validateField(input, CLIENTE_VALIDATORS.dui(value));
}

function formatDocumentoInput(input) {
    const isJuridico = document.querySelector('input[name="tipo_cliente"][value="juridica"]').checked;
    let value = input.value.replace(/\D/g, '');

    if (isJuridico) {
        // NIT (14)
        value = value.slice(0, 14);
        let formatted = '';
        if (value.length > 0) formatted += value.substring(0, 4);
        if (value.length > 4) formatted += '-' + value.substring(4, 10);
        if (value.length > 10) formatted += '-' + value.substring(10, 13);
        if (value.length > 13) formatted += '-' + value.substring(13, 14);
        input.value = formatted;
        validateField(input, CLIENTE_VALIDATORS.nit(formatted));
    } else {
        // DUI (9)
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
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,-]+$/;
    validateField(input, regex.test(input.value) && input.value.length > 3);
}

function validateField(input, isValid) {
    if (isValid) {
        input.style.borderColor = '#10b981';
        input.style.backgroundColor = '#f0fdf4';
    } else {
        input.style.borderColor = '#ef4444';
        input.style.backgroundColor = '#fef2f2';
    }
}

function updateClienteFormCalculos() {
    const ing = parseFloat(document.getElementById('ingresos').value) || 0;
    const egr = parseFloat(document.getElementById('egresos').value) || 0;
    const cap = ing - egr;
    
    const txtCap = document.getElementById('txtCapacidad');
    txtCap.textContent = formatCurrency(cap);
    txtCap.className = cap >= 0 ? "text-xl font-bold text-green-600" : "text-xl font-bold text-red-600";
}

function cancelNewCliente() {
    clientesView = 'list';
    editingClienteId = null;
    loadClientes();
}

// --- GUARDAR ---

async function saveCliente(event) {
    event.preventDefault();

    const isJuridico = document.querySelector('input[name="tipo_cliente"][value="juridica"]').checked;
    
    const formData = {
        tipo: isJuridico ? 'juridico' : 'natural',
        codigo: document.getElementById('codigo').value,
        telefono: document.getElementById('telefono').value,
        direccion: document.getElementById('direccion').value,
        ingresos: parseFloat(document.getElementById('ingresos').value || 0),
        egresos: parseFloat(document.getElementById('egresos').value || 0)
    };

    if (isJuridico) {
        formData.razon_social = document.getElementById('nombre').value;
        formData.nombre_comercial = document.getElementById('nombre_comercial').value;
        formData.nit = document.getElementById('documento').value;
        formData.nrc = document.getElementById('nrc').value;
        formData.giro_economico = document.getElementById('giro').value;
        // NUEVOS CAMPOS JURIDICOS
        formData.fecha_constitucion = document.getElementById('fecha_constitucion').value;
        formData.representante_legal = document.getElementById('representante').value;
        formData.dui_representante = document.getElementById('dui_representante').value;

        // Validaciones Jurídicas
        if (!CLIENTE_VALIDATORS.nit(formData.nit)) {
            return showModal('Error', 'NIT inválido (14 dígitos requeridos).');
        }
        if (!formData.razon_social) return showModal('Error', 'La Razón Social es obligatoria.');
        if (!formData.representante_legal) return showModal('Error', 'Nombre del Representante es obligatorio.');
        if (!CLIENTE_VALIDATORS.dui(formData.dui_representante)) {
            return showModal('Error', 'DUI del Representante inválido.');
        }

    } else {
        formData.nombre = document.getElementById('nombre').value;
        formData.dui = document.getElementById('documento').value;

        if (!CLIENTE_VALIDATORS.dui(formData.dui)) {
            return showModal('Error', 'DUI inválido (9 dígitos requeridos).');
        }
        if (!formData.nombre) return showModal('Error', 'El nombre es obligatorio.');
    }

    // Guardar
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        let result;
        const endpoint = isJuridico ? 'clientes_juridicos.php' : 'clientes.php';
        
        if (editingClienteId) {
            result = await apiCall(`${endpoint}?id=${editingClienteId}`, 'PUT', formData);
        } else {
            result = await apiCall(endpoint, 'POST', formData);
        }

        if (result && (result.success || result.id)) {
            showModal('Éxito', 'Cliente guardado correctamente.');
            clientesView = 'list';
            editingClienteId = null;
            loadClientes();
        } else {
            showModal('Error', result?.error || 'No se pudo guardar.');
        }
    } catch (error) {
        console.error(error);
        showModal('Error', 'Error de conexión.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteCliente(id, nombre) {
    if (confirm(`¿Eliminar al cliente "${nombre}"?`)) {
        showLoading();
        const result = await apiCall(`clientes.php?id=${id}`, 'DELETE');
        if (result && result.success) {
            showModal('Éxito', 'Cliente eliminado.');
            loadClientes();
        } else {
            showModal('Error', 'No se pudo eliminar.');
            loadClientes();
        }
    }
}