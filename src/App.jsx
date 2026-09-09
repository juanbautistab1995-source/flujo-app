import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

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
  { id: "icbc", nombre: "Visa ICBC Signature", corto: "ICBC", cierre: 23, vto: 6, ciclos: [
    { cierre: "2026-07-23", vto: "2026-08-04" },
    { cierre: "2026-08-20", vto: "2026-09-01" },
    { cierre: "2026-09-24", vto: "2026-10-06" },
  ] },
  { id: "hipo", nombre: "Visa Hipotecario", corto: "Hipo", cierre: 30, vto: 9, ciclos: [
    { cierre: "2026-07-30", vto: "2026-08-07" },
    { cierre: "2026-08-27", vto: "2026-09-04" },
    { cierre: "2026-10-01", vto: "2026-10-09" },
  ] },
  { id: "bna", nombre: "Visa Banco Nación", corto: "BNA", cierre: 30, vto: 14, ciclos: [
    { cierre: "2026-08-27", vto: "2026-09-09" },
    { cierre: "2026-10-01", vto: "2026-10-14" },
  ] },
  { id: "master", nombre: "Mastercard ICBC", corto: "Master", cierre: 30, vto: 15, ciclos: [
    { cierre: "2026-07-30", vto: "2026-08-12" },
    { cierre: "2026-08-27", vto: "2026-09-09" },
    { cierre: "2026-10-01", vto: "2026-10-15" },
  ] },
  { id: "efectivo", nombre: "Efectivo / débito", corto: "Efvo", cierre: 0, vto: 0 },
];

const SEED = [
  {"tipo": "ingreso", "detalle": "Sueldo neto", "monto": 3100000, "medio": "efectivo", "recurrente": true, "id": "s1"},
  {"tipo": "ingreso", "detalle": "Aguinaldo", "monto": 3100000, "medio": "efectivo", "recurrente": true, "meses": [1, 7], "id": "s2"},
  {"tipo": "ingreso", "detalle": "Extra por permanencia", "monto": 300000, "medio": "efectivo", "mesInicio": "2026-10", "cuotas": 1, "id": "s3"},
  {"tipo": "gasto", "detalle": "Préstamo prendario (auto)", "monto": 265000, "medio": "efectivo", "recurrente": true, "id": "s4", "categoria": "Préstamos"},
  {"tipo": "gasto", "detalle": "Préstamo personal (casa)", "monto": 49000, "medio": "efectivo", "recurrente": true, "id": "s5", "categoria": "Préstamos"},
  {"tipo": "gasto", "detalle": "Psicología", "monto": 320000, "medio": "efectivo", "recurrente": true, "id": "s6", "categoria": "Salud"},
  {"tipo": "gasto", "detalle": "Gimnasio", "monto": 55000, "medio": "efectivo", "recurrente": true, "id": "s7", "categoria": "Deporte"},
  {"tipo": "gasto", "detalle": "Básquet", "monto": 30000, "medio": "efectivo", "recurrente": true, "id": "s8", "categoria": "Deporte"},
  {"tipo": "gasto", "detalle": "Almuerzos de trabajo", "monto": 100000, "medio": "efectivo", "recurrente": true, "id": "s9", "categoria": "Alimentación"},
  {"tipo": "gasto", "detalle": "Madacom internet", "medio": "icbc", "recurrente": true, "monto": 35880, "id": "s10", "categoria": "Vivienda y servicios"},
  {"tipo": "gasto", "detalle": "Combustible", "medio": "icbc", "recurrente": true, "monto": 25000, "id": "s11", "categoria": "Transporte y nafta"},
  {"tipo": "gasto", "detalle": "Gastos del día a día", "medio": "icbc", "recurrente": true, "monto": 266488, "id": "s12", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Apple + Google", "medio": "icbc", "recurrente": true, "montoUsd": 33.98, "moneda": "USD", "id": "s13", "categoria": "Suscripciones"},
  {"tipo": "gasto", "detalle": "Claro", "medio": "hipo", "recurrente": true, "monto": 65612, "id": "s14", "categoria": "Vivienda y servicios"},
  {"tipo": "gasto", "detalle": "Edelap", "medio": "hipo", "recurrente": true, "monto": 36485, "id": "s15", "categoria": "Vivienda y servicios"},
  {"tipo": "gasto", "detalle": "Telepase", "medio": "hipo", "recurrente": true, "monto": 9580, "id": "s16", "categoria": "Transporte y nafta"},
  {"tipo": "gasto", "detalle": "Spotify", "medio": "hipo", "recurrente": true, "monto": 8413, "id": "s17", "categoria": "Suscripciones"},
  {"tipo": "gasto", "detalle": "Seguro BHN", "medio": "hipo", "recurrente": true, "monto": 17234, "persona": "A confirmar", "pct": 1.0, "id": "s18", "categoria": "Seguros"},
  {"tipo": "gasto", "detalle": "Netflix", "medio": "hipo", "recurrente": true, "montoUsd": 13.56, "moneda": "USD", "id": "s19", "categoria": "Suscripciones"},
  {"tipo": "gasto", "detalle": "Disco", "medio": "bna", "recurrente": true, "monto": 150000, "id": "s20", "categoria": "Alimentación"},
  {"tipo": "gasto", "detalle": "Shell", "medio": "bna", "recurrente": true, "monto": 79990, "id": "s21", "categoria": "Transporte y nafta"},
  {"tipo": "gasto", "detalle": "Seguro Federación Patronal", "medio": "master", "recurrente": true, "monto": 101955, "persona": "Betty", "pct": 1.0, "id": "s22", "categoria": "Seguros"},
  {"tipo": "gasto", "detalle": "Federación Patronal (resto)", "medio": "master", "recurrente": true, "monto": 136918, "id": "s23", "categoria": "Seguros"},
  {"tipo": "gasto", "detalle": "Rappi", "medio": "master", "recurrente": true, "monto": 14880, "id": "s24", "categoria": "Alimentación"},
  {"tipo": "gasto", "detalle": "PlayStation", "medio": "master", "recurrente": true, "montoUsd": 11.99, "moneda": "USD", "id": "s25", "categoria": "Suscripciones"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 37905.96, "medio": "icbc", "cuotas": 12, "mesInicio": "2026-02", "id": "s26", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Almundo", "monto": 483870.36, "medio": "icbc", "cuotas": 12, "mesInicio": "2026-03", "id": "s27", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Mercadolibre", "monto": 102528, "medio": "icbc", "cuotas": 12, "mesInicio": "2026-05", "id": "s28", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Run", "monto": 25309.98, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-06", "id": "s29", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Run", "monto": 6409.98, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-06", "id": "s30", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Perfumsnow", "monto": 131949.96, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-07", "id": "s31", "categoria": "Cuidado personal"},
  {"tipo": "gasto", "detalle": "Nike La Plata", "monto": 227997.96, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-07", "persona": "Betty", "pct": 0.4737, "id": "s32", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Gaona", "monto": 61492.5, "medio": "icbc", "cuotas": 9, "mesInicio": "2026-07", "id": "s33", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Perfumeriaspigmento", "monto": 223519.92, "medio": "icbc", "cuotas": 24, "mesInicio": "2026-07", "id": "s34", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Simplicity La Plata", "monto": 31498.98, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-08", "id": "s35", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Kingofkings", "monto": 98994, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-08", "id": "s36", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Confeccionesseman", "monto": 69990, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-08", "id": "s37", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Kevingston", "monto": 123999.96, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-08", "id": "s38", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Seven Electronics", "monto": 80888.04, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s39", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Thebrandschoi", "monto": 57325.02, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s40", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Opensports", "monto": 20000.04, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s41", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Iey", "monto": 35991.0, "medio": "icbc", "cuotas": 6, "mesInicio": "2026-09", "id": "s42", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Blossomfragancias", "monto": 114000, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-09", "id": "s43", "persona": "Federico Catenazzi", "pct": 0.5, "categoria": "Cuidado personal"},
  {"tipo": "gasto", "detalle": "Vertical Skisnow (Compra Nueva)", "monto": 171932.4, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-10", "excepcional": true, "id": "s44", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Vertical Skisnow (Compra Nueva)", "monto": 21999, "medio": "icbc", "cuotas": 3, "mesInicio": "2026-10", "excepcional": true, "id": "s45", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Fiambreriaale (Compra Nueva)", "monto": 26852.5, "medio": "icbc", "cuotas": 2, "mesInicio": "2026-10", "id": "s46", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Bidcom", "monto": 759769.92, "medio": "master", "cuotas": 18, "mesInicio": "2025-06", "id": "s47", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Bidcom", "monto": 78723.72, "medio": "master", "cuotas": 18, "mesInicio": "2025-12", "id": "s48", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 204613.56, "medio": "master", "cuotas": 12, "mesInicio": "2026-02", "id": "s49", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 52397.28, "medio": "master", "cuotas": 12, "mesInicio": "2026-02", "id": "s50", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Despegar", "monto": 171326.16, "medio": "master", "cuotas": 12, "mesInicio": "2026-02", "id": "s51", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Www.Fravega.Com", "monto": 18749.16, "medio": "master", "cuotas": 12, "mesInicio": "2026-03", "id": "s52", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Shop Gallery Mendoza", "monto": 70099.98, "medio": "master", "cuotas": 6, "mesInicio": "2026-07", "id": "s53", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Alfisjeans", "monto": 78900, "medio": "master", "cuotas": 3, "mesInicio": "2026-08", "id": "s54", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Visaur", "monto": 2599998.9, "medio": "bna", "cuotas": 30, "mesInicio": "2025-02", "id": "s55", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Home Sweet S.A.", "monto": 74263.92, "medio": "bna", "cuotas": 24, "mesInicio": "2025-06", "id": "s56", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Consumiblesds", "monto": 8870.94, "medio": "bna", "cuotas": 18, "mesInicio": "2026-02", "id": "s57", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Consumiblesds", "monto": 44457.84, "medio": "bna", "cuotas": 18, "mesInicio": "2026-02", "id": "s58", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Perfumeria Pigmento", "monto": 47758.5, "medio": "bna", "cuotas": 18, "mesInicio": "2026-03", "id": "s59", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Perfumeria Pigmento", "monto": 126984.6, "medio": "bna", "cuotas": 18, "mesInicio": "2026-05", "id": "s60", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Simplicity La Plata", "monto": 43144.92, "medio": "bna", "cuotas": 12, "mesInicio": "2026-05", "id": "s61", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Perfumeria Pigmento", "monto": 52423.56, "medio": "bna", "cuotas": 18, "mesInicio": "2026-07", "id": "s62", "categoria": "Otros"},
  {"tipo": "gasto", "detalle": "Busplus", "monto": 25200, "medio": "bna", "cuotas": 3, "mesInicio": "2026-09", "id": "s63", "categoria": "Transporte y nafta"},
  {"tipo": "gasto", "detalle": "Busplus", "monto": 28980, "medio": "bna", "cuotas": 3, "mesInicio": "2026-09", "id": "s64", "categoria": "Transporte y nafta"},
  {"tipo": "gasto", "detalle": "Gadnic", "monto": 47187.9, "medio": "hipo", "cuotas": 15, "mesInicio": "2025-10", "id": "s65", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Mercadolibre", "monto": 49128.66, "medio": "hipo", "cuotas": 6, "mesInicio": "2026-05", "id": "s66", "categoria": "Hogar y compras"},
  {"tipo": "gasto", "detalle": "Viaje: nafta, Ubers, Patagonia, comidas", "monto": 450385, "medio": "icbc", "mesInicio": "2026-10", "cuotas": 1, "persona": "Sol", "pct": 0.5, "excepcional": true, "id": "s67", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Viaje: Airbnb Bariloche", "montoUsd": 105, "moneda": "USD", "medio": "icbc", "mesInicio": "2026-10", "cuotas": 1, "persona": "Sol", "pct": 0.5, "excepcional": true, "id": "s68", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Bariloche: 23 consumos en 1 pago", "monto": 1079779, "medio": "efectivo", "mesInicio": "2026-10", "cuotas": 1, "persona": "Sol", "pct": 0.5, "pagadoPor": "otro", "excepcional": true, "id": "s69", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Aerolíneas Maestro EZE", "monto": 68970, "medio": "efectivo", "mesInicio": "2026-10", "cuotas": 1, "persona": "Sol", "pct": 0.5, "pagadoPor": "otro", "excepcional": true, "id": "s70", "categoria": "Viajes"},
  {"tipo": "gasto", "detalle": "Catedral Alta Patagonia (pases Bariloche)", "monto": 334000, "medio": "efectivo", "mesInicio": "2026-10", "cuotas": 6, "persona": "Sol", "pct": 0.5, "pagadoPor": "otro", "excepcional": true, "id": "s71", "categoria": "Indumentaria"},
  {"tipo": "gasto", "detalle": "Villa La Angostura: alojamiento, pases, escuela y equipos", "monto": 1980000, "medio": "efectivo", "mesInicio": "2026-10", "cuotas": 11, "persona": "Sol", "pct": 0.5, "pagadoPor": "otro", "excepcional": true, "id": "s72", "categoria": "Viajes"}
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
const hoyISO = () => new Date().toISOString().slice(0, 10);

const plata = (n, d = 0) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const corta = (n) => {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1000) return s + "$" + Math.round(a / 1000) + "k";
  return plata(n);
};

const BANCOS = [
  "Galicia", "Santander", "BBVA", "Nación", "Provincia", "Macro", "ICBC", "HSBC",
  "Credicoop", "Patagonia", "Supervielle", "Ciudad", "Hipotecario", "Comafi", "Itaú",
  "Brubank", "Uala", "Naranja X", "Mercado Pago", "Personal Pay", "Otro",
];
const MARCAS = ["Visa", "Mastercard", "Amex", "Cabal"];

const CATEGORIAS = [
  "Alimentación", "Gastronomía y salidas", "Transporte y nafta", "Vivienda y servicios",
  "Salud", "Indumentaria", "Suscripciones", "Deporte", "Cuidado personal",
  "Hogar y compras", "Viajes", "Préstamos", "Seguros", "Educación", "Otros",
];

/* ===================== COTIZACIONES ===================== */
const FUENTES = [
  { id: "blue", nombre: "Blue" },
  { id: "oficial", nombre: "Oficial" },
  { id: "bolsa", nombre: "MEP" },
  { id: "cripto", nombre: "Cripto" },
];

async function traerCotizacion(fuente) {
  const r = await fetch(`https://dolarapi.com/v1/dolares/${fuente}`, { cache: "no-store" });
  if (!r.ok) throw new Error("no responde");
  const d = await r.json();
  if (!d || !d.venta) throw new Error("respuesta rara");
  return { compra: d.compra, venta: d.venta, fecha: d.fechaActualizacion || new Date().toISOString() };
}

// Devuelve la cotizacion viva, con lo ultimo conocido como respaldo.
function useCotizacion(fuente, activo) {
  const [coti, setCoti] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem("flujo:coti") || "null"); return c; } catch (e) { return null; }
  });
  const [estado, setEstado] = useState("");

  const refrescar = useCallback(async () => {
    if (!activo) return;
    setEstado("buscando");
    try {
      const c = await traerCotizacion(fuente);
      const dato = { ...c, fuente, traido: Date.now() };
      setCoti(dato); setEstado("ok");
      try { localStorage.setItem("flujo:coti", JSON.stringify(dato)); } catch (e) {}
    } catch (e) { setEstado("error"); }
  }, [fuente, activo]);

  useEffect(() => {
    if (!activo) return;
    const viejo = !coti || coti.fuente !== fuente || Date.now() - (coti.traido || 0) > 30 * 60 * 1000;
    if (viejo) refrescar();
  }, [fuente, activo, refrescar]);

  return { coti, estado, refrescar };
}

