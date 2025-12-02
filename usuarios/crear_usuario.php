<?php
session_start();
require_once '../config/database.php';

// =================== VERIFICACIÓN DE SESIÓN ===================
// Si NO está logueado, redirigir al login
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    header("Location: login/login.php");
    exit();
}

// Verificar si es administrador
if (!isset($_SESSION['user_rol']) || $_SESSION['user_rol'] !== 'admin') {
    die("<div style='padding: 40px; text-align: center; font-family: Arial;'>
        <h2 style='color: #dc2626;'>❌ Acceso Denegado</h2>
        <p>Solo los administradores pueden crear usuarios.</p>
        <a href='../index.php' style='color: #2563eb; text-decoration: none;'>Volver al sistema</a>
    </div>");
}

// Datos del usuario para mostrar (solo en sidebar)
$nombre_usuario = htmlspecialchars($_SESSION['user_name'] ?? 'Usuario');
$email_usuario = htmlspecialchars($_SESSION['user_email'] ?? '');
$rol_usuario = htmlspecialchars($_SESSION['user_rol'] ?? 'usuario');

// Variables del formulario
$error = "";
$success = "";
$nombre = $email = $password = $confirm_password = $rol = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $database = new Database();
    $db = $database->getConnection();
    
    $nombre = trim($_POST['nombre']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    $rol = $_POST['rol'];
    
    // Validaciones
    if (empty($nombre) || empty($email) || empty($password) || empty($confirm_password)) {
        $error = "Todos los campos son obligatorios.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "El formato del email no es válido.";
    } elseif (strlen($password) < 6) {
        $error = "La contraseña debe tener al menos 6 caracteres.";
    } elseif ($password !== $confirm_password) {
        $error = "Las contraseñas no coinciden.";
    } else {
        // Verificar si el email ya existe
        $query = "SELECT id FROM usuarios WHERE email = :email";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $error = "El email ya está registrado.";
        } else {
            // Crear usuario
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            
            $query = "INSERT INTO usuarios (nombre, email, password, rol) 
                      VALUES (:nombre, :email, :password, :rol)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':nombre', $nombre);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':password', $password_hash);
            $stmt->bindParam(':rol', $rol);
            
            if ($stmt->execute()) {
                $success = "Usuario creado exitosamente.";
                // Limpiar campos
                $nombre = $email = $password = $confirm_password = "";
            } else {
                $error = "Error al crear usuario. Intenta nuevamente.";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crear Usuario - FINANCIERA SV</title>
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
        
        /* Estilos para el sidebar (IDÉNTICOS AL INDEX.PHP) */
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
        
        /* Efecto hover mejorado para botones (IDÉNTICO AL INDEX.PHP) */
        .tab-btn {
            transition: all 0.2s ease;
        }
        
        .tab-btn:hover {
            transform: translateX(3px);
        }
        
        /* Estilos específicos para el formulario de usuario */
        .create-user-container {
            max-width: 700px;
            margin: 0 auto;
        }
        
        .form-header {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .form-header h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #374151;
        }
        
        .form-header p {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .form-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #6b7280;
        }
        
        .form-input {
            padding-left: 2.5rem;
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            padding: 0.75rem;
            transition: border-color 0.2s;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #6b7280;
            background: none;
            border: none;
            padding: 4px;
        }
        
        .password-toggle:hover {
            color: #2563eb;
        }
        
        .password-strength {
            font-size: 0.75rem;
            margin-top: 0.25rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            display: inline-block;
        }
        
        .strength-weak {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .strength-medium {
            background: #fef3c7;
            color: #d97706;
        }
        
        .strength-strong {
            background: #d1fae5;
            color: #065f46;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .form-full-width {
            grid-column: 1 / -1;
        }
        
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
        }
        
        .field-required::after {
            content: " *";
            color: #dc2626;
        }
        
        .field-hint {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
    </style>
</head>

<body class="bg-gray-100 font-sans">
    <div class="flex h-screen">
        <!-- Sidebar (EXACTAMENTE IGUAL AL INDEX.PHP) -->
        <aside class="w-64 bg-slate-800 text-white flex flex-col">
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
                <!-- BOTONES IGUALES AL INDEX.PHP -->
                <button onclick="showDashboard()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-all">
                    <i class="fas fa-chart-pie w-5 h-5 mr-3"></i> Dashboard
                </button>
                <button onclick="showClientes()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-all">
                    <i class="fas fa-users w-5 h-5 mr-3"></i> Clientes
                </button>
                <button onclick="showPrestamos()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-all">
                    <i class="fas fa-credit-card w-5 h-5 mr-3"></i> Créditos & Caja
                </button>
                <button onclick="showActivos()" class="tab-btn flex items-center w-full p-3 rounded-md hover:bg-slate-700 transition-all">
                    <i class="fas fa-building w-5 h-5 mr-3"></i> Activos Fijos
                </button>
                
                <!-- SECCIÓN ADMINISTRACIÓN (SOLO PARA ADMINS) - SIN COLOR AZUL -->
                <?php if ($rol_usuario == 'admin'): ?>
                <div class="section-divider">
                    <p class="text-xs text-slate-400 uppercase tracking-wider mb-2">Administración</p>
                    <button onclick="showUsuarios()" class="tab-btn flex items-center w-full p-3 rounded-md bg-slate-700 hover:bg-slate-600 transition-all">
                        <i class="fas fa-user-plus w-5 h-5 mr-3"></i> Gestionar Usuarios
                    </button>
                </div>
                <?php endif; ?>
            </nav>
            
            <!-- Botón de Cerrar Sesión (IGUAL AL INDEX.PHP) -->
            <div class="p-4 border-t border-slate-700">
                <button onclick="logout()" class="flex items-center justify-center w-full p-3 rounded-md hover:bg-red-900 bg-red-800 text-white transition-all hover:scale-[1.02]">
                    <i class="fas fa-sign-out-alt w-5 h-5 mr-3"></i> Cerrar Sesión
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-8">
            <div id="main-content">
                <!-- CONTENIDO DEL FORMULARIO DE CREAR USUARIO -->
                <div class="create-user-container">
                    <div class="card">
                        <div class="form-header">
                            <h2 class="flex items-center gap-2">
                                <i class="fas fa-user-plus text-gray-600"></i>
                                Crear Nuevo Usuario
                            </h2>
                            <p>Complete todos los campos requeridos para registrar un nuevo usuario en el sistema</p>
                        </div>
                        
                        <div class="p-1">
                            <?php if ($error): ?>
                                <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                                    <div class="flex items-start">
                                        <div class="flex-shrink-0">
                                            <i class="fas fa-exclamation-circle text-red-400 mt-0.5"></i>
                                        </div>
                                        <div class="ml-3">
                                            <p class="text-sm text-red-700 font-medium"><?php echo htmlspecialchars($error); ?></p>
                                        </div>
                                    </div>
                                </div>
                            <?php endif; ?>
                            
                            <?php if ($success): ?>
                                <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r">
                                    <div class="flex items-start">
                                        <div class="flex-shrink-0">
                                            <i class="fas fa-check-circle text-green-400 mt-0.5"></i>
                                        </div>
                                        <div class="ml-3">
                                            <p class="text-sm text-green-700 font-medium"><?php echo htmlspecialchars($success); ?></p>
                                        </div>
                                    </div>
                                </div>
                            <?php endif; ?>
                            
                            <form method="POST" action="" id="createForm">
                                <!-- Primera fila: Nombre y Email -->
                                <div class="form-row">
                                    <div class="input-group">
                                        <label for="nombre" class="font-medium text-gray-700 mb-1">
                                            <i class="fas fa-user mr-1 text-gray-500"></i>
                                            <span class="field-required">Nombre Completo</span>
                                        </label>
                                        <div class="relative">
                                          
                                            <input type="text" 
                                                   id="nombre" 
                                                   name="nombre" 
                                                   class="form-input" 
                                                   placeholder="Ingrese el nombre completo" 
                                                   value="<?php echo isset($nombre) ? htmlspecialchars($nombre) : ''; ?>" 
                                                   required
                                                   autofocus>
                                        </div>
                                    </div>
                                    
                                    <div class="input-group">
                                        <label for="email" class="font-medium text-gray-700 mb-1">
                                            <i class="fas fa-envelope mr-1 text-gray-500"></i>
                                            <span class="field-required">Correo Electrónico</span>
                                        </label>
                                        <div class="relative">
                                            
                                            <input type="email" 
                                                   id="email" 
                                                   name="email" 
                                                   class="form-input" 
                                                   placeholder="usuario@financiera.com" 
                                                   value="<?php echo isset($email) ? htmlspecialchars($email) : ''; ?>" 
                                                   required>
                                        </div>
                                        <div class="field-hint">
                                            <i class="fas fa-info-circle text-xs"></i>
                                            <span>Será utilizado para iniciar sesión</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Segunda fila: Contraseña y Confirmar Contraseña -->
                                <div class="form-row">
                                    <div class="input-group">
                                        <label for="password" class="font-medium text-gray-700 mb-1">
                                            <i class="fas fa-lock mr-1 text-gray-500"></i>
                                            <span class="field-required">Contraseña</span>
                                        </label>
                                        <div class="relative">
                                           
                                            <input type="password" 
                                                   id="password" 
                                                   name="password" 
                                                   class="form-input pr-10" 
                                                   placeholder="Mínimo 6 caracteres" 
                                                   required
                                                   oninput="checkPasswordStrength()">
                                            <button type="button" class="password-toggle" onclick="togglePassword('password')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                        <div id="password-strength" class="password-strength"></div>
                                        <div class="field-hint">
                                            <i class="fas fa-exclamation-circle text-xs"></i>
                                            <span>La contraseña debe tener al menos 6 caracteres</span>
                                        </div>
                                    </div>
                                    
                                    <div class="input-group">
                                        <label for="confirm_password" class="font-medium text-gray-700 mb-1">
                                            <i class="fas fa-lock mr-1 text-gray-500"></i>
                                            <span class="field-required">Confirmar Contraseña</span>
                                        </label>
                                        <div class="relative">
                                            
                                            <input type="password" 
                                                   id="confirm_password" 
                                                   name="confirm_password" 
                                                   class="form-input pr-10" 
                                                   placeholder="Repita la contraseña" 
                                                   required
                                                   oninput="checkPasswordMatch()">
                                            <button type="button" class="password-toggle" onclick="togglePassword('confirm_password')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                        <div id="password-match" class="password-strength"></div>
                                    </div>
                                </div>
                                
                                <!-- Tercera fila: Rol (ancho completo) -->
                                <div class="form-row">
                                    <div class="input-group form-full-width">
                                        <label for="rol" class="font-medium text-gray-700 mb-1">
                                            <i class="fas fa-user-tag mr-1 text-gray-500"></i>
                                            <span class="field-required">Rol del Usuario</span>
                                        </label>
                                        <div class="relative">
                                           
                                            <select id="rol" name="rol" class="form-input" required>
                                                <option value="" disabled selected>Seleccione el tipo de acceso</option>
                                                <option value="usuario" <?php echo (isset($rol) && $rol == 'usuario') ? 'selected' : ''; ?>>Usuario</option>
                                                <option value="admin" <?php echo (isset($rol) && $rol == 'admin') ? 'selected' : ''; ?>>Administrador </option>
                                            </select>
                                        </div>
                                        <div class="field-hint">
                                            <i class="fas fa-info-circle text-xs"></i>
                                            <span>Los administradores tienen acceso completo a todas las funcionalidades del sistema</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Acciones del formulario -->
                                <div class="form-actions">
                                    <button type="button" onclick="resetForm()" class="btn btn-secondary flex items-center">
                                        <i class="fas fa-times mr-2"></i> Cancelar
                                    </button>
                                    <button type="submit" class="btn btn-primary flex items-center" id="createButton">
                                        <i class="fas fa-user-plus mr-2"></i> Crear Usuario
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        // FUNCIONES DE NAVEGACIÓN (IGUALES AL INDEX.PHP)
        function showDashboard() {
            window.location.href = '../index.php';
        }
        
        function showClientes() {
            window.location.href = '../clientes.php';
        }
        
        function showPrestamos() {
            window.location.href = '../creditos.php';
        }
        
        function showActivos() {
            window.location.href = '../activos.php';
        }
        
        function showUsuarios() {
            // Ya estamos en crear_usuario.php, podría redirigir a gestión de usuarios
            window.location.href = 'gestion_usuarios.php';
        }
        
        function logout() {
            window.location.href = '../login/logout.php';
        }
        
        // FUNCIONES DEL FORMULARIO
        function togglePassword(fieldId) {
            const passwordInput = document.getElementById(fieldId);
            const toggleIcon = passwordInput.parentNode.querySelector('.password-toggle i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        }
        
        function checkPasswordStrength() {
            const password = document.getElementById('password').value;
            const strengthElement = document.getElementById('password-strength');
            
            if (password.length === 0) {
                strengthElement.textContent = '';
                strengthElement.className = 'password-strength';
                return;
            }
            
            let strength = 'weak';
            let message = 'Débil';
            let className = 'strength-weak';
            
            if (password.length >= 8) {
                strength = 'medium';
                message = 'Media';
                className = 'strength-medium';
            }
            
            if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
                strength = 'strong';
                message = 'Fuerte';
                className = 'strength-strong';
            } else if (password.length >= 8 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) {
                strength = 'medium';
                message = 'Media';
                className = 'strength-medium';
            }
            
            strengthElement.textContent = `Nivel de seguridad: ${message}`;
            strengthElement.className = `password-strength ${className}`;
        }
        
        function checkPasswordMatch() {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            const matchElement = document.getElementById('password-match');
            
            if (confirmPassword.length === 0) {
                matchElement.textContent = '';
                matchElement.className = 'password-strength';
                return;
            }
            
            if (password === confirmPassword) {
                matchElement.textContent = '✓ Las contraseñas coinciden';
                matchElement.className = 'password-strength strength-strong';
            } else {
                matchElement.textContent = '✗ Las contraseñas no coinciden';
                matchElement.className = 'password-strength strength-weak';
            }
        }
        
        function resetForm() {
            document.getElementById('createForm').reset();
            document.getElementById('password-strength').textContent = '';
            document.getElementById('password-match').textContent = '';
            document.getElementById('password-strength').className = 'password-strength';
            document.getElementById('password-match').className = 'password-strength';
            document.getElementById('nombre').focus();
        }

        document.getElementById('createForm').addEventListener('submit', function() {
            const btn = document.getElementById('createButton');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creando usuario...';
            btn.disabled = true;
            btn.style.opacity = '0.8';
        });
    </script>
    
</body>
</html>