let activosView = 'list';

function loadActivos() {
    showLoading();
    
    setTimeout(async () => {
        const activos = await apiCall('activos.php');
        
        if (activos && !activos.error) {
            renderActivos(activos);
        } else {
            document.getElementById('main-content').innerHTML = `
                <div class="card">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">Activos Fijos</h2>
                    <div class="text-center py-8 text-red-500">
                        <p>Error al cargar activos</p>
                    </div>
                </div>
            `;
        }
    }, 300);
}

function renderActivos(activos) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Gestión de Activos Fijos</h2>
                <button onclick="showNewActivoForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Nuevo Activo
                </button>
            </div>
            
            ${activosView === 'list' ? renderActivosList(activos) : renderNewActivoForm()}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

function renderActivosList(activos) {
    if (activos.length === 0) {
        return `
            <div class="card text-center py-12">
                <i class="fas fa-building text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay activos registrados</h3>
                <p class="text-gray-500 mb-6">Comienza registrando tu primer activo fijo</p>
                <button onclick="showNewActivoForm()" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i> Registrar Activo
                </button>
            </div>
        `;
    }
    
    const activosHTML = activos.map(activo => {
        // Calcular depreciación
        const fechaCompra = new Date(activo.fecha_compra);
        const hoy = new Date();
        const diffTime = Math.abs(hoy - fechaCompra);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const depAnual = activo.valor * activo.porcentaje_depreciacion;
        const depDiaria = depAnual / 365;
        const depreciacionAcumulada = depDiaria * diffDays;
        const valorLibros = Math.max(0, activo.valor - depreciacionAcumulada);
        
        return `
            <div class="card border-l-4 border-purple-500">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-lg">${activo.descripcion}</h3>
                        <p class="text-sm text-gray-500">${activo.codigo}</p>
                        <p class="text-xs text-gray-400">Adquirido: ${new Date(activo.fecha_compra).toLocaleDateString()}</p>
                    </div>
                    <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        ${PORCENTAJES_DEPRECIACION[activo.tipo]?.label || activo.tipo}
                    </span>
                </div>
                
                <div class="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p class="text-sm text-gray-500">Valor Original</p>
                        <p class="font-bold">${formatCurrency(activo.valor)}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Dep. Acumulada</p>
                        <p class="font-bold text-red-600">${formatCurrency(depreciacionAcumulada)}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Valor en Libros</p>
                        <p class="font-bold text-green-600">${formatCurrency(valorLibros)}</p>
                    </div>
                </div>
                
                <div class="mt-4 text-xs text-gray-500">
                    Vida útil: ${activo.vida_util} años • Depreciación: ${(activo.porcentaje_depreciacion * 100).toFixed(1)}% anual
                </div>
            </div>
        `;
    }).join('');
    
    return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${activosHTML}</div>`;
}

function showNewActivoForm() {
    activosView = 'form';
    loadActivos();
}

function renderNewActivoForm() {
    const tiposOptions = Object.entries(PORCENTAJES_DEPRECIACION).map(([key, value]) => 
        `<option value="${key}">${value.label}</option>`
    ).join('');
    
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">Nuevo Activo Fijo</h3>
                <button onclick="cancelNewActivo()" class="btn btn-secondary">
                    <i class="fas fa-times mr-2"></i> Cancelar
                </button>
            </div>
            
            <form id="formActivo" onsubmit="saveActivo(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="input-group">
                        <label for="descripcion">Descripción *</label>
                        <input type="text" id="descripcion" class="w-full p-2 border rounded" required placeholder="Ej: Edificio principal">
                    </div>
                    
                    <div class="input-group">
                        <label for="tipo">Tipo de Activo *</label>
                        <select id="tipo" class="w-full p-2 border rounded" required>
                            ${tiposOptions}
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label for="valor">Valor de Adquisición ($) *</label>
                        <input type="number" id="valor" class="w-full p-2 border rounded" required min="1" step="0.01">
                    </div>
                    
                    <div class="input-group">
                        <label for="fecha_compra">Fecha de Compra *</label>
                        <input type="date" id="fecha_compra" class="w-full p-2 border rounded" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="input-group">
                        <label for="institucion">Institución</label>
                        <input type="text" id="institucion" class="w-full p-2 border rounded" value="2322">
                    </div>
                    
                    <div class="input-group">
                        <label for="unidad">Unidad</label>
                        <input type="text" id="unidad" class="w-full p-2 border rounded" value="0001">
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-sm text-blue-800">Información de Depreciación (LISR Art. 30)</p>
                            <p id="info-depreciacion" class="text-lg font-bold text-blue-900">5% anual - 20 años</p>
                        </div>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save mr-2"></i> Registrar Activo
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
}

function cancelNewActivo() {
    activosView = 'list';
    loadActivos();
}

async function saveActivo(event) {
    event.preventDefault();
    
    const formData = {
        descripcion: document.getElementById('descripcion').value,
        tipo: document.getElementById('tipo').value,
        valor: parseFloat(document.getElementById('valor').value),
        fecha_compra: document.getElementById('fecha_compra').value,
        institucion: document.getElementById('institucion').value,
        unidad: document.getElementById('unidad').value
    };
    
    const result = await apiCall('activos.php', 'POST', formData);
    
    if (result && result.success) {
        showModal('Éxito', `${result.message}<br>Código: ${result.codigo}`);
        activosView = 'list';
        loadActivos();
    } else {
        showModal('Error', result?.error || 'Error al registrar activo');
    }
}

// Hacer funciones disponibles globalmente
window.showNewActivoForm = showNewActivoForm;
window.cancelNewActivo = cancelNewActivo;
window.saveActivo = saveActivo;