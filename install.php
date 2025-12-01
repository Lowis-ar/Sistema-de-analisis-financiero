<?php
// install.php - Ejecutar una sola vez
echo "<h2>Instalación del Sistema Financiero</h2>";

$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'financiera_sv';

try {
    // Conectar sin seleccionar base de datos
    $conn = new PDO("mysql:host=$host", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Crear base de datos si no existe
    $conn->exec("CREATE DATABASE IF NOT EXISTS $dbname");
    $conn->exec("USE $dbname");
    
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
    )");
    
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
    )");
    
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
    )");
    
    // Crear tabla activos
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
    )");
    
    echo "<p style='color: green;'>✅ Base de datos y tablas creadas exitosamente!</p>";
    echo "<p>Ahora puedes acceder al sistema en <a href='index.php'>index.php</a></p>";
    
} catch(PDOException $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>