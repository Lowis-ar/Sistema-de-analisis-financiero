<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost'; $dbname = 'financiera_sv'; $username = 'root'; $password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Error BD: ' . $e->getMessage()]); exit;
}

$action = $_GET['action'] ?? '';

// --- ROUTER ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'params') obtenerParametros($pdo);
    elseif ($action === 'list') listarCartera($pdo);
    elseif ($action === 'simular') simularCuotas($pdo);
    elseif ($action === 'detalle_plan') verPlanPagos($pdo);
    elseif ($action === 'datos_pago') obtenerDatosPago($pdo);
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'create') crearCredito($pdo);
    elseif ($action === 'refinanciar') refinanciarCredito($pdo);
    elseif ($action === 'registrar_pago') registrarPago($pdo);
}

// --- FUNCIONES DE LECTURA ---

function obtenerParametros($pdo) {
    try {
        $zonas = $pdo->query("SELECT * FROM zonas")->fetchAll(PDO::FETCH_ASSOC);
        $asesores = $pdo->query("SELECT * FROM asesores WHERE activo=1")->fetchAll(PDO::FETCH_ASSOC);
        $politicas = $pdo->query("SELECT * FROM politicas_credito WHERE activo=1")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['zonas' => $zonas, 'asesores' => $asesores, 'politicas' => $politicas]);
    } catch (Exception $e) { echo json_encode(['error' => $e->getMessage()]); }
}

function listarCartera($pdo) {
    try {
        $sql = "SELECT c.*, 
                       COALESCE(cj.razon_social, cl.nombre) as cliente_nombre,
                       COALESCE(cj.nit, cl.dui) as cliente_doc,
                       pc.nombre as tipo_credito,
                       z.nombre as zona_nombre,
                       -- NUEVO: Traemos el saldo exacto del plan (Saldo Proyectado + Capital de la cuota actual)
                       (SELECT (pp.saldo_proyectado + pp.capital_programado) 
                        FROM plan_pagos_corp pp 
                        WHERE pp.credito_id = c.id AND pp.estado != 'pagado' 
                        ORDER BY pp.numero_cuota ASC LIMIT 1
                       ) as saldo_plan
                FROM creditos_corporativos c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                LEFT JOIN clientes_juridicos cj ON c.cliente_id = cj.cliente_id
                JOIN politicas_credito pc ON c.politica_id = pc.id
                LEFT JOIN zonas z ON c.zona_id = z.id
                ORDER BY c.fecha_registro DESC";
        echo json_encode($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e) { echo json_encode(['error' => $e->getMessage()]); }
}

function verPlanPagos($pdo) {
    $id = $_GET['id'];
    $sql = "SELECT * FROM plan_pagos_corp WHERE credito_id = ? ORDER BY numero_cuota ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// --- FUNCIONES DE PAGO (REDONDEO APLICADO) ---

function obtenerDatosPago($pdo) {
    $id = $_GET['id'];
    $credito = $pdo->query("SELECT * FROM creditos_corporativos WHERE id = $id")->fetch(PDO::FETCH_ASSOC);
    
    // Calcular interés al día
    $fechaUltimo = new DateTime($credito['fecha_ultimo_pago'] ?? $credito['fecha_desembolso']);
    $fechaHoy = new DateTime();
    
    if ($fechaHoy < $fechaUltimo) $fechaHoy = $fechaUltimo;

    $dias = $fechaUltimo->diff($fechaHoy)->days;
    
    // Cálculo con precisión
    $interesDiario = ($credito['saldo_capital'] * ($credito['tasa_interes_aplicada'] / 100)) / 360;
    
    // Redondeo final para mostrar al usuario
    $interesGenerado = round($interesDiario * $dias, 2);
    $interesPendiente = floatval($credito['interes_pendiente']);
    $totalInteres = round($interesGenerado + $interesPendiente, 2);
    
    $stmt = $pdo->prepare("SELECT * FROM plan_pagos_corp WHERE credito_id = ? AND estado != 'pagado' ORDER BY numero_cuota ASC LIMIT 1");
    $stmt->execute([$id]);
    $cuota = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'credito' => $credito,
        'calculos' => [
            'dias_transcurridos' => $dias,
            'interes_diario' => $interesDiario, // Se puede enviar con más decimales para JS si se quiere precisión visual
            'interes_generado_hoy' => $interesGenerado,
            'interes_acumulado_anterior' => round($interesPendiente, 2),
            'total_interes_pendiente' => $totalInteres
        ],
        'proxima_cuota_plan' => $cuota
    ]);
}

