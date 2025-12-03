<?php
// amortizacion.php
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

$prestamo_id = $_GET['prestamo_id'] ?? 0;
$estado = $_GET['estado'] ?? '';

if (!$prestamo_id) {
    echo json_encode(['error' => 'Se requiere prestamo_id']);
    exit;
}

try {
    $sql = "SELECT * FROM amortizacion_frances WHERE prestamo_id = ?";
    $params = [$prestamo_id];
    
    if ($estado && in_array($estado, ['pendiente', 'pagada', 'vencida'])) {
        $sql .= " AND estado = ?";
        $params[] = $estado;
    }
    
    $sql .= " ORDER BY numero_cuota ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $cuotas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($cuotas);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>