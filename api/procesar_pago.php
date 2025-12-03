<?php
// procesar_pago.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$host = 'localhost';
$dbname = 'financiera_sv';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Error de conexión']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['prestamo_id'], $data['monto_pagado'])) {
    echo json_encode(['error' => 'Faltan parámetros']);
    exit;
}

$prestamo_id = $data['prestamo_id'];
$monto_pagado = floatval($data['monto_pagado']);
$fecha_pago = $data['fecha_pago'] ?? date('Y-m-d');
$metodo_pago = $data['metodo_pago'] ?? 'efectivo';
$referencia = $data['referencia'] ?? '';

try {
    $pdo->beginTransaction();
    
    // 1. Obtener información del préstamo
    $stmt = $pdo->prepare("SELECT * FROM prestamos WHERE id = ?");
    $stmt->execute([$prestamo_id]);
    $prestamo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$prestamo) {
        throw new Exception('Préstamo no encontrado');
    }
    
    // 2. Buscar cuota pendiente más antigua
    $stmt = $pdo->prepare("
        SELECT * FROM amortizacion_frances 
        WHERE prestamo_id = ? AND estado = 'pendiente'
        ORDER BY numero_cuota ASC
        LIMIT 1
    ");
    $stmt->execute([$prestamo_id]);
    $cuota = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$cuota) {
        throw new Exception('No hay cuotas pendientes');
    }
    
    // 3. Calcular mora (5 días de gracia)
    $dias_vencido = 0;
    if ($fecha_pago > $cuota['fecha_vencimiento']) {
        $date1 = new DateTime($cuota['fecha_vencimiento']);
        $date2 = new DateTime($fecha_pago);
        $interval = $date1->diff($date2);
        $dias_vencido = max(0, $interval->days - 5);
    }
    
    $mora = 0;
    if ($dias_vencido > 0) {
        // Tasa mora diaria: 24% anual = 0.06575% diario
        $mora = $cuota['cuota_total'] * 0.0006575 * $dias_vencido;
        $mora = round($mora, 2);
    }
    
    $total_a_pagar = $cuota['cuota_total'] + $mora;
    
    // 4. Verificar si el pago cubre la cuota
    if ($monto_pagado < $total_a_pagar) {
        throw new Exception('Pago insuficiente. Se requiere: $' . number_format($total_a_pagar, 2));
    }
    
    // 5. Calcular nuevo saldo
    $nuevo_saldo = $prestamo['saldo_actual'] - $cuota['capital_cuota'];
    
    // 6. Registrar pago en tabla 'pagos'
    $stmt = $pdo->prepare("
        INSERT INTO pagos 
        (prestamo_id, cliente_nombre, fecha, total_pagado, capital, interes, mora, comision, saldo_restante)
        VALUES (?, ?, NOW(), ?, ?, ?, ?, 0, ?)
    ");
    
    $stmt->execute([
        $prestamo_id,
        $prestamo['cliente_nombre'],
        $monto_pagado,
        $cuota['capital_cuota'],
        $cuota['interes_cuota'],
        $mora,
        $nuevo_saldo
    ]);
    
    // 7. Actualizar cuota como pagada
    $stmt = $pdo->prepare("
        UPDATE amortizacion_frances 
        SET estado = 'pagada', 
            fecha_pago = ?,
            mora_generada = ?
        WHERE id = ?
    ");
    $stmt->execute([$fecha_pago, $mora, $cuota['id']]);
    
    // 8. Actualizar préstamo
    $nuevo_estado = ($nuevo_saldo <= 0) ? 'cancelado' : 'normal';
    
    $stmt = $pdo->prepare("
        UPDATE prestamos 
        SET saldo_actual = ?,
            ultimo_pago = NOW(),
            dias_mora = 0,
            estado = ?
        WHERE id = ?
    ");
    $stmt->execute([$nuevo_saldo, $nuevo_estado, $prestamo_id]);
    
    // 9. Manejar excedente (simple - no recursivo por simplicidad)
    $excedente = $monto_pagado - $total_a_pagar;
    $cuotas_extra = 0;
    
    if ($excedente > 1 && $nuevo_saldo > 0) {
        // Solo informar del excedente
        $excedente_msg = "Excedente de $" . number_format($excedente, 2) . " no aplicado a siguiente cuota.";
    } else {
        $excedente_msg = "";
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Pago registrado exitosamente' . ($excedente_msg ? '. ' . $excedente_msg : ''),
        'cuota_pagada' => $cuota['numero_cuota'],
        'mora_aplicada' => $mora,
        'nuevo_saldo' => $nuevo_saldo,
        'excedente' => $excedente
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['error' => $e->getMessage()]);
}
?>