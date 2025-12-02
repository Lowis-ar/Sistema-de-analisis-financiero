<?php
// install.php - Ejecutar una sola vez
echo "<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Instalación Sistema Financiero</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #28a745; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #dc3545; }
        .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #17a2b8; }
        .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
        h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .btn:hover { background: #0056b3; }
        .step { margin: 20px 0; padding: 10px; border-left: 3px solid #6c757d; }
    </style>
</head>
<body>
    <div class='container'>
        <h2>🛠️ Instalación del Sistema Financiero</h2>
        <p>Este script creará la base de datos y todas las tablas necesarias.</p>
        <hr>";

$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'financiera_sv';

try {
    echo "<div class='step'><strong>Paso 1:</strong> Conectando al servidor MySQL...</div>";
    
    // Conectar sin seleccionar base de datos
    $conn = new PDO("mysql:host=$host", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<div class='success'>✅ Conexión al servidor MySQL exitosa</div>";
    
    // Crear base de datos si no existe
    echo "<div class='step'><strong>Paso 2:</strong> Creando/verificando base de datos '$dbname'...</div>";
    $conn->exec("CREATE DATABASE IF NOT EXISTS $dbname CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->exec("USE $dbname");
    
    echo "<div class='success'>✅ Base de datos '$dbname' lista</div>";
    
    // =================== CREAR TABLA USUARIOS (IMPORTANTE PARA LOGIN) ===================
    echo "<div class='step'><strong>Paso 3:</strong> Creando tabla de usuarios (para login)...</div>";
    $conn->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        activo TINYINT(1) DEFAULT 1,
        rol ENUM('admin', 'usuario') DEFAULT 'usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    echo "<div class='success'>✅ Tabla 'usuarios' creada</div>";
    
    // =================== CREAR TABLA CLIENTES ===================
    echo "<div class='step'><strong>Paso 4:</strong> Creando tabla de clientes...</div>";
    $conn->exec("CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo ENUM('natural', 'juridica') NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        dui VARCHAR(20),
        direccion TEXT,
        ingresos DECIMAL(15,2) DEFAULT 0,
        egresos DECIMAL(15,2) DEFAULT 0,
        telefono VARCHAR(20),
        capacidad_pago DECIMAL(15,2) DEFAULT 0,
        calificacion ENUM('A','B','C','D') DEFAULT 'A',
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    echo "<div class='success'>✅ Tabla 'clientes' creada</div>";
    
    // =================== CREAR TABLA PRÉSTAMOS ===================
    echo "<div class='step'><strong>Paso 5:</strong> Creando tabla de préstamos...</div>";
    $conn->exec("CREATE TABLE IF NOT EXISTS prestamos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        tipo ENUM('personal', 'hipotecario', 'agricola', 'construccion', 'empresa') NOT NULL,
        monto DECIMAL(15,2) NOT NULL,
        plazo INT NOT NULL,
        tasa DECIMAL(5,2) NOT NULL,
        garantia TEXT,
        fiador VARCHAR(255),
        cliente_nombre VARCHAR(255) NOT NULL,
        cuota DECIMAL(15,2) NOT NULL,
        saldo_actual DECIMAL(15,2) NOT NULL,
        estado ENUM('normal', 'mora', 'incobrable', 'pagado') DEFAULT 'normal',
        fecha_otorgamiento DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultimo_pago DATETIME NULL,
        dias_mora INT DEFAULT 0,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    echo "<div class='success'>✅ Tabla 'prestamos' creada</div>";
    
    // =================== CREAR TABLA PAGOS ===================
    echo "<div class='step'><strong>Paso 6:</strong> Creando tabla de pagos...</div>";
    $conn->exec("CREATE TABLE IF NOT EXISTS pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        cliente_nombre VARCHAR(255) NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_pagado DECIMAL(15,2) NOT NULL,
        capital DECIMAL(15,2) NOT NULL,
        interes DECIMAL(15,2) NOT NULL,
        mora DECIMAL(15,2) DEFAULT 0,
        comision DECIMAL(15,2) DEFAULT 0,
        saldo_restante DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    echo "<div class='success'>✅ Tabla 'pagos' creada</div>";
    
    // =================== CREAR TABLA ACTIVOS ===================
    echo "<div class='step'><strong>Paso 7:</strong> Creando tabla de activos fijos...</div>";
    $conn->exec("CREATE TABLE IF NOT EXISTS activos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        institucion VARCHAR(50) NOT NULL,
        unidad VARCHAR(50) NOT NULL,
        tipo ENUM('edificaciones', 'maquinaria', 'vehiculos', 'otros') NOT NULL,
        descripcion TEXT NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        fecha_compra DATE NOT NULL,
        codigo VARCHAR(100) UNIQUE NOT NULL,
        vida_util INT NOT NULL,
        porcentaje_depreciacion DECIMAL(5,4) NOT NULL,
        estado ENUM('activo', 'baja') DEFAULT 'activo'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    echo "<div class='success'>✅ Tabla 'activos' creada</div>";
    
    // =================== CREAR USUARIO ADMIN POR DEFECTO ===================
    echo "<div class='step'><strong>Paso 8:</strong> Creando usuario administrador por defecto...</div>";
    
    // Verificar si ya existe algún usuario
    $check = $conn->query("SELECT COUNT(*) as total FROM usuarios");
    $result = $check->fetch(PDO::FETCH_ASSOC);
    
    if ($result['total'] == 0) {
        // Crear usuario administrador
        $nombre = "Administrador";
        $email = "admin@financiera.com";
        $password_hash = password_hash('admin123', PASSWORD_DEFAULT);
        
        $sql = "INSERT INTO usuarios (nombre, email, password, rol) 
                VALUES (:nombre, :email, :password, 'admin')";
        
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':nombre', $nombre);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':password', $password_hash);
        
        if ($stmt->execute()) {
            echo "<div class='info'>";
            echo "✅ Usuario administrador creado automáticamente<br>";
            echo "📧 <strong>Email:</strong> admin@financiera.com<br>";
            echo "🔑 <strong>Password:</strong> admin123<br>";
            echo "⚠️ <em>Cambia esta contraseña después del primer login</em>";
            echo "</div>";
        }
    } else {
        echo "<div class='warning'>ℹ️ Ya existen usuarios en el sistema</div>";
    }
    
    // =================== MOSTRAR RESUMEN ===================
    echo "<div class='step'><strong>Paso 9:</strong> Verificando tablas creadas...</div>";
    
    $tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<div class='success'><strong>✅ INSTALACIÓN COMPLETADA</strong></div>";
    echo "<h3>📊 Tablas creadas en la base de datos:</h3>";
    echo "<ul>";
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";
    
    echo "<div class='info'>";
    echo "<h3>🎯 Siguientes pasos:</h3>";
    echo "<ol>";
    echo "<li><strong>BORRA este archivo install.php</strong> por seguridad</li>";
    echo "<li>Ve al <a href='login/login.php'>Login</a> para acceder al sistema</li>";
    echo "<li>Usa las credenciales: admin@financiera.com / admin123</li>";
    echo "<li>Cambia la contraseña del administrador después del primer login</li>";
    echo "</ol>";
    echo "</div>";
    
    echo "<a href='login/login.php' class='btn'>🚀 Ir al Login</a>";
    echo "<br><br>";
    echo "<a href='javascript:location.reload()' class='btn' style='background: #6c757d;'>🔄 Re-ejecutar instalación</a>";
    
} catch(PDOException $e) {
    echo "<div class='error'>";
    echo "❌ <strong>Error durante la instalación:</strong><br>";
    echo $e->getMessage();
    echo "</div>";
    echo "<p>Verifica que MySQL esté corriendo y las credenciales sean correctas.</p>";
}

echo "</div></body></html>";
?>