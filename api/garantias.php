<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$dbname = 'financiera_sv';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
// El parámetro 'modulo' decide qué tabla secundaria vamos a tocar
$modulo = $_GET['modulo'] ?? 'general'; 

switch ($method) {
    case 'GET':
        if ($modulo === 'tipos') getTiposGarantia($pdo);
        elseif ($modulo === 'seguros') getSeguros($pdo);
        elseif ($modulo === 'avaluos') getAvaluos($pdo);
        else getGarantias($pdo);
        break;
        
    case 'POST':
        if ($modulo === 'seguros') createSeguro($pdo);
        elseif ($modulo === 'avaluos') createAvaluo($pdo);
        else createGarantia($pdo);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

// ---------------------------------------------------------
// 1. FUNCIONES PRINCIPALES (GARANTÍAS)
// ---------------------------------------------------------

function getGarantias($pdo) {
    try {
        // MEJORA SQL: Usamos LEFT JOIN para traer el nombre correcto
        // Si es empresa (clientes_juridicos), usamos razon_social. Si es natural, usamos nombre.
        $sql = "SELECT g.*, 
                       tg.nombre as tipo_nombre, 
                       COALESCE(cj.razon_social, c.nombre) as cliente_nombre 
                FROM garantias g
                LEFT JOIN tipos_garantia tg ON g.tipo_garantia_id = tg.id
                LEFT JOIN clientes c ON g.cliente_id = c.id
                LEFT JOIN clientes_juridicos cj ON c.id = cj.cliente_id
                ORDER BY g.fecha_registro DESC";
        
        $stmt = $pdo->query($sql);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Devolver array vacío en lugar de null si no hay datos
        echo json_encode($result ?: []);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getTiposGarantia($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM tipos_garantia");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createGarantia($pdo) {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (empty($data['cliente_id']) || empty($data['tipo_garantia_id']) || empty($data['valor_comercial'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Cliente, Tipo y Valor Comercial son requeridos']);
        return;
    }

    // Regla de Negocio: Valor de Realización (Castigo)
    // Si no se envía, calculamos el 70% del valor comercial (común en bancos)
    $val_com = floatval($data['valor_comercial']);
    $val_real = !empty($data['valor_realizacion']) ? floatval($data['valor_realizacion']) : ($val_com * 0.70);

    // Generar Código Interno (GAR-0001)
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM garantias");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $correlativo = $row['total'] + 1;
    $codigo = 'GAR-' . str_pad($correlativo, 5, '0', STR_PAD_LEFT);

    try {
        $sql = "INSERT INTO garantias (
                    cliente_id, tipo_garantia_id, codigo_interno, descripcion_bien, 
                    ubicacion_fisica, valor_comercial, valor_realizacion, 
                    folio_rug, fecha_inscripcion_rug, estado
                ) VALUES (
                    :cid, :tid, :cod, :desc, 
                    :ubi, :vc, :vr, 
                    :rug, :frug, :est
                )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':cid' => $data['cliente_id'],
            ':tid' => $data['tipo_garantia_id'],
            ':cod' => $codigo,
            ':desc' => $data['descripcion_bien'] ?? 'S/D',
            ':ubi' => $data['ubicacion_fisica'] ?? '',
            ':vc' => $val_com,
            ':vr' => $val_real,
            ':rug' => $data['folio_rug'] ?? null,
            ':frug' => !empty($data['fecha_inscripcion_rug']) ? $data['fecha_inscripcion_rug'] : null,
            ':est' => $data['estado'] ?? 'tramite'
        ]);

        echo json_encode([
            'success' => true, 
            'id' => $pdo->lastInsertId(), 
            'codigo' => $codigo, 
            'message' => 'Garantía registrada correctamente'
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar: ' . $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// 2. FUNCIONES DE SEGUROS (Alertas de Pólizas)
// ---------------------------------------------------------

function getSeguros($pdo) {
    $garantia_id = $_GET['id'] ?? 0;
    try {
        $stmt = $pdo->prepare("SELECT * FROM garantias_seguros WHERE garantia_id = ? ORDER BY fecha_vencimiento ASC");
        $stmt->execute([$garantia_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createSeguro($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['garantia_id']) || empty($data['numero_poliza'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan datos de la póliza']); 
        return;
    }
    
    try {
        $sql = "INSERT INTO garantias_seguros (garantia_id, aseguradora, numero_poliza, fecha_inicio, fecha_vencimiento, monto_asegurado, estado)
                VALUES (:gid, :aseg, :num, :fini, :ffin, :monto, 'vigente')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':gid' => $data['garantia_id'],
            ':aseg' => $data['aseguradora'] ?? '',
            ':num' => $data['numero_poliza'],
            ':fini' => $data['fecha_inicio'] ?? date('Y-m-d'),
            ':ffin' => $data['fecha_vencimiento'],
            ':monto' => $data['monto_asegurado'] ?? 0
        ]);
        echo json_encode(['success' => true, 'message' => 'Seguro registrado']);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// 3. FUNCIONES DE AVALÚOS (Actualización de Valor)
// ---------------------------------------------------------

function getAvaluos($pdo) {
    $garantia_id = $_GET['id'] ?? 0;
    try {
        $stmt = $pdo->prepare("SELECT * FROM garantias_avaluos WHERE garantia_id = ? ORDER BY fecha_avaluo DESC");
        $stmt->execute([$garantia_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createAvaluo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['garantia_id']) || empty($data['valor_asignado'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos de avalúo incompletos']);
        return;
    }

    try {
        $pdo->beginTransaction();
        
        // 1. Registrar el avalúo histórico
        $sql = "INSERT INTO garantias_avaluos (garantia_id, perito_nombre, fecha_avaluo, valor_asignado, observaciones)
                VALUES (:gid, :perito, :fecha, :valor, :obs)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':gid' => $data['garantia_id'],
            ':perito' => $data['perito_nombre'] ?? 'Interno',
            ':fecha' => $data['fecha_avaluo'] ?? date('Y-m-d'),
            ':valor' => $data['valor_asignado'],
            ':obs' => $data['observaciones'] ?? ''
        ]);
        
        // 2. ACTUALIZAR AUTOMÁTICAMENTE el valor de la garantía principal
        // Si el avalúo cambia, el valor del activo en libros cambia.
        $nuevo_valor = $data['valor_asignado'];
        $nuevo_castigo = $nuevo_valor * 0.70; // Mantener regla del 70%
        
        $upd = $pdo->prepare("UPDATE garantias SET valor_comercial = ?, valor_realizacion = ? WHERE id = ?");
        $upd->execute([$nuevo_valor, $nuevo_castigo, $data['garantia_id']]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Avalúo registrado y valor actualizado']);
        
    } catch(PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error en transacción: ' . $e->getMessage()]);
    }
}
?>