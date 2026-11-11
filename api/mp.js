// Mercado Pago → sugerencias de gastos para Bancame. SOLO LECTURA.
//
// La clave de Mercado Pago vive en Vercel (variable MP_ACCESS_TOKEN): nunca en el código
// ni en el navegador. Esta función solo le responde al dueño de esa cuenta
// (MP_OWNER_UID = su id de usuario de la app), validando su sesión contra Supabase.
//
// GET /api/mp?modo=traer&dias=20   → pagos que hiciste, para sugerir como gastos
// GET /api/mp?modo=diag            → prueba cada camino de la API y cuenta qué devuelve

const SUPA_URL = process.env.SUPABASE_URL || "https://xlgiwplfirizzmjgayzh.supabase.co";
const SUPA_KEY = process.env.SUPABASE_KEY || "sb_publishable_0EJv3nmLutzCuosws_husg_lVLyBnVX";
const MP = "https://api.mercadopago.com";

async function quienEs(req) {
  const auth = req.headers.authorization || "";
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  try {
    const r = await fetch(SUPA_URL + "/auth/v1/user", { headers: { apikey: SUPA_KEY, Authorization: auth } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

async function mp(path, opts = {}) {
  const r = await fetch(MP + path, {
    ...opts,
    headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN, accept: "application/json",
               ...(opts.body ? { "content-type": "application/json" } : {}), ...(opts.headers || {}) },
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch (e) { /* no era JSON (por ejemplo, un CSV) */ }
  return { status: r.status, ok: r.ok, json, texto };
}

// Fecha de Argentina (UTC-3) de un instante ISO
const fechaAR = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso || "").slice(0, 10);
  return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
};
const isoHace = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 19) + "Z";

function leerCSV(texto) {
  const lineas = String(texto || "").split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return [];
  const sep = (lineas[0].match(/;/g) || []).length > (lineas[0].match(/,/g) || []).length ? ";" : ",";
  const partir = (l) => {
    const out = []; let cur = "", q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };
  const cab = partir(lineas[0]).map((x) => x.toUpperCase());
  return lineas.slice(1).map((l) => {
    const v = partir(l), o = {};
    cab.forEach((k, i) => { o[k] = v[i]; });
    return o;
  });
}
const num = (x) => { const n = parseFloat(String(x || "0").replace(",", ".")); return isFinite(n) ? n : 0; };

const nombreDe = (p) => (p && (p.description || p.statement_descriptor
  || (p.collector && p.collector.nickname) || (p.additional_info && p.additional_info.items
    && p.additional_info.items[0] && p.additional_info.items[0].title))) || "";

// Camino A: la búsqueda de pagos. Trae también las compras con tarjeta hechas con Mercado Pago:
// ahí el pagador viene oculto, así que sirve todo pago aprobado donde el cobrador NO sos vos.
async function porBusqueda(dias, yo) {
  const base = `/v1/payments/search?sort=date_created&criteria=desc&range=date_created`
    + `&begin_date=NOW-${dias}DAYS&end_date=NOW&limit=100`;
  const vistos = new Map();
  for (const extra of ["", `&payer.id=${yo}`]) {
    const r = await mp(base + extra);
    const lista = (r.json && r.json.results) || [];
    lista.forEach((p) => {
      const pagador = String((p.payer && p.payer.id) || "");
      const cobrador = String(p.collector_id || (p.collector && p.collector.id) || "");
      if (p.status !== "approved" || (pagador && pagador !== String(yo)) || cobrador === String(yo)) return;
      vistos.set(String(p.id), {
        id: String(p.id), fecha: fechaAR(p.date_approved || p.date_created),
        monto: Math.round(num(p.transaction_amount)), detalle: nombreDe(p), cobrador,
        tipo: p.operation_type || "", pago: p.payment_type_id || "",
        tarjeta: (p.card && p.card.last_four_digits) || "", marca: p.payment_method_id || "",
      });
    });
  }
  const lista = [...vistos.values()];
  // El nombre del comercio es el usuario de Mercado Pago que cobró
  const nombres = new Map();
  await Promise.all([...new Set(lista.filter((m) => !m.detalle && m.cobrador).map((m) => m.cobrador))].slice(0, 25)
    .map(async (id) => {
      try { const r = await mp("/users/" + id); if (r.ok && r.json) nombres.set(id, r.json.nickname || ""); } catch (e) { /* sin nombre */ }
    }));
  lista.forEach((m) => { if (!m.detalle) m.detalle = nombres.get(m.cobrador) || "Mercado Pago"; });
  return lista;
}

// Camino B: el reporte de movimientos de la cuenta (lo que salió de tu dinero en cuenta)
async function porReporte(dias, yo, nuevo) {
  const lista = await mp("/v1/account/release_report/list");
  const reportes = Array.isArray(lista.json) ? lista.json.slice()
    .sort((a, b) => (String(a.date_created) < String(b.date_created) ? 1 : -1)) : [];
  const ultimo = reportes[0];
  // El cliente decide cuándo pedir uno nuevo (la fecha de fin del reporte es el cierre del día, no sirve para medir su edad)
  const viejo = !!nuevo || !ultimo;
  let pedido = null;
  if (viejo) {
    const r = await mp("/v1/account/release_report", { method: "POST",
      body: JSON.stringify({ begin_date: isoHace(dias), end_date: isoHace(0) }) });
    pedido = r.status;
  }
  if (!ultimo || !ultimo.file_name) return { movs: [], pedido, sinReporte: true };
  const arch = await mp("/v1/account/release_report/" + encodeURIComponent(ultimo.file_name));
  const filas = leerCSV(arch.texto).filter((f) => num(f.NET_DEBIT_AMOUNT) > 0
    && !/initial|balance/i.test(f.RECORD_TYPE || ""));
  const desde = isoHace(dias).slice(0, 10);
  // Cada movimiento viene en dos filas: la "reserva" (reserve_for_x) y la real (x). Nos quedamos con una,
  // prefiriendo la real. payment = pago/compra; payout = transferencia a una cuenta bancaria.
  const porId = new Map();
  filas.forEach((f) => {
    const desc = String(f.DESCRIPTION || "").toLowerCase();
    const reserva = desc.startsWith("reserve_for_");
    const m = {
      id: String(f.SOURCE_ID || f.EXTERNAL_REFERENCE || (f.DATE + "|" + f.NET_DEBIT_AMOUNT)),
      fecha: fechaAR(f.DATE), monto: Math.round(num(f.NET_DEBIT_AMOUNT)), detalle: "",
      tipo: desc.replace(/^reserve_for_/, ""), pago: String(f.PAYMENT_METHOD || "").toLowerCase(), reserva,
    };
    const k = m.id + "|" + m.monto;
    const ya = porId.get(k);
    if (!ya || (ya.reserva && !reserva)) porId.set(k, m);
  });
  let base = [...porId.values()].filter((m) => m.fecha >= desde && m.monto > 0 && m.tipo !== "refund" && m.tipo !== "cashback")
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  // El reporte no trae el nombre del comercio: lo pedimos pago por pago (los 40 más nuevos).
  // Si el cobrador sos vos (reservas o pases entre tus cuentas), no es un gasto.
  const propios = new Set();
  await Promise.all(base.slice(0, 40).map(async (m) => {
    if (!/^\d+$/.test(m.id)) return;
    try {
      const r = await mp("/v1/payments/" + m.id);
      if (r.ok && r.json) {
        m.detalle = nombreDe(r.json);
        const cob = String(r.json.collector_id || (r.json.collector && r.json.collector.id) || "");
        if (yo && cob === String(yo)) propios.add(m.id);
        // Una transferencia a un banco que se puede identificar y no es a vos: es un pago más
        else if (m.tipo === "payout" && cob) { m.tipo = "transfer"; if (!m.detalle) m.detalle = "Transferencia"; }
      }
    } catch (e) { /* sin nombre */ }
  }));
  base = base.filter((m) => !propios.has(m.id));
  base.forEach((m) => { if (!m.detalle) m.detalle = m.tipo === "payout" ? "Transferencia a banco" : "Mercado Pago"; });
  return { movs: base, pedido, hasta: ultimo.end_date || null, generado: ultimo.date_created || null };
}

async function diagnostico(dias, pagoId) {
  const pasos = [];
  let yoId = "";
  try { const me = await mp("/users/me"); yoId = me.json && me.json.id ? String(me.json.id) : ""; } catch (e) { /* nada */ }
  const paso = async (nombre, f) => {
    try { pasos.push({ nombre, ...(await f()) }); }
    catch (e) { pasos.push({ nombre, error: String(e && e.message ? e.message : e) }); }
  };
  if (/^\d{6,}$/.test(String(pagoId || ""))) {
    await paso("Un pago puntual", async () => {
      const r = await mp("/v1/payments/" + pagoId);
      let cob = null;
      try {
        const cid = r.json && (r.json.collector_id || (r.json.collector && r.json.collector.id));
        if (cid) { const u = await mp("/users/" + cid); cob = u.ok && u.json ? { nick: u.json.nickname, nombre: u.json.first_name, apellido: u.json.last_name,
          tienda: u.json.company && u.json.company.brand_name, razon: u.json.company && u.json.company.corporate_name } : { status: u.status }; }
      } catch (e) { /* sin dato */ }
      const j = r.json || {};
      const sub = (o) => o ? { id: o.id, tipo: o.type, nick: o.nickname ? "(tiene)" : undefined } : null;
      return { status: r.status, error: r.ok ? undefined : (j.message || j.error || r.texto.slice(0, 120)),
               estado: j.status, monto: j.transaction_amount, fecha: j.date_approved || j.date_created,
               operacion: j.operation_type, medio: j.payment_method_id, tipoMedio: j.payment_type_id,
               tarjeta: j.card && { ultimos4: j.card.last_four_digits },
               pagador: sub(j.payer), cobradorId: j.collector_id, descripcion: j.description,
               descriptor: j.statement_descriptor, cobrador: cob,
               claves: Object.keys(j).filter((k) => j[k] !== null && j[k] !== "" && !(Array.isArray(j[k]) && !j[k].length)).slice(0, 60),
               extra: { ref: j.external_reference, pos: j.pos_id, tienda: j.store_id, orden: j.order && j.order.type,
                        metadata: j.metadata && JSON.stringify(j.metadata).slice(0, 200),
                        info: j.additional_info && JSON.stringify(j.additional_info).slice(0, 300),
                        interaccion: j.point_of_interaction && JSON.stringify(j.point_of_interaction).slice(0, 300),
                        sponsor: j.sponsor_id, collector: j.collector && JSON.stringify(j.collector).slice(0, 200) } };
    });
  }
  await paso("Transferencias (búsqueda)", async () => {
    const r = await mp(`/v1/payments/search?sort=date_created&criteria=desc&operation_type=money_transfer&limit=10`);
    const res = (r.json && r.json.results) || [];
    return { status: r.status, total: res.length, error: r.ok ? undefined : (r.json && (r.json.message || r.json.error)) || r.texto.slice(0, 120),
             ejemplos: res.slice(0, 5).map((p) => ({ id: String(p.id).slice(-4), fecha: fechaAR(p.date_created), monto: p.transaction_amount,
               medio: p.payment_type_id, estado: p.status, cobradorEsYo: String(p.collector_id || "") === String(yoId || "") })) };
  });
  if (/^\d{6,}$/.test(String(pagoId || ""))) {
    await paso("¿La búsqueda ve ese pago?", async () => {
      const r = await mp(`/v1/payments/search?id=${pagoId}`);
      const res = (r.json && r.json.results) || [];
      return { status: r.status, encontrado: res.length > 0, error: r.ok ? undefined : (r.json && (r.json.message || r.json.error)) || r.texto.slice(0, 120) };
    });
  }
  let yo = "";
  await paso("Tu cuenta", async () => {
    const r = await mp("/users/me");
    yo = r.json && r.json.id ? String(r.json.id) : "";
    return { status: r.status, ok: !!yo, pais: r.json && r.json.site_id };
  });
  for (const [nombre, extra] of [["Búsqueda de pagos", ""], ["Búsqueda de pagos (como pagador)", `&payer.id=${yo}`]]) {
    await paso(nombre, async () => {
      const r = await mp(`/v1/payments/search?sort=date_created&criteria=desc&range=date_created`
        + `&begin_date=NOW-${dias}DAYS&end_date=NOW&limit=50${extra}`);
      const res = (r.json && r.json.results) || [];
      const mios = res.filter((p) => String((p.payer && p.payer.id) || "") === yo
        && String(p.collector_id || (p.collector && p.collector.id) || "") !== yo);
      return { status: r.status, total: res.length, pagadosPorVos: mios.length,
               ejemplos: mios.slice(0, 4).map((p) => ({ fecha: fechaAR(p.date_created), monto: p.transaction_amount,
                 nombre: nombreDe(p), tipo: p.operation_type, pago: p.payment_type_id })),
               error: r.ok ? undefined : (r.json && (r.json.message || r.json.error)) || r.texto.slice(0, 120) };
    });
  }
  let archivo = "";
  await paso("Reportes de la cuenta", async () => {
    const r = await mp("/v1/account/release_report/list");
    const l = Array.isArray(r.json) ? r.json : [];
    const ult = l.slice().sort((a, b) => (String(a.date_created) < String(b.date_created) ? 1 : -1))[0];
    archivo = ult && ult.file_name ? ult.file_name : "";
    return { status: r.status, reportes: l.length, ultimo: ult ? { desde: ult.begin_date, hasta: ult.end_date } : null,
             error: r.ok ? undefined : (r.json && (r.json.message || r.json.error)) || r.texto.slice(0, 120) };
  });
  await paso("Pedir un reporte nuevo", async () => {
    const r = await mp("/v1/account/release_report", { method: "POST",
      body: JSON.stringify({ begin_date: isoHace(dias), end_date: isoHace(0) }) });
    return { status: r.status, aceptado: r.status === 202,
             error: r.status < 300 ? undefined : (r.json && (r.json.message || r.json.error)) || r.texto.slice(0, 120) };
  });
  if (archivo) {
    await paso("Leer el último reporte", async () => {
      const r = await mp("/v1/account/release_report/" + encodeURIComponent(archivo));
      const filas = leerCSV(r.texto);
      const salidas = filas.filter((f) => num(f.NET_DEBIT_AMOUNT) > 0);
      const tipos = {};
      salidas.forEach((f) => { const k = (f.DESCRIPTION || "?") + " · " + (f.PAYMENT_METHOD || "?"); tipos[k] = (tipos[k] || 0) + 1; });
      let nombre = null;
      const conId = salidas.find((f) => /^\d+$/.test(String(f.SOURCE_ID || "")));
      if (conId) {
        const p = await mp("/v1/payments/" + conId.SOURCE_ID);
        nombre = { status: p.status, nombre: p.ok ? nombreDe(p.json) : null };
      }
      // Detalle de las últimas salidas para ajustar los filtros (sin nombres de terceros)
      const ult = salidas.slice(-10).map((f) => ({
        fecha: String(f.DATE || "").slice(0, 16), monto: f.NET_DEBIT_AMOUNT, desc: f.DESCRIPTION,
        reg: f.RECORD_TYPE, pago: f.PAYMENT_METHOD, id: String(f.SOURCE_ID || "").slice(-4),
      }));
      const det = [];
      for (const f of salidas.slice(-4)) {
        if (!/^\d+$/.test(String(f.SOURCE_ID || ""))) { det.push({ id: String(f.SOURCE_ID || "").slice(-4), sinId: true }); continue; }
        const p = await mp("/v1/payments/" + f.SOURCE_ID);
        const j = p.json || {};
        det.push({ id: String(f.SOURCE_ID).slice(-4), status: p.status, op: j.operation_type, tipo: j.payment_type_id,
                   mio: String(j.collector_id || (j.collector && j.collector.id) || "") === yo,
                   nombre: p.ok ? nombreDe(j) : null });
      }
      return { status: r.status, columnas: filas[0] ? Object.keys(filas[0]).slice(0, 40) : [], filas: filas.length,
               salidas: salidas.length, tipos, ultimas: ult, detalle: det };
    });
  }
  await paso("Movimientos (camino viejo)", async () => {
    const r = await mp("/mercadopago_account/movements/search?limit=20");
    const res = (r.json && r.json.results) || [];
    return { status: r.status, total: res.length,
             ejemplos: res.slice(0, 3).map((m) => ({ fecha: fechaAR(m.date_created), monto: m.amount, tipo: m.type, detalle: m.detail })),
             error: r.ok ? undefined : (r.json && (r.json.message || r.json.error)) || r.texto.slice(0, 120) };
  });
  return pasos;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const u = await quienEs(req);
  if (!u) return res.status(401).json({ error: "Sin sesión." });
  const dueno = process.env.MP_OWNER_UID || "";
  const token = process.env.MP_ACCESS_TOKEN || "";
  if (!token || !dueno) return res.status(200).json({ configurado: false, uid: u.id, falta: [!token && "MP_ACCESS_TOKEN", !dueno && "MP_OWNER_UID"].filter(Boolean) });
  if (dueno !== u.id) return res.status(403).json({ error: "Esta conexión es de otra cuenta.", uid: u.id });

  const dias = Math.min(60, Math.max(3, parseInt(req.query.dias, 10) || 20));
  try {
    if (req.query.modo === "diag") return res.status(200).json({ configurado: true, diag: await diagnostico(dias, req.query.pago) });
    const yo = await mp("/users/me");
    if (!yo.ok || !yo.json || !yo.json.id) {
      return res.status(200).json({ configurado: true, error: "Mercado Pago rechazó la clave (" + yo.status + "). Revisá MP_ACCESS_TOKEN." });
    }
    // Dos fuentes que se complementan: la búsqueda (compras con tarjeta y pagos) y el reporte de tu saldo
    let movs = [], fuente = "pagos", extra = {};
    try { movs = await porBusqueda(dias, yo.json.id); } catch (e) { movs = []; }
    const r = await porReporte(dias, yo.json.id, req.query.nuevo === "1");
    extra = { pedido: r.pedido, hasta: r.hasta, generado: r.generado, sinReporte: !!r.sinReporte };
    const ids = new Set(movs.map((m) => m.id));
    r.movs.forEach((m) => { if (!ids.has(m.id)) movs.push(m); });
    fuente = "pagos+reporte";
    movs.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return res.status(200).json({ configurado: true, fuente, movs, ...extra });
  } catch (e) {
    return res.status(200).json({ configurado: true, error: String(e && e.message ? e.message : e) });
  }
}
