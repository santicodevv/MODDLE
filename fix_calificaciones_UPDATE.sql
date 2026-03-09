-- =====================================================
-- SCRIPT DE CORRECCIÓN: UPDATE
-- Corrige el student_id usando el mapeo de app_users
-- Ejecutar en Neon.tech PostgreSQL
-- =====================================================

-- PASO 1: Verificar cuántos registros se actualizarán
SELECT COUNT(*) as registros_a_actualizar
FROM course_student_grades csg
INNER JOIN app_users au ON au.moodle_user_id = csg.student_id
WHERE csg.student_id != au.id;

-- PASO 2: Ejecutar el UPDATE dentro de una transacción
BEGIN;

-- Actualizar student_id con el ID correcto de app_users
-- El student_id actual contiene el moodle_user_id
-- Lo reemplazamos con app_users.id donde moodle_user_id coincide
UPDATE course_student_grades csg
SET student_id = au.id
FROM app_users au
WHERE au.moodle_user_id = csg.student_id
  AND csg.student_id != au.id;

-- PASO 3: Verificar registros huérfanos (sin mapeo)
-- Estos son estudiantes con moodle_user_id 111 y 128 que no existen en app_users
SELECT csg.id, csg.student_id as moodle_user_id_sin_mapeo,
       csg.course_name, csg.total_grade, csg.comment
FROM course_student_grades csg
LEFT JOIN app_users au ON au.id = csg.student_id
WHERE au.id IS NULL;

-- PASO 4: Si todo está correcto, confirmar
COMMIT;

-- Si algo salió mal, descomentar esto en lugar de COMMIT:
-- ROLLBACK;

-- =====================================================
-- PASO 5: Verificación final
-- Verificar que las notas ahora aparecen correctamente
-- =====================================================

-- Ejemplo: Ver notas de un estudiante específico (usar email conocido)
SELECT
    au.email,
    au.display_name,
    csg.course_name,
    csg.total_grade,
    csg.comment
FROM course_student_grades csg
JOIN app_users au ON au.id = csg.student_id
WHERE au.email = 'Kerlinalmonte088@gmail.com'  -- Cambiar por email de prueba
LIMIT 10;

-- =====================================================
-- OPCIONAL: Eliminar registros huérfanos (moodle_user_id 111 y 128)
-- Solo si decides que no son necesarios
-- =====================================================
-- DELETE FROM course_student_grades
-- WHERE student_id IN (111, 128);
