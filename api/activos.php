<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de conexión
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
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'bajas') {
            getBajasActivos($pdo);
        } else {
            getActivos($pdo);
        }
        break;
    case 'POST':
        createActivo($pdo);
        break;
    case 'DELETE':
        darBajaActivo($pdo);
        break;
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

function getActivos($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT a.*, t.nombre as tipo_nombre 
            FROM activos a
            LEFT JOIN tipos_activo t ON a.tipo_codigo = t.codigo
            ORDER BY a.estado, a.fecha_compra DESC
        ");
        $activos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($activos);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBajasActivos($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                b.*, 
                a.descripcion,
                a.codigo,
                a.valor as valor_original,
                a.fecha_compra,
                a.tipo,
                a.unidad,
                a.institucion,
                DATE(b.fecha_baja) as fecha_baja_formatted
            FROM bajas_activos b
            JOIN activos a ON b.activo_id = a.id
            ORDER BY b.fecha_baja DESC, b.fecha_registro DESC
        ");
        $bajas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($bajas);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createActivo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['descripcion']) || empty($data['valor']) || empty($data['fecha_compra'])) {
        echo json_encode(['error' => 'Datos incompletos: descripcion, valor y fecha_compra son requeridos']);
        return;
    }
    
    // Obtener configuración de depreciación según tipo
    $tipoCodigo = $data['tipo_codigo'] ?? '0100';
    
    $stmt = $pdo->prepare("SELECT * FROM tipos_activo WHERE codigo = ?");
    $stmt->execute([$tipoCodigo]);
    $tipoActivo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tipoActivo) {
        // Si no existe, usar valores por defecto
        $tipoActivo = ['porcentaje_depreciacion' => 0.10, 'vida_util' => 10];
    }
    
    // GENERAR CÓDIGO SEGÚN ESPECIFICACIÓN: INSTITUCION-UNIDAD-TIPO-CORRELATIVO
    $institucion = $data['institucion'] ?? '2322';
    $unidadCodigo = $data['unidad_codigo'] ?? '5676';
    
    // Buscar último correlativo para esta combinación
    $sql = "SELECT MAX(CAST(SUBSTRING_INDEX(codigo, '-', -1) AS UNSIGNED)) as max_correlativo 
            FROM activos 
            WHERE institucion = ? 
            AND unidad_codigo = ? 
            AND tipo_codigo = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$institucion, $unidadCodigo, $tipoCodigo]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $correlativo = ($result['max_correlativo'] ?: 0) + 1;
    
    // Formato: 2322-5676-8871-0001
    $codigo = $institucion . '-' . 
              $unidadCodigo . '-' . 
              $tipoCodigo . '-' . 
              str_pad($correlativo, 4, '0', STR_PAD_LEFT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO activos 
            (institucion, unidad, unidad_codigo, tipo, tipo_codigo, descripcion, valor, 
             fecha_compra, codigo, vida_util, porcentaje_depreciacion, correlativo) 
            VALUES (:institucion, :unidad, :unidad_codigo, :tipo, :tipo_codigo, :descripcion, :valor, 
                    :fecha_compra, :codigo, :vida_util, :porcentaje_depreciacion, :correlativo)");
        
        $stmt->execute([
            ':institucion' => $institucion,
            ':unidad' => $data['unidad'] ?? 'Administración',
            ':unidad_codigo' => $unidadCodigo,
            ':tipo' => $tipoActivo['nombre'] ?? $data['tipo'] ?? 'Edificaciones',
            ':tipo_codigo' => $tipoCodigo,
            ':descripcion' => $data['descripcion'],
            ':valor' => floatval($data['valor']),
            ':fecha_compra' => $data['fecha_compra'],
            ':codigo' => $codigo,
            ':vida_util' => $tipoActivo['vida_util'],
            ':porcentaje_depreciacion' => $tipoActivo['porcentaje_depreciacion'],
            ':correlativo' => $correlativo
        ]);
        
        // Calcular y guardar depreciación inicial
        calcularYGuardarDepreciacion($pdo, $pdo->lastInsertId());
        
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Activo registrado exitosamente',
            'codigo' => $codigo,
            'tipo_info' => $tipoActivo
        ]);
        
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function darBajaActivo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['activo_id']) || empty($data['motivo']) || empty($data['fecha_baja'])) {
        echo json_encode(['error' => 'Datos incompletos para baja']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // 1. Registrar en tabla de bajas
        $stmt = $pdo->prepare("INSERT INTO bajas_activos 
            (activo_id, fecha_baja, motivo, valor_venta, receptor, observaciones) 
            VALUES (?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $data['activo_id'],
            $data['fecha_baja'],
            $data['motivo'],
            $data['valor_venta'] ?? null,
            $data['receptor'] ?? null,
            $data['observaciones'] ?? null
        ]);
        
        // 2. Actualizar estado en tabla activos
        $stmt = $pdo->prepare("UPDATE activos 
            SET estado = 'baja', 
                fecha_baja = ?, 
                motivo_baja = ? 
            WHERE id = ?");
        
        $stmt->execute([
            $data['fecha_baja'],
            $data['motivo'],
            $data['activo_id']
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Activo dado de baja exitosamente'
        ]);
        
    } catch(PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// Función para calcular y guardar depreciación
function calcularYGuardarDepreciacion($pdo, $activoId) {
    $stmt = $pdo->prepare("SELECT * FROM activos WHERE id = ?");
    $stmt->execute([$activoId]);
    $activo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$activo) return;
    
    $fechaCompra = new DateTime($activo['fecha_compra']);
    $hoy = new DateTime();
    $diasTranscurridos = $hoy->diff($fechaCompra)->days;
    
    // Calcular depreciación diaria
    $depreciacionAnual = $activo['valor'] * $activo['porcentaje_depreciacion'];
    $depreciacionDiaria = $depreciacionAnual / 365;
    
    // Máximo días a depreciar
    $diasVidaUtil = $activo['vida_util'] * 365;
    $diasDepreciables = min($diasTranscurridos, $diasVidaUtil);
    
    $depreciacionAcumulada = $depreciacionDiaria * $diasDepreciables;
    $valorLibros = max(0, $activo['valor'] - $depreciacionAcumulada);
    
    // Guardar en tabla depreciación diaria
    $stmt = $pdo->prepare("INSERT INTO depreciacion_diaria 
        (activo_id, fecha, depreciacion_diaria, depreciacion_acumulada, valor_libros) 
        VALUES (?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $activoId,
        $hoy->format('Y-m-d'),
        $depreciacionDiaria,
        $depreciacionAcumulada,
        $valorLibros
    ]);
}
?>