<?php
// api/prestamos.php
header('Content-Type: application/json');
session_start();

// Verificar sesión
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit();
}

// Conexión a la base de datos
$host = 'localhost';
$dbname = 'financiera_sv';
$username = 'root';
$password = '';

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn);
        break;
    case 'PUT':
        handlePut($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}

// En api/prestamos.php, modifica la función handleGet:

function handleGet($conn) {
    if (isset($_GET['listar']) && $_GET['listar'] == 'activos') {
        listarPrestamosActivos($conn);
    } elseif (isset($_GET['id'])) {
        getPrestamoById($conn, $_GET['id']);
    } else {
        // Listar todos los préstamos si no hay parámetro
        listarTodosPrestamos($conn);
    }
}

// Añade esta nueva función:
function listarTodosPrestamos($conn) {
    try {
        $query = "
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.codigo as codigo_cliente,
                c.capacidad_pago,
                COALESCE(
                    (SELECT nombre_completo FROM garantias_personales gp 
                     INNER JOIN prestamos_garantias_personales pgp ON gp.id = pgp.garantia_personal_id 
                     WHERE pgp.prestamo_id = p.id LIMIT 1),
                    (SELECT descripcion_inmueble FROM hipotecas h 
                     INNER JOIN prestamos_hipotecas ph ON h.id = ph.hipoteca_id 
                     WHERE ph.prestamo_id = p.id LIMIT 1)
                ) as descripcion_garantia,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM prestamos_garantias_personales WHERE prestamo_id = p.id) THEN 'Fiador'
                    WHEN EXISTS(SELECT 1 FROM prestamos_hipotecas WHERE prestamo_id = p.id) THEN 'Hipoteca'
                    ELSE 'Sin garantía'
                END as tipo_garantia
            FROM prestamos p
            INNER JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.fecha_otorgamiento DESC
        ";
        
        $stmt = $conn->query($query);
        $prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($prestamos);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function listarPrestamosActivos($conn) {
    try {
        $query = "
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.codigo as codigo_cliente,
                c.capacidad_pago,
                COALESCE(
                    (SELECT nombre_completo FROM garantias_personales gp 
                     INNER JOIN prestamos_garantias_personales pgp ON gp.id = pgp.garantia_personal_id 
                     WHERE pgp.prestamo_id = p.id LIMIT 1),
                    (SELECT descripcion_inmueble FROM hipotecas h 
                     INNER JOIN prestamos_hipotecas ph ON h.id = ph.hipoteca_id 
                     WHERE ph.prestamo_id = p.id LIMIT 1)
                ) as descripcion_garantia,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM prestamos_garantias_personales WHERE prestamo_id = p.id) THEN 'Fiador'
                    WHEN EXISTS(SELECT 1 FROM prestamos_hipotecas WHERE prestamo_id = p.id) THEN 'Hipoteca'
                    ELSE 'Sin garantía'
                END as tipo_garantia
            FROM prestamos p
            INNER JOIN clientes c ON p.cliente_id = c.id
            WHERE p.saldo_actual > 0
            ORDER BY p.fecha_otorgamiento DESC
        ";
        
        $stmt = $conn->query($query);
        $prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($prestamos);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handlePost($conn) {
    // Obtener datos del cuerpo de la solicitud
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos no válidos']);
        return;
    }
    
    // Validaciones básicas
    if (!isset($input['cliente_id']) || !isset($input['monto']) || !isset($input['tipo_garantia'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        return;
    }
    
    try {
        $conn->beginTransaction();
        
        // 1. Crear el préstamo
        $queryPrestamo = "
            INSERT INTO prestamos (
                cliente_id, 
                tipo, 
                monto, 
                plazo, 
                tasa, 
                cliente_nombre, 
                cuota, 
                saldo_actual,
                estado,
                fecha_otorgamiento
            ) VALUES (
                :cliente_id,
                'personal',
                :monto,
                :plazo,
                :tasa,
                (SELECT nombre FROM clientes WHERE id = :cliente_id),
                :cuota,
                :monto,
                'normal',
                NOW()
            )
        ";
        
        $stmtPrestamo = $conn->prepare($queryPrestamo);
        $stmtPrestamo->execute([
            ':cliente_id' => $input['cliente_id'],
            ':monto' => $input['monto'],
            ':plazo' => $input['plazo'],
            ':tasa' => $input['tasa'],
            ':cuota' => $input['cuota']
        ]);
        
        $prestamoId = $conn->lastInsertId();
        
        // 2. Procesar la garantía según el tipo
        if ($input['tipo_garantia'] === 'fiador' && isset($input['garantia'])) {
            procesarGarantiaFiador($conn, $prestamoId, $input['cliente_id'], $input['garantia']);
        } 
        elseif ($input['tipo_garantia'] === 'hipoteca' && isset($input['garantia'])) {
            procesarGarantiaHipoteca($conn, $prestamoId, $input['cliente_id'], $input['garantia']);
        } else {
            throw new Exception('Tipo de garantía no válido');
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Préstamo otorgado exitosamente',
            'prestamo_id' => $prestamoId
        ]);
        
    } catch(Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function procesarGarantiaFiador($conn, $prestamoId, $clienteId, $datosFiador) {
    // 1. Insertar en garantias_personales
    $queryFiador = "
        INSERT INTO garantias_personales (
            cliente_id,
            tipo_garantia_personal_id,
            nombre_completo,
            dui,
            nit,
            telefono,
            ingresos_mensuales,
            egresos_mensuales,
            direccion,
            parentesco_cliente,
            fecha_registro
        ) VALUES (
            :cliente_id,
            (SELECT id FROM tipos_garantia_personal WHERE nombre LIKE 'Fiador%' LIMIT 1),
            :nombre_completo,
            :dui,
            :nit,
            :telefono,
            :ingresos_mensuales,
            :egresos_mensuales,
            :direccion,
            :parentesco_cliente,
            NOW()
        )
    ";
    
    $stmtFiador = $conn->prepare($queryFiador);
    $stmtFiador->execute([
        ':cliente_id' => $clienteId,
        ':nombre_completo' => $datosFiador['nombre_completo'],
        ':dui' => $datosFiador['dui'],
        ':nit' => !empty($datosFiador['nit']) ? $datosFiador['nit'] : null,
        ':telefono' => !empty($datosFiador['telefono']) ? $datosFiador['telefono'] : null,
        ':ingresos_mensuales' => $datosFiador['ingresos_mensuales'],
        ':egresos_mensuales' => $datosFiador['egresos_mensuales'] ?? 0,
        ':direccion' => !empty($datosFiador['direccion']) ? $datosFiador['direccion'] : null,
        ':parentesco_cliente' => !empty($datosFiador['parentesco_cliente']) ? $datosFiador['parentesco_cliente'] : null
    ]);
    
    $garantiaId = $conn->lastInsertId();
    
    // 2. Calcular capacidad de pago del fiador
    $capacidadFiador = $datosFiador['ingresos_mensuales'] - ($datosFiador['egresos_mensuales'] ?? 0);
    $capacidadFiador = max(0, $capacidadFiador);
    
    // 3. Relacionar con el préstamo
    $queryRelacion = "
        INSERT INTO prestamos_garantias_personales (
            prestamo_id,
            garantia_personal_id,
            monto_responsabilidad,
            porcentaje_responsabilidad,
            fecha_asignacion
        ) VALUES (
            :prestamo_id,
            :garantia_id,
            :monto_responsabilidad,
            100.00,
            NOW()
        )
    ";
    
    $stmtRelacion = $conn->prepare($queryRelacion);
    $stmtRelacion->execute([
        ':prestamo_id' => $prestamoId,
        ':garantia_id' => $garantiaId,
        ':monto_responsabilidad' => $capacidadFiador * 12 // Responsabilidad anual
    ]);
    
    // 4. Actualizar capacidad de pago del fiador en la tabla
    $queryUpdate = "UPDATE garantias_personales SET capacidad_pago = :capacidad WHERE id = :id";
    $stmtUpdate = $conn->prepare($queryUpdate);
    $stmtUpdate->execute([
        ':capacidad' => $capacidadFiador,
        ':id' => $garantiaId
    ]);
}

function procesarGarantiaHipoteca($conn, $prestamoId, $clienteId, $datosHipoteca) {
    // 1. Insertar en hipotecas
    $queryHipoteca = "
        INSERT INTO hipotecas (
            cliente_id,
            numero_matricula_cnr,
            tipo_inmueble,
            grado_hipoteca,
            ubicacion_inmueble,
            descripcion_inmueble,
            area_terreno,
            area_construccion,
            valor_avaluo,
            fecha_avaluo,
            porcentaje_cobertura,
            estado,
            fecha_registro
        ) VALUES (
            :cliente_id,
            :numero_matricula_cnr,
            :tipo_inmueble,
            :grado_hipoteca,
            :ubicacion_inmueble,
            :descripcion_inmueble,
            :area_terreno,
            :area_construccion,
            :valor_avaluo,
            :fecha_avaluo,
            :porcentaje_cobertura,
            'vigente',
            NOW()
        )
    ";
    
    $stmtHipoteca = $conn->prepare($queryHipoteca);
    $stmtHipoteca->execute([
        ':cliente_id' => $clienteId,
        ':numero_matricula_cnr' => $datosHipoteca['numero_matricula_cnr'],
        ':tipo_inmueble' => $datosHipoteca['tipo_inmueble'],
        ':grado_hipoteca' => $datosHipoteca['grado_hipoteca'],
        ':ubicacion_inmueble' => $datosHipoteca['ubicacion_inmueble'],
        ':descripcion_inmueble' => $datosHipoteca['descripcion_inmueble'],
        ':area_terreno' => !empty($datosHipoteca['area_terreno']) ? $datosHipoteca['area_terreno'] : null,
        ':area_construccion' => !empty($datosHipoteca['area_construccion']) ? $datosHipoteca['area_construccion'] : null,
        ':valor_avaluo' => $datosHipoteca['valor_avaluo'],
        ':fecha_avaluo' => $datosHipoteca['fecha_avaluo'],
        ':porcentaje_cobertura' => $datosHipoteca['porcentaje_cobertura']
    ]);
    
    $hipotecaId = $conn->lastInsertId();
    
    // 2. Insertar en historial de avalúos
    $queryAvaluo = "
        INSERT INTO hipotecas_avaluos (
            hipoteca_id,
            perito_nombre,
            fecha_avaluo,
            valor_avaluo,
            metodo_valuacion,
            estado_conservacion,
            fecha_registro
        ) VALUES (
            :hipoteca_id,
            'Sistema Automático',
            :fecha_avaluo,
            :valor_avaluo,
            'Ingresado manualmente',
            'bueno',
            NOW()
        )
    ";
    
    $stmtAvaluo = $conn->prepare($queryAvaluo);
    $stmtAvaluo->execute([
        ':hipoteca_id' => $hipotecaId,
        ':fecha_avaluo' => $datosHipoteca['fecha_avaluo'],
        ':valor_avaluo' => $datosHipoteca['valor_avaluo']
    ]);
    
    // 3. Calcular monto garantizado
    $montoGarantizado = $datosHipoteca['valor_avaluo'] * ($datosHipoteca['porcentaje_cobertura'] / 100);
    
    // 4. Relacionar con el préstamo
    $queryRelacion = "
        INSERT INTO prestamos_hipotecas (
            prestamo_id,
            hipoteca_id,
            monto_garantizado,
            porcentaje_cobertura,
            fecha_asignacion
        ) VALUES (
            :prestamo_id,
            :hipoteca_id,
            :monto_garantizado,
            :porcentaje_cobertura,
            NOW()
        )
    ";
    
    $stmtRelacion = $conn->prepare($queryRelacion);
    $stmtRelacion->execute([
        ':prestamo_id' => $prestamoId,
        ':hipoteca_id' => $hipotecaId,
        ':monto_garantizado' => $montoGarantizado,
        ':porcentaje_cobertura' => $datosHipoteca['porcentaje_cobertura']
    ]);
    
    // 5. Crear alerta para próximo avalúo (3 años según ley)
    $fechaProximoAvaluo = date('Y-m-d', strtotime($datosHipoteca['fecha_avaluo'] . ' + 3 years'));
    $hoy = date('Y-m-d');
    $diasRestantes = ceil((strtotime($fechaProximoAvaluo) - strtotime($hoy)) / (60 * 60 * 24));
    
    if ($diasRestantes <= 90) { // Alertar 90 días antes
        $queryAlerta = "
            INSERT INTO alertas_avaluos (
                hipoteca_id,
                tipo_alerta,
                fecha_alerta,
                fecha_vencimiento,
                dias_restantes,
                estado,
                fecha_notificacion
            ) VALUES (
                :hipoteca_id,
                'avaluo_proximo_vencer',
                :fecha_alerta,
                :fecha_vencimiento,
                :dias_restantes,
                'pendiente',
                NOW()
            )
        ";
        
        $stmtAlerta = $conn->prepare($queryAlerta);
        $stmtAlerta->execute([
            ':hipoteca_id' => $hipotecaId,
            ':fecha_alerta' => $hoy,
            ':fecha_vencimiento' => $fechaProximoAvaluo,
            ':dias_restantes' => $diasRestantes
        ]);
    }
}

function getPrestamoById($conn, $id) {
    try {
        $query = "
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.codigo as codigo_cliente,
                c.capacidad_pago
            FROM prestamos p
            INNER JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = :id
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([':id' => $id]);
        $prestamo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($prestamo) {
            echo json_encode($prestamo);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Préstamo no encontrado']);
        }
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handlePut($conn) {
    // Para futuras actualizaciones (pagos, cambios de estado, etc.)
    http_response_code(501);
    echo json_encode(['message' => 'Función PUT en desarrollo']);
}
?>