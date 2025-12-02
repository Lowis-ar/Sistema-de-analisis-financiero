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
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
// Usamos 'modulo' para saber si operamos sobre la garantía, sus seguros o sus tipos
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
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

// ---------------------------------------------------------
// 1. FUNCIONES PRINCIPALES (GARANTÍAS)
// ---------------------------------------------------------

function getGarantias($pdo) {
    try {
        $sql = "SELECT g.*, tg.nombre as tipo_nombre, c.nombre as cliente_nombre 
                FROM garantias g
                JOIN tipos_garantia tg ON g.tipo_garantia_id = tg.id
                JOIN clientes c ON g.cliente_id = c.id
                ORDER BY g.fecha_registro DESC";
        $stmt = $pdo->query($sql);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch(PDOException $e) {
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
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['cliente_id']) || empty($data['tipo_garantia_id']) || empty($data['valor_comercial'])) {
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
    $codigo = 'GAR-' . str_pad($row['total'] + 1, 5, '0', STR_PAD_LEFT);

    try {
        $sql = "INSERT INTO garantias (cliente_id, tipo_garantia_id, codigo_interno, descripcion_bien, ubicacion_fisica, valor_comercial, valor_realizacion, folio_rug, fecha_inscripcion_rug, estado) 
                VALUES (:cid, :tid, :cod, :desc, :ubi, :vc, :vr, :rug, :frug, 'tramite')";
        
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
            ':frug' => $data['fecha_inscripcion_rug'] ?? null
        ]);

        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId(), 'codigo' => $codigo, 'message' => 'Garantía creada']);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// 2. FUNCIONES DE SEGUROS (Alertas de Pólizas)
// ---------------------------------------------------------

function getSeguros($pdo) {
    $garantia_id = $_GET['id'] ?? 0;
    $stmt = $pdo->prepare("SELECT * FROM garantias_seguros WHERE garantia_id = ? ORDER BY fecha_vencimiento ASC");
    $stmt->execute([$garantia_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

function createSeguro($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['garantia_id']) || empty($data['numero_poliza'])) {
        echo json_encode(['error' => 'Faltan datos de la póliza']); 
        return;
    }
    
    try {
        $sql = "INSERT INTO garantias_seguros (garantia_id, aseguradora, numero_poliza, fecha_inicio, fecha_vencimiento, monto_asegurado, estado)
                VALUES (:gid, :aseg, :num, :fini, :ffin, :monto, 'vigente')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':gid' => $data['garantia_id'],
            ':aseg' => $data['aseguradora'],
            ':num' => $data['numero_poliza'],
            ':fini' => $data['fecha_inicio'],
            ':ffin' => $data['fecha_vencimiento'],
            ':monto' => $data['monto_asegurado']
        ]);
        echo json_encode(['success' => true, 'message' => 'Seguro registrado']);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// 3. FUNCIONES DE AVALÚOS (Actualización de Valor)
// ---------------------------------------------------------

function getAvaluos($pdo) {
    $garantia_id = $_GET['id'] ?? 0;
    $stmt = $pdo->prepare("SELECT * FROM garantias_avaluos WHERE garantia_id = ? ORDER BY fecha_avaluo DESC");
    $stmt->execute([$garantia_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

function createAvaluo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $pdo->beginTransaction();
        
        // Registrar el avalúo histórico
        $sql = "INSERT INTO garantias_avaluos (garantia_id, perito_nombre, fecha_avaluo, valor_asignado, observaciones)
                VALUES (:gid, :perito, :fecha, :valor, :obs)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':gid' => $data['garantia_id'],
            ':perito' => $data['perito_nombre'],
            ':fecha' => $data['fecha_avaluo'],
            ':valor' => $data['valor_asignado'],
            ':obs' => $data['observaciones'] ?? ''
        ]);
        
        // ACTUALIZAR la garantía principal con el nuevo valor
        $nuevo_valor = $data['valor_asignado'];
        $nuevo_castigo = $nuevo_valor * 0.70;
        
        $upd = $pdo->prepare("UPDATE garantias SET valor_comercial = ?, valor_realizacion = ? WHERE id = ?");
        $upd->execute([$nuevo_valor, $nuevo_castigo, $data['garantia_id']]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Avalúo registrado y valor actualizado']);
    } catch(PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>