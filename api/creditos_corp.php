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
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'create') crearCredito($pdo);
    elseif ($action === 'refinanciar') refinanciarCredito($pdo); // Ahora sí existe la función
}

// --- FUNCIONES PÚBLICAS ---

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
                       z.nombre as zona_nombre
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

function simularCuotas($pdo) {
    $monto = $_GET['monto'];
    $tasa = $_GET['tasa'];
    $plazo = $_GET['plazo'];
    $comision = $_GET['comision'] ?? 0;
    
    $plan = calcularAmortizacion($monto, $tasa, $plazo, $comision);
    echo json_encode($plan);
}

// Función para Crear Crédito Nuevo
function crearCredito($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    // Llamamos a la lógica central
    _procesarCredito($pdo, $data);
}

// Función para Refinanciar (La que faltaba)
function refinanciarCredito($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validación extra para refinanciamiento
    if (empty($data['refinancia_id'])) {
        echo json_encode(['error' => 'Para refinanciar se requiere el ID del crédito anterior']);
        return;
    }
    
    // Llamamos a la misma lógica central
    _procesarCredito($pdo, $data);
}

// --- LÓGICA CENTRAL (PRIVADA) ---
// Unifica la lógica de guardar para evitar duplicar código
function _procesarCredito($pdo, $data) {
    if (empty($data['cliente_id']) || empty($data['monto'])) {
        echo json_encode(['error' => 'Faltan datos obligatorios']); return;
    }

    try {
        $pdo->beginTransaction();

        // 1. Generar Contrato
        $anio = date('Y');
        $stmtCount = $pdo->query("SELECT COUNT(*) FROM creditos_corporativos");
        $corr = $stmtCount->fetchColumn() + 1;
        $codigo = "CORP-$anio-" . str_pad($corr, 4, '0', STR_PAD_LEFT);

        // 2. Insertar Encabezado
        $sql = "INSERT INTO creditos_corporativos (
            codigo_contrato, cliente_id, politica_id, asesor_id, zona_id,
            monto_solicitado, monto_aprobado, monto_entregado, saldo_capital,
            plazo_meses, tasa_interes_aplicada, tasa_mora_aplicada, 
            dia_pago, fecha_desembolso, estado, credito_anterior_id
        ) VALUES (
            :cod, :cli, :pol, :ase, :zon,
            :monto, :monto, :monto_neto, :monto,
            :plazo, :tasa, :mora, 
            :dia, CURDATE(), 'activo', :anterior
        )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':cod' => $codigo,
            ':cli' => $data['cliente_id'],
            ':pol' => $data['politica_id'],
            ':ase' => $data['asesor_id'],
            ':zon' => $data['zona_id'],
            ':monto' => $data['monto'],
            ':monto_neto' => $data['monto'], // Aquí podrías restar comisiones si aplica
            ':plazo' => $data['plazo'],
            ':tasa' => $data['tasa'],
            ':mora' => $data['tasa_mora'],
            ':dia' => $data['dia_pago'],
            ':anterior' => $data['refinancia_id'] ?? null
        ]);
        $creditoId = $pdo->lastInsertId();

        // 3. Si es Refinanciamiento: Cancelar crédito anterior
        if (!empty($data['refinancia_id'])) {
            // Actualizamos estado y ponemos saldo a 0 (se asume pagado con el nuevo)
            $upd = $pdo->prepare("UPDATE creditos_corporativos SET estado = 'refinanciado', saldo_capital = 0 WHERE id = ?");
            $upd->execute([$data['refinancia_id']]);
        }

        // 4. Vincular Garantías
        if (!empty($data['garantias'])) {
            $sqlGar = "INSERT INTO creditos_garantias_vinculo (credito_id, origen_tabla, referencia_id, valor_cobertura, descripcion_corta) 
                       VALUES (?, ?, ?, ?, ?)";
            $stmtGar = $pdo->prepare($sqlGar);
            foreach ($data['garantias'] as $g) {
                // Definir tipo de tabla origen
                $tablaOrigen = ($g['tipo'] == 'hipoteca') ? 'hipoteca' : 'garantia_bien';
                $stmtGar->execute([$creditoId, $tablaOrigen, $g['id'], $g['valor'], $g['desc']]);
            }
        }

        // 5. Generar Plan de Pagos
        $comisionPct = $data['comision_admin'] ?? 0;
        $plan = calcularAmortizacion($data['monto'], $data['tasa'], $data['plazo'], $comisionPct);
        
        $sqlPlan = "INSERT INTO plan_pagos_corp (
            credito_id, numero_cuota, fecha_vencimiento, 
            capital_programado, interes_programado, comision_programada, cuota_total, saldo_proyectado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtPlan = $pdo->prepare($sqlPlan);

        $fechaPago = new DateTime();
        $diaCorte = (int)$data['dia_pago'];

        foreach ($plan as $c) {
            $fechaPago->modify('+1 month');
            // Ajuste de día de pago (si el mes no tiene ese día, usa el último)
            $diaSafe = min($diaCorte, (int)$fechaPago->format('t'));
            $fechaPago->setDate((int)$fechaPago->format('Y'), (int)$fechaPago->format('m'), $diaSafe);

            $stmtPlan->execute([
                $creditoId, $c['numero'], $fechaPago->format('Y-m-d'),
                $c['capital'], $c['interes'], $c['comision'], $c['cuota'], $c['saldo']
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Crédito Corporativo procesado correctamente', 'codigo' => $codigo]);

    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['error' => 'Error procesando crédito: ' . $e->getMessage()]);
    }
}

// --- MATEMÁTICA FINANCIERA ---
function calcularAmortizacion($monto, $tasaAnual, $plazo, $comisionPct = 0) {
    $saldo = $monto;
    $tasaMensual = ($tasaAnual / 100) / 12;
    $comisionMensual = ($monto * ($comisionPct / 100));
    
    if ($tasaAnual == 0) {
        $cuotaBase = $monto / $plazo;
    } else {
        $cuotaBase = ($monto * $tasaMensual) / (1 - pow(1 + $tasaMensual, -$plazo));
    }
    
    $plan = [];
    for ($i = 1; $i <= $plazo; $i++) {
        $interes = $saldo * $tasaMensual;
        $capital = $cuotaBase - $interes;
        $saldo -= $capital;
        if ($saldo < 0) $saldo = 0;

        $plan[] = [
            'numero' => $i,
            'cuota' => round($cuotaBase + $comisionMensual, 2),
            'interes' => round($interes, 2),
            'capital' => round($capital, 2),
            'comision' => round($comisionMensual, 2),
            'saldo' => round($saldo, 2)
        ];
    }
    return $plan;
}
?>