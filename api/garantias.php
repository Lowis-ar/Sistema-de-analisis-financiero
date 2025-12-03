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
    case 'PUT':
    updateGarantia($pdo);
    break;
    case 'DELETE':
    deleteGarantia($pdo);
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
        // Traemos fecha de vencimiento seguro Y último perito
        $sql = "SELECT g.*, 
                       tg.nombre as tipo_nombre, 
                       COALESCE(cj.razon_social, c.nombre) as cliente_nombre,
                       (SELECT fecha_vencimiento FROM garantias_seguros gs WHERE gs.garantia_id = g.id AND gs.estado = 'vigente' ORDER BY gs.fecha_vencimiento ASC LIMIT 1) as fecha_vencimiento_seguro,
                       (SELECT perito_nombre FROM garantias_avaluos ga WHERE ga.garantia_id = g.id ORDER BY ga.fecha_avaluo DESC LIMIT 1) as ultimo_perito,
                       (SELECT COUNT(*) FROM creditos_garantias_vinculo cgv INNER JOIN creditos_corporativos cc ON cgv.credito_id = cc.id WHERE cgv.referencia_id = g.id AND cgv.origen_tabla = 'garantia_bien' AND cc.estado IN ('activo', 'mora', 'judicial')) as en_uso_activo
                FROM garantias g
                LEFT JOIN tipos_garantia tg ON g.tipo_garantia_id = tg.id
                LEFT JOIN clientes c ON g.cliente_id = c.id
                LEFT JOIN clientes_juridicos cj ON c.id = cj.cliente_id
                ORDER BY g.fecha_registro DESC";
        echo json_encode($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: []);
    } catch(PDOException $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
}


