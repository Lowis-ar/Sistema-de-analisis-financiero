// js/modules/garantias.js

let garantiasView = 'list';
let editingGarantiaId = null;
let allGarantiasData = []; // Variable para almacenar los datos crudos y poder filtrar

// ==========================================
// CARGA INICIAL Y LISTADO
// ==========================================

async function loadGarantiasModule() {
    showLoading();
    garantiasView = 'list';
    editingGarantiaId = null;

    try {
        const response = await apiCall('garantias.php');
        
        if (response && response.error) {
            document.getElementById('main-content').innerHTML = `<div class="card p-8 text-center text-red-500"><p>Error: ${response.error}</p></div>`;
            return;
        }

        // Guardamos los datos globalmente para filtrar sin llamar a la API de nuevo
        allGarantiasData = Array.isArray(response) ? response : [];

        const content = `
            <div class="space-y-6 animate-fade-in">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">Garantías Mobiliarias</h2>
                        <p class="text-sm text-gray-500">Gestión de Activos, Prendas y Cesiones</p>
                    </div>
                    <button onclick="showGarantiaForm()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Nueva Garantía
                    </button>
                </div>
                
                <!-- BARRA DE FILTROS FUNCIONAL -->
                <div class="flex gap-2 border-b overflow-x-auto pb-1">
                    <button onclick="filtrarGarantias('todas')" id="btn-todas" class="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-bold whitespace-nowrap transition-colors">Todas</button>
                    <button onclick="filtrarGarantias('vencer')" id="btn-vencer" class="px-4 py-2 text-gray-500 hover:text-blue-600 border-b-2 border-transparent whitespace-nowrap transition-colors">
                        <i class="fas fa-clock mr-1"></i> Por Vencer (Seguros)
                    </button>
                    <button onclick="filtrarGarantias('deteriorada')" id="btn-deteriorada" class="px-4 py-2 text-gray-500 hover:text-blue-600 border-b-2 border-transparent whitespace-nowrap transition-colors">Deterioradas</button>
                </div>

                <div id="garantiasContent">
                    ${renderGarantiasList(allGarantiasData)}
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = content;

    } catch (error) {
        console.error(error);
        document.getElementById('main-content').innerHTML = '<div class="card p-4 text-red-500">Error de conexión.</div>';
    }
}

// Función de filtrado en cliente (Rápida)
function filtrarGarantias(filtro) {
    // Actualizar UI de botones
    ['todas', 'vencer', 'deteriorada'].forEach(f => {
        const btn = document.getElementById(`btn-${f}`);
        if (f === filtro) {
            btn.className = "px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-bold whitespace-nowrap transition-colors";
        } else {
            btn.className = "px-4 py-2 text-gray-500 hover:text-blue-600 border-b-2 border-transparent whitespace-nowrap transition-colors";
        }
    });

    let filtradas = [];
    const hoy = new Date();
    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoy.getDate() + 30); // 30 días para vencer

    if (filtro === 'todas') {
        filtradas = allGarantiasData;
    } else if (filtro === 'vencer') {
        filtradas = allGarantiasData.filter(g => {
            if (!g.fecha_vencimiento_seguro) return false; // Si no tiene seguro, no cuenta
            const fechaVence = new Date(g.fecha_vencimiento_seguro);
            return fechaVence <= limiteAlerta && g.estado === 'vigente';
        });
    } else if (filtro === 'deteriorada') {
        filtradas = allGarantiasData.filter(g => g.estado === 'deteriorada');
    }

    // Renderizar solo el contenido
    document.getElementById('garantiasContent').innerHTML = renderGarantiasList(filtradas);
}

function renderGarantiasList(garantias) {
    if (!Array.isArray(garantias) || garantias.length === 0) {
        return `
            <div class="card">
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-search text-5xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600">No se encontraron garantías</h3>
                    <p class="mb-6">No hay registros con el criterio seleccionado.</p>
                </div>
            </div>
        `;
    }

    const grid = garantias.map(g => {
        const estado = g.estado || 'tramite';
        const valReal = parseFloat(g.valor_realizacion || 0);
        
        // Lógica de alerta de seguro
        let alertaSeguro = '';
        if (g.fecha_vencimiento_seguro) {
            const hoy = new Date();
            const vence = new Date(g.fecha_vencimiento_seguro);
            const diffTime = vence - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                alertaSeguro = `<div class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded mt-2 font-bold"><i class="fas fa-exclamation-circle"></i> Seguro Vencido (${g.fecha_vencimiento_seguro})</div>`;
            } else if (diffDays <= 30) {
                alertaSeguro = `<div class="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded mt-2 font-bold"><i class="fas fa-clock"></i> Vence en ${diffDays} días</div>`;
            }
        } else {
            alertaSeguro = `<div class="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded mt-2"><i class="fas fa-shield-alt"></i> Sin seguro registrado</div>`;
        }

        const badgeClass = {
            'tramite': 'bg-yellow-100 text-yellow-800',
            'vigente': 'bg-green-100 text-green-800',
            'deteriorada': 'bg-red-100 text-red-800',
            'liberada': 'bg-gray-100 text-gray-800'
        }[estado] || 'bg-gray-100';

        return `
            <div class="card hover:shadow-lg transition-shadow border-t-4 border-blue-500 cursor-pointer relative group">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-mono text-gray-400">${g.codigo_interno || 'N/A'}</span>
                    <span class="px-2 py-0.5 text-xs rounded-full border ${badgeClass} uppercase font-bold">
                        ${estado}
                    </span>
                </div>

                <h3 class="font-bold text-gray-800 truncate" title="${g.descripcion_bien}">
                    ${g.descripcion_bien}
                </h3>
                <p class="text-sm text-blue-600 mb-2 truncate">
                    <i class="fas fa-user mr-1"></i> ${g.cliente_nombre || 'Cliente Desconocido'}
                </p>

                ${alertaSeguro}

                <div class="border-t mt-3 pt-2 flex justify-between items-center">
                    <span class="text-xs text-gray-500">Valor Realización</span>
                    <span class="font-bold text-blue-700">${formatCurrency(valReal)}</span>
                </div>

                <div class="absolute top-2 right-2 flex gap-2">
                    <button onclick="editGarantia(${g.id})" class="text-blue-600 hover:text-blue-800" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteGarantia(${g.id})" class="text-red-600 hover:text-red-800" title="Eliminar">
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
            Registros visibles: ${garantias.length}
        </div>
    `;
}

