<?php
// usuarios.php - API REST para la gestión de usuarios
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de la base de datos
$host = 'localhost';
$dbname = 'financiera_sv';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Obtener datos del cuerpo de la solicitud (para POST, PUT)
$data = [];
if ($method === 'POST' || $method === 'PUT') {
    // Lee el cuerpo de la solicitud HTTP (JSON)
    $data = json_decode(file_get_contents('php://input'), true);
}


switch ($method) {
    case 'GET':
        // Si hay un ID en la URL, obtener un usuario específico
        if (isset($_GET['id'])) {
            getUsuario($pdo, $_GET['id']);
        } else {
            getUsuarios($pdo);
        }
        break;
    case 'POST':
        createUsuario($pdo, $data);
        break;
    case 'PUT':
        // El ID debe venir en la URL para actualizar
        $id = $_GET['id'] ?? null;
        updateUsuario($pdo, $id, $data);
        break;
    case 'DELETE':
        // El ID debe venir en la URL para eliminar
        $id = $_GET['id'] ?? null;
        deleteUsuario($pdo, $id);
        break;
    default:
        http_response_code(405); // Método no permitido
        echo json_encode(['error' => 'Método no permitido']);
        break;
}

// -------------------------------------------------------------
// FUNCIÓN GET USUARIOS
// -------------------------------------------------------------

function getUsuarios($pdo) {
    try {
        // Excluimos la columna 'password' por seguridad
        $stmt = $pdo->query("SELECT id, nombre, email, activo, rol, fecha_creacion FROM usuarios ORDER BY nombre ASC");
        $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($usuarios);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// -------------------------------------------------------------
// FUNCIÓN GET USUARIO
// -------------------------------------------------------------

function getUsuario($pdo, $id) {
    try {
        // Excluimos la columna 'password' por seguridad
        $stmt = $pdo->prepare("SELECT id, nombre, email, activo, rol, fecha_creacion FROM usuarios WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($usuario) {
            echo json_encode($usuario);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Usuario no encontrado']);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// -------------------------------------------------------------
// FUNCIÓN CREATE USUARIO
// -------------------------------------------------------------

function createUsuario($pdo, $data) {
    // Validaciones básicas: nombre, email y contraseña son requeridos
    if (empty($data['nombre']) || empty($data['email']) || empty($data['password'])) {
        http_response_code(400); // Solicitud incorrecta
        echo json_encode(['error' => 'Nombre, email y contraseña son requeridos']);
        return;
    }
    
    // Hash de la contraseña
    $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
    $rol = $data['rol'] ?? 'usuario';
    $activo = $data['activo'] ?? 1; // Por defecto activo
    
    try {
        $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, password, activo, rol) 
                                 VALUES (:nombre, :email, :password, :activo, :rol)");
        
        $stmt->execute([
            ':nombre' => $data['nombre'],
            ':email' => $data['email'],
            ':password' => $hashed_password,
            ':activo' => $activo,
            ':rol' => $rol
        ]);
        
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Usuario creado exitosamente'
        ]);
        
    } catch(PDOException $e) {
        // Código de error 23000 es para violación de unicidad (email duplicado)
        if ($e->getCode() === '23000') {
            http_response_code(409); // Conflicto
            echo json_encode(['error' => 'El email ya está registrado para otro usuario']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Error al crear usuario: ' . $e->getMessage()]);
        }
    }
}

// -------------------------------------------------------------
// FUNCIÓN UPDATE USUARIO (con Validación de Administrador)
// -------------------------------------------------------------

function updateUsuario($pdo, $id, $data) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de usuario requerido para actualizar']);
        return;
    }
    
    // 1. OBTENER LOS DATOS ACTUALES DEL USUARIO
    $stmt_fetch = $pdo->prepare("SELECT nombre, email, activo, rol FROM usuarios WHERE id = :id");
    $stmt_fetch->execute([':id' => $id]);
    $usuario_actual = $stmt_fetch->fetch(PDO::FETCH_ASSOC);

    if (!$usuario_actual) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        return;
    }

    // 2. CONSOLIDAR DATOS: Usar los nuevos datos si se envían, o los actuales si no se envían.
    $nombre = $data['nombre'] ?? $usuario_actual['nombre'];
    $email = $data['email'] ?? $usuario_actual['email'];
    $activo = $data['activo'] ?? $usuario_actual['activo'];
    $rol = $data['rol'] ?? $usuario_actual['rol'];

    // ------------------------------------------------------------------
    // 🛑 VALIDACIÓN DE SEGURIDAD PARA EL ROL ADMIN
    // ------------------------------------------------------------------
    if ($usuario_actual['rol'] === 'admin') {
        // Si el usuario es ADMIN, evitamos que:
        // a) Se desactive (activo = 0)
        // b) Se degrade de rol (si se intenta cambiar el rol)
        if ($activo == 0 || $rol !== 'admin') {
            http_response_code(403); // Prohibido
            echo json_encode(['error' => '❌ Seguridad: No se permite desactivar o degradar el rol del usuario Administrador.']);
            return; // Detiene la ejecución
        }
    }
    // ------------------------------------------------------------------
    
    // 3. RE-VALIDAR los campos obligatorios.
    if (empty($nombre) || empty($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre y email son requeridos']);
        return;
    }

    // ------------------------------------------------------------------
    // CONSTRUCCIÓN DEL QUERY DE ACTUALIZACIÓN
    // ------------------------------------------------------------------
    $sql = "UPDATE usuarios SET nombre = :nombre, email = :email, activo = :activo, rol = :rol";
    $params = [
        ':nombre' => $nombre,
        ':email' => $email,
        ':activo' => $activo,
        ':rol' => $rol,
        ':id' => $id
    ];
    
    // Si se proporciona una nueva contraseña, la incluimos
    if (!empty($data['password'])) {
        $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
        $sql .= ", password = :password";
        $params[':password'] = $hashed_password;
    }
    
    $sql .= " WHERE id = :id";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Retornamos éxito siempre si no hay error 404/409/500
        echo json_encode(['success' => true, 'message' => 'Usuario actualizado exitosamente']);

        
    } catch(PDOException $e) {
        if ($e->getCode() === '23000') {
            http_response_code(409); // Conflicto (Email duplicado)
            echo json_encode(['error' => 'El email ya está registrado para otro usuario']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar usuario: ' . $e->getMessage()]);
        }
    }
}

// -------------------------------------------------------------
// FUNCIÓN DELETE USUARIO
// -------------------------------------------------------------

function deleteUsuario($pdo, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de usuario requerido para eliminar']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = :id");
        $stmt->execute([':id' => $id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Usuario eliminado exitosamente'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Usuario no encontrado']);
        }
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar usuario: ' . $e->getMessage()]);
    }
}
?>