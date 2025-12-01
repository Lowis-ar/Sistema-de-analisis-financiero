<?php
define('PORCENTAJES_DEPRECIACION', [
    'edificaciones' => ['porcentaje' => 0.05, 'vida' => 20, 'label' => 'Edificaciones (5%)'],
    'maquinaria' => ['porcentaje' => 0.20, 'vida' => 5, 'label' => 'Maquinaria (20%)'],
    'vehiculos' => ['porcentaje' => 0.25, 'vida' => 4, 'label' => 'Vehículos (25%)'],
    'otros' => ['porcentaje' => 0.50, 'vida' => 2, 'label' => 'Otros Bienes (50%)']
]);

define('TIPOS_PRESTAMO', [
    ['id' => 'personal', 'nombre' => 'Personal', 'tasa_base' => 12],
    ['id' => 'hipotecario', 'nombre' => 'Hipotecario', 'tasa_base' => 8],
    ['id' => 'agricola', 'nombre' => 'Agrícola', 'tasa_base' => 6],
    ['id' => 'construccion', 'nombre' => 'Construcción', 'tasa_base' => 9],
    ['id' => 'empresa', 'nombre' => 'Capital Semilla/Empresa', 'tasa_base' => 10]
]);

// Función para formatear moneda en PHP
function formatCurrencyPHP($amount) {
    return '$' . number_format($amount, 2);
}

// Función para calcular cuota
function calcularCuotaPHP($monto, $tasaAnual, $plazoMeses) {
    if (!$monto || !$tasaAnual || !$plazoMeses) return 0;
    $tasaMensual = ($tasaAnual / 100) / 12;
    return ($monto * $tasaMensual) / (1 - pow(1 + $tasaMensual, -$plazoMeses));
}
?>