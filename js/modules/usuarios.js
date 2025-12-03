// usuarios.js - Lógica para el módulo de usuarios
let usuariosView = 'list';
let usuariosCount = 0;
let editingUsuarioId = null;

// Validaciones básicas (se asume que existe una función de validación de email global)
const USUARIO_VALIDATORS = {
    // Patrón simple de email. Asume que 'isValidEmail' está disponible globalmente.
    email: (val) => /\S+@\S+\.\S+/.test(val) 
};

// Función para cargar el contador de usuarios
async function loadUsuariosCount() {
    try {
        // Asumiendo que apiCall es una función global que maneja fetch
        const usuarios = await apiCall('usuarios.php');
        if (usuarios && !usuarios.error) {
            usuariosCount = usuarios.length;
            return usuariosCount;
        }
    } catch (error) {
        console.error('Error al contar usuarios:', error);
    }
    return 0;
}

async function loadUsuarios() {
    showLoading();

    await loadUsuariosCount();

    setTimeout(async () => {
        const usuarios = await apiCall('usuarios.php');

        if (usuarios && !usuarios.error) {
            renderUsuarios(usuarios);
        } else {
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Usuarios</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error al cargar usuarios: ${usuarios?.error || 'Error desconocido'}</p>
                    </div>
                </div>
            `;
        }
    }, 300);
}

function renderUsuarios(usuarios) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800"><i class="fas fa-users-cog mr-2 text-blue-500"></i> Gestión de Usuarios</h2>
                <button onclick="showNewUsuarioForm()" class="btn btn-primary">
                    <i class="fas fa-user-plus mr-2"></i> Nuevo Usuario
                </button>
            </div>
            
            ${usuariosView === 'list' ? renderUsuariosList(usuarios) : ''}
        </div>
    `;

    document.getElementById('main-content').innerHTML = content;
}

// =========================================================
// FUNCIÓN MODIFICADA: OCULTAR BOTÓN DE TOGGLE PARA ADMIN
// =========================================================
function renderUsuariosList(usuarios) {
    if (usuarios.length === 0) {
        return `
            <div class="card text-center py-12">
                <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay usuarios registrados</h3>
                <p class="text-gray-500 mb-6">Comienza agregando tu primer usuario</p>
                <button onclick="showNewUsuarioForm()" class="btn btn-primary">
                    <i class="fas fa-user-plus mr-2"></i> Agregar Usuario
                </button>
            </div>
        `;
    }

    // Mostrar contador en el encabezado
    const headerHTML = `
        <div class="mb-4 p-3 bg-blue-50 rounded-lg">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-sm text-blue-800">Total de usuarios registrados</p>
                    <p class="text-2xl font-bold text-blue-900">${usuariosCount}</p>
                </div>
            </div>
        </div>
    `;

    const usuariosHTML = usuarios.map(usuario => {
        const isActive = usuario.activo == 1;
        const estadoLabel = isActive ? 'Activo' : 'Inactivo';
        const estadoClass = isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const rolClass = usuario.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
        
        // 🔑 Determinar si el usuario de esta fila es Administrador
        const isTargetAdmin = usuario.rol === 'admin';
        
        // --- LÓGICA DEL BOTÓN DE TOGGLE (OCULTAR SI ES ADMIN) ---
        let toggleButtonHtml = ''; // Inicialmente vacío (oculto)

        if (!isTargetAdmin) {
            // Si NO es Administrador, mostramos el botón de toggle normal
            const toggleBtnClass = isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800';
            const toggleBtnIcon = isActive ? 'fa-ban' : 'fa-check-circle';
            const toggleBtnAction = isActive ? 'Desactivar' : 'Activar';

            toggleButtonHtml = `
                <button onclick="toggleUsuarioStatus(${usuario.id}, ${usuario.activo}, '${usuario.nombre}')" 
                        class="${toggleBtnClass} p-1" title="${toggleBtnAction} Usuario">
                    <i class="fas ${toggleBtnIcon}"></i>
                </button>
            `;
        }
        // --- FIN LÓGICA DEL BOTÓN DE TOGGLE ---

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-3 font-medium text-gray-900">${usuario.nombre}</td>
                <td class="px-6 py-3 text-sm text-gray-500">${usuario.email}</td>
                <td class="px-6 py-3">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${rolClass}">
                        ${usuario.rol.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-3">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${estadoClass}">
                        ${estadoLabel.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-3 text-sm text-gray-500">
                    ${new Date(usuario.fecha_creacion).toLocaleDateString()}
                </td>
                <td class="px-6 py-3 space-x-2 whitespace-nowrap">
                    <button onclick="showEditUsuarioForm(${usuario.id})" 
                            class="text-blue-600 hover:text-blue-900 p-1" title="Modificar Usuario">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    ${toggleButtonHtml}
                </td>
            </tr>
        `;
    }).join('');

    return `
        ${headerHTML}
        <div class="card overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registro</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${usuariosHTML}
                </tbody>
            </table>
        </div>
    `;
}
// =========================================================


async function showNewUsuarioForm() {
    showLoading();
    usuariosView = 'form';
    editingUsuarioId = null;

    setTimeout(() => {
        const content = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">Nuevo Usuario</h2>
                    <button onclick="cancelNewUsuario()" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
                ${renderFormularioUsuario()}
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
        // Enfocar el primer campo
        document.getElementById('nombre').focus();
    }, 100);
}

async function showEditUsuarioForm(usuarioId) {
    showLoading();
    try {
        const usuario = await apiCall(`usuarios.php?id=${usuarioId}`);
        
        if (usuario && !usuario.error) {
            editingUsuarioId = usuarioId;
            usuariosView = 'form';
            
            setTimeout(() => {
                const content = `
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-800">Editar Usuario</h2>
                            <button onclick="cancelNewUsuario()" class="btn btn-secondary">
                                <i class="fas fa-times mr-2"></i> Cancelar
                            </button>
                        </div>
                        ${renderFormularioUsuario(usuario)}
                    </div>
                `;
                document.getElementById('main-content').innerHTML = content;
            }, 100);
        } else {
            showModal('Error', 'No se pudo cargar el usuario para editar');
            loadUsuarios();
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
        showModal('Error', 'Error al cargar los datos del usuario');
        loadUsuarios();
    }
}

// Función unificada para renderizar el formulario (Nuevo y Edición)
function renderFormularioUsuario(usuario = null) {
    
    return `
        <div class="card">
            <form id="formUsuario" onsubmit="saveUsuario(event)">
                <input type="hidden" id="usuarioId" value="${usuario ? usuario.id : ''}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div class="input-group md:col-span-2">
                        <label>Nombre Completo *</label>
                        <input type="text" id="nombre" class="w-full p-2 border rounded" required
                            value="${usuario?.nombre || ''}"
                            oninput="validateField(this, this.value.length > 3)"
                            placeholder="Ej: Juan Pérez">
                    </div>

                    <div class="input-group">
                        <label>Email *</label>
                        <input type="email" id="email" class="w-full p-2 border rounded" required
                            value="${usuario?.email || ''}"
                            oninput="validateField(this, USUARIO_VALIDATORS.email(this.value))"
                            placeholder="ejemplo@empresa.com">
                    </div>

                    <div class="input-group">
                        <label>${usuario ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                        <input type="password" id="password" class="w-full p-2 border rounded"
                            ${usuario ? '' : 'required'}
                            placeholder="Mínimo 8 caracteres">
                    </div>
                    
                    <div class="input-group">
                        <label>Rol *</label>
                        <select id="rol" class="w-full p-2 border rounded" required>
                            <option value="usuario" ${usuario?.rol === 'usuario' ? 'selected' : ''}>Usuario Estándar</option>
                            <option value="admin" ${usuario?.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>

                    <div class="input-group flex items-center pt-8">
                        <label for="activo" class="mr-3 font-semibold text-gray-700">Estado Activo:</label>
                        <input type="checkbox" id="activo" class="form-checkbox h-5 w-5 text-green-600"
                            ${usuario?.activo == 1 || usuario === null ? 'checked' : ''}>
                    </div>
                </div>

                <div class="flex gap-4 pt-6 border-t mt-6">
                    <button type="submit" class="btn btn-success flex-1">
                        <i class="fas fa-save mr-2"></i> Guardar Usuario
                    </button>
                    <button type="button" onclick="cancelNewUsuario()" class="btn btn-secondary flex-1">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Implementación simple de validateField para estilos de feedback
function validateField(input, isValid) {
    if (isValid) {
        input.style.borderColor = '#10b981'; // Verde
        input.style.backgroundColor = '#f0fdf4';
    } else {
        input.style.borderColor = '#ef4444'; // Rojo
        input.style.backgroundColor = '#fef2f2';
    }
}

function cancelNewUsuario() {
    usuariosView = 'list';
    editingUsuarioId = null;
    loadUsuarios();
}

// =========================================================
// NUEVA FUNCIÓN: TOGGLE STATUS
// =========================================================
async function toggleUsuarioStatus(id, currentStatus, nombre) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'activar' : 'desactivar';
    const actionVerb = newStatus === 1 ? 'Activado' : 'Desactivado';

    if (confirm(`¿Está seguro de ${action} al usuario "${nombre}"?`)) {
        showLoading(); // Asumiendo que esta función existe globalmente
        
        try {
            // Preparamos los datos para la API
            const updateData = { activo: newStatus };
            
            // Llamamos a la API usando PUT (Actualizar)
            const result = await apiCall(`usuarios.php?id=${id}`, 'PUT', updateData);
            
            if (result && result.success) {
                showModal('Éxito', `Usuario ${nombre} ha sido ${actionVerb} correctamente.`);
                loadUsuarios(); // Recargar la lista para reflejar el cambio
            } else {
                // Muestra el mensaje de error de PHP (ej: el 403 Forbidden)
                showModal('Error', result?.error || `No se pudo ${action} al usuario.`);
                loadUsuarios();
            }
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            showModal('Error', 'Ocurrió un error al intentar actualizar el estado del usuario.');
            loadUsuarios();
        }
    }
}
// =========================================================


// Guardar Usuario (Lógica unificada para Crear y Editar)
async function saveUsuario(event) {
    event.preventDefault();

    const id = document.getElementById('usuarioId').value;
    const isEditing = !!id;
    
    // Recolectar datos
    const formData = {
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        rol: document.getElementById('rol').value,
        activo: document.getElementById('activo').checked ? 1 : 0
    };

    // Validaciones
    if (!formData.nombre || formData.nombre.length < 4) {
        showModal('Error', 'El nombre es obligatorio y debe tener al menos 4 caracteres.');
        return;
    }
    if (!USUARIO_VALIDATORS.email(formData.email)) {
        showModal('Error', 'El email ingresado no es válido.');
        return;
    }
    // Para crear, la contraseña es obligatoria. Para editar, solo si se proporciona.
    if (!isEditing && formData.password.length < 8) {
        showModal('Error', 'La contraseña es obligatoria para nuevos usuarios y debe tener al menos 8 caracteres.');
        return;
    }
    if (isEditing && formData.password && formData.password.length < 8) {
        showModal('Error', 'La nueva contraseña debe tener al menos 8 caracteres.');
        return;
    }
    // Si estamos editando y no se ingresó una contraseña, la eliminamos de formData para no enviarla
    if (isEditing && !formData.password) {
        delete formData.password;
    }


    // Mostrar loading en botón
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        let result;
        
        if (isEditing) {
            // Actualizar
            result = await apiCall(`usuarios.php?id=${id}`, 'PUT', formData);
        } else {
            // Crear
            result = await apiCall('usuarios.php', 'POST', formData);
        }

        if (result && (result.success || result.id)) {
            showModal('Éxito', 'Usuario guardado correctamente.');
            usuariosView = 'list';
            editingUsuarioId = null;
            loadUsuarios();
        } else {
            showModal('Error', result?.error || 'No se pudo guardar el usuario.');
        }
    } catch (error) {
        console.error(error);
        showModal('Error', 'Error de conexión con el servidor.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}


// Función para eliminar usuario (Mantenemos esta por si acaso, aunque se usa toggleStatus)
async function deleteUsuario(id, nombre) {
    // Esta función ya no se usa en la vista de tabla, pero se mantiene la definición.
    console.warn(`Intento de eliminación permanente de usuario ${nombre}. Usar toggleUsuarioStatus en su lugar.`);
    if (confirm(`ADVERTENCIA: ¿Está seguro de eliminar PERMANENTEMENTE al usuario "${nombre}"? Esta acción es irreversible.`)) {
        showLoading();
        try {
            const result = await apiCall(`usuarios.php?id=${id}`, 'DELETE');
            
            if (result && result.success) {
                showModal('Éxito', result.message);
                loadUsuarios();
            } else {
                showModal('Error', result?.error || 'Error al eliminar usuario');
                loadUsuarios();
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            showModal('Error', 'Ocurrió un error al intentar eliminar');
            loadUsuarios();
        }
    }
}


// Adaptación de la función de carga del módulo principal
function loadUsuariosModule() {
    if (typeof loadUsuarios === 'function') {
        loadUsuarios();
    } else {
         document.getElementById('main-content').innerHTML = `
              <div class="card p-8 text-center">
                  <h2 class="text-2xl font-bold mb-4">Módulo de Usuarios</h2>
                  <p class="text-gray-500">Módulo en construcción o función loadUsuarios() no encontrada.</p>
              </div>
          `;
    }
}