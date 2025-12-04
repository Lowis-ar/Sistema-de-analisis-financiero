// js/modulos/cobros_naturales.js
let prestamosNaturales = [];

// Función principal para cargar el módulo
async function loadCobrosNaturales() {
    showLoading();
    try {
        const data = await apiCall('cobros_naturales.php?action=list');
        prestamosNaturales = Array.isArray(data) ? data : [];
        renderVistaCobrosNaturales(prestamosNaturales);
    } catch (e) {
        console.error('Error:', e);
        showError('Error al cargar préstamos');
    }
}

// Renderizar la vista principal
function renderVistaCobrosNaturales(prestamos) {
    const hoy = new Date().toISOString().split('T')[0];
    
    // Contadores para KPIs
    const totalActivos = prestamos.filter(p => p.estado !== 'pagado').length;
    const enMora = prestamos.filter(p => p.estado === 'mora').length;
    const vencenHoy = prestamos.filter(p => p.proximo_vencimiento === hoy).length;
    
    const html = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-users mr-2"></i>Cobros - Clientes Naturales
                    </h2>
                    <p class="text-sm text-gray-500">Gestión simplificada de cobros para personas</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="filtrarVencimientosHoy()" class="btn btn-secondary">
                        <i class="fas fa-calendar-day mr-2"></i>Ver Vencimientos Hoy
                    </button>
                    
                </div>
            </div>

            <!-- KPIs -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <div class="text-sm text-blue-600 font-bold">TOTAL ACTIVOS</div>
                    <div class="text-3xl font-bold text-blue-700">${totalActivos}</div>
                </div>
                <div class="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <div class="text-sm text-green-600 font-bold">EN NORMAL</div>
                    <div class="text-3xl font-bold text-green-700">${totalActivos - enMora}</div>
                </div>
                <div class="card bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                    <div class="text-sm text-red-600 font-bold">EN MORA</div>
                    <div class="text-3xl font-bold text-red-700">${enMora}</div>
                </div>
                <div class="card bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                    <div class="text-sm text-yellow-600 font-bold">VENCEN HOY</div>
                    <div class="text-3xl font-bold text-yellow-700">${vencenHoy}</div>
                </div>
            </div>

            <!-- Tabla de préstamos -->
            <div class="card overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-3 text-left">Cliente</th>
                                <th class="p-3 text-left">Préstamo</th>
                                <th class="p-3 text-right">Saldo</th>
                                <th class="p-3 text-center">Estado</th>
                                <th class="p-3 text-center">Próximo Venc.</th>
                                <th class="p-3 text-center">Días Mora</th>
                                <th class="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${prestamos.length > 0 ? 
                                prestamos.map(p => renderFilaPrestamo(p, hoy)).join('') :
                                `<tr><td colspan="7" class="p-4 text-center text-gray-400">No hay préstamos activos</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

// Renderizar una fila de préstamo
function renderFilaPrestamo(p, hoy) {
    const venceHoy = p.proximo_vencimiento === hoy;
    const estaEnMora = p.estado === 'mora';
    
    return `
        <tr class="hover:bg-gray-50 ${venceHoy ? 'bg-yellow-50' : ''} ${estaEnMora ? 'bg-red-50' : ''}">
            <td class="p-3">
                <div class="font-bold text-gray-800">${p.cliente_nombre}</div>
                <div class="text-xs text-gray-500">${p.dui || 'Sin DUI'} | ${p.telefono || 'Sin teléfono'}</div>
            </td>
            <td class="p-3">
                <div class="font-mono text-sm font-bold">${p.codigo_contrato || 'P-' + p.id}</div>
                <div class="text-xs text-gray-500">
                    ${formatCurrency(p.monto)} / ${p.plazo}m @ ${p.tasa}%
                </div>
            </td>
            <td class="p-3 text-right">
                <div class="font-bold text-lg ${p.saldo_actual > 0 ? 'text-blue-700' : 'text-green-600'}">
                    ${formatCurrency(p.saldo_actual)}
                </div>
                <div class="text-xs text-gray-500">Cuota: ${formatCurrency(p.cuota)}</div>
            </td>
            <td class="p-3 text-center">
                ${renderBadgeEstado(p.estado, p.dias_mora)}
            </td>
            <td class="p-3 text-center ${venceHoy ? 'font-bold text-red-600 animate-pulse' : ''}">
                ${p.proximo_vencimiento ? formatDate(p.proximo_vencimiento) : 'N/A'}
                ${venceHoy ? '<br><span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">HOY</span>' : ''}
            </td>
            <td class="p-3 text-center">
                ${p.dias_mora > 0 ? 
                    `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                        <i class="fas fa-exclamation-triangle mr-1"></i>${p.dias_mora}
                    </span>` : 
                    '<span class="text-green-600">-</span>'
                }
            </td>
            <td class="p-3 text-center">
                <div class="flex justify-center space-x-2">
                    <button onclick="registrarPagoNatural(${p.id})" 
                            class="btn btn-success btn-sm">
                        <i class="fas fa-hand-holding-usd mr-1"></i>Cobrar
                    </button>
                    <button onclick="verHistorial(${p.id})" 
                            class="btn btn-outline btn-sm">
                        <i class="fas fa-history mr-1"></i>Historial
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Registrar un pago
async function registrarPagoNatural(prestamoId) {
    showLoading();
    
    try {
        const data = await apiCall(`cobros_naturales.php?action=datos&id=${prestamoId}`);
        const prestamo = data.prestamo;
        const calculos = data.calculos;
        const hoy = new Date().toISOString().split('T')[0];
        
        const html = `
            <div class="max-w-2xl mx-auto">
                <div class="card border-t-4 border-green-600 shadow-lg">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-6 pb-4 border-b">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">
                                <i class="fas fa-money-bill-wave mr-2"></i>Registrar Pago
                            </h3>
                            <p class="text-sm text-gray-500">Cliente: ${prestamo.cliente_nombre}</p>
                            <p class="text-xs text-gray-400">Préstamo: ${prestamo.codigo_contrato || 'P-' + prestamo.id}</p>
                        </div>
                        <button onclick="loadCobrosNaturales()" class="btn btn-secondary">
                            <i class="fas fa-times mr-1"></i>Cancelar
                        </button>
                    </div>
                    
                    <!-- Información resumida -->
                    <div class="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                        <div>
                            <p class="text-sm text-gray-500">Saldo Actual</p>
                            <p class="text-2xl font-bold text-blue-700">${formatCurrency(prestamo.saldo_actual)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Cuota Mensual</p>
                            <p class="text-xl font-bold text-green-600">${formatCurrency(prestamo.cuota)}</p>
                        </div>
                        ${prestamo.dias_mora > 0 ? `
                        <div class="col-span-2 p-3 bg-red-50 border border-red-200 rounded">
                            <div class="flex items-center">
                                <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                                <div>
                                    <p class="font-bold text-red-700">${prestamo.dias_mora} días en mora</p>
                                    <p class="text-sm text-red-600">Mora acumulada: ${formatCurrency(calculos.mora_acumulada)}</p>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Formulario -->
                    <form id="formPagoNatural" onsubmit="procesarPagoNatural(event, ${prestamoId})">
                        <input type="hidden" id="prestamo_id" value="${prestamoId}">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Fecha de Pago *</label>
                                <input type="date" id="fecha_pago" 
                                       value="${hoy}"
                                       class="w-full p-2 border rounded" required>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">Monto a Pagar ($) *</label>
                                <input type="number" id="monto_pago" 
                                       step="0.01"
                                       min="0.01"
                                       max="${prestamo.saldo_actual + calculos.mora_acumulada + calculos.interes_mensual}"
                                       value="${calculos.cuota_recomendada.toFixed(2)}"
                                       class="w-full p-3 border-2 border-green-500 rounded text-xl font-bold"
                                       required
                                       oninput="actualizarSimulacion(${prestamo.saldo_actual}, ${calculos.interes_mensual}, ${calculos.mora_acumulada})">
                                <div class="text-xs text-gray-500 mt-1">
                                    <span id="texto_recomendado">Recomendado: ${formatCurrency(calculos.cuota_recomendada)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Simulación de distribución -->
                        <div id="simulacion_distribucion" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 class="text-sm font-bold text-blue-800 mb-3">Distribución del Pago</h4>
                            <div class="grid grid-cols-3 gap-3">
                                <div class="text-center p-2 bg-white rounded shadow">
                                    <div class="text-xs text-gray-500">Mora</div>
                                    <div id="sim_mora" class="text-lg font-bold text-red-600">$0.00</div>
                                </div>
                                <div class="text-center p-2 bg-white rounded shadow">
                                    <div class="text-xs text-gray-500">Interés</div>
                                    <div id="sim_interes" class="text-lg font-bold text-blue-600">$0.00</div>
                                </div>
                                <div class="text-center p-2 bg-white rounded shadow border-l-4 border-green-500">
                                    <div class="text-xs text-gray-500">Capital</div>
                                    <div id="sim_capital" class="text-2xl font-bold text-green-700">$0.00</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Opciones adicionales -->
                        <div class="mb-6">
                            <label class="block text-sm font-bold text-gray-700 mb-1">Forma de Pago</label>
                            <select id="forma_pago" class="w-full p-2 border rounded">
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia Bancaria</option>
                                <option value="cheque">Cheque</option>
                                <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                            </select>
                        </div>
                        
                        <div class="mb-6">
                            <label class="block text-sm font-bold text-gray-700 mb-1">Observaciones (Opcional)</label>
                            <textarea id="observaciones" rows="3" 
                                      class="w-full p-2 border rounded"
                                      placeholder="Ej: Pago parcial, pago adelantado, etc."></textarea>
                        </div>
                        
                        <!-- Botones -->
                        <div class="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onclick="loadCobrosNaturales()" class="btn btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-success px-6">
                                <i class="fas fa-check-circle mr-2"></i>Registrar Pago
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
        
        // Inicializar simulación
        actualizarSimulacion(
            prestamo.saldo_actual,
            calculos.interes_mensual,
            calculos.mora_acumulada
        );
        
    } catch (e) {
        console.error('Error:', e);
        showError('No se pudieron cargar los datos del préstamo');
    }
}

// Actualizar simulación de distribución
function actualizarSimulacion(saldo, interesMensual, moraAcumulada) {
    const montoInput = document.getElementById('monto_pago');
    if (!montoInput) return;
    
    const monto = parseFloat(montoInput.value) || 0;
    
    // Distribución según orden: 1. Mora, 2. Interés, 3. Capital
    let abonoMora = Math.min(monto, moraAcumulada);
    let restante = monto - abonoMora;
    
    let abonoInteres = Math.min(restante, interesMensual);
    restante = restante - abonoInteres;
    
    let abonoCapital = restante;
    
    // Actualizar UI
    document.getElementById('sim_mora').textContent = formatCurrency(abonoMora);
    document.getElementById('sim_interes').textContent = formatCurrency(abonoInteres);
    document.getElementById('sim_capital').textContent = formatCurrency(abonoCapital);
    
    // Validar si cubre mínimo (interés + mora)
    const minimoRequerido = interesMensual + moraAcumulada;
    const simCapital = document.getElementById('sim_capital');
    
    if (monto > 0 && monto < minimoRequerido) {
        simCapital.classList.add('text-red-600');
        simCapital.classList.remove('text-green-700');
        document.getElementById('texto_recomendado').innerHTML = 
            `<span class="text-red-600">Monto mínimo requerido: ${formatCurrency(minimoRequerido)}</span>`;
    } else {
        simCapital.classList.remove('text-red-600');
        simCapital.classList.add('text-green-700');
    }
}

// Procesar el pago
async function procesarPagoNatural(e, prestamoId) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Validar monto
    const monto = parseFloat(document.getElementById('monto_pago').value);
    if (monto <= 0) {
        showError('El monto debe ser mayor a cero');
        return;
    }
    
    // Preparar datos
    const payload = {
        prestamo_id: prestamoId,
        monto: monto,
        fecha_pago: document.getElementById('fecha_pago').value,
        forma_pago: document.getElementById('forma_pago').value,
        observaciones: document.getElementById('observaciones').value
    };
    
    // Deshabilitar botón y mostrar carga
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
    
    try {
        const resultado = await apiCall('cobros_naturales.php?action=registrar', 'POST', payload);
        
        if (resultado.success) {
            showSuccess(`Pago registrado exitosamente<br>Recibo: ${resultado.recibo}`);
            loadCobrosNaturales();
        } else {
            showError(resultado.error || 'Error al procesar el pago');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al procesar el pago');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Ver historial de pagos
async function verHistorial(prestamoId) {
    try {
        const data = await apiCall(`cobros_naturales.php?action=historial&id=${prestamoId}`);
        
        const html = `
            <div class="max-w-4xl mx-auto">
                <div class="card">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">
                            <i class="fas fa-history mr-2"></i>Historial de Pagos
                        </h3>
                        <button onclick="loadCobrosNaturales()" class="btn btn-secondary">
                            <i class="fas fa-arrow-left mr-1"></i>Volver
                        </button>
                    </div>
                    
                    ${data.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="p-3">Fecha</th>
                                        <th class="p-3 text-right">Total</th>
                                        <th class="p-3 text-right">Capital</th>
                                        <th class="p-3 text-right">Interés</th>
                                        <th class="p-3 text-right">Mora</th>
                                        <th class="p-3 text-right">Saldo Restante</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.map(pago => `
                                        <tr class="border-b hover:bg-gray-50">
                                            <td class="p-3">${pago.fecha_formateada || pago.fecha}</td>
                                            <td class="p-3 text-right font-bold">${formatCurrency(pago.total_pagado)}</td>
                                            <td class="p-3 text-right text-green-600">${formatCurrency(pago.capital)}</td>
                                            <td class="p-3 text-right text-blue-600">${formatCurrency(pago.interes)}</td>
                                            <td class="p-3 text-right ${pago.mora > 0 ? 'text-red-600' : 'text-gray-400'}">
                                                ${formatCurrency(pago.mora)}
                                            </td>
                                            <td class="p-3 text-right font-mono">${formatCurrency(pago.saldo_restante)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="text-center py-8">
                            <i class="fas fa-receipt text-4xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500">No hay pagos registrados para este préstamo</p>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        document.getElementById('main-content').innerHTML = html;
    } catch (e) {
        console.error('Error:', e);
        showError('Error al cargar el historial');
    }
}

// Funciones auxiliares
function filtrarVencimientosHoy() {
    showLoading();
    apiCall('cobros_naturales.php?action=hoy')
        .then(data => {
            prestamosNaturales = Array.isArray(data) ? data : [];
            renderVistaCobrosNaturales(prestamosNaturales);
            
            if (data.length === 0) {
                showInfo('No hay préstamos que venzan hoy');
            }
        })
        .catch(e => {
            console.error('Error:', e);
            showError('Error al filtrar');
        });
}

function renderBadgeEstado(estado, diasMora) {
    const estados = {
        'normal': { color: 'green', icon: 'check-circle', text: 'Normal' },
        'mora': { color: 'red', icon: 'exclamation-triangle', text: `Mora (${diasMora}d)` },
        'atrasado': { color: 'orange', icon: 'clock', text: 'Atrasado' },
        'pagado': { color: 'blue', icon: 'check-double', text: 'Pagado' },
        'cancelado': { color: 'gray', icon: 'ban', text: 'Cancelado' }
    };
    
    const info = estados[estado] || { color: 'gray', icon: 'question-circle', text: estado };
    
    return `
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-${info.color}-100 text-${info.color}-700">
            <i class="fas fa-${info.icon} mr-1"></i>${info.text}
        </span>
    `;
}

function exportarReporte() {
    // Aquí puedes implementar la exportación a Excel o PDF
    showInfo('Funcionalidad de exportación en desarrollo');
}

// Funciones de utilidad
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-SV');
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('es-SV', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function showLoading() {
    document.getElementById('main-content').innerHTML = `
        <div class="flex justify-center items-center h-64">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-3"></i>
                <p class="text-gray-600">Cargando...</p>
            </div>
        </div>
    `;
}

function showSuccess(message) {
    // Implementa tu función de mostrar mensajes de éxito
    alert('Éxito: ' + message);
}

function showError(message) {
    // Implementa tu función de mostrar errores
    alert('Error: ' + message);
}

function showInfo(message) {
    // Implementa tu función de mostrar información
    alert('Info: ' + message);
}

// ============================================
// FUNCIONES PARA REPORTE DE PAGOS
// ============================================

async function verReportePagos(prestamoId) {
    showLoading();
    
    try {
        const data = await apiCall(`cobros_naturales.php?action=reporte_pagos&id=${prestamoId}`);
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        renderReportePagos(data);
    } catch (e) {
        console.error('Error:', e);
        showError('Error al generar el reporte');
    }
}

function renderReportePagos(data) {
    const { prestamo, pagos_realizados, pagos_futuros, resumen } = data;
    const hoy = new Date().toISOString().split('T')[0];
    
    const html = `
        <div class="max-w-6xl mx-auto">
            <div class="card">
                <!-- Header del reporte -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-file-invoice-dollar mr-2"></i>Reporte de Pagos
                        </h2>
                        <div class="text-sm text-gray-600 mt-1">
                            <span class="font-semibold">Cliente:</span> ${prestamo.cliente_nombre} | 
                            <span class="font-semibold">Préstamo:</span> ${prestamo.codigo_contrato || 'P-' + prestamo.id}
                        </div>
                    </div>
                    <div class="flex gap-2 mt-4 md:mt-0">
                        <button onclick="imprimirReporte()" class="btn btn-secondary">
                            <i class="fas fa-print mr-2"></i>Imprimir
                        </button>
                        <button onclick="loadCobrosNaturales()" class="btn btn-outline">
                            <i class="fas fa-arrow-left mr-2"></i>Volver
                        </button>
                    </div>
                </div>
                
                <!-- Resumen del crédito -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="text-center">
                        <div class="text-sm text-blue-600 font-bold">Monto Original</div>
                        <div class="text-2xl font-bold text-blue-800">${formatCurrency(prestamo.monto)}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-sm text-green-600 font-bold">Saldo Actual</div>
                        <div class="text-2xl font-bold ${resumen.saldo_actual > 0 ? 'text-green-700' : 'text-green-500'}">
                            ${formatCurrency(resumen.saldo_actual)}
                        </div>
                    </div>
                    <div class="text-center">
                        <div class="text-sm text-purple-600 font-bold">Cuota Mensual</div>
                        <div class="text-2xl font-bold text-purple-700">${formatCurrency(prestamo.cuota)}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-sm text-orange-600 font-bold">Cuotas Pendientes</div>
                        <div class="text-2xl font-bold text-orange-700">${resumen.cuotas_pendientes}</div>
                    </div>
                </div>
                
                <!-- Resumen financiero -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="card bg-green-50 border-green-200">
                        <h4 class="text-sm font-bold text-green-700 mb-2">TOTAL PAGADO</h4>
                        <div class="text-2xl font-bold text-green-800">${formatCurrency(resumen.total_pagado)}</div>
                        <div class="text-xs text-green-600 mt-1">
                            Capital: ${formatCurrency(resumen.total_capital_pagado)} | 
                            Interés: ${formatCurrency(resumen.total_interes_pagado)}
                        </div>
                    </div>
                    <div class="card bg-blue-50 border-blue-200">
                        <h4 class="text-sm font-bold text-blue-700 mb-2">POR PAGAR</h4>
                        <div class="text-2xl font-bold text-blue-800">${formatCurrency(resumen.total_a_pagar_futuro)}</div>
                        <div class="text-xs text-blue-600 mt-1">
                            Capital: ${formatCurrency(resumen.saldo_actual)} | 
                            Interés: ${formatCurrency(resumen.total_interes_futuro)}
                        </div>
                    </div>
                    <div class="card bg-purple-50 border-purple-200">
                        <h4 class="text-sm font-bold text-purple-700 mb-2">TOTAL CRÉDITO</h4>
                        <div class="text-2xl font-bold text-purple-800">
                            ${formatCurrency(resumen.total_pagado + resumen.total_a_pagar_futuro)}
                        </div>
                        <div class="text-xs text-purple-600 mt-1">
                            Interés total: ${formatCurrency(resumen.total_interes_pagado + resumen.total_interes_futuro)}
                        </div>
                    </div>
                </div>
                
                <!-- Tabla de pagos futuros -->
                <div class="mb-8">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                        <i class="fas fa-calendar-alt mr-2"></i>Pagos Futuros (Proyección)
                    </h3>
                    
                    ${pagos_futuros.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="p-3 text-center"># Cuota</th>
                                        <th class="p-3 text-center">Fecha Vencimiento</th>
                                        <th class="p-3 text-right">Capital</th>
                                        <th class="p-3 text-right">Interés</th>
                                        <th class="p-3 text-right">Cuota Total</th>
                                        <th class="p-3 text-right">Saldo Después</th>
                                        <th class="p-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pagos_futuros.map((cuota, index) => {
                                        const esProxima = cuota.fecha_vencimiento === hoy;
                                        const esVencida = cuota.fecha_vencimiento < hoy;
                                        
                                        return `
                                        <tr class="border-b hover:bg-gray-50 ${esProxima ? 'bg-yellow-50' : ''} ${esVencida ? 'bg-red-50' : ''}">
                                            <td class="p-3 text-center font-mono font-bold">${cuota.numero_cuota}</td>
                                            <td class="p-3 text-center ${esProxima ? 'font-bold text-red-600' : ''}">
                                                ${cuota.fecha_formateada}
                                                ${esProxima ? '<span class="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">HOY</span>' : ''}
                                            </td>
                                            <td class="p-3 text-right text-green-700">${formatCurrency(cuota.capital)}</td>
                                            <td class="p-3 text-right text-blue-700">${formatCurrency(cuota.interes)}</td>
                                            <td class="p-3 text-right font-bold">${formatCurrency(cuota.cuota_total)}</td>
                                            <td class="p-3 text-right text-gray-600">${formatCurrency(cuota.saldo_despues)}</td>
                                            <td class="p-3 text-center">
                                                ${renderEstadoCuota(cuota.estado, cuota.fecha_vencimiento)}
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="text-center py-8 bg-gray-50 rounded-lg">
                            <i class="fas fa-check-circle text-4xl text-green-400 mb-3"></i>
                            <p class="text-gray-600">¡Crédito completamente pagado!</p>
                        </div>
                    `}
                </div>
                
                <!-- Historial de pagos realizados -->
                <div class="mb-8">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                        <i class="fas fa-history mr-2"></i>Historial de Pagos Realizados
                    </h3>
                    
                    ${pagos_realizados.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="p-3">Fecha Pago</th>
                                        <th class="p-3 text-right">Total</th>
                                        <th class="p-3 text-right">Capital</th>
                                        <th class="p-3 text-right">Interés</th>
                                        <th class="p-3 text-right">Mora</th>
                                        <th class="p-3 text-right">Saldo Restante</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pagos_realizados.map(pago => `
                                        <tr class="border-b hover:bg-gray-50">
                                            <td class="p-3">${pago.fecha_formateada}</td>
                                            <td class="p-3 text-right font-bold">${formatCurrency(pago.total_pagado)}</td>
                                            <td class="p-3 text-right text-green-600">${formatCurrency(pago.capital)}</td>
                                            <td class="p-3 text-right text-blue-600">${formatCurrency(pago.interes)}</td>
                                            <td class="p-3 text-right ${pago.mora > 0 ? 'text-red-600' : 'text-gray-400'}">
                                                ${formatCurrency(pago.mora)}
                                            </td>
                                            <td class="p-3 text-right font-mono">${formatCurrency(pago.saldo_restante)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="text-center py-8 bg-gray-50 rounded-lg">
                            <i class="fas fa-clock text-4xl text-gray-400 mb-3"></i>
                            <p class="text-gray-600">No hay pagos registrados aún</p>
                        </div>
                    `}
                </div>
                
                <!-- Información del préstamo -->
                <div class="bg-gray-50 p-4 rounded-lg border">
                    <h4 class="text-sm font-bold text-gray-700 mb-3">Detalles del Préstamo</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Tasa de interés:</span>
                            <span class="font-bold ml-2">${prestamo.tasa}% anual</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Plazo original:</span>
                            <span class="font-bold ml-2">${prestamo.plazo} meses</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Fecha otorgamiento:</span>
                            <span class="font-bold ml-2">${formatDate(prestamo.fecha_otorgamiento)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Último pago:</span>
                            <span class="font-bold ml-2">${prestamo.ultimo_pago ? formatDate(prestamo.ultimo_pago) : 'Nunca'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Botones de acción -->
                <div class="mt-8 pt-6 border-t flex justify-between">
                    <div>
                        <span class="text-sm text-gray-500">Generado el: ${new Date().toLocaleDateString('es-SV')}</span>
                    </div>
                    <div class="flex gap-2">
                        ${resumen.saldo_actual > 0 ? `
                            <button onclick="registrarPagoNatural(${prestamo.id})" class="btn btn-success">
                                <i class="fas fa-hand-holding-usd mr-2"></i>Registrar Pago
                            </button>
                        ` : ''}
                        <button onclick="exportarReportePDF(${prestamo.id})" class="btn btn-primary">
                            <i class="fas fa-download mr-2"></i>Exportar PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

function renderEstadoCuota(estado, fechaVencimiento) {
    const hoy = new Date().toISOString().split('T')[0];
    
    if (fechaVencimiento < hoy) {
        return `<span class="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">
            <i class="fas fa-exclamation-triangle mr-1"></i>VENCIDA
        </span>`;
    }
    
    if (fechaVencimiento === hoy) {
        return `<span class="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800">
            <i class="fas fa-clock mr-1"></i>HOY
        </span>`;
    }
    
    return `<span class="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
        <i class="fas fa-clock mr-1"></i>PENDIENTE
    </span>`;
}

function imprimirReporte() {
    window.print();
}

async function exportarReportePDF(prestamoId) {
    // Esta función puede integrarse con una librería como jsPDF o generar PDF en el servidor
    showInfo('Funcionalidad de exportación a PDF en desarrollo');
    // Por ahora, solo imprimir
    window.print();
}

// ============================================
// MODIFICACIÓN EN LA RENDERIZACIÓN DE FILAS
// ============================================

// En la función renderFilaPrestamo(), modifica las acciones para agregar el botón de reporte:
// Reemplaza esta parte:
/*
<td class="p-3 text-center">
    <div class="flex justify-center space-x-2">
        <button onclick="registrarPagoNatural(${p.id})" 
                class="btn btn-success btn-sm">
            <i class="fas fa-hand-holding-usd mr-1"></i>Cobrar
        </button>
        <button onclick="verHistorial(${p.id})" 
                class="btn btn-outline btn-sm">
            <i class="fas fa-history mr-1"></i>Historial
        </button>
    </div>
</td>
*/

// Por esto:
function renderFilaPrestamo(p, hoy) {
    const venceHoy = p.proximo_vencimiento === hoy;
    const estaEnMora = p.estado === 'mora';
    
    return `
        <tr class="hover:bg-gray-50 ${venceHoy ? 'bg-yellow-50' : ''} ${estaEnMora ? 'bg-red-50' : ''}">
            <td class="p-3">
                <div class="font-bold text-gray-800">${p.cliente_nombre}</div>
                <div class="text-xs text-gray-500">${p.dui || 'Sin DUI'} | ${p.telefono || 'Sin teléfono'}</div>
            </td>
            <td class="p-3">
                <div class="font-mono text-sm font-bold">${p.codigo_contrato || 'P-' + p.id}</div>
                <div class="text-xs text-gray-500">
                    ${formatCurrency(p.monto)} / ${p.plazo}m @ ${p.tasa}%
                </div>
            </td>
            <td class="p-3 text-right">
                <div class="font-bold text-lg ${p.saldo_actual > 0 ? 'text-blue-700' : 'text-green-600'}">
                    ${formatCurrency(p.saldo_actual)}
                </div>
                <div class="text-xs text-gray-500">Cuota: ${formatCurrency(p.cuota)}</div>
            </td>
            <td class="p-3 text-center">
                ${renderBadgeEstado(p.estado, p.dias_mora)}
            </td>
            <td class="p-3 text-center ${venceHoy ? 'font-bold text-red-600 animate-pulse' : ''}">
                ${p.proximo_vencimiento ? formatDate(p.proximo_vencimiento) : 'N/A'}
                ${venceHoy ? '<br><span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">HOY</span>' : ''}
            </td>
            <td class="p-3 text-center">
                ${p.dias_mora > 0 ? 
                    `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                        <i class="fas fa-exclamation-triangle mr-1"></i>${p.dias_mora}
                    </span>` : 
                    '<span class="text-green-600">-</span>'
                }
            </td>
            <td class="p-3 text-center">
                <div class="flex justify-center space-x-2">
                    <button onclick="registrarPagoNatural(${p.id})" 
                            class="btn btn-success btn-sm">
                        <i class="fas fa-hand-holding-usd mr-1"></i>Cobrar
                    </button>
                    <button onclick="verReportePagos(${p.id})" 
                            class="btn btn-primary btn-sm">
                        <i class="fas fa-file-alt mr-1"></i>Reporte
                    </button>
                    <button onclick="verHistorial(${p.id})" 
                            class="btn btn-outline btn-sm">
                        <i class="fas fa-history mr-1"></i>Historial
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Inicializar el módulo cuando se cargue
loadCobrosNaturales();