/* ===================== MOTOR ===================== */
// Devuelve el mes en que se PAGA una compra hecha en `fecha` con `medio`.
// Los bancos no cierran un dia fijo del mes: arman el calendario a mano, casi siempre
// respetando el dia de la semana. Por eso usamos los ciclos REALES que carga el usuario
// desde su resumen, y solo estimamos mas alla del ultimo conocido.
function ciclosDe(m) {
  return (m.ciclos || []).slice().sort((a, b) => (a.cierre < b.cierre ? -1 : 1));
}

// Estima el siguiente ciclo respetando el dia de la semana del ultimo real.
function siguienteCiclo(ult) {
  const av = (iso) => {
    const d = new Date(iso + "T12:00:00");
    const mesOrig = d.getMonth();
    d.setDate(d.getDate() + 28);              // 4 semanas: mismo dia de semana
    if (d.getMonth() === mesOrig) d.setDate(d.getDate() + 7);  // si no cambio de mes, 5 semanas
    return d.toISOString().slice(0, 10);
  };
  return { cierre: av(ult.cierre), vto: av(ult.vto), estimado: true };
}

// Primer ciclo tentativo cuando la tarjeta no tiene ninguno cargado
function cicloTentativo(m, desdeISO) {
  const d = new Date(desdeISO + "T12:00:00");
  const c = new Date(d.getFullYear(), d.getMonth(), Math.min(m.cierre || 25, 28), 12);
  if (c < d) c.setMonth(c.getMonth() + 1);
  const v = new Date(c);
  if ((m.vto || 10) <= (m.cierre || 25)) v.setMonth(v.getMonth() + 1);
  v.setDate(Math.min(m.vto || 10, 28));
  return { cierre: c.toISOString().slice(0, 10), vto: v.toISOString().slice(0, 10), estimado: true };
}

function cicloParaFecha(m, fechaISO) {
  const cs = ciclosDe(m).filter((c) => c && c.cierre && c.vto);
  if (!cs.length) return null;
  for (const c of cs) if (fechaISO <= c.cierre) return c;
  let ult = cs[cs.length - 1];
  for (let i = 0; i < 48; i++) {              // estiramos hasta 4 años
    ult = siguienteCiclo(ult);
    if (fechaISO <= ult.cierre) return ult;
  }
  return ult;
}

function mesDePago(fecha, medioId, medios) {
  const m = (medios || []).find((x) => x.id === medioId);
  const d = new Date((fecha || "") + "T12:00:00");
  if (isNaN(d.getTime())) return mesDeHoy();
  if (!m || m.id === "efectivo") return d.toISOString().slice(0, 7);

  const c = cicloParaFecha(m, fecha);
  if (c) return c.vto.slice(0, 7);

  // Sin ciclos cargados: caemos al dia fijo del mes
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const cierreReal = Math.min(m.cierre || 30, ultimo);
  let n = d.getFullYear() * 12 + d.getMonth();
  if (d.getDate() > cierreReal) n += 1;
  if ((m.vto || 10) <= (m.cierre || 30)) n += 1;
  return mesDeIdx(n);
}

// Tarjetas cuyo ultimo ciclo real ya cerro: hay que pedirle al usuario el proximo.
function tarjetasSinActualizar(medios, hoy) {
  return medios.filter((m) => {
    if (m.id === "efectivo") return false;
    const cs = ciclosDe(m);
    if (!cs.length) return true;                       // recién creada
    return cs[cs.length - 1].cierre < hoy;             // el último que conocemos ya cerró
  });
}

// Ciclos guardados como estimación, que conviene confirmar contra el resumen
function ciclosEstimados(medios) {
  const out = [];
  medios.forEach((m) => (m.ciclos || []).forEach((c) => { if (c.estimado) out.push({ m, c }); }));
  return out;
}

// Cuánto pesa un movimiento en un mes dado (0 si no aplica).
function montoEnMes(mv, mk, tc) {
  const num = (v) => (typeof v === "number" && isFinite(v) ? v : parseFloat(v) || 0);
  const base = mv.tipo === "ahorro" ? num(mv.montoUsd) * (num(mv.tcCompra) || tc)
             : mv.moneda === "USD" ? num(mv.montoUsd) * tc
             : num(mv.monto);
  if (!base) return 0;
  if (mv.recurrente) {
    if (mv.meses && mv.meses.length && !mv.meses.includes(+mk.slice(5, 7))) return 0;
    if (mv.desde && idxMes(mk) < idxMes(mv.desde)) return 0;
    if (mv.hasta && idxMes(mk) > idxMes(mv.hasta)) return 0;
    return base;
  }
  // Sin mes de inicio no se puede ubicar: lo ignoramos en vez de romper la app.
  if (!mv.mesInicio || !/^\d{4}-\d{2}$/.test(mv.mesInicio)) return 0;
  const n = Math.max(1, mv.cuotas || 1);
  const k = distMes(mv.mesInicio, mk);
  // `monto` es el TOTAL de la compra; el motor lo reparte en las cuotas.
  return k >= 0 && k < n ? base / n : 0;
}

function nroCuota(mv, mk) {
  if (mv.recurrente || !mv.mesInicio) return null;
  return distMes(mv.mesInicio, mk) + 1;
}

// Deja todo el mes en cero: sirve para dar por saldado el mes en curso.
function ajustesEnCero(movs, mk, tc) {
  const o = {};
  movs.forEach((mv) => { if (montoEnMes(mv, mk, tc) > 0) o[mv.id] = 0; });
  return o;
}

