<?php
session_start();
require_once '../config/database.php';

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $database = new Database();
    $db = $database->getConnection();
    
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    
    if (empty($email) || empty($password)) {
        $error = "Por favor ingresa email y contraseña.";
    } else {
        $query = "SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email AND activo = 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (password_verify($password, $row['password'])) {
                // Sesión iniciada correctamente
                $_SESSION['user_id'] = $row['id'];
                $_SESSION['user_name'] = $row['nombre'];
                $_SESSION['user_email'] = $row['email'];
                $_SESSION['user_rol'] = $row['rol'];
                $_SESSION['logged_in'] = true;
                
                // Redireccionar al sistema principal
                header("Location: ../index.php");
                exit();
            } else {
                $error = "Contraseña incorrecta.";
            }
        } else {
            $error = "No existe una cuenta con ese email o el usuario está inactivo.";
        }
    }
}

// Si ya está logueado, redireccionar
if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    header("Location: ../index.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión - Financiera SV</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 15px;
        }
        
        .login-container {
            width: 100%;
            max-width: 360px;
            animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .login-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border-radius: 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        .login-header {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            padding: 25px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .login-header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 18px 18px;
            animation: float 20s linear infinite;
        }
        
        @keyframes float {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .logo {
            font-size: 42px;
            margin-bottom: 10px;
            color: white;
            filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.15));
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.04); }
            100% { transform: scale(1); }
        }
        
        .login-header h1 {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .login-header p {
            opacity: 0.9;
            font-size: 13px;
            font-weight: 300;
        }
        
        .login-body {
            padding: 25px 22px;
        }
        
        .error-message {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #dc2626;
            padding: 12px 14px;
            border-radius: 8px;
            margin-bottom: 18px;
            font-size: 13px;
            border-left: 3px solid #dc2626;
            animation: shake 0.4s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        
        .form-group {
            margin-bottom: 16px;
            position: relative;
        }
        
        .form-group label {
            display: block;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .input-wrapper {
            position: relative;
        }
        
        .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #6b7280;
            font-size: 16px;
            z-index: 10;
            transition: all 0.3s;
        }
        
        .input-field {
            width: 100%;
            padding: 12px 12px 12px 42px;
            border: 1.5px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
            background: white;
            color: #374151;
        }
        
        .input-field:focus {
            outline: none;
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
            transform: translateY(-1px);
        }
        
        .input-field:focus + .input-icon {
            color: #0ea5e9;
            transform: translateY(-50%) scale(1.08);
        }
        
        .password-toggle {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #6b7280;
            background: none;
            border: none;
            font-size: 16px;
            padding: 4px;
            transition: all 0.2s;
        }
        
        .password-toggle:hover {
            color: #0ea5e9;
            transform: translateY(-50%) scale(1.08);
        }
        
        .btn-login {
            width: 100%;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
        }
        
        .btn-login:hover {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
        }
        
        .btn-login:active {
            transform: translateY(0);
        }
        
        .login-footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }
        
        .login-footer a {
            color: #0ea5e9;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }
        
        .login-footer a:hover {
            color: #0284c7;
            text-decoration: underline;
        }
        
        .security-note {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 10px;
            border-radius: 6px;
            margin-top: 16px;
            font-size: 11px;
            color: #475569;
            text-align: center;
            border: 1px solid #bae6fd;
        }
        
        .floating-shapes {
            position: fixed;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: -1;
        }
        
        .shape {
            position: absolute;
            background: rgba(14, 165, 233, 0.08);
            border-radius: 50%;
            animation: floatShape 20s infinite linear;
        }
        
        .shape:nth-child(1) {
            width: 50px;
            height: 50px;
            top: 15%;
            left: 10%;
            animation-delay: 0s;
        }
        
        .shape:nth-child(2) {
            width: 80px;
            height: 80px;
            top: 65%;
            right: 12%;
            animation-delay: -5s;
            animation-duration: 25s;
        }
        
        .shape:nth-child(3) {
            width: 35px;
            height: 35px;
            bottom: 25%;
            left: 20%;
            animation-delay: -10s;
            animation-duration: 30s;
        }
        
        @keyframes floatShape {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 0.3;
            }
            50% {
                opacity: 0.6;
            }
            100% {
                transform: translateY(-800px) rotate(720deg);
                opacity: 0;
            }
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .login-container {
                max-width: 100%;
            }
            
            .login-header {
                padding: 22px 18px;
            }
            
            .login-body {
                padding: 22px 18px;
            }
            
            .logo {
                font-size: 38px;
            }
            
            .login-header h1 {
                font-size: 20px;
            }
            
            .login-header p {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <!-- Fondo con formas flotantes azules -->
    <div class="floating-shapes">
        <div class="shape"></div>
        <div class="shape"></div>
        <div class="shape"></div>
    </div>
    
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="logo">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h1>FINANCIERA SV</h1>
                <p>Sistema Financiero</p>
            </div>
            
            <div class="login-body">
                <?php if ($error): ?>
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <span><?php echo htmlspecialchars($error); ?></span>
                    </div>
                <?php endif; ?>
                
                <form method="POST" action="" id="loginForm">
                    <div class="form-group">
                        <label for="email">
                            <i class="fas fa-envelope"></i> Correo Electrónico
                        </label>
                        <div class="input-wrapper">
                            <div class="input-icon">
                                <i class="fas fa-user"></i>
                            </div>
                            <input type="email" 
                                   id="email" 
                                   name="email" 
                                   class="input-field" 
                                   placeholder="usuario@financiera.com" 
                                   value="<?php echo isset($email) ? htmlspecialchars($email) : ''; ?>" 
                                   required
                                   autocomplete="username"
                                   autofocus>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">
                            <i class="fas fa-lock"></i> Contraseña
                        </label>
                        <div class="input-wrapper">
                            <div class="input-icon">
                                <i class="fas fa-key"></i>
                            </div>
                            <input type="password" 
                                   id="password" 
                                   name="password" 
                                   class="input-field" 
                                   placeholder="••••••••" 
                                   required
                                   autocomplete="current-password">
                            <button type="button" class="password-toggle" onclick="togglePassword()">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-login" id="loginButton">
                        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                    </button>
                </form>
                
                <div class="security-note">
                    <i class="fas fa-shield-alt"></i> Sistema seguro encriptado
                </div>
                
                <div class="login-footer">
                    <p>¿Problemas para ingresar? <a href="mailto:soporte@financierasv.com">Contactar soporte</a></p>
                    <p class="mt-1">
                        <i class="fas fa-info-circle"></i> Versión 1.0
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.querySelector('.password-toggle i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        }

        // Efecto al enviar el formulario
        document.getElementById('loginForm').addEventListener('submit', function() {
            const btn = document.getElementById('loginButton');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            btn.disabled = true;
            btn.style.opacity = '0.8';
        });

        // Efectos de entrada para inputs
        document.addEventListener('DOMContentLoaded', function() {
            const inputs = document.querySelectorAll('.input-field');
            inputs.forEach((input, index) => {
                input.style.opacity = '0';
                input.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    input.style.transition = 'all 0.4s ease';
                    input.style.opacity = '1';
                    input.style.transform = 'translateY(0)';
                }, 100 * (index + 1));
            });
            
            // Auto-focus en el campo de email
            document.getElementById('email').focus();
        });
    </script>
</body>
</html>