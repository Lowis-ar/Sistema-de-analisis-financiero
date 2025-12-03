<?php
// test_final.php
echo "<h1>Prueba Final del Sistema de Pagos</h1>";

// Verificar estructura de carpetas
echo "<h2>Estructura de Carpetas:</h2>";
$paths = [
    __DIR__ . '/config/database.php' => 'config/database.php',
    __DIR__ . '/api/pagos.php' => 'api/pagos.php',
    __DIR__ . '/api/prestamos.php' => 'api/prestamos.php'
];

foreach ($paths as $absolute => $relative) {
    if (file_exists($absolute)) {
        echo "✅ $relative existe<br>";
        echo "&nbsp;&nbsp;&nbsp;&nbsp;Ruta: " . realpath($absolute) . "<br>";
        echo "&nbsp;&nbsp;&nbsp;&nbsp;Tamaño: " . filesize($absolute) . " bytes<br>";
    } else {
        echo "❌ $relative NO existe<br>";
        echo "&nbsp;&nbsp;&nbsp;&nbsp;Buscado en: $absolute<br>";
    }
}

// Probar conexión directa
echo "<h2>Prueba de Conexión Directa:</h2>";
try {
    require_once 'config/database.php';
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    echo "✅ Conexión a BD exitosa<br>";
    
    // Verificar si hay préstamos
    $stmt = $db->query("SELECT id, cliente_nombre, saldo_actual FROM prestamos LIMIT 3");
    $prestamos = $stmt->fetchAll();
    
    if (count($prestamos) > 0) {
        echo "✅ Préstamos encontrados:<br>";
        foreach ($prestamos as $p) {
            echo "&nbsp;&nbsp;&nbsp;&nbsp;ID {$p['id']}: {$p['cliente_nombre']} - Saldo: \${$p['saldo_actual']}<br>";
        }
        
        // Probar pago directo
        echo "<h2>Prueba de Pago Directo:</h2>";
        $prestamo = $prestamos[0];
        
        // Simular sesión
        session_start();
        $_SESSION['logged_in'] = true;
        
        // Incluir y probar pagos.php
        echo "<h3>Incluyendo api/pagos.php...</h3>";
        
        // Crear datos de prueba
        $testData = [
            'prestamo_id' => $prestamo['id'],
            'tipo_pago' => 'parcial',
            'monto_pagado' => 50,
            'fecha_pago' => date('Y-m-d'),
            'metodo_pago' => 'efectivo',
            'referencia' => 'TEST-' . time()
        ];
        
        // Convertir a JSON para simular POST
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $GLOBALS['_POST_RAW'] = json_encode($testData);
        
        // Redirigir output
        ob_start();
        
        // Incluir con ruta correcta
        require_once __DIR__ . '/api/pagos.php';
        
        $output = ob_get_clean();
        
        echo "<h3>Respuesta del sistema:</h3>";
        echo "<pre>" . htmlspecialchars($output) . "</pre>";
        
    } else {
        echo "⚠️ No hay préstamos para probar<br>";
    }
    
} catch(Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>