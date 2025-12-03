<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$host = 'localhost'; $dbname = 'financiera_sv'; $username = 'root'; $password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Error BD: ' . $e->getMessage()]); exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $cliente_id = $_GET['cliente_id'] ?? null;
    
    if ($cliente_id) {
        // Listar estados financieros de un cliente específico
        $stmt = $pdo->prepare("SELECT * FROM estados_financieros WHERE cliente_id = ? ORDER BY anio DESC, fecha_corte DESC");
        $stmt->execute([$cliente_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        // Listar clientes que son JURIDICOS para el buscador
        $stmt = $pdo->query("SELECT c.id, c.codigo, cj.razon_social, cj.nit 
                             FROM clientes c 
                             JOIN clientes_juridicos cj ON c.id = cj.cliente_id 
                             ORDER BY cj.razon_social ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $sql = "INSERT INTO estados_financieros (
            cliente_id, anio, periodo, fecha_corte,
            activo_corriente, activo_no_corriente,
            pasivo_corriente, pasivo_no_corriente, patrimonio,
            ventas_ingresos, costo_ventas, gastos_operativos, 
            otros_gastos_ingresos, impuestos, utilidad_neta, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['cliente_id'], $data['anio'], $data['periodo'], $data['fecha_corte'],
            $data['activo_corriente'], $data['activo_no_corriente'],
            $data['pasivo_corriente'], $data['pasivo_no_corriente'], $data['patrimonio'],
            $data['ventas_ingresos'], $data['costo_ventas'], $data['gastos_operativos'],
            $data['otros_gastos_ingresos'], $data['impuestos'], $data['utilidad_neta'], $data['observaciones']
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Información financiera registrada']);
    } catch(PDOException $e) {
        echo json_encode(['error' => 'Error al guardar: ' . $e->getMessage()]);
    }
}
?>