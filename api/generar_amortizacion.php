<?php
// generar_amortizacion.php
require_once 'funcion_amortizacion.php';

// Configurar headers para JSON
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['prestamo_id'], $data['monto'], $data['tasa'], $data['plazo'], $data['fecha_inicio'])) {
        echo json_encode(['error' => 'Faltan parámetros']);
        exit;
    }
    
    $prestamo_id = $data['prestamo_id'];
    $monto = $data['monto'];
    $tasa = $data['tasa'];
    $plazo = $data['plazo'];
    $fecha_inicio = $data['fecha_inicio'];
    
    // Generar tabla de amortización
    try {
        $tabla = generarTablaAmortizacion($prestamo_id, $monto, $tasa, $plazo, $fecha_inicio);
        
        echo json_encode([
            'success' => true,
            'message' => 'Tabla de amortización generada',
            'cuotas' => count($tabla),
            'primera_cuota' => $tabla[0]['fecha_vencimiento'],
            'cuota_mensual' => $tabla[0]['cuota_total']
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'error' => 'Error al generar amortización: ' . $e->getMessage()
        ]);
    }
} else {
    echo json_encode(['error' => 'Método no permitido']);
}
?>