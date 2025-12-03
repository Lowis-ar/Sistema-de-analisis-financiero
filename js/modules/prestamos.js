// prestamos_unificado.js - Módulo completo para préstamos de personas naturales
// Combina prestamos_naturales.js y prestamos.js

// ==========================================
// VARIABLES GLOBALES DEL MÓDULO
// ==========================================

let prestamosNaturalesView = 'list';
let clientesNaturalesList = [];
let clientesParaFiador = [];
let clienteSeleccionado = null;
let tipoGarantiaSeleccionado = 'fiador';

// ==========================================
// CONSTANTES Y CONFIGURACIONES
// ==========================================

const TIPOS_PRESTAMO_NATURAL = [
    { id: 'personal', nombre: 'Personal' },
    { id: 'consumo', nombre: 'Consumo' },
    { id: 'vivienda', nombre: 'Vivienda' },
    { id: 'automovil', nombre: 'Automóvil' }
];

const TIPOS_GARANTIA = [
    { id: 'fiador', nombre: 'Fiador (Aval)' },
    { id: 'hipoteca', nombre: 'Hipoteca' }
];

// ==========================================
// FUNCIONES PRINCIPALES DE NAVEGACIÓN
// ==========================================

function showPrestamosNaturales() {
    prestamosNaturalesView = 'list';
    loadPrestamosNaturales();
}

