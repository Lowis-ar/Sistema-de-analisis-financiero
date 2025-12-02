<?php
// api/prestamos.php
header('Content-Type: application/json');
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = Database::getInstance()->getConnection();

switch($method) {
    case 'GET':
        handleGet($db);
        break;
    case 'POST':
        handlePost($db);
        break;
    case 'PUT':
        handlePut($db);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}

function handleGet($db) {
    if (isset($_GET['listar']) && $_GET['listar'] == 'activos') {
        // Listar préstamos activos
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
        
        try {
            $stmt = $db->query($query);
            $prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($prestamos);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    } else {
        echo json_encode([]);
    }
}

function handlePost($db) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validaciones básicas
    if (!isset($data['cliente_id']) || !isset($data['monto']) || !isset($data['tipo_garantia'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        return;
    }
    
    try {
        $db->beginTransaction();
        
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
                estado
            ) VALUES (
                :cliente_id,
                'personal',
                :monto,
                :plazo,
                :tasa,
                (SELECT nombre FROM clientes WHERE id = :cliente_id),
                :cuota,
                :monto,
                'normal'
            )
        ";
        
        $stmtPrestamo = $db->prepare($queryPrestamo);
        $stmtPrestamo->execute([
            ':cliente_id' => $data['cliente_id'],
            ':monto' => $data['monto'],
            ':plazo' => $data['plazo'],
            ':tasa' => $data['tasa'],
            ':cuota' => $data['cuota']
        ]);
        
        $prestamoId = $db->lastInsertId();
        
        // 2. Procesar la garantía según el tipo
        if ($data['tipo_garantia'] === 'fiador' && isset($data['garantia'])) {
            procesarGarantiaFiador($db, $prestamoId, $data['cliente_id'], $data['garantia']);
        } 
        elseif ($data['tipo_garantia'] === 'hipoteca' && isset($data['garantia'])) {
            procesarGarantiaHipoteca($db, $prestamoId, $data['cliente_id'], $data['garantia']);
        }
        
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Préstamo otorgado exitosamente',
            'prestamo_id' => $prestamoId
        ]);
        
    } catch(PDOException $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function procesarGarantiaFiador($db, $prestamoId, $clienteId, $datosFiador) {
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
            parentesco_cliente
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
            :parentesco_cliente
        )
    ";
    
    $stmtFiador = $db->prepare($queryFiador);
    $stmtFiador->execute([
        ':cliente_id' => $clienteId,
        ':nombre_completo' => $datosFiador['nombre_completo'],
        ':dui' => $datosFiador['dui'],
        ':nit' => $datosFiador['nit'] ?? null,
        ':telefono' => $datosFiador['telefono'] ?? null,
        ':ingresos_mensuales' => $datosFiador['ingresos_mensuales'],
        ':egresos_mensuales' => $datosFiador['egresos_mensuales'] ?? 0,
        ':direccion' => $datosFiador['direccion'] ?? null,
        ':parentesco_cliente' => $datosFiador['parentesco_cliente'] ?? null
    ]);
    
    $garantiaId = $db->lastInsertId();
    
    // 2. Calcular capacidad de pago del fiador
    $capacidadFiador = $datosFiador['ingresos_mensuales'] - ($datosFiador['egresos_mensuales'] ?? 0);
    $capacidadFiador = max(0, $capacidadFiador);
    
    // 3. Relacionar con el préstamo
    $queryRelacion = "
        INSERT INTO prestamos_garantias_personales (
            prestamo_id,
            garantia_personal_id,
            monto_responsabilidad,
            porcentaje_responsabilidad
        ) VALUES (
            :prestamo_id,
            :garantia_id,
            :monto_responsabilidad,
            100.00
        )
    ";
    
    $stmtRelacion = $db->prepare($queryRelacion);
    $stmtRelacion->execute([
        ':prestamo_id' => $prestamoId,
        ':garantia_id' => $garantiaId,
        ':monto_responsabilidad' => $capacidadFiador * 12 // Responsabilidad anual
    ]);
    
    // 4. Actualizar capacidad de pago del fiador en la tabla
    $queryUpdate = "UPDATE garantias_personales SET capacidad_pago = :capacidad WHERE id = :id";
    $stmtUpdate = $db->prepare($queryUpdate);
    $stmtUpdate->execute([
        ':capacidad' => $capacidadFiador,
        ':id' => $garantiaId
    ]);
}

