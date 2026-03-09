-- =====================================================
-- SCRIPT DE CORRECCIÓN: DELETE + INSERT LIMPIO
-- Elimina todos los registros y los recrea con IDs correctos
-- Ejecutar en Neon.tech PostgreSQL
-- =====================================================

-- IMPORTANTE: Este script usa una tabla temporal con el mapeo
-- moodle_user_id -> app_users.id para corregir los INSERTs

BEGIN;

-- =====================================================
-- PASO 1: Respaldar datos actuales (opcional pero recomendado)
-- =====================================================
CREATE TABLE IF NOT EXISTS course_student_grades_backup AS
SELECT * FROM course_student_grades;

-- =====================================================
-- PASO 2: Eliminar todos los registros existentes
-- (Solo los que fueron insertados con IDs incorrectos)
-- =====================================================
DELETE FROM course_student_grades;

-- =====================================================
-- PASO 3: Crear tabla temporal con mapeo de IDs
-- moodle_user_id -> app_users.id
-- =====================================================
CREATE TEMP TABLE id_mapping AS
SELECT moodle_user_id as moodle_id, id as app_user_id
FROM app_users
WHERE moodle_user_id IS NOT NULL;

-- =====================================================
-- PASO 4: Restaurar datos con IDs correctos
-- Usando los datos del backup y el mapeo
-- =====================================================
INSERT INTO course_student_grades (
    course_moodle_id,
    course_name,
    course_shortname,
    student_id,
    period_id,
    teacher_id,
    total_grade,
    comment,
    created_at,
    updated_at
)
SELECT
    b.course_moodle_id,
    b.course_name,
    b.course_shortname,
    m.app_user_id,  -- ID correcto de app_users
    b.period_id,
    b.teacher_id,
    b.total_grade,
    b.comment,
    b.created_at,
    b.updated_at
FROM course_student_grades_backup b
JOIN id_mapping m ON m.moodle_id = b.student_id;

-- =====================================================
-- PASO 5: Verificar resultados
-- =====================================================

-- Contar registros insertados
SELECT COUNT(*) as registros_insertados FROM course_student_grades;

-- Verificar un estudiante de ejemplo
SELECT
    au.email,
    au.display_name,
    csg.course_name,
    csg.total_grade,
    csg.comment
FROM course_student_grades csg
JOIN app_users au ON au.id = csg.student_id
WHERE au.moodle_user_id = 13  -- Kerlin Almonte (moodle_user_id=13)
LIMIT 5;

-- Ver registros que no se pudieron mapear (en el backup)
SELECT DISTINCT b.student_id as moodle_user_id_sin_mapeo
FROM course_student_grades_backup b
LEFT JOIN id_mapping m ON m.moodle_id = b.student_id
WHERE m.app_user_id IS NULL;

-- =====================================================
-- PASO 6: Si todo está correcto, confirmar
-- =====================================================
COMMIT;

-- Si algo salió mal:
-- ROLLBACK;

-- =====================================================
-- PASO 7: Limpieza (ejecutar después de verificar)
-- =====================================================
-- DROP TABLE IF EXISTS course_student_grades_backup;
-- DROP TABLE IF EXISTS id_mapping;
