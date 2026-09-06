import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   PALETA Y TOKENS
   ============================================================ */
const T = {
  tinta: "#12312B",
  tintaSuave: "#5C6F68",
  papel: "#F3F5F0",
  card: "#FFFFFF",
  linea: "#DDE2D9",
  verde: "#1E7A5A",
  rojo: "#AF3F2E",
  ambar: "#C98A1F",
  ambarSuave: "#FBF1DC",
};

const CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  .bz { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: ${T.tinta}; background: ${T.papel}; min-height: 100%; }
  .bz .num { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .bz button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
  .bz input, .bz select { font-family: inherit; font-size: 16px; color: ${T.tinta};
        background: ${T.card}; border: 1px solid ${T.linea}; border-radius: 10px;
        padding: 11px 12px; width: 100%; outline: none; }
  .bz input:focus, .bz select:focus { border-color: ${T.tinta}; }
  .bz .chip { border: 1px solid ${T.linea}; background: ${T.card}; border-radius: 999px;
        padding: 8px 13px; font-size: 14px; white-space: nowrap; }
  .bz .chip.on { background: ${T.tinta}; color: #fff; border-color: ${T.tinta}; }
  .bz .lbl { font-size: 12.5px; color: ${T.tintaSuave}; margin-bottom: 6px; display: block; }
  .bz .card { background: ${T.card}; border: 1px solid ${T.linea}; border-radius: 14px; }
  .bz .scroll::-webkit-scrollbar { display: none; }
  .bz .scroll { -ms-overflow-style: none; scrollbar-width: none; }
  @media (prefers-reduced-motion: no-preference) {
    .bz .grow { transition: width .35s ease; }
  }
`;

/* ============================================================
   DATOS SEMILLA
   ============================================================ */
const TARJETAS = [
  { id: "icbc", nombre: "Visa ICBC", corto: "ICBC", cierre: 23, vto: 6 },
  { id: "hipo", nombre: "Visa Hipotecario", corto: "Hipo", cierre: 30, vto: 9 },
  { id: "bna", nombre: "Visa Nación", corto: "BNA", cierre: 30, vto: 14 },
  { id: "master", nombre: "Master ICBC", corto: "Master", cierre: 30, vto: 15 },
  { id: "efectivo", nombre: "Efectivo / débito", corto: "Efvo", cierre: 0, vto: 0 },
];
const TJ = (id) => TARJETAS.find((t) => t.id === id) || TARJETAS[4];

const CONFIG_INI = {
  saldoHoy: 775000,
  desdeMes: "2026-10",
  sueldo: 3100000,
  tc: 1550,
  sellos: 0.012,
  pendienteMesActual: 455000,
  extras: { "2026-10": 300000, "2027-01": 3100000 },
  fijos: [
    { id: "f1", nombre: "Préstamo prendario", monto: 265000 },
    { id: "f2", nombre: "Préstamo personal", monto: 49000 },
    { id: "f3", nombre: "Psicología", monto: 320000 },
    { id: "f4", nombre: "Gimnasio", monto: 55000 },
    { id: "f5", nombre: "Básquet", monto: 30000 },
    { id: "f6", nombre: "Almuerzos de trabajo", monto: 100000 },
  ],
};

const RECURRENTES = [
  { id: "r1", comercio: "Madacom internet", monto: 35880, tarjeta: "icbc" },
  { id: "r2", comercio: "Combustible", monto: 25000, tarjeta: "icbc" },
  { id: "r3", comercio: "Día a día", monto: 266488, tarjeta: "icbc" },
  { id: "r4", comercio: "Apple + Google", montoUsd: 33.98, tarjeta: "icbc" },
  { id: "r5", comercio: "Claro", monto: 65612, tarjeta: "hipo" },
  { id: "r6", comercio: "Edelap", monto: 36485, tarjeta: "hipo" },
  { id: "r7", comercio: "Telepase", monto: 9580, tarjeta: "hipo" },
  { id: "r8", comercio: "Spotify", monto: 8413, tarjeta: "hipo" },
  { id: "r9", comercio: "Seguro BHN", monto: 17234, tarjeta: "hipo", persona: "A confirmar", pct: 1 },
  { id: "r10", comercio: "Netflix", montoUsd: 13.56, tarjeta: "hipo" },
  { id: "r11", comercio: "Disco", monto: 150000, tarjeta: "bna" },
  { id: "r12", comercio: "Shell", monto: 79990, tarjeta: "bna" },
  { id: "r13", comercio: "Seguro Fed. Patronal", monto: 101955, tarjeta: "master", persona: "Betty", pct: 1 },
  { id: "r14", comercio: "Fed. Patronal (resto)", monto: 136918, tarjeta: "master" },
  { id: "r15", comercio: "Rappi", monto: 14880, tarjeta: "master" },
  { id: "r16", comercio: "PlayStation", montoUsd: 11.99, tarjeta: "master" },
];

const UNICOS = [
  { id: "u1", comercio: "Viaje: nafta, Ubers, Patagonia, comidas", monto: 450385, tarjeta: "icbc", mes: "2026-10", persona: "Sol", pct: 0.5, viaje: true },
  { id: "u2", comercio: "Viaje: Airbnb Bariloche", montoUsd: 105, tarjeta: "icbc", mes: "2026-10", persona: "Sol", pct: 0.5, viaje: true },
];

const SEED_CUOTAS = [
  {"id": "c0", "comercio": "Despegar", "monto": 3158.83, "tarjeta": "icbc", "cuotaOct": 9, "totalCuotas": 12},
  {"id": "c1", "comercio": "Almundo", "monto": 40322.53, "tarjeta": "icbc", "cuotaOct": 8, "totalCuotas": 12},
  {"id": "c2", "comercio": "Mercadolibre", "monto": 8544, "tarjeta": "icbc", "cuotaOct": 6, "totalCuotas": 12},
  {"id": "c3", "comercio": "Run", "monto": 4218.33, "tarjeta": "icbc", "cuotaOct": 5, "totalCuotas": 6},
  {"id": "c4", "comercio": "Run", "monto": 1068.33, "tarjeta": "icbc", "cuotaOct": 5, "totalCuotas": 6},
  {"id": "c5", "comercio": "Perfumsnow", "monto": 21991.66, "tarjeta": "icbc", "cuotaOct": 4, "totalCuotas": 6},
  {"id": "c6", "comercio": "Nike La Plata", "monto": 37999.66, "tarjeta": "icbc", "cuotaOct": 4, "totalCuotas": 6, "persona": "Betty", "pct": 0.4737},
  {"id": "c7", "comercio": "Gaona", "monto": 6832.5, "tarjeta": "icbc", "cuotaOct": 4, "totalCuotas": 9},
  {"id": "c8", "comercio": "Perfumeriaspigmento", "monto": 9313.33, "tarjeta": "icbc", "cuotaOct": 4, "totalCuotas": 24},
  {"id": "c9", "comercio": "Simplicity La Plata", "monto": 10499.66, "tarjeta": "icbc", "cuotaOct": 3, "totalCuotas": 3},
  {"id": "c10", "comercio": "Kingofkings", "monto": 32998, "tarjeta": "icbc", "cuotaOct": 3, "totalCuotas": 3},
  {"id": "c11", "comercio": "Confeccionesseman", "monto": 11665, "tarjeta": "icbc", "cuotaOct": 3, "totalCuotas": 6},
  {"id": "c12", "comercio": "Kevingston", "monto": 20666.66, "tarjeta": "icbc", "cuotaOct": 3, "totalCuotas": 6},
  {"id": "c13", "comercio": "Seven Electronics", "monto": 26962.68, "tarjeta": "icbc", "cuotaOct": 2, "totalCuotas": 3},
  {"id": "c14", "comercio": "Thebrandschoi", "monto": 19108.34, "tarjeta": "icbc", "cuotaOct": 2, "totalCuotas": 3},
  {"id": "c15", "comercio": "Opensports", "monto": 6666.68, "tarjeta": "icbc", "cuotaOct": 2, "totalCuotas": 3},
  {"id": "c16", "comercio": "Iey", "monto": 5998.5, "tarjeta": "icbc", "cuotaOct": 2, "totalCuotas": 6},
  {"id": "c17", "comercio": "Blossomfragancias", "monto": 38000, "tarjeta": "icbc", "cuotaOct": 2, "totalCuotas": 3},
  {"id": "c18", "comercio": "Vertical Skisnow (Compra Nueva)", "monto": 57310.8, "tarjeta": "icbc", "cuotaOct": 1, "totalCuotas": 3, "viaje": true},
  {"id": "c19", "comercio": "Vertical Skisnow (Compra Nueva)", "monto": 7333, "tarjeta": "icbc", "cuotaOct": 1, "totalCuotas": 3, "viaje": true},
  {"id": "c20", "comercio": "Fiambreriaale (Compra Nueva)", "monto": 13426.25, "tarjeta": "icbc", "cuotaOct": 1, "totalCuotas": 2},
  {"id": "c21", "comercio": "Bidcom", "monto": 42209.44, "tarjeta": "master", "cuotaOct": 17, "totalCuotas": 18},
  {"id": "c22", "comercio": "Bidcom", "monto": 4373.54, "tarjeta": "master", "cuotaOct": 11, "totalCuotas": 18},
  {"id": "c23", "comercio": "Despegar", "monto": 17051.13, "tarjeta": "master", "cuotaOct": 9, "totalCuotas": 12},
  {"id": "c24", "comercio": "Despegar", "monto": 4366.44, "tarjeta": "master", "cuotaOct": 9, "totalCuotas": 12},
  {"id": "c25", "comercio": "Despegar", "monto": 14277.18, "tarjeta": "master", "cuotaOct": 9, "totalCuotas": 12},
  {"id": "c26", "comercio": "Www.Fravega.Com", "monto": 1562.43, "tarjeta": "master", "cuotaOct": 8, "totalCuotas": 12},
  {"id": "c27", "comercio": "Shop Gallery Mendoza", "monto": 11683.33, "tarjeta": "master", "cuotaOct": 4, "totalCuotas": 6},
  {"id": "c28", "comercio": "Alfisjeans", "monto": 26300, "tarjeta": "master", "cuotaOct": 3, "totalCuotas": 3},
  {"id": "c29", "comercio": "Visaur", "monto": 86666.63, "tarjeta": "bna", "cuotaOct": 21, "totalCuotas": 30},
  {"id": "c30", "comercio": "Home Sweet S.A.", "monto": 3094.33, "tarjeta": "bna", "cuotaOct": 17, "totalCuotas": 24},
  {"id": "c31", "comercio": "Consumiblesds", "monto": 492.83, "tarjeta": "bna", "cuotaOct": 9, "totalCuotas": 18},
  {"id": "c32", "comercio": "Consumiblesds", "monto": 2469.88, "tarjeta": "bna", "cuotaOct": 9, "totalCuotas": 18},
  {"id": "c33", "comercio": "Perfumeria Pigmento", "monto": 2653.25, "tarjeta": "bna", "cuotaOct": 8, "totalCuotas": 18},
  {"id": "c34", "comercio": "Perfumeria Pigmento", "monto": 7054.7, "tarjeta": "bna", "cuotaOct": 6, "totalCuotas": 18},
  {"id": "c35", "comercio": "Simplicity La Plata", "monto": 3595.41, "tarjeta": "bna", "cuotaOct": 6, "totalCuotas": 12},
  {"id": "c36", "comercio": "Perfumeria Pigmento", "monto": 2912.42, "tarjeta": "bna", "cuotaOct": 4, "totalCuotas": 18},
  {"id": "c37", "comercio": "Busplus", "monto": 8400, "tarjeta": "bna", "cuotaOct": 2, "totalCuotas": 3},
  {"id": "c38", "comercio": "Busplus", "monto": 9660, "tarjeta": "bna", "cuotaOct": 2, "totalCuotas": 3},
  {"id": "c39", "comercio": "Gadnic", "monto": 3145.86, "tarjeta": "hipo", "cuotaOct": 13, "totalCuotas": 15},
  {"id": "c40", "comercio": "Mercadolibre", "monto": 8188.11, "tarjeta": "hipo", "cuotaOct": 6, "totalCuotas": 6}
];

/* ============================================================
   UTILIDADES DE MESES
   ============================================================ */
const MES_NOMBRE = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const parseMes = (k) => ({ y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 });
const sumaMes = (k, n) => {
  const { y, m } = parseMes(k);
  const d = new Date(y, m + n, 1);
  return mesKey(d.getFullYear(), d.getMonth());
};
const etiquetaMes = (k) => {
  const { y, m } = parseMes(k);
  return `${MES_NOMBRE[m]} ${String(y).slice(2)}`;
};
const distanciaMeses = (a, b) => {
  const A = parseMes(a), B = parseMes(b);
  return (B.y - A.y) * 12 + (B.m - A.m);
};

const plata = (n, dec = 0) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const plataCorta = (n) => {
  const a = Math.abs(n);
  if (a >= 1000000) return (n < 0 ? "-" : "") + "$" + (a / 1000000).toFixed(a >= 10000000 ? 1 : 2) + "M";
  if (a >= 1000) return (n < 0 ? "-" : "") + "$" + Math.round(a / 1000) + "k";
  return plata(n);
};

/* ============================================================
   MOTOR: EN QUÉ MES SE PAGA CADA COSA
   ============================================================ */
function mesDePago(fechaISO, tarjetaId) {
  const t = TJ(tarjetaId);
  const d = new Date(fechaISO + "T12:00:00");
  let y = d.getFullYear(), m = d.getMonth();
  if (tarjetaId === "efectivo") return mesKey(y, m);
  if (d.getDate() > t.cierre) m += 1;
  m += 1;
  const n = new Date(y, m, 1);
  return mesKey(n.getFullYear(), n.getMonth());
}

function montoPesos(g, tc) {
  return g.montoUsd ? g.montoUsd * tc : g.monto || 0;
}

/* ============================================================
   PROYECCIÓN
   ============================================================ */
function proyectar(cfg, cuotas, recurrentes, unicos, sueltos, extraSim) {
  const meses = [];
  for (let i = 0; i < 6; i++) meses.push(sumaMes(cfg.desdeMes, i));
  const tc = cfg.tc;

  const filas = meses.map((mk, i) => {
    const porTarjeta = {};
    const detalle = [];
    const reintegros = [];
    let viaje = 0;

    const cargar = (nombre, monto, tarjeta, persona, pct, esViaje) => {
      if (!monto) return;
      porTarjeta[tarjeta] = (porTarjeta[tarjeta] || 0) + monto;
      detalle.push({ nombre, monto, tarjeta });
      if (persona && pct) reintegros.push({ persona, monto: monto * pct, nombre });
      if (esViaje) viaje += monto;
    };

    cuotas.forEach((c) => {
      const nro = c.cuotaOct + i;
      if (nro <= c.totalCuotas)
        cargar(`${c.comercio} ${nro}/${c.totalCuotas}`, c.monto, c.tarjeta, c.persona, c.pct, c.viaje);
    });
    recurrentes.forEach((r) =>
      cargar(r.comercio, montoPesos(r, tc), r.tarjeta, r.persona, r.pct, false)
    );
    unicos.forEach((u) => {
      if (u.mes === mk) cargar(u.comercio, montoPesos(u, tc), u.tarjeta, u.persona, u.pct, u.viaje);
    });
    sueltos.forEach((g) => {
      const n = g.cuotas || 1;
      const primero = mesDePago(g.fecha, g.tarjeta);
      const k = distanciaMeses(primero, mk);
      if (k >= 0 && k < n) {
        const cuota = montoPesos(g, tc) / n;
        cargar(
          n > 1 ? `${g.comercio} ${k + 1}/${n}` : g.comercio,
          cuota, g.tarjeta, g.persona, g.pct, g.viaje
        );
      }
    });
    if (extraSim) {
      const n = extraSim.cuotas || 1;
      const primero = mesDePago(extraSim.fecha, extraSim.tarjeta);
      const k = distanciaMeses(primero, mk);
      if (k >= 0 && k < n)
        cargar(`★ ${extraSim.comercio || "Simulación"} ${k + 1}/${n}`, extraSim.monto / n, extraSim.tarjeta);
    }

    let tarjetas = 0;
    Object.keys(porTarjeta).forEach((t) => {
      if (t !== "efectivo") {
        porTarjeta[t] *= 1 + cfg.sellos;
        tarjetas += porTarjeta[t];
      }
    });
    const efectivoExtra = porTarjeta["efectivo"] || 0;
    const fijos = cfg.fijos.reduce((a, f) => a + f.monto, 0);
    const totalReintegros = reintegros.reduce((a, r) => a + r.monto, 0);
    const ingresos = cfg.sueldo + (cfg.extras[mk] || 0) + totalReintegros;
    const egresos = tarjetas + efectivoExtra + fijos;

    return {
      mk, ingresos, egresos, tarjetas, fijos, efectivoExtra,
      reintegros, totalReintegros, viaje,
      resultado: ingresos - egresos,
      porTarjeta, detalle,
    };
  });

  let saldo = cfg.saldoHoy - cfg.pendienteMesActual;
  filas.forEach((f) => {
    saldo += f.resultado;
    f.saldo = saldo;
  });
  return filas;
}

/* ============================================================
   COMPONENTES CHICOS
   ============================================================ */
function Encabezado({ saldo, mes }) {
  return (
    <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${T.linea}`, background: T.card }}>
      <div style={{ fontSize: 12.5, color: T.tintaSuave }}>
        Saldo proyectado al cierre de {etiquetaMes(mes)}
      </div>
      <div className="num" style={{ fontSize: 34, fontWeight: 620, marginTop: 2, color: saldo < 0 ? T.rojo : T.tinta }}>
        {plata(saldo)}
      </div>
    </div>
  );
}

