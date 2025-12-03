<?php
// install.php - Ejecutar una sola vez
echo "<h2>Instalación del Sistema Financiero (Con Módulo de Garantías para Clientes Naturales y Jurídicos)</h2>";

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


// ---------------------------------------------------------------------
// 1. TABLA ACTIVOS
// ---------------------------------------------------------------------
$conn->exec("
CREATE TABLE IF NOT EXISTS activos (
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
    estado VARCHAR(50) DEFAULT 'activo',

    -- Campos para bajas
    fecha_baja DATE NULL,
    motivo_baja VARCHAR(50) NULL,

    -- Códigos
    tipo_codigo VARCHAR(10) DEFAULT '0100',
    unidad_codigo VARCHAR(10) DEFAULT '5676',
    correlativo INT
) ENGINE=InnoDB;
");


// ---------------------------------------------------------------------
// 2. INDICES ACTIVOS
// ---------------------------------------------------------------------
$conn->exec("
CREATE INDEX idx_activos_estado ON activos(estado);
");

$conn->exec("
CREATE INDEX idx_activos_codigo ON activos(codigo);
");


// ---------------------------------------------------------------------
// 3. TABLA TIPOS_ACTIVO
// ---------------------------------------------------------------------
$conn->exec("
CREATE TABLE IF NOT EXISTS tipos_activo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    porcentaje_depreciacion DECIMAL(5,4) NOT NULL,
    vida_util INT NOT NULL,
    descripcion TEXT
) ENGINE=InnoDB;
");


// ---------------------------------------------------------------------
// 4. INSERTAR CATALOGOS DEL LISR
// ---------------------------------------------------------------------
$conn->exec("
INSERT INTO tipos_activo (codigo, nombre, porcentaje_depreciacion, vida_util, descripcion) VALUES
('0100', 'Edificaciones', 0.05, 20, 'Edificios y construcciones'),
('0200', 'Mobiliario y equipo', 0.10, 10, 'Muebles y equipo de oficina'),
('0300', 'Equipo de transporte', 0.25, 4, 'Vehículos y equipo de transporte'),
('0400', 'Maquinaria y equipo', 0.10, 10, 'Maquinaria industrial y equipo'),
('0500', 'Equipo de cómputo', 0.30, 4, 'Computadoras, servidores, impresoras'),
('0600', 'Herramientas', 0.30, 4, 'Herramientas manuales y eléctricas'),
('0700', 'Instalaciones', 0.10, 10, 'Instalaciones especializadas'),
('0800', 'Equipo médico', 0.20, 5, 'Equipo médico y de laboratorio');
");


// ---------------------------------------------------------------------
// 5. TABLA BAJAS DE ACTIVOS
// ---------------------------------------------------------------------
$conn->exec("
CREATE TABLE IF NOT EXISTS bajas_activos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NOT NULL,
    fecha_baja DATE NOT NULL,
    motivo ENUM('donado', 'vendido', 'inhabilitado') NOT NULL,
    valor_venta DECIMAL(15,2) NULL,
    receptor VARCHAR(255) NULL,
    observaciones TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");


// ---------------------------------------------------------------------
// 6. TABLA DEPRECIACION DIARIA
// ---------------------------------------------------------------------
$conn->exec("
CREATE TABLE IF NOT EXISTS depreciacion_diaria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NOT NULL,
    fecha DATE NOT NULL,
    depreciacion_diaria DECIMAL(15,2) NOT NULL,
    depreciacion_acumulada DECIMAL(15,2) NOT NULL,
    valor_libros DECIMAL(15,2) NOT NULL,
    INDEX idx_fecha (fecha),
    INDEX idx_activo (activo_id),
    FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");


// ---------------------------------------------------------------------
// 7. TABLA PAGOS (PORQUE LA PEDISTE TAMBIÉN IGUAL)
// ---------------------------------------------------------------------
$conn->exec("
CREATE TABLE IF NOT EXISTS pagos (
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
) ENGINE=InnoDB;
");



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

    // 2.4 Tabla Pivote: Préstamos <-> Garantías (Muchos a Muchos)
    $conn->exec("CREATE TABLE IF NOT EXISTS prestamos_garantias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        garantia_id INT NOT NULL,
        monto_gravado DECIMAL(15,2) NOT NULL,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
        FOREIGN KEY (garantia_id) REFERENCES garantias(id)
    ) ENGINE=InnoDB");

    // 2.5 Tabla Seguros de Garantía (Para alertas de vencimiento)
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
    // BLOQUE 3: NUEVAS TABLAS PARA GARANTÍAS DE CLIENTES NATURALES
    // ---------------------------------------------------------

    // 3.1 Catálogo Tipos de Garantías Personales
    $conn->exec("CREATE TABLE IF NOT EXISTS tipos_garantia_personal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT DEFAULT NULL,
        requiere_documentos TINYINT(1) DEFAULT 1,
        orden_prioridad INT DEFAULT 1 COMMENT 'Prioridad en ejecución (1 mayor, 5 menor)'
    ) ENGINE=InnoDB");

    // 3.2 Tabla Fiadores y Codeudores
    $conn->exec("CREATE TABLE IF NOT EXISTS garantias_personales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL COMMENT 'Cliente principal (deudor)',
        tipo_garantia_personal_id INT NOT NULL COMMENT 'Fiador o Codeudor',
        nombre_completo VARCHAR(255) NOT NULL,
        dui VARCHAR(20) NOT NULL,
        nit VARCHAR(20),
        fecha_nacimiento DATE,
        direccion TEXT,
        telefono VARCHAR(20),
        email VARCHAR(100),
        ocupacion VARCHAR(100),
        ingresos_mensuales DECIMAL(15,2) NOT NULL,
        egresos_mensuales DECIMAL(15,2) DEFAULT 0,
        capacidad_pago DECIMAL(15,2) DEFAULT 0,
        estado_civil VARCHAR(50),
        parentesco_cliente VARCHAR(100) COMMENT 'Relación con el cliente principal',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (tipo_garantia_personal_id) REFERENCES tipos_garantia_personal(id)
    ) ENGINE=InnoDB");

    // 3.3 Tabla Hipotecas para Clientes Naturales
    $conn->exec("CREATE TABLE IF NOT EXISTS hipotecas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL COMMENT 'Cliente dueño del inmueble',
        numero_matricula_cnr VARCHAR(100) NOT NULL COMMENT 'Número de matrícula en el CNR',
        descripcion_inmueble TEXT NOT NULL,
        ubicacion_inmueble TEXT NOT NULL,
        tipo_inmueble VARCHAR(100) COMMENT 'Casa, apartamento, terreno, local comercial, etc.',
        area_terreno DECIMAL(10,2) COMMENT 'En metros cuadrados',
        area_construccion DECIMAL(10,2) COMMENT 'En metros cuadrados',
        valor_avaluo DECIMAL(15,2) NOT NULL,
        fecha_avaluo DATE NOT NULL,
        grado_hipoteca ENUM('1er_grado', '2do_grado', '3er_grado', 'otro') DEFAULT '1er_grado',
        porcentaje_cobertura DECIMAL(5,2) DEFAULT 70.00 COMMENT 'Porcentaje del avalúo que cubre el préstamo',
        fecha_inscripcion DATE,
        notaria_inscripcion VARCHAR(150),
        folio_real VARCHAR(50),
        estado ENUM('tramite', 'vigente', 'ejecucion', 'liberada') DEFAULT 'tramite',
        observaciones TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 3.4 Tabla Historial de Avalúos de Hipotecas (para alertas de vencimiento)
    $conn->exec("CREATE TABLE IF NOT EXISTS hipotecas_avaluos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hipoteca_id INT NOT NULL,
        perito_nombre VARCHAR(255) NOT NULL,
        numero_registro_perito VARCHAR(50),
        fecha_avaluo DATE NOT NULL,
        valor_avaluo DECIMAL(15,2) NOT NULL,
        metodo_valuacion VARCHAR(100),
        vida_util_estimada INT COMMENT 'En años',
        estado_conservacion ENUM('excelente', 'bueno', 'regular', 'malo') DEFAULT 'bueno',
        observaciones TEXT,
        proximo_avaluo DATE COMMENT 'Fecha sugerida para próximo avalúo',
        archivo_avaluo VARCHAR(255) COMMENT 'Ruta del documento escaneado',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hipoteca_id) REFERENCES hipotecas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 3.5 Tabla de Alertas de Vencimiento de Avalúos
    $conn->exec("CREATE TABLE IF NOT EXISTS alertas_avaluos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hipoteca_id INT NOT NULL,
        tipo_alerta VARCHAR(50) COMMENT 'avaluo_proximo_vencer, avaluo_vencido',
        fecha_alerta DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        dias_restantes INT,
        estado ENUM('pendiente', 'notificada', 'resuelta') DEFAULT 'pendiente',
        fecha_notificacion DATETIME,
        usuario_notificado VARCHAR(100),
        observaciones TEXT,
        FOREIGN KEY (hipoteca_id) REFERENCES hipotecas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 3.6 Tabla Relación Préstamos - Garantías Personales
    $conn->exec("CREATE TABLE IF NOT EXISTS prestamos_garantias_personales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        garantia_personal_id INT NOT NULL,
        monto_responsabilidad DECIMAL(15,2) NOT NULL COMMENT 'Monto máximo por el que responde',
        porcentaje_responsabilidad DECIMAL(5,2) DEFAULT 100.00,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
        FOREIGN KEY (garantia_personal_id) REFERENCES garantias_personales(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 3.7 Tabla Relación Préstamos - Hipotecas
    $conn->exec("CREATE TABLE IF NOT EXISTS prestamos_hipotecas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        hipoteca_id INT NOT NULL,
        monto_garantizado DECIMAL(15,2) NOT NULL,
        porcentaje_cobertura DECIMAL(5,2) DEFAULT 70.00,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
        FOREIGN KEY (hipoteca_id) REFERENCES hipotecas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 3.8 Tabla Documentos de Garantías
    $conn->exec("CREATE TABLE IF NOT EXISTS documentos_garantias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo_garantia ENUM('personal', 'hipoteca', 'juridica') NOT NULL,
        garantia_id INT NOT NULL COMMENT 'ID de la garantía según el tipo',
        tipo_documento VARCHAR(100) NOT NULL COMMENT 'DUI, NIT, Escritura, Avalúo, etc.',
        nombre_documento VARCHAR(255) NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_subio VARCHAR(100),
        observaciones TEXT,
        INDEX idx_tipo_garantia (tipo_garantia, garantia_id)
    ) ENGINE=InnoDB");

     // Zonas Geográficas (Para dividir la cartera)
    $conn->exec("CREATE TABLE IF NOT EXISTS zonas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        codigo VARCHAR(10) UNIQUE,
        responsable VARCHAR(100)
    ) ENGINE=InnoDB");

    // Asesores de Crédito (Ejecutivos)
    $conn->exec("CREATE TABLE IF NOT EXISTS asesores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        zona_id INT,
        codigo_empleado VARCHAR(20),
        telefono VARCHAR(20),
        activo TINYINT(1) DEFAULT 1,
        FOREIGN KEY (zona_id) REFERENCES zonas(id)
    ) ENGINE=InnoDB");

    // Políticas de Crédito (La "Receta" del préstamo: Tasas, Plazos, Reglas)
    $conn->exec("CREATE TABLE IF NOT EXISTS politicas_credito (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL COMMENT 'Ej: Hipotecario, Agricola, Pyme',
        tasa_interes_anual DECIMAL(5,2) NOT NULL,
        tasa_mora_anual DECIMAL(5,2) NOT NULL,
        comision_admin DECIMAL(5,2) DEFAULT 0.00 COMMENT '% sobre saldo o cuota',
        plazo_maximo_meses INT NOT NULL,
        dias_gracia_mora INT DEFAULT 5,
        dias_para_incobrable INT DEFAULT 90 COMMENT 'Días de atraso para castigar crédito',
        formato_contrato TEXT COMMENT 'Plantilla HTML del contrato',
        activo TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB");

    // 2. CRÉDITO MAESTRO (ENCABEZADO)
    // -----------------------------------------------------
    $conn->exec("CREATE TABLE IF NOT EXISTS creditos_corporativos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_contrato VARCHAR(50) UNIQUE NOT NULL,
        cliente_id INT NOT NULL, -- Vinculo con tabla clientes_juridicos (o clientes general)
        politica_id INT NOT NULL,
        asesor_id INT,
        zona_id INT,
        
        -- Valores Financieros
        monto_solicitado DECIMAL(15,2) NOT NULL,
        monto_aprobado DECIMAL(15,2) NOT NULL,
        monto_entregado DECIMAL(15,2) NOT NULL, -- Puede ser menor por comisiones iniciales
        saldo_capital DECIMAL(15,2) NOT NULL,
        interes_pendiente DECIMAL(15,2) DEFAULT 0.00,
        saldo_mora DECIMAL(15,2) DEFAULT 0.00,
        
        -- Condiciones
        plazo_meses INT NOT NULL,
        tasa_interes_aplicada DECIMAL(5,2) NOT NULL,
        tasa_mora_aplicada DECIMAL(5,2) NOT NULL,
        dia_pago INT NOT NULL,
        frecuencia_pago ENUM('mensual', 'quincenal', 'trimestral') DEFAULT 'mensual',
        
        -- Estados y Clasificación
        estado ENUM('solicitud', 'aprobado', 'activo', 'mora', 'judicial', 'incobrable', 'cancelado', 'refinanciado') DEFAULT 'solicitud',
        categoria_riesgo CHAR(1) DEFAULT 'A' COMMENT 'A, B, C, D (Se actualiza con triggers o crons)',
        dias_mora_acumulados INT DEFAULT 0,
        
        -- Auditoría
        destino_fondos TEXT,
        credito_anterior_id INT DEFAULT NULL COMMENT 'Si es refinanciamiento',
        fecha_desembolso DATE,
        fecha_vencimiento DATE,
        fecha_ultimo_pago DATE,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (politica_id) REFERENCES politicas_credito(id),
        FOREIGN KEY (asesor_id) REFERENCES asesores(id)
    ) ENGINE=InnoDB");

    // 3. VINCULACIÓN DE GARANTÍAS (MULTITABLA)
    // -----------------------------------------------------
    // Permite atar Hipotecas, Prendas (Garantias) o Fiadores a un crédito específico
    $conn->exec("CREATE TABLE IF NOT EXISTS creditos_garantias_vinculo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credito_id INT NOT NULL,
        origen_tabla ENUM('garantia_bien', 'hipoteca', 'fiador') NOT NULL,
        referencia_id INT NOT NULL, -- ID de la tabla correspondiente
        valor_cobertura DECIMAL(15,2) NOT NULL,
        descripcion_corta VARCHAR(255),
        FOREIGN KEY (credito_id) REFERENCES creditos_corporativos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 4. PLAN DE PAGOS (PROYECCIÓN FINANCIERA)
    // -----------------------------------------------------
    $conn->exec("CREATE TABLE IF NOT EXISTS plan_pagos_corp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credito_id INT NOT NULL,
        numero_cuota INT NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        
        -- Proyección
        capital_programado DECIMAL(15,2) NOT NULL,
        interes_programado DECIMAL(15,2) NOT NULL,
        comision_programada DECIMAL(15,2) DEFAULT 0.00,
        cuota_total DECIMAL(15,2) NOT NULL,
        saldo_proyectado DECIMAL(15,2) NOT NULL,
        
        -- Realidad
        estado ENUM('pendiente', 'pagado', 'parcial', 'vencido') DEFAULT 'pendiente',
        fecha_pago_real DATE,
        mora_generada DECIMAL(15,2) DEFAULT 0.00,
        monto_pagado_real DECIMAL(15,2) DEFAULT 0.00,
        
        FOREIGN KEY (credito_id) REFERENCES creditos_corporativos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");

    // 5. RECIBOS DE COBRO (CAJA)
    // -----------------------------------------------------
    $conn->exec("CREATE TABLE IF NOT EXISTS recibos_corp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credito_id INT NOT NULL,
        codigo_recibo VARCHAR(50) UNIQUE,
        fecha_transaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        monto_total_pagado DECIMAL(15,2) NOT NULL,
        
        -- Distribución del Pago (Cascada de Prelación)
        abono_mora DECIMAL(15,2) DEFAULT 0.00,
        abono_comision DECIMAL(15,2) DEFAULT 0.00,
        abono_interes DECIMAL(15,2) DEFAULT 0.00,
        abono_capital DECIMAL(15,2) DEFAULT 0.00,
        
        saldo_anterior DECIMAL(15,2) NOT NULL,
        saldo_actual DECIMAL(15,2) NOT NULL,
        
        concepto TEXT,
        usuario_cajero VARCHAR(100),
        
        FOREIGN KEY (credito_id) REFERENCES creditos_corporativos(id)
    ) ENGINE=InnoDB");

    // ---------------------------------------------------------
    // BLOQUE 4: INSERTAR DATOS POR DEFECTO
    // ---------------------------------------------------------

    // Verificar si la tabla tipos_garantia está vacía para insertar defaults
    $stmt = $conn->query("SELECT COUNT(*) FROM tipos_garantia");
    if ($stmt->fetchColumn() == 0) {
        $sql = "INSERT INTO tipos_garantia (nombre, descripcion, requiere_rug) VALUES 
                ('Prenda sin Desplazamiento', 'Maquinaria, Vehículos o Equipo que conserva el deudor', 1),
                ('Garantía Mobiliaria sobre Inventario', 'Inventarios rotatorios de mercadería', 1),
                ('Cesión de Derechos Económicos', 'Facturas por cobrar o contratos', 1),
                ('Pignoración de Acciones', 'Acciones de la sociedad', 0),
                ('Depósito a Plazo (Back-to-Back)', 'Garantía líquida en efectivo', 0)";
        $conn->exec($sql);
        echo "<p style='color: blue;'>ℹ️ Catálogo de Tipos de Garantía Jurídica inicializado.</p>";
    }

    // Insertar datos por defecto para tipos de garantías personales
    $stmt = $conn->query("SELECT COUNT(*) FROM tipos_garantia_personal");
    if ($stmt->fetchColumn() == 0) {
        $sql = "INSERT INTO tipos_garantia_personal (nombre, descripcion, requiere_documentos, orden_prioridad) VALUES 
                ('Fiador (Aval)', 'Persona que garantiza el pago en caso de incumplimiento del deudor principal', 1, 1),
                ('Codeudor Solidario', 'Persona que responde solidariamente con el deudor principal', 1, 2),
                ('Fiador con Bienes', 'Fiador que además ofrece bienes como respaldo', 1, 3),
                ('Codeudor Mancomunado', 'Codeudor con responsabilidad proporcional', 1, 4)";
        $conn->exec($sql);
        echo "<p style='color: blue;'>ℹ️ Catálogo de Tipos de Garantía Personal inicializado.</p>";
    }

    echo "<p style='color: green;'>✅ Base de datos, tablas base y módulos de garantías (naturales y jurídicas) creados exitosamente!</p>";
    echo "<p>Ahora puedes acceder al sistema en <a href='index.php'>index.php</a></p>";


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

    // ---------------------------------------------------------
    // BLOQUE 5: CREAR VISTAS ÚTILES
    // ---------------------------------------------------------

    // Vista para alertas de avalúos vencidos o por vencer
    $conn->exec("
    CREATE OR REPLACE VIEW vista_alertas_avaluos AS
    SELECT 
        h.id as hipoteca_id,
        c.nombre as cliente_nombre,
        c.codigo as cliente_codigo,
        h.numero_matricula_cnr,
        h.descripcion_inmueble,
        h.valor_avaluo,
        h.fecha_avaluo,
        DATEDIFF(CURDATE(), h.fecha_avaluo) as dias_desde_avaluo,
        CASE 
            WHEN DATEDIFF(CURDATE(), h.fecha_avaluo) > 1095 THEN 'VENCIDO (más de 3 años)'
            WHEN DATEDIFF(CURDATE(), h.fecha_avaluo) > 730 THEN 'PRÓXIMO A VENCER (más de 2 años)'
            ELSE 'VIGENTE'
        END as estado_avaluo,
        DATE_ADD(h.fecha_avaluo, INTERVAL 3 YEAR) as fecha_proximo_avaluo,
        DATEDIFF(DATE_ADD(h.fecha_avaluo, INTERVAL 3 YEAR), CURDATE()) as dias_para_proximo_avaluo
    FROM hipotecas h
    INNER JOIN clientes c ON h.cliente_id = c.id
    WHERE h.estado = 'vigente'
    ");

    echo "<p style='color: blue;'>ℹ️ Vista de alertas de avalúos creada.</p>";

} catch (PDOException $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}

?>