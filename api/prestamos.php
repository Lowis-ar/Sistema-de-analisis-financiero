<?php
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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getPrestamos($pdo);
        break;
    case 'POST':
        createPrestamo($pdo);
        break;
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

function getPrestamos($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT p.*, c.nombre as cliente_nombre_completo 
            FROM prestamos p 
            LEFT JOIN clientes c ON p.cliente_id = c.id 
            ORDER BY p.fecha_otorgamiento DESC
        ");
        $prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($prestamos);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createPrestamo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['cliente_id']) || empty($data['monto']) || empty($data['plazo']) || empty($data['tasa'])) {
        echo json_encode(['error' => 'Datos incompletos']);
        return;
    }
    
    try {
        // Obtener información del cliente
        $stmt = $pdo->prepare("SELECT nombre FROM clientes WHERE id = ?");
        $stmt->execute([$data['cliente_id']]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cliente) {
            echo json_encode(['error' => 'Cliente no encontrado']);
            return;
        }
        
        // Calcular cuota (sistema francés)
        $monto = floatval($data['monto']);
        $tasaMensual = (floatval($data['tasa']) / 100) / 12;
        $plazo = intval($data['plazo']);
        
        if ($tasaMensual == 0) {
            $cuota = $monto / $plazo;
        } else {
            $factor = pow(1 + $tasaMensual, $plazo);
            $cuota = ($monto * $tasaMensual * $factor) / ($factor - 1);
        }
        
        $stmt = $pdo->prepare("INSERT INTO prestamos (cliente_id, tipo, monto, plazo, tasa, garantia, fiador, cliente_nombre, cuota, saldo_actual) 
                               VALUES (:cliente_id, :tipo, :monto, :plazo, :tasa, :garantia, :fiador, :cliente_nombre, :cuota, :saldo_actual)");
        
        $stmt->execute([
            ':cliente_id' => $data['cliente_id'],
            ':tipo' => $data['tipo'] ?? 'personal',
            ':monto' => $monto,
            ':plazo' => $plazo,
            ':tasa' => $data['tasa'],
            ':garantia' => $data['garantia'] ?? '',
            ':fiador' => $data['fiador'] ?? '',
            ':cliente_nombre' => $cliente['nombre'],
            ':cuota' => round($cuota, 2),
            ':saldo_actual' => $monto
        ]);
        
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Préstamo creado exitosamente',
            'cuota' => round($cuota, 2)
        ]);
        
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>