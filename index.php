<?php
session_start();

// =================== VERIFICACIÓN DE SESIÓN ===================
// Si NO está logueado, redirigir al login
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    header("Location: login/login.php");
    exit();
}

// Datos del usuario para mostrar (solo en sidebar)
$nombre_usuario = htmlspecialchars($_SESSION['user_name'] ?? 'Usuario');
$email_usuario = htmlspecialchars($_SESSION['user_email'] ?? '');
$rol_usuario = htmlspecialchars($_SESSION['user_rol'] ?? 'usuario');
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FINANCIERA SV - Sistema Integral</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .card { background: white; border-radius: 0.5rem; padding: 1.5rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
        .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #e5e7eb; color: #374151; }
        .btn-secondary:hover { background: #d1d5db; }
        .btn-success { background: #059669; color: white; }
        .btn-success:hover { background: #047857; }
        .input-group { margin-bottom: 1rem; }
        .input-group label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input-group input, .input-group select, .input-group textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem; }
        .error { color: #dc2626; font-size: 0.75rem; margin-top: 0.25rem; }
        
        /* Estilos para el sidebar */
        .user-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
            border-left: 4px solid #3b82f6;
        }
        
        .user-info h3 {
            font-weight: 600;
            font-size: 0.875rem;
            color: #93c5fd;
            margin-bottom: 0.25rem;
        }
        
        .user-info p {
            font-size: 0.75rem;
            color: #cbd5e1;
        }
        
        .user-role {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            margin-top: 0.5rem;
        }
        
        .user-role.admin {
            background: #8b5cf6;
        }
        
        .user-role.usuario {
            background: #3b82f6;
        }
        
        /* Animación de carga */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }
        
        /* Estilo para separar secciones en el sidebar */
        .section-divider {
            margin: 1rem 0;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Efecto hover mejorado para botones */
        .tab-btn {
            transition: all 0.2s ease;
        }
        
        .tab-btn:hover {
            transform: translateX(3px);
        }
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <aside class="w-64 bg-slate-800 text-white hidden md:flex flex-col">
            <div class="p-6 border-b border-slate-700">
                <h1 class="text-xl font-bold">FINANCIERA SV</h1>
                <p class="text-xs text-slate-400 mt-1">Sistema Integral</p>
                
                <!-- Información del usuario SOLO EN SIDEBAR -->
                <div class="user-info fade-in">
                    <h3>Conectado como:</h3>
                    <p class="font-medium text-white"><?php echo $nombre_usuario; ?></p>
                    <p class="text-xs truncate"><?php echo $email_usuario; ?></p>
                    <div class="user-role <?php echo $rol_usuario; ?>">
                        <?php echo ucfirst($rol_usuario); ?>
                    </div>
                </div>
            </div>
            
            <nav class="flex-1 p-4 space-y-2">
                <button onclick="setActiveTab('dashboard')" class="tab-button flex items-center w-full p-3 rounded-md bg-blue-600 hover:bg-slate-700 transition-colors">
                    <i class="fas fa-chart-pie w-5 h-5 mr-3"></i> Dashboard
                </button>
                
                <button onclick="setActiveTab('clientes')" class="tab-button flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-colors">
                    <i class="fas fa-users w-5 h-5 mr-3"></i> Clientes
                </button>

                <button onclick="setActiveTab('garantias')" class="tab-button flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-colors">
                    <i class="fas fa-shield-alt w-5 h-5 mr-3"></i> Garantías
                </button>
                
                <button onclick="setActiveTab('creditos')" class="tab-button flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-colors">
                    <i class="fas fa-credit-card w-5 h-5 mr-3"></i> Créditos & Caja
                </button>
                
                <button onclick="setActiveTab('activos')" class="tab-button flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-colors">
                    <i class="fas fa-building w-5 h-5 mr-3"></i> Activos Fijos
                </button>
                
                <!-- SECCIÓN ADMINISTRACIÓN (SOLO PARA ADMINS) -->
                <?php if ($rol_usuario == 'admin'): ?>
                <div class="section-divider">
                    <p class="text-xs text-slate-400 uppercase tracking-wider mb-2">Administración</p>
                    <button onclick="showUsuarios()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-all">
                        <i class="fas fa-user-cog w-5 h-5 mr-3"></i> Gestionar Usuarios
                    </button>
                </div>
                <?php endif; ?>
            </nav>
            
            <!-- Botón de Cerrar Sesión -->
            <div class="p-4 border-t border-slate-700">
                <a href="login/logout.php" 
                   class="flex items-center justify-center w-full p-3 rounded-md hover:bg-red-900 bg-red-800 text-white transition-all hover:scale-[1.02]">
                    <i class="fas fa-sign-out-alt w-5 h-5 mr-3"></i> Cerrar Sesión
                </a>
            </div>
        </aside>

        <div class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 text-white flex justify-around p-3 z-50">
            <button onclick="setActiveTab('dashboard')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-chart-pie"></i></button>
            <button onclick="setActiveTab('clientes')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-users"></i></button>
            <button onclick="setActiveTab('garantias')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-shield-alt"></i></button>
            <button onclick="setActiveTab('creditos')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-credit-card"></i></button>
            <button onclick="setActiveTab('activos')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-building"></i></button>
        </div>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-8">
            <div id="main-content">
                <!-- CONTENIDO ORIGINAL -->
                <div class="text-center py-12">
                    <h1 class="text-3xl font-bold text-gray-800 mb-4">Bienvenido al Sistema Financiero</h1>
                    <p class="text-gray-600">Selecciona una opción del menú para comenzar</p>
                </div>
            </div>
        </main>
    </div>

    <div id="modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl transform transition-all">
            <h3 class="text-lg font-bold mb-4 text-gray-800" id="modal-title">Mensaje</h3>
            <p id="modal-message" class="text-gray-600 mb-6"></p>
            <div class="text-right">
                <button onclick="document.getElementById('modal').classList.add('hidden')" class="btn btn-primary">
                    Entendido
                </button>
            </div>
        </div>
    </div>

    <script src="js/main.js"></script>
    <script src="js/app.js"></script>
    <script src="js/modules/dashboard.js"></script>
    <script src="js/modules/clientes.js"></script>
    <script src="js/modules/prestamos.js"></script>
    <script src="js/modules/activos.js"></script>
    
    <script>
        // Inicializar aplicación
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Sistema financiero cargado - Usuario: <?php echo $nombre_usuario; ?>');
            // Mostrar dashboard por defecto
            showDashboard();
            
            // Función para redirigir a gestión de usuarios
            window.showUsuarios = function() {
                window.location.href = 'usuarios/crear_usuario.php';
            };
            
            // Función para mostrar modal
            window.showModal = function(title, message) {
                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-message').textContent = message;
                document.getElementById('modal').classList.remove('hidden');
                document.getElementById('modal').classList.add('flex');
            };
            
            window.closeModal = function() {
                document.getElementById('modal').classList.add('hidden');
                document.getElementById('modal').classList.remove('flex');
            };
            
            // Cerrar modal con ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeModal();
                }
            });
            
            // Cerrar modal al hacer clic fuera
            document.getElementById('modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
            
            // Función para resaltar pestaña activa
            function setActiveTab(tabName) {
                // Remover clase activa de todos los botones
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('bg-blue-600');
                    btn.classList.add('hover:bg-slate-700');
                });
                
                // Agregar clase activa al botón correspondiente
                const activeBtn = document.querySelector(`[onclick="show${tabName}()"]`);
                if (activeBtn) {
                    activeBtn.classList.add('bg-blue-600');
                    activeBtn.classList.remove('hover:bg-slate-700');
                }
            }
            
            // Sobrescribir funciones para actualizar pestaña activa
            const originalShowDashboard = window.showDashboard;
            window.showDashboard = function() {
                setActiveTab('Dashboard');
                return originalShowDashboard ? originalShowDashboard() : null;
            };
            
            const originalShowClientes = window.showClientes;
            window.showClientes = function() {
                setActiveTab('Clientes');
                return originalShowClientes ? originalShowClientes() : null;
            };
            
            const originalShowPrestamos = window.showPrestamos;
            window.showPrestamos = function() {
                setActiveTab('Prestamos');
                return originalShowPrestamos ? originalShowPrestamos() : null;
            };
            
            const originalShowActivos = window.showActivos;
            window.showActivos = function() {
                setActiveTab('Activos');
                return originalShowActivos ? originalShowActivos() : null;
            };
        });
    </script>
</body>
</html>