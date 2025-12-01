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
        getActivos($pdo);
        break;
    case 'POST':
        createActivo($pdo);
        break;
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

function getActivos($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM activos ORDER BY fecha_compra DESC");
        $activos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($activos);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createActivo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['descripcion']) || empty($data['valor']) || empty($data['fecha_compra'])) {
        echo json_encode(['error' => 'Datos incompletos']);
        return;
    }
    
    // Configuración de depreciación
    $depreciacion_config = [
        'edificaciones' => ['porcentaje' => 0.05, 'vida' => 20],
        'maquinaria' => ['porcentaje' => 0.20, 'vida' => 5],
        'vehiculos' => ['porcentaje' => 0.25, 'vida' => 4],
        'otros' => ['porcentaje' => 0.50, 'vida' => 2]
    ];
    
    $tipo = $data['tipo'] ?? 'edificaciones';
    $depreciacion = $depreciacion_config[$tipo] ?? $depreciacion_config['otros'];
    
    // Generar código único
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM activos");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $correlativo = $result['total'] + 1;
    
    $codigo = $data['institucion'] . '-' . $data['unidad'] . '-ACT-' . str_pad($correlativo, 4, '0', STR_PAD_LEFT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO activos (institucion, unidad, tipo, descripcion, valor, fecha_compra, codigo, vida_util, porcentaje_depreciacion) 
                               VALUES (:institucion, :unidad, :tipo, :descripcion, :valor, :fecha_compra, :codigo, :vida_util, :porcentaje_depreciacion)");
        
        $stmt->execute([
            ':institucion' => $data['institucion'] ?? '2322',
            ':unidad' => $data['unidad'] ?? '0001',
            ':tipo' => $tipo,
            ':descripcion' => $data['descripcion'],
            ':valor' => floatval($data['valor']),
            ':fecha_compra' => $data['fecha_compra'],
            ':codigo' => $codigo,
            ':vida_util' => $depreciacion['vida'],
            ':porcentaje_depreciacion' => $depreciacion['porcentaje']
        ]);
        
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Activo registrado exitosamente',
            'codigo' => $codigo
        ]);
        
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>