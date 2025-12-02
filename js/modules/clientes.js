let clientesView = 'list';
let clientesCount = 0;
let editingClienteId = null;

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

    const clientesHTML = clientes.map(cliente => `
        <div class="card border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer" 
             onclick="showEditClienteForm(${cliente.id})">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg">${cliente.nombre}</h3>
                    <p class="text-sm text-gray-500">${cliente.codigo} • ${cliente.tipo === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-3 py-1 rounded-full text-sm font-bold ${cliente.calificacion === 'A' ? 'bg-green-100 text-green-800' :
                        cliente.calificacion === 'B' ? 'bg-yellow-100 text-yellow-800' : 
                        cliente.calificacion === 'C' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
                        ${cliente.calificacion}
                    </span>
                    <button onclick="event.stopPropagation(); deleteCliente(${cliente.id}, '${cliente.nombre}')" 
                            class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
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
        ${headerHTML}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${clientesHTML}
        </div>
    `;
}

async function showNewClienteForm() {
    showLoading();

    // Cargar el contador de clientes
    await loadClientesCount();

    clientesView = 'form';
    editingClienteId = null;

    // Mostrar el formulario después de cargar el contador
    setTimeout(() => {
        const content = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                    <button onclick="cancelNewCliente()" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
                
                ${renderNewClienteForm()}
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    }, 100);
}

