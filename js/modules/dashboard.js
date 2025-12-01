function loadDashboard() {
    document.getElementById('main-content').innerHTML = `
        <div class="space-y-6">
            <h2 class="text-3xl font-bold text-gray-800">Dashboard - Resumen General</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="card border-l-4 border-blue-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Cartera de Créditos</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2" id="total-cartera">Cargando...</h3>
                        </div>
                        <div class="p-2 bg-blue-50 rounded-lg">
                            <i class="fas fa-chart-line text-blue-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4 text-sm text-gray-600">
                        <i class="fas fa-users mr-1"></i>
                        <span id="total-clientes">0</span> Clientes
                    </div>
                </div>
                
                <div class="card border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Cartera en Mora</p>
                            <h3 class="text-3xl font-bold text-red-600 mt-2" id="total-mora">$0.00</h3>
                        </div>
                        <div class="p-2 bg-red-50 rounded-lg">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4 text-sm text-red-600 font-medium">
                        <span id="clientes-riesgo">0</span> Créditos en mora
                    </div>
                </div>
                
                <div class="card border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 uppercase">Activos Netos (LISR)</p>
                            <h3 class="text-3xl font-bold text-gray-900 mt-2" id="total-activos">Cargando...</h3>
                        </div>
                        <div class="p-2 bg-green-50 rounded-lg">
                            <i class="fas fa-building text-green-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4 text-sm text-gray-600">
                        Valor actual depreciado
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="card">
                    <h3 class="font-bold text-lg mb-4">Acciones Rápidas</h3>
                    <div class="space-y-3">
                        <button onclick="showClientes()" class="w-full btn btn-primary text-left">
                            <i class="fas fa-user-plus mr-2"></i> Registrar Nuevo Cliente
                        </button>
                        <button onclick="showPrestamos()" class="w-full btn btn-success text-left">
                            <i class="fas fa-file-contract mr-2"></i> Otorgar Nuevo Crédito
                        </button>
                        <button onclick="showActivos()" class="w-full btn btn-primary text-left">
                            <i class="fas fa-plus-circle mr-2"></i> Registrar Nuevo Activo
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="font-bold text-lg mb-4">Estado del Sistema</h3>
                    <div class="space-y-2">
                        <div class="flex items-center text-green-600">
                            <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Base de datos: Conectada</span>
                        </div>
                        <div class="flex items-center text-green-600">
                            <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Cálculo de intereses: Activo</span>
                        </div>
                        <div class="flex items-center text-green-600">
                            <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Depreciación LISR: Activa</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos estadísticos
    setTimeout(loadDashboardData, 500);
}

async function loadDashboardData() {
    try {
        const [clientes, prestamos, activos] = await Promise.all([
            apiCall('clientes.php'),
            apiCall('prestamos.php'),
            apiCall('activos.php')
        ]);
        
        // Calcular total de cartera
        let totalCartera = 0;
        let totalMora = 0;
        let clientesRiesgo = 0;
        
        if (prestamos && !prestamos.error) {
            prestamos.forEach(p => {
                totalCartera += parseFloat(p.saldo_actual || 0);
                if (p.estado === 'mora' || p.estado === 'incobrable') {
                    totalMora += parseFloat(p.saldo_actual || 0);
                    clientesRiesgo++;
                }
            });
        }
        
        // Calcular valor de activos netos
        let totalActivos = 0;
        if (activos && !activos.error) {
            activos.forEach(activo => {
                const fechaCompra = new Date(activo.fecha_compra);
                const hoy = new Date();
                const diffTime = Math.abs(hoy - fechaCompra);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const depAnual = activo.valor * activo.porcentaje_depreciacion;
                const depDiaria = depAnual / 365;
                const depreciacionAcumulada = depDiaria * diffDays;
                const valorLibros = Math.max(0, activo.valor - depreciacionAcumulada);
                
                totalActivos += valorLibros;
            });
        }
        
        // Actualizar UI
        document.getElementById('total-cartera').textContent = formatCurrency(totalCartera);
        document.getElementById('total-mora').textContent = formatCurrency(totalMora);
        document.getElementById('total-activos').textContent = formatCurrency(totalActivos);
        document.getElementById('total-clientes').textContent = (clientes && !clientes.error) ? clientes.length : 0;
        document.getElementById('clientes-riesgo').textContent = clientesRiesgo;
        
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
    }
}