function Barra({ ingresos, egresos }) {
  const max = Math.max(ingresos, egresos, 1);
  const fila = (v, color) => (
    <div style={{ height: 7, background: T.papel, borderRadius: 4, overflow: "hidden" }}>
      <div className="grow" style={{ width: `${(v / max) * 100}%`, height: "100%", background: color }} />
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 5, marginTop: 9 }}>
      {fila(ingresos, T.verde)}
      {fila(egresos, T.rojo)}
    </div>
  );
}

/* ============================================================
   PANTALLA: CARGAR
   ============================================================ */
function Cargar({ onGuardar, recientes, personas }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [monto, setMonto] = useState("");
  const [comercio, setComercio] = useState("");
  const [tarjeta, setTarjeta] = useState("icbc");
  const [cuotas, setCuotas] = useState(1);
  const [fecha, setFecha] = useState(hoy);
  const [persona, setPersona] = useState("");
  const [pct, setPct] = useState(50);
  const [viaje, setViaje] = useState(false);
  const [ok, setOk] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const valido = +monto > 0 && comercio.trim();
  const cuando = valido ? mesDePago(fecha, tarjeta) : null;

  const guardar = () => {
    if (!valido) return;
    onGuardar({
      id: "g" + Date.now(),
      comercio: comercio.trim(),
      monto: +monto,
      tarjeta, cuotas, fecha, viaje,
      persona: persona || undefined,
      pct: persona ? pct / 100 : undefined,
    });
    setMonto(""); setComercio(""); setCuotas(1); setPersona(""); setViaje(false); setAbierto(false);
    setOk(true); setTimeout(() => setOk(false), 1800);
  };

  return (
    <div style={{ padding: 18, paddingBottom: 30 }}>
      <label className="lbl">Cuánto</label>
      <input
        className="num" inputMode="decimal" value={monto} placeholder="0"
        onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ""))}
        style={{ fontSize: 30, fontWeight: 600, padding: "14px 14px", textAlign: "right" }}
      />

      <label className="lbl" style={{ marginTop: 16 }}>En qué</label>
      <input value={comercio} onChange={(e) => setComercio(e.target.value)} placeholder="Comercio" />
      {recientes.length > 0 && !comercio && (
        <div className="scroll" style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 9 }}>
          {recientes.map((r) => (
            <button key={r} className="chip" onClick={() => setComercio(r)}>{r}</button>
          ))}
        </div>
      )}

      <label className="lbl" style={{ marginTop: 16 }}>Con qué</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {TARJETAS.map((t) => (
          <button key={t.id} className={"chip" + (tarjeta === t.id ? " on" : "")} onClick={() => setTarjeta(t.id)}>
            {t.corto}
          </button>
        ))}
      </div>

      {tarjeta !== "efectivo" && (
        <>
          <label className="lbl" style={{ marginTop: 16 }}>Cuotas</label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[1, 3, 6, 9, 12, 18].map((n) => (
              <button key={n} className={"chip" + (cuotas === n ? " on" : "")} onClick={() => setCuotas(n)}>{n}</button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setAbierto(!abierto)}
        style={{ marginTop: 18, fontSize: 14, color: T.tintaSuave, textDecoration: "underline" }}
      >
        {abierto ? "Menos opciones" : "Fecha, viaje, con quién lo compartís"}
      </button>

      {abierto && (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <div>
            <label className="lbl">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Lo comparte</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button className={"chip" + (!persona ? " on" : "")} onClick={() => setPersona("")}>Nadie</button>
              {personas.map((p) => (
                <button key={p} className={"chip" + (persona === p ? " on" : "")} onClick={() => setPersona(p)}>{p}</button>
              ))}
            </div>
            {persona && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13.5, color: T.tintaSuave }}>Recuperás</span>
                <input
                  className="num" inputMode="numeric" value={pct}
                  onChange={(e) => setPct(Math.min(100, +e.target.value.replace(/\D/g, "") || 0))}
                  style={{ width: 78, textAlign: "right", padding: "8px 10px" }}
                />
                <span style={{ fontSize: 13.5, color: T.tintaSuave }}>%</span>
              </div>
            )}
          </div>
          <button
            className={"chip" + (viaje ? " on" : "")}
            onClick={() => setViaje(!viaje)}
            style={{ justifySelf: "start" }}
          >
            {viaje ? "✓ " : ""}Gasto excepcional
          </button>
        </div>
      )}

      {cuando && (
        <div style={{ marginTop: 20, padding: "12px 14px", background: T.ambarSuave, borderRadius: 11, fontSize: 13.5, lineHeight: 1.5 }}>
          {tarjeta === "efectivo"
            ? `Sale de la caja de ${etiquetaMes(cuando)}.`
            : `Cae en el resumen que pagás en ${etiquetaMes(cuando)}${cuotas > 1 ? `, y sigue ${cuotas - 1} ${cuotas === 2 ? "mes" : "meses"} más` : ""}.`}
        </div>
      )}

      <button
        onClick={guardar}
        disabled={!valido}
        style={{
          marginTop: 20, width: "100%", padding: "16px", borderRadius: 12,
          background: valido ? T.tinta : T.linea, color: valido ? "#fff" : T.tintaSuave,
          fontSize: 16, fontWeight: 600,
        }}
      >
        {ok ? "Guardado" : "Guardar gasto"}
      </button>
    </div>
  );
}

