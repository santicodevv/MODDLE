// SEBTI organization approved by the user. Preview by default, --apply to write.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
const plan = [
  { parent: 2, name: 'La Misión y las Misiones', courses: [89] },
  { parent: 2, name: 'Hechos', courses: [91, 101] },
  { parent: 2, name: 'Teología Propia y Bibliología', courses: [92] },
  { parent: 2, name: 'Modelos Ministeriales', courses: [96, 100] },
  { parent: 2, name: 'Cristología y Neumatología', courses: [98] },
  { parent: 3, name: 'Teología Propia y Bibliología', courses: [19] },
  { parent: 3, name: 'Antropología y Soteriología', courses: [22, 83, 88] },
  { parent: 3, name: 'Libros Históricos', courses: [24, 57, 84] },
  { parent: 3, name: 'Pentateuco', courses: [27, 56, 87] },
  { parent: 3, name: 'La Misión y las Misiones', courses: [29, 85] },
  { parent: 3, name: 'Hechos', courses: [37] },
  { parent: 3, name: 'Modelos Ministeriales', courses: [39] },
  { parent: 3, name: 'Historia de la Iglesia', courses: [46, 70] },
  { parent: 3, name: 'Evangelios Sinópticos', courses: [48] },
  { parent: 3, name: 'Romanos y Gálatas', courses: [49, 58] },
  { parent: 3, name: 'Ética Cristiana', courses: [51] },
  { parent: 3, name: 'Trabajo Grupal II', courses: [61] },
  { parent: 3, name: 'Cristología y Neumatología', courses: [66] },
];
async function main() {
  assert(process.argv.slice(2).every(x => x === '--apply'), 'Only --apply supported');
  const apply = process.argv.includes('--apply');
  const cfg = JSON.parse(process.env.MODDLE_REVIEW_CONFIG || '{}');
  assert.equal(new URL(cfg.MOODLE_URL).hostname, 'campus.sebti.edu.do');
  const url = new URL(cfg.DATABASE_URL); url.searchParams.set('sslmode', 'verify-full');
  const db = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
  const journalFile = path.join(__dirname, '..', 'tmp', 'organize-sebti-journal.jsonl');
  function journal(data) { fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.appendFileSync(journalFile, JSON.stringify({ time: new Date().toISOString(), ...data }) + '\n'); }
  async function moodle(fn, params = {}) {
    const body = new URLSearchParams({ wstoken: cfg.MOODLE_TOKEN, wsfunction: fn, moodlewsrestformat: 'json' });
    for (const [key, value] of Object.entries(params)) body.set(key, String(value));
    const res = await fetch(cfg.MOODLE_URL.replace(/\/$/, '') + '/webservice/rest/server.php', { method: 'POST', body, signal: AbortSignal.timeout(30000) });
    assert(res.ok, `Moodle HTTP ${res.status}`); const data = await res.json();
    assert(!data?.exception, `${fn}: ${data?.errorcode}`); return data;
  }
  await db.connect(); let transaction = false;
  try {
    const functions = (await moodle('core_webservice_get_site_info')).functions.map(f => f.name);
    const missingFunctions = ['core_course_create_categories', 'core_course_update_courses'].filter(fn => !functions.includes(fn));
    let categories = await moodle('core_course_get_categories');
    const remote = new Map((await moodle('core_course_get_courses')).map(c => [Number(c.id), c]));
    const ids = plan.flatMap(p => p.courses);
    const local = new Map((await db.query('SELECT moodle_id,category_id,shortname,fullname FROM moodle_courses WHERE moodle_id=ANY($1::bigint[])', [ids])).rows.map(c => [Number(c.moodle_id), c]));
    assert.equal(categories.find(c => c.id === 2)?.name, 'DIPLOMATURA');
    assert.equal(categories.find(c => c.id === 3)?.name, 'TECNICATURA');
    for (const p of plan) {
      const matches = categories.filter(c => c.parent === p.parent && c.name === p.name);
      assert(matches.length <= 1, `Ambiguous category ${p.name}`); p.target = matches[0]?.id;
      for (const id of p.courses) {
        const l = local.get(id), r = remote.get(id);
        assert(l && r && l.shortname === r.shortname && l.fullname.trim() === r.fullname.trim(), `Course identity mismatch ${id}`);
        const allowed = [id === 88 ? 1 : p.parent, p.target];
        assert(allowed.includes(Number(l.category_id)) && allowed.includes(Number(r.categoryid ?? r.category)), `Unexpected assignment ${id}`);
      }
    }
    const protectedRows = async () => createHash('sha256').update(JSON.stringify(await db.query('SELECT * FROM course_student_grades ORDER BY id').then(r => r.rows)) + JSON.stringify(await db.query('SELECT * FROM sga_student_programs ORDER BY id').then(r => r.rows))).digest('hex');
    const before = await protectedRows();
    const impact = (await db.query('SELECT count(total_grade)::int AS final_grades,count(DISTINCT student_id) FILTER(WHERE total_grade IS NOT NULL)::int AS students FROM course_student_grades WHERE course_moodle_id=ANY($1::bigint[])', [ids])).rows[0];
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', plan, impact, missingFunctions }, null, 2));
    if (!apply) return;
    assert.equal(missingFunctions.length, 0, `Enable functions first: ${missingFunctions.join(', ')}`);
    journal({ phase: 'validated', plan, previousCourses: [...local.values()], protectedHash: before });
    const missing = plan.filter(p => !p.target);
    if (missing.length) {
      const params = {}; missing.forEach((p, i) => { params[`categories[${i}][name]`] = p.name; params[`categories[${i}][parent]`] = p.parent; });
      journal({ phase: 'creating_categories', names: missing.map(p => p.name) });
      journal({ phase: 'created_categories', categories: await moodle('core_course_create_categories', params) });
    }
    categories = await moodle('core_course_get_categories');
    for (const p of plan) { const matches = categories.filter(c => c.parent === p.parent && c.name === p.name); assert.equal(matches.length, 1); p.target = matches[0].id; }
    const moves = plan.flatMap(p => p.courses.filter(id => Number(remote.get(id).categoryid ?? remote.get(id).category) !== p.target).map(id => ({ id, categoryid: p.target })));
    if (moves.length) {
      const params = {}; moves.forEach((move, i) => Object.entries(move).forEach(([key, value]) => { params[`courses[${i}][${key}]`] = value; }));
      journal({ phase: 'moving_courses', moves }); const result = await moodle('core_course_update_courses', params); journal({ phase: 'moved_courses', result });
      assert(!result?.warnings?.length, 'Moodle warnings: inspect journal');
    }
    const verified = new Map((await moodle('core_course_get_courses')).map(c => [Number(c.id), c]));
    for (const p of plan) for (const id of p.courses) { assert.equal(Number(verified.get(id).categoryid ?? verified.get(id).category), p.target); assert.equal(verified.get(id).visible, remote.get(id).visible); }
    categories = await moodle('core_course_get_categories');
    await db.query('BEGIN'); transaction = true; await db.query("SET LOCAL lock_timeout='5s'");
    for (const p of plan) {
      const cat = categories.find(c => c.id === p.target);
      const existing = (await db.query('SELECT name,parent FROM moodle_categories WHERE moodle_id=$1', [cat.id])).rows[0];
      assert(!existing || (existing.name === cat.name && Number(existing.parent) === p.parent), 'Category ID collision');
      await db.query(`INSERT INTO moodle_categories(moodle_id,name,parent,description,depth,path,coursecount,visible,timemodified,last_synced_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()) ON CONFLICT(moodle_id) DO UPDATE SET name=EXCLUDED.name,parent=EXCLUDED.parent,depth=EXCLUDED.depth,path=EXCLUDED.path,coursecount=EXCLUDED.coursecount,visible=EXCLUDED.visible,timemodified=EXCLUDED.timemodified,last_synced_at=now(),updated_at=now()`, [cat.id,cat.name,cat.parent,cat.description||'',cat.depth,cat.path,cat.coursecount,cat.visible===1,cat.timemodified?new Date(cat.timemodified*1000):null]);
      for (const id of p.courses) {
        const current = (await db.query('SELECT category_id FROM moodle_courses WHERE moodle_id=$1 FOR UPDATE', [id])).rows[0];
        if (Number(current.category_id) === p.target) continue;
        assert.equal(Number(current.category_id), Number(local.get(id).category_id), `Concurrent change ${id}`);
        await db.query('UPDATE moodle_courses SET category_id=$1,updated_at=now() WHERE moodle_id=$2', [p.target,id]);
        await db.query('INSERT INTO audit_log(action,entity,entity_key,before_data,after_data,source) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6)', ['repair_sebti_subprogram','moodle_course',String(id),JSON.stringify({categoryId:Number(current.category_id)}),JSON.stringify({categoryId:p.target,categoryName:p.name,programId:p.parent}), 'maintenance']);
      }
    }
    assert.equal(await protectedRows(), before, 'Grades or assignments changed during operation');
    await db.query('COMMIT'); transaction = false; journal({ phase: 'committed', plan, impact, protectedHash: before });
    console.log(JSON.stringify({ committed: true, categories: plan.map(p => ({ id:p.target,name:p.name,parent:p.parent })), courses: ids.length, impact, gradesAndAssignmentsUnchanged: true }, null, 2));
  } catch (e) { if (transaction) await db.query('ROLLBACK'); throw e; } finally { await db.end(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
