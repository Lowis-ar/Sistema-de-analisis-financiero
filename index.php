<?php
session_start();
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
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <aside class="w-64 bg-slate-800 text-white hidden md:flex flex-col">
            <div class="p-6 border-b border-slate-700">
                <h1 class="text-xl font-bold">FINANCIERA SV</h1>
                <p class="text-xs text-slate-400 mt-1">Sistema Integral</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button onclick="showDashboard()" class="tab-btn flex items-center w-full p-3 rounded-md bg-blue-600">
                    <i class="fas fa-chart-pie w-5 h-5 mr-3"></i> Dashboard
                </button>
                <button onclick="showClientes()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700">
                    <i class="fas fa-users w-5 h-5 mr-3"></i> Clientes
                </button>
                <button onclick="showPrestamos()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700">
                    <i class="fas fa-credit-card w-5 h-5 mr-3"></i> Créditos & Caja
                </button>
                <button onclick="showActivos()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700">
                    <i class="fas fa-building w-5 h-5 mr-3"></i> Activos Fijos
                </button>
            </nav>
        </aside>

        <!-- Mobile Nav -->
        <div class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 text-white flex justify-around p-3 z-50">
            <button onclick="showDashboard()" class="p-3"><i class="fas fa-chart-pie"></i></button>
            <button onclick="showClientes()" class="p-3"><i class="fas fa-users"></i></button>
            <button onclick="showPrestamos()" class="p-3"><i class="fas fa-credit-card"></i></button>
            <button onclick="showActivos()" class="p-3"><i class="fas fa-building"></i></button>
        </div>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
            <div id="main-content">
                <div class="text-center py-12">
                    <h1 class="text-3xl font-bold text-gray-800 mb-4">Bienvenido al Sistema Financiero</h1>
                    <p class="text-gray-600">Selecciona una opción del menú para comenzar</p>
                </div>
            </div>
        </main>
    </div>

    <!-- Modal para mensajes -->
    <div id="modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 class="text-lg font-bold mb-4" id="modal-title"></h3>
            <p id="modal-message"></p>
            <div class="mt-6 text-right">
                <button onclick="closeModal()" class="btn btn-primary">Aceptar</button>
            </div>
        </div>
    </div>

    <script src="js/main.js"></script>
    <script src="js/modules/dashboard.js"></script>
    <script src="js/modules/clientes.js"></script>
    <script src="js/modules/prestamos.js"></script>
    <script src="js/modules/activos.js"></script>
    
    <script>
        // Inicializar aplicación
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Sistema financiero cargado');
            // Mostrar dashboard por defecto
            showDashboard();
        });
    </script>
</body>
</html>