// Función para mostrar formulario de edición
async function showEditClienteForm(clienteId) {
    showLoading();
    
    try {
        // Obtener datos del cliente específico
        const cliente = await apiCall(`clientes.php?id=${clienteId}`);
        
        if (cliente && !cliente.error) {
            editingClienteId = clienteId;
            clientesView = 'form';
            
            // Mostrar formulario con datos
            setTimeout(() => {
                const content = `
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                            <button onclick="cancelNewCliente()" class="btn btn-secondary">
                                <i class="fas fa-times mr-2"></i> Cancelar
                            </button>
                        </div>
                        
                        ${renderEditClienteForm(cliente)}
                    </div>
                `;
                document.getElementById('main-content').innerHTML = content;
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

function renderNewClienteForm() {
    const codigoGenerado = generarCodigoCliente();

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
                        <input type="text" id="codigo" class="w-full p-2 border rounded bg-gray-50" 
                               required readonly value="${codigoGenerado}">
                        <div class="text-xs mt-1 text-gray-500">
                            Código generado automáticamente
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="nombre">Nombre Completo *</label>
                        <input type="text" id="nombre" class="w-full p-2 border rounded" required
                            oninput="validateNombreInput(this)"
                            onkeypress="return allowOnlyLetters(event)"
                            placeholder="Ej: Juan Pérez Rodríguez">
                        <div class="text-xs mt-1 text-gray-500" id="nombre-hint">
                            Solo letras, espacios y algunos caracteres especiales (ñ, á, é, í, ó, ú)
                        </div>
                    </div>
                                        
                    <div class="input-group">
                        <label for="dui" id="label-dui">DUI (Ej: 00000000-0)</label>
                        <input type="text" id="dui" class="w-full p-2 border rounded" placeholder="00000000-0"
                               oninput="formatDuiInput(this)"
                               onkeydown="handleDuiKeydown(event, this)">
                        <div class="text-xs mt-1 text-gray-500" id="dui-hint">
                            Formato: 00000000-0
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="telefono">Teléfono</label>
                        <input type="text" id="telefono" class="w-full p-2 border rounded" placeholder="2222-2222"
                               oninput="formatTelefonoInput(this)"
                               onkeydown="handleTelefonoKeydown(event, this)">
                        <div class="text-xs mt-1 text-gray-500" id="telefono-hint">
                            Formato: 2222-2222
                        </div>
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

// Función para renderizar formulario de edición
function renderEditClienteForm(cliente) {
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">Editar Cliente</h3>
                <div class="flex space-x-2">
                    <button onclick="cancelNewCliente()" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                    <button onclick="deleteCliente(${cliente.id}, '${escapeHtml(cliente.nombre)}')" class="btn btn-danger">
                        <i class="fas fa-trash mr-2"></i> Eliminar
                    </button>
                </div>
            </div>
            
            <form id="formCliente" onsubmit="saveCliente(event)">
                <input type="hidden" id="clienteId" value="${cliente.id}">
                <input type="hidden" id="codigoOriginal" value="${cliente.codigo}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label for="tipo">Tipo de Persona *</label>
                        <select id="tipo" class="w-full p-2 border rounded" required onchange="updateClienteForm()">
                            <option value="natural" ${cliente.tipo === 'natural' ? 'selected' : ''}>Persona Natural</option>
                            <option value="juridica" ${cliente.tipo === 'juridica' ? 'selected' : ''}>Persona Jurídica</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="codigo">Código Cliente *</label>
                        <input type="text" id="codigo" class="w-full p-2 border rounded bg-gray-100" 
                               required readonly value="${cliente.codigo}">
                        <div class="text-xs mt-1 text-gray-500">
                            Código no editable
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="nombre">Nombre Completo *</label>
                        <input type="text" id="nombre" class="w-full p-2 border rounded" required
                            oninput="validateNombreInput(this)"
                            onkeypress="return allowOnlyLetters(event)"
                            value="${escapeHtml(cliente.nombre)}"
                            placeholder="Ej: Juan Pérez Rodríguez">
                        <div class="text-xs mt-1 text-gray-500" id="nombre-hint">
                            Solo letras, espacios y algunos caracteres especiales (ñ, á, é, í, ó, ú)
                        </div>
                    </div>
                                        
                    <div class="input-group">
                        <label for="dui" id="label-dui">${cliente.tipo === 'natural' ? 'DUI (Ej: 00000000-0)' : 'NIT'}</label>
                        <input type="text" id="dui" class="w-full p-2 border rounded" 
                               value="${escapeHtml(cliente.dui || '')}"
                               oninput="formatDuiInput(this)"
                               onkeydown="handleDuiKeydown(event, this)"
                               placeholder="${cliente.tipo === 'natural' ? '00000000-0' : '0614-161090-103-6'}">
                        <div class="text-xs mt-1 text-gray-500" id="dui-hint">
                            Formato: ${cliente.tipo === 'natural' ? '00000000-0' : 'XXXX-XXXXXX-XXX-X'}
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="telefono">Teléfono</label>
                        <input type="text" id="telefono" class="w-full p-2 border rounded" 
                               value="${escapeHtml(cliente.telefono || '')}"
                               oninput="formatTelefonoInput(this)"
                               onkeydown="handleTelefonoKeydown(event, this)"
                               placeholder="2222-2222">
                        <div class="text-xs mt-1 text-gray-500" id="telefono-hint">
                            Formato: 2222-2222
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="ingresos">Ingresos Mensuales ($)</label>
                        <input type="number" id="ingresos" class="w-full p-2 border rounded" 
                               value="${cliente.ingresos || 0}" 
                               step="0.01" 
                               onchange="updateClienteForm()">
                    </div>
                    
                    <div class="input-group">
                        <label for="egresos">Egresos Mensuales ($)</label>
                        <input type="number" id="egresos" class="w-full p-2 border rounded" 
                               value="${cliente.egresos || 0}" 
                               step="0.01" 
                               onchange="updateClienteForm()">
                    </div>
                </div>
                
                <div class="input-group mt-4">
                    <label for="direccion">Dirección</label>
                    <textarea id="direccion" class="w-full p-2 border rounded" rows="3">${escapeHtml(cliente.direccion || '')}</textarea>
                </div>
                
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-sm text-blue-800">Capacidad de Pago Estimada</p>
                            <p id="capacidad-pago" class="text-2xl font-bold text-blue-900">${formatCurrency(cliente.capacidad_pago || 0)}</p>
                        </div>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save mr-2"></i> Actualizar Cliente
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
}

// Función para escapar HTML (seguridad)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateNombreInput(input) {
    let value = input.value;
    
    // Remover caracteres no permitidos
    let cleanValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.'-]/g, '');
    
    // Limitar espacios múltiples a uno solo
    cleanValue = cleanValue.replace(/\s+/g, ' ');
    
    // Limitar guiones múltiples a uno solo
    cleanValue = cleanValue.replace(/-+/g, '-');
    
    // Limitar apóstrofes múltiples a uno solo
    cleanValue = cleanValue.replace(/'+/g, '\'');
    
    // Limitar puntos múltiples a uno solo
    cleanValue = cleanValue.replace(/\.+/g, '.');
    
    // Si cambió el valor, actualizar
    if (input.value !== cleanValue) {
        const cursorPos = input.selectionStart;
        input.value = cleanValue;
        input.setSelectionRange(cursorPos - 1, cursorPos - 1);
    }
    
    // Validación visual
    const hint = document.getElementById('nombre-hint');
    
    if (!input.value.trim()) {
        input.style.borderColor = '#d1d5db';
        if (hint) {
            hint.textContent = 'Solo letras, espacios y algunos caracteres especiales (ñ, á, é, í, ó, ú)';
            hint.style.color = '#6b7280';
        }
    } else if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+(?:[ '-][a-zA-ZáéíóúÁÉÍÓÚñÑ]+)*$/.test(input.value.trim())) {
        // Validación mejorada: debe empezar con letra y no puede ser solo caracteres especiales
        input.style.borderColor = '#10b981';
        if (hint) {
            hint.textContent = '✓ Formato válido';
            hint.style.color = '#10b981';
        }
    } else {
        input.style.borderColor = '#ef4444';
        if (hint) {
            hint.textContent = 'Debe contener al menos una letra y no puede ser solo caracteres especiales';
            hint.style.color = '#ef4444';
        }
    }
}

// Función para prevenir entrada de números en el keypress
function allowOnlyLetters(event) {
    const key = event.key;
    
    // Permitir teclas de control (backspace, tab, enter, etc.)
    if (event.ctrlKey || event.altKey || 
        key === 'Backspace' || key === 'Tab' || key === 'Enter' || 
        key === 'Delete' || key === 'ArrowLeft' || key === 'ArrowRight' ||
        key === 'ArrowUp' || key === 'ArrowDown' || key === 'Home' || key === 'End') {
        return true;
    }
    
    // Permitir letras, espacios, acentos, ñ y algunos caracteres especiales
    const allowedChars = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.'-]$/;
    
    if (!allowedChars.test(key)) {
        event.preventDefault();
        return false;
    }
    
    return true;
}

// Funciones para formato de teléfono
function formatTelefonoInput(input) {
    // Guardar cursor position
    const cursorPos = input.selectionStart;
    const value = input.value;

    // Solo números, máximo 8 dígitos
    let cleanValue = value.replace(/\D/g, '').slice(0, 8);

    // Aplicar formato 2222-2222
    let formatted = '';
    for (let i = 0; i < cleanValue.length; i++) {
        if (i === 4) {
            formatted += '-';
        }
        formatted += cleanValue[i];
    }

    // Solo actualizar si cambió
    if (input.value !== formatted) {
        input.value = formatted;

        // Restaurar cursor position
        let newCursorPos = cursorPos;
        if (cursorPos > 4 && cleanValue.length > 4) {
            newCursorPos++; // Ajustar por el guión agregado
        }
        setTimeout(() => {
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }

    // Validación visual
    validateTelefono(input);
}

function handleTelefonoKeydown(e, input) {
    if (e.key === 'Backspace') {
        const cursorPos = input.selectionStart;
        const value = input.value;

        // Si estamos justo después del guión, mover cursor atrás
        if (cursorPos === 5 && value[4] === '-') {
            e.preventDefault();
            input.setSelectionRange(4, 4);
        }
    }
}

function validateTelefono(input) {
    const hint = document.getElementById('telefono-hint');

    if (!input.value) {
        input.style.borderColor = '#d1d5db';
        input.style.boxShadow = 'none';
        if (hint) {
            hint.textContent = 'Formato: 2222-2222';
            hint.style.color = '#6b7280';
        }
    } else if (/^\d{4}-\d{4}$/.test(input.value)) {
        input.style.borderColor = '#10b981';
        input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
        if (hint) {
            hint.textContent = '✓ Formato válido';
            hint.style.color = '#10b981';
        }
    } else {
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        if (hint) {
            hint.textContent = 'Formato incorrecto. Use: 2222-2222';
            hint.style.color = '#ef4444';
        }
    }
}

// Funciones para formato de DUI/NIT
function formatDuiInput(input) {
    const cursorPos = input.selectionStart;
    const value = input.value;
    const tipo = document.getElementById('tipo')?.value;

    if (tipo === 'natural') {
        // DUI: 00000000-0
        let cleanValue = value.replace(/\D/g, '').slice(0, 9);

        let formatted = '';
        for (let i = 0; i < cleanValue.length; i++) {
            if (i === 8) {
                formatted += '-';
            }
            formatted += cleanValue[i];
        }

        if (input.value !== formatted) {
            input.value = formatted;

            let newCursorPos = cursorPos;
            if (cursorPos > 8 && cleanValue.length > 8) {
                newCursorPos++; // Ajustar por guión
            }
            setTimeout(() => {
                input.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    } else {
        // NIT: 0614-161090-103-6
        let cleanValue = value.replace(/\D/g, '').slice(0, 14);

        let formatted = '';
        for (let i = 0; i < cleanValue.length; i++) {
            if (i === 4 || i === 10 || i === 13) {
                formatted += '-';
            }
            formatted += cleanValue[i];
        }

        if (input.value !== formatted) {
            input.value = formatted;

            // Ajustar cursor considerando guiones
            setTimeout(() => {
                input.setSelectionRange(cursorPos, cursorPos);
            }, 0);
        }
    }

    validateDui(input);
}

function handleDuiKeydown(e, input) {
    if (e.key === 'Backspace') {
        const cursorPos = input.selectionStart;
        const value = input.value;
        const tipo = document.getElementById('tipo')?.value;

        if (tipo === 'natural') {
            // Para DUI: si estamos después del guión (posición 9), mover atrás
            if (cursorPos === 9 && value[8] === '-') {
                e.preventDefault();
                input.setSelectionRange(8, 8);
            }
        } else {
            // Para NIT: si estamos después de un guión, mover atrás
            if ((cursorPos === 5 && value[4] === '-') ||
                (cursorPos === 12 && value[11] === '-') ||
                (cursorPos === 16 && value[15] === '-')) {
                e.preventDefault();
                input.setSelectionRange(cursorPos - 1, cursorPos - 1);
            }
        }
    }
}

function validateDui(input) {
    const hint = document.getElementById('dui-hint');
    const tipo = document.getElementById('tipo')?.value;

    if (!input.value) {
        input.style.borderColor = '#d1d5db';
        input.style.boxShadow = 'none';
        if (hint) {
            hint.textContent = tipo === 'natural' ? 'Formato: 00000000-0' : 'Formato: XXXX-XXXXXX-XXX-X';
            hint.style.color = '#6b7280';
        }
    } else if (tipo === 'natural' && /^\d{8}-\d$/.test(input.value)) {
        input.style.borderColor = '#10b981';
        input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
        if (hint) {
            hint.textContent = '✓ Formato válido';
            hint.style.color = '#10b981';
        }
    } else if (tipo === 'juridica' && /^\d{4}-\d{6}-\d{3}-\d$/.test(input.value)) {
        input.style.borderColor = '#10b981';
        input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
        if (hint) {
            hint.textContent = '✓ Formato válido';
            hint.style.color = '#10b981';
        }
    } else {
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        if (hint) {
            hint.textContent = tipo === 'natural' ?
                'Formato incorrecto. Use: 00000000-0' :
                'Formato incorrecto. Use: XXXX-XXXXXX-XXX-X';
            hint.style.color = '#ef4444';
        }
    }
}

function updateClienteForm() {
    const ingresos = parseFloat(document.getElementById('ingresos')?.value || 0);
    const egresos = parseFloat(document.getElementById('egresos')?.value || 0);
    const capacidad = ingresos - egresos;

    const capacidadElement = document.getElementById('capacidad-pago');
    if (capacidadElement) {
        capacidadElement.textContent = formatCurrency(capacidad);
    }

    // Actualizar configuración de DUI
    const tipo = document.getElementById('tipo')?.value;
    const labelDui = document.getElementById('label-dui');
    const duiInput = document.getElementById('dui');
    const duiHint = document.getElementById('dui-hint');

    if (labelDui && duiInput && duiHint) {
        if (tipo === 'natural') {
            labelDui.textContent = 'DUI (Ej: 00000000-0)';
            duiInput.placeholder = '00000000-0';
            duiHint.textContent = 'Formato: 00000000-0';
        } else {
            labelDui.textContent = 'NIT';
            duiInput.placeholder = '0614-161090-103-6';
            duiHint.textContent = 'Formato: XXXX-XXXXXX-XXX-X';
        }

        // Re-validar el DUI actual
        validateDui(duiInput);
    }
}

function cancelNewCliente() {
    clientesView = 'list';
    editingClienteId = null;
    loadClientes();
}

async function saveCliente(event) {
    event.preventDefault();

    const formData = {
        tipo: document.getElementById('tipo').value,
        nombre: document.getElementById('nombre').value,
        dui: document.getElementById('dui').value,
        telefono: document.getElementById('telefono').value,
        ingresos: parseFloat(document.getElementById('ingresos').value || 0),
        egresos: parseFloat(document.getElementById('egresos').value || 0),
        direccion: document.getElementById('direccion').value
    };

    // Si es un nuevo cliente, incluir código
    if (!editingClienteId) {
        formData.codigo = document.getElementById('codigo').value;
    }

    // Validaciones
    if (formData.tipo === 'natural' && formData.dui && !VALIDATORS.dui(formData.dui)) {
        showModal('Error', 'Formato de DUI inválido. Use: 00000000-0');
        return;
    }

    if (formData.telefono && !VALIDATORS.telefono(formData.telefono)) {
        showModal('Error', 'Formato de teléfono inválido. Use: 2222-2222');
        return;
    }

    if (formData.ingresos < 0) {
        showModal('Error', 'Los ingresos no pueden ser negativos.');
        return;
    }

    if (formData.egresos < 0) {
        showModal('Error', 'Los egresos no pueden ser negativos.');
        return;
    }

    let result;
    if (editingClienteId) {
        // Actualizar cliente existente
        result = await apiCall(`clientes.php?id=${editingClienteId}`, 'PUT', formData);
    } else {
        // Crear nuevo cliente
        result = await apiCall('clientes.php', 'POST', formData);
    }

    if (result && result.success) {
        showModal('Éxito', result.message);
        clientesView = 'list';
        editingClienteId = null;
        loadClientes();
    } else {
        showModal('Error', result?.error || 'Error al guardar cliente');
    }
}

// Función para eliminar cliente
async function deleteCliente(id, nombre) {
    if (confirm(`¿Está seguro de eliminar al cliente "${nombre}"? Esta acción no se puede deshacer.`)) {
        showLoading();
        
        try {
            const result = await apiCall(`clientes.php?id=${id}`, 'DELETE');
            
            if (result && result.success) {
                showModal('Éxito', result.message);
                // Si estábamos editando este cliente, regresar a la lista
                if (editingClienteId === id) {
                    editingClienteId = null;
                    clientesView = 'list';
                }
                loadClientes();
            } else {
                showModal('Error', result?.error || 'Error al eliminar cliente');
            }
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            showModal('Error', 'Error al eliminar el cliente');
        }
    }
}

// Hacer funciones disponibles globalmente
window.showNewClienteForm = showNewClienteForm;
window.showEditClienteForm = showEditClienteForm;
window.cancelNewCliente = cancelNewCliente;
window.saveCliente = saveCliente;
window.updateClienteForm = updateClienteForm;
window.deleteCliente = deleteCliente;

// Agregar funciones globales
window.formatTelefonoInput = formatTelefonoInput;
window.handleTelefonoKeydown = handleTelefonoKeydown;
window.formatDuiInput = formatDuiInput;
window.handleDuiKeydown = handleDuiKeydown;
window.validateTelefono = validateTelefono;
window.validateDui = validateDui;
window.loadClientesCount = loadClientesCount;
window.generarCodigoCliente = generarCodigoCliente;

window.validateNombreInput = validateNombreInput;
window.allowOnlyLetters = allowOnlyLetters;
window.escapeHtml = escapeHtml;