<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$host = 'localhost'; $dbname = 'financiera_sv'; $username = 'root'; $password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) { echo json_encode(['error' => $e->getMessage()]); exit; }

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// --- ROUTER ---
if ($method === 'GET') {
    if ($action === 'zonas') echo json_encode($pdo->query("SELECT * FROM zonas")->fetchAll(PDO::FETCH_ASSOC));
    elseif ($action === 'asesores') {
        $sql = "SELECT a.*, z.nombre as zona_nombre FROM asesores a LEFT JOIN zonas z ON a.zona_id = z.id";
        echo json_encode($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($action === 'politicas') echo json_encode($pdo->query("SELECT * FROM politicas_credito")->fetchAll(PDO::FETCH_ASSOC));
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($action === 'save_zona') saveZona($pdo, $data);
    elseif ($action === 'save_asesor') saveAsesor($pdo, $data);
    elseif ($action === 'save_politica') savePolitica($pdo, $data);
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'];
    if ($action === 'delete_zona') deleteEntity($pdo, 'zonas', $id);
    elseif ($action === 'delete_asesor') deleteEntity($pdo, 'asesores', $id);
    elseif ($action === 'delete_politica') deleteEntity($pdo, 'politicas_credito', $id);
}

// --- FUNCIONES ---

function saveZona($pdo, $data) {
    try {
        if (!empty($data['id'])) {
            $stmt = $pdo->prepare("UPDATE zonas SET nombre=?, codigo=?, responsable=? WHERE id=?");
            $stmt->execute([$data['nombre'], $data['codigo'], $data['responsable'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO zonas (nombre, codigo, responsable) VALUES (?, ?, ?)");
            $stmt->execute([$data['nombre'], $data['codigo'], $data['responsable']]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) { echo json_encode(['error' => $e->getMessage()]); }
}

function saveAsesor($pdo, $data) {
    try {
        if (!empty($data['id'])) {
            $stmt = $pdo->prepare("UPDATE asesores SET nombre=?, codigo_empleado=?, zona_id=?, telefono=? WHERE id=?");
            $stmt->execute([$data['nombre'], $data['codigo'], $data['zona_id'], $data['telefono'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO asesores (nombre, codigo_empleado, zona_id, telefono) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['nombre'], $data['codigo'], $data['zona_id'], $data['telefono']]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) { echo json_encode(['error' => $e->getMessage()]); }
}

function savePolitica($pdo, $data) {
    try {
        if (!empty($data['id'])) {
            $stmt = $pdo->prepare("UPDATE politicas_credito SET nombre=?, tasa_interes_anual=?, tasa_mora_anual=?, comision_admin=?, plazo_maximo_meses=?, dias_para_incobrable=? WHERE id=?");
            $stmt->execute([$data['nombre'], $data['tasa'], $data['mora'], $data['comision'], $data['plazo'], $data['dias_incobrable'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO politicas_credito (nombre, tasa_interes_anual, tasa_mora_anual, comision_admin, plazo_maximo_meses, dias_para_incobrable) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['nombre'], $data['tasa'], $data['mora'], $data['comision'], $data['plazo'], $data['dias_incobrable']]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) { echo json_encode(['error' => $e->getMessage()]); }
}

function deleteEntity($pdo, $table, $id) {
    try {
        // Validar integridad referencial simple
        $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) { 
        echo json_encode(['error' => 'No se puede eliminar: El registro está en uso por créditos activos.']); 
    }
}
?>