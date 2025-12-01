<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        procesarPago();
        break;
    case 'GET':
        getPagos();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}

function procesarPago() {
    global $conn;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $conn->beginTransaction();
        
        // Obtener información del préstamo
        $stmt = $conn->prepare("SELECT * FROM prestamos WHERE id = :prestamo_id");
        $stmt->execute([':prestamo_id' => $data['prestamo_id']]);
        $prestamo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$prestamo) {
            throw new Exception('Préstamo no encontrado');
        }
        
        $interes = $prestamo['saldo_actual'] * (($prestamo['tasa'] / 100) / 12);
        $capital = $data['monto_pagado'] - $interes - $data['mora'] - $data['comision'];
        $nuevoSaldo = $prestamo['saldo_actual'] - $capital;
        $estado = $nuevoSaldo <= 0.1 ? 'pagado' : 'normal';
        
        // Actualizar préstamo
        $stmt = $conn->prepare("UPDATE prestamos SET saldo_actual = :saldo_actual, estado = :estado, ultimo_pago = NOW() WHERE id = :id");
        $stmt->execute([
            ':saldo_actual' => max(0, $nuevoSaldo),
            ':estado' => $estado,
            ':id' => $data['prestamo_id']
        ]);
        
        // Registrar pago
        $stmt = $conn->prepare("INSERT INTO pagos (prestamo_id, cliente_nombre, total_pagado, capital, interes, mora, comision, saldo_restante) 
                               VALUES (:prestamo_id, :cliente_nombre, :total_pagado, :capital, :interes, :mora, :comision, :saldo_restante)");
        
        $stmt->execute([
            ':prestamo_id' => $data['prestamo_id'],
            ':cliente_nombre' => $prestamo['cliente_nombre'],
            ':total_pagado' => $data['monto_pagado'],
            ':capital' => $capital,
            ':interes' => $interes,
            ':mora' => $data['mora'],
            ':comision' => $data['comision'],
            ':saldo_restante' => max(0, $nuevoSaldo)
        ]);
        
        $conn->commit();
        
        echo json_encode(['message' => 'Pago procesado exitosamente', 'nuevo_saldo' => max(0, $nuevoSaldo)]);
    } catch(Exception $exception) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $exception->getMessage()]);
    }
}

function getPagos() {
    global $conn;
    
    try {
        $prestamo_id = $_GET['prestamo_id'] ?? null;
        
        if ($prestamo_id) {
            $stmt = $conn->prepare("SELECT * FROM pagos WHERE prestamo_id = :prestamo_id ORDER BY fecha DESC");
            $stmt->execute([':prestamo_id' => $prestamo_id]);
        } else {
            $stmt = $conn->query("SELECT * FROM pagos ORDER BY fecha DESC");
        }
        
        $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($pagos);
    } catch(PDOException $exception) {
        http_response_code(500);
        echo json_encode(['error' => $exception->getMessage()]);
    }
}
?>