<?php
// api/pagos.php - VERSIÓN SIMPLIFICADA Y ROBUSTA

// Configurar encabezados primero
header('Content-Type: application/json');

// Manejo de errores
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Manejo de sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar autenticación
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado. Inicie sesión primero.']);
    exit();
}

// RUTA ABSOLUTA para database.php
// Si este archivo está en /api/pagos.php, __DIR__ = /ruta/al/proyecto/api
// Por lo que necesitamos subir un nivel: /ruta/al/proyecto/
$rootPath = dirname(__DIR__); // Esto sube un directorio desde /api
$configPath = $rootPath . '/config/database.php';

// Verificar que el archivo existe
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de configuración del sistema',
        'details' => 'Archivo de configuración de base de datos no encontrado.',
        'path' => $configPath
    ]);
    exit();
}

// Incluir la configuración
require_once $configPath;

// Conectar a la base de datos
try {
    $database = Database::getInstance();
    $db = $database->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de conexión a la base de datos',
        'details' => $e->getMessage()
    ]);
    exit();
}

// Procesar la solicitud
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            procesarPagoPOST($db);
            break;
        case 'GET':
            procesarPagoGET($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage()
    ]);
}

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

function procesarPagoPOST($db) {
    // Obtener datos JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos JSON no válidos']);
        return;
    }
    
    // Validar campos requeridos
    $required = ['prestamo_id', 'tipo_pago', 'monto_pagado'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Campo requerido faltante: $field"]);
            return;
        }
    }
    
    // Validar tipos de datos
    if (!is_numeric($input['prestamo_id']) || $input['prestamo_id'] <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de préstamo inválido']);
        return;
    }
    
    if (!is_numeric($input['monto_pagado']) || $input['monto_pagado'] <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Monto inválido']);
        return;
    }
    
    // Validar tipo de pago
    $tiposValidos = ['parcial', 'total', 'cuota', 'refinanciar'];
    if (!in_array($input['tipo_pago'], $tiposValidos)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Tipo de pago no válido']);
        return;
    }
    
    // Si es refinanciamiento, validar campos adicionales
    if ($input['tipo_pago'] === 'refinanciar') {
        if (!isset($input['nuevo_plazo']) || !isset($input['nueva_tasa'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Para refinanciamiento se requieren nuevo_plazo y nueva_tasa']);
            return;
        }
    }
    
    // Iniciar transacción
    $db->beginTransaction();
    
    try {
        // 1. Obtener información del préstamo
        $prestamo = obtenerPrestamo($db, $input['prestamo_id']);
        if (!$prestamo) {
            throw new Exception("Préstamo no encontrado con ID: " . $input['prestamo_id']);
        }
        
        // 2. Calcular desglose
        $desglose = calcularDesgloseSimple($prestamo, $input);
        
        // 3. Registrar el pago
        $pagoId = registrarPagoSimple($db, $prestamo, $input, $desglose);
        
        // 4. Actualizar el préstamo
        actualizarPrestamoSimple($db, $prestamo['id'], $desglose, $input);
        
        // 5. Si es refinanciamiento, procesar
        if ($input['tipo_pago'] === 'refinanciar') {
            procesarRefinanciamientoSimple($db, $prestamo['id'], $input, $desglose);
        }
        
        // 6. Si el saldo es 0, marcar como pagado
        if ($desglose['nuevo_saldo'] <= 0.01) {
            $db->query("UPDATE prestamos SET estado = 'pagado' WHERE id = " . $prestamo['id']);
        }
        
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Pago registrado exitosamente',
            'pago_id' => $pagoId,
            'desglose' => $desglose,
            'prestamo' => [
                'id' => $prestamo['id'],
                'nuevo_saldo' => $desglose['nuevo_saldo'],
                'estado' => $desglose['nuevo_saldo'] <= 0.01 ? 'pagado' : 'activo'
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error al procesar el pago',
            'message' => $e->getMessage()
        ]);
    }
}