function registrarPago($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $pdo->beginTransaction();

        $creditoId = $data['credito_id'];
        $montoPago = round(floatval($data['monto_pagado']), 2); // Redondear entrada
        $fechaPago = $data['fecha_pago'];

        // Validar Crédito
        $sqlC = "SELECT * FROM creditos_corporativos WHERE id = ?";
        $stmtC = $pdo->prepare($sqlC);
        $stmtC->execute([$creditoId]);
        $credito = $stmtC->fetch(PDO::FETCH_ASSOC);

        // Recalcular Interés
        $fechaUltimo = new DateTime($credito['fecha_ultimo_pago'] ?? $credito['fecha_desembolso']);
        $fechaActual = new DateTime($fechaPago);
        
        $dias = $fechaUltimo->diff($fechaActual)->days;
        if ($fechaActual < $fechaUltimo) {
            throw new Exception("La fecha de pago no puede ser anterior al último movimiento.");
        }

        // Cálculo Interés Exacto
        $tasaDiaria = ($credito['tasa_interes_aplicada'] / 100) / 360;
        $interesGenerado = round(($credito['saldo_capital'] * $tasaDiaria) * $dias, 2); // Redondear
        
        $interesPendienteAnterior = round(floatval($credito['interes_pendiente']), 2);
        $totalInteres = round($interesGenerado + $interesPendienteAnterior, 2); // Redondear suma

        // Distribución
        $abonoInteres = min($montoPago, $totalInteres);
        $abonoInteres = round($abonoInteres, 2); // Asegurar 2 decimales
        
        $remanente = round($montoPago - $abonoInteres, 2);
        $abonoCapital = $remanente;
        
        $nuevoSaldo = round($credito['saldo_capital'] - $abonoCapital, 2);
        $nuevoInteresPendiente = round($totalInteres - $abonoInteres, 2);

        // Actualizar Crédito
        $updCred = $pdo->prepare("UPDATE creditos_corporativos SET saldo_capital = ?, interes_pendiente = ?, fecha_ultimo_pago = ? WHERE id = ?");
        $updCred->execute([$nuevoSaldo, $nuevoInteresPendiente, $fechaPago, $creditoId]);

        // Registrar Recibo
        $codRecibo = 'REC-' . time();
        $insRec = $pdo->prepare("INSERT INTO recibos_corp (credito_id, codigo_recibo, monto_total_pagado, abono_interes, abono_capital, fecha_transaccion, usuario_cajero) VALUES (?, ?, ?, ?, ?, ?, 'Sistema')");
        $insRec->execute([$creditoId, $codRecibo, $montoPago, $abonoInteres, $abonoCapital, $fechaPago]);

        // Actualizar Plan (Visual)
        $sqlPlan = "SELECT * FROM plan_pagos_corp WHERE credito_id = ? AND estado != 'pagado' ORDER BY numero_cuota ASC LIMIT 1";
        $stmtPlan = $pdo->prepare($sqlPlan);
        $stmtPlan->execute([$creditoId]);
        $cuota = $stmtPlan->fetch(PDO::FETCH_ASSOC);

        if ($cuota) {
            // Si se abonó capital significativo, marcamos como pagado o parcial
            $estado = ($abonoCapital >= ($cuota['capital_programado'] * 0.9)) ? 'pagado' : 'parcial';
            $updPlan = $pdo->prepare("UPDATE plan_pagos_corp SET estado = ?, fecha_pago_real = ?, monto_pagado_real = monto_pagado_real + ? WHERE id = ?");
            $updPlan->execute([$estado, $fechaPago, $montoPago, $cuota['id']]);
        }
        
        if ($nuevoSaldo <= 0.01) { // Margen de error mínimo para liquidar
             $pdo->query("UPDATE creditos_corporativos SET estado = 'finalizado', saldo_capital = 0 WHERE id = $creditoId");
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Pago aplicado', 'recibo' => $codRecibo]);

    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// --- CREACIÓN DE CRÉDITO ---

function simularCuotas($pdo) {
    $monto = floatval($_GET['monto']);
    $tasa = floatval($_GET['tasa']);
    $plazo = intval($_GET['plazo']);
    $comision = floatval($_GET['comision'] ?? 0);
    
    $plan = calcularAmortizacion($monto, $tasa, $plazo, $comision);
    echo json_encode($plan);
}

function crearCredito($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    _procesarCredito($pdo, $data);
}

function refinanciarCredito($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['refinancia_id'])) {
        echo json_encode(['error' => 'Falta ID anterior']); return;
    }
    _procesarCredito($pdo, $data);
}

