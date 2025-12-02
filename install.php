<?php
// install.php - Ejecutar una sola vez
echo "<h2>Instalación del Sistema Financiero </h2>";

$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'financiera_sv';

try {
    // 1. Conectar sin seleccionar base de datos
    $conn = new PDO("mysql:host=$host", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 2. Crear base de datos si no existe
    $conn->exec("CREATE DATABASE IF NOT EXISTS $dbname CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
    $conn->exec("USE $dbname");
    
    // ---------------------------------------------------------
    // BLOQUE 0: TABLA USUARIOS 
    // ---------------------------------------------------------
    
    // Crear tabla usuarios 
    $conn->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        activo TINYINT(1) DEFAULT 1 COMMENT '1=activo, 0=inactivo',
        rol VARCHAR(20) DEFAULT 'usuario' COMMENT 'admin, usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");
    
    // ---------------------------------------------------------
    // BLOQUE 1: TABLAS BASE (Existentes)
    // ---------------------------------------------------------

    // Crear tabla clientes
    $conn->exec("CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        dui VARCHAR(20),
        direccion TEXT,
        ingresos DECIMAL(15,2) DEFAULT 0,
        egresos DECIMAL(15,2) DEFAULT 0,
        telefono VARCHAR(20),
        capacidad_pago DECIMAL(15,2) DEFAULT 0,
        calificacion VARCHAR(5) DEFAULT 'A',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");
    
    // Crear tabla prestamos
    $conn->exec("CREATE TABLE IF NOT EXISTS prestamos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        monto DECIMAL(15,2) NOT NULL,
        plazo INT NOT NULL,
        tasa DECIMAL(5,2) NOT NULL,
        garantia TEXT,
        fiador VARCHAR(255),
        cliente_nombre VARCHAR(255) NOT NULL,
        cuota DECIMAL(15,2) NOT NULL,
        saldo_actual DECIMAL(15,2) NOT NULL,
        estado VARCHAR(50) DEFAULT 'normal',
        fecha_otorgamiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultimo_pago DATETIME NULL,
        dias_mora INT DEFAULT 0,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    ) ENGINE=InnoDB");
    
    // Crear tabla pagos
    $conn->exec("CREATE TABLE IF NOT EXISTS pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        cliente_nombre VARCHAR(255) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_pagado DECIMAL(15,2) NOT NULL,
        capital DECIMAL(15,2) NOT NULL,
        interes DECIMAL(15,2) NOT NULL,
        mora DECIMAL(15,2) DEFAULT 0,
        comision DECIMAL(15,2) DEFAULT 0,
        saldo_restante DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id)
    ) ENGINE=InnoDB");
    
    // Crear tabla activos (Bienes propios de la financiera)
    $conn->exec("CREATE TABLE IF NOT EXISTS activos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        institucion VARCHAR(50) NOT NULL,
        unidad VARCHAR(50) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        descripcion TEXT NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        fecha_compra DATE NOT NULL,
        codigo VARCHAR(100) UNIQUE NOT NULL,
        vida_util INT NOT NULL,
        porcentaje_depreciacion DECIMAL(5,4) NOT NULL,
        estado VARCHAR(50) DEFAULT 'activo'
    ) ENGINE=InnoDB");

    // ---------------------------------------------------------
    // BLOQUE 2: NUEVAS TABLAS (Clientes Jurídicos y Garantías)
    // ---------------------------------------------------------

    // 2.1 Tabla Clientes Jurídicos (Extensión de tabla clientes)
    $conn->exec("CREATE TABLE IF NOT EXISTS clientes_juridicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        razon_social VARCHAR(255) NOT NULL,
        nombre_comercial VARCHAR(255) DEFAULT NULL,
        nit VARCHAR(20) NOT NULL COMMENT 'Formato 0000-000000-000-0',
        nrc VARCHAR(20) DEFAULT NULL COMMENT 'Numero Registro Contribuyente',
        giro_economico VARCHAR(150) DEFAULT NULL,
        representante_legal VARCHAR(200) NOT NULL,
        dui_representante VARCHAR(20) NOT NULL,
        fecha_constitucion DATE DEFAULT NULL,
        UNIQUE KEY unique_nit (nit),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 2.2 Catálogo Tipos de Garantía
    $conn->exec("CREATE TABLE IF NOT EXISTS tipos_garantia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT DEFAULT NULL,
        requiere_rug TINYINT(1) DEFAULT 1 COMMENT '1 si requiere inscripción en CNR'
    ) ENGINE=InnoDB");

    // 2.3 Tabla Maestra de Garantías
    $conn->exec("CREATE TABLE IF NOT EXISTS garantias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        tipo_garantia_id INT NOT NULL,
        codigo_interno VARCHAR(50) NOT NULL,
        descripcion_bien TEXT NOT NULL,
        ubicacion_fisica TEXT NOT NULL,
        valor_comercial DECIMAL(15,2) NOT NULL COMMENT 'Segun avaluo',
        valor_realizacion DECIMAL(15,2) NOT NULL COMMENT 'Valor castigado para credito',
        folio_rug VARCHAR(50) DEFAULT NULL COMMENT 'Inscripcion CNR',
        fecha_inscripcion_rug DATE DEFAULT NULL,
        estado ENUM('tramite','vigente','deteriorada','ejecucion','liberada') DEFAULT 'tramite',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (tipo_garantia_id) REFERENCES tipos_garantia(id)
    ) ENGINE=InnoDB");

    // 2.4 Tabla Pivote: Préstamos <-> Garantías (Many-to-Many)
    $conn->exec("CREATE TABLE IF NOT EXISTS prestamos_garantias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        garantia_id INT NOT NULL,
        monto_gravado DECIMAL(15,2) NOT NULL,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
        FOREIGN KEY (garantia_id) REFERENCES garantias(id)
    ) ENGINE=InnoDB");

    // 2.5 Tabla Seguros de Garantía
    $conn->exec("CREATE TABLE IF NOT EXISTS garantias_seguros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        garantia_id INT NOT NULL,
        aseguradora VARCHAR(100) NOT NULL,
        numero_poliza VARCHAR(100) NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        monto_asegurado DECIMAL(15,2) NOT NULL,
        estado ENUM('vigente','vencida','cancelada') DEFAULT 'vigente',
        FOREIGN KEY (garantia_id) REFERENCES garantias(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 2.6 Historial de Avalúos
    $conn->exec("CREATE TABLE IF NOT EXISTS garantias_avaluos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        garantia_id INT NOT NULL,
        perito_nombre VARCHAR(150) NOT NULL,
        numero_registro_perito VARCHAR(50) DEFAULT NULL,
        fecha_avaluo DATE NOT NULL,
        valor_asignado DECIMAL(15,2) NOT NULL,
        observaciones TEXT DEFAULT NULL,
        FOREIGN KEY (garantia_id) REFERENCES garantias(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // ---------------------------------------------------------
    // BLOQUE 3: INSERTAR DATOS POR DEFECTO
    // ---------------------------------------------------------
    
    // Verificar si la tabla tipos_garantia está vacía
    $stmt = $conn->query("SELECT COUNT(*) FROM tipos_garantia");
    if ($stmt->fetchColumn() == 0) {
        $sql = "INSERT INTO tipos_garantia (nombre, descripcion, requiere_rug) VALUES 
                ('Prenda sin Desplazamiento', 'Maquinaria, Vehículos o Equipo que conserva el deudor', 1),
                ('Garantía Mobiliaria sobre Inventario', 'Inventarios rotatorios de mercadería', 1),
                ('Cesión de Derechos Económicos', 'Facturas por cobrar o contratos', 1),
                ('Pignoración de Acciones', 'Acciones de la sociedad', 0),
                ('Depósito a Plazo (Back-to-Back)', 'Garantía líquida en efectivo', 0)";
        $conn->exec($sql);
        echo "<p style='color: blue;'>ℹ️ Catálogo de Tipos de Garantía inicializado.</p>";
    }
    
    // Verificar si la tabla usuarios está vacía para insertar usuario admin por defecto
    $stmt = $conn->query("SELECT COUNT(*) FROM usuarios");
    if ($stmt->fetchColumn() == 0) {
        $admin_pass = password_hash('admin123', PASSWORD_DEFAULT);
        $sql = "INSERT INTO usuarios (nombre, email, password, rol) VALUES 
                ('Administrador', 'admin@financiera.com', '$admin_pass', 'admin'),
                ('Usuario Demo', 'usuario@financiera.com', '$admin_pass', 'usuario')";
        $conn->exec($sql);
        echo "<p style='color: blue;'>ℹ️ Usuarios por defecto creados.</p>";
        echo "<p style='color: orange;'>⚠️ Credenciales por defecto:</p>";
        echo "<ul style='color: orange;'>";
        echo "<li>Admin: admin@financiera.com / admin123</li>";
        echo "<li>Usuario: usuario@financiera.com / admin123</li>";
        echo "</ul>";
    }

    echo "<p style='color: green;'>✅ Base de datos y todas las tablas creadas exitosamente!</p>";
    echo "<p><strong>Tablas creadas:</strong></p>";
    echo "<ul>";
    echo "<li>✅ usuarios </li>";
    echo "<li>✅ clientes</li>";
    echo "<li>✅ prestamos</li>";
    echo "<li>✅ pagos</li>";
    echo "<li>✅ activos</li>";
    echo "<li>✅ clientes_juridicos</li>";
    echo "<li>✅ tipos_garantia</li>";
    echo "<li>✅ garantias</li>";
    echo "<li>✅ prestamos_garantias</li>";
    echo "<li>✅ garantias_seguros</li>";
    echo "<li>✅ garantias_avaluos</li>";
    echo "</ul>";
    echo "<p>Ahora puedes acceder al sistema en <a href='../Sistema-de-analisis-financiero/login/login.php'>Iniciar sesión</a></p>";
    
} catch(PDOException $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>