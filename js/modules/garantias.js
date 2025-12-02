let garantiasView = 'list';
let editingGarantiaId = null;

async function loadGarantiasModule() {
    showLoading();
    garantiasView = 'list';
    editingGarantiaId = null;

    try {
        // Obtenemos las garantías usando la ruta correcta
        // Nota: Asegúrate de que garantias.php devuelva el JSON esperado
        const garantias = await apiCall('includes/garantias.php');

        const content = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">Garantías Mobiliarias</h2>
                        <p class="text-sm text-gray-500">Gestión de Activos, Prendas y Cesiones</p>
                    </div>
                    <button onclick="showGarantiaForm()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Nueva Garantía
                    </button>
                </div>
                
                <div class="flex gap-2 border-b overflow-x-auto pb-1">
                    <button class="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-bold whitespace-nowrap">Todas</button>
                    <button class="px-4 py-2 text-gray-500 hover:text-blue-600 whitespace-nowrap">Por Vencer (Seguros)</button>
                    <button class="px-4 py-2 text-gray-500 hover:text-blue-600 whitespace-nowrap">Requieren Avalúo</button>
                </div>

                <div id="garantiasContent">
                    ${renderGarantiasList(garantias || [])}
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;

    } catch (error) {
        console.error(error);
        document.getElementById('main-content').innerHTML = `
            <div class="card p-8 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                <p>Error al cargar el módulo de garantías.</p>
            </div>`;
    }
}

