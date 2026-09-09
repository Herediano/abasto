## Exposición pública (dev) — ngrok (canónico, estable)

- **Flujo estable:** build + `vite preview` (estático) sirviendo `dist/` en 5173
  con proxy `/api` → 3000, y un único túnel **ngrok** `http 5173`.
  Preferir preview sobre `vite dev`: dev transforma módulos al vuelo y los
  túneles cortan respuestas lentas con 502/Bad Gateway.
- Scripts en `.run/`: `tunnel-frontend-ngrok.cmd` (ngrok http 5173), lanzados
  SIEMPRE vía `.vbs` (el harness mata `.cmd` directos que quedan esperando).
- La URL sale en `.run/ngrok-frontend.log` (`url=https://<subdominio>.ngrok-free.dev`).
  Es estable mientras viva el proceso ngrok.
- **`ERR_NGROK_105`** (authtoken "does not look like a proper authtoken"): el
  token pegado es inválido/cortado. Un token válido es de ~52 chars
  (`xxxx_yyyy`). Reconfigurar con `ngrok config add-authtoken` y relanzar.
- **Advertencia ngrok:** la primera visita desde un navegador muestra la página
  "You are about to visit…" — un clic en "Visit Site" y entra. Para verificaciones
  sin navegador, mandar header `ngrok-skip-browser-warning: 1`.
- **Frontend con una sola URL:** `frontend/.env` es `VITE_API_URL="/api"` (relativo);
  el preview proxya `/api` al backend. NO apuntar a la URL de un túnel del backend
  (config vieja y frágil: dos túneles → CORS y 502/503 cuando uno se cae).
- Fallidos por DNS/red de esta VM: cloudflared (resuelve `api.trycloudflare.com`),
  pinggy sin imprimir URL, localhost.run exige clave pública. localtunnel
  funciona pero es inestable (el proceso muere solo y el dominio da 503).

## Encodings UTF-8 / Windows console (lección aprendida)

- Al crear/editar datos con la API o la base desde PowerShell (esta máquina es
  Windows), los caracteres acentuados del comando viajan en Windows-1252
  (`í` = byte `0xED`) y el servidor los guarda corruptos: se convierten en
  `U+FFFD` (carácter de reemplazo, el que se ve como "?" en la UI).
- Regla: jamás mandar tildes/ñ desde comandos de shell. Usar ASCII puro, o
  escapes octal UTF-8 en SQL/psql (`E'\303\255'` = `í`, `E'\357\277\275'` =
  `U+FFFD`), o generar el texto con `node` (UTF-8 real).
- Detectar datos corruptos: `SELECT ... WHERE position(E'\357\277\275' in col) > 0`
  y confirmar con `encode(convert_to(col,'UTF8'),'hex')` (una `í` sana es `c3ad`).
- El flujo navegador → Express → PostgreSQL ya es UTF-8 correcto; nunca se
  evidenció corrupción real fuera de los datos sembrados desde la consola.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