function proyectar(cfg, movs, medios, meses, extra) {
  const arr = extra ? [...movs, extra] : movs;
  const desde = cfg.desdeMes || mesDeHoy();
  const filas = [];
  for (let i = 0; i < meses; i++) {
    const mk = sumaMes(desde, i);
    const infl = Math.pow(1 + (cfg.ajuste || 0), i);
    const porMedio = {};
    const items = [];
    const reint = [];
    const deudas = [];
    let ingresos = 0, excepcional = 0, ahorro = 0, usdComprados = 0;

    const aj = (cfg.ajustes && cfg.ajustes[mk]) || {};
    arr.forEach((mv) => {
      const base = montoEnMes(mv, mk, cfg.tc);
      const tocado = Object.prototype.hasOwnProperty.call(aj, mv.id);
      // Ajuste puntual: este mes vale otra cosa (0 = ya pagado o no aplica).
      let m = tocado ? aj[mv.id] : base;
      if (!m) {
        // Si lo diste por saldado, lo dejamos visible para poder revertirlo.
        if (tocado && base > 0) items.push({ mv, monto: 0, base, saldado: true, cuota: nroCuota(mv, mk) });
        return;
      }
      if (mv.recurrente) m *= infl;
      if (mv.tipo === "ingreso") {
        ingresos += m;
        items.push({ mv, monto: m, ingreso: true });
        return;
      }
      if (mv.tipo === "ahorro") {
        // No es un gasto: la plata sale de la caja en pesos y entra a tus reservas.
        const tcc = mv.tcCompra || cfg.tc;
        const pesos = tocado ? m : (mv.montoUsd || 0) * tcc;
        porMedio.efectivo = (porMedio.efectivo || 0) + pesos;
        ahorro += pesos;
        usdComprados += pesos / tcc;
        items.push({ mv, monto: pesos, usd: pesos / tcc, ahorro: true, cuota: nroCuota(mv, mk) });
        return;
      }
      if (mv.pagadoPor === "otro") {
        // Lo puso otra persona con su plata: a vos te sale solo tu parte, y se la transferís.
        const mio = m * (mv.pct != null ? mv.pct : 1);
        porMedio.efectivo = (porMedio.efectivo || 0) + mio;
        items.push({ mv, monto: mio, cuota: nroCuota(mv, mk), deuda: true });
        if (mv.persona) deudas.push({ persona: mv.persona, monto: mio, detalle: mv.detalle });
        if (mv.excepcional) excepcional += mio;
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
    const totalDeudas = deudas.reduce((a, d) => a + d.monto, 0);
    filas.push({
      mk, ingresos: totIng, egresos, tarjetas, efvo, reint, totalReint,
      deudas, totalDeudas, excepcional, ahorro, usdComprados,
      porMedio, items, resultado: totIng - egresos,
    });
  }
  let s = cfg.saldoHoy;
  let usd = cfg.reservasUsd || 0;
  filas.forEach((f) => {
    s += f.resultado; f.saldo = s;
    usd += f.usdComprados; f.reservasUsd = usd;
    f.patrimonio = s + usd * cfg.tc;
  });
  return filas;
}

/* ===================== SUPABASE ===================== */
const SUPABASE_URL = "https://xlgiwplfirizzmjgayzh.supabase.co";
const SUPABASE_KEY = "sb_publishable_0EJv3nmLutzCuosws_husg_lVLyBnVX";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const limpiarUsuario = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_.]/g, "").slice(0, 20);

/* ===================== ACCESO ===================== */
function Acceso() {
  const [modo, setModo] = useState("entrar");
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [usuario, setUsuario] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const valido =
    modo === "entrar"
      ? mail.includes("@") && pass.length >= 6
      : mail.includes("@") && pass.length >= 6 && usuario.length >= 3 && nombre.trim();

  const entrar = async () => {
    setCargando(true); setError(""); setAviso("");
    try {
      if (modo === "entrar") {
        const { error } = await sb.auth.signInWithPassword({ email: mail.trim(), password: pass });
        if (error) throw error;
      } else if (modo === "crear") {
        const { data: existe } = await sb.from("perfiles").select("usuario").eq("usuario", usuario).maybeSingle();
        if (existe) throw new Error("Ese usuario ya está tomado. Probá otro.");
        const { data, error } = await sb.auth.signUp({ email: mail.trim(), password: pass });
        if (error) throw error;
        const uid = data.user && data.user.id;
        if (uid) {
          await sb.from("perfiles").insert({ id: uid, usuario, nombre: nombre.trim() });
          await sb.from("datos").insert({ id: uid, cfg: {}, movs: [] });
        }
        if (!data.session) setAviso("Te mandamos un mail para confirmar la cuenta.");
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(mail.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setAviso("Si ese mail está registrado, te va a llegar un link para cambiar la contraseña.");
      }
    } catch (e) {
      const m = String(e.message || e);
      setError(
        m.includes("Invalid login") ? "Mail o contraseña incorrectos."
        : m.includes("already registered") ? "Ese mail ya tiene cuenta. Probá entrar."
        : m.includes("at least 6") ? "La contraseña necesita 6 caracteres como mínimo."
        : m
      );
    }
    setCargando(false);
  };

  return (
    <div className="bz" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
      <style>{CSS}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 30, fontWeight: 680, letterSpacing: "-0.02em" }}>Bancame</div>
          <div style={{ fontSize: 13.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
            Tus gastos, tus cuotas y lo que te deben, en un solo lugar.
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
            {[["entrar", "Entrar"], ["crear", "Crear cuenta"]].map(([v, n]) => (
              <button key={v} className={"chip" + (modo === v ? " on" : "")}
                onClick={() => { setModo(v); setError(""); setAviso(""); }}>{n}</button>
            ))}
          </div>

          {modo === "crear" && (
            <>
              <label className="lbl">Cómo te llamás</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />

              <label className="lbl" style={{ marginTop: 14 }}>Tu usuario</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 19, color: T.tenue }}>@</span>
                <input value={usuario} onChange={(e) => setUsuario(limpiarUsuario(e.target.value))} placeholder="jbblanco" />
              </div>
              <div style={{ fontSize: 12, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
                Es tu nombre público. Con esto te van a encontrar para compartir gastos. Tu mail no lo ve nadie.
              </div>
            </>
          )}

          <label className="lbl" style={{ marginTop: modo === "crear" ? 14 : 0 }}>Mail</label>
          <input type="email" inputMode="email" autoCapitalize="none" value={mail}
            onChange={(e) => setMail(e.target.value)} placeholder="vos@mail.com" />

          {modo !== "olvide" && (
            <>
              <label className="lbl" style={{ marginTop: 14 }}>Contraseña</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                placeholder={modo === "crear" ? "Mínimo 6 caracteres" : ""} />
            </>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: T.rojoBg, borderRadius: 10,
                          fontSize: 13, color: T.rojo, lineHeight: 1.5 }}>{error}</div>
          )}
          {aviso && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: T.ambarBg, borderRadius: 10,
                          fontSize: 13, lineHeight: 1.5 }}>{aviso}</div>
          )}

          <button
            className="btn"
            onClick={entrar}
            disabled={cargando || (modo !== "olvide" && !valido)}
            style={{ marginTop: 18, opacity: cargando || (modo !== "olvide" && !valido) ? 0.45 : 1 }}
          >
            {cargando ? "Un segundo…" : modo === "entrar" ? "Entrar" : modo === "crear" ? "Crear mi cuenta" : "Mandarme el link"}
          </button>

          {modo === "entrar" && (
            <button onClick={() => { setModo("olvide"); setError(""); }}
              style={{ marginTop: 14, width: "100%", fontSize: 13, color: T.suave }}>
              Me olvidé la contraseña
            </button>
          )}
          {modo === "olvide" && (
            <button onClick={() => { setModo("entrar"); setError(""); setAviso(""); }}
              style={{ marginTop: 14, width: "100%", fontSize: 13, color: T.suave }}>
              Volver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== CUENTA ===================== */
function Cuenta({ perfil, onCerrar, onSalir, estado }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 60, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15.5, fontWeight: 620 }}>Mi cuenta</span>
        <button onClick={onCerrar} style={{ fontSize: 15, fontWeight: 620 }}>Listo</button>
      </div>
      <div style={{ padding: 16 }}>
        <div className="card" style={{ padding: 17 }}>
          <div style={{ fontSize: 22, fontWeight: 640 }}>{perfil ? perfil.nombre : "—"}</div>
          <div style={{ fontSize: 15, color: T.ambar, marginTop: 3, fontWeight: 600 }}>
            @{perfil ? perfil.usuario : "…"}
          </div>
          <div style={{ fontSize: 12.5, color: T.suave, marginTop: 12, lineHeight: 1.5 }}>
            Compartí tu usuario con quien quieras dividir gastos. Tu mail no lo ve nadie.
          </div>
        </div>

        <div className="card" style={{ padding: 15, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: T.suave }}>Tus datos</span>
            <span style={{ color: estado === "guardado" ? T.verde : estado === "error" ? T.rojo : T.suave }}>
              {estado === "guardando" ? "Guardando…" : estado === "error" ? "Sin conexión" : "Guardados en la nube"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
            Se sincronizan solos. Podés entrar desde cualquier teléfono con tu mail y contraseña.
          </div>
        </div>

        <button className="btn ghost" style={{ marginTop: 20 }} onClick={onSalir}>Cerrar sesión</button>
      </div>
    </div>
  );
}

/* ===================== MIS TARJETAS ===================== */
function Medios({ medios, movs, onGuardar, onCerrar }) {
  const [edit, setEdit] = useState(null);

  const vacio = { id: "", nombre: "", banco: "Galicia", marca: "Visa", corto: "", cierre: 25, vto: 10 };
  const guardar = () => {
    const e = edit;
    if (!e.nombre.trim()) return;
    const id = e.id || "t" + Date.now();
    const m = {
      id, nombre: e.nombre.trim(),
      corto: (e.corto || e.nombre).trim().slice(0, 8),
      banco: e.banco, marca: e.marca,
      cierre: Math.min(31, Math.max(1, +e.cierre || 25)),
      vto: Math.min(28, Math.max(1, +e.vto || 10)),
    };
    onGuardar(medios.some((x) => x.id === id) ? medios.map((x) => (x.id === id ? m : x)) : [...medios, m]);
    setEdit(null);
  };
  const borrar = (m) => {
    const usados = movs.filter((x) => x.medio === m.id).length;
    if (usados && !confirm(
      `${m.nombre} tiene ${usados} movimientos. Si la borrás, esos movimientos quedan sin medio de pago. ¿Seguro?`)) return;
    if (!usados && !confirm(`¿Borrar ${m.nombre}?`)) return;
    onGuardar(medios.filter((x) => x.id !== m.id));
    setEdit(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 70, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15.5, fontWeight: 620 }}>Mis medios de pago</span>
        <button onClick={onCerrar} style={{ fontSize: 15, fontWeight: 620 }}>Listo</button>
      </div>

      <div style={{ padding: 16, paddingBottom: 40 }}>
        {medios.map((m) => {
          const usados = movs.filter((x) => x.medio === m.id).length;
          return (
            <button key={m.id} className="card"
              onClick={() => setEdit({ ...vacio, ...m })}
              style={{ width: "100%", textAlign: "left", padding: "13px 15px", marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{m.nombre}</span>
                <span style={{ fontSize: 12, color: T.tenue }}>{usados} mov.</span>
              </div>
              <div style={{ fontSize: 12, color: T.suave, marginTop: 3 }}>
                {(() => {
                  if (m.id === "efectivo") return "No tiene ciclo de cierre";
                  const cs = (m.ciclos || []).slice().sort((a, b) => (a.cierre < b.cierre ? -1 : 1));
                  if (!cs.length) return "Sin fechas cargadas";
                  const u = cs[cs.length - 1];
                  return `Último cierre ${u.cierre.split("-").reverse().slice(0, 2).join("/")} · ` +
                         `vence ${u.vto.split("-").reverse().slice(0, 2).join("/")}` +
                         (u.estimado ? "  · estimado" : "");
                })()}
              </div>
              {(m.ciclos || []).some((c) => c.estimado) && (
                <div style={{ fontSize: 11.5, color: T.ambar, marginTop: 5 }}>
                  Tiene fechas provisorias sin confirmar
                </div>
              )}
            </button>
          );
        })}

        <button className="btn" style={{ marginTop: 8 }} onClick={() => setEdit({ ...vacio })}>
          Agregar una tarjeta
        </button>
      </div>

      {edit && (
        <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 80, overflowY: "auto" }}>
          <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                        padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setEdit(null)} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
            <span style={{ fontSize: 15.5, fontWeight: 620 }}>{edit.id ? "Editar" : "Nueva tarjeta"}</span>
            <button onClick={guardar} style={{ fontSize: 15, fontWeight: 620,
                    color: edit.nombre.trim() ? T.tinta : T.tenue }}>Guardar</button>
          </div>
          <div style={{ padding: 16, paddingBottom: 40 }}>
            {edit.id === "efectivo" ? (
              <div style={{ fontSize: 13.5, color: T.suave, lineHeight: 1.6 }}>
                El efectivo y el débito no tienen ciclo de cierre: lo que gastás sale el mismo mes.
                Solo podés cambiarle el nombre.
              </div>
            ) : null}

            <label className="lbl" style={{ marginTop: 6 }}>Banco</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BANCOS.map((b) => (
                <button key={b} className={"chip sm" + (edit.banco === b ? " on" : "")}
                  onClick={() => setEdit({ ...edit, banco: b,
                    nombre: edit.nombre || `${edit.marca} ${b}`, corto: edit.corto || b })}>{b}</button>
              ))}
            </div>

            <label className="lbl" style={{ marginTop: 16 }}>Marca</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MARCAS.map((b) => (
                <button key={b} className={"chip sm" + (edit.marca === b ? " on" : "")}
                  onClick={() => setEdit({ ...edit, marca: b })}>{b}</button>
              ))}
            </div>

            <label className="lbl" style={{ marginTop: 16 }}>Cómo la querés llamar</label>
            <input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
              placeholder="Visa Galicia" />

            <label className="lbl" style={{ marginTop: 14 }}>Nombre corto (para los filtros)</label>
            <input value={edit.corto} onChange={(e) => setEdit({ ...edit, corto: e.target.value })}
              placeholder="Galicia" />

            {edit.id !== "efectivo" && (
              <>
                <label className="lbl" style={{ marginTop: 16 }}>Día de cierre del resumen</label>
                <input className="num" inputMode="numeric" value={edit.cierre}
                  onChange={(e) => setEdit({ ...edit, cierre: e.target.value.replace(/\D/g, "") })}
                  style={{ textAlign: "right" }} />

                <label className="lbl" style={{ marginTop: 14 }}>Día de vencimiento</label>
                <input className="num" inputMode="numeric" value={edit.vto}
                  onChange={(e) => setEdit({ ...edit, vto: e.target.value.replace(/\D/g, "") })}
                  style={{ textAlign: "right" }} />

                <div style={{ marginTop: 12, padding: "11px 13px", background: T.ambarBg,
                              borderRadius: 11, fontSize: 12.5, lineHeight: 1.6 }}>
                  Una compra hecha hasta el <b>{edit.cierre}</b> la pagás el <b>{edit.vto}</b> del mes siguiente.
                  Si comprás después del {edit.cierre}, se va un mes más. Estos días te los da tu banco,
                  fijate en el resumen.
                </div>
              </>
            )}

            {edit.id && edit.id !== "efectivo" && (
              <button className="btn peligro" style={{ marginTop: 24 }}
                onClick={() => borrar(edit)}>Borrar esta tarjeta</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== ACTUALIZAR CICLOS ===================== */
// Ventana que aparece cuando el ultimo cierre cargado ya paso.
function ActualizarCiclos({ pendientes, medios, onGuardar, onPostergar }) {
  const [i, setI] = useState(0);
  const m = pendientes[i];
  const cs = (m.ciclos || []).slice().sort((a, b) => (a.cierre < b.cierre ? -1 : 1));
  const ult = cs[cs.length - 1];
  const sug = ult ? siguienteCiclo(ult) : cicloTentativo(m, hoyISO());
  const [cierre, setCierre] = useState(sug.cierre);
  const [vto, setVto] = useState(sug.vto);

  const guardar = (estimado) => {
    if (!cierre || !vto || vto < cierre) return;
    const nuevos = medios.map((x) =>
      x.id === m.id
        ? { ...x, ciclos: [...(x.ciclos || []), estimado ? { cierre, vto, estimado: true } : { cierre, vto }] }
        : x);
    onGuardar(nuevos);
    if (i + 1 < pendientes.length) {
      const sig = pendientes[i + 1];
      const c2 = (sig.ciclos || []).slice().sort((a, b) => (a.cierre < b.cierre ? -1 : 1));
      const s2 = c2.length ? siguienteCiclo(c2[c2.length - 1]) : { cierre: hoyISO(), vto: hoyISO() };
      setCierre(s2.cierre); setVto(s2.vto); setI(i + 1);
    }
  };

  const dia = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()];
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(18,49,43,.45)", zIndex: 90,
                  display: "flex", alignItems: "flex-end" }}>
      <div className="bz" style={{ width: "100%", maxWidth: 470, margin: "0 auto",
            background: T.papel, borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontSize: 12, color: T.suave, marginBottom: 4 }}>
          {pendientes.length > 1 ? `Tarjeta ${i + 1} de ${pendientes.length}` : "Actualizá tu tarjeta"}
        </div>
        <div style={{ fontSize: 19, fontWeight: 660, marginBottom: 8 }}>Cerró {m.nombre}</div>
        <div style={{ fontSize: 13.5, color: T.suave, lineHeight: 1.6, marginBottom: 18 }}>
          Los bancos no cierran un día fijo: mueven la fecha todos los meses.
          Abrí tu último resumen y copiá <b>Próximo cierre</b> y <b>Próximo vencimiento</b>.
          Sin eso, las compras nuevas pueden caer en el mes equivocado.
        </div>

        {ult && (
          <div style={{ padding: "11px 13px", background: T.card, borderRadius: 11,
                        fontSize: 12.5, color: T.suave, marginBottom: 16, lineHeight: 1.6 }}>
            El último que cargaste cerró el <b>{ult.cierre.split("-").reverse().join("/")}</b> y
            venció el <b>{ult.vto.split("-").reverse().join("/")}</b>.
          </div>
        )}

        <label className="lbl">Próximo cierre</label>
        <input type="date" value={cierre} onChange={(e) => setCierre(e.target.value)} />
        {cierre && <div style={{ fontSize: 12, color: T.tenue, marginTop: 5 }}>Cae {dia(cierre)}</div>}

        <label className="lbl" style={{ marginTop: 15 }}>Próximo vencimiento</label>
        <input type="date" value={vto} onChange={(e) => setVto(e.target.value)} />
        {vto && <div style={{ fontSize: 12, color: T.tenue, marginTop: 5 }}>Cae {dia(vto)}</div>}

        {vto && cierre && vto < cierre && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: T.rojoBg, borderRadius: 10,
                        fontSize: 12.5, color: T.rojo }}>
            El vencimiento tiene que ser posterior al cierre.
          </div>
        )}

        <div style={{ fontSize: 12, color: T.suave, marginTop: 14, lineHeight: 1.5 }}>
          Vienen precargados con una estimación a partir de tu último ciclo, respetando el día
          de la semana. Si tu resumen dice otra cosa, corregilo.
        </div>

        <button className="btn" style={{ marginTop: 18, opacity: vto >= cierre ? 1 : 0.45 }}
          onClick={() => guardar(false)}>
          {i + 1 < pendientes.length ? "Confirmo y sigo" : "Confirmo estas fechas"}
        </button>
        <button className="btn ghost" style={{ marginTop: 10, fontSize: 14.5, fontWeight: 500 }}
          onClick={() => guardar(true)}>
          No sé las fechas, usá la estimación
        </button>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>
          Si elegís la estimación, la app sigue funcionando y te queda marcada como provisoria
          hasta que la confirmes con el resumen en la mano.
        </div>
        <button onClick={onPostergar}
          style={{ marginTop: 14, width: "100%", fontSize: 13, color: T.suave }}>
          Ahora no
        </button>
      </div>
    </div>
  );
}

