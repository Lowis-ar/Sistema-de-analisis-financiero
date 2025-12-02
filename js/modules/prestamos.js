// js/modules/prestamos.js

let clienteSeleccionado = null;
let tipoGarantiaSeleccionado = 'fiador';

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
                    ${createCard(`
                        <h3 class="text-xl font-semibold mb-4 text-gray-700">1. Seleccionar Cliente</h3>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Buscar Cliente Natural</label>
                            <div class="flex gap-2">
                                <input type="text" id="buscarCliente" placeholder="Nombre, Código o DUI..." 
                                       class="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       onkeyup="buscarClientes(this.value)">
                                <button onclick="buscarClientes(document.getElementById('buscarCliente').value)" 
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
                    `)}

                    ${createCard(`
                        <h3 class="text-xl font-semibold mb-4 text-gray-700">2. Datos del Crédito</h3>
                        <form id="formPrestamo" onsubmit="return false;">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                                    <input type="number" id="monto" min="100" step="0.01" required 
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           oninput="calcularCuota()">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Plazo (meses)</label>
                                    <input type="number" id="plazo" min="1" max="360" required 
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           oninput="calcularCuota()">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tasa Anual (%)</label>
                                    <input type="number" id="tasa" min="0.1" max="100" step="0.01" required 
                                           class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           oninput="calcularCuota()">
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
                    `)}
                </div>

                <!-- Columna Derecha: Garantías -->
                <div class="space-y-6">
                    ${createCard(`
                        <h3 class="text-xl font-semibold mb-4 text-gray-700">3. Seleccionar Tipo de Garantía</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <button onclick="seleccionarTipoGarantia('fiador')" 
                                    class="p-4 border-2 rounded-lg text-center transition-all ${tipoGarantiaSeleccionado === 'fiador' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}">
                                <i class="fas fa-user-tie text-3xl mb-2 ${tipoGarantiaSeleccionado === 'fiador' ? 'text-blue-600' : 'text-gray-400'}"></i>
                                <h4 class="font-semibold">Fiador (Aval)</h4>
                                <p class="text-sm text-gray-600 mt-1">Persona que garantiza el pago</p>
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
                    `)}

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
                            <button onclick="limpiarFormulario()" 
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
    actualizarResumen();
}

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
                               oninput="this.value = formatNIT(this.value)">
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
                                       class="flex-1 mr-3"
                                       oninput="document.getElementById('coberturaValue').textContent = this.value + '%'">
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

function inicializarEventosPrestamos() {
    // Inicializar fecha de avalúo con hoy
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('hipotecaFechaAvaluo');
    if (fechaInput) fechaInput.value = hoy;
    
    // Eventos para el cálculo de cobertura en hipoteca
    const valorAvaluoInput = document.getElementById('hipotecaValor');
    const coberturaInput = document.getElementById('hipotecaCobertura');
    
    if (valorAvaluoInput && coberturaInput) {
        valorAvaluoInput.addEventListener('input', calcularMaximoPrestamo);
        coberturaInput.addEventListener('input', calcularMaximoPrestamo);
    }
}

