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
        
        /* Clase para el botón activo del menú */
        .tab-button.bg-blue-600 { background-color: #2563eb; }
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div class="flex h-screen">
        <aside class="w-64 bg-slate-800 text-white hidden md:flex flex-col">
            <div class="p-6 border-b border-slate-700">
                <h1 class="text-xl font-bold">FINANCIERA SV</h1>
                <p class="text-xs text-slate-400 mt-1">Sistema Integral</p>
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
            </nav>
            
            <div class="p-4 border-t border-slate-700 text-xs text-slate-400">
                <p>&copy; 2024 Financiera SV</p>
            </div>
        </aside>

        <div class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 text-white flex justify-around p-3 z-50">
            <button onclick="setActiveTab('dashboard')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-chart-pie"></i></button>
            <button onclick="setActiveTab('clientes')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-users"></i></button>
            <button onclick="setActiveTab('garantias')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-shield-alt"></i></button>
            <button onclick="setActiveTab('creditos')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-credit-card"></i></button>
            <button onclick="setActiveTab('activos')" class="tab-button p-3 rounded-full hover:bg-slate-700"><i class="fas fa-building"></i></button>
        </div>

        <main class="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 bg-gray-50">
            <div class="md:hidden mb-6 flex justify-between items-center">
                <h1 class="text-xl font-bold text-gray-800">FINANCIERA SV</h1>
            </div>

            <div id="main-content">
                <div class="flex items-center justify-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

    <script src="js/app.js"></script> 
</body>
</html>