async function loadPrestamosNaturales() {
    showLoading();
    
    setTimeout(async () => {
        try {
            const [prestamos, clientes] = await Promise.all([
                apiCall('prestamos.php?tipo=natural'),
                apiCall('clientes.php?tipo=natural')
            ]);
            
            if (prestamos && !prestamos.error) {
                clientesNaturalesList = clientes || [];
                renderPrestamosNaturales(prestamos);
            } else {
                document.getElementById('main-content').innerHTML = `
                    <div class="card">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-800">Préstamos - Personas Naturales</h2>
                            <button onclick="showPrestamosMenu()" class="btn btn-secondary">
                                <i class="fas fa-arrow-left mr-2"></i> Volver
                            </button>
                        </div>
                        <div class="text-center py-8 text-red-500">
                            <p>Error al cargar préstamos</p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }, 300);
}

async function loadPrestamosModule() {
    console.log('📝 Cargando módulo de préstamos...');
    
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-3xl font-bold text-gray-800">Otorgamiento de Créditos</h2>
                <button onclick="cargarListaPrestamos()" class="btn btn-secondary">
                    <i class="fas fa-list mr-2"></i> Ver Créditos Activos
                </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Columna Izquierda: Datos del Préstamo -->
                <div class="space-y-6">
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4 text-gray-700">1. Seleccionar Cliente</h3>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Buscar Cliente Natural</label>
                            <div class="flex gap-2">
                                <input type="text" id="buscarCliente" placeholder="Nombre, Código o DUI..." 
                                       class="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       onkeyup="buscarClientesNaturales(this.value)">
                                <button onclick="buscarClientesNaturales(document.getElementById('buscarCliente').value)" 
                                        class="btn btn-primary">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                        <div id="resultadosClientes" class="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-2"></div>
                        <div id="infoCliente" class="hidden mt-4 p-4 bg-blue-50 rounded-lg">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-semibold text-gray-800" id="clienteNombre"></h4>
                                    <div class="flex gap-4 mt-2 text-sm">
                                        <span class="text-gray-600"><i class="fas fa-id-card mr-1"></i> <span id="clienteDUI"></span></span>
                                        <span class="text-gray-600"><i class="fas fa-barcode mr-1"></i> <span id="clienteCodigo"></span></span>
                                    </div>
                                    <div class="mt-2">
                                        <span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                            <i class="fas fa-chart-line mr-1"></i> Capacidad de pago: <span id="clienteCapacidad" class="font-bold"></span>
                                        </span>
                                    </div>
                                </div>
                                <button onclick="deseleccionarCliente()" class="text-red-500 hover:text-red-700">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4 text-gray-700">2. Datos del Crédito</h3>
                        <form id="formPrestamo" onsubmit="return false;">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                                    <input type="number" id="monto" min="100" step="0.01" required 
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           oninput="calcularCuotaPrestamo()" onchange="validarMonto(this)">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Plazo (meses)</label>
                                    <input type="number" id="plazo" min="1" max="360" required 
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           oninput="calcularCuotaPrestamo()">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tasa Anual (%)</label>
                                    <input type="number" id="tasa" min="0.1" max="100" step="0.01" required 
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           oninput="calcularCuotaPrestamo()">
                                </div>
                            </div>
                            
                            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <p class="text-sm text-gray-600">Cuota Mensual Estimada</p>
                                        <p id="cuotaCalculada" class="text-2xl font-bold text-blue-600">$0.00</p>
                                    </div>
                                    <div id="alertaCuota" class="hidden">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                            <i class="fas fa-exclamation-triangle mr-1"></i> Excede capacidad
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-2 text-sm text-gray-500">
                                    <p>Capacidad de pago del cliente: <span id="capacidadMaxima" class="font-semibold">$0.00</span></p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Columna Derecha: Garantías -->
                <div class="space-y-6">
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4 text-gray-700">3. Seleccionar Tipo de Garantía</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <button onclick="seleccionarTipoGarantia('fiador')" 
                                    class="p-4 border-2 rounded-lg text-center transition-all ${tipoGarantiaSeleccionado === 'fiador' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}">
                                <i class="fas fa-user-tie text-3xl mb-2 ${tipoGarantiaSeleccionado === 'fiador' ? 'text-blue-600' : 'text-gray-400'}"></i>
                                <h4 class="font-semibold">Fiador</h4>
                                <p class="text-sm text-gray-600 mt-1">Persona que avala</p>
                            </button>
                            <button onclick="seleccionarTipoGarantia('hipoteca')" 
                                    class="p-4 border-2 rounded-lg text-center transition-all ${tipoGarantiaSeleccionado === 'hipoteca' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}">
                                <i class="fas fa-home text-3xl mb-2 ${tipoGarantiaSeleccionado === 'hipoteca' ? 'text-blue-600' : 'text-gray-400'}"></i>
                                <h4 class="font-semibold">Hipoteca</h4>
                                <p class="text-sm text-gray-600 mt-1">Inmueble como garantía</p>
                            </button>
                        </div>

                        <!-- Formulario Dinámico de Garantía -->
                        <div id="formGarantia">
                            ${renderFormularioGarantia()}
                        </div>
                    </div>

                    <!-- Resumen y Botón de Otorgamiento -->
                    <div class="card bg-blue-50 border border-blue-200">
                        <h3 class="text-xl font-semibold mb-4 text-blue-800">4. Resumen y Otorgamiento</h3>
                        <div id="resumenCredito" class="space-y-3 mb-6">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Cliente:</span>
                                <span id="resumenCliente" class="font-semibold">No seleccionado</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Monto:</span>
                                <span id="resumenMonto" class="font-semibold">$0.00</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Garantía:</span>
                                <span id="resumenGarantia" class="font-semibold">No seleccionada</span>
                            </div>
                            <hr class="my-3 border-blue-200">
                            <div class="flex justify-between text-lg font-bold">
                                <span class="text-blue-800">Cuota Mensual:</span>
                                <span id="resumenCuota" class="text-blue-600">$0.00</span>
                            </div>
                        </div>
                        
                        <div class="flex gap-4">
                            <button onclick="validarYOtorgarCredito()" 
                                    class="flex-1 btn btn-success py-3">
                                <i class="fas fa-check-circle mr-2"></i> Otorgar Crédito
                            </button>
                            <button onclick="limpiarFormularioPrestamo()" 
                                    class="btn btn-secondary py-3">
                                <i class="fas fa-redo mr-2"></i> Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabla de Créditos Activos (inicialmente oculta) -->
            <div id="listaPrestamos" class="hidden">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-gray-700">Créditos Activos</h3>
                    <button onclick="mostrarFormularioNuevo()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Nuevo Crédito
                    </button>
                </div>
                <div id="tablaPrestamosContainer"></div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    inicializarEventosPrestamos();
    actualizarResumenPrestamo();
}

// ==========================================
// RENDERIZACIÓN DE VISTAS
// ==========================================

function renderPrestamosNaturales(prestamos) {
    const content = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Préstamos - Personas Naturales</h2>
                    <p class="text-gray-600 text-sm">Gestión de créditos para clientes naturales con garantías</p>
                </div>
                <div>
                    <button onclick="showPrestamosMenu()" class="btn btn-secondary mr-2">
                        <i class="fas fa-arrow-left mr-2"></i> Volver
                    </button>
                    <button onclick="showNewPrestamoNaturalForm()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i> Nuevo Préstamo
                    </button>
                </div>
            </div>
            
            ${prestamosNaturalesView === 'list' ? renderPrestamosNaturalesList(prestamos) : renderNewPrestamoNaturalForm()}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

function renderPrestamosNaturalesList(prestamos) {
    if (!prestamos || prestamos.length === 0) {
        return `
            <div class="card text-center py-12">
                <i class="fas fa-user text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay préstamos para personas naturales</h3>
                <p class="text-gray-500 mb-6">Comienza otorgando tu primer crédito</p>
                <button onclick="showNewPrestamoNaturalForm()" class="btn btn-primary">
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
                        <th class="p-3 text-left">Garantía</th>
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
                            <td class="p-3">
                                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                    ${prestamo.garantia_tipo || 'Sin garantía'}
                                </span>
                            </td>
                            <td class="p-3 text-right">${formatCurrency(prestamo.monto)}</td>
                            <td class="p-3 text-right font-bold ${prestamo.saldo_actual > 0 ? 'text-red-600' : 'text-green-600'}">
                                ${formatCurrency(prestamo.saldo_actual)}
                            </td>
                            <td class="p-3 text-center">
                                <span class="px-3 py-1 rounded-full text-sm ${prestamo.estado === 'normal' ? 'bg-green-100 text-green-800' : 
                                    prestamo.estado === 'mora' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                    ${prestamo.estado}
                                </span>
                            </td>
                            <td class="p-3 text-center space-x-2">
                                <button onclick="verDetallesPrestamo(${prestamo.id})" class="btn btn-secondary text-sm px-3 py-1">
                                    <i class="fas fa-eye mr-1"></i> Ver
                                </button>
                                <button onclick="procesarPago(${prestamo.id})" class="btn btn-primary text-sm px-3 py-1">
                                    <i class="fas fa-money-bill mr-1"></i> Pagar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="card mt-6">
            <h3 class="text-lg font-bold mb-4">Resumen de Garantías</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">Fiadores</p>
                    <p class="text-2xl font-bold text-blue-900">${prestamos.filter(p => p.garantia_tipo === 'fiador').length}</p>
                </div>
                <div class="text-center p-4 bg-purple-50 rounded-lg">
                    <p class="text-sm text-purple-800">Hipotecas</p>
                    <p class="text-2xl font-bold text-purple-900">${prestamos.filter(p => p.garantia_tipo === 'hipoteca').length}</p>
                </div>
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                    <p class="text-sm text-gray-800">Total Activos</p>
                    <p class="text-2xl font-bold text-gray-900">${prestamos.length}</p>
                </div>
            </div>
        </div>
    `;
}

function showNewPrestamoNaturalForm() {
    prestamosNaturalesView = 'form';
    loadPrestamosNaturales();
}

async function renderNewPrestamoNaturalForm() {
    // Cargar clientes para fiador/codeudor
    const clientes = await apiCall('clientes.php');
    clientesParaFiador = clientes || [];
    
    const clientesOptions = clientesParaFiador.map(cliente => 
        `<option value="${cliente.id}">${cliente.nombre} (${cliente.codigo})</option>`
    ).join('');
    
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">Nuevo Préstamo - Persona Natural</h3>
                <button onclick="cancelNewPrestamoNatural()" class="btn btn-secondary">
                    <i class="fas fa-times mr-2"></i> Cancelar
                </button>
            </div>
            
            <form id="formPrestamoNatural" onsubmit="savePrestamoNatural(event)">
                <!-- Sección 1: Datos del Préstamo -->
                <div class="mb-8 pb-6 border-b">
                    <h4 class="text-lg font-bold mb-4 text-blue-700">
                        <i class="fas fa-file-contract mr-2"></i> Datos del Préstamo
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="input-group">
                            <label for="cliente_id_natural">Cliente *</label>
                            <select id="cliente_id_natural" class="w-full p-2 border rounded" required 
                                    onchange="validarClienteNatural()">
                                <option value="">Seleccionar cliente natural</option>
                                ${clientesOptions}
                            </select>
                            <div id="error-cliente" class="error hidden"></div>
                        </div>
                        
                        <div class="input-group">
                            <label for="tipo_natural">Tipo de Crédito *</label>
                            <select id="tipo_natural" class="w-full p-2 border rounded" required>
                                ${TIPOS_PRESTAMO_NATURAL.map(tipo => 
                                    `<option value="${tipo.id}">${tipo.nombre}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="input-group">
                            <label for="monto_natural">Monto ($) *</label>
                            <input type="number" id="monto_natural" class="w-full p-2 border rounded" 
                                   required min="1" step="0.01" onchange="calcularCuotaNatural()"
                                   oninput="validarMonto(this)">
                            <div id="error-monto" class="error hidden"></div>
                        </div>
                        
                        <div class="input-group">
                            <label for="plazo_natural">Plazo (meses) *</label>
                            <input type="number" id="plazo_natural" class="w-full p-2 border rounded" 
                                   required min="1" max="360" value="12" onchange="calcularCuotaNatural()">
                        </div>
                        
                        <div class="input-group">
                            <label for="tasa_natural">Tasa de interés anual (%) *</label>
                            <input type="number" id="tasa_natural" class="w-full p-2 border rounded" 
                                   required min="0.1" step="0.1" value="12" onchange="calcularCuotaNatural()">
                        </div>
                        
                        <div class="input-group">
                            <label for="fecha_desembolso">Fecha de Desembolso *</label>
                            <input type="date" id="fecha_desembolso" class="w-full p-2 border rounded" 
                                   required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    
                    <!-- Cálculo de cuota -->
                    <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-sm text-blue-800">Cuota Mensual Estimada</p>
                                <p id="cuota-estimada-natural" class="text-2xl font-bold text-blue-900">$0.00</p>
                                <p class="text-xs text-blue-600">Total a pagar: <span id="total-pagar">$0.00</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Sección 2: Tipo de Garantía -->
                <div class="mb-8 pb-6 border-b">
                    <h4 class="text-lg font-bold mb-4 text-purple-700">
                        <i class="fas fa-shield-alt mr-2"></i> Tipo de Garantía
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        ${TIPOS_GARANTIA.map(garantia => `
                            <div class="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 garantia-option" 
                                 data-tipo="${garantia.id}" onclick="seleccionarGarantia('${garantia.id}')">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                        <i class="fas fa-${garantia.id === 'hipoteca' ? 'home' : 'user'} text-purple-600"></i>
                                    </div>
                                    <div>
                                        <h5 class="font-bold">${garantia.nombre}</h5>
                                        <p class="text-xs text-gray-600">${garantia.id === 'fiador' ? 'Persona que avala' : 'Garantía inmobiliaria'}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Contenedor dinámico para formulario de garantía -->
                    <div id="formulario-garantia"></div>
                </div>
                
                <!-- Botones de acción -->
                <div class="flex justify-between items-center pt-6 border-t">
                    <button type="button" onclick="cancelNewPrestamoNatural()" class="btn btn-secondary">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-success" id="btn-submit-prestamo">
                        <i class="fas fa-file-contract mr-2"></i> Otorgar Préstamo
                    </button>
                </div>
            </form>
        </div>
    `;
}

// ==========================================
// RENDERIZACIÓN DE FORMULARIOS DE GARANTÍA
// ==========================================

function renderFormularioGarantia() {
    if (tipoGarantiaSeleccionado === 'fiador') {
        return `
            <h4 class="font-semibold mb-4 text-gray-700">Datos del Fiador</h4>
            <form id="formFiador" onsubmit="return false;">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                        <input type="text" id="fiadorNombre" required 
                               class="w-full border border-gray-300 rounded-md px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">DUI *</label>
                        <input type="text" id="fiadorDUI" required 
                               class="w-full border border-gray-300 rounded-md px-3 py-2"
                               onblur="validarDUI(this.value, 'fiador')">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                        <input type="text" id="fiadorNIT" 
                               class="w-full border border-gray-300 rounded-md px-3 py-2"
                               oninput="this.value = window.formatNIT ? window.formatNIT(this.value) : this.value">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input type="text" id="fiadorTelefono" 
                               class="w-full border border-gray-300 rounded-md px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ingresos Mensuales ($) *</label>
                        <input type="number" id="fiadorIngresos" min="0" step="0.01" required 
                               class="w-full border border-gray-300 rounded-md px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Egresos Mensuales ($)</label>
                        <input type="number" id="fiadorEgresos" min="0" step="0.01" 
                               class="w-full border border-gray-300 rounded-md px-3 py-2">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <textarea id="fiadorDireccion" rows="2" 
                                  class="w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Parentesco con Cliente</label>
                        <select id="fiadorParentesco" class="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="">Seleccionar</option>
                            <option value="Padre/Madre">Padre/Madre</option>
                            <option value="Hermano/a">Hermano/a</option>
                            <option value="Cónyuge">Cónyuge</option>
                            <option value="Amigo/a">Amigo/a</option>
                            <option value="Socio">Socio</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                </div>
            </form>
        `;
    } else {
        return `
            <h4 class="font-semibold mb-4 text-gray-700">Datos de la Hipoteca</h4>
            <form id="formHipoteca" onsubmit="return false;">
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Número de Matrícula (CNR) *</label>
                        <input type="text" id="hipotecaMatricula" required 
                               class="w-full border border-gray-300 rounded-md px-3 py-2"
                               placeholder="Ej: 123-456-789">
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Inmueble *</label>
                            <select id="hipotecaTipo" required class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="">Seleccionar</option>
                                <option value="Casa">Casa</option>
                                <option value="Apartamento">Apartamento</option>
                                <option value="Terreno">Terreno</option>
                                <option value="Local Comercial">Local Comercial</option>
                                <option value="Edificio">Edificio</option>
                                <option value="Finca">Finca</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Grado de Hipoteca *</label>
                            <select id="hipotecaGrado" required class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="1er_grado">1er Grado (Primer Cobro)</option>
                                <option value="2do_grado">2do Grado (Segundo Cobro)</option>
                                <option value="3er_grado">3er Grado</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Área Terreno (m²)</label>
                            <input type="number" id="hipotecaAreaTerreno" min="0" step="0.01"
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Área Construcción (m²)</label>
                            <input type="number" id="hipotecaAreaConstruccion" min="0" step="0.01"
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación del Inmueble *</label>
                        <textarea id="hipotecaUbicacion" rows="2" required 
                                  class="w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción del Inmueble *</label>
                        <textarea id="hipotecaDescripcion" rows="3" required 
                                  class="w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Valor del Avalúo ($) *</label>
                            <input type="number" id="hipotecaValor" min="0" step="0.01" required 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha del Avalúo *</label>
                            <input type="date" id="hipotecaFechaAvaluo" required 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">% Cobertura</label>
                            <div class="flex items-center">
                                <input type="range" id="hipotecaCobertura" min="50" max="100" step="1" value="70"
                                       class="flex-1 mr-3 range-slider"
                                       oninput="document.getElementById('coberturaValue').textContent = this.value + '%'; calcularMaximoPrestamo()">
                                <span id="coberturaValue" class="font-bold text-blue-600 w-12">70%</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Porcentaje del avalúo que cubre el préstamo</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Máximo a prestar</label>
                            <div id="maximoPrestar" class="text-lg font-bold text-green-600">$0.00</div>
                        </div>
                    </div>
                </div>
            </form>
        `;
    }
}

function renderFormFiador() {
    const clientesOptions = clientesParaFiador.map(cliente => 
        `<option value="${cliente.id}">${cliente.nombre} (${cliente.codigo}) - DUI: ${cliente.dui || 'No registrado'}</option>`
    ).join('');
    
    const content = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h5 class="font-bold text-blue-800 mb-4">Datos del Fiador (Aval)</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="input-group">
                    <label for="fiador_cliente_id">Seleccionar Fiador *</label>
                    <select id="fiador_cliente_id" class="w-full p-2 border rounded" required>
                        <option value="">Seleccionar cliente como fiador</option>
                        ${clientesOptions}
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="fiador_parentesco">Parentesco *</label>
                    <select id="fiador_parentesco" class="w-full p-2 border rounded" required>
                        <option value="">Seleccionar parentesco</option>
                        <option value="familiar">Familiar</option>
                        <option value="amigo">Amigo</option>
                        <option value="colega">Colega</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                
                <div class="input-group md:col-span-2">
                    <label for="fiador_observaciones">Observaciones</label>
                    <textarea id="fiador_observaciones" class="w-full p-2 border rounded" rows="2"></textarea>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('formulario-garantia').innerHTML = content;
}

function renderFormHipoteca() {
    const content = `
        <div class="bg-purple-50 p-4 rounded-lg">
            <h5 class="font-bold text-purple-800 mb-4">Datos de la Hipoteca</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="input-group">
                    <label for="hipoteca_matricula">Número de Matrícula (CNR) *</label>
                    <input type="text" id="hipoteca_matricula" class="w-full p-2 border rounded" 
                           required pattern="[A-Z0-9\-]+" title="Número de matrícula del CNR">
                </div>
                
                <div class="input-group">
                    <label for="hipoteca_grado">Grado de Hipoteca *</label>
                    <select id="hipoteca_grado" class="w-full p-2 border rounded" required>
                        <option value="1er_grado">1er Grado</option>
                        <option value="2do_grado">2do Grado</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="hipoteca_valor_avaluo">Valor del Avalúo ($) *</label>
                    <input type="number" id="hipoteca_valor_avaluo" class="w-full p-2 border rounded" 
                           required min="1" step="0.01" oninput="validarValorAvaluo()">
                    <div id="error-avaluo" class="error hidden"></div>
                </div>
                
                <div class="input-group">
                    <label for="hipoteca_fecha_avaluo">Fecha del Avalúo *</label>
                    <input type="date" id="hipoteca_fecha_avaluo" class="w-full p-2 border rounded" 
                           required onchange="calcularProximoAvaluo()">
                </div>
                
                <div class="input-group md:col-span-2">
                    <label for="hipoteca_descripcion">Descripción del Inmueble *</label>
                    <textarea id="hipoteca_descripcion" class="w-full p-2 border rounded" rows="3" required></textarea>
                </div>
                
                <div class="input-group md:col-span-2">
                    <label for="hipoteca_ubicacion">Ubicación del Inmueble *</label>
                    <textarea id="hipoteca_ubicacion" class="w-full p-2 border rounded" rows="2" required></textarea>
                </div>
                
                <div class="md:col-span-2 p-3 bg-purple-100 rounded-lg">
                    <div class="flex items-center">
                        <i class="fas fa-calendar-alt text-purple-600 mr-2"></i>
                        <div>
                            <p class="text-sm font-medium text-purple-800">Próximo avalúo recomendado:</p>
                            <p id="proximo-avaluo" class="text-lg font-bold text-purple-900">--/--/----</p>
                            <p class="text-xs text-purple-600">(Superintendencia recomienda cada 3 años)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('formulario-garantia').innerHTML = content;
}

// ==========================================
// FUNCIONES DE CÁLCULO
// ==========================================

function calcularCuotaPrestamo() {
    const monto = parseFloat(document.getElementById('monto')?.value) || 0;
    const plazo = parseInt(document.getElementById('plazo')?.value) || 0;
    const tasa = parseFloat(document.getElementById('tasa')?.value) || 0;
    
    if (monto && plazo && tasa) {
        const cuota = calcularCuota(monto, tasa, plazo);
        
        document.getElementById('cuotaCalculada').textContent = formatCurrency(cuota);
        
        const capacidad = clienteSeleccionado ? parseFloat(clienteSeleccionado.capacidad_pago) : 0;
        const alertaCuota = document.getElementById('alertaCuota');
        
        if (cuota > capacidad && capacidad > 0) {
            if (alertaCuota) alertaCuota.classList.remove('hidden');
        } else {
            if (alertaCuota) alertaCuota.classList.add('hidden');
        }
        
        actualizarResumenPrestamo();
    }
}

function calcularCuotaNatural() {
    const monto = parseFloat(document.getElementById('monto_natural')?.value || 0);
    const tasa = parseFloat(document.getElementById('tasa_natural')?.value || 0);
    const plazo = parseInt(document.getElementById('plazo_natural')?.value || 12);
    
    if (monto > 0 && tasa > 0 && plazo > 0) {
        const cuota = calcularCuota(monto, tasa, plazo);
        
        const cuotaElement = document.getElementById('cuota-estimada-natural');
        const totalElement = document.getElementById('total-pagar');
        
        if (cuotaElement) {
            cuotaElement.textContent = formatCurrency(cuota);
        }
        if (totalElement) {
            totalElement.textContent = formatCurrency(cuota * plazo);
        }
    }
}

function calcularCuota(monto, tasaAnual, plazoMeses) {
    const tasaMensual = (tasaAnual / 100) / 12;
    
    if (tasaMensual === 0) {
        return monto / plazoMeses;
    }
    
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    return (monto * tasaMensual * factor) / (factor - 1);
}

function calcularMaximoPrestamo() {
    const valor = parseFloat(document.getElementById('hipotecaValor')?.value) || 0;
    const cobertura = parseInt(document.getElementById('hipotecaCobertura')?.value) || 70;
    
    const maximo = valor * (cobertura / 100);
    const maximoPrestar = document.getElementById('maximoPrestar');
    if (maximoPrestar) {
        maximoPrestar.textContent = formatCurrency(maximo);
    }
}

function calcularProximoAvaluo() {
    const fechaAvaluo = document.getElementById('hipoteca_fecha_avaluo')?.value;
    if (fechaAvaluo) {
        const fecha = new Date(fechaAvaluo);
        fecha.setFullYear(fecha.getFullYear() + 3);
        
        const proximoElement = document.getElementById('proximo-avaluo');
        if (proximoElement) {
            proximoElement.textContent = fecha.toISOString().split('T')[0];
        }
    }
}

// ==========================================
// FUNCIONES DE VALIDACIÓN
// ==========================================

function validarMonto(input) {
    const monto = parseFloat(input.value);
    const errorElement = input.id === 'monto_natural' ? document.getElementById('error-monto') : null;
    
    if (monto < 100) {
        if (errorElement) {
            errorElement.textContent = 'El monto mínimo es $100';
            errorElement.classList.remove('hidden');
        }
        input.classList.add('border-red-500');
        return false;
    } else if (monto > 100000) {
        if (errorElement) {
            errorElement.textContent = 'El monto máximo es $100,000';
            errorElement.classList.remove('hidden');
        }
        input.classList.add('border-red-500');
        return false;
    } else {
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        input.classList.remove('border-red-500');
        return true;
    }
}

function validarClienteNatural() {
    const clienteId = document.getElementById('cliente_id_natural').value;
    const errorElement = document.getElementById('error-cliente');
    
    if (!clienteId) {
        errorElement.textContent = 'Seleccione un cliente';
        errorElement.classList.remove('hidden');
        return false;
    } else {
        errorElement.classList.add('hidden');
        return true;
    }
}

function validarValorAvaluo() {
    const montoPrestamo = parseFloat(document.getElementById('monto_natural')?.value || 0);
    const valorAvaluo = parseFloat(document.getElementById('hipoteca_valor_avaluo')?.value || 0);
    const errorElement = document.getElementById('error-avaluo');
    
    if (valorAvaluo > 0 && montoPrestamo > 0) {
        const porcentaje = (montoPrestamo / valorAvaluo) * 100;
        
        if (porcentaje > 70) {
            errorElement.textContent = `Advertencia: El préstamo representa el ${porcentaje.toFixed(1)}% del avalúo (Recomendado máximo 70%)`;
            errorElement.classList.remove('hidden');
            return false;
        } else {
            errorElement.classList.add('hidden');
            return true;
        }
    }
    return true;
}

function validarDUI(dui, tipo) {
    const validators = window.VALIDATORS || {
        dui: (val) => /^\d{8}-\d{1}$/.test(val)
    };
    
    if (!validators.dui(dui)) {
        if (window.showNotification) {
            window.showNotification('Formato de DUI inválido. Use: 00000000-0', 'error');
        }
        if (tipo === 'fiador') {
            const fiadorDUI = document.getElementById('fiadorDUI');
            if (fiadorDUI) fiadorDUI.focus();
        }
        return false;
    }
    return true;
}

// ==========================================
// FUNCIONES DE CLIENTES
// ==========================================

async function buscarClientesNaturales(termino) {
    if (!termino || termino.length < 2) {
        const resultadosClientes = document.getElementById('resultadosClientes');
        if (resultadosClientes) {
            resultadosClientes.innerHTML = `
                <p class="text-gray-500 text-center py-4">Ingrese al menos 2 caracteres</p>
            `;
        }
        return;
    }
    
    try {
        const response = await apiCall(`clientes.php?buscar=${encodeURIComponent(termino)}&tipo=natural`);
        
        if (response.error) {
            const resultadosClientes = document.getElementById('resultadosClientes');
            if (resultadosClientes) {
                resultadosClientes.innerHTML = `
                    <p class="text-red-500 text-center py-4">${response.error}</p>
                `;
            }
            return;
        }
        
        if (response.length === 0) {
            const resultadosClientes = document.getElementById('resultadosClientes');
            if (resultadosClientes) {
                resultadosClientes.innerHTML = `
                    <p class="text-gray-500 text-center py-4">No se encontraron clientes</p>
                `;
            }
            return;
        }
        
        const resultadosHTML = response.map(cliente => `
            <div class="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors" 
                 onclick="seleccionarCliente(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">
                <div class="flex justify-between items-center">
                    <div>
                        <h5 class="font-medium text-gray-800">${cliente.nombre}</h5>
                        <div class="flex gap-3 text-sm text-gray-600 mt-1">
                            <span><i class="fas fa-barcode"></i> ${cliente.codigo}</span>
                            ${cliente.dui ? `<span><i class="fas fa-id-card"></i> ${cliente.dui}</span>` : ''}
                        </div>
                    </div>
                    <span class="text-sm font-semibold ${cliente.calificacion === 'A' ? 'text-green-600' : cliente.calificacion === 'B' ? 'text-yellow-600' : 'text-red-600'}">
                        ${cliente.calificacion}
                    </span>
                </div>
                <div class="mt-2 text-sm">
                    <span class="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        <i class="fas fa-chart-line mr-1"></i> Capacidad: ${formatCurrency(parseFloat(cliente.capacidad_pago))}
                    </span>
                </div>
            </div>
        `).join('');
        
        const resultadosClientes = document.getElementById('resultadosClientes');
        if (resultadosClientes) {
            resultadosClientes.innerHTML = resultadosHTML;
        }
    } catch (error) {
        console.error('Error buscando clientes:', error);
        showNotification('Error al buscar clientes', 'error');
    }
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    
    const infoCliente = document.getElementById('infoCliente');
    if (infoCliente) infoCliente.classList.remove('hidden');
    
    const clienteNombre = document.getElementById('clienteNombre');
    if (clienteNombre) clienteNombre.textContent = cliente.nombre;
    
    const clienteCodigo = document.getElementById('clienteCodigo');
    if (clienteCodigo) clienteCodigo.textContent = cliente.codigo;
    
    const clienteDUI = document.getElementById('clienteDUI');
    if (clienteDUI && cliente.dui) clienteDUI.textContent = cliente.dui;
    
    const clienteCapacidad = document.getElementById('clienteCapacidad');
    if (clienteCapacidad) clienteCapacidad.textContent = formatCurrency(cliente.capacidad_pago);
    
    const resultadosClientes = document.getElementById('resultadosClientes');
    if (resultadosClientes) resultadosClientes.innerHTML = '';
    
    const buscarCliente = document.getElementById('buscarCliente');
    if (buscarCliente) buscarCliente.value = '';
    
    const capacidadMaxima = document.getElementById('capacidadMaxima');
    if (capacidadMaxima) capacidadMaxima.textContent = formatCurrency(cliente.capacidad_pago);
    
    calcularCuotaPrestamo();
    actualizarResumenPrestamo();
}

function deseleccionarCliente() {
    clienteSeleccionado = null;
    const infoCliente = document.getElementById('infoCliente');
    if (infoCliente) infoCliente.classList.add('hidden');
    
    const capacidadMaxima = document.getElementById('capacidadMaxima');
    if (capacidadMaxima) capacidadMaxima.textContent = '$0.00';
    
    actualizarResumenPrestamo();
}

// ==========================================
// FUNCIONES DE GARANTÍAS
// ==========================================

function seleccionarGarantia(tipo) {
    document.querySelectorAll('.garantia-option').forEach(opt => {
        opt.classList.remove('border-blue-500', 'bg-blue-50');
    });
    
    const selected = document.querySelector(`[data-tipo="${tipo}"]`);
    selected.classList.add('border-blue-500', 'bg-blue-50');
    
    const contenedor = document.getElementById('formulario-garantia');
    
    switch(tipo) {
        case 'fiador':
            renderFormFiador();
            break;
        case 'hipoteca':
            renderFormHipoteca();
            break;
    }
}

function seleccionarTipoGarantia(tipo) {
    tipoGarantiaSeleccionado = tipo;
    const formGarantia = document.getElementById('formGarantia');
    if (formGarantia) {
        formGarantia.innerHTML = renderFormularioGarantia();
        inicializarEventosPrestamos();
        calcularMaximoPrestamo();
        actualizarResumenPrestamo();
    }
}

// ==========================================
// FUNCIONES DE GUARDADO
// ==========================================

async function savePrestamoNatural(event) {
    event.preventDefault();
    
    if (!validarClienteNatural() || !validarMonto(document.getElementById('monto_natural'))) {
        return;
    }
    
    const prestamoData = {
        cliente_id: document.getElementById('cliente_id_natural').value,
        tipo: document.getElementById('tipo_natural').value,
        monto: parseFloat(document.getElementById('monto_natural').value),
        plazo: parseInt(document.getElementById('plazo_natural').value),
        tasa: parseFloat(document.getElementById('tasa_natural').value),
        fecha_desembolso: document.getElementById('fecha_desembolso').value
    };
    
    const garantiaSeleccionada = document.querySelector('.garantia-option.border-blue-500');
    if (!garantiaSeleccionada) {
        showModal('Error', 'Debe seleccionar un tipo de garantía');
        return;
    }
    
    const tipoGarantia = garantiaSeleccionada.dataset.tipo;
    prestamoData.tipo_garantia = tipoGarantia;
    
    switch(tipoGarantia) {
        case 'fiador':
            prestamoData.garantia_fiador = {
                cliente_id: document.getElementById('fiador_cliente_id').value,
                parentesco: document.getElementById('fiador_parentesco').value,
                observaciones: document.getElementById('fiador_observaciones').value
            };
            break;
            
        case 'hipoteca':
            if (!validarValorAvaluo()) {
                showModal('Advertencia', 'El valor del avalúo es menor al recomendado. ¿Desea continuar?');
            }
            
            prestamoData.garantia_hipoteca = {
                matricula: document.getElementById('hipoteca_matricula').value,
                grado: document.getElementById('hipoteca_grado').value,
                valor_avaluo: parseFloat(document.getElementById('hipoteca_valor_avaluo').value),
                fecha_avaluo: document.getElementById('hipoteca_fecha_avaluo').value,
                descripcion: document.getElementById('hipoteca_descripcion').value,
                ubicacion: document.getElementById('hipoteca_ubicacion').value
            };
            break;
    }
    
    const submitBtn = document.getElementById('btn-submit-prestamo');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
    
    try {
        const result = await apiCall('prestamos_naturales.php', 'POST', prestamoData);
        
        if (result && result.success) {
            showModal('Éxito', `${result.message}<br>Cuota mensual: ${formatCurrency(result.cuota)}`);
            prestamosNaturalesView = 'list';
            loadPrestamosNaturales();
        } else {
            showModal('Error', result?.error || 'Error al crear préstamo');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-file-contract mr-2"></i> Otorgar Préstamo';
        }
    } catch (error) {
        showModal('Error', 'Error en la conexión: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-file-contract mr-2"></i> Otorgar Préstamo';
    }
}

async function validarYOtorgarCredito() {
    if (!clienteSeleccionado) {
        showNotification('Debe seleccionar un cliente', 'error');
        const buscarCliente = document.getElementById('buscarCliente');
        if (buscarCliente) buscarCliente.focus();
        return;
    }
    
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const plazo = parseInt(document.getElementById('plazo').value) || 0;
    const tasa = parseFloat(document.getElementById('tasa').value) || 0;
    
    if (monto <= 0 || plazo <= 0 || tasa <= 0) {
        showNotification('Complete todos los datos del crédito', 'error');
        return;
    }
    
    const capacidad = parseFloat(clienteSeleccionado.capacidad_pago);
    const cuota = calcularCuota(monto, tasa, plazo);
    
    if (cuota > capacidad) {
        showNotification(`La cuota (${formatCurrency(cuota)}) excede la capacidad de pago del cliente (${formatCurrency(capacidad)})`, 'error');
        return;
    }
    
    let datosGarantia = null;
    if (tipoGarantiaSeleccionado === 'fiador') {
        datosGarantia = validarFiador();
        if (!datosGarantia) return;
    } else {
        datosGarantia = validarHipotecaForm();
        if (!datosGarantia) return;
    }
    
    const mensajeConfirmacion = `¿Confirmar otorgamiento de crédito por ${formatCurrency(monto)} a ${clienteSeleccionado.nombre}?`;
    if (!confirm(mensajeConfirmacion)) {
        return;
    }
    
    const datosCredito = {
        cliente_id: clienteSeleccionado.id,
        monto: monto,
        plazo: plazo,
        tasa: tasa,
        cuota: cuota,
        tipo_garantia: tipoGarantiaSeleccionado,
        garantia: datosGarantia
    };
    
    try {
        showLoading();
        
        const response = await apiCall('prestamos.php', 'POST', datosCredito);
        
        if (response.success) {
            showNotification('¡Crédito otorgado exitosamente!', 'success');
            limpiarFormularioPrestamo();
            cargarListaPrestamos();
        } else {
            showNotification(response.error || 'Error al otorgar el crédito', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión con el servidor', 'error');
    }
}

function validarFiador() {
    const nombre = document.getElementById('fiadorNombre')?.value.trim() || '';
    const dui = document.getElementById('fiadorDUI')?.value.trim() || '';
    const ingresos = parseFloat(document.getElementById('fiadorIngresos')?.value) || 0;
    
    if (!nombre || !dui || ingresos <= 0) {
        showNotification('Complete los datos requeridos del fiador', 'error');
        return null;
    }
    
    if (!validarDUI(dui, 'fiador')) {
        return null;
    }
    
    return {
        tipo: 'fiador',
        nombre_completo: nombre,
        dui: dui,
        nit: document.getElementById('fiadorNIT')?.value.trim() || '',
        telefono: document.getElementById('fiadorTelefono')?.value.trim() || '',
        ingresos_mensuales: ingresos,
        egresos_mensuales: parseFloat(document.getElementById('fiadorEgresos')?.value) || 0,
        direccion: document.getElementById('fiadorDireccion')?.value.trim() || '',
        parentesco_cliente: document.getElementById('fiadorParentesco')?.value || ''
    };
}

function validarHipotecaForm() {
    const matricula = document.getElementById('hipotecaMatricula')?.value.trim() || '';
    const tipo = document.getElementById('hipotecaTipo')?.value || '';
    const grado = document.getElementById('hipotecaGrado')?.value || '';
    const ubicacion = document.getElementById('hipotecaUbicacion')?.value.trim() || '';
    const descripcion = document.getElementById('hipotecaDescripcion')?.value.trim() || '';
    const valor = parseFloat(document.getElementById('hipotecaValor')?.value) || 0;
    const fechaAvaluo = document.getElementById('hipotecaFechaAvaluo')?.value || '';
    
    if (!matricula || !tipo || !grado || !ubicacion || !descripcion || valor <= 0 || !fechaAvaluo) {
        showNotification('Complete todos los datos requeridos de la hipoteca', 'error');
        return null;
    }
    
    const hoy = new Date();
    const fechaAvaluoDate = new Date(fechaAvaluo);
    if (fechaAvaluoDate > hoy) {
        showNotification('La fecha del avalúo no puede ser futura', 'error');
        return null;
    }
    
    const tresAnosAtras = new Date();
    tresAnosAtras.setFullYear(tresAnosAtras.getFullYear() - 3);
    if (fechaAvaluoDate < tresAnosAtras) {
        if (!confirm('¡ATENCIÓN! El avalúo tiene más de 3 años. ¿Desea continuar?')) {
            return null;
        }
    }
    
    return {
        tipo: 'hipoteca',
        numero_matricula_cnr: matricula,
        tipo_inmueble: tipo,
        grado_hipoteca: grado,
        ubicacion_inmueble: ubicacion,
        descripcion_inmueble: descripcion,
        area_terreno: parseFloat(document.getElementById('hipotecaAreaTerreno')?.value) || null,
        area_construccion: parseFloat(document.getElementById('hipotecaAreaConstruccion')?.value) || null,
        valor_avaluo: valor,
        fecha_avaluo: fechaAvaluo,
        porcentaje_cobertura: parseInt(document.getElementById('hipotecaCobertura')?.value) || 70
    };
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function inicializarEventosPrestamos() {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('hipotecaFechaAvaluo');
    if (fechaInput) fechaInput.value = hoy;
    
    const valorAvaluoInput = document.getElementById('hipotecaValor');
    const coberturaInput = document.getElementById('hipotecaCobertura');
    
    if (valorAvaluoInput) {
        valorAvaluoInput.addEventListener('input', calcularMaximoPrestamo);
    }
    if (coberturaInput) {
        coberturaInput.addEventListener('input', calcularMaximoPrestamo);
    }
}

function actualizarResumenPrestamo() {
    const resumenCliente = document.getElementById('resumenCliente');
    if (resumenCliente) {
        resumenCliente.textContent = clienteSeleccionado ? clienteSeleccionado.nombre : 'No seleccionado';
    }
    
    const monto = parseFloat(document.getElementById('monto')?.value) || 0;
    const resumenMonto = document.getElementById('resumenMonto');
    if (resumenMonto) {
        resumenMonto.textContent = formatCurrency(monto);
    }
    
    let garantiaTexto = 'No seleccionada';
    if (tipoGarantiaSeleccionado === 'fiador') {
        const nombreFiador = document.getElementById('fiadorNombre')?.value || '';
        garantiaTexto = nombreFiador ? `Fiador: ${nombreFiador}` : 'Fiador (sin datos)';
    } else {
        const matricula = document.getElementById('hipotecaMatricula')?.value || '';
        garantiaTexto = matricula ? `Hipoteca: ${matricula}` : 'Hipoteca (sin datos)';
    }
    
    const resumenGarantia = document.getElementById('resumenGarantia');
    if (resumenGarantia) {
        resumenGarantia.textContent = garantiaTexto;
    }
    
    const cuotaElement = document.getElementById('cuotaCalculada');
    const cuotaTexto = cuotaElement ? cuotaElement.textContent : '$0.00';
    const resumenCuota = document.getElementById('resumenCuota');
    if (resumenCuota) {
        resumenCuota.textContent = cuotaTexto;
    }
}

function limpiarFormularioPrestamo() {
    clienteSeleccionado = null;
    const infoCliente = document.getElementById('infoCliente');
    if (infoCliente) infoCliente.classList.add('hidden');
    
    const buscarCliente = document.getElementById('buscarCliente');
    if (buscarCliente) buscarCliente.value = '';
    
    const resultadosClientes = document.getElementById('resultadosClientes');
    if (resultadosClientes) resultadosClientes.innerHTML = '';
    
    const formPrestamo = document.getElementById('formPrestamo');
    if (formPrestamo) formPrestamo.reset();
    
    const cuotaCalculada = document.getElementById('cuotaCalculada');
    if (cuotaCalculada) cuotaCalculada.textContent = '$0.00';
    
    const alertaCuota = document.getElementById('alertaCuota');
    if (alertaCuota) alertaCuota.classList.add('hidden');
    
    const capacidadMaxima = document.getElementById('capacidadMaxima');
    if (capacidadMaxima) capacidadMaxima.textContent = '$0.00';
    
    if (tipoGarantiaSeleccionado === 'fiador') {
        const formFiador = document.getElementById('formFiador');
        if (formFiador) formFiador.reset();
    } else {
        const formHipoteca = document.getElementById('formHipoteca');
        if (formHipoteca) formHipoteca.reset();
        
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInput = document.getElementById('hipotecaFechaAvaluo');
        if (fechaInput) fechaInput.value = hoy;
        
        const coberturaInput = document.getElementById('hipotecaCobertura');
        if (coberturaInput) coberturaInput.value = 70;
        
        const coberturaValue = document.getElementById('coberturaValue');
        if (coberturaValue) coberturaValue.textContent = '70%';
        
        const maximoPrestar = document.getElementById('maximoPrestar');
        if (maximoPrestar) maximoPrestar.textContent = '$0.00';
    }
    
    actualizarResumenPrestamo();
}

function cancelNewPrestamoNatural() {
    prestamosNaturalesView = 'list';
    loadPrestamosNaturales();
}

// ==========================================
// FUNCIONES DE LISTADO
// ==========================================

async function cargarListaPrestamos() {
    try {
        console.log('🔍 Iniciando carga de préstamos...');
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="flex justify-center items-center h-64">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p class="text-gray-600">Cargando créditos activos...</p>
                    </div>
                </div>
            `;
        }
        
        let response;
        try {
            response = await fetch('api/prestamos.php');
            console.log('📡 Status de respuesta:', response.status);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            response = await response.json();
            console.log('📦 Datos recibidos:', response);
            
        } catch (fetchError) {
            console.error('❌ Error en fetch:', fetchError);
            
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
                        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                        <h3 class="text-xl font-bold text-red-800 mb-2">Error de conexión</h3>
                        <p class="text-red-600 mb-4">No se pudo cargar la lista de créditos.</p>
                        <p class="text-gray-600 text-sm mb-6">Error: ${fetchError.message}</p>
                        <div class="space-x-4">
                            <button onclick="cargarListaPrestamos()" class="btn btn-secondary">
                                <i class="fas fa-redo mr-2"></i> Reintentar
                            </button>
                            <button onclick="loadPrestamosModule()" class="btn btn-primary">
                                <i class="fas fa-arrow-left mr-2"></i> Volver
                            </button>
                        </div>
                    </div>
                `;
            }
            return;
        }
        
        if (!response || response.length === 0) {
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-800">Créditos Activos</h2>
                            <button onclick="loadPrestamosModule()" class="btn btn-primary">
                                <i class="fas fa-arrow-left mr-2"></i> Volver
                            </button>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                            <i class="fas fa-credit-card text-blue-500 text-4xl mb-4"></i>
                            <h4 class="text-lg font-semibold text-blue-800 mb-2">No hay créditos registrados</h4>
                            <p class="text-blue-600 mb-6">Aún no se han otorgado créditos en el sistema.</p>
                            <button onclick="loadPrestamosModule()" class="btn btn-primary">
                                <i class="fas fa-plus mr-2"></i> Otorgar primer crédito
                            </button>
                        </div>
                    </div>
                `;
            }
            return;
        }
        
        if (mainContent) {
            let tablaHTML = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">Créditos Activos (${response.length})</h2>
                        <div class="space-x-2">
                            <button onclick="loadPrestamosModule()" class="btn btn-primary">
                                <i class="fas fa-plus mr-2"></i> Nuevo Crédito
                            </button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-white rounded-lg shadow p-4">
                            <p class="text-sm text-gray-600">Cartera Total</p>
                            <p class="text-2xl font-bold text-gray-900">
                                ${formatCurrency(response.reduce((sum, p) => sum + parseFloat(p.saldo_actual || 0), 0))}
                            </p>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <p class="text-sm text-gray-600">Préstamos Activos</p>
                            <p class="text-2xl font-bold text-blue-600">${response.length}</p>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <p class="text-sm text-gray-600">En Mora</p>
                            <p class="text-2xl font-bold text-red-600">
                                ${response.filter(p => p.dias_mora > 0).length}
                            </p>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
            `;
            
            response.forEach(prestamo => {
                tablaHTML += `
                    <tr>
                        <td class="px-4 py-3">
                            <div class="font-medium text-gray-900">${prestamo.cliente_nombre || 'N/A'}</div>
                            <div class="text-sm text-gray-500">${prestamo.codigo_cliente || 'N/A'}</div>
                        </td>
                        <td class="px-4 py-3">
                            <div class="font-medium">${formatCurrency(prestamo.monto)}</div>
                            <div class="text-sm text-gray-500">${prestamo.plazo} meses</div>
                        </td>
                        <td class="px-4 py-3">
                            <div class="font-bold ${parseFloat(prestamo.saldo_actual) > 0 ? 'text-gray-900' : 'text-green-600'}">
                                ${formatCurrency(prestamo.saldo_actual)}
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${prestamo.estado === 'normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${prestamo.estado || 'normal'}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            tablaHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="text-center">
                        <button onclick="loadPrestamosModule()" class="btn btn-primary">
                            <i class="fas fa-arrow-left mr-2"></i> Volver al formulario
                        </button>
                    </div>
                </div>
            `;
            
            mainContent.innerHTML = tablaHTML;
        }
        
    } catch (error) {
        console.error('❌ Error fatal:', error);
        alert('Error al cargar los créditos: ' + error.message);
        loadPrestamosModule();
    }
}

function mostrarFormularioNuevo() {
    const listaPrestamos = document.getElementById('listaPrestamos');
    if (listaPrestamos) listaPrestamos.classList.add('hidden');
    
    document.querySelectorAll('.grid').forEach(el => {
        if (el.classList.contains('grid')) {
            el.classList.remove('hidden');
        }
    });
}

// ==========================================
// FUNCIONES DE DETALLES (placeholder)
// ==========================================

function verDetallesPrestamo(id) {
    showModal('Detalles', 'Función de detalles en desarrollo');
}

function procesarPago(id) {
    showModal('Pago', `Función de pago para préstamo #${id} en desarrollo`);
}

function verGarantiasPrestamo(id) {
    showNotification(`Funcionalidad en desarrollo: Ver garantías del préstamo #${id}`, 'info');
}

function registrarPago(id) {
    showNotification(`Funcionalidad en desarrollo: Registrar pago para préstamo #${id}`, 'info');
}

// ==========================================
// FUNCIONES GLOBALES AUXILIARES
// ==========================================

function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    return new Intl.NumberFormat('es-SV', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// ==========================================
// EXPORTAR FUNCIONES AL ÁMBITO GLOBAL
// ==========================================

window.showPrestamosNaturales = showPrestamosNaturales;
window.showNewPrestamoNaturalForm = showNewPrestamoNaturalForm;
window.cancelNewPrestamoNatural = cancelNewPrestamoNatural;
window.savePrestamoNatural = savePrestamoNatural;
window.seleccionarGarantia = seleccionarGarantia;
window.validarMonto = validarMonto;
window.validarClienteNatural = validarClienteNatural;
window.validarValorAvaluo = validarValorAvaluo;
window.calcularProximoAvaluo = calcularProximoAvaluo;
window.calcularCuotaNatural = calcularCuotaNatural;
window.verDetallesPrestamo = verDetallesPrestamo;
window.procesarPago = procesarPago;

window.loadPrestamosModule = loadPrestamosModule;
window.calcularCuotaPrestamo = calcularCuotaPrestamo;
window.actualizarResumenPrestamo = actualizarResumenPrestamo;
window.limpiarFormularioPrestamo = limpiarFormularioPrestamo;
window.buscarClientesNaturales = buscarClientesNaturales;
window.seleccionarCliente = seleccionarCliente;
window.deseleccionarCliente = deseleccionarCliente;
window.seleccionarTipoGarantia = seleccionarTipoGarantia;
window.validarDUI = validarDUI;
window.validarYOtorgarCredito = validarYOtorgarCredito;
window.cargarListaPrestamos = cargarListaPrestamos;
window.mostrarFormularioNuevo = mostrarFormularioNuevo;
window.verGarantiasPrestamo = verGarantiasPrestamo;
window.registrarPago = registrarPago;

window.calcularCuota = calcularCuota;