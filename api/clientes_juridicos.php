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

switch ($method) {
    case 'GET':
        getClientesJuridicos($pdo);
        break;
    case 'POST':
        createClienteJuridico($pdo);
        break;
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

function getClientesJuridicos($pdo) {
    try {
        // Hacemos JOIN para traer la info general (codigo, telefono) + info jurídica (NIT, NRC)
        $sql = "SELECT c.id, c.codigo, c.direccion, c.telefono, c.fecha_registro,
                       cj.razon_social, cj.nombre_comercial, cj.nit, cj.nrc, cj.representante_legal 
                FROM clientes c
                JOIN clientes_juridicos cj ON c.id = cj.cliente_id
                WHERE c.tipo = 'JURIDICO'
                ORDER BY c.fecha_registro DESC";
        
        $stmt = $pdo->query($sql);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createClienteJuridico($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validaciones específicas para empresas
    if (empty($data['razon_social']) || empty($data['nit']) || empty($data['representante_legal'])) {
        echo json_encode(['error' => 'Razón Social, NIT y Representante son obligatorios']);
        return;
    }

    try {
        // INICIO DE TRANSACCIÓN: O se guardan las dos tablas o ninguna
        $pdo->beginTransaction();

        // 1. Generar Código Automático (Ej: CJ-2023-0005)
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM clientes WHERE tipo = 'JURIDICO'");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $correlativo = $result['total'] + 1;
        $codigo = 'CJ-' . date('Y') . '-' . str_pad($correlativo, 4, '0', STR_PAD_LEFT);

        // 2. Insertar en tabla PADRE (clientes)
        // Nota: Las empresas no tienen "ingresos/egresos" personales simples, se suelen poner en 0 al inicio
        // y se analizan por Balances, pero llenamos los campos requeridos.
        $sqlCliente = "INSERT INTO clientes (tipo, nombre, codigo, direccion, telefono, ingresos, egresos, capacidad_pago, calificacion) 
                       VALUES ('JURIDICO', :nombre, :codigo, :direccion, :telefono, 0, 0, 0, 'A')";
        
        $stmt = $pdo->prepare($sqlCliente);
        $stmt->execute([
            ':nombre' => $data['razon_social'], // El nombre principal es la Razón Social
            ':codigo' => $codigo,
            ':direccion' => $data['direccion'] ?? '',
            ':telefono' => $data['telefono'] ?? ''
        ]);
        
        $cliente_id = $pdo->lastInsertId();

        // 3. Insertar en tabla HIJA (clientes_juridicos)
        $sqlJuridico = "INSERT INTO clientes_juridicos (cliente_id, razon_social, nombre_comercial, nit, nrc, giro_economico, representante_legal, dui_representante, fecha_constitucion) 
                        VALUES (:cid, :razon, :nom_com, :nit, :nrc, :giro, :rep, :dui_rep, :fecha)";
        
        $stmtJur = $pdo->prepare($sqlJuridico);
        $stmtJur->execute([
            ':cid' => $cliente_id,
            ':razon' => $data['razon_social'],
            ':nom_com' => $data['nombre_comercial'] ?? '',
            ':nit' => $data['nit'],
            ':nrc' => $data['nrc'] ?? '',
            ':giro' => $data['giro_economico'] ?? '',
            ':rep' => $data['representante_legal'],
            ':dui_rep' => $data['dui_representante'] ?? '',
            ':fecha' => $data['fecha_constitucion'] ?? null
        ]);

        // Confirmar cambios
        $pdo->commit();

        echo json_encode([
            'success' => true, 
            'id' => $cliente_id, 
            'codigo' => $codigo,
            'message' => 'Cliente Jurídico registrado exitosamente'
        ]);

    } catch(PDOException $e) {
        $pdo->rollBack(); // Si falla, borra lo que intentó hacer en la tabla clientes
        
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            echo json_encode(['error' => 'El NIT o Código ya existe en el sistema']);
        } else {
            echo json_encode(['error' => 'Error en base de datos: ' . $e->getMessage()]);
        }
    }
}
?>