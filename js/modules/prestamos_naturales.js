// prestamos_naturales.js - Módulo para préstamos de personas naturales

let prestamosNaturalesView = 'list';
let clientesNaturalesList = [];
let tiposGarantiaPersonal = [];
let clientesParaFiador = [];

// Constantes
const TIPOS_PRESTAMO_NATURAL = [
    { id: 'personal', nombre: 'Personal' },
    { id: 'consumo', nombre: 'Consumo' },
    { id: 'vivienda', nombre: 'Vivienda' },
    { id: 'automovil', nombre: 'Automóvil' }
];

const TIPOS_GARANTIA = [
    { id: 'fiador', nombre: 'Fiador (Aval)' },
    { id: 'codeudor', nombre: 'Codeudor Solidario' },
    { id: 'hipoteca', nombre: 'Hipoteca' }
];

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
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">Fiadores</p>
                    <p class="text-2xl font-bold text-blue-900">${prestamos.filter(p => p.garantia_tipo === 'fiador').length}</p>
                </div>
                <div class="text-center p-4 bg-green-50 rounded-lg">
                    <p class="text-sm text-green-800">Codeudores</p>
                    <p class="text-2xl font-bold text-green-900">${prestamos.filter(p => p.garantia_tipo === 'codeudor').length}</p>
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
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        ${TIPOS_GARANTIA.map(garantia => `
                            <div class="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 garantia-option" 
                                 data-tipo="${garantia.id}" onclick="seleccionarGarantia('${garantia.id}')">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                        <i class="fas fa-${garantia.id === 'hipoteca' ? 'home' : 'user'} text-purple-600"></i>
                                    </div>
                                    <div>
                                        <h5 class="font-bold">${garantia.nombre}</h5>
                                        <p class="text-xs text-gray-600">${garantia.id === 'fiador' ? 'Persona que avala' : 
                                            garantia.id === 'codeudor' ? 'Responsabilidad solidaria' : 
                                            'Garantía inmobiliaria'}</p>
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

// Validación en tiempo real
function validarMonto(input) {
    const monto = parseFloat(input.value);
    const errorElement = document.getElementById('error-monto');
    
    if (monto < 100) {
        errorElement.textContent = 'El monto mínimo es $100';
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
    } else if (monto > 100000) {
        errorElement.textContent = 'El monto máximo es $100,000';
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        return false;
    } else {
        errorElement.classList.add('hidden');
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

function seleccionarGarantia(tipo) {
    // Remover selección anterior
    document.querySelectorAll('.garantia-option').forEach(opt => {
        opt.classList.remove('border-blue-500', 'bg-blue-50');
    });
    
    // Agregar selección actual
    const selected = document.querySelector(`[data-tipo="${tipo}"]`);
    selected.classList.add('border-blue-500', 'bg-blue-50');
    
    // Renderizar formulario específico
    const contenedor = document.getElementById('formulario-garantia');
    
    switch(tipo) {
        case 'fiador':
            renderFormFiador();
            break;
        case 'codeudor':
            renderFormCodeudor();
            break;
        case 'hipoteca':
            renderFormHipoteca();
            break;
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

function renderFormCodeudor() {
    const clientesOptions = clientesParaFiador.map(cliente => 
        `<option value="${cliente.id}">${cliente.nombre} (${cliente.codigo}) - Ingresos: $${formatCurrency(cliente.ingresos || 0)}</option>`
    ).join('');
    
    const content = `
        <div class="bg-green-50 p-4 rounded-lg">
            <h5 class="font-bold text-green-800 mb-4">Datos del Codeudor Solidario</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="input-group">
                    <label for="codeudor_cliente_id">Seleccionar Codeudor *</label>
                    <select id="codeudor_cliente_id" class="w-full p-2 border rounded" required>
                        <option value="">Seleccionar cliente como codeudor</option>
                        ${clientesOptions}
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="codeudor_relacion">Relación con Deudor *</label>
                    <select id="codeudor_relacion" class="w-full p-2 border rounded" required>
                        <option value="">Seleccionar relación</option>
                        <option value="conyuge">Cónyuge</option>
                        <option value="familiar_directo">Familiar Directo</option>
                        <option value="socio">Socio Comercial</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="codeudor_porcentaje">Porcentaje de Responsabilidad *</label>
                    <select id="codeudor_porcentaje" class="w-full p-2 border rounded" required>
                        <option value="100">100% - Responsabilidad Total</option>
                        <option value="50">50% - Responsabilidad Mitad</option>
                        <option value="33">33% - Responsabilidad Un Tercio</option>
                    </select>
                </div>
                
                <div class="input-group md:col-span-2">
                    <label for="codeudor_observaciones">Observaciones</label>
                    <textarea id="codeudor_observaciones" class="w-full p-2 border rounded" rows="2"></textarea>
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

function calcularProximoAvaluo() {
    const fechaAvaluo = document.getElementById('hipoteca_fecha_avaluo')?.value;
    if (fechaAvaluo) {
        const fecha = new Date(fechaAvaluo);
        fecha.setFullYear(fecha.getFullYear() + 3); // Sumar 3 años
        
        const proximoElement = document.getElementById('proximo-avaluo');
        if (proximoElement) {
            proximoElement.textContent = fecha.toISOString().split('T')[0];
        }
    }
}

function calcularCuotaNatural() {
    const monto = parseFloat(document.getElementById('monto_natural')?.value || 0);
    const tasa = parseFloat(document.getElementById('tasa_natural')?.value || 0);
    const plazo = parseInt(document.getElementById('plazo_natural')?.value || 12);
    
    if (monto > 0 && tasa > 0 && plazo > 0) {
        const tasaMensual = (tasa / 100) / 12;
        let cuota;
        
        if (tasaMensual === 0) {
            cuota = monto / plazo;
        } else {
            const factor = Math.pow(1 + tasaMensual, plazo);
            cuota = (monto * tasaMensual * factor) / (factor - 1);
        }
        
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

function cancelNewPrestamoNatural() {
    prestamosNaturalesView = 'list';
    loadPrestamosNaturales();
}

async function savePrestamoNatural(event) {
    event.preventDefault();
    
    // Validaciones básicas
    if (!validarClienteNatural() || !validarMonto(document.getElementById('monto_natural'))) {
        return;
    }
    
    // Recolectar datos del préstamo
    const prestamoData = {
        cliente_id: document.getElementById('cliente_id_natural').value,
        tipo: document.getElementById('tipo_natural').value,
        monto: parseFloat(document.getElementById('monto_natural').value),
        plazo: parseInt(document.getElementById('plazo_natural').value),
        tasa: parseFloat(document.getElementById('tasa_natural').value),
        fecha_desembolso: document.getElementById('fecha_desembolso').value
    };
    
    // Determinar tipo de garantía seleccionada
    const garantiaSeleccionada = document.querySelector('.garantia-option.border-blue-500');
    if (!garantiaSeleccionada) {
        showModal('Error', 'Debe seleccionar un tipo de garantía');
        return;
    }
    
    const tipoGarantia = garantiaSeleccionada.dataset.tipo;
    prestamoData.tipo_garantia = tipoGarantia;
    
    // Recolectar datos específicos de la garantía
    switch(tipoGarantia) {
        case 'fiador':
            prestamoData.garantia_fiador = {
                cliente_id: document.getElementById('fiador_cliente_id').value,
                parentesco: document.getElementById('fiador_parentesco').value,
                observaciones: document.getElementById('fiador_observaciones').value
            };
            break;
            
        case 'codeudor':
            prestamoData.garantia_codeudor = {
                cliente_id: document.getElementById('codeudor_cliente_id').value,
                relacion: document.getElementById('codeudor_relacion').value,
                porcentaje: document.getElementById('codeudor_porcentaje').value,
                observaciones: document.getElementById('codeudor_observaciones').value
            };
            break;
            
        case 'hipoteca':
            if (!validarValorAvaluo()) {
                showModal('Advertencia', 'El valor del avalúo es menor al recomendado. ¿Desea continuar?');
                // Aquí podrías agregar una confirmación
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
    
    // Deshabilitar botón para evitar doble envío
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

function verDetallesPrestamo(id) {
    // Implementar vista de detalles
    showModal('Detalles', 'Función de detalles en desarrollo');
}

// Hacer funciones disponibles globalmente
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