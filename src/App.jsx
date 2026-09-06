import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ===================== TOKENS ===================== */
const T = {
  tinta: "#12312B",
  suave: "#5C6F68",
  tenue: "#8B9A93",
  papel: "#F3F5F0",
  card: "#FFFFFF",
  linea: "#DDE2D9",
  verde: "#1E7A5A",
  rojo: "#AF3F2E",
  ambar: "#C98A1F",
  ambarBg: "#FBF1DC",
  rojoBg: "#FBE9E6",
};

const CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  .bz { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: ${T.tinta}; background: ${T.papel}; min-height: 100vh; }
  .bz .num { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .bz button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; padding: 0; }
  .bz input, .bz select, .bz textarea {
        font-family: inherit; font-size: 16px; color: ${T.tinta}; background: ${T.card};
        border: 1px solid ${T.linea}; border-radius: 10px; padding: 11px 12px; width: 100%; outline: none; }
  .bz input:focus, .bz select:focus { border-color: ${T.tinta}; }
  .bz .chip { border: 1px solid ${T.linea}; background: ${T.card}; border-radius: 999px;
        padding: 8px 13px; font-size: 14px; white-space: nowrap; }
  .bz .chip.on { background: ${T.tinta}; color: #fff; border-color: ${T.tinta}; }
  .bz .chip.sm { padding: 6px 11px; font-size: 13px; }
  .bz .lbl { font-size: 12.5px; color: ${T.suave}; margin-bottom: 6px; display: block; }
  .bz .card { background: ${T.card}; border: 1px solid ${T.linea}; border-radius: 14px; }
  .bz .scroll::-webkit-scrollbar { display: none; }
  .bz .scroll { -ms-overflow-style: none; scrollbar-width: none; }
  .bz .btn { padding: 15px; border-radius: 12px; font-size: 16px; font-weight: 600; width: 100%;
        background: ${T.tinta}; color: #fff; }
  .bz .btn.ghost { background: ${T.card}; color: ${T.tinta}; border: 1px solid ${T.linea}; }
  .bz .btn.peligro { background: ${T.rojo}; color: #fff; }
  @media (prefers-reduced-motion: no-preference) { .bz .grow { transition: width .3s ease; } }
`;

/* ===================== MEDIOS DE PAGO ===================== */
const MEDIOS_INI = [
  { id: "icbc", nombre: "Visa ICBC Signature", corto: "ICBC", cierre: 23, vto: 6 },
  { id: "hipo", nombre: "Visa Hipotecario", corto: "Hipo", cierre: 30, vto: 9 },
  { id: "bna", nombre: "Visa Banco Nación", corto: "BNA", cierre: 30, vto: 14 },
  { id: "master", nombre: "Mastercard ICBC", corto: "Master", cierre: 30, vto: 15 },
  { id: "efectivo", nombre: "Efectivo / débito", corto: "Efvo", cierre: 0, vto: 0 },
];

const SEED = [
  {"tipo": "ingreso", "detalle": "Sueldo neto", "monto": 3100000, "medio": "efectivo", "recurrente": true, "id": "s1"},
  {"tipo": "ingreso", "detalle": "Aguinaldo", "monto": 3100000, "medio": "efectivo", "recurrente": true, "meses": [1, 7], "id": "s2"},
  {"tipo": "ingreso", "detalle": "Extra por permanencia", "monto": 300000, "medio": "efectivo", "mesInicio": "2026-10", "cuotas": 1, "id": "s3"},
  {"tipo": "gasto", "detalle": "Préstamo prendario (auto)", "monto": 265000, "medio": "efectivo", "recurrente": true, "id": "s4"},
  {"tipo": "gasto", "detalle": "Préstamo personal (casa)", "monto": 49000, "medio": "efectivo", "recurrente": true, "id": "s5"},
  {"tipo": "gasto", "detalle": "Psicología", "monto": 320000, "medio": "efectivo", "recurrente": true, "id": "s6"},
  {"tipo": "gasto", "detalle": "Gimnasio", "monto": 55000, "medio": "efectivo", "recurrente": true, "id": "s7"},
  {"tipo": "gasto", "detalle": "Básquet", "monto": 30000, "medio": "efectivo", "recurrente": true, "id": "s8"},
  {"tipo": "gasto", "detalle": "Almuerzos de trabajo", "monto": 100000, "medio": "efectivo", "recurrente": true, "id": "s9"},
  {"tipo": "gasto", "detalle": "Madacom internet", "medio": "icbc", "recurrente": true, "monto": 35880, "id": "s10"},
  {"tipo": "gasto", "detalle": "Combustible", "medio": "icbc", "recurrente": true, "monto": 25000, "id": "s11"},
  {"tipo": "gasto", "detalle": "Gastos del día a día", "medio": "icbc", "recurrente": true, "monto": 266488, "id": "s12"},
  {"tipo": "gasto", "detalle": "Apple + Google", "medio": "icbc", "recurrente": true, "montoUsd": 33.98, "moneda": "USD", "id": "s13"},
  {"tipo": "gasto", "detalle": "Claro", "medio": "hipo", "recurrente": true, "monto": 65612, "id": "s14"},
  {"tipo": "gasto", "detalle": "Edelap", "medio": "hipo", "recurrente": true, "monto": 36485, "id": "s15"},
  {"tipo": "gasto", "detalle": "Telepase", "medio": "hipo", "recurrente": true, "monto": 9580, "id": "s16"},
  {"tipo": "gasto", "detalle": "Spotify", "medio": "hipo", "recurrente": true, "monto": 8413, "id": "s17"},
  {"tipo": "gasto", "detalle": "Seguro BHN", "medio": "hipo", "recurrente": true, "monto": 17234, "persona": "A confirmar", "pct": 1.0, "id": "s18"},
  {"tipo": "gasto", "detalle": "Netflix", "medio": "hipo", "recurrente": true, "montoUsd": 13.56, "moneda": "USD", "id": "s19"},
  {"tipo": "gasto", "detalle": "Disco", "medio": "bna", "recurrente": true, "monto": 150000, "id": "s20"},
  {"tipo": "gasto", "detalle": "Shell", "medio": "bna", "recurrente": true, "monto": 79990, "id": "s21"},
  {"tipo": "gasto", "detalle": "Seguro Federación Patronal", "medio": "master", "recurrente": true, "monto": 101955, "persona": "Betty", "pct": 1.0, "id": "s22"},
  {"tipo": "gasto", "detalle": "Federación Patronal (resto)", "medio": "master", "recurrente": true, "monto": 136918, "id": "s23"},
  {"tipo": "gasto", "detalle": "Rappi", "medio": "master", "recurrente": true, "monto": 14880, "id": "s24"},
  {"tipo": "gasto", "detalle": "PlayStation", "medio": "master", "recurrente": true, "montoUsd": 11.99, "moneda": "USD", "id": "s25"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 3158.83, "medio": "icbc", "cuotas": 12, "mesInicio": "2026-02", "id": "s26"},
  {"tipo": "gasto", "detalle": "Almundo", "monto": 40322.53, "medio": "icbc", "cuotas": 12, "mesInicio": "2026-03", "id": "s27"},
  {"tipo": "gasto", "detalle": "Mercadolibre", "monto": 8544, "medio": "icbc", "cuotas": 12, "mesInicio": "2026-05", "id": "s28"},
  {"tipo": "gasto", "detalle": "Run", "monto": 4218.33, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-06", "id": "s29"},
  {"tipo": "gasto", "detalle": "Run", "monto": 1068.33, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-06", "id": "s30"},
  {"tipo": "gasto", "detalle": "Perfumsnow", "monto": 21991.66, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-07", "id": "s31"},
  {"tipo": "gasto", "detalle": "Nike La Plata", "monto": 37999.66, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-07", "persona": "Betty", "pct": 0.4737, "id": "s32"},
  {"tipo": "gasto", "detalle": "Gaona", "monto": 6832.5, "medio": "icbc", "cuotas": 9, "mesInicio": "2026-07", "id": "s33"},
  {"tipo": "gasto", "detalle": "Perfumeriaspigmento", "monto": 9313.33, "medio": "icbc", "cuotas": 24, "mesInicio": "2026-07", "id": "s34"},
  {"tipo": "gasto", "detalle": "Simplicity La Plata", "monto": 10499.66, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-08", "id": "s35"},
  {"tipo": "gasto", "detalle": "Kingofkings", "monto": 32998, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-08", "id": "s36"},
  {"tipo": "gasto", "detalle": "Confeccionesseman", "monto": 11665, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-08", "id": "s37"},
  {"tipo": "gasto", "detalle": "Kevingston", "monto": 20666.66, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-08", "id": "s38"},
  {"tipo": "gasto", "detalle": "Seven Electronics", "monto": 26962.68, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s39"},
  {"tipo": "gasto", "detalle": "Thebrandschoi", "monto": 19108.34, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s40"},
  {"tipo": "gasto", "detalle": "Opensports", "monto": 6666.68, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s41"},
  {"tipo": "gasto", "detalle": "Iey", "monto": 5998.5, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-09", "id": "s42"},
  {"tipo": "gasto", "detalle": "Blossomfragancias", "monto": 38000, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s43"},
  {"tipo": "gasto", "detalle": "Vertical Skisnow (Compra Nueva)", "monto": 57310.8, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-10", "excepcional": true, "id": "s44"},
  {"tipo": "gasto", "detalle": "Vertical Skisnow (Compra Nueva)", "monto": 7333, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-10", "excepcional": true, "id": "s45"},
  {"tipo": "gasto", "detalle": "Fiambreriaale (Compra Nueva)", "monto": 13426.25, "medio": "icbc", "cuotas": 2, "mesInicio": "2026-10", "id": "s46"},
  {"tipo": "gasto", "detalle": "Bidcom", "monto": 42209.44, "medio": "master", "cuotas": 18, "mesInicio": "2025-06", "id": "s47"},
  {"tipo": "gasto", "detalle": "Bidcom", "monto": 4373.54, "medio": "master", "cuotas": 18, "mesInicio": "2025-12", "id": "s48"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 17051.13, "medio": "master", "cuotas": 12, "mesInicio": "2026-02", "id": "s49"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 4366.44, "medio": "master", "cuotas": 12, "mesInicio": "2026-02", "id": "s50"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 14277.18, "medio": "master", "cuotas": 12, "mesInicio": "2026-02", "id": "s51"},
  {"tipo": "gasto", "detalle": "Www.Fravega.Com", "monto": 1562.43, "medio": "master", "cuotas": 12, "mesInicio": "2026-03", "id": "s52"},
  {"tipo": "gasto", "detalle": "Shop Gallery Mendoza", "monto": 11683.33, "medio": "master", "cuotas": 6, "mesInicio": "2026-07", "id": "s53"},
  {"tipo": "gasto", "detalle": "Alfisjeans", "monto": 26300, "medio": "master", "cuotas": 3, "mesInicio": "2026-08", "id": "s54"},
  {"tipo": "gasto", "detalle": "Visaur", "monto": 86666.63, "medio": "bna", "cuotas": 30, "mesInicio": "2025-02", "id": "s55"},
  {"tipo": "gasto", "detalle": "Home Sweet S.A.", "monto": 3094.33, "medio": "bna", "cuotas": 24, "mesInicio": "2025-06", "id": "s56"},
  {"tipo": "gasto", "detalle": "Consumiblesds", "monto": 492.83, "medio": "bna", "cuotas": 18, "mesInicio": "2026-02", "id": "s57"},
  {"tipo": "gasto", "detalle": "Consumiblesds", "monto": 2469.88, "medio": "bna", "cuotas": 18, "mesInicio": "2026-02", "id": "s58"},
  {"tipo": "gasto", "detalle": "Perfumeria Pigmento", "monto": 2653.25, "medio": "bna", "cuotas": 18, "mesInicio": "2026-03", "id": "s59"},
  {"tipo": "gasto", "detalle": "Perfumeria Pigmento", "monto": 7054.7, "medio": "bna", "cuotas": 18, "mesInicio": "2026-05", "id": "s60"},
  {"tipo": "gasto", "detalle": "Simplicity La Plata", "monto": 3595.41, "medio": "bna", "cuotas": 12, "mesInicio": "2026-05", "id": "s61"},
  {"tipo": "gasto", "detalle": "Perfumeria Pigmento", "monto": 2912.42, "medio": "bna", "cuotas": 18, "mesInicio": "2026-07", "id": "s62"},
  {"tipo": "gasto", "detalle": "Busplus", "monto": 8400, "medio": "bna", "cuotas": 3, "mesInicio": "2026-09", "id": "s63"},
  {"tipo": "gasto", "detalle": "Busplus", "monto": 9660, "medio": "bna", "cuotas": 3, "mesInicio": "2026-09", "id": "s64"},
  {"tipo": "gasto", "detalle": "Gadnic", "monto": 3145.86, "medio": "hipo", "cuotas": 15, "mesInicio": "2025-10", "id": "s65"},
  {"tipo": "gasto", "detalle": "Mercadolibre", "monto": 8188.11, "medio": "hipo", "cuotas": 6, "mesInicio": "2026-05", "id": "s66"},
  {"tipo": "gasto", "detalle": "Viaje: nafta, Ubers, Patagonia, comidas", "monto": 450385, "medio": "icbc", "mesInicio": "2026-10", "cuotas": 1, "persona": "Sol", "pct": 0.5, "excepcional": true, "id": "s67"},
  {"tipo": "gasto", "detalle": "Viaje: Airbnb Bariloche", "montoUsd": 105, "moneda": "USD", "medio": "icbc", "mesInicio": "2026-10", "cuotas": 1, "persona": "Sol", "pct": 0.5, "excepcional": true, "id": "s68"}
];

/* ===================== FECHAS ===================== */
const MESN = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const idxMes = (mk) => +mk.slice(0, 4) * 12 + (+mk.slice(5, 7) - 1);
const mesDeIdx = (n) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
const sumaMes = (mk, n) => mesDeIdx(idxMes(mk) + n);
const distMes = (a, b) => idxMes(b) - idxMes(a);
const etiqMes = (mk) => `${MESN[+mk.slice(5, 7) - 1]} ${mk.slice(2, 4)}`;
const etiqMesLargo = (mk) => `${MESN[+mk.slice(5, 7) - 1]} 20${mk.slice(2, 4)}`;
const mesDeHoy = () => new Date().toISOString().slice(0, 7);
const mesArranque = () => sumaMes(mesDeHoy(), 1);
const hoyISO = () => new Date().toISOString().slice(0, 10);

const plata = (n, d = 0) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const corta = (n) => {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1000) return s + "$" + Math.round(a / 1000) + "k";
  return plata(n);
};

/* ===================== MOTOR ===================== */
// Devuelve el mes en que se PAGA una compra hecha en `fecha` con `medio`.
function mesDePago(fecha, medioId, medios) {
  const m = medios.find((x) => x.id === medioId);
  const d = new Date(fecha + "T12:00:00");
  if (!m || m.id === "efectivo") return d.toISOString().slice(0, 7);
  let n = d.getFullYear() * 12 + d.getMonth();
  if (d.getDate() > m.cierre) n += 1; // entró después del cierre
  n += 1; // el resumen se paga al mes siguiente del cierre
  return mesDeIdx(n);
}

// Cuánto pesa un movimiento en un mes dado (0 si no aplica).
function montoEnMes(mv, mk, tc) {
  const base = mv.moneda === "USD" ? (mv.montoUsd || 0) * tc : mv.monto || 0;
  if (!base) return 0;
  if (mv.recurrente) {
    if (mv.meses && mv.meses.length && !mv.meses.includes(+mk.slice(5, 7))) return 0;
    if (mv.desde && idxMes(mk) < idxMes(mv.desde)) return 0;
    if (mv.hasta && idxMes(mk) > idxMes(mv.hasta)) return 0;
    return base;
  }
  const n = mv.cuotas || 1;
  const k = distMes(mv.mesInicio, mk);
  return k >= 0 && k < n ? base : 0;
}

function nroCuota(mv, mk) {
  if (mv.recurrente) return null;
  return distMes(mv.mesInicio, mk) + 1;
}

function proyectar(cfg, movs, medios, meses, extra) {
  const arr = extra ? [...movs, extra] : movs;
  const desde = cfg.desdeMes || mesArranque();
  const filas = [];
  for (let i = 0; i < meses; i++) {
    const mk = sumaMes(desde, i);
    const infl = Math.pow(1 + (cfg.ajuste || 0), i);
    const porMedio = {};
    const items = [];
    const reint = [];
    let ingresos = 0, excepcional = 0;

    arr.forEach((mv) => {
      let m = montoEnMes(mv, mk, cfg.tc);
      if (!m) return;
      if (mv.recurrente) m *= infl;
      if (mv.tipo === "ingreso") {
        ingresos += m;
        items.push({ mv, monto: m, ingreso: true });
        return;
      }
      porMedio[mv.medio] = (porMedio[mv.medio] || 0) + m;
      items.push({ mv, monto: m, cuota: nroCuota(mv, mk) });
      if (mv.persona && mv.pct) reint.push({ persona: mv.persona, monto: m * mv.pct, detalle: mv.detalle });
      if (mv.excepcional) excepcional += m;
    });

    let tarjetas = 0;
    Object.keys(porMedio).forEach((k) => {
      if (k !== "efectivo") {
        porMedio[k] *= 1 + (cfg.sellos || 0);
        tarjetas += porMedio[k];
      }
    });
    const efvo = porMedio["efectivo"] || 0;
    const totalReint = reint.reduce((a, r) => a + r.monto, 0);
    const totIng = ingresos + totalReint;
    const egresos = tarjetas + efvo;
    filas.push({
      mk, ingresos: totIng, egresos, tarjetas, efvo, reint, totalReint,
      excepcional, porMedio, items, resultado: totIng - egresos,
    });
  }
  let s = cfg.saldoHoy;
  filas.forEach((f) => { s += f.resultado; f.saldo = s; });
  return filas;
}

/* ===================== FORMULARIO DE MOVIMIENTO ===================== */
function FormMov({ inicial, medios, personas, onGuardar, onBorrar, onCerrar }) {
  const esNuevo = !inicial?.id;
  const [f, setF] = useState(() => ({
    tipo: "gasto",
    detalle: "",
    monto: "",
    montoUsd: "",
    moneda: "ARS",
    medio: "icbc",
    fecha: hoyISO(),
    cuotas: 1,
    recurrente: false,
    meses: [],
    persona: "",
    pct: 50,
    excepcional: false,
    ...inicial,
    monto: inicial?.monto ?? "",
    montoUsd: inicial?.montoUsd ?? "",
    pct: inicial?.pct != null ? Math.round(inicial.pct * 100) : 50,
  }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const valorOk = f.moneda === "USD" ? +f.montoUsd > 0 : +f.monto > 0;
  const valido = valorOk && f.detalle.trim();

  const mesPago = useMemo(() => {
    if (f.recurrente) return null;
    if (f.mesInicio && !f.fecha) return f.mesInicio;
    return mesDePago(f.fecha, f.medio, medios);
  }, [f.fecha, f.medio, f.recurrente, f.mesInicio, medios]);

  const guardar = () => {
    if (!valido) return;
    const mv = {
      id: f.id || "m" + Date.now(),
      tipo: f.tipo,
      detalle: f.detalle.trim(),
      medio: f.medio,
      moneda: f.moneda,
      excepcional: !!f.excepcional,
    };
    if (f.moneda === "USD") mv.montoUsd = +f.montoUsd;
    else mv.monto = +f.monto;
    if (f.recurrente) {
      mv.recurrente = true;
      if (f.meses?.length) mv.meses = f.meses;
    } else {
      mv.cuotas = Math.max(1, +f.cuotas || 1);
      mv.mesInicio = mesPago;
      mv.fecha = f.fecha;
    }
    if (f.persona) { mv.persona = f.persona; mv.pct = (+f.pct || 0) / 100; }
    onGuardar(mv);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 50, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onCerrar} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
        <span style={{ fontSize: 15.5, fontWeight: 620 }}>{esNuevo ? "Nuevo movimiento" : "Editar"}</span>
        <button onClick={guardar} style={{ fontSize: 15, fontWeight: 620, color: valido ? T.tinta : T.tenue }}>
          Guardar
        </button>
      </div>

      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
          {[["gasto", "Gasto"], ["ingreso", "Ingreso"]].map(([v, n]) => (
            <button key={v} className={"chip" + (f.tipo === v ? " on" : "")} onClick={() => set("tipo", v)}>{n}</button>
          ))}
        </div>

        <label className="lbl">Monto</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="num" inputMode="decimal"
            value={f.moneda === "USD" ? f.montoUsd : f.monto}
            onChange={(e) => set(f.moneda === "USD" ? "montoUsd" : "monto", e.target.value.replace(/[^\d.]/g, ""))}
            style={{ fontSize: 26, fontWeight: 600, textAlign: "right" }}
          />
          <button
            className={"chip" + (f.moneda === "USD" ? " on" : "")}
            onClick={() => set("moneda", f.moneda === "USD" ? "ARS" : "USD")}
            style={{ minWidth: 62 }}
          >
            {f.moneda === "USD" ? "U$S" : "$"}
          </button>
        </div>

        <label className="lbl" style={{ marginTop: 16 }}>Detalle</label>
        <input value={f.detalle} onChange={(e) => set("detalle", e.target.value)} placeholder="Comercio o concepto" />

        <label className="lbl" style={{ marginTop: 16 }}>Medio de pago</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {medios.map((m) => (
            <button key={m.id} className={"chip" + (f.medio === m.id ? " on" : "")} onClick={() => set("medio", m.id)}>
              {m.corto}
            </button>
          ))}
        </div>

        <label className="lbl" style={{ marginTop: 18 }}>Frecuencia</label>
        <div style={{ display: "flex", gap: 7 }}>
          <button className={"chip" + (!f.recurrente ? " on" : "")} onClick={() => set("recurrente", false)}>
            Una compra
          </button>
          <button className={"chip" + (f.recurrente ? " on" : "")} onClick={() => set("recurrente", true)}>
            Todos los meses
          </button>
        </div>

        {!f.recurrente ? (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>Fecha de la compra</label>
            <input type="date" value={f.fecha || hoyISO()} onChange={(e) => set("fecha", e.target.value)} />

            <label className="lbl" style={{ marginTop: 16 }}>Cuotas</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              {[1, 3, 6, 9, 12, 18].map((n) => (
                <button key={n} className={"chip" + (+f.cuotas === n ? " on" : "")} onClick={() => set("cuotas", n)}>{n}</button>
              ))}
              <input
                className="num" inputMode="numeric" value={f.cuotas}
                onChange={(e) => set("cuotas", e.target.value.replace(/\D/g, ""))}
                style={{ width: 66, textAlign: "center", padding: "8px 6px" }}
              />
            </div>
            {mesPago && (
              <div style={{ marginTop: 14, padding: "11px 13px", background: T.ambarBg, borderRadius: 11, fontSize: 13.5, lineHeight: 1.5 }}>
                Primera cuota en <b>{etiqMesLargo(mesPago)}</b>
                {+f.cuotas > 1 && <> y la última en <b>{etiqMesLargo(sumaMes(mesPago, +f.cuotas - 1))}</b></>}.
              </div>
            )}
          </>
        ) : (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>Solo en estos meses (vacío = todos)</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {MESN.map((n, i) => (
                <button
                  key={n}
                  className={"chip sm" + (f.meses?.includes(i + 1) ? " on" : "")}
                  onClick={() => {
                    const s = new Set(f.meses || []);
                    s.has(i + 1) ? s.delete(i + 1) : s.add(i + 1);
                    set("meses", [...s].sort((a, b) => a - b));
                  }}
                >{n}</button>
              ))}
            </div>
          </>
        )}

        <label className="lbl" style={{ marginTop: 18 }}>Lo comparto con</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button className={"chip" + (!f.persona ? " on" : "")} onClick={() => set("persona", "")}>Nadie</button>
          {personas.map((p) => (
            <button key={p} className={"chip" + (f.persona === p ? " on" : "")} onClick={() => set("persona", p)}>{p}</button>
          ))}
        </div>
        <input
          value={f.persona} onChange={(e) => set("persona", e.target.value)}
          placeholder="o escribí otro nombre" style={{ marginTop: 9 }}
        />
        {f.persona && (
          <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13.5, color: T.suave }}>Recupero el</span>
            <input
              className="num" inputMode="numeric" value={f.pct}
              onChange={(e) => set("pct", Math.min(100, +e.target.value.replace(/\D/g, "") || 0))}
              style={{ width: 78, textAlign: "right", padding: "8px 10px" }}
            />
            <span style={{ fontSize: 13.5, color: T.suave }}>%</span>
          </div>
        )}

        <button
          className={"chip" + (f.excepcional ? " on" : "")}
          onClick={() => set("excepcional", !f.excepcional)}
          style={{ marginTop: 18 }}
        >
          {f.excepcional ? "✓ " : ""}Gasto excepcional
        </button>
        <div style={{ fontSize: 12.5, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
          Marcalo si no se repite (un viaje, algo puntual). Sirve para no confundirlo con tu base de gastos normales.
        </div>

        {!esNuevo && (
          <button className="btn peligro" onClick={() => onBorrar(f.id)} style={{ marginTop: 26 }}>
            Borrar este movimiento
          </button>
        )}
      </div>
    </div>
  );
}

/* ===================== PANTALLA: HOY ===================== */
const HORIZONTES = [1, 2, 3, 6, 12, 18, 24];

function Hoy({ cfg, setCfg, filas, medios, onAbrirAjustes }) {
  const [editSaldo, setEditSaldo] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const fin = filas[filas.length - 1];

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div className="card" style={{ padding: 17 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: T.suave }}>Plata disponible hoy</span>
          <button onClick={() => setEditSaldo(!editSaldo)} style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}>
            {editSaldo ? "Listo" : "Cambiar"}
          </button>
        </div>
        {editSaldo ? (
          <input
            className="num" inputMode="decimal" value={cfg.saldoHoy}
            onChange={(e) => setCfg({ ...cfg, saldoHoy: +e.target.value.replace(/[^\d-]/g, "") || 0 })}
            style={{ marginTop: 9, fontSize: 28, fontWeight: 640, textAlign: "right" }}
          />
        ) : (
          <div className="num" style={{ fontSize: 34, fontWeight: 640, marginTop: 3,
                                        color: cfg.saldoHoy < 0 ? T.rojo : T.tinta }}>
            {plata(cfg.saldoHoy)}
          </div>
        )}
        <div style={{ fontSize: 12, color: T.suave, marginTop: 9, lineHeight: 1.5 }}>
          Poné lo que te queda libre de verdad: descontá lo que todavía tenés que pagar este mes.
        </div>
      </div>

      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15.5, fontWeight: 620 }}>Flujo proyectado</span>
        <button onClick={onAbrirAjustes} style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}>Ajustes</button>
      </div>

      <div style={{ fontSize: 12, color: T.suave, marginTop: 5, lineHeight: 1.5 }}>
        Arranca en {etiqMesLargo(cfg.desdeMes)}: los vencimientos de este mes ya están corriendo.
      </div>

      <div className="scroll" style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 11, paddingBottom: 3 }}>
        {HORIZONTES.map((h) => (
          <button
            key={h}
            className={"chip" + (cfg.horizonte === h ? " on" : "")}
            onClick={() => setCfg({ ...cfg, horizonte: h })}
          >
            {h === 1 ? "1 mes" : `${h} meses`}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 15, marginTop: 13,
                                     background: fin.saldo < 0 ? T.rojoBg : T.ambarBg, borderColor: "transparent" }}>
        <div style={{ fontSize: 13, color: T.suave }}>
          Saldo estimado al cierre de {etiqMesLargo(fin.mk)}
        </div>
        <div className="num" style={{ fontSize: 27, fontWeight: 640, marginTop: 2,
                                      color: fin.saldo < 0 ? T.rojo : T.tinta }}>
          {plata(fin.saldo)}
        </div>
        {(() => {
          const peor = filas.reduce((a, b) => (b.saldo < a.saldo ? b : a));
          return peor.saldo < fin.saldo ? (
            <div style={{ fontSize: 12.5, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
              El punto más bajo es {etiqMesLargo(peor.mk)} con <span className="num">{plata(peor.saldo)}</span>.
            </div>
          ) : null;
        })()}
      </div>

      <div style={{ marginTop: 16 }}>
        {filas.map((f) => {
          const open = abierta === f.mk;
          const max = Math.max(...filas.map((x) => Math.max(x.ingresos, x.egresos)), 1);
          return (
            <div key={f.mk} className="card" style={{ marginBottom: 9, overflow: "hidden" }}>
              <button onClick={() => setAbierta(open ? null : f.mk)} style={{ width: "100%", textAlign: "left", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{etiqMesLargo(f.mk)}</div>
                    <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 2 }}>
                      cobrado el 28 de {etiqMes(sumaMes(f.mk, -1))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 16.5, fontWeight: 640, color: f.resultado < 0 ? T.rojo : T.verde }}>
                      {f.resultado > 0 ? "+" : ""}{corta(f.resultado)}
                    </div>
                    <div className="num" style={{ fontSize: 12, color: f.saldo < 0 ? T.rojo : T.tenue, marginTop: 2 }}>
                      queda {corta(f.saldo)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 4, marginTop: 9 }}>
                  {[[f.ingresos, T.verde], [f.egresos, T.rojo]].map(([v, c], i) => (
                    <div key={i} style={{ height: 6, background: T.papel, borderRadius: 3, overflow: "hidden" }}>
                      <div className="grow" style={{ width: `${(v / max) * 100}%`, height: "100%", background: c }} />
                    </div>
                  ))}
                </div>
              </button>

              {open && (
                <div style={{ borderTop: `1px solid ${T.linea}`, padding: "12px 14px", fontSize: 13.5 }}>
                  {[["Ingresos", f.ingresos - f.totalReint], ["Te reintegran", f.totalReint],
                    ["Tarjetas", -f.tarjetas], ["Efectivo y débito", -f.efvo]]
                    .filter(([, v]) => v)
                    .map(([n, v]) => (
                      <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                        <span style={{ color: T.suave }}>{n}</span>
                        <span className="num" style={{ color: v < 0 ? T.rojo : T.verde }}>{plata(v)}</span>
                      </div>
                    ))}
                  <div style={{ borderTop: `1px solid ${T.linea}`, marginTop: 8, paddingTop: 8 }}>
                    {medios.filter((m) => f.porMedio[m.id] && m.id !== "efectivo").map((m) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 13 }}>
                        <span style={{ color: T.suave }}>{m.nombre} · vence el {m.vto}</span>
                        <span className="num">{plata(f.porMedio[m.id])}</span>
                      </div>
                    ))}
                  </div>
                  {f.excepcional > 0 && (
                    <div style={{ marginTop: 10, padding: "9px 11px", background: T.ambarBg, borderRadius: 9, fontSize: 12.5 }}>
                      Incluye <span className="num">{plata(f.excepcional)}</span> de gastos excepcionales.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== PANTALLA: MOVIMIENTOS ===================== */
function Movimientos({ movs, medios, cfg, onEditar, onBorrarVarios }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState([]);
  const [modoSel, setModoSel] = useState(false);

  const lista = useMemo(() => {
    let l = movs;
    if (filtro === "ingresos") l = l.filter((m) => m.tipo === "ingreso");
    else if (filtro === "recurrentes") l = l.filter((m) => m.recurrente);
    else if (filtro === "cuotas") l = l.filter((m) => !m.recurrente && (m.cuotas || 1) > 1);
    else if (filtro === "compartidos") l = l.filter((m) => m.persona);
    else if (filtro !== "todos") l = l.filter((m) => m.medio === filtro);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      l = l.filter((m) => m.detalle.toLowerCase().includes(q));
    }
    return l;
  }, [movs, filtro, busca]);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const desc = (m) => {
    const p = [];
    if (m.recurrente) p.push(m.meses?.length ? `solo ${m.meses.map((i) => MESN[i - 1]).join(", ")}` : "todos los meses");
    else if ((m.cuotas || 1) > 1) p.push(`${m.cuotas} cuotas desde ${etiqMes(m.mesInicio)}`);
    else p.push(etiqMes(m.mesInicio));
    if (m.persona) p.push(`${m.persona} ${Math.round(m.pct * 100)}%`);
    return p.join(" · ");
  };

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" />

      <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 11, paddingBottom: 3 }}>
        {[["todos", "Todos"], ["ingresos", "Ingresos"], ["recurrentes", "Fijos"], ["cuotas", "En cuotas"],
          ["compartidos", "Compartidos"], ...medios.map((m) => [m.id, m.corto])].map(([v, n]) => (
          <button key={v} className={"chip sm" + (filtro === v ? " on" : "")} onClick={() => setFiltro(v)}>{n}</button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span style={{ fontSize: 12.5, color: T.suave }}>{lista.length} movimientos</span>
        <button
          onClick={() => { setModoSel(!modoSel); setSel([]); }}
          style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}
        >
          {modoSel ? "Cancelar" : "Seleccionar"}
        </button>
      </div>

      {modoSel && (
        <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
          <button className="chip sm" onClick={() => setSel(lista.map((m) => m.id))}>Todos los de la lista</button>
          {sel.length > 0 && (
            <button
              className="chip sm"
              onClick={() => {
                if (confirm(`¿Borrar ${sel.length} movimientos? No se puede deshacer.`)) {
                  onBorrarVarios(sel); setSel([]); setModoSel(false);
                }
              }}
              style={{ background: T.rojo, color: "#fff", borderColor: T.rojo }}
            >
              Borrar {sel.length}
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {lista.map((m) => {
          const marcado = sel.includes(m.id);
          const valor = m.moneda === "USD" ? (m.montoUsd || 0) * cfg.tc : m.monto || 0;
          return (
            <button
              key={m.id}
              onClick={() => (modoSel ? toggle(m.id) : onEditar(m))}
              className="card"
              style={{
                width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 12,
                borderColor: marcado ? T.tinta : T.linea,
              }}
            >
              {modoSel && (
                <div style={{
                  width: 21, height: 21, borderRadius: 11, flexShrink: 0,
                  border: `2px solid ${marcado ? T.tinta : T.linea}`,
                  background: marcado ? T.tinta : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 12,
                }}>{marcado ? "✓" : ""}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 560, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.detalle}
                </div>
                <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 2 }}>
                  {medios.find((x) => x.id === m.medio)?.corto} · {desc(m)}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="num" style={{ fontSize: 14.5, fontWeight: 600, color: m.tipo === "ingreso" ? T.verde : T.tinta }}>
                  {m.tipo === "ingreso" ? "+" : ""}{corta(valor)}
                </div>
                {m.moneda === "USD" && (
                  <div className="num" style={{ fontSize: 11, color: T.tenue }}>U$S {m.montoUsd}</div>
                )}
              </div>
            </button>
          );
        })}
        {!lista.length && (
          <div style={{ textAlign: "center", color: T.tenue, fontSize: 14, padding: 30 }}>
            No hay movimientos con ese filtro.
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== PANTALLA: SIMULAR ===================== */
function Simular({ cfg, movs, medios }) {
  const [monto, setMonto] = useState("");
  const [cuotas, setCuotas] = useState(6);
  const [medio, setMedio] = useState("icbc");

  const base = useMemo(() => proyectar(cfg, movs, medios, cfg.horizonte, null), [cfg, movs, medios]);
  const extra = +monto > 0
    ? { id: "sim", tipo: "gasto", detalle: "Simulación", monto: +monto, medio,
        cuotas, mesInicio: mesDePago(hoyISO(), medio, medios), moneda: "ARS" }
    : null;
  const con = useMemo(
    () => (extra ? proyectar(cfg, movs, medios, cfg.horizonte, extra) : base),
    [monto, cuotas, medio, cfg, movs, medios, base]
  );

  const peor = con.reduce((a, b) => (b.saldo < a.saldo ? b : a));
  const delta = con[con.length - 1].saldo - base[base.length - 1].saldo;
  const maxAbs = Math.max(...base.map((x) => Math.abs(x.saldo)), 1);

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: T.suave, marginTop: 0 }}>
        Probá una compra antes de hacerla y mirá qué le hace al flujo.
      </p>

      <label className="lbl">Monto</label>
      <input
        className="num" inputMode="decimal" value={monto} placeholder="0"
        onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ""))}
        style={{ fontSize: 26, fontWeight: 600, textAlign: "right" }}
      />

      <label className="lbl" style={{ marginTop: 15 }}>Cuotas</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {[1, 3, 6, 12, 18].map((n) => (
          <button key={n} className={"chip" + (cuotas === n ? " on" : "")} onClick={() => setCuotas(n)}>{n}</button>
        ))}
      </div>

      <label className="lbl" style={{ marginTop: 15 }}>Con qué</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {medios.map((m) => (
          <button key={m.id} className={"chip" + (medio === m.id ? " on" : "")} onClick={() => setMedio(m.id)}>
            {m.corto}
          </button>
        ))}
      </div>

      {extra && (
        <div className="card" style={{ marginTop: 20, padding: 15 }}>
          {[["Cuota mensual", +monto / cuotas, T.tinta],
            ["Mes más flaco", peor.saldo, peor.saldo < 0 ? T.rojo : T.tinta],
            [`Te cuesta a ${cfg.horizonte} meses`, delta, T.rojo]].map(([n, v, c]) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
              <span style={{ color: T.suave }}>{n}</span>
              <span className="num" style={{ fontWeight: 600, color: c }}>{plata(v)}</span>
            </div>
          ))}
          <div style={{ fontSize: 12.5, color: T.suave, marginTop: 9, lineHeight: 1.5 }}>
            El mes más flaco es {etiqMesLargo(peor.mk)}.
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {con.map((f, i) => {
          const cambio = extra && f.saldo !== base[i].saldo;
          return (
            <div key={f.mk} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                                     borderBottom: `1px solid ${T.linea}` }}>
              <span style={{ fontSize: 12.5, color: T.suave, width: 50 }}>{etiqMes(f.mk)}</span>
              <div style={{ flex: 1, height: 7, background: T.papel, borderRadius: 4, overflow: "hidden" }}>
                <div className="grow" style={{
                  width: `${Math.max(2, (Math.abs(f.saldo) / maxAbs) * 100)}%`, height: "100%",
                  background: f.saldo < 0 ? T.rojo : cambio ? T.ambar : T.verde,
                }} />
              </div>
              <span className="num" style={{ fontSize: 12.5, width: 72, textAlign: "right",
                                             color: f.saldo < 0 ? T.rojo : T.tinta }}>{corta(f.saldo)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== PANTALLA: REPARTO ===================== */
function Reparto({ filas }) {
  const por = {};
  filas.forEach((f) =>
    f.reint.forEach((r) => {
      por[r.persona] = por[r.persona] || { total: 0, meses: {}, items: {} };
      por[r.persona].total += r.monto;
      por[r.persona].meses[f.mk] = (por[r.persona].meses[f.mk] || 0) + r.monto;
      por[r.persona].items[r.detalle] = (por[r.persona].items[r.detalle] || 0) + r.monto;
    })
  );
  const gente = Object.keys(por).sort((a, b) => por[b].total - por[a].total);

  if (!gente.length)
    return (
      <div style={{ padding: 30, textAlign: "center", color: T.suave, fontSize: 14.5, lineHeight: 1.6 }}>
        Ningún movimiento está marcado como compartido.<br />
        Editá uno y elegí con quién lo compartís.
      </div>
    );

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      {gente.map((p) => {
        const d = por[p];
        return (
          <div key={p} className="card" style={{ padding: 15, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 16.5, fontWeight: 620 }}>{p}</span>
              <span className="num" style={{ fontSize: 16.5, fontWeight: 620, color: T.verde }}>{plata(d.total)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: T.suave, marginTop: 2 }}>
              te devuelve en {filas.length} {filas.length === 1 ? "mes" : "meses"}
            </div>
            <div style={{ marginTop: 12, borderTop: `1px solid ${T.linea}`, paddingTop: 10 }}>
              {Object.entries(d.items).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0", gap: 12 }}>
                  <span style={{ color: T.suave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
                  <span className="num" style={{ flexShrink: 0 }}>{plata(v)}</span>
                </div>
              ))}
            </div>
            <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 12 }}>
              {filas.map((f) => (
                <div key={f.mk} style={{ minWidth: 58, textAlign: "center", padding: "6px 4px", background: T.papel, borderRadius: 9 }}>
                  <div style={{ fontSize: 10.5, color: T.tenue }}>{etiqMes(f.mk)}</div>
                  <div className="num" style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                    {d.meses[f.mk] ? corta(d.meses[f.mk]) : "—"}
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

/* ===================== AJUSTES ===================== */
function Ajustes({ cfg, setCfg, medios, movs, onBorrarVarios, onReiniciar, onCerrar }) {
  const num = (k, etiq, nota, paso) => (
    <div style={{ marginBottom: 18 }}>
      <label className="lbl">{etiq}</label>
      <input
        className="num" inputMode="decimal" value={cfg[k]}
        onChange={(e) => setCfg({ ...cfg, [k]: +e.target.value.replace(/[^\d.-]/g, "") || 0 })}
        style={{ textAlign: "right" }}
      />
      {nota && <div style={{ fontSize: 12, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>{nota}</div>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 50, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15.5, fontWeight: 620 }}>Ajustes</span>
        <button onClick={onCerrar} style={{ fontSize: 15, fontWeight: 620 }}>Listo</button>
      </div>

      <div style={{ padding: 16, paddingBottom: 50 }}>
        {num("tc", "Dólar ($ por U$S)", "Tu precio de compra. Como pagás los saldos en dólares, no pagás la percepción del 30%.")}
        <div style={{ marginBottom: 18 }}>
          <label className="lbl">Sellos e IIBB sobre tarjetas (%)</label>
          <input
            className="num" inputMode="decimal" value={(cfg.sellos * 100).toFixed(1)}
            onChange={(e) => setCfg({ ...cfg, sellos: (+e.target.value.replace(/[^\d.]/g, "") || 0) / 100 })}
            style={{ textAlign: "right" }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="lbl">Ajuste mensual de precios y sueldo (%)</label>
          <input
            className="num" inputMode="decimal" value={(cfg.ajuste * 100).toFixed(1)}
            onChange={(e) => setCfg({ ...cfg, ajuste: (+e.target.value.replace(/[^\d.]/g, "") || 0) / 100 })}
            style={{ textAlign: "right" }}
          />
          <div style={{ fontSize: 12, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
            Se aplica a todo lo que se repite todos los meses. Dejalo en 0 si querés ver los números de hoy.
            A 12 o 24 meses conviene poner algo.
          </div>
        </div>

        <div style={{ marginTop: 28, marginBottom: 12, fontSize: 14.5, fontWeight: 620 }}>Borrado masivo</div>
        {medios.map((m) => {
          const n = movs.filter((x) => x.medio === m.id).length;
          if (!n) return null;
          return (
            <button
              key={m.id}
              className="btn ghost"
              style={{ marginBottom: 8, fontSize: 14.5, fontWeight: 500 }}
              onClick={() => {
                if (confirm(`¿Borrar los ${n} movimientos de ${m.nombre}?`))
                  onBorrarVarios(movs.filter((x) => x.medio === m.id).map((x) => x.id));
              }}
            >
              Borrar todo de {m.nombre} ({n})
            </button>
          );
        })}

        <button
          className="btn peligro"
          style={{ marginTop: 20 }}
          onClick={() => {
            if (confirm("¿Borrar TODOS los movimientos? Quedás con la app vacía."))
              onBorrarVarios(movs.map((x) => x.id));
          }}
        >
          Borrar todos los movimientos
        </button>

        <button
          className="btn ghost"
          style={{ marginTop: 10 }}
          onClick={() => {
            if (confirm("¿Volver a los datos originales de tus resúmenes? Se pierde todo lo que cargaste."))
              onReiniciar();
          }}
        >
          Reiniciar con mis datos originales
        </button>
      </div>
    </div>
  );
}

/* ===================== SHELL ===================== */
const TABS = [["hoy", "Hoy"], ["movs", "Movimientos"], ["sim", "Simular"], ["rep", "Reparto"]];
const CFG_INI = { saldoHoy: 775000, tc: 1550, sellos: 0.012, ajuste: 0, horizonte: 6, desdeMes: null };

export default function App() {
  const [tab, setTab] = useState("hoy");
  const [cfg, setCfgRaw] = useState(CFG_INI);
  const [movs, setMovs] = useState(SEED);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const medios = MEDIOS_INI;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("flujo:v2");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.cfg) setCfgRaw({ ...CFG_INI, ...d.cfg });
        if (Array.isArray(d.movs)) setMovs(d.movs);
      }
    } catch (e) { /* primera vez */ }
    setCargando(false);
  }, []);

  const persistir = useCallback((c, m) => {
    try { localStorage.setItem("flujo:v2", JSON.stringify({ cfg: c, movs: m })); } catch (e) { /* lleno */ }
  }, []);
  const setCfg = (c) => { setCfgRaw(c); persistir(c, movs); };
  const setM = (m) => { setMovs(m); persistir(cfg, m); };

  const guardarMov = (mv) => {
    const existe = movs.some((x) => x.id === mv.id);
    setM(existe ? movs.map((x) => (x.id === mv.id ? mv : x)) : [mv, ...movs]);
    setEditando(null);
  };
  const borrarVarios = (ids) => { setM(movs.filter((x) => !ids.includes(x.id))); setEditando(null); };
  const reiniciar = () => { setM(SEED); setVerAjustes(false); };

  const desde = cfg.desdeMes || mesArranque();
  const filas = useMemo(
    () => proyectar({ ...cfg, desdeMes: desde }, movs, medios, cfg.horizonte, null),
    [cfg, movs, medios, desde]
  );
  const personas = useMemo(() => [...new Set(movs.filter((m) => m.persona).map((m) => m.persona))], [movs]);

  if (cargando)
    return <div className="bz" style={{ padding: 40, textAlign: "center", color: T.suave }}><style>{CSS}</style>Cargando…</div>;

  return (
    <div className="bz" style={{ maxWidth: 470, margin: "0 auto", paddingBottom: 96 }}>
      <style>{CSS}</style>

      {tab === "hoy" && <Hoy cfg={{ ...cfg, desdeMes: desde }} setCfg={setCfg} filas={filas} medios={medios} onAbrirAjustes={() => setVerAjustes(true)} />}
      {tab === "movs" && <Movimientos movs={movs} medios={medios} cfg={cfg} onEditar={setEditando} onBorrarVarios={borrarVarios} />}
      {tab === "sim" && <Simular cfg={{ ...cfg, desdeMes: desde }} movs={movs} medios={medios} />}
      {tab === "rep" && <Reparto filas={filas} />}

      <button
        onClick={() => setEditando({})}
        style={{
          position: "fixed", right: 18, bottom: 84, width: 54, height: 54, borderRadius: 27,
          background: T.tinta, color: "#fff", fontSize: 28, fontWeight: 300, zIndex: 20,
          boxShadow: "0 3px 14px rgba(18,49,43,.28)", lineHeight: 1,
        }}
        aria-label="Agregar movimiento"
      >+</button>

      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 470, margin: "0 auto",
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: T.card,
        borderTop: `1px solid ${T.linea}`, zIndex: 30,
      }}>
        {TABS.map(([id, n]) => (
          <button
            key={id} onClick={() => setTab(id)}
            style={{
              padding: "14px 4px 22px", fontSize: 12.5,
              fontWeight: tab === id ? 640 : 450,
              color: tab === id ? T.tinta : T.tenue,
              borderTop: `2px solid ${tab === id ? T.tinta : "transparent"}`, marginTop: -1,
            }}
          >{n}</button>
        ))}
      </nav>

      {editando && (
        <FormMov
          inicial={editando} medios={medios} personas={personas}
          onGuardar={guardarMov} onBorrar={(id) => borrarVarios([id])} onCerrar={() => setEditando(null)}
        />
      )}
      {verAjustes && (
        <Ajustes
          cfg={cfg} setCfg={setCfg} medios={medios} movs={movs}
          onBorrarVarios={borrarVarios} onReiniciar={reiniciar} onCerrar={() => setVerAjustes(false)}
        />
      )}
    </div>
  );
}