/* ===================== FORMULARIO DE MOVIMIENTO ===================== */
function FormMov({ inicial, medios, personas, onGuardar, onBorrar, onCerrar, tcRef = 1550, disponible = null }) {
  const esNuevo = !inicial?.id;
  const [f, setF] = useState(() => ({
    tipo: "gasto",
    detalle: "",
    monto: "",
    montoUsd: "",
    moneda: "ARS",
    medio: "icbc",
    fecha: hoyISO(),
    tcCompra: "",
    categoria: "",
    cuotasRestantes: "",
    montoArs: "",
    ladoAhorro: "usd",
    cuotas: 1,
    recurrente: false,
    meses: [],
    persona: "",
    pct: 50,
    pagadoPor: "yo",
    excepcional: false,
    ...inicial,
    monto: inicial?.monto ?? "",
    montoUsd: inicial?.montoUsd ?? "",
    pct: inicial?.pct != null ? Math.round(inicial.pct * 100) : 50,
  }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const tcUsar = +f.tcCompra || tcRef;
  const usdFinal = f.tipo === "ahorro"
    ? ((f.ladoAhorro || "usd") === "usd" ? +f.montoUsd || 0 : (+f.montoArs || 0) / (tcUsar || 1))
    : 0;
  const pesosFinal = usdFinal * tcUsar;

  const valorOk = f.tipo === "ahorro" ? usdFinal > 0
                : f.moneda === "USD" ? +f.montoUsd > 0 : +f.monto > 0;
  const valido = valorOk && f.detalle.trim();

  // Cuanto sale de la caja en la PRIMERA cuota, para avisar si no alcanza
  const saleAhora = (() => {
    if (f.recurrente) return 0;
    const n = Math.max(1, +f.cuotas || 1);
    if (f.tipo === "ahorro") return pesosFinal / n;
    if (f.tipo === "ingreso") return 0;
    const base = f.moneda === "USD" ? (+f.montoUsd || 0) * tcRef : +f.monto || 0;
    const mio = f.pagadoPor === "otro" ? base * ((+f.pct || 0) / 100) : base;
    return mio / n;
  })();
  const cae = f.recurrente ? null : mesDePago(f.fecha || hoyISO(), f.medio, medios);
  const noAlcanza = disponible != null && cae === mesDeHoy() && saleAhora > disponible;

  const mesPago = useMemo(() => {
    if (f.recurrente) return null;
    if (f.mesInicio && !f.fecha) return f.mesInicio;
    if (f.pagadoPor === "otro") return (f.fecha || hoyISO()).slice(0, 7);
    return mesDePago(f.fecha, f.medio, medios);
  }, [f.fecha, f.medio, f.recurrente, f.mesInicio, f.pagadoPor, medios]);

  const guardar = () => {
    if (!valido) return;
    if (noAlcanza && !confirm(
      `Esto son ${plata(saleAhora)} y hoy te quedan libres ${plata(disponible)}. ` +
      `Vas a quedar en ${plata(disponible - saleAhora)}. ¿Lo cargo igual?`)) return;
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
    if (f.tipo === "gasto" && f.categoria) mv.categoria = f.categoria;
    if (f.recurrente && +f.cuotasRestantes > 0)
      mv.hasta = sumaMes(mesDeHoy(), +f.cuotasRestantes - 1);
    if (f.pagadoPor === "otro") mv.pagadoPor = "otro";
    if (f.tipo === "ahorro") {
      mv.montoUsd = Math.round(usdFinal * 100) / 100;
      mv.tcCompra = tcUsar;
      mv.moneda = "USD";
      delete mv.monto;
    }
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

      {noAlcanza && (
        <div style={{ padding: "12px 16px", background: T.rojoBg, borderBottom: `1px solid ${T.linea}` }}>
          <div style={{ fontSize: 13, color: T.rojo, lineHeight: 1.55 }}>
            <b>Ojo:</b> esto son {plata(saleAhora)} y hoy te quedan libres {plata(disponible)}.
            Te faltarían {plata(saleAhora - disponible)}.
          </div>
        </div>
      )}
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
          {[["gasto", "Gasto"], ["ingreso", "Ingreso"], ["ahorro", "Compra de dólares"]].map(([v, n]) => (
            <button key={v} className={"chip" + (f.tipo === v ? " on" : "")}
              onClick={() => { set("tipo", v); if (v === "ahorro") { set("moneda", "USD"); set("medio", "efectivo"); } }}>
              {n}
            </button>
          ))}
        </div>
        {f.tipo === "ahorro" && (
          <div style={{ marginBottom: 16, padding: "11px 13px", background: T.ambarBg,
                        borderRadius: 11, fontSize: 12.5, lineHeight: 1.55 }}>
            No es un gasto: la plata sale de tu caja en pesos y entra a tus reservas en dólares.
            Tu patrimonio no cambia.
          </div>
        )}

        {f.tipo === "ahorro" ? (
          <>
            <label className="lbl">A qué precio comprás el dólar</label>
            <input className="num" inputMode="decimal" value={f.tcCompra || ""}
              onChange={(e) => set("tcCompra", e.target.value.replace(/[^\d]/g, ""))}
              placeholder={String(Math.round(tcRef))} style={{ textAlign: "right" }} />

            <label className="lbl" style={{ marginTop: 15 }}>¿Cómo lo querés poner?</label>
            <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
              {[["usd", "Cuántos dólares"], ["ars", "Cuántos pesos"]].map(([v, n]) => (
                <button key={v} className={"chip" + ((f.ladoAhorro || "usd") === v ? " on" : "")}
                  onClick={() => set("ladoAhorro", v)}>{n}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="num" inputMode="decimal"
                value={(f.ladoAhorro || "usd") === "usd" ? f.montoUsd : f.montoArs}
                onChange={(e) => set((f.ladoAhorro || "usd") === "usd" ? "montoUsd" : "montoArs",
                                     e.target.value.replace(/[^\d.]/g, ""))}
                style={{ fontSize: 26, fontWeight: 600, textAlign: "right" }}
              />
              <div className="chip on" style={{ minWidth: 62, display: "flex", alignItems: "center",
                                                justifyContent: "center" }}>
                {(f.ladoAhorro || "usd") === "usd" ? "U$S" : "$"}
              </div>
            </div>
            {usdFinal > 0 && tcUsar > 0 && (
              <div style={{ marginTop: 11, padding: "11px 13px", background: T.papel, borderRadius: 11,
                            fontSize: 13, lineHeight: 1.6 }}>
                Salen <b className="num">{plata(pesosFinal)}</b> de tu caja y entran{" "}
                <b className="num">U$S {usdFinal.toFixed(2).replace(/\.00$/, "")}</b> a tus reservas.
              </div>
            )}
          </>
        ) : (
          <>
            <label className="lbl">
              {!f.recurrente && +f.cuotas > 1 ? "Monto total de la compra" : "Monto"}
            </label>
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
          </>
        )}


        <label className="lbl" style={{ marginTop: 16 }}>Detalle</label>
        <input value={f.detalle} onChange={(e) => set("detalle", e.target.value)} placeholder="Comercio o concepto" />

        {f.tipo === "gasto" && (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>¿Quién lo puso?</label>
            <div style={{ display: "flex", gap: 7 }}>
              <button className={"chip" + (f.pagadoPor === "yo" ? " on" : "")} onClick={() => set("pagadoPor", "yo")}>
                Yo
              </button>
              <button className={"chip" + (f.pagadoPor === "otro" ? " on" : "")} onClick={() => set("pagadoPor", "otro")}>
                Otra persona
              </button>
            </div>
            {f.pagadoPor === "otro" && (
              <div style={{ marginTop: 9, fontSize: 12.5, color: T.suave, lineHeight: 1.5 }}>
                Cargá el importe TOTAL del gasto y abajo el porcentaje que te toca a vos. Se lo transferís
                en el mes que elijas, no cuando cierra su tarjeta.
              </div>
            )}
          </>
        )}

        {f.pagadoPor === "yo" && (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>Medio de pago</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {medios.map((m) => (
                <button key={m.id} className={"chip" + (f.medio === m.id ? " on" : "")} onClick={() => set("medio", m.id)}>
                  {m.corto}
                </button>
              ))}
            </div>
          </>
        )}

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
            <label className="lbl" style={{ marginTop: 16 }}>
              {f.pagadoPor === "otro" ? "Cuándo empezás a pagarle" : "Fecha de la compra"}
            </label>
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
                {f.pagadoPor === "otro" ? "Le transferís desde " : "Primera cuota en "}
                <b>{etiqMesLargo(mesPago)}</b>
                {+f.cuotas > 1 && (
                  <> · cuota de <b>{plata((f.moneda === "USD" ? +f.montoUsd * 1550 : +f.monto) / +f.cuotas)}</b></>
                )}
                {+f.cuotas > 1 && <> y la última en <b>{etiqMesLargo(sumaMes(mesPago, +f.cuotas - 1))}</b></>}.
                {idxMes(mesPago) < idxMes(mesDeHoy()) && (
                  <div style={{ marginTop: 6, color: T.rojo }}>
                    Ojo: ese mes ya pasó, así que no va a aparecer en la proyección.
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>¿Cuántas cuotas le quedan? (vacío = no termina)</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              {[6, 12, 24, 36].map((n) => (
                <button key={n} className={"chip" + (+f.cuotasRestantes === n ? " on" : "")}
                  onClick={() => set("cuotasRestantes", n)}>{n}</button>
              ))}
              <input className="num" inputMode="numeric" value={f.cuotasRestantes}
                onChange={(e) => set("cuotasRestantes", e.target.value.replace(/\D/g, ""))}
                placeholder="—" style={{ width: 74, textAlign: "center", padding: "8px 6px" }} />
            </div>
            {+f.cuotasRestantes > 0 && (
              <div style={{ fontSize: 12.5, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
                Última en <b>{etiqMesLargo(sumaMes(mesDeHoy(), +f.cuotasRestantes - 1))}</b>.
                Sirve para préstamos: así la app sabe cuándo dejás de pagarlo.
              </div>
            )}

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

        {f.tipo === "gasto" && (
          <>
            <label className="lbl" style={{ marginTop: 18 }}>Categoría</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIAS.map((c) => (
                <button key={c} className={"chip sm" + (f.categoria === c ? " on" : "")}
                  onClick={() => set("categoria", f.categoria === c ? "" : c)}>{c}</button>
              ))}
            </div>
          </>
        )}

        <label className="lbl" style={{ marginTop: 18 }}>
          {f.pagadoPor === "otro" ? "Se lo debo a" : "Lo comparto con"}
        </label>
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
            <span style={{ fontSize: 13.5, color: T.suave }}>
              {f.pagadoPor === "otro" ? "Me toca el" : "Recupero el"}
            </span>
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

function Hoy({ cfg, setCfg, filas, medios, movs, onAbrirAjustes, onAjustar, coti, estadoCoti, onRefrescar, tcVivo,
               historial = [], cerradas = [], revisadas = {}, onRevisar,
               estimados = [], onAbrirMedios }) {
  const [editSaldo, setEditSaldo] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [valor, setValor] = useState("");
  const [verSaldados, setVerSaldados] = useState(null);
  const [agrupar, setAgrupar] = useState("medio");
  const [verHistorial, setVerHistorial] = useState(false);
  const fin = filas[filas.length - 1];
  const mesAct = mesDeHoy();
  const mesEnCurso = filas[0] && filas[0].mk === mesAct ? filas[0] : null;
  const ahorroMes = mesEnCurso ? mesEnCurso.ahorro : 0;
  const pendiente = mesEnCurso ? mesEnCurso.egresos - mesEnCurso.ingresos : 0;
  const gastoPend = pendiente - ahorroMes;

  const mesCard = (f, cerrado) => {

          const open = abierta === f.mk;
          const max = Math.max(...filas.map((x) => Math.max(x.ingresos, x.egresos)), 1);
          return (
            <div key={f.mk} className="card" style={{ marginBottom: 9, overflow: "hidden" }}>
              <button onClick={() => setAbierta(open ? null : f.mk)} style={{ width: "100%", textAlign: "left", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {etiqMesLargo(f.mk)}{f.mk === mesAct ? " · lo que falta" : cerrado ? " · cerrado" : ""}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 2 }}>
                      {f.mk === mesAct ? "este mes, en curso"
                        : cerrado ? "ya pasó"
                        : `cobrado el 28 de ${etiqMes(sumaMes(f.mk, -1))}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 16.5, fontWeight: 640, color: f.resultado < 0 ? T.rojo : T.verde }}>
                      {f.resultado > 0 ? "+" : ""}{corta(f.resultado)}
                    </div>
                    {!cerrado && (
                      <div className="num" style={{ fontSize: 12, color: f.saldo < 0 ? T.rojo : T.tenue, marginTop: 2 }}>
                        queda {corta(f.saldo)}
                      </div>
                    )}
                  </div>
                </div>
                {(f.ingresos > 0 || f.egresos > 0) && (
                  <div style={{ display: "grid", gap: 4, marginTop: 9 }}>
                    {[[f.ingresos, T.verde], [f.egresos, T.rojo]].map(([v, c], i) => (
                      <div key={i} style={{ height: 6, background: T.papel, borderRadius: 3, overflow: "hidden" }}>
                        <div className="grow" style={{ width: `${(v / max) * 100}%`, height: "100%", background: c }} />
                      </div>
                    ))}
                  </div>
                )}
              </button>

              {open && (
                <div style={{ borderTop: `1px solid ${T.linea}` }}>
                  {(f.ingresos || f.tarjetas || f.efvo) > 0 && (
                  <div style={{ padding: "13px 15px", fontSize: 13.5 }}>
                    {[["Ingresos", f.ingresos],
                      ["Tarjetas", -f.tarjetas],
                      ["Efectivo y débito", -(f.efvo - f.totalDeudas - f.ahorro)],
                      ["A otras personas", -f.totalDeudas],
                      ["Compra de dólares", -f.ahorro]]
                      .filter(([, v]) => v)
                      .map(([n, v]) => (
                        <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                          <span style={{ color: T.suave }}>{n}</span>
                          <span className="num" style={{ color: v < 0 ? T.rojo : T.verde }}>{plata(v)}</span>
                        </div>
                      ))}
                    {f.ahorro > 0 && (
                      <div style={{ marginTop: 10, padding: "9px 11px", background: T.ambarBg,
                                    borderRadius: 9, fontSize: 12.5, lineHeight: 1.5 }}>
                        De ese total, <span className="num">{plata(f.ahorro)}</span> no es gasto:
                        son <span className="num">U$S {Math.round(f.usdComprados)}</span> que sumás a tus reservas.
                        {f.mk === mesAct && " Si ya los compraste, tocá la compra y marcá \u201cYa la hice\u201d."}
                      </div>
                    )}
                    {f.excepcional > 0 && (
                      <div style={{ marginTop: 10, padding: "9px 11px", background: T.ambarBg,
                                    borderRadius: 9, fontSize: 12.5 }}>
                        Incluye <span className="num">{plata(f.excepcional)}</span> de gastos excepcionales.
                      </div>
                    )}
                  </div>
                  )}

                  {(() => {
                    const pend = f.items.filter((i) => !i.saldado);
                    const sald = f.items.filter((i) => i.saldado);
                    const verS = verSaldados === f.mk;

                    const fila = (it) => {
                      const { mv, monto, cuota, ingreso, saldado, base } = it;
                      // it.ahorro / it.usd se usan mas abajo
                      const clave = f.mk + "|" + mv.id;
                      const abierto = editItem === clave;
                      const ajustado = !!(cfg.ajustes && cfg.ajustes[f.mk] &&
                        Object.prototype.hasOwnProperty.call(cfg.ajustes[f.mk], mv.id));
                      return (
                        <div key={mv.id} style={{ background: abierto ? T.papel : "transparent",
                                                  borderRadius: abierto ? 10 : 0,
                                                  padding: abierto ? "2px 10px 10px" : "0" }}>
                          <button
                            onClick={() => { setEditItem(abierto ? null : clave);
                                             setValor(String(Math.round(saldado ? base : monto))); }}
                            style={{ width: "100%", display: "flex", justifyContent: "space-between",
                                     alignItems: "center", gap: 10, padding: "8px 0", textAlign: "left" }}
                          >
                            <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap", color: saldado ? T.tenue : T.tinta }}>
                              {mv.detalle}{cuota && mv.cuotas > 1 ? ` ${cuota}/${mv.cuotas}` : ""}
                              {ajustado && !saldado ? "  ✎" : ""}
                            </span>
                            <span className="num" style={{ fontSize: 13, flexShrink: 0,
                                  color: saldado ? T.tenue : ingreso ? T.verde : ajustado ? T.ambar : T.tinta }}>
                              {saldado ? (ingreso ? "cobrado" : "pagado")
                                       : (ingreso ? "+" : "") + corta(monto)}
                            </span>
                          </button>
                          {abierto && (
                            <div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                  className="num" inputMode="decimal" value={valor}
                                  onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ""))}
                                  style={{ textAlign: "right", padding: "9px 11px" }}
                                />
                                <button
                                  onClick={() => { onAjustar(f.mk, mv.id, +valor || 0); setEditItem(null); }}
                                  style={{ padding: "10px 15px", borderRadius: 9, background: T.tinta,
                                           color: "#fff", fontSize: 13.5, fontWeight: 600, flexShrink: 0 }}
                                >Guardar</button>
                              </div>
                              <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                                {!saldado && (
                                  <button className="chip sm"
                                    onClick={() => {
                                      // Marcar como hecho mueve la caja: un gasto la baja, un ingreso la sube.
                                      onAjustar(f.mk, mv.id, 0, {
                                        usd: it.ahorro ? (it.usd || 0) : 0,
                                        pesos: ingreso ? -(monto || 0) : (monto || 0),
                                      });
                                      setEditItem(null);
                                    }}>
                                    {it.ahorro ? "Ya la hice" : ingreso ? "Ya lo cobré" : "Ya lo pagué"}
                                  </button>
                                )}
                                {!saldado && (
                                  <div style={{ width: "100%", fontSize: 12, color: T.suave,
                                                marginTop: 6, lineHeight: 1.5 }}>
                                    {it.ahorro
                                      ? `Al marcarla descuento ${plata(monto)} de tu caja y sumo U$S ${Math.round(it.usd)} a tus reservas.`
                                      : ingreso
                                      ? `Al marcarlo sumo ${plata(monto)} a tu caja.`
                                      : `Al marcarlo descuento ${plata(monto)} de tu caja.`}
                                  </div>
                                )}
                                {ajustado && (
                                  <button className="chip sm"
                                    onClick={() => {
                                      onAjustar(f.mk, mv.id, null);
                                      setEditItem(null);
                                    }}>
                                    Volver al estimado
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    const grupos = [];
                    const meter = (titulo, sub, arr, color) => {
                      if (arr.length) grupos.push({ titulo, sub, arr, color,
                        total: arr.reduce((a, b) => a + b.monto, 0) });
                    };
                    if (agrupar === "categoria") {
                      meter("Por cobrar", "", pend.filter((i) => i.ingreso), T.verde);
                      const gastos = pend.filter((i) => !i.ingreso);
                      const cats = [...new Set(gastos.map((i) => i.mv.categoria || "Sin categoría"))]
                        .sort((a, b) =>
                          gastos.filter((i) => (i.mv.categoria || "Sin categoría") === b).reduce((x, y) => x + y.monto, 0) -
                          gastos.filter((i) => (i.mv.categoria || "Sin categoría") === a).reduce((x, y) => x + y.monto, 0));
                      cats.forEach((c) => meter(c, "", gastos.filter((i) => (i.mv.categoria || "Sin categoría") === c)));
                    } else {
                      meter("Por cobrar", "", pend.filter((i) => i.ingreso), T.verde);
                      medios.filter((m) => m.id !== "efectivo").forEach((m) =>
                        meter(m.nombre, "vence el " + m.vto,
                              pend.filter((i) => !i.ingreso && !i.deuda && i.mv.medio === m.id)));
                      meter("Efectivo y débito", "",
                            pend.filter((i) => !i.ingreso && !i.deuda && !i.ahorro && i.mv.medio === "efectivo"));
                      meter("Compra de dólares", "no es gasto", pend.filter((i) => i.ahorro), T.ambar);
                      [...new Set(pend.filter((i) => i.deuda).map((i) => i.mv.persona))].forEach((per) =>
                        meter("Le transferís a " + per, "", pend.filter((i) => i.deuda && i.mv.persona === per)));
                    }

                    return (
                      <>
                        {pend.length > 0 && (
                          <div style={{ borderTop: `1px solid ${T.linea}`, padding: "10px 15px",
                                        display: "flex", gap: 7, alignItems: "center" }}>
                            <span style={{ fontSize: 11.5, color: T.tenue }}>Ver por</span>
                            {[["medio", "medio de pago"], ["categoria", "categoría"]].map(([v, n]) => (
                              <button key={v} className={"chip sm" + (agrupar === v ? " on" : "")}
                                onClick={() => setAgrupar(v)}>{n}</button>
                            ))}
                          </div>
                        )}
                        {grupos.map((g) => (
                          <div key={g.titulo} style={{ borderTop: `1px solid ${T.linea}`, padding: "11px 15px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between",
                                          alignItems: "baseline", marginBottom: 4 }}>
                              <span style={{ fontSize: 11.5, letterSpacing: ".03em", color: T.tenue,
                                             textTransform: "uppercase" }}>
                                {g.titulo}{g.sub ? " · " + g.sub : ""}
                              </span>
                              <span className="num" style={{ fontSize: 13, fontWeight: 620,
                                    color: g.color || T.tinta }}>{plata(g.total)}</span>
                            </div>
                            {g.arr.map(fila)}
                          </div>
                        ))}

                        {sald.length > 0 && (
                          <div style={{ borderTop: `1px solid ${T.linea}`, padding: "11px 15px" }}>
                            <button
                              onClick={() => setVerSaldados(verS ? null : f.mk)}
                              style={{ width: "100%", display: "flex", justifyContent: "space-between",
                                       alignItems: "center", fontSize: 12.5, color: T.suave, padding: "3px 0" }}
                            >
                              <span>Ya saldado · {sald.length} {sald.length === 1 ? "movimiento" : "movimientos"}</span>
                              <span style={{ color: T.ambar, fontWeight: 600 }}>{verS ? "Ocultar" : "Ver"}</span>
                            </button>
                            {verS && <div style={{ marginTop: 6 }}>{sald.map(fila)}</div>}
                          </div>
                        )}

                        {!pend.length && (
                          <div style={{ padding: "0 15px 14px", fontSize: 12.5, color: T.suave, lineHeight: 1.5 }}>
                            No queda nada por pagar ni por cobrar en este mes.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
  };
  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div className="card" style={{ padding: 17 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: T.suave }}>
            {pendiente > 0 ? "Te queda libre" : "Plata disponible hoy"}
          </span>
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
                color: cfg.saldoHoy - pendiente < 0 ? T.rojo : T.tinta }}>
            {plata(cfg.saldoHoy - pendiente)}
          </div>
        )}
        {pendiente > 0 ? (
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${T.linea}` }}>
            {[["En la cuenta", cfg.saldoHoy, T.suave],
              ...(gastoPend > 0 ? [["Te falta pagar este mes", -gastoPend, T.rojo]] : []),
              ...(ahorroMes > 0 ? [["Vas a pasar a dólares", -ahorroMes, T.ambar]] : [])]
              .map(([n, v, c]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: T.suave }}>{n}</span>
                  <span className="num" style={{ color: c }}>{plata(v)}</span>
                </div>
              ))}
            {cfg.saldoHoy - pendiente < 0 && (
              <div style={{ marginTop: 11, padding: "10px 12px", background: T.rojoBg,
                            borderRadius: 10, fontSize: 12.5, color: T.rojo, lineHeight: 1.55 }}>
                Lo que tenés pendiente supera lo que hay en la cuenta. Te faltan{" "}
                <b className="num">{plata(pendiente - cfg.saldoHoy)}</b>.
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.suave, marginTop: 9, lineHeight: 1.5 }}>
            No te queda nada pendiente este mes.
          </div>
        )}
      </div>

      {(cfg.reservasUsd > 0 || filas.some((x) => x.usdComprados > 0)) && (
        <div className="card" style={{ padding: 15, marginTop: 12 }}>
          <div style={{ fontSize: 13, color: T.suave, marginBottom: 8 }}>
            Patrimonio al cierre de {etiqMesLargo(fin.mk)}
          </div>
          {[["Caja en pesos", plata(fin.saldo)],
            ["Reservas", "U$S " + Math.round(fin.reservasUsd).toLocaleString("es-AR")],
            ["Total valuado a " + plata(cfg.tc), plata(fin.patrimonio)]].map(([n, v], i) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0",
                                  borderTop: i === 2 ? `1px solid ${T.linea}` : "none",
                                  marginTop: i === 2 ? 6 : 0, paddingTop: i === 2 ? 9 : 4 }}>
              <span style={{ fontSize: 13.5, color: i === 2 ? T.tinta : T.suave,
                             fontWeight: i === 2 ? 620 : 400 }}>{n}</span>
              <span className="num" style={{ fontSize: i === 2 ? 15 : 13.5, fontWeight: i === 2 ? 640 : 400 }}>{v}</span>
            </div>
          ))}
          {cfg.tcAuto && (
            <button
              onClick={onRefrescar}
              style={{ marginTop: 11, width: "100%", display: "flex", justifyContent: "space-between",
                       alignItems: "center", fontSize: 12, color: T.suave, paddingTop: 10,
                       borderTop: `1px solid ${T.linea}` }}
            >
              <span>
                {estadoCoti === "buscando" ? "Buscando cotización…"
                 : estadoCoti === "error" && !coti ? "No pude traer la cotización"
                 : coti ? `Dólar ${coti.fuente} · compra ${plata(coti.compra)} · venta ${plata(coti.venta)}`
                 : "Cotización en vivo"}
              </span>
              <span style={{ color: T.ambar, fontWeight: 600 }}>Actualizar</span>
            </button>
          )}
        </div>
      )}

      {estimados.length > 0 && (
        <button onClick={onAbrirMedios} className="card"
          style={{ width: "100%", textAlign: "left", padding: 14, marginTop: 12,
                   background: T.ambarBg, borderColor: "transparent" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
            {estimados.length === 1 ? "Hay una fecha provisoria" : `Hay ${estimados.length} fechas provisorias`}
          </div>
          <div style={{ fontSize: 12.5, color: T.suave, lineHeight: 1.55 }}>
            {estimados.map((e) => e.m.nombre).filter((v, i, a) => a.indexOf(v) === i).join(", ")}.
            Cuando tengas el resumen a mano, confirmalas para que las cuotas caigan en el mes correcto.
          </div>
        </button>
      )}

      {cerradas.filter((c) => !revisadas[c.id + "|" + c.paga]).map((c) => (
        <div key={c.id} className="card" style={{ padding: 15, marginTop: 12,
              background: T.ambarBg, borderColor: "transparent" }}>
          <div style={{ fontSize: 14, fontWeight: 620, marginBottom: 5 }}>
            Cerró {c.nombre}
          </div>
          <div style={{ fontSize: 13, color: T.suave, lineHeight: 1.6 }}>
            El resumen que vas a pagar el {c.vto} de {etiqMesLargo(c.paga)} ya quedó definido.
            Es buen momento para abrir ese mes y poner los montos reales.
          </div>
          <button
            onClick={() => onRevisar(c.id + "|" + c.paga)}
            style={{ marginTop: 11, fontSize: 13, color: T.ambar, fontWeight: 600 }}
          >
            Listo, ya lo revisé
          </button>
        </div>
      ))}

      {!movs.length && (
        <div className="card" style={{ padding: 18, marginTop: 16, background: T.ambarBg, borderColor: "transparent" }}>
          <div style={{ fontSize: 15, fontWeight: 620, marginBottom: 6 }}>Empecemos</div>
          <div style={{ fontSize: 13.5, color: T.suave, lineHeight: 1.6 }}>
            Todavía no cargaste nada. Tocá el <b>+</b> de abajo a la derecha y cargá primero tu sueldo,
            marcándolo como ingreso que se repite todos los meses. Después sumá tus gastos fijos y
            lo que tengas en cuotas.
          </div>
        </div>
      )}

      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15.5, fontWeight: 620 }}>Flujo proyectado</span>
        <button onClick={onAbrirAjustes} style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}>Ajustes</button>
      </div>

      <div style={{ fontSize: 12, color: T.suave, marginTop: 5, lineHeight: 1.5 }}>
        Arranca en {etiqMesLargo(cfg.desdeMes)}. Al marcar algo como pagado o cobrado, se ajusta tu caja.
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

      {(cfg.horizonte > 1 || Math.round(fin.saldo) !== Math.round(cfg.saldoHoy - pendiente)) && (
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
      )}

      <div style={{ marginTop: 16 }}>
        {filas.map((f) => mesCard(f, false))}
      </div>

      {historial.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setVerHistorial(!verHistorial)}
            style={{ width: "100%", padding: "13px 0", fontSize: 13.5, color: T.ambar, fontWeight: 600 }}
          >
            {verHistorial ? "Ocultar los meses cerrados" : "Ver los meses que ya cerraron"}
          </button>
          {verHistorial && (
            <>
              <div style={{ fontSize: 12, color: T.suave, lineHeight: 1.5, marginBottom: 11 }}>
                Lo que pasó en los últimos {historial.length} meses, según lo que tenés cargado.
                No muestro saldo porque solo conozco el de hoy.
              </div>
              {historial.slice().reverse().map((f) => mesCard(f, true))}
            </>
          )}
        </div>
      )}
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
    else if (filtro === "dolares") l = l.filter((m) => m.tipo === "ahorro");
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
    if (m.recurrente) {
      p.push(m.meses?.length ? `solo ${m.meses.map((i) => MESN[i - 1]).join(", ")}` : "todos los meses");
      if (m.hasta) p.push(`hasta ${etiqMes(m.hasta)}`);
    }
    else if ((m.cuotas || 1) > 1) p.push(`${m.cuotas} cuotas desde ${etiqMes(m.mesInicio)}`);
    else p.push(etiqMes(m.mesInicio));
    if (m.persona) p.push(`${m.persona} ${Math.round(m.pct * 100)}%`);
    if (m.categoria) p.push(m.categoria);
    return p.join(" · ");
  };

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" />

      <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 11, paddingBottom: 3 }}>
        {[["todos", "Todos"], ["ingresos", "Ingresos"], ["recurrentes", "Fijos"], ["cuotas", "En cuotas"],
          ["compartidos", "Compartidos"], ["dolares", "Dólares"],
          ...medios.map((m) => [m.id, m.corto])].map(([v, n]) => (
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
          const total = m.moneda === "USD" ? (m.montoUsd || 0) * cfg.tc : m.monto || 0;
          const nc = m.recurrente ? 1 : (m.cuotas || 1);
          const valor = total / nc;
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
                {nc > 1 && (
                  <div className="num" style={{ fontSize: 11, color: T.tenue }}>de {corta(total)}</div>
                )}
                {m.moneda === "USD" && nc === 1 && (
                  <div className="num" style={{ fontSize: 11, color: T.tenue }}>U$S {m.montoUsd}</div>
                )}
              </div>
            </button>
          );
        })}
        {!lista.length && (
          <div style={{ textAlign: "center", color: T.tenue, fontSize: 14, padding: 30, lineHeight: 1.6 }}>
            {movs.length ? "No hay movimientos con ese filtro."
                         : "Todavía no cargaste ningún movimiento. Tocá el + para empezar."}
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

/* ===================== PANTALLA: PERSONAS ===================== */
function Personas({ filas }) {
  const [abierta, setAbierta] = useState(null);
  const por = {};
  const tocar = (p) => (por[p] = por[p] || { deben: 0, debo: 0, meses: {}, itDeben: {}, itDebo: {} });

  filas.forEach((f) => {
    f.reint.forEach((r) => {
      const d = tocar(r.persona);
      d.deben += r.monto;
      d.meses[f.mk] = (d.meses[f.mk] || 0) + r.monto;
      d.itDeben[r.detalle] = (d.itDeben[r.detalle] || 0) + r.monto;
    });
    f.deudas.forEach((r) => {
      const d = tocar(r.persona);
      d.debo += r.monto;
      d.meses[f.mk] = (d.meses[f.mk] || 0) - r.monto;
      d.itDebo[r.detalle] = (d.itDebo[r.detalle] || 0) + r.monto;
    });
  });

  const gente = Object.keys(por).sort(
    (a, b) => Math.abs(por[b].deben - por[b].debo) - Math.abs(por[a].deben - por[a].debo)
  );

  if (!gente.length)
    return (
      <div style={{ padding: 30, textAlign: "center", color: T.suave, fontSize: 14.5, lineHeight: 1.6 }}>
        Todavía no compartís ningún gasto.<br />
        Cargá uno y elegí con quién.
      </div>
    );

  const totalNeto = gente.reduce((a, p) => a + por[p].deben - por[p].debo, 0);

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div className="card" style={{ padding: 15, marginBottom: 14,
                                     background: totalNeto < 0 ? T.rojoBg : T.ambarBg, borderColor: "transparent" }}>
        <div style={{ fontSize: 13, color: T.suave }}>
          {totalNeto < 0 ? "En total le debés a otros" : "En total te deben"}
        </div>
        <div className="num" style={{ fontSize: 27, fontWeight: 640, marginTop: 2,
                                      color: totalNeto < 0 ? T.rojo : T.verde }}>
          {plata(Math.abs(totalNeto))}
        </div>
        <div style={{ fontSize: 12, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
          Neto de {filas.length} {filas.length === 1 ? "mes" : "meses"}, ya descontando lo que va en las dos direcciones.
        </div>
      </div>

      {gente.map((p) => {
        const d = por[p];
        const neto = d.deben - d.debo;
        const open = abierta === p;
        return (
          <div key={p} className="card" style={{ marginBottom: 11, overflow: "hidden" }}>
            <button onClick={() => setAbierta(open ? null : p)} style={{ width: "100%", textAlign: "left", padding: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 16.5, fontWeight: 620 }}>{p}</span>
                <span className="num" style={{ fontSize: 16.5, fontWeight: 620, color: neto < 0 ? T.rojo : T.verde }}>
                  {neto < 0 ? "−" : "+"}{plata(Math.abs(neto))}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: T.suave, marginTop: 3 }}>
                {neto < 0 ? "le transferís vos" : "te transfiere"}
              </div>

              {d.deben > 0 && d.debo > 0 && (
                <div style={{ display: "flex", gap: 14, marginTop: 11, fontSize: 12.5 }}>
                  <span style={{ color: T.verde }}>te debe {corta(d.deben)}</span>
                  <span style={{ color: T.rojo }}>le debés {corta(d.debo)}</span>
                </div>
              )}
            </button>

            {open && (
              <div style={{ borderTop: `1px solid ${T.linea}`, padding: "12px 15px" }}>
                {Object.keys(d.itDebo).length > 0 && (
                  <>
                    <div style={{ fontSize: 11.5, color: T.tenue, marginBottom: 5 }}>LE DEBÉS</div>
                    {Object.entries(d.itDebo).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
                      <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", gap: 12 }}>
                        <span style={{ color: T.suave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
                        <span className="num" style={{ flexShrink: 0, color: T.rojo }}>{plata(v)}</span>
                      </div>
                    ))}
                  </>
                )}
                {Object.keys(d.itDeben).length > 0 && (
                  <>
                    <div style={{ fontSize: 11.5, color: T.tenue, margin: "11px 0 5px" }}>TE DEBE</div>
                    {Object.entries(d.itDeben).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
                      <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", gap: 12 }}>
                        <span style={{ color: T.suave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
                        <span className="num" style={{ flexShrink: 0, color: T.verde }}>{plata(v)}</span>
                      </div>
                    ))}
                  </>
                )}
                <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 13 }}>
                  {filas.map((f) => {
                    const v = d.meses[f.mk] || 0;
                    return (
                      <div key={f.mk} style={{ minWidth: 60, textAlign: "center", padding: "6px 4px",
                                               background: T.papel, borderRadius: 9 }}>
                        <div style={{ fontSize: 10.5, color: T.tenue }}>{etiqMes(f.mk)}</div>
                        <div className="num" style={{ fontSize: 12, fontWeight: 600, marginTop: 2,
                                                      color: v < 0 ? T.rojo : v > 0 ? T.verde : T.tenue }}>
                          {v ? (v < 0 ? "−" : "+") + corta(Math.abs(v)).replace("$", "$") : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== AJUSTES ===================== */
function Ajustes({ cfg, setCfg, medios, movs, onBorrarVarios, onReiniciar, onImportar, onAbrirMedios, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState(null);
  const [msg, setMsg] = useState("");

  const datos = () => JSON.stringify({ v: 2, cfg, movs }, null, 0);

  const exportar = async () => {
    const j = datos();
    setTexto(j); setModo("exp");
    try { await navigator.clipboard.writeText(j); setMsg("Copiado al portapapeles."); }
    catch (e) { setMsg("No pude copiarlo solo. Seleccioná el texto de abajo y copialo a mano."); }
    setTimeout(() => setMsg(""), 4000);
  };

  const bajarArchivo = () => {
    try {
      const b = new Blob([datos()], { type: "application/json" });
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u;
      a.download = `flujo-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 2000);
    } catch (e) { setMsg("No se pudo descargar. Usá el copiado."); }
  };

  const importar = () => {
    try {
      const d = JSON.parse(texto);
      if (!Array.isArray(d.movs)) throw new Error("formato");
      if (!confirm(`Vas a reemplazar todo por ${d.movs.length} movimientos. ¿Seguro?`)) return;
      onImportar(d);
      setMsg("Listo, datos restaurados.");
      setModo(null); setTexto("");
    } catch (e) {
      setMsg("Ese texto no es un respaldo válido. Fijate de haber copiado todo.");
    }
  };

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
        <div style={{ marginBottom: 18 }}>
          <label className="lbl">Cotización del dólar</label>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            <button className={"chip" + (cfg.tcAuto ? " on" : "")} onClick={() => setCfg({ ...cfg, tcAuto: true })}>
              En vivo
            </button>
            <button className={"chip" + (!cfg.tcAuto ? " on" : "")} onClick={() => setCfg({ ...cfg, tcAuto: false })}>
              La pongo yo
            </button>
          </div>
          {cfg.tcAuto ? (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                {FUENTES.map((f) => (
                  <button key={f.id} className={"chip sm" + ((cfg.tcFuente || "blue") === f.id ? " on" : "")}
                    onClick={() => setCfg({ ...cfg, tcFuente: f.id })}>{f.nombre}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
                {[["compra", "Compra"], ["venta", "Venta"]].map(([v, n]) => (
                  <button key={v} className={"chip sm" + ((cfg.tcLado || "compra") === v ? " on" : "")}
                    onClick={() => setCfg({ ...cfg, tcLado: v })}>{n}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: T.suave, lineHeight: 1.5 }}>
                Para valuar lo que tenés guardado conviene <b>compra</b>, que es lo que te pagarían si vendieras hoy.
                Los datos salen de DolarApi.com, que se actualiza solo.
              </div>
            </>
          ) : (
            num("tc", "Dólar ($ por U$S)", "Se usa para valuar tus reservas y convertir los consumos en dólares.")
          )}
        </div>
        {num("reservasUsd", "Dólares que ya tenés guardados",
             "Tus reservas de hoy, antes de lo que compres más adelante. Si algún número quedó raro, corregilo acá.")}
        {num("saldoHoy", "Plata en la cuenta hoy", "Lo mismo que editás desde la pantalla Hoy.")}
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

        <button className="btn ghost" style={{ marginBottom: 20, fontSize: 14.5, fontWeight: 500 }}
          onClick={onAbrirMedios}>
          Mis medios de pago ({medios.length})
        </button>

        <div style={{ marginTop: 8, marginBottom: 6, fontSize: 14.5, fontWeight: 620 }}>Respaldo</div>
        <div style={{ fontSize: 12, color: T.suave, marginBottom: 12, lineHeight: 1.5 }}>
          Tus datos viven solo en este navegador. Si no abrís la app por más de una semana, iOS puede borrarlos.
          Exportá cada tanto y guardate el texto en Notas.
        </div>
        <button className="btn ghost" style={{ marginBottom: 8, fontSize: 14.5, fontWeight: 500 }} onClick={exportar}>
          Exportar y copiar ({movs.length} movimientos)
        </button>
        <button className="btn ghost" style={{ marginBottom: 8, fontSize: 14.5, fontWeight: 500 }} onClick={bajarArchivo}>
          Descargar como archivo
        </button>
        <button
          className="btn ghost" style={{ marginBottom: 8, fontSize: 14.5, fontWeight: 500 }}
          onClick={() => { setModo(modo === "imp" ? null : "imp"); setTexto(""); }}
        >
          Importar un respaldo
        </button>
        {msg && (
          <div style={{ fontSize: 12.5, color: T.ambar, margin: "4px 0 10px", lineHeight: 1.5 }}>{msg}</div>
        )}
        {modo && (
          <div style={{ marginTop: 6 }}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={modo === "imp" ? "Pegá acá el respaldo" : ""}
              style={{ minHeight: 130, fontSize: 12, fontFamily: "ui-monospace, monospace" }}
            />
            {modo === "imp" && (
              <button className="btn" style={{ marginTop: 9 }} onClick={importar} disabled={!texto.trim()}>
                Restaurar estos datos
              </button>
            )}
          </div>
        )}

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
const TABS = [["hoy", "Hoy"], ["movs", "Movimientos"], ["sim", "Simular"], ["rep", "Personas"]];
const SEED_VERSION = 6;
const CFG_INI = { saldoHoy: 0, reservasUsd: 0, tcAuto: true, tcFuente: 'blue', tcLado: 'compra', tc: 1550, sellos: 0.012, ajuste: 0, horizonte: 6, desdeMes: null, ajustes: {}, aplicados: {}, medios: null, revisadas: {} };

export default function App() {
  const [sesion, setSesion] = useState(undefined);   // undefined = averiguando
  const [perfil, setPerfil] = useState(null);
  const [estado, setEstado] = useState("");
  const [verCuenta, setVerCuenta] = useState(false);
  const [tab, setTab] = useState("hoy");
  const [cfg, setCfgRaw] = useState(CFG_INI);
  const [movs, setMovs] = useState(SEED);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const [verMedios, setVerMedios] = useState(false);
  const medios = (cfg.medios && cfg.medios.length) ? cfg.medios : MEDIOS_INI;

  // Sesion
  useEffect(() => {
    let vivo = true;
    sb.auth.getSession().then(({ data }) => { if (vivo) setSesion(data.session || null); })
      .catch(() => { if (vivo) setSesion(null); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSesion(s || null));
    return () => { vivo = false; if (sub && sub.subscription) sub.subscription.unsubscribe(); };
  }, []);

  const [hayUpdate, setHayUpdate] = useState(false);

  useEffect(() => {
    if (sesion === undefined) return;
    if (sesion === null) { setCargando(false); return; }
    let vivo = true;
    (async () => {
      const uid = sesion.user.id;
      let cfgN = null, movsN = null;
      try {
        const { data } = await sb.from("datos").select("cfg, movs").eq("id", uid).maybeSingle();
        if (data && data.movs && data.movs.length) { cfgN = data.cfg; movsN = data.movs; }
      } catch (e) { /* sin conexion: caemos al respaldo local */ }

      if (!movsN) {
        // Cuenta nueva: si habia datos en este navegador, se los llevamos a la nube.
        try {
          const raw = localStorage.getItem("flujo:v2");
          if (raw) { const d = JSON.parse(raw); if (d.movs && d.movs.length) { cfgN = d.cfg; movsN = d.movs; } }
        } catch (e) { /* nada guardado */ }
      }
      // Cuenta nueva de verdad: arranca vacia. La semilla es solo de quien la cargo.
      if (!movsN) movsN = [];

      const mk = mesDeHoy();
      const c = { ...CFG_INI, ...(cfgN || {}), desdeMes: null,
                  ajustes: (cfgN && cfgN.ajustes) || {}, aplicados: (cfgN && cfgN.aplicados) || {} };

      // Limpieza: si quedo el efecto de un movimiento que ya no existe, lo revertimos.
      // Pasa si se borro el movimiento sin deshacer primero.
      const vivos = new Set(movsN.map((m) => m.id));
      let cajaFix = c.saldoHoy || 0, resFix = c.reservasUsd || 0, huerfanos = 0;
      const apLimpio = {};
      Object.keys(c.aplicados || {}).forEach((k) => {
        const mes = {};
        Object.keys(c.aplicados[k] || {}).forEach((id) => {
          if (vivos.has(id)) mes[id] = c.aplicados[k][id];
          else {
            cajaFix += c.aplicados[k][id].pesos;
            resFix -= c.aplicados[k][id].usd;
            huerfanos++;
          }
        });
        apLimpio[k] = mes;
      });
      if (huerfanos) {
        c.aplicados = apLimpio;
        c.saldoHoy = Math.round(cajaFix);
        c.reservasUsd = Math.max(0, Math.round(resFix * 100) / 100);
      }
      // Ajustes que apuntan a movimientos borrados: sobran
      Object.keys(c.ajustes || {}).forEach((k) => {
        const mes = {};
        Object.keys(c.ajustes[k] || {}).forEach((id) => { if (vivos.has(id)) mes[id] = c.ajustes[k][id]; });
        c.ajustes[k] = mes;
      });
      if (!c.ajustesInit) {
        c.ajustes = { ...c.ajustes,
          [mk]: { ...ajustesEnCero(movsN.filter((m) => String(m.id).startsWith("s")), mk, c.tc),
                  ...(c.ajustes[mk] || {}) } };
        c.ajustesInit = true;
      }
      if (!vivo) return;
      setCfgRaw(c); setMovs(movsN);
      const tieneSemilla = movsN.some((m) => String(m.id).startsWith("s"));
      if (tieneSemilla && (cfgN && cfgN.seedVersion ? cfgN.seedVersion : 0) < SEED_VERSION) setHayUpdate(true);
      setCargando(false);
      guardarNube(uid, c, movsN);
    })();
    return () => { vivo = false; };
  }, [sesion]);

  // Guardado en la nube, sin atropellarse
  const timer = React.useRef(null);
  const guardarNube = useCallback((uid, c, m) => {
    if (!uid) return;
    setEstado("guardando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { error } = await sb.from("datos")
          .upsert({ id: uid, cfg: { ...c, seedVersion: SEED_VERSION }, movs: m, actualizado: new Date().toISOString() });
        setEstado(error ? "error" : "guardado");
      } catch (e) { setEstado("error"); }
    }, 700);
  }, []);

  // Perfil
  useEffect(() => {
    if (!sesion) { setPerfil(null); return; }
    sb.from("perfiles").select("usuario, nombre").eq("id", sesion.user.id).maybeSingle()
      .then(({ data }) => setPerfil(data || null)).catch(() => {});
  }, [sesion]);

  // Reemplaza solo los movimientos base (id "s...") y conserva los que cargaste vos ("m...").
  const actualizarBase = () => {
    const mios = movs.filter((m) => !String(m.id).startsWith("s"));
    const n = [...SEED, ...mios];
    const mk = mesDeHoy();
    const c = { ...cfg, ajustesInit: true,
                ajustes: { ...cfg.ajustes,
                           [mk]: { ...ajustesEnCero(SEED, mk, cfg.tc), ...((cfg.ajustes || {})[mk] || {}) } } };
    setMovs(n); setCfgRaw(c); persistir(c, n);
    setHayUpdate(false);
  };

  const persistir = useCallback((c, m) => {
    try {
      localStorage.setItem("flujo:v2", JSON.stringify({ cfg: c, movs: m, seedVersion: SEED_VERSION }));
    } catch (e) { /* lleno */ }
    if (sesion) guardarNube(sesion.user.id, c, m);
  }, [sesion, guardarNube]);
  const setCfg = (c) => {
    const limpio = { ...c, desdeMes: null };  // se recalcula siempre desde el mes actual
    setCfgRaw(limpio); persistir(limpio, movs);
  };
  const setM = (m) => { setMovs(m); persistir(cfg, m); };

  const guardarMov = (mv) => {
    const existe = movs.some((x) => x.id === mv.id);
    setM(existe ? movs.map((x) => (x.id === mv.id ? mv : x)) : [mv, ...movs]);
    setEditando(null);
  };
  const borrarVarios = (ids) => {
    // Al borrar hay que revertir lo que ese movimiento ya habia movido y limpiar sus ajustes,
    // si no quedan reservas o saldo fantasma.
    const a = { ...(cfg.ajustes || {}) };
    const ap = { ...(cfg.aplicados || {}) };
    let caja = cfg.saldoHoy || 0;
    let res = cfg.reservasUsd || 0;
    Object.keys(ap).forEach((mk) => {
      const mes = { ...ap[mk] };
      ids.forEach((id) => {
        if (mes[id]) { caja += mes[id].pesos; res -= mes[id].usd; delete mes[id]; }
      });
      ap[mk] = mes;
    });
    Object.keys(a).forEach((mk) => {
      const mes = { ...a[mk] };
      ids.forEach((id) => { delete mes[id]; });
      a[mk] = mes;
    });
    const c = { ...cfg, ajustes: a, aplicados: ap,
                saldoHoy: Math.round(caja), reservasUsd: Math.max(0, Math.round(res * 100) / 100) };
    const n = movs.filter((x) => !ids.includes(x.id));
    setCfgRaw(c); setMovs(n); persistir(c, n);
    setEditando(null);
  };
  const guardarMedios = (lista) => {
    // Nunca dejamos la app sin medios de pago
    const l = lista.length ? lista : MEDIOS_INI;
    setCfg({ ...cfg, medios: l });
  };
  const reiniciar = () => {
    const mk = mesDeHoy();
    const c = { ...CFG_INI, saldoHoy: cfg.saldoHoy, tc: cfg.tc, horizonte: cfg.horizonte,
                ajustesInit: true, ajustes: { [mk]: ajustesEnCero(SEED, mk, cfg.tc) } };
    setMovs(SEED); setCfgRaw(c); persistir(c, SEED); setVerAjustes(false);
  };
  const importar = (d) => {
    const c = { ...CFG_INI, ...(d.cfg || {}) };
    setMovs(d.movs); setCfgRaw(c); persistir(c, d.movs); setVerAjustes(false);
  };
  // monto = null borra el ajuste y vuelve al estimado
  // monto = null borra el ajuste.
  // Para compras de dolares ya hechas guardamos EXACTAMENTE lo que movimos, asi deshacer es exacto
  // y nunca se aplica dos veces.
  const ajustar = (mk, id, monto, mover) => {
    const a = { ...(cfg.ajustes || {}) };
    const delMes = { ...(a[mk] || {}) };
    if (monto === null) delete delMes[id];
    else delMes[id] = monto;
    a[mk] = delMes;

    const ap = { ...(cfg.aplicados || {}) };
    const apMes = { ...(ap[mk] || {}) };
    let caja = cfg.saldoHoy || 0;
    let res = cfg.reservasUsd || 0;

    if (mover && !apMes[id]) {
      // Aplicar: sale de la caja, entra a reservas
      caja -= mover.pesos; res += mover.usd;
      apMes[id] = { usd: mover.usd, pesos: mover.pesos };
    } else if (!mover && apMes[id]) {
      // Deshacer: revertimos exactamente lo mismo que aplicamos
      caja += apMes[id].pesos; res -= apMes[id].usd;
      delete apMes[id];
    }
    ap[mk] = apMes;

    setCfg({ ...cfg, ajustes: a, aplicados: ap,
             saldoHoy: Math.round(caja),
             reservasUsd: Math.max(0, Math.round(res * 100) / 100) });
  };

  const { coti, estado: estadoCoti, refrescar } = useCotizacion(cfg.tcFuente || "blue", !!cfg.tcAuto);
  const tcVivo = cfg.tcAuto && coti && coti.fuente === (cfg.tcFuente || "blue")
    ? (cfg.tcLado === "venta" ? coti.venta : coti.compra) : null;
  const cfgTC = tcVivo ? { ...cfg, tc: tcVivo } : cfg;
  const desde = cfg.desdeMes || mesDeHoy();
  const filas = useMemo(
    () => proyectar({ ...cfgTC, desdeMes: desde }, movs, medios, cfg.horizonte, null),
    [cfgTC, movs, medios, desde, cfg.horizonte]
  );

  // Meses ya cerrados: se calculan igual, pero sin saldo porque solo conocemos el de hoy.
  const historial = useMemo(() => {
    const n = 6;
    return proyectar({ ...cfgTC, saldoHoy: 0, desdeMes: sumaMes(desde, -n) }, movs, medios, n, null);
  }, [cfgTC, movs, medios, desde]);

  // Tarjetas cuyo ultimo ciclo real ya cerro: hay que pedir el proximo.
  const sinActualizar = useMemo(() => tarjetasSinActualizar(medios, hoyISO()), [medios]);
  const estimados = useMemo(() => ciclosEstimados(medios), [medios]);
  const [postergado, setPostergado] = useState(false);
  const personas = useMemo(() => [...new Set(movs.filter((m) => m.persona).map((m) => m.persona))], [movs]);

  if (sesion === undefined || (sesion && cargando))
    return <div className="bz" style={{ padding: 40, textAlign: "center", color: T.suave }}><style>{CSS}</style>Cargando…</div>;
  if (sesion === null) return <Acceso />;

  return (
    <div className="bz" style={{ maxWidth: 470, margin: "0 auto", paddingBottom: 96 }}>
      <style>{CSS}</style>

      {hayUpdate && (
        <div style={{ background: T.ambarBg, padding: "13px 16px", borderBottom: `1px solid ${T.linea}` }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            Hay datos base nuevos para cargar. Se reemplazan los movimientos originales y se conserva
            todo lo que agregaste vos.
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
            <button
              onClick={actualizarBase}
              style={{ padding: "9px 15px", borderRadius: 9, background: T.tinta, color: "#fff",
                       fontSize: 13.5, fontWeight: 600 }}
            >
              Actualizar
            </button>
            <button
              onClick={() => setHayUpdate(false)}
              style={{ padding: "9px 15px", fontSize: 13.5, color: T.suave }}
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px 0" }}>
        <span style={{ fontSize: 15, fontWeight: 680, letterSpacing: "-0.01em" }}>Bancame</span>
        <button onClick={() => setVerCuenta(true)}
          style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}>
          @{perfil ? perfil.usuario : "…"}
        </button>
      </div>

      {tab === "hoy" && (
        <Hoy
          cfg={{ ...cfgTC, desdeMes: desde }} setCfg={setCfg} filas={filas} medios={medios} movs={movs}
          onAbrirAjustes={() => setVerAjustes(true)} onAjustar={ajustar}
          coti={coti} estadoCoti={estadoCoti} onRefrescar={refrescar} tcVivo={tcVivo}
          historial={historial} cerradas={[]} estimados={estimados}
          onAbrirMedios={() => setVerMedios(true)}
          revisadas={cfg.revisadas || {}}
          onRevisar={(clave) => setCfg({ ...cfg, revisadas: { ...(cfg.revisadas || {}), [clave]: true } })}
        />
      )}
      {tab === "movs" && <Movimientos movs={movs} medios={medios} cfg={cfgTC} onEditar={setEditando} onBorrarVarios={borrarVarios} />}
      {tab === "sim" && <Simular cfg={{ ...cfgTC, desdeMes: desde }} movs={movs} medios={medios} />}
      {tab === "rep" && <Personas filas={filas} />}

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
          tcRef={cfgTC.tc}
          disponible={filas[0] && filas[0].mk === mesDeHoy()
            ? cfg.saldoHoy - (filas[0].egresos - filas[0].ingresos) : cfg.saldoHoy}
          onGuardar={guardarMov} onBorrar={(id) => borrarVarios([id])} onCerrar={() => setEditando(null)}
        />
      )}
      {sinActualizar.length > 0 && !postergado && (
        <ActualizarCiclos
          pendientes={sinActualizar} medios={medios}
          onGuardar={guardarMedios} onPostergar={() => setPostergado(true)}
        />
      )}
      {verMedios && (
        <Medios medios={medios} movs={movs} onGuardar={guardarMedios} onCerrar={() => setVerMedios(false)} />
      )}
      {verCuenta && (
        <Cuenta
          perfil={perfil} estado={estado} onCerrar={() => setVerCuenta(false)}
          onSalir={async () => { await sb.auth.signOut(); setVerCuenta(false); }}
        />
      )}
      {verAjustes && (
        <Ajustes
          cfg={cfg} setCfg={setCfg} medios={medios} movs={movs}
          onBorrarVarios={borrarVarios} onReiniciar={reiniciar} onImportar={importar}
          onAbrirMedios={() => { setVerAjustes(false); setVerMedios(true); }}
          onCerrar={() => setVerAjustes(false)}
        />
      )}
    </div>
  );
}