function procesarGarantiaHipoteca($db, $prestamoId, $clienteId, $datosHipoteca) {
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
            estado
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
            'vigente'
        )
    ";
    
    $stmtHipoteca = $db->prepare($queryHipoteca);
    $stmtHipoteca->execute([
        ':cliente_id' => $clienteId,
        ':numero_matricula_cnr' => $datosHipoteca['numero_matricula_cnr'],
        ':tipo_inmueble' => $datosHipoteca['tipo_inmueble'],
        ':grado_hipoteca' => $datosHipoteca['grado_hipoteca'],
        ':ubicacion_inmueble' => $datosHipoteca['ubicacion_inmueble'],
        ':descripcion_inmueble' => $datosHipoteca['descripcion_inmueble'],
        ':area_terreno' => $datosHipoteca['area_terreno'] ?? null,
        ':area_construccion' => $datosHipoteca['area_construccion'] ?? null,
        ':valor_avaluo' => $datosHipoteca['valor_avaluo'],
        ':fecha_avaluo' => $datosHipoteca['fecha_avaluo'],
        ':porcentaje_cobertura' => $datosHipoteca['porcentaje_cobertura']
    ]);
    
    $hipotecaId = $db->lastInsertId();
    
    // 2. Insertar en historial de avalúos
    $queryAvaluo = "
        INSERT INTO hipotecas_avaluos (
            hipoteca_id,
            perito_nombre,
            fecha_avaluo,
            valor_avaluo,
            metodo_valuacion,
            estado_conservacion
        ) VALUES (
            :hipoteca_id,
            'Sistema Automático',
            :fecha_avaluo,
            :valor_avaluo,
            'Ingresado manualmente',
            'bueno'
        )
    ";
    
    $stmtAvaluo = $db->prepare($queryAvaluo);
    $stmtAvaluo->execute([
        ':hipoteca_id' => $hipotecaId,
        ':fecha_avaluo' => $datosHipoteca['fecha_avaluo'],
        ':valor_avaluo' => $datosHipoteca['valor_avaluo']
    ]);
    
    // 3. Calcular fecha para próximo avalúo (3 años según ley)
    $fechaProximoAvaluo = date('Y-m-d', strtotime($datosHipoteca['fecha_avaluo'] . ' + 3 years'));
    
    // 4. Relacionar con el préstamo
    $montoGarantizado = $datosHipoteca['valor_avaluo'] * ($datosHipoteca['porcentaje_cobertura'] / 100);
    
    $queryRelacion = "
        INSERT INTO prestamos_hipotecas (
            prestamo_id,
            hipoteca_id,
            monto_garantizado,
            porcentaje_cobertura
        ) VALUES (
            :prestamo_id,
            :hipoteca_id,
            :monto_garantizado,
            :porcentaje_cobertura
        )
    ";
    
    $stmtRelacion = $db->prepare($queryRelacion);
    $stmtRelacion->execute([
        ':prestamo_id' => $prestamoId,
        ':hipoteca_id' => $hipotecaId,
        ':monto_garantizado' => $montoGarantizado,
        ':porcentaje_cobertura' => $datosHipoteca['porcentaje_cobertura']
    ]);
    
    // 5. Crear alerta para próximo avalúo (si aplica)
    $hoy = date('Y-m-d');
    if ($fechaProximoAvaluo > $hoy) {
        $diasRestantes = ceil((strtotime($fechaProximoAvaluo) - strtotime($hoy)) / (60 * 60 * 24));
        
        if ($diasRestantes <= 90) { // Alertar 90 días antes
            $queryAlerta = "
                INSERT INTO alertas_avaluos (
                    hipoteca_id,
                    tipo_alerta,
                    fecha_alerta,
                    fecha_vencimiento,
                    dias_restantes,
                    estado
                ) VALUES (
                    :hipoteca_id,
                    'avaluo_proximo_vencer',
                    :fecha_alerta,
                    :fecha_vencimiento,
                    :dias_restantes,
                    'pendiente'
                )
            ";
            
            $stmtAlerta = $db->prepare($queryAlerta);
            $stmtAlerta->execute([
                ':hipoteca_id' => $hipotecaId,
                ':fecha_alerta' => $hoy,
                ':fecha_vencimiento' => $fechaProximoAvaluo,
                ':dias_restantes' => $diasRestantes
            ]);
        }
    }
}

function handlePut($db) {
    // Para futuras actualizaciones (pagos, cambios de estado, etc.)
    echo json_encode(['message' => 'Función PUT en desarrollo']);
}
?>