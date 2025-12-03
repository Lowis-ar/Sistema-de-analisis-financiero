<?php
// test_pago_simple.php - Prueba directa sin sesión
echo "<h2>Prueba del Sistema de Pagos</h2>";

// 1. Verificar conexión a la base de datos
echo "<h3>1. Probando conexión a la base de datos...</h3>";
try {
    require_once 'config/database.php';
    $database = Database::getInstance();
    $db = $database->getConnection();
    echo "✅ Conexión exitosa a la base de datos<br>";
    
    // 2. Verificar tabla pagos
    echo "<h3>2. Verificando estructura de tablas...</h3>";
    
    $tables = ['prestamos', 'pagos', 'usuarios'];
    foreach ($tables as $table) {
        $stmt = $db->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "✅ Tabla '$table' existe<br>";
            
            // Mostrar estructura
            $structure = $db->query("DESCRIBE $table");
            echo "<details><summary>Ver estructura de $table</summary>";
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Campo</th><th>Tipo</th><th>Nulo</th><th>Llave</th><th>Default</th><th>Extra</th></tr>";
            foreach ($structure as $row) {
                echo "<tr>";
                echo "<td>" . $row['Field'] . "</td>";
                echo "<td>" . $row['Type'] . "</td>";
                echo "<td>" . $row['Null'] . "</td>";
                echo "<td>" . $row['Key'] . "</td>";
                echo "<td>" . $row['Default'] . "</td>";
                echo "<td>" . $row['Extra'] . "</td>";
                echo "</tr>";
            }
            echo "</table></details>";
        } else {
            echo "❌ Tabla '$table' NO existe<br>";
        }
    }
    
    // 3. Verificar datos de prueba
    echo "<h3>3. Verificando datos de prueba...</h3>";
    
    // Verificar usuarios
    $stmt = $db->query("SELECT COUNT(*) as count FROM usuarios");
    $result = $stmt->fetch();
    echo "Usuarios en sistema: " . $result['count'] . "<br>";
    
    if ($result['count'] == 0) {
        echo "⚠️ No hay usuarios. Creando usuario de prueba...<br>";
        $password_hash = password_hash('admin123', PASSWORD_DEFAULT);
        $insert = $db->prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Admin Test', 'test@financiera.com', ?, 'admin')");
        $insert->execute([$password_hash]);
        echo "✅ Usuario de prueba creado<br>";
    }
    
    // Verificar préstamos
    $stmt = $db->query("SELECT COUNT(*) as count FROM prestamos");
    $result = $stmt->fetch();
    echo "Préstamos en sistema: " . $result['count'] . "<br>";
    
    if ($result['count'] == 0) {
        echo "⚠️ No hay préstamos. Creando préstamo de prueba...<br>";
        
        // Primero crear un cliente de prueba
        $db->query("INSERT INTO clientes (tipo, nombre, codigo, dui, capacidad_pago) VALUES ('natural', 'Cliente Prueba', 'TEST-001', '00000000-0', 500)");
        $cliente_id = $db->lastInsertId();
        
        // Crear préstamo de prueba
        $insertPrestamo = $db->prepare("
            INSERT INTO prestamos (cliente_id, tipo, monto, plazo, tasa, cliente_nombre, cuota, saldo_actual, estado) 
            VALUES (?, 'personal', 1000, 12, 12, 'Cliente Prueba', 88.85, 1000, 'normal')
        ");
        $insertPrestamo->execute([$cliente_id]);
        echo "✅ Préstamo de prueba creado<br>";
    }
    
    // Mostrar préstamos disponibles
    $stmt = $db->query("SELECT id, cliente_nombre, monto, saldo_actual FROM prestamos LIMIT 5");
    $prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h4>Préstamos disponibles para prueba:</h4>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Cliente</th><th>Monto</th><th>Saldo</th></tr>";
    foreach ($prestamos as $prestamo) {
        echo "<tr>";
        echo "<td>" . $prestamo['id'] . "</td>";
        echo "<td>" . $prestamo['cliente_nombre'] . "</td>";
        echo "<td>$" . number_format($prestamo['monto'], 2) . "</td>";
        echo "<td>$" . number_format($prestamo['saldo_actual'], 2) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // 4. Probar el endpoint de pagos directamente
    echo "<h3>4. Probando endpoint de pagos...</h3>";
    
    if (!empty($prestamos)) {
        $prestamo_id = $prestamos[0]['id'];
        $monto_pago = min(100, $prestamos[0]['saldo_actual']);
        
        // Simular sesión
        session_start();
        $_SESSION['logged_in'] = true;
        $_SESSION['user_id'] = 1;
        $_SESSION['user_name'] = 'Administrador';
        $_SESSION['user_email'] = 'admin@financiera.com';
        $_SESSION['user_rol'] = 'admin';
        
        // Crear datos de prueba
        $testData = [
            'prestamo_id' => $prestamo_id,
            'tipo_pago' => 'parcial',
            'monto_pagado' => $monto_pago,
            'fecha_pago' => date('Y-m-d'),
            'metodo_pago' => 'efectivo',
            'dias_mora' => 0,
            'referencia' => 'TEST-' . time(),
            'observaciones' => 'Pago de prueba desde test_pago_simple.php'
        ];
        
        echo "Enviando pago de prueba:<br>";
        echo "<pre>" . json_encode($testData, JSON_PRETTY_PRINT) . "</pre>";
        
        // Incluir pagos.php directamente
        ob_start();
        try {
            require_once 'api/pagos.php';
        } catch(Exception $e) {
            echo "❌ Error al incluir pagos.php: " . $e->getMessage() . "<br>";
        }
        $output = ob_get_clean();
        
        echo "Respuesta del servidor:<br>";
        echo "<pre>" . htmlspecialchars($output) . "</pre>";
        
    } else {
        echo "No hay préstamos para probar";
    }
    
} catch(Exception $e) {
    echo "❌ Error en la prueba: " . $e->getMessage() . "<br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>