function updateGarantia($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Falta ID para actualizar']);
        return;
    }

    try {
        validateGarantiaData($data);

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("UPDATE garantias 
                               SET cliente_id = ?, tipo_garantia_id = ?, descripcion_bien = ?, ubicacion_fisica = ?, 
                                   valor_comercial = ?, valor_realizacion = ?, folio_rug = ?, fecha_inscripcion_rug = ?, estado = ? 
                               WHERE id = ?");

        $stmt->execute([
            $data['cliente_id'],
            $data['tipo_garantia_id'],
            $data['descripcion_bien'],
            $data['ubicacion_fisica'],
            $data['valor_comercial'],
            $data['valor_realizacion'],
            $data['folio_rug'],
            !empty($data['fecha_inscripcion_rug']) ? $data['fecha_inscripcion_rug'] : null,
            $data['estado'],
            $data['id']
        ]);

        // Actualizar el avalúo si se proporciona el número de registro del perito
        if (!empty($data['numero_registro_perito'])) {
            $stmtVal = $pdo->prepare("UPDATE garantias_avaluos 
                                      SET numero_registro_perito = ? 
                                      WHERE garantia_id = ? 
                                      ORDER BY fecha_avaluo DESC LIMIT 1");
            $stmtVal->execute([
                $data['numero_registro_perito'],
                $data['id']
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Garantía actualizada correctamente']);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
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

function validateGarantiaData($data) {
    if (empty($data['cliente_id']) || !is_numeric($data['cliente_id'])) {
        throw new Exception('El cliente es obligatorio y debe ser válido.');
    }

    if (empty($data['tipo_garantia_id']) || !is_numeric($data['tipo_garantia_id'])) {
        throw new Exception('El tipo de garantía es obligatorio y debe ser válido.');
    }

    if (empty($data['descripcion_bien']) || strlen($data['descripcion_bien']) > 255) {
        throw new Exception('La descripción del bien es obligatoria y no debe exceder 255 caracteres.');
    }

    if (empty($data['valor_comercial']) || !is_numeric($data['valor_comercial']) || $data['valor_comercial'] <= 0) {
        throw new Exception('El valor comercial debe ser un número mayor a 0.');
    }

    if (!empty($data['numero_registro_perito']) && !preg_match('/^[a-zA-Z0-9-]+$/', $data['numero_registro_perito'])) {
        throw new Exception('El número de registro del perito contiene caracteres inválidos.');
    }

    if (!empty($data['folio_rug']) && !preg_match('/^[a-zA-Z0-9-]+$/', $data['folio_rug'])) {
        throw new Exception('El folio RUG contiene caracteres inválidos.');
    }

    if (!empty($data['fecha_inscripcion_rug']) && !strtotime($data['fecha_inscripcion_rug'])) {
        throw new Exception('La fecha de inscripción RUG no es válida.');
    }

    if (!in_array($data['estado'], ['tramite', 'vigente', 'deteriorada', 'liberada'])) {
        throw new Exception('El estado seleccionado no es válido.');
    }

    if (!empty($data['aseguradora']) || !empty($data['numero_poliza']) || !empty($data['fecha_vencimiento_seguro'])) {
        if (empty($data['aseguradora'])) {
            throw new Exception('Debe ingresar el nombre de la aseguradora.');
        }
        if (empty($data['numero_poliza'])) {
            throw new Exception('Debe ingresar el número de póliza.');
        }
        if (empty($data['fecha_vencimiento_seguro']) || !strtotime($data['fecha_vencimiento_seguro'])) {
            throw new Exception('Debe ingresar una fecha de vencimiento válida para el seguro.');
        }
    }
}

function createGarantia($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['cliente_id']) || empty($data['valor_comercial'])) {
        http_response_code(400); echo json_encode(['error' => 'Datos incompletos']); return;
    }

    try {
        validateGarantiaData($data);

        $pdo->beginTransaction();
        
        // 1. INSERTAR GARANTÍA MAESTRA
        $anio = date('Y');
        $corr = $pdo->query("SELECT COUNT(*) FROM garantias")->fetchColumn() + 1;
        $codigo = "GAR-$anio-" . str_pad($corr, 4, '0', STR_PAD_LEFT);

        $valCom = floatval($data['valor_comercial']);
        $valReal = floatval($data['valor_realizacion']);

        $stmt = $pdo->prepare("INSERT INTO garantias (cliente_id, tipo_garantia_id, codigo_interno, descripcion_bien, ubicacion_fisica, valor_comercial, valor_realizacion, folio_rug, fecha_inscripcion_rug, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['cliente_id'], $data['tipo_garantia_id'], $codigo, 
            $data['descripcion_bien'], $data['ubicacion_fisica'] ?? '', 
            $valCom, $valReal, 
            $data['folio_rug'] ?? null, !empty($data['fecha_inscripcion_rug']) ? $data['fecha_inscripcion_rug'] : null, 
            $data['estado'] ?? 'tramite'
        ]);
        $id = $pdo->lastInsertId();

        // 2. INSERTAR AVALÚO INICIAL (CORRECCIÓN: Esto faltaba)
       $stmtAv = $pdo->prepare("INSERT INTO garantias_avaluos 
    (garantia_id, perito_nombre, fecha_avaluo, valor_asignado, observaciones, numero_registro_perito) 
    VALUES (?, ?, CURDATE(), ?, ?, ?)");
$stmtAv->execute([
    $id,
    $data['perito_nombre'] ?? 'Valor Estimado Inicial',
    $valCom,
    'Avalúo al registro inicial',
    $data['numero_registro_perito'] ?? null
]);


        // 3. INSERTAR SEGURO (Opcional)
        if (!empty($data['numero_poliza'])) {
            $stmtSeg = $pdo->prepare("INSERT INTO garantias_seguros (garantia_id, aseguradora, numero_poliza, fecha_inicio, fecha_vencimiento, monto_asegurado, estado) VALUES (?, ?, ?, CURDATE(), ?, ?, 'vigente')");
            $stmtSeg->execute([
                $id, $data['aseguradora'], $data['numero_poliza'], 
                $data['fecha_vencimiento_seguro'], $valCom
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Garantía y Avalúo registrados']);

    } catch(Exception $e) {
        $pdo->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
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
    // ... (Tu código existente para actualizar avalúos posteriores) ...
    // Recuerda que este también debe actualizar la tabla 'garantias' con el nuevo valor.
    $data = json_decode(file_get_contents('php://input'), true);
    try {
        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO garantias_avaluos (garantia_id, perito_nombre, fecha_avaluo, valor_asignado, observaciones) VALUES (?, ?, ?, ?, ?)")
            ->execute([$data['garantia_id'], $data['perito_nombre'], $data['fecha_avaluo'], $data['valor_asignado'], $data['observaciones']]);
            
        $nuevoReal = $data['valor_asignado'] * 0.70;
        $pdo->prepare("UPDATE garantias SET valor_comercial=?, valor_realizacion=? WHERE id=?")
            ->execute([$data['valor_asignado'], $nuevoReal, $data['garantia_id']]);
            
        $pdo->commit();
        echo json_encode(['success'=>true]);
    } catch(Exception $e) { $pdo->rollBack(); echo json_encode(['error'=>$e->getMessage()]); }
}

function deleteGarantia($pdo) {
    $id = $_GET['id'] ?? null;

    if (!$id || !is_numeric($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de garantía inválido o no proporcionado.']);
        return;
    }

    try {
        $pdo->beginTransaction();

        // Verificar si la garantía está vinculada a un crédito activo
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM creditos_garantias_vinculo WHERE referencia_id = ? AND origen_tabla = 'garantia_bien'");
        $stmtCheck->execute([$id]);
        $vinculos = $stmtCheck->fetchColumn();

        if ($vinculos > 0) {
            throw new Exception('No se puede eliminar la garantía porque está vinculada a un crédito activo.');
        }

        // Eliminar registros relacionados (seguros y avalúos)
        $pdo->prepare("DELETE FROM garantias_seguros WHERE garantia_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM garantias_avaluos WHERE garantia_id = ?")->execute([$id]);

        // Eliminar la garantía
        $stmt = $pdo->prepare("DELETE FROM garantias WHERE id = ?");
        $stmt->execute([$id]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Garantía eliminada correctamente.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>