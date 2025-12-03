<?php
// api/cobros_naturales.php
header('Content-Type: application/json');

// Iniciar sesión y verificar autenticación
session_start();
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['error' => 'No autorizado']);
    exit();
}

// Incluir la clase Database
require_once '../config/database.php';

// Obtener conexión
$db = Database::getInstance();
$pdo = $db->getConnection();

$action = $_GET['action'] ?? 'list';

try {
    switch($action) {
        // ============================================
        // 1. LISTAR PRÉSTAMOS DE CLIENTES NATURALES
        // ============================================
        case 'list':
            $sql = "SELECT 
                p.id,
                p.codigo_contrato,
                p.tipo,
                p.monto,
                p.plazo,
                p.tasa,
                p.cuota,
                p.saldo_actual,
                p.estado,
                p.dias_mora,
                p.proximo_vencimiento,
                p.fecha_otorgamiento,
                p.ultimo_pago,
                c.id as cliente_id,
                c.nombre as cliente_nombre,
                c.dui,
                c.codigo as cliente_codigo,
                c.telefono,
                c.calificacion
            FROM prestamos p
            INNER JOIN clientes c ON p.cliente_id = c.id
            WHERE c.tipo = 'natural' 
            AND p.estado IN ('normal', 'mora', 'atrasado')
            ORDER BY 
                CASE p.estado 
                    WHEN 'mora' THEN 1
                    WHEN 'atrasado' THEN 2
                    ELSE 3 
                END,
                p.dias_mora DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $prestamos = $stmt->fetchAll();
            
            echo json_encode($prestamos);
            break;
        
        // ============================================
        // 2. OBTENER DATOS DE UN PRÉSTAMO ESPECÍFICO
        // ============================================
        case 'datos':
            $prestamo_id = $_GET['id'] ?? 0;
            
            $sql = "SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.dui,
                c.telefono,
                c.direccion,
                (
                    SELECT SUM(total_pagado) 
                    FROM pagos 
                    WHERE prestamo_id = p.id
                ) as total_pagado_historico,
                (
                    SELECT fecha 
                    FROM pagos 
                    WHERE prestamo_id = p.id 
                    ORDER BY fecha DESC 
                    LIMIT 1
                ) as fecha_ultimo_pago_real
            FROM prestamos p
            INNER JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$prestamo_id]);
            $prestamo = $stmt->fetch();
            
            if (!$prestamo) {
                echo json_encode(['error' => 'Préstamo no encontrado']);
                exit();
            }
            
            // Calcular intereses pendientes
            $fecha_base = $prestamo['fecha_ultimo_pago_real'] ?? $prestamo['fecha_otorgamiento'];
            $hoy = date('Y-m-d');
            
            // Si hay mora, calcular días desde último pago
            $dias_transcurridos = 0;
            if ($fecha_base) {
                $d1 = new DateTime($fecha_base);
                $d2 = new DateTime($hoy);
                $dias_transcurridos = $d1->diff($d2)->days;
            }
            
            // Interés ordinario (mensual)
            $interes_mensual = ($prestamo['saldo_actual'] * $prestamo['tasa']) / 100 / 12;
            
            // Mora (si hay días en mora)
            $mora = 0;
            if ($prestamo['dias_mora'] > 0) {
                $tasa_mora_diaria = ($prestamo['tasa'] * 1.5) / 100 / 360; // Tasa de mora = 1.5x tasa normal
                $mora = $prestamo['saldo_actual'] * $tasa_mora_diaria * $prestamo['dias_mora'];
            }
            
            echo json_encode([
                'prestamo' => $prestamo,
                'calculos' => [
                    'interes_mensual' => $interes_mensual,
                    'mora_acumulada' => $mora,
                    'dias_transcurridos' => $dias_transcurridos,
                    'cuota_recomendada' => $prestamo['cuota'] + $mora
                ]
            ]);
            break;
        
        // ============================================
        // 3. REGISTRAR UN PAGO
        // ============================================
        case 'registrar':
            // Leer datos del cuerpo de la solicitud
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validar datos
            if (empty($input['prestamo_id']) || empty($input['monto']) || empty($input['fecha_pago'])) {
                echo json_encode(['error' => 'Datos incompletos']);
                exit();
            }
            
            // Iniciar transacción
            $pdo->beginTransaction();
            
            try {
                // 1. Obtener datos actuales del préstamo
                $sql = "SELECT * FROM prestamos WHERE id = ? FOR UPDATE";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$input['prestamo_id']]);
                $prestamo = $stmt->fetch();
                
                if (!$prestamo) {
                    throw new Exception("Préstamo no encontrado");
                }
                
                // 2. Obtener nombre del cliente
                $sql_cliente = "SELECT nombre FROM clientes WHERE id = ?";
                $stmt_cliente = $pdo->prepare($sql_cliente);
                $stmt_cliente->execute([$prestamo['cliente_id']]);
                $cliente = $stmt_cliente->fetch();
                
                // 3. Calcular distribución del pago (simplificada)
                $monto = floatval($input['monto']);
                $saldo_actual = floatval($prestamo['saldo_actual']);
                
                // Calcular mora pendiente
                $mora_pendiente = 0;
                if ($prestamo['dias_mora'] > 0) {
                    $tasa_mora_diaria = ($prestamo['tasa'] * 1.5) / 100 / 360;
                    $mora_pendiente = $saldo_actual * $tasa_mora_diaria * $prestamo['dias_mora'];
                }
                
                // Calcular interés del período (30 días desde último pago)
                $interes_periodo = ($saldo_actual * $prestamo['tasa']) / 100 / 12;
                
                // Distribuir pago según orden: 1. Mora, 2. Interés, 3. Capital
                $abono_mora = min($monto, $mora_pendiente);
                $restante = $monto - $abono_mora;
                
                $abono_interes = min($restante, $interes_periodo);
                $restante = $restante - $abono_interes;
                
                $abono_capital = $restante;
                
                // 4. Calcular nuevo saldo
                $nuevo_saldo = max(0, $saldo_actual - $abono_capital);
                
                // 5. Determinar nuevo estado
                $nuevo_estado = 'normal';
                if ($nuevo_saldo <= 0) {
                    $nuevo_estado = 'pagado';
                } elseif ($prestamo['dias_mora'] > 0 && $abono_mora > 0) {
                    // Si pagó mora, pero sigue con deuda
                    $nuevo_estado = $nuevo_saldo > 0 ? 'normal' : 'pagado';
                }
                
                // 6. Actualizar préstamo
                $sql_update = "UPDATE prestamos SET 
                    saldo_actual = ?,
                    estado = ?,
                    dias_mora = CASE WHEN ? > 0 THEN 0 ELSE dias_mora END,
                    ultimo_pago = NOW(),
                    proximo_vencimiento = DATE_ADD(NOW(), INTERVAL 30 DAY)
                WHERE id = ?";
                
                $stmt_update = $pdo->prepare($sql_update);
                $stmt_update->execute([
                    $nuevo_saldo,
                    $nuevo_estado,
                    $abono_mora,
                    $input['prestamo_id']
                ]);
                
                // 7. Registrar en tabla pagos
                $sql_pago = "INSERT INTO pagos (
                    prestamo_id,
                    cliente_nombre,
                    total_pagado,
                    capital,
                    interes,
                    mora,
                    comision,
                    saldo_restante,
                    fecha
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $stmt_pago = $pdo->prepare($sql_pago);
                $stmt_pago->execute([
                    $input['prestamo_id'],
                    $cliente['nombre'],
                    $monto,
                    $abono_capital,
                    $abono_interes,
                    $abono_mora,
                    0, // Comisión (0 por ahora)
                    $nuevo_saldo,
                    $input['fecha_pago'] . ' ' . date('H:i:s')
                ]);
                
                // 8. Generar número de recibo
                $recibo_id = $pdo->lastInsertId();
                $numero_recibo = 'REC-NAT-' . date('Ymd') . '-' . str_pad($recibo_id, 5, '0', STR_PAD_LEFT);
                
                // 9. Confirmar transacción
                $pdo->commit();
                
                echo json_encode([
                    'success' => true,
                    'recibo' => $numero_recibo,
                    'message' => 'Pago registrado exitosamente',
                    'datos' => [
                        'saldo_anterior' => $saldo_actual,
                        'saldo_nuevo' => $nuevo_saldo,
                        'abono_capital' => $abono_capital,
                        'abono_interes' => $abono_interes,
                        'abono_mora' => $abono_mora
                    ]
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
        
        // ============================================
        // 4. HISTORIAL DE PAGOS DE UN PRÉSTAMO
        // ============================================
        case 'historial':
            $prestamo_id = $_GET['id'] ?? 0;
            
            $sql = "SELECT 
                p.*,
                DATE_FORMAT(p.fecha, '%d/%m/%Y %H:%i') as fecha_formateada
            FROM pagos p
            WHERE p.prestamo_id = ?
            ORDER BY p.fecha DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$prestamo_id]);
            $pagos = $stmt->fetchAll();
            
            echo json_encode($pagos);
            break;
        
        // ============================================
        // 5. FILTRAR POR FECHA (HOY)
        // ============================================
        case 'hoy':
            $hoy = date('Y-m-d');
            
            $sql = "SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.dui
            FROM prestamos p
            INNER JOIN clientes c ON p.cliente_id = c.id
            WHERE c.tipo = 'natural'
            AND p.estado IN ('normal', 'mora', 'atrasado')
            AND p.proximo_vencimiento = ?
            ORDER BY p.estado";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$hoy]);
            $prestamos = $stmt->fetchAll();
            
            echo json_encode($prestamos);
            break;
        
        default:
            echo json_encode(['error' => 'Acción no válida']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>