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
        getPrestamosNaturales($pdo);
        break;
    case 'POST':
        createPrestamoNatural($pdo);
        break;
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

function getPrestamosNaturales($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT p.*, c.nombre as cliente_nombre_completo, 
                   (SELECT tipo FROM garantias_personales gp WHERE gp.cliente_id = p.cliente_id LIMIT 1) as garantia_tipo
            FROM prestamos p 
            LEFT JOIN clientes c ON p.cliente_id = c.id 
            WHERE c.tipo = 'natural' OR c.tipo IS NULL
            ORDER BY p.fecha_otorgamiento DESC
        ");
        $prestamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($prestamos);
    } catch(PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createPrestamoNatural($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['cliente_id']) || empty($data['monto']) || empty($data['plazo']) || empty($data['tasa'])) {
        echo json_encode(['error' => 'Datos incompletos']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // 1. Obtener información del cliente
        $stmt = $pdo->prepare("SELECT nombre, tipo FROM clientes WHERE id = ?");
        $stmt->execute([$data['cliente_id']]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cliente) {
            throw new Exception('Cliente no encontrado');
        }
        
        // 2. Calcular cuota (sistema francés)
        $monto = floatval($data['monto']);
        $tasaMensual = (floatval($data['tasa']) / 100) / 12;
        $plazo = intval($data['plazo']);
        
        if ($tasaMensual == 0) {
            $cuota = $monto / $plazo;
        } else {
            $factor = pow(1 + $tasaMensual, $plazo);
            $cuota = ($monto * $tasaMensual * $factor) / ($factor - 1);
        }
        
        // 3. Insertar préstamo
        $stmt = $pdo->prepare("
            INSERT INTO prestamos (cliente_id, tipo, monto, plazo, tasa, cliente_nombre, cuota, saldo_actual, fecha_otorgamiento) 
            VALUES (:cliente_id, :tipo, :monto, :plazo, :tasa, :cliente_nombre, :cuota, :saldo_actual, :fecha_otorgamiento)
        ");
        
        $fechaDesembolso = $data['fecha_desembolso'] ?? date('Y-m-d H:i:s');
        
        $stmt->execute([
            ':cliente_id' => $data['cliente_id'],
            ':tipo' => $data['tipo'] ?? 'personal',
            ':monto' => $monto,
            ':plazo' => $plazo,
            ':tasa' => $data['tasa'],
            ':cliente_nombre' => $cliente['nombre'],
            ':cuota' => round($cuota, 2),
            ':saldo_actual' => $monto,
            ':fecha_otorgamiento' => $fechaDesembolso
        ]);
        
        $prestamo_id = $pdo->lastInsertId();
        
        // 4. Procesar garantía según tipo
        if (!empty($data['tipo_garantia'])) {
            switch($data['tipo_garantia']) {
                case 'fiador':
                    if (!empty($data['garantia_fiador'])) {
                        $garantia = $data['garantia_fiador'];
                        
                        // Verificar que el fiador exista como cliente
                        $stmt = $pdo->prepare("SELECT id, nombre FROM clientes WHERE id = ?");
                        $stmt->execute([$garantia['cliente_id']]);
                        $fiador = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($fiador) {
                            // Insertar garantía personal
                            $stmt = $pdo->prepare("
                                INSERT INTO garantias_personales 
                                (cliente_id, tipo_garantia_personal_id, nombre_completo, dui, nit, 
                                 ingresos_mensuales, parentesco_cliente, fecha_registro)
                                SELECT 
                                    :cliente_id,
                                    (SELECT id FROM tipos_garantia_personal WHERE nombre LIKE '%Fiador%' LIMIT 1),
                                    c.nombre,
                                    c.dui,
                                    (SELECT nit FROM clientes_juridicos WHERE cliente_id = c.id LIMIT 1),
                                    c.ingresos,
                                    :parentesco,
                                    NOW()
                                FROM clientes c
                                WHERE c.id = :fiador_id
                            ");
                            
                            $stmt->execute([
                                ':cliente_id' => $data['cliente_id'],
                                ':parentesco' => $garantia['parentesco'],
                                ':fiador_id' => $garantia['cliente_id']
                            ]);
                            
                            $garantia_id = $pdo->lastInsertId();
                            
                            // Relacionar con préstamo
                            $stmt = $pdo->prepare("
                                INSERT INTO prestamos_garantias_personales 
                                (prestamo_id, garantia_personal_id, monto_responsabilidad, porcentaje_responsabilidad)
                                VALUES (:prestamo_id, :garantia_id, :monto, 100)
                            ");
                            
                            $stmt->execute([
                                ':prestamo_id' => $prestamo_id,
                                ':garantia_id' => $garantia_id,
                                ':monto' => $monto
                            ]);
                        }
                    }
                    break;
                    
                case 'codeudor':
                    if (!empty($data['garantia_codeudor'])) {
                        $garantia = $data['garantia_codeudor'];
                        
                        $stmt = $pdo->prepare("SELECT id, nombre FROM clientes WHERE id = ?");
                        $stmt->execute([$garantia['cliente_id']]);
                        $codeudor = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($codeudor) {
                            // Insertar garantía personal
                            $stmt = $pdo->prepare("
                                INSERT INTO garantias_personales 
                                (cliente_id, tipo_garantia_personal_id, nombre_completo, dui, nit, 
                                 ingresos_mensuales, parentesco_cliente, fecha_registro)
                                SELECT 
                                    :cliente_id,
                                    (SELECT id FROM tipos_garantia_personal WHERE nombre LIKE '%Codeudor%' LIMIT 1),
                                    c.nombre,
                                    c.dui,
                                    (SELECT nit FROM clientes_juridicos WHERE cliente_id = c.id LIMIT 1),
                                    c.ingresos,
                                    :relacion,
                                    NOW()
                                FROM clientes c
                                WHERE c.id = :codeudor_id
                            ");
                            
                            $stmt->execute([
                                ':cliente_id' => $data['cliente_id'],
                                ':relacion' => $garantia['relacion'],
                                ':codeudor_id' => $garantia['cliente_id']
                            ]);
                            
                            $garantia_id = $pdo->lastInsertId();
                            
                            // Relacionar con préstamo
                            $stmt = $pdo->prepare("
                                INSERT INTO prestamos_garantias_personales 
                                (prestamo_id, garantia_personal_id, monto_responsabilidad, porcentaje_responsabilidad)
                                VALUES (:prestamo_id, :garantia_id, :monto, :porcentaje)
                            ");
                            
                            $stmt->execute([
                                ':prestamo_id' => $prestamo_id,
                                ':garantia_id' => $garantia_id,
                                ':monto' => $monto,
                                ':porcentaje' => $garantia['porcentaje']
                            ]);
                        }
                    }
                    break;
                    
                case 'hipoteca':
                    if (!empty($data['garantia_hipoteca'])) {
                        $garantia = $data['garantia_hipoteca'];
                        
                        // Insertar hipoteca
                        $stmt = $pdo->prepare("
                            INSERT INTO hipotecas 
                            (cliente_id, numero_matricula_cnr, descripcion_inmueble, ubicacion_inmueble,
                             valor_avaluo, fecha_avaluo, grado_hipoteca, estado, fecha_registro)
                            VALUES 
                            (:cliente_id, :matricula, :descripcion, :ubicacion, :valor, :fecha_avaluo, 
                             :grado, 'vigente', NOW())
                        ");
                        
                        $stmt->execute([
                            ':cliente_id' => $data['cliente_id'],
                            ':matricula' => $garantia['matricula'],
                            ':descripcion' => $garantia['descripcion'],
                            ':ubicacion' => $garantia['ubicacion'],
                            ':valor' => $garantia['valor_avaluo'],
                            ':fecha_avaluo' => $garantia['fecha_avaluo'],
                            ':grado' => $garantia['grado']
                        ]);
                        
                        $hipoteca_id = $pdo->lastInsertId();
                        
                        // Registrar primer avalúo
                        $stmt = $pdo->prepare("
                            INSERT INTO hipotecas_avaluos 
                            (hipoteca_id, perito_nombre, fecha_avaluo, valor_avaluo, estado_conservacion, observaciones)
                            VALUES 
                            (:hipoteca_id, 'Sistema', :fecha_avaluo, :valor, 'bueno', 'Avalúo inicial del sistema')
                        ");
                        
                        $stmt->execute([
                            ':hipoteca_id' => $hipoteca_id,
                            ':fecha_avaluo' => $garantia['fecha_avaluo'],
                            ':valor' => $garantia['valor_avaluo']
                        ]);
                        
                        // Crear alerta para próximo avalúo (3 años)
                        $fechaProximoAvaluo = date('Y-m-d', strtotime($garantia['fecha_avaluo'] . ' +3 years'));
                        
                        $stmt = $pdo->prepare("
                            INSERT INTO alertas_avaluos 
                            (hipoteca_id, tipo_alerta, fecha_alerta, fecha_vencimiento, dias_restantes, estado)
                            VALUES 
                            (:hipoteca_id, 'avaluo_proximo_vencer', NOW(), :fecha_vencimiento, 
                             DATEDIFF(:fecha_vencimiento, CURDATE()), 'pendiente')
                        ");
                        
                        $stmt->execute([
                            ':hipoteca_id' => $hipoteca_id,
                            ':fecha_vencimiento' => $fechaProximoAvaluo
                        ]);
                        
                        // Relacionar con préstamo
                        $stmt = $pdo->prepare("
                            INSERT INTO prestamos_hipotecas 
                            (prestamo_id, hipoteca_id, monto_garantizado, porcentaje_cobertura)
                            VALUES (:prestamo_id, :hipoteca_id, :monto, 70)
                        ");
                        
                        $stmt->execute([
                            ':prestamo_id' => $prestamo_id,
                            ':hipoteca_id' => $hipoteca_id,
                            ':monto' => $monto
                        ]);
                    }
                    break;
            }
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'id' => $prestamo_id,
            'message' => 'Préstamo para persona natural creado exitosamente',
            'cuota' => round($cuota, 2),
            'garantia_tipo' => $data['tipo_garantia'] ?? 'sin_garantia'
        ]);
        
    } catch(PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['error' => 'Error en la transacción: ' . $e->getMessage()]);
    } catch(Exception $e) {
        $pdo->rollBack();
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>