// 2. FUNCIONES DE CLIENTES
async function buscarClientes(termino) {
    if (!termino || termino.length < 2) {
        document.getElementById('resultadosClientes').innerHTML = `
            <p class="text-gray-500 text-center py-4">Ingrese al menos 2 caracteres</p>
        `;
        return;
    }
    
    try {
        const response = await apiCall(`clientes.php?buscar=${encodeURIComponent(termino)}&tipo=natural`);
        
        if (response.error) {
            document.getElementById('resultadosClientes').innerHTML = `
                <p class="text-red-500 text-center py-4">${response.error}</p>
            `;
            return;
        }
        
        if (response.length === 0) {
            document.getElementById('resultadosClientes').innerHTML = `
                <p class="text-gray-500 text-center py-4">No se encontraron clientes</p>
            `;
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
                        <i class="fas fa-chart-line mr-1"></i> Capacidad: $${parseFloat(cliente.capacidad_pago).toLocaleString('es-SV')}
                    </span>
                </div>
            </div>
        `).join('');
        
        document.getElementById('resultadosClientes').innerHTML = resultadosHTML;
    } catch (error) {
        console.error('Error buscando clientes:', error);
    }
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    
    // Mostrar info del cliente
    document.getElementById('infoCliente').classList.remove('hidden');
    document.getElementById('clienteNombre').textContent = cliente.nombre;
    document.getElementById('clienteCodigo').textContent = cliente.codigo;
    if (cliente.dui) document.getElementById('clienteDUI').textContent = cliente.dui;
    document.getElementById('clienteCapacidad').textContent = formatCurrency(cliente.capacidad_pago);
    
    // Ocultar resultados
    document.getElementById('resultadosClientes').innerHTML = '';
    document.getElementById('buscarCliente').value = '';
    
    // Actualizar capacidad en formulario
    document.getElementById('capacidadMaxima').textContent = formatCurrency(cliente.capacidad_pago);
    
    // Recalcular cuota
    calcularCuota();
    actualizarResumen();
}

function deseleccionarCliente() {
    clienteSeleccionado = null;
    document.getElementById('infoCliente').classList.add('hidden');
    document.getElementById('capacidadMaxima').textContent = '$0.00';
    actualizarResumen();
}

// 3. FUNCIONES DE CÁLCULO
function calcularCuota() {
    const monto = parseFloat(document.getElementById('monto')?.value) || 0;
    const plazo = parseInt(document.getElementById('plazo')?.value) || 0;
    const tasa = parseFloat(document.getElementById('tasa')?.value) || 0;
    
    if (monto && plazo && tasa) {
        const tasaMensual = (tasa / 100) / 12;
        const cuota = (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazo));
        
        document.getElementById('cuotaCalculada').textContent = formatCurrency(cuota);
        
        // Validar contra capacidad de pago
        const capacidad = clienteSeleccionado ? parseFloat(clienteSeleccionado.capacidad_pago) : 0;
        const alertaCuota = document.getElementById('alertaCuota');
        
        if (cuota > capacidad && capacidad > 0) {
            alertaCuota.classList.remove('hidden');
        } else {
            alertaCuota.classList.add('hidden');
        }
        
        actualizarResumen();
    }
}

function calcularMaximoPrestamo() {
    const valor = parseFloat(document.getElementById('hipotecaValor')?.value) || 0;
    const cobertura = parseInt(document.getElementById('hipotecaCobertura')?.value) || 70;
    
    const maximo = valor * (cobertura / 100);
    document.getElementById('maximoPrestar').textContent = formatCurrency(maximo);
}

// 4. FUNCIONES DE GARANTÍAS
function seleccionarTipoGarantia(tipo) {
    tipoGarantiaSeleccionado = tipo;
    document.getElementById('formGarantia').innerHTML = renderFormularioGarantia();
    inicializarEventosPrestamos();
    calcularMaximoPrestamo();
    actualizarResumen();
}

function validarDUI(dui, tipo) {
    if (!VALIDATORS.dui(dui)) {
        showNotification('Formato de DUI inválido. Use: 00000000-0', 'error');
        if (tipo === 'fiador') {
            document.getElementById('fiadorDUI').focus();
        }
        return false;
    }
    return true;
}

// 5. FUNCIONES DE RESUMEN Y OTORGAMIENTO
function actualizarResumen() {
    // Cliente
    document.getElementById('resumenCliente').textContent = 
        clienteSeleccionado ? clienteSeleccionado.nombre : 'No seleccionado';
    
    // Monto
    const monto = parseFloat(document.getElementById('monto')?.value) || 0;
    document.getElementById('resumenMonto').textContent = formatCurrency(monto);
    
    // Garantía
    let garantiaTexto = 'No seleccionada';
    if (tipoGarantiaSeleccionado === 'fiador') {
        const nombreFiador = document.getElementById('fiadorNombre')?.value || '';
        garantiaTexto = nombreFiador ? `Fiador: ${nombreFiador}` : 'Fiador (sin datos)';
    } else {
        const matricula = document.getElementById('hipotecaMatricula')?.value || '';
        garantiaTexto = matricula ? `Hipoteca: ${matricula}` : 'Hipoteca (sin datos)';
    }
    document.getElementById('resumenGarantia').textContent = garantiaTexto;
    
    // Cuota
    const cuotaElement = document.getElementById('cuotaCalculada');
    const cuotaTexto = cuotaElement ? cuotaElement.textContent : '$0.00';
    document.getElementById('resumenCuota').textContent = cuotaTexto;
}

async function validarYOtorgarCredito() {
    // 1. Validar cliente seleccionado
    if (!clienteSeleccionado) {
        showNotification('Debe seleccionar un cliente', 'error');
        document.getElementById('buscarCliente').focus();
        return;
    }
    
    // 2. Validar datos del crédito
    const monto = parseFloat(document.getElementById('monto').value) || 0;
    const plazo = parseInt(document.getElementById('plazo').value) || 0;
    const tasa = parseFloat(document.getElementById('tasa').value) || 0;
    
    if (monto <= 0 || plazo <= 0 || tasa <= 0) {
        showNotification('Complete todos los datos del crédito', 'error');
        return;
    }
    
    // 3. Validar cuota vs capacidad
    const capacidad = parseFloat(clienteSeleccionado.capacidad_pago);
    const tasaMensual = (tasa / 100) / 12;
    const cuota = (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazo));
    
    if (cuota > capacidad) {
        showNotification(`La cuota (${formatCurrency(cuota)}) excede la capacidad de pago del cliente (${formatCurrency(capacidad)})`, 'error');
        return;
    }
    
    // 4. Validar garantía
    let datosGarantia = null;
    if (tipoGarantiaSeleccionado === 'fiador') {
        datosGarantia = validarFiador();
        if (!datosGarantia) return;
    } else {
        datosGarantia = validarHipoteca();
        if (!datosGarantia) return;
    }
    
    // 5. Confirmar otorgamiento
    if (!confirm(`¿Confirmar otorgamiento de crédito por ${formatCurrency(monto)} a ${clienteSeleccionado.nombre}?`)) {
        return;
    }
    
    // 6. Preparar datos para enviar
    const datosCredito = {
        cliente_id: clienteSeleccionado.id,
        monto: monto,
        plazo: plazo,
        tasa: tasa,
        cuota: cuota,
        tipo_garantia: tipoGarantiaSeleccionado,
        garantia: datosGarantia
    };
    
    // 7. Enviar al servidor
    try {
        showLoading();
        const response = await apiCall('prestamos.php', 'POST', datosCredito);
        
        if (response.success) {
            showNotification('¡Crédito otorgado exitosamente!', 'success');
            limpiarFormulario();
            cargarListaPrestamos(); // Mostrar la lista actualizada
        } else {
            showNotification(response.error || 'Error al otorgar el crédito', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión con el servidor', 'error');
        console.error('Error:', error);
    }
}

function validarFiador() {
    const nombre = document.getElementById('fiadorNombre').value.trim();
    const dui = document.getElementById('fiadorDUI').value.trim();
    const ingresos = parseFloat(document.getElementById('fiadorIngresos').value) || 0;
    
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
        nit: document.getElementById('fiadorNIT').value.trim(),
        telefono: document.getElementById('fiadorTelefono').value.trim(),
        ingresos_mensuales: ingresos,
        egresos_mensuales: parseFloat(document.getElementById('fiadorEgresos').value) || 0,
        direccion: document.getElementById('fiadorDireccion').value.trim(),
        parentesco_cliente: document.getElementById('fiadorParentesco').value
    };
}

function validarHipoteca() {
    const matricula = document.getElementById('hipotecaMatricula').value.trim();
    const tipo = document.getElementById('hipotecaTipo').value;
    const grado = document.getElementById('hipotecaGrado').value;
    const ubicacion = document.getElementById('hipotecaUbicacion').value.trim();
    const descripcion = document.getElementById('hipotecaDescripcion').value.trim();
    const valor = parseFloat(document.getElementById('hipotecaValor').value) || 0;
    const fechaAvaluo = document.getElementById('hipotecaFechaAvaluo').value;
    
    if (!matricula || !tipo || !grado || !ubicacion || !descripcion || valor <= 0 || !fechaAvaluo) {
        showNotification('Complete todos los datos requeridos de la hipoteca', 'error');
        return null;
    }
    
    // Validar que el avalúo no sea futuro
    const hoy = new Date();
    const fechaAvaluoDate = new Date(fechaAvaluo);
    if (fechaAvaluoDate > hoy) {
        showNotification('La fecha del avalúo no puede ser futura', 'error');
        return null;
    }
    
    // Validar que el avalúo no tenga más de 3 años (alerta)
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
        area_terreno: parseFloat(document.getElementById('hipotecaAreaTerreno').value) || null,
        area_construccion: parseFloat(document.getElementById('hipotecaAreaConstruccion').value) || null,
        valor_avaluo: valor,
        fecha_avaluo: fechaAvaluo,
        porcentaje_cobertura: parseInt(document.getElementById('hipotecaCobertura').value) || 70
    };
}

// 6. FUNCIONES DE LISTADO
async function cargarListaPrestamos() {
    try {
        showLoading();
        const response = await apiCall('prestamos.php?listar=activos');
        
        if (response.error) {
            showNotification(response.error, 'error');
            return;
        }
        
        document.getElementById('listaPrestamos').classList.remove('hidden');
        document.querySelectorAll('.grid').forEach(el => {
            if (el.id !== 'listaPrestamos') el.classList.add('hidden');
        });
        
        const tablaHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuota</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Garantía</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${response.map(prestamo => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900">${prestamo.cliente_nombre}</div>
                                    <div class="text-sm text-gray-500">${prestamo.codigo_cliente}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-semibold text-gray-900">${formatCurrency(prestamo.monto)}</div>
                                    <div class="text-xs text-gray-500">${prestamo.plazo} meses</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-semibold text-blue-600">${formatCurrency(prestamo.cuota)}</div>
                                    <div class="text-xs text-gray-500">${prestamo.tasa}% anual</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-bold ${parseFloat(prestamo.saldo_actual) > 0 ? 'text-gray-900' : 'text-green-600'}">
                                        ${formatCurrency(prestamo.saldo_actual)}
                                    </div>
                                    ${prestamo.dias_mora > 0 ? `
                                        <div class="text-xs text-red-600">
                                            <i class="fas fa-exclamation-triangle"></i> ${prestamo.dias_mora} días en mora
                                        </div>
                                    ` : ''}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">${prestamo.tipo_garantia || 'Sin garantía'}</div>
                                    <div class="text-xs text-gray-500 truncate max-w-xs">${prestamo.descripcion_garantia || ''}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    ${getBadgeEstado(prestamo.estado || 'normal')}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button onclick="verDetallesPrestamo(${prestamo.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button onclick="registrarPago(${prestamo.id})" class="text-green-600 hover:text-green-900">
                                        <i class="fas fa-dollar-sign"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('tablaPrestamosContainer').innerHTML = tablaHTML;
        
    } catch (error) {
        console.error('Error cargando préstamos:', error);
        showNotification('Error al cargar la lista de créditos', 'error');
    }
}

function mostrarFormularioNuevo() {
    document.getElementById('listaPrestamos').classList.add('hidden');
    document.querySelectorAll('.grid').forEach(el => {
        if (el.id !== 'listaPrestamos') el.classList.remove('hidden');
    });
}

// 7. FUNCIONES AUXILIARES
function limpiarFormulario() {
    // Limpiar selección de cliente
    clienteSeleccionado = null;
    document.getElementById('infoCliente').classList.add('hidden');
    document.getElementById('buscarCliente').value = '';
    document.getElementById('resultadosClientes').innerHTML = '';
    
    // Limpiar formulario de crédito
    document.getElementById('formPrestamo').reset();
    document.getElementById('cuotaCalculada').textContent = '$0.00';
    document.getElementById('alertaCuota').classList.add('hidden');
    document.getElementById('capacidadMaxima').textContent = '$0.00';
    
    // Limpiar formulario de garantía
    if (tipoGarantiaSeleccionado === 'fiador') {
        document.getElementById('formFiador').reset();
    } else {
        document.getElementById('formHipoteca').reset();
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('hipotecaFechaAvaluo').value = hoy;
        document.getElementById('hipotecaCobertura').value = 70;
        document.getElementById('coberturaValue').textContent = '70%';
        document.getElementById('maximoPrestar').textContent = '$0.00';
    }
    
    actualizarResumen();
}

// 8. FUNCIONES FUTURAS (placeholder)
function verDetallesPrestamo(id) {
    showNotification(`Funcionalidad en desarrollo: Ver detalles del préstamo #${id}`, 'info');
}

function registrarPago(id) {
    showNotification(`Funcionalidad en desarrollo: Registrar pago para préstamo #${id}`, 'info');
}

// Hacer la función accesible globalmente
window.loadPrestamosModule = loadPrestamosModule;