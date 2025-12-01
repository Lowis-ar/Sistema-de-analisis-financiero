<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de la base de datos
$host = 'localhost';
$dbname = 'financiera_sv';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getClientes($pdo);
        break;
    case 'POST':
        createCliente($pdo);
        break;
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

function getClientes($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM clientes ORDER BY fecha_registro DESC");
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($clientes);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createCliente($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validaciones básicas
    if (empty($data['nombre']) || empty($data['codigo'])) {
        echo json_encode(['error' => 'Nombre y código son requeridos']);
        return;
    }
    
    // Calcular capacidad de pago
    $ingresos = floatval($data['ingresos'] ?? 0);
    $egresos = floatval($data['egresos'] ?? 0);
    $capacidad_pago = $ingresos - $egresos;
    
    // Determinar calificación
    $calificacion = 'A';
    if ($capacidad_pago < 0) $calificacion = 'D';
    elseif ($capacidad_pago < 500) $calificacion = 'C';
    elseif ($capacidad_pago < 1000) $calificacion = 'B';
    
    try {
        $stmt = $pdo->prepare("INSERT INTO clientes (tipo, nombre, codigo, dui, direccion, ingresos, egresos, telefono, capacidad_pago, calificacion) 
                               VALUES (:tipo, :nombre, :codigo, :dui, :direccion, :ingresos, :egresos, :telefono, :capacidad_pago, :calificacion)");
        
        $stmt->execute([
            ':tipo' => $data['tipo'] ?? 'natural',
            ':nombre' => $data['nombre'],
            ':codigo' => $data['codigo'],
            ':dui' => $data['dui'] ?? '',
            ':direccion' => $data['direccion'] ?? '',
            ':ingresos' => $ingresos,
            ':egresos' => $egresos,
            ':telefono' => $data['telefono'] ?? '',
            ':capacidad_pago' => $capacidad_pago,
            ':calificacion' => $calificacion
        ]);
        
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Cliente registrado exitosamente'
        ]);
        
    } catch(PDOException $e) {
        // Si es error de duplicado de código
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            echo json_encode(['error' => 'El código del cliente ya existe']);
        } else {
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
?>