function _procesarCredito($pdo, $data) {
    if (empty($data['cliente_id']) || empty($data['monto'])) {
        echo json_encode(['error' => 'Datos incompletos']); return;
    }

    try {
        $pdo->beginTransaction();

        $fechaDesembolso = date('Y-m-d');
        $anio = date('Y');
        
        $stmtC = $pdo->query("SELECT COUNT(*) FROM creditos_corporativos");
        $corr = $stmtC->fetchColumn() + 1;
        $codigo = "CORP-$anio-" . str_pad($corr, 4, '0', STR_PAD_LEFT);

        // Asegurar montos redondeados al inicio
        $montoAprobado = round(floatval($data['monto']), 2);

        $sql = "INSERT INTO creditos_corporativos (
            codigo_contrato, cliente_id, politica_id, asesor_id, zona_id,
            monto_solicitado, monto_aprobado, monto_entregado, saldo_capital,
            plazo_meses, tasa_interes_aplicada, tasa_mora_aplicada, 
            dia_pago, fecha_desembolso, estado, credito_anterior_id
        ) VALUES (
            :cod, :cli, :pol, :ase, :zon,
            :monto, :monto, :monto, :monto,
            :plazo, :tasa, :mora, 
            :dia, :fecha, 'activo', :ant
        )";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':cod' => $codigo,
            ':cli' => $data['cliente_id'],
            ':pol' => $data['politica_id'],
            ':ase' => $data['asesor_id'],
            ':zon' => $data['zona_id'],
            ':monto' => $montoAprobado,
            ':plazo' => $data['plazo'],
            ':tasa' => $data['tasa'],
            ':mora' => $data['tasa_mora'],
            ':dia' => $data['dia_pago'],
            ':fecha' => $fechaDesembolso,
            ':ant' => $data['refinancia_id'] ?? null
        ]);
        $creditoId = $pdo->lastInsertId();

        if (!empty($data['refinancia_id'])) {
            $pdo->prepare("UPDATE creditos_corporativos SET estado = 'refinanciado', saldo_capital = 0 WHERE id = ?")->execute([$data['refinancia_id']]);
        }

        if (!empty($data['garantias'])) {
            $sqlG = "INSERT INTO creditos_garantias_vinculo (credito_id, origen_tabla, referencia_id, valor_cobertura, descripcion_corta) VALUES (?, ?, ?, ?, ?)";
            $stmtG = $pdo->prepare($sqlG);
            foreach ($data['garantias'] as $g) {
                $origen = ($g['tipo'] == 'hipoteca') ? 'hipoteca' : 'garantia_bien';
                $stmtG->execute([$creditoId, $origen, $g['id'], round($g['valor'], 2), $g['desc']]);
            }
        }

        $comisionPct = floatval($data['comision_admin'] ?? 0);
        $plan = calcularAmortizacion($montoAprobado, floatval($data['tasa']), intval($data['plazo']), $comisionPct);
        
        $sqlPlan = "INSERT INTO plan_pagos_corp (credito_id, numero_cuota, fecha_vencimiento, capital_programado, interes_programado, comision_programada, cuota_total, saldo_proyectado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtPlan = $pdo->prepare($sqlPlan);

        $fechaBase = new DateTime($fechaDesembolso);
        $diaCorte = (int)$data['dia_pago'];

        foreach ($plan as $c) {
            $fechaBase->modify('+1 month');
            $anioActual = $fechaBase->format('Y');
            $mesActual = $fechaBase->format('m');
            $diasEnMes = cal_days_in_month(CAL_GREGORIAN, $mesActual, $anioActual);
            $diaReal = min($diaCorte, $diasEnMes);
            $fechaBase->setDate($anioActual, $mesActual, $diaReal);

            $stmtPlan->execute([
                $creditoId, $c['numero'], $fechaBase->format('Y-m-d'),
                $c['capital'], $c['interes'], $c['comision'], $c['cuota'], $c['saldo']
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Crédito creado', 'codigo' => $codigo]);

    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// --- MATEMÁTICA (CON REDONDEO 2 DECIMALES) ---
function calcularAmortizacion($monto, $tasaAnual, $plazo, $comisionPct = 0) {
    $saldo = $monto;
    $tasaMensual = ($tasaAnual / 100) / 12;
    $comisionFija = round($monto * ($comisionPct / 100), 2); // Redondear comisión
    
    if ($tasaAnual == 0) $cuotaBase = $monto / $plazo;
    else $cuotaBase = ($monto * $tasaMensual) / (1 - pow(1 + $tasaMensual, -$plazo));
    
    $plan = [];
    for ($i = 1; $i <= $plazo; $i++) {
        $interes = round($saldo * $tasaMensual, 2); // Redondear interés
        $capital = round($cuotaBase - $interes, 2); // Redondear capital
        $saldo -= $capital;
        $saldo = round($saldo, 2); // Redondear saldo

        if ($saldo < 0) $saldo = 0;
        if ($i == $plazo && $saldo > 0) { // Ajuste final en última cuota
            $capital += $saldo;
            $saldo = 0;
        }
        
        $cuotaTotal = round($capital + $interes + $comisionFija, 2);

        $plan[] = [
            'numero' => $i,
            'cuota' => $cuotaTotal,
            'interes' => $interes,
            'capital' => $capital,
            'comision' => $comisionFija,
            'saldo' => $saldo
        ];
    }
    return $plan;
}
?>