function renderGarantiasList(garantias) {
    if (!garantias || garantias.length === 0) {
        return `
            <div class="card">
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-file-contract text-5xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600">No hay garantías registradas</h3>
                    <p class="mb-6">Registra los bienes muebles, inventarios o maquinaria de tus clientes.</p>
                    <button onclick="showGarantiaForm()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Registrar Primera Garantía
                    </button>
                </div>
            </div>
        `;
    }

    const grid = garantias.map(g => {
        // Definir colores según estado
        const estadoStyles = {
            'tramite': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'vigente': 'bg-green-100 text-green-800 border-green-200',
            'deteriorada': 'bg-red-100 text-red-800 border-red-200',
            'ejecucion': 'bg-orange-100 text-orange-800 border-orange-200',
            'liberada': 'bg-gray-100 text-gray-800 border-gray-200'
        };
        const badgeClass = estadoStyles[g.estado] || 'bg-gray-100 text-gray-800';

        return `
            <div class="card hover:shadow-lg transition-shadow border-t-4 border-blue-500 cursor-pointer relative group"
                 onclick="editGarantia(${g.id})">
                
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-mono text-gray-400">${g.codigo_interno}</span>
                    <span class="px-2 py-0.5 text-xs rounded-full border ${badgeClass} uppercase font-bold">
                        ${g.estado}
                    </span>
                </div>

                <h3 class="font-bold text-gray-800 truncate" title="${g.descripcion_bien}">
                    ${g.descripcion_bien}
                </h3>
                <p class="text-sm text-blue-600 mb-3 truncate">
                    <i class="fas fa-user mr-1"></i> ${g.cliente_nombre || 'Cliente Desconocido'}
                </p>

                <div class="bg-gray-50 p-2 rounded text-sm space-y-1 mb-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">Tipo:</span>
                        <span class="font-medium truncate ml-2">${g.tipo_nombre}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Valor Comercial:</span>
                        <span class="font-bold text-gray-800">${formatCurrency(g.valor_comercial)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Valor Realización:</span>
                        <span class="font-bold text-blue-700">${formatCurrency(g.valor_realizacion)}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
                    <span title="Folio RUG"><i class="fas fa-university mr-1"></i> ${g.folio_rug || 'Sin RUG'}</span>
                    
                    <button onclick="event.stopPropagation(); deleteGarantia(${g.id})" 
                            class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${grid}
        </div>
        <div class="mt-4 text-right text-xs text-gray-500">
            Total Registros: ${garantias.length}
        </div>
    `;
}

// ==========================================
// FORMULARIO (CREAR / EDITAR)
// ==========================================

async function showGarantiaForm(garantia = null) {
    showLoading();
    editingGarantiaId = garantia ? garantia.id : null;

    try {
        // Cargar Catálogos necesarios (Clientes y Tipos) en paralelo
        const [clientes, tipos] = await Promise.all([
            apiCall('includes/clientes.php'), // Trae lista de clientes
            apiCall('includes/garantias.php?modulo=tipos') // Trae tipos de garantía
        ]);

        const content = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">
                        ${garantia ? 'Editar Garantía' : 'Registrar Nueva Garantía'}
                    </h2>
                    <button onclick="loadGarantiasModule()" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
                ${renderFormHTML(garantia, clientes, tipos)}
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;
        
        // Inicializar cálculos si es nuevo
        if(!garantia) updateCalculosGarantia();

    } catch (error) {
        console.error(error);
        showModal('Error', 'No se pudieron cargar los datos necesarios para el formulario.');
        loadGarantiasModule();
    }
}

function renderFormHTML(data, clientes, tipos) {
    // Valores por defecto
    const valComercial = data ? data.valor_comercial : 0;
    const valRealizacion = data ? data.valor_realizacion : 0;
    
    // Generar opciones de Clientes
    const clientesOptions = clientes.map(c => 
        `<option value="${c.id}" ${data && data.cliente_id == c.id ? 'selected' : ''}>
            ${c.codigo} - ${c.nombre || c.razon_social}
        </option>`
    ).join('');

    // Generar opciones de Tipos
    const tiposOptions = tipos.map(t => 
        `<option value="${t.id}" ${data && data.tipo_garantia_id == t.id ? 'selected' : ''}>
            ${t.nombre}
        </option>`
    ).join('');

    return `
        <div class="card">
            <form id="formGarantia" onsubmit="saveGarantia(event)">
                <input type="hidden" id="garantiaId" value="${data ? data.id : ''}">
                
                <h4 class="font-bold text-gray-700 border-b pb-2 mb-4">Datos del Bien</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="input-group">
                        <label>Cliente Propietario *</label>
                        <select id="cliente_id" class="w-full p-2 border rounded bg-white" required>
                            <option value="">-- Seleccione Cliente --</option>
                            ${clientesOptions}
                        </select>
                    </div>

                    <div class="input-group">
                        <label>Tipo de Garantía *</label>
                        <select id="tipo_garantia_id" class="w-full p-2 border rounded bg-white" required>
                            ${tiposOptions}
                        </select>
                    </div>
                </div>

                <div class="input-group mb-4">
                    <label>Descripción Técnica Detallada *</label>
                    <textarea id="descripcion_bien" class="w-full p-2 border rounded" rows="3" required 
                        placeholder="Marca, Modelo, Serie, Color, Estado de conservación...">${data ? data.descripcion_bien : ''}</textarea>
                </div>

                <div class="input-group mb-6">
                    <label>Ubicación Física del Bien</label>
                    <input type="text" id="ubicacion_fisica" class="w-full p-2 border rounded" 
                        value="${data ? data.ubicacion_fisica : ''}" placeholder="Dirección exacta donde se encuentra">
                </div>

                <h4 class="font-bold text-gray-700 border-b pb-2 mb-4">Valoración Financiera</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="input-group">
                        <label>Valor Comercial (Avalúo) $ *</label>
                        <input type="number" id="valor_comercial" class="w-full p-2 border rounded font-bold" 
                            value="${valComercial}" step="0.01" min="0" required 
                            oninput="updateCalculosGarantia()">
                    </div>
                    
                    <div class="input-group">
                        <label>Factor de Castigo %</label>
                        <input type="number" id="factor_castigo" class="w-full p-2 border rounded" 
                            value="70" min="0" max="100" 
                            oninput="updateCalculosGarantia()">
                        <p class="text-xs text-gray-500 mt-1">Por defecto 70%</p>
                    </div>

                    <div class="input-group bg-blue-50 p-2 rounded border border-blue-200">
                        <label class="text-blue-800 text-sm">Valor de Realización (Garantía)</label>
                        <input type="number" id="valor_realizacion" class="w-full p-1 bg-transparent border-none font-bold text-xl text-blue-900 focus:ring-0" 
                            value="${valRealizacion}" readonly>
                        <p class="text-xs text-blue-600">Este es el monto máximo a cubrir</p>
                    </div>
                </div>

                <h4 class="font-bold text-gray-700 border-b pb-2 mb-4">Registro Legal (Ley de Garantías Mobiliarias)</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="input-group">
                        <label>Folio RUG (CNR)</label>
                        <input type="text" id="folio_rug" class="w-full p-2 border rounded" 
                            value="${data ? (data.folio_rug || '') : ''}" placeholder="Ej: 2023-123456">
                    </div>
                    <div class="input-group">
                        <label>Fecha Inscripción</label>
                        <input type="date" id="fecha_inscripcion_rug" class="w-full p-2 border rounded" 
                            value="${data ? (data.fecha_inscripcion_rug || '') : ''}">
                    </div>
                    <div class="input-group">
                        <label>Estado Actual</label>
                        <select id="estado" class="w-full p-2 border rounded">
                            <option value="tramite" ${data && data.estado === 'tramite' ? 'selected' : ''}>En Trámite</option>
                            <option value="vigente" ${data && data.estado === 'vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="deteriorada" ${data && data.estado === 'deteriorada' ? 'selected' : ''}>Deteriorada</option>
                            <option value="ejecucion" ${data && data.estado === 'ejecucion' ? 'selected' : ''}>En Ejecución</option>
                            <option value="liberada" ${data && data.estado === 'liberada' ? 'selected' : ''}>Liberada</option>
                        </select>
                    </div>
                </div>

                <div class="flex gap-4 pt-4 border-t">
                    <button type="submit" class="btn btn-success flex-1">
                        <i class="fas fa-save mr-2"></i> Guardar Garantía
                    </button>
                    <button type="button" onclick="loadGarantiasModule()" class="btn btn-secondary flex-1">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
}

// ==========================================
// LÓGICA DE NEGOCIO Y API
// ==========================================

function updateCalculosGarantia() {
    const comercial = parseFloat(document.getElementById('valor_comercial').value) || 0;
    const factor = parseFloat(document.getElementById('factor_castigo').value) || 70;
    
    // Cálculo: Valor * (Porcentaje / 100)
    const realizacion = comercial * (factor / 100);
    
    document.getElementById('valor_realizacion').value = realizacion.toFixed(2);
}

async function editGarantia(id) {
    showLoading();
    // Reutilizamos la lógica del listado pero filtramos el ID (o hacemos llamada individual)
    // Lo ideal es tener un endpoint get_garantia.php?id=X, pero usaremos el listado general por simplicidad si no existe
    try {
        // Opción A: Buscar en la lista ya cargada (si la tuviéramos en variable global)
        // Opción B: Llamar API específica (Recomendado)
        // Como no definimos un endpoint específico en el PHP de ejemplo para "get by id", 
        // simularemos llamando a todas y buscando. *En producción usa un endpoint específico*.
        
        const todas = await apiCall('includes/garantias.php');
        const garantia = todas.find(g => g.id == id);
        
        if (garantia) {
            showGarantiaForm(garantia);
        } else {
            showModal('Error', 'No se encontró la garantía especificada.');
            loadGarantiasModule();
        }
    } catch (e) {
        console.error(e);
        loadGarantiasModule();
    }
}

async function saveGarantia(event) {
    event.preventDefault();

    const id = document.getElementById('garantiaId').value;
    
    const payload = {
        cliente_id: document.getElementById('cliente_id').value,
        tipo_garantia_id: document.getElementById('tipo_garantia_id').value,
        descripcion_bien: document.getElementById('descripcion_bien').value,
        ubicacion_fisica: document.getElementById('ubicacion_fisica').value,
        valor_comercial: document.getElementById('valor_comercial').value,
        valor_realizacion: document.getElementById('valor_realizacion').value, // Importante enviar esto calculado
        folio_rug: document.getElementById('folio_rug').value,
        fecha_inscripcion_rug: document.getElementById('fecha_inscripcion_rug').value,
        estado: document.getElementById('estado').value
    };

    // Validación básica
    if (payload.valor_comercial <= 0) {
        showModal('Error', 'El valor comercial debe ser mayor a 0');
        return;
    }

    // Botón Loading
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        let endpoint = 'includes/garantias.php';
        // Si estamos editando, podrías necesitar pasar el ID en la URL o en el payload
        // Según tu PHP simple, asumo POST crea. Si tuvieras PUT, úsalo aquí.
        // Para este ejemplo, si es edición, asumimos que el backend maneja actualización si recibe ID
        // Ojo: Tu PHP actual (garantias.php) solo tenía CREATE. Deberías agregar UPDATE en PHP si lo necesitas.
        
        // Si el PHP no soporta edición, esto creará una nueva.
        // Simularemos envío estándar.
        
        const result = await apiCall(endpoint, 'POST', payload);

        if (result && (result.success || result.id)) {
            showModal('Éxito', 'Garantía guardada correctamente.');
            loadGarantiasModule();
        } else {
            showModal('Error', result?.error || 'No se pudo guardar la garantía.');
        }

    } catch (error) {
        console.error(error);
        showModal('Error', 'Error de conexión.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteGarantia(id) {
    if (!confirm('¿Estás seguro de eliminar esta garantía? Si está vinculada a un crédito activo, esto podría causar errores.')) {
        return;
    }
    
    // Nota: Necesitas implementar DELETE en tu PHP
    // await apiCall(`includes/garantias.php?id=${id}`, 'DELETE');
    alert('Funcionalidad de eliminar pendiente de implementación en backend.');
}