function obtenerPrestamo($db, $id) {
    $stmt = $db->prepare("SELECT * FROM prestamos WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function calcularDesgloseSimple($prestamo, $input) {
    $saldo = floatval($prestamo['saldo_actual']);
    $monto = floatval($input['monto_pagado']);
    $diasMora = isset($input['dias_mora']) ? intval($input['dias_mora']) : 0;
    
    // Cálculos simplificados para prueba
    $capital = min($monto, $saldo);
    $interes = $saldo * 0.01; // 1% de interés simple
    $mora = $diasMora > 0 ? $saldo * 0.001 * $diasMora : 0; // 0.1% por día
    $comision = $input['tipo_pago'] === 'refinanciar' ? $saldo * 0.01 : 0; // 1% para refinanciamiento
    
    $totalCargos = $interes + $mora + $comision;
    $capitalFinal = min($capital, max(0, $monto - $totalCargos));
    $nuevoSaldo = $saldo - $capitalFinal;
    
    return [
        'capital' => round($capitalFinal, 2),
        'interes' => round($interes, 2),
        'mora' => round($mora, 2),
        'comision' => round($comision, 2),
        'total_pagado' => round($monto, 2),
        'nuevo_saldo' => round($nuevoSaldo, 2)
    ];
}

function registrarPagoSimple($db, $prestamo, $input, $desglose) {
    $query = "INSERT INTO pagos (
        prestamo_id, 
        cliente_nombre, 
        fecha, 
        total_pagado, 
        capital, 
        interes, 
        mora, 
        comision, 
        saldo_restante,
        tipo_pago,
        metodo_pago,
        referencia,
        observaciones
    ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $db->prepare($query);
    $stmt->execute([
        $prestamo['id'],
        $prestamo['cliente_nombre'],
        $desglose['total_pagado'],
        $desglose['capital'],
        $desglose['interes'],
        $desglose['mora'],
        $desglose['comision'],
        $desglose['nuevo_saldo'],
        $input['tipo_pago'],
        $input['metodo_pago'] ?? 'efectivo',
        $input['referencia'] ?? null,
        $input['observaciones'] ?? null
    ]);
    
    return $db->lastInsertId();
}

function actualizarPrestamoSimple($db, $prestamoId, $desglose, $input) {
    // Determinar nuevo estado
    $nuevoEstado = 'normal';
    if ($desglose['nuevo_saldo'] <= 0.01) {
        $nuevoEstado = 'pagado';
    } elseif (isset($input['dias_mora']) && $input['dias_mora'] > 180) {
        $nuevoEstado = 'incobrable';
    } elseif (isset($input['dias_mora']) && $input['dias_mora'] > 0) {
        $nuevoEstado = 'mora';
    }
    
    $query = "UPDATE prestamos SET 
        saldo_actual = ?,
        ultimo_pago = NOW(),
        estado = ?
        WHERE id = ?";
    
    $stmt = $db->prepare($query);
    $stmt->execute([
        $desglose['nuevo_saldo'],
        $nuevoEstado,
        $prestamoId
    ]);
}

function procesarRefinanciamientoSimple($db, $prestamoId, $input, $desglose) {
    // 1. Crear nuevo préstamo
    $nuevoPlazo = intval($input['nuevo_plazo']);
    $nuevaTasa = floatval($input['nueva_tasa']);
    $nuevoMonto = $desglose['nuevo_saldo'];
    
    // Calcular nueva cuota
    $tasaMensual = ($nuevaTasa / 100) / 12;
    $nuevaCuota = ($nuevoMonto * $tasaMensual) / (1 - pow(1 + $tasaMensual, -$nuevoPlazo));
    
    // Insertar nuevo préstamo
    $query = "INSERT INTO prestamos (
        cliente_id, tipo, monto, plazo, tasa, 
        cliente_nombre, cuota, saldo_actual, estado,
        fecha_otorgamiento, origen_refinanciamiento
    ) 
    SELECT 
        cliente_id, 'refinanciado', ?, ?, ?,
        cliente_nombre, ?, ?, 'normal',
        NOW(), ?
    FROM prestamos WHERE id = ?";
    
    $stmt = $db->prepare($query);
    $stmt->execute([
        $nuevoMonto, $nuevoPlazo, $nuevaTasa,
        $nuevaCuota, $nuevoMonto,
        $prestamoId, $prestamoId
    ]);
    
    $nuevoPrestamoId = $db->lastInsertId();
    
    // 2. Marcar préstamo original como refinanciado
    $db->query("UPDATE prestamos SET estado = 'refinanciado', saldo_actual = 0 WHERE id = $prestamoId");
    
    return $nuevoPrestamoId;
}

function procesarPagoGET($db) {
    if (!isset($_GET['prestamo_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Parámetro prestamo_id requerido']);
        return;
    }
    
    $prestamoId = intval($_GET['prestamo_id']);
    
    $stmt = $db->prepare("SELECT * FROM pagos WHERE prestamo_id = ? ORDER BY fecha DESC");
    $stmt->execute([$prestamoId]);
    $pagos = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'pagos' => $pagos,
        'count' => count($pagos)
    ]);
}
?>