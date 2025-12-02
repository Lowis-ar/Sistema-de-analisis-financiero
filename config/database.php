<?php
class Database {
    private $host = "localhost";
    private $db_name = "financiera_sv";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            echo "Error de conexión: " . $exception->getMessage();
        }
        return $this->conn;
    }
}

// Crear tablas si no existen
function createTables($conn) {
    $queries = [
        "CREATE TABLE IF NOT EXISTS clientes (
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
        )",
        
        "CREATE TABLE IF NOT EXISTS prestamos (
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
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )",
        
        "CREATE TABLE IF NOT EXISTS pagos (
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
            FOREIGN KEY (prestamo_id) REFERENCES prestamos(id)
        )",
        
        "CREATE TABLE IF NOT EXISTS activos (
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
        )"
    ];

    foreach ($queries as $query) {
        try {
            $conn->exec($query);
        } catch(PDOException $exception) {
            echo "Error creando tabla: " . $exception->getMessage();
        }
    }
}

// =================== ¡IMPORTANTE! ===================
// COMENTA o ELIMINA estas 3 líneas:
// $database = new Database();
// $conn = $database->getConnection();
// createTables($conn);
?>