// ==========================================
// FORMULARIO Y EDICIÓN
// ==========================================

async function showGarantiaForm(garantia = null) {
    showLoading();
    editingGarantiaId = garantia ? garantia.id : null;

    try {
        const [clientes, tipos] = await Promise.all([
            apiCall('clientes.php'), 
            apiCall('garantias.php?modulo=tipos')
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
        if(!garantia) updateCalculosGarantia();

    } catch (error) {
        console.error(error);
        loadGarantiasModule();
    }
}

function renderFormHTML(data, clientes, tipos) {
    // Valores por defecto
    const valComercial = data ? data.valor_comercial : 0;
    const valRealizacion = data ? data.valor_realizacion : 0;
    
    // Datos de Seguro y Perito
    const aseguradora = data ? (data.aseguradora || '') : '';
    const poliza = data ? (data.numero_poliza || '') : '';
    const venceSeguro = data ? (data.fecha_vencimiento_seguro || '') : '';
    
    // Intentamos obtener el perito si estamos editando (aunque la vista listado no lo trae por defecto, lo dejamos opcional)
    const perito = data ? (data.ultimo_perito || '') : '';

    const clientesOptions = Array.isArray(clientes) ? clientes.map(c => 
        `<option value="${c.id}" ${data && data.cliente_id == c.id ? 'selected' : ''}>
            ${c.codigo} - ${c.nombre || c.razon_social}
        </option>`
    ).join('') : '';

    const tiposOptions = Array.isArray(tipos) ? tipos.map(t => 
        `<option value="${t.id}" ${data && data.tipo_garantia_id == t.id ? 'selected' : ''}>
            ${t.nombre}
        </option>`
    ).join('') : '';

    return `
        <div class="card">
            <form id="formGarantia" onsubmit="saveGarantia(event)">
                <input type="hidden" id="garantiaId" value="${data ? data.id : ''}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- COLUMNA 1: DATOS GENERALES -->
                    <div>
                        <h4 class="font-bold text-gray-700 border-b pb-2 mb-4">1. Identificación del Activo</h4>
                        
                        <div class="input-group mb-4">
                            <label>Cliente Propietario *</label>
                            <select id="cliente_id" class="w-full p-2 border rounded" required>
                                <option value="">-- Seleccionar --</option>
                                ${clientesOptions}
                            </select>
                        </div>

                        <div class="input-group mb-4">
                            <label>Tipo de Garantía *</label>
                            <select id="tipo_garantia_id" class="w-full p-2 border rounded" required>
                                ${tiposOptions}
                            </select>
                        </div>

                        <div class="input-group mb-4">
                            <label>Descripción Detallada *</label>
                            <textarea id="descripcion_bien" class="w-full p-2 border rounded" rows="3" required 
                                placeholder="Ejemplo: Marca, Modelo, Serie, Color...">${data ? data.descripcion_bien : ''}</textarea>
                        </div>

                        <div class="input-group mb-4">
                            <label>Ubicación Física</label>
                            <input type="text" id="ubicacion_fisica" class="w-full p-2 border rounded" 
                                placeholder="Ejemplo: Calle 123, Ciudad" value="${data ? data.ubicacion_fisica : ''}">
                        </div>
                    </div>

                    <!-- COLUMNA 2: VALORACIÓN Y LEGAL -->
                    <div>
                        <h4 class="font-bold text-gray-700 border-b pb-2 mb-4">2. Valoración y Cobertura</h4>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="input-group">
                                <label>Valor Comercial $ *</label>
                                <input type="number" id="valor_comercial" class="w-full p-2 border rounded font-bold text-blue-900" 
                                    placeholder="Ejemplo: 10000.00" value="${valComercial}" step="0.01" min="0" required oninput="updateCalculosGarantia()">
                            </div>
                            <div class="input-group">
                                <label>Valor Realización $</label>
                                <input type="number" id="valor_realizacion" class="w-full p-2 border rounded bg-gray-100 font-bold" 
                                    placeholder="Calculado automáticamente" value="${valRealizacion}" readonly>
                            </div>
                        </div>

                        <div class="input-group mb-4">
                            <label>Perito Valuador / Responsable *</label>
                            <input type="text" id="perito_nombre" class="w-full p-2 border rounded" 
                                placeholder="Ejemplo: Juan Pérez" value="${perito}" required>
                        </div>

                        <div class="input-group mb-4">
                            <label>Número Registro Perito</label>
                            <input type="text" id="numero_registro_perito" class="w-full p-2 border rounded" 
                                placeholder="Ejemplo: REG-12345" value="${data ? (data.numero_registro_perito || '') : ''}">
                        </div>

                        <div class="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
                            <p class="text-xs font-bold text-yellow-800 mb-2"><i class="fas fa-shield-alt"></i> Póliza de Seguro (Opcional)</p>
                            <div class="grid grid-cols-2 gap-2">
                                <input type="text" id="aseguradora" class="w-full p-1 border rounded text-sm" 
                                    placeholder="Ejemplo: Aseguradora XYZ" value="${aseguradora}">
                                <input type="text" id="numero_poliza" class="w-full p-1 border rounded text-sm" 
                                    placeholder="Ejemplo: POL-12345" value="${poliza}">
                                <div class="col-span-2">
                                    <label class="text-xs">Vencimiento:</label>
                                    <input type="date" id="fecha_vencimiento_seguro" class="w-full p-1 border rounded text-sm" 
                                        value="${venceSeguro}">
                                </div>
                            </div>
                        </div>
                        
                        <h4 class="font-bold text-gray-700 border-b pb-2 mb-2">3. Estado Legal</h4>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="input-group">
                                <label>Folio RUG</label>
                                <input type="text" id="folio_rug" class="w-full p-2 border rounded" 
                                    placeholder="Ejemplo: FOL-12345" value="${data ? (data.folio_rug || '') : ''}">
                            </div>
                            <div class="input-group">
                                <label>Fecha Inscripción RUG</label>
                                <input type="date" id="fecha_inscripcion_rug" class="w-full p-2 border rounded" 
                                    value="${data ? (data.fecha_inscripcion_rug || '') : ''}">
                            </div>
                            <div class="input-group">
                                <label>Estado</label>
                                <select id="estado" class="w-full p-2 border rounded">
                                    <option value="tramite" ${data && data.estado === 'tramite' ? 'selected' : ''}>En Trámite</option>
                                    <option value="vigente" ${data && data.estado === 'vigente' ? 'selected' : ''}>Vigente</option>
                                    <option value="deteriorada" ${data && data.estado === 'deteriorada' ? 'selected' : ''}>Deteriorada</option>
                                    <option value="liberada" ${data && data.estado === 'liberada' ? 'selected' : ''}>Liberada</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 pt-4 border-t mt-4">
                    <button type="submit" class="btn btn-success flex-1"><i class="fas fa-save mr-2"></i> Guardar Garantía</button>
                    <button type="button" onclick="loadGarantiasModule()" class="btn btn-secondary flex-1">Cancelar</button>
                </div>
            </form>
        </div>
    `;
}

function updateCalculosGarantia() {
    const comercial = parseFloat(document.getElementById('valor_comercial').value) || 0;
    // Regla de negocio: Castigo del 30% (Valor * 0.70)
    const realizacion = comercial * 0.70;
    document.getElementById('valor_realizacion').value = realizacion.toFixed(2);
}

async function editGarantia(id) {
    // Simulación: Buscamos en la lista local para editar rápido
    const garantia = allGarantiasData.find(g => g.id == id);
    if (garantia) showGarantiaForm(garantia);
}

async function saveGarantia(event) {
    event.preventDefault();

    const garantiaId = document.getElementById('garantiaId').value;

    // Validaciones de campos
    const clienteId = document.getElementById('cliente_id').value;
    if (!clienteId) {
        showModal('Error', 'Debe seleccionar un cliente.');
        return;
    }

    const tipoGarantiaId = document.getElementById('tipo_garantia_id').value;
    if (!tipoGarantiaId) {
        showModal('Error', 'Debe seleccionar un tipo de garantía.');
        return;
    }

    const descripcionBien = document.getElementById('descripcion_bien').value.trim();
    if (!descripcionBien) {
        showModal('Error', 'Debe ingresar una descripción del bien.');
        return;
    }

    const valorComercial = parseFloat(document.getElementById('valor_comercial').value);
    if (isNaN(valorComercial) || valorComercial <= 0) {
        showModal('Error', 'El valor comercial debe ser un número mayor a 0.');
        return;
    }

    const peritoNombre = document.getElementById('perito_nombre').value.trim();
    if (!peritoNombre) {
        showModal('Error', 'Debe ingresar el nombre del perito valuador.');
        return;
    }

    const numeroRegistroPerito = document.getElementById('numero_registro_perito').value.trim();
    if (numeroRegistroPerito && !/^[a-zA-Z0-9-]+$/.test(numeroRegistroPerito)) {
        showModal('Error', 'El número de registro del perito contiene caracteres inválidos.');
        return;
    }

    const aseguradora = document.getElementById('aseguradora').value.trim();
    const numeroPoliza = document.getElementById('numero_poliza').value.trim();
    const fechaVencimientoSeguro = document.getElementById('fecha_vencimiento_seguro').value;

    if (aseguradora || numeroPoliza || fechaVencimientoSeguro) {
        if (!aseguradora) {
            showModal('Error', 'Debe ingresar el nombre de la aseguradora.');
            return;
        }
        if (!numeroPoliza) {
            showModal('Error', 'Debe ingresar el número de póliza.');
            return;
        }
        if (!fechaVencimientoSeguro) {
            showModal('Error', 'Debe ingresar la fecha de vencimiento del seguro.');
            return;
        }
    }

    const folioRug = document.getElementById('folio_rug').value.trim();
    if (folioRug && !/^[a-zA-Z0-9-]+$/.test(folioRug)) {
        showModal('Error', 'El folio RUG contiene caracteres inválidos.');
        return;
    }

    const fechaInscripcionRug = document.getElementById('fecha_inscripcion_rug').value;
    if (fechaInscripcionRug && isNaN(Date.parse(fechaInscripcionRug))) {
        showModal('Error', 'La fecha de inscripción RUG no es válida.');
        return;
    }

    const estado = document.getElementById('estado').value;
    if (!['tramite', 'vigente', 'deteriorada', 'liberada'].includes(estado)) {
        showModal('Error', 'El estado seleccionado no es válido.');
        return;
    }

    // Construcción del payload
    const payload = {
        cliente_id: clienteId,
        tipo_garantia_id: tipoGarantiaId,
        descripcion_bien: descripcionBien,
        ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim(),
        valor_comercial: valorComercial,
        valor_realizacion: document.getElementById('valor_realizacion').value,
        perito_nombre: peritoNombre,
        aseguradora: aseguradora,
        numero_poliza: numeroPoliza,
        fecha_vencimiento_seguro: fechaVencimientoSeguro,
        folio_rug: folioRug,
        fecha_inscripcion_rug: fechaInscripcionRug,
        numero_registro_perito: numeroRegistroPerito,
        estado: estado
    };

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        let result;
        if (garantiaId) {
            payload.id = garantiaId;
            result = await apiCall('garantias.php', 'PUT', payload);
        } else {
            result = await apiCall('garantias.php', 'POST', payload);
        }

        if (result && result.success) {
            showModal('Éxito', garantiaId ? 'Garantía actualizada.' : 'Garantía creada.');
            loadGarantiasModule();
        } else {
            showModal('Error', result?.error || 'Error al guardar.');
        }
    } catch (error) {
        console.error(error);
    } finally {
        btn.disabled = false;
    }
}

async function deleteGarantia(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta garantía? Esta acción también eliminará los avalúos y seguros relacionados.')) return;

    try {
        const response = await apiCall(`garantias.php?id=${id}`, 'DELETE');
        if (response && response.success) {
            showModal('Éxito', 'Garantía eliminada correctamente.');
            loadGarantiasModule();
        } else {
            showModal('Error', response?.error || 'No se pudo eliminar la garantía.');
        }
    } catch (error) {
        console.error(error);
        showModal('Error', 'Error al intentar eliminar la garantía.');
    }
}