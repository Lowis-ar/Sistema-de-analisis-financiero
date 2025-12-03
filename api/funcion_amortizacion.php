<?php
// funcion_amortizacion.php

function calcularCuotaFrances($monto, $tasaAnual, $plazoMeses) {
    /**
     * Fórmula método francés
     */
    
    $tasaMensual = ($tasaAnual / 12) / 100;
    
    if ($tasaMensual == 0) {
        return round($monto / $plazoMeses, 2);
    }
    
    $factor = pow(1 + $tasaMensual, $plazoMeses);
    $cuota = ($monto * $tasaMensual * $factor) / ($factor - 1);
    
    return round($cuota, 2);
}

function getTablaAmortizacion($pdo, $prestamo_id) {
    /**
     * Obtener tabla de amortización de la BD
     */
    $stmt = $pdo->prepare("
        SELECT * FROM amortizacion_frances 
        WHERE prestamo_id = ? 
        ORDER BY numero_cuota ASC
    ");
    $stmt->execute([$prestamo_id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>