/* ============================================================
   PANTALLA: FLUJO
   ============================================================ */
function Flujo({ filas, cfg, setCfg }) {
  const [abierta, setAbierta] = useState(null);
  const [editando, setEditando] = useState(false);

  return (
    <div style={{ padding: 18, paddingBottom: 30 }}>
      <div className="card" style={{ padding: 15, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: T.tintaSuave }}>Plata en la cuenta hoy</span>
          <button onClick={() => setEditando(!editando)} style={{ fontSize: 13, color: T.ambar }}>
            {editando ? "Listo" : "Cambiar"}
          </button>
        </div>
        {editando ? (
          <input
            className="num" inputMode="decimal" value={cfg.saldoHoy}
            onChange={(e) => setCfg({ ...cfg, saldoHoy: +e.target.value.replace(/\D/g, "") || 0 })}
            style={{ marginTop: 8, fontSize: 22, fontWeight: 600, textAlign: "right" }}
          />
        ) : (
          <div className="num" style={{ fontSize: 26, fontWeight: 620, marginTop: 2 }}>{plata(cfg.saldoHoy)}</div>
        )}
        <div style={{ fontSize: 12.5, color: T.tintaSuave, marginTop: 8, lineHeight: 1.5 }}>
          Menos {plata(cfg.pendienteMesActual)} que te falta pagar este mes, arrancás el ciclo con{" "}
          <span className="num">{plata(cfg.saldoHoy - cfg.pendienteMesActual)}</span>.
        </div>
      </div>

      {filas.map((f) => {
        const open = abierta === f.mk;
        return (
          <div key={f.mk} className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
            <button
              onClick={() => setAbierta(open ? null : f.mk)}
              style={{ width: "100%", textAlign: "left", padding: 15 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>Pagás en {etiquetaMes(f.mk)}</div>
                  <div style={{ fontSize: 12, color: T.tintaSuave, marginTop: 2 }}>
                    cobrado el 28 de {etiquetaMes(sumaMes(f.mk, -1))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontSize: 17, fontWeight: 620, color: f.resultado < 0 ? T.rojo : T.verde }}>
                    {f.resultado > 0 ? "+" : ""}{plataCorta(f.resultado)}
                  </div>
                  <div className="num" style={{ fontSize: 12, color: T.tintaSuave, marginTop: 2 }}>
                    queda {plataCorta(f.saldo)}
                  </div>
                </div>
              </div>
              <Barra ingresos={f.ingresos} egresos={f.egresos} />
            </button>

            {open && (
              <div style={{ borderTop: `1px solid ${T.linea}`, padding: "13px 15px", fontSize: 13.5 }}>
                {[
                  ["Sueldo", cfg.sueldo],
                  ...(cfg.extras[f.mk] ? [["Extra del mes", cfg.extras[f.mk]]] : []),
                  ...(f.totalReintegros ? [["Te reintegran", f.totalReintegros]] : []),
                  ["Tarjetas", -f.tarjetas],
                  ...(f.efectivoExtra ? [["Efectivo", -f.efectivoExtra]] : []),
                  ["Fijos", -f.fijos],
                ].map(([n, v]) => (
                  <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                    <span style={{ color: T.tintaSuave }}>{n}</span>
                    <span className="num" style={{ color: v < 0 ? T.rojo : T.verde }}>{plata(v)}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${T.linea}`, marginTop: 9, paddingTop: 9 }}>
                  {TARJETAS.filter((t) => f.porTarjeta[t.id] && t.id !== "efectivo").map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                      <span style={{ color: T.tintaSuave }}>{t.nombre} · vence el {t.vto}</span>
                      <span className="num">{plata(f.porTarjeta[t.id])}</span>
                    </div>
                  ))}
                </div>
                {f.viaje > 0 && (
                  <div style={{ marginTop: 11, padding: "9px 11px", background: T.ambarSuave, borderRadius: 9, fontSize: 12.5 }}>
                    Incluye <span className="num">{plata(f.viaje)}</span> de gastos excepcionales que no se repiten.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   PANTALLA: SIMULAR
   ============================================================ */
function Simular({ base, cfg, cuotas, recurrentes, unicos, sueltos }) {
  const [monto, setMonto] = useState("");
  const [cuotasSim, setCuotasSim] = useState(6);
  const [tarjeta, setTarjeta] = useState("icbc");
  const hoy = new Date().toISOString().slice(0, 10);

  const sim = +monto > 0 ? { comercio: "Compra nueva", monto: +monto, cuotas: cuotasSim, tarjeta, fecha: hoy } : null;
  const con = useMemo(
    () => (sim ? proyectar(cfg, cuotas, recurrentes, unicos, sueltos, sim) : base),
    [monto, cuotasSim, tarjeta, cfg, cuotas, recurrentes, unicos, sueltos, base]
  );
  const peor = Math.min(...con.map((f) => f.saldo));
  const final = con[con.length - 1].saldo;
  const delta = final - base[base.length - 1].saldo;

  return (
    <div style={{ padding: 18, paddingBottom: 30 }}>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: T.tintaSuave, marginTop: 0 }}>
        Probá una compra antes de hacerla y mirá qué le hace a los próximos seis meses.
      </p>

      <label className="lbl" style={{ marginTop: 6 }}>Cuánto</label>
      <input
        className="num" inputMode="decimal" value={monto} placeholder="0"
        onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ""))}
        style={{ fontSize: 26, fontWeight: 600, textAlign: "right" }}
      />

      <label className="lbl" style={{ marginTop: 15 }}>En cuántas cuotas</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {[1, 3, 6, 12, 18].map((n) => (
          <button key={n} className={"chip" + (cuotasSim === n ? " on" : "")} onClick={() => setCuotasSim(n)}>{n}</button>
        ))}
      </div>

      <label className="lbl" style={{ marginTop: 15 }}>Con qué tarjeta</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {TARJETAS.filter((t) => t.id !== "efectivo").map((t) => (
          <button key={t.id} className={"chip" + (tarjeta === t.id ? " on" : "")} onClick={() => setTarjeta(t.id)}>
            {t.corto}
          </button>
        ))}
      </div>

      {sim && (
        <div className="card" style={{ marginTop: 20, padding: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
            <span style={{ color: T.tintaSuave }}>Cuota mensual</span>
            <span className="num" style={{ fontWeight: 600 }}>{plata(+monto / cuotasSim)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
            <span style={{ color: T.tintaSuave }}>Mes más flaco</span>
            <span className="num" style={{ fontWeight: 600, color: peor < 0 ? T.rojo : T.tinta }}>{plata(peor)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
            <span style={{ color: T.tintaSuave }}>Te cuesta, a seis meses</span>
            <span className="num" style={{ fontWeight: 600, color: T.rojo }}>{plata(delta)}</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {con.map((f, i) => {
          const antes = base[i].saldo;
          const cambio = f.saldo !== antes;
          return (
            <div key={f.mk} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: `1px solid ${T.linea}` }}>
              <span style={{ fontSize: 13, color: T.tintaSuave, width: 52 }}>{etiquetaMes(f.mk)}</span>
              <div style={{ flex: 1, height: 8, background: T.papel, borderRadius: 4, overflow: "hidden" }}>
                <div
                  className="grow"
                  style={{
                    width: `${Math.max(2, (Math.max(f.saldo, 0) / Math.max(...base.map((x) => x.saldo), 1)) * 100)}%`,
                    height: "100%",
                    background: f.saldo < 0 ? T.rojo : cambio ? T.ambar : T.verde,
                  }}
                />
              </div>
              <span className="num" style={{ fontSize: 13, width: 74, textAlign: "right", color: f.saldo < 0 ? T.rojo : T.tinta }}>
                {plataCorta(f.saldo)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PANTALLA: REPARTO
   ============================================================ */
function Reparto({ filas }) {
  const porPersona = {};
  filas.forEach((f) =>
    f.reintegros.forEach((r) => {
      porPersona[r.persona] = porPersona[r.persona] || { total: 0, meses: {}, items: {} };
      porPersona[r.persona].total += r.monto;
      porPersona[r.persona].meses[f.mk] = (porPersona[r.persona].meses[f.mk] || 0) + r.monto;
      const base = r.nombre.replace(/\s\d+\/\d+$/, "");
      porPersona[r.persona].items[base] = (porPersona[r.persona].items[base] || 0) + r.monto;
    })
  );
  const gente = Object.keys(porPersona).sort((a, b) => porPersona[b].total - porPersona[a].total);

  if (!gente.length)
    return (
      <div style={{ padding: 30, textAlign: "center", color: T.tintaSuave, fontSize: 14.5, lineHeight: 1.6 }}>
        Todavía no marcaste ningún gasto como compartido.<br />
        Cargá uno y elegí con quién lo compartís.
      </div>
    );

  return (
    <div style={{ padding: 18, paddingBottom: 30 }}>
      {gente.map((p) => {
        const d = porPersona[p];
        return (
          <div key={p} className="card" style={{ padding: 15, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 16.5, fontWeight: 620 }}>{p}</span>
              <span className="num" style={{ fontSize: 16.5, fontWeight: 620, color: T.verde }}>{plata(d.total)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: T.tintaSuave, marginTop: 2 }}>te devuelve en seis meses</div>

            <div style={{ marginTop: 13, borderTop: `1px solid ${T.linea}`, paddingTop: 11 }}>
              {Object.entries(d.items).map(([n, v]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0" }}>
                  <span style={{ color: T.tintaSuave, maxWidth: "68%" }}>{n}</span>
                  <span className="num">{plata(v)}</span>
                </div>
              ))}
            </div>

            <div className="scroll" style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 13 }}>
              {filas.map((f) => (
                <div key={f.mk} style={{ minWidth: 62, textAlign: "center", padding: "7px 4px", background: T.papel, borderRadius: 9 }}>
                  <div style={{ fontSize: 11, color: T.tintaSuave }}>{etiquetaMes(f.mk)}</div>
                  <div className="num" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
                    {d.meses[f.mk] ? plataCorta(d.meses[f.mk]) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SHELL
   ============================================================ */
const TABS = [
  { id: "cargar", nombre: "Cargar" },
  { id: "flujo", nombre: "Flujo" },
  { id: "simular", nombre: "Simular" },
  { id: "reparto", nombre: "Reparto" },
];

export default function App() {
  const [tab, setTab] = useState("cargar");
  const [cfg, setCfg] = useState(CONFIG_INI);
  const [sueltos, setSueltos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("bz:data");
        if (r && r.value) {
          const d = JSON.parse(r.value);
          if (d.cfg) setCfg({ ...CONFIG_INI, ...d.cfg });
          if (d.sueltos) setSueltos(d.sueltos);
        }
      } catch (e) {
        // primera vez: no hay nada guardado
      }
      setCargando(false);
    })();
  }, []);

  const guardarTodo = useCallback(async (nuevoCfg, nuevosSueltos) => {
    try {
      await window.storage.set("bz:data", JSON.stringify({ cfg: nuevoCfg, sueltos: nuevosSueltos }));
    } catch (e) {
      setAviso("No se pudo guardar. Probá de nuevo.");
      setTimeout(() => setAviso(""), 3000);
    }
  }, []);

  const agregarGasto = (g) => {
    const n = [g, ...sueltos];
    setSueltos(n);
    guardarTodo(cfg, n);
  };
  const cambiarCfg = (c) => {
    setCfg(c);
    guardarTodo(c, sueltos);
  };

  const filas = useMemo(
    () => proyectar(cfg, SEED_CUOTAS, RECURRENTES, UNICOS, sueltos, null),
    [cfg, sueltos]
  );

  const recientes = useMemo(() => {
    const vistos = [];
    sueltos.forEach((g) => { if (!vistos.includes(g.comercio)) vistos.push(g.comercio); });
    return vistos.slice(0, 8);
  }, [sueltos]);

  const personas = useMemo(() => {
    const s = new Set(["Sol", "Betty"]);
    sueltos.forEach((g) => g.persona && s.add(g.persona));
    return [...s];
  }, [sueltos]);

  if (cargando)
    return (
      <div className="bz" style={{ padding: 40, textAlign: "center", color: T.tintaSuave }}>
        <style>{CSS}</style>
        Abriendo tus datos…
      </div>
    );

  const ultimo = filas[filas.length - 1];

  return (
    <div className="bz" style={{ maxWidth: 460, margin: "0 auto", minHeight: "100vh", paddingBottom: 74 }}>
      <style>{CSS}</style>
      <Encabezado saldo={ultimo.saldo} mes={ultimo.mk} />

      {aviso && (
        <div style={{ background: T.rojo, color: "#fff", padding: "9px 16px", fontSize: 13.5 }}>{aviso}</div>
      )}

      {tab === "cargar" && <Cargar onGuardar={agregarGasto} recientes={recientes} personas={personas} />}
      {tab === "flujo" && <Flujo filas={filas} cfg={cfg} setCfg={cambiarCfg} />}
      {tab === "simular" && (
        <Simular base={filas} cfg={cfg} cuotas={SEED_CUOTAS} recurrentes={RECURRENTES} unicos={UNICOS} sueltos={sueltos} />
      )}
      {tab === "reparto" && <Reparto filas={filas} />}

      <nav
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 460, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          background: T.card, borderTop: `1px solid ${T.linea}`,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "15px 4px 20px", fontSize: 13,
              fontWeight: tab === t.id ? 640 : 450,
              color: tab === t.id ? T.tinta : T.tintaSuave,
              borderTop: `2px solid ${tab === t.id ? T.tinta : "transparent"}`,
              marginTop: -1,
            }}
          >
            {t.nombre}
          </button>
        ))}
      </nav>
    </div>
  );
}
