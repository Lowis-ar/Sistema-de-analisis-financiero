<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    getDashboardStats();
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}

function getDashboardStats() {
    global $conn;
    
    try {
        // Cartera total y mora
        $stmt = $conn->query("SELECT 
            SUM(saldo_actual) as cartera_total,
            SUM(CASE WHEN estado IN ('mora', 'incobrable') THEN saldo_actual ELSE 0 END) as mora_total,
            COUNT(CASE WHEN estado IN ('mora', 'incobrable') THEN 1 END) as clientes_riesgo
        FROM prestamos");
        $prestamos = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Total clientes
        $stmt = $conn->query("SELECT COUNT(*) as total_clientes FROM clientes");
        $clientes = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Activos netos
        $stmt = $conn->query("SELECT * FROM activos");
        $activos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $activos_netos = 0;
        foreach ($activos as $activo) {
            $depreciacion = calcularDepreciacionActivo($activo);
            $activos_netos += $depreciacion['libros'];
        }
        
        echo json_encode([
            'carteraTotal' => floatval($prestamos['cartera_total'] ?? 0),
            'moraTotal' => floatval($prestamos['mora_total'] ?? 0),
            'clientesRiesgo' => intval($prestamos['clientes_riesgo'] ?? 0),
            'activosNetos' => $activos_netos,
            'totalClientes' => intval($clientes['total_clientes'] ?? 0)
        ]);
        
    } catch(PDOException $exception) {
        http_response_code(500);
        echo json_encode(['error' => $exception->getMessage()]);
    }
}

function calcularDepreciacionActivo($activo) {
    $fechaCompra = new DateTime($activo['fecha_compra']);
    $hoy = new DateTime();
    
    $diff = $hoy->diff($fechaCompra);
    $diffDias = $diff->days;
    
    $depAnual = $activo['valor'] * $activo['porcentaje_depreciacion'];
    $depDiaria = $depAnual / 365;
    
    $depreciacionAcumulada = $depDiaria * $diffDias;
    $valorLibros = $activo['valor'] - $depreciacionAcumulada;
    
    return [
        'diaria' => $depDiaria,
        'acumulada' => $depreciacionAcumulada > $activo['valor'] ? $activo['valor'] : $depreciacionAcumulada,
        'libros' => $valorLibros < 0 ? 0 : $valorLibros
    ];
}
?>