import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

/* ===================== TOKENS ===================== */
const T = {
  tinta: "#0E2B25",   // pino profundo: texto y acciones primarias
  suave: "#576A64",
  tenue: "#8A9992",
  papel: "#EEF1EB",
  card: "#FFFFFF",
  linea: "#DCE2D9",
  eje: "#CFD8CD",     // el hilo de la línea de tiempo
  verde: "#17714F",
  rojo: "#A93B28",
  ambar: "#A8761A",
  ambarBg: "#FAF0DA",
  rojoBg: "#FAE7E3",
  verdeBg: "#E4F0EA",
};

const CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  .bz { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: ${T.tinta}; background: ${T.papel}; min-height: 100vh; }
  .bz .num { font-variant-numeric: tabular-nums; letter-spacing: -0.015em; font-feature-settings: "tnum" 1; }
  .bz .plata { font-variant-numeric: tabular-nums; letter-spacing: -0.03em; font-weight: 660; }
  .bz .hero { font-size: 42px; line-height: 1.02; letter-spacing: -0.038em; font-weight: 680; }
  .bz .eyebrow { font-size: 13px; color: ${T.suave}; }
  /* La línea de tiempo: un hilo continuo del que cuelgan los meses */
  .bz .eje { position: relative; padding-left: 22px; }
  .bz .eje::before { content: ""; position: absolute; left: 4px; top: 14px; bottom: 14px;
        width: 2px; background: ${T.eje}; border-radius: 2px; }
  .bz .nodo { position: relative; }
  .bz .nodo::before { content: ""; position: absolute; left: -22px; top: 20px; width: 10px; height: 10px;
        border-radius: 50%; background: ${T.card}; border: 2px solid ${T.eje}; }
  .bz .nodo.rojo::before { border-color: ${T.rojo}; background: ${T.rojo}; }
  .bz .nodo.ahora::before { border-color: ${T.tinta}; background: ${T.tinta};
        box-shadow: 0 0 0 4px ${T.papel}; }
  .bz .traza { height: 3px; border-radius: 3px; background: ${T.eje}; }
  .bz .sube { animation: sube .45s cubic-bezier(.22,1,.36,1) both; }
  @keyframes sube { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }
  .bz .ritmo { height: 7px; border-radius: 99px; background: rgba(234,240,236,.16); overflow: hidden; }
  .bz .ritmo > i { display: block; height: 100%; border-radius: 99px;
        animation: crece .6s cubic-bezier(.22,1,.36,1) both; }
  @keyframes crece { from { transform: scaleX(0); transform-origin: left; } to { transform: none; } }
  @media (prefers-reduced-motion: reduce) { .bz * { animation: none !important; transition: none !important; } }
  .bz button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; padding: 0; }
  .bz input, .bz select, .bz textarea {
        font-family: inherit; font-size: 16px; color: ${T.tinta}; background: ${T.card};
        border: 1px solid ${T.linea}; border-radius: 10px; padding: 11px 12px; width: 100%; outline: none; }
  .bz input:focus, .bz select:focus { border-color: ${T.tinta}; outline: none;
        box-shadow: 0 0 0 3px rgba(14,43,37,.09); }
  .bz button:focus-visible { outline: 2px solid ${T.tinta}; outline-offset: 2px; border-radius: 8px; }
  .bz .chip { border: 1px solid ${T.linea}; background: ${T.card}; border-radius: 999px;
        transition: background .12s ease, border-color .12s ease;
        padding: 8px 13px; font-size: 14px; white-space: nowrap; }
  .bz .chip.on { background: ${T.tinta}; color: #fff; border-color: ${T.tinta}; }
  .bz .chip.sm { padding: 6px 11px; font-size: 13px; }
  .bz .lbl { font-size: 12.5px; color: ${T.suave}; margin-bottom: 6px; display: block; }
  .bz .card { background: ${T.card}; border: 1px solid ${T.linea}; border-radius: 15px; }
  /* El héroe no es una tarjeta más: no tiene borde y flota apenas */
  /* El héroe es la única superficie oscura: crea el punto de tensión de la pantalla */
  .bz .cima { background: ${T.tinta}; color: #EAF0EC; border-radius: 21px;
        box-shadow: 0 10px 30px -14px rgba(14,43,37,.55); }
  .bz .cimaClara { background: ${T.card}; border-radius: 19px; box-shadow: 0 1px 2px rgba(14,43,37,.05),
        0 8px 24px -12px rgba(14,43,37,.16); }
  /* Los avisos van embebidos, no en tarjeta con borde */
  .bz .aviso { border-radius: 13px; padding: 13px 15px; font-size: 13px; line-height: 1.55; }
  .bz .scroll::-webkit-scrollbar { display: none; }
  .bz .scroll { -ms-overflow-style: none; scrollbar-width: none; }
  .bz .btn { padding: 15px; border-radius: 13px; font-size: 16px; font-weight: 620; width: 100%;
        transition: opacity .12s ease;
        background: ${T.tinta}; color: #fff; }
  .bz .btn.ghost { background: ${T.card}; color: ${T.tinta}; border: 1px solid ${T.linea}; }
  .bz .btn.peligro { background: ${T.rojo}; color: #fff; }
  @media (prefers-reduced-motion: no-preference) { .bz .grow { transition: width .3s ease; } }
`;

/* ===================== MEDIOS DE PAGO ===================== */
// Una cuenta nueva NO hereda las tarjetas de nadie: arranca solo con efectivo.
const MEDIOS_NUEVO = [
  { id: "efectivo", nombre: "Efectivo / débito", corto: "Efvo", cierre: 0, vto: 0 },
];

// Solo se usan junto con la semilla de ejemplo
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

/* ===================== LECTOR DE RESÚMENES ===================== */
// Lector de resúmenes de tarjeta argentinos.
// Hallazgo clave: el resumen NO lo arma el banco, lo arma el procesador (Prisma/Visa
// o Mastercard). Por eso alcanzan DOS moldes para cubrir casi todas las tarjetas.

const RMESES = { ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, set:9, oct:10, nov:11, dic:12 };
const RMESL = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7,
               agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };

const rnum = (s) => {
  if (!s) return 0;
  const neg = /-\s*$/.test(s) || /^\s*-/.test(s);
  const v = parseFloat(String(s).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(v) ? 0 : (neg ? -Math.abs(v) : v);
};

// "20 Ago 26" | "20-Ago-26" | "20 ago. 26" | "20.08.26" | "30-12-24"
function rFecha(txt) {
  if (!txt) return null;
  let m = txt.match(/(\d{1,2})[\s\-.]+([A-Za-zÁ-úá-ú]{3,10})\.?[\s\-.]+(\d{2,4})/);
  if (m) {
    const mes = RMESES[m[2].toLowerCase().slice(0, 3)];
    if (mes) return riso(+m[1], mes, +m[3]);
  }
  m = txt.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);
  if (m) return riso(+m[1], +m[2], +m[3]);
  return null;
}
const riso = (d, m, y) => {
  y = y < 100 ? 2000 + y : y;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

function rCiclos(t) {
  const b = (re) => { const m = t.match(re); return m ? rFecha(m[1]) : null; };
  return {
    cierre:    b(/CIERRE\s+ACTUAL:?\s*([^\n$]{6,20})/i) || b(/ESTADO DE CUENTA AL:?\s*([^\n$]{6,20})/i)
             || b(/\bCIERRE\s+(\d{1,2}[\s\-][A-Za-z]{3,4}[\s\-]\d{2})/i),
    vto:       b(/VENCIMIENTO\s+ACTUAL:?\s*([^\n$]{6,20})/i)
             || b(/VENCIMIENTO\s+(\d{1,2}\s+[A-Za-z]{3,4}\s+\d{2})/i)
             || b(/VENCIMIENTO\s+SALDO[^\n]*(?:\n[^\n]*){0,2}\n\s*(\d{1,2}\s+[A-Za-z]{3,4}\.?\s+\d{2})\s+\d/i),
    proxCierre: b(/PROX(?:IMO)?\.?\s*CIERRE:?\s*([^\n$]{6,20})/i),
    proxVto:    b(/PROX(?:IMO)?\.?\s*(?:VTO|VENCIMIENTO)\.?:?\s*([^\n$]{6,20})/i),
  };
}

function rEmisor(t) {
  const T = t.toUpperCase();
  const banco = /HIPOTECARIO/.test(T) ? "Banco Hipotecario"
    : /BANCO NACION|BANCO DE LA NACION|\bBNA\b|NACION EFECTIVO/.test(T) ? "Banco Nación"
    : /BANCO\s*\n?\s*PROVINCIA|PROVINCIA NET|BIP M/.test(T) ? "Banco Provincia"
    : /ICBC/.test(T) ? "ICBC" : "Desconocido";
  const marca = /MASTERCARD|MASTCLI/.test(T) ? "Mastercard" : "Visa";
  return { banco, marca, molde: marca === "Mastercard" ? "mastercard" : "visa" };
}

// Ruido: impuestos, pagos, totales — no son consumos del usuario
const RRUIDO = /IMPUESTO DE SELLOS|IIBB|IVA RG|DB\.RG|DEV\.?IMP|PERCEP|SU PAGO|SALDO ANTERIOR|SALDO ACTUAL|PAGO MINIMO|Total Consumos|TOTAL TITULAR|COM\.POR MANT|MEMBRESIA|LIMITES|CUOTAS A VENCER|Cuotas a vencer|TNA|TEM|Plan V/i;

function rMovs(t, molde) {
  const out = [];
  const creditos = [];   // anulaciones y bonificaciones dentro de los consumos
  let mesCtx = null, anioCtx = null;

  for (const raw of t.split("\n")) {
    const l = raw.replace(/\s+$/, "");
    if (!l.trim() || RRUIDO.test(l)) continue;

    // ICBC agrupa por mes: "26 Enero 07 006463 * DESPEGAR C.08/12  3.158,83"
    // A veces el mes viene abreviado: "26 Setiem. 01 ..." / "26 Agosto 21 ..."
    let cab = l.match(/^\s*(\d{2})\s+([A-Za-z]{3,10})\.?\s+/);
    if (cab) {
      const w = cab[2].toLowerCase();
      const esMes = RMESES[w.slice(0, 3)] && Object.keys(RMESL).some((n) => n.startsWith(w));
      if (esMes) { anioCtx = 2000 + +cab[1]; mesCtx = RMESES[w.slice(0, 3)]; }
      else cab = null;
    }

    // Cuotas: "C.08/12" | "Cuota 18/18" | "16/18"
    // "C.08/12" | "Cuota 18/18" | "16/18" suelto (Mastercard) — con o sin comprobante en el medio
    const cuo = l.match(/(?:C\.|Cuota\s+)(\d{1,2})\s*\/\s*(\d{1,2})/i)
             || l.match(/\s(\d{1,2})\/(\d{1,2})\s+(?:\d{4,7}\s+)?[\d.,]+\s*$/);

    // Importes al final de la línea
    const imps = l.match(/-?\d[\d.]*,\d{2}-?/g);
    if (!imps || !imps.length) continue;

    let f = null;
    if (cab) {
      const d = l.slice(cab[0].length).match(/^\s*(\d{1,2})\s/);
      if (d && mesCtx) f = riso(+d[1], mesCtx, anioCtx);
    } else {
      f = rFecha(l.slice(0, 26));
      if (!f && mesCtx) {
        const d = l.match(/^\s{2,}(\d{1,2})\s+\d{3,}/);
        if (d) f = riso(+d[1], mesCtx, anioCtx);
      }
    }
    if (!f) continue;

    // Detalle: sin fecha, sin comprobante, sin cuotas, sin importes
    let det = l
      .replace(/^\s*\d{2}\s+[A-Za-zÁ-ú]+\.?\s+/i, "")
      .replace(/^\s*[\d\-.\/A-Za-z]{6,14}\s+/, "")
      .replace(/^\s*\d{4,7}\s*[*K]?\s+/, "")
      .replace(/(?:C\.|Cuota\s+)?\b\d{1,2}\s*\/\s*\d{1,2}\b/i, "")
      .replace(/-?\d[\d.]*,\d{2}-?/g, "")
      .replace(/\s{2,}/g, " ").trim();
    det = det.replace(/^\**\s*/, "").replace(/\s*\*+$/, "").trim();
    det = det.replace(/\s+\d{5}\s*$/, "").trim();          // comprobante al final (Mastercard)
    det = det.replace(/^\d{1,2}\s+\d{4,7}\s*[*K]?\s+/, "").trim();  // "07 006463 *" (ICBC)
    det = det.replace(/\s+\d{6,}\s*$/, "").trim();          // referencias largas
    if (!det || det.length < 3) continue;

    // Dólares: si hay dos importes y el último es chico, el consumo es en USD
    let monto = rnum(imps[imps.length - 1]), usd = null;
    if (imps.length >= 2 && /USD|U\$S/i.test(l)) { usd = rnum(imps[imps.length - 1]); monto = 0; }
    else if (/USD/i.test(det) && monto < 1000) { usd = monto; monto = 0; }
    if (monto < 0) {
      // Los pagos y la devolución de impuestos no son consumos. Las anulaciones y
      // bonificaciones de un comercio sí: las cruzamos con su compra más abajo.
      // Ojo: "MERPAGO*..." contiene PAGO; los pagos de verdad dicen "SU PAGO"
      if (!/SU PAGO|PAGO EN|DEV\.?\s*IMP|SALDO|PERCEP/i.test(l)) creditos.push({ det, monto: -monto });
      continue;
    }
    if (!monto && !usd) continue;

    out.push({
      fecha: f,
      detalle: det.slice(0, 46),
      monto: usd ? 0 : monto,
      montoUsd: usd,
      cuota: cuo ? +cuo[1] : 1,
      cuotas: cuo ? +cuo[2] : 1,
    });
  }
  // Cruce de créditos: "MERCADOLIBRE 9.990 / MERCADOLIBRE 9.990-" se anulan;
  // "BONIF. CONSUMO DIMAWOL 4.960-" le baja el importe a la compra de DIMAWOL.
  const pal = (x) => x.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 4 && !/^(bonif|consumo|merpago|anulacion|devol)/.test(w));
  creditos.forEach((c) => {
    const pc = pal(c.det);
    const cand = out.filter((m) => !m._anulado && m.monto > 0 && pal(m.detalle).some((w) => pc.includes(w)));
    if (!cand.length) return;
    const igual = cand.find((m) => Math.abs(m.monto - c.monto) < 1);
    if (igual) { igual._anulado = true; return; }
    const m = cand[cand.length - 1];
    if (m.cuotas > 1) m.bonif = (m.bonif || 0) + c.monto;   // en cuotas: va como reintegro único
    else if (m.monto > c.monto) m.monto = Math.round((m.monto - c.monto) * 100) / 100;
  });
  return out.filter((m) => !m._anulado);
}

// El resumen declara su propio total: lo usamos para autoverificar
function rTotal(t) {
  const m = [...t.matchAll(/Total Consumos[^\n]*?(\d[\d.]*,\d{2})/gi)];
  if (m.length) return m.reduce((a, x) => a + rnum(x[1]), 0);
  const m2 = t.match(/TOTAL TITULAR[^\n]*?(\d[\d.]*,\d{2})/i);
  return m2 ? rnum(m2[1]) : null;
}

// La TNA de financiación y el pago mínimo están en el resumen: son la base del comparador.
// Cuidado: los resúmenes traen la tasa en pesos Y la de dólares, y hay que quedarse con la de pesos.
function rFinanciero(t) {
  const lineas = t.split("\n");
  const enDolares = (l) => /U\$S|USD|d[oó]lar/i.test(l);

  // Juntamos todas las TNA que NO estén en un contexto de dólares y nos quedamos con la mayor:
  // en Argentina la tasa en pesos siempre supera holgadamente a la de dólares.
  const tasas = [];
  lineas.forEach((l) => {
    [...l.matchAll(/TNA\s*(?:Fija)?\s*:?\s*\$?\s*([\d.]+,\d+)/gi)].forEach((m) => {
      const antes = l.slice(0, m.index);
      const desp = l.slice(m.index, m.index + 40);
      if (!enDolares(desp) && !/U\$S\s*$/.test(antes)) tasas.push(rnum(m[1]));
    });
  });
  const tna = tasas.length ? Math.max(...tasas.filter((x) => x > 0 && x < 400)) : null;

  const buscar = (re) => {
    for (const l of lineas) {
      const m = l.match(re);
      if (m) return rnum(m[1]);
    }
    return null;
  };
  return {
    tna: tna || null,
    tem: tna ? Math.round((Math.pow(1 + tna / 100 / 12, 1) - 1) * 100 * 1000) / 1000 : null,
    pagoMinimo: buscar(/PAGO\s*M[IÍ]NIMO[^\d]{0,20}([\d.]+,\d{2})/i)
              || buscar(/PAGO MINIMO\s+([\d.]+,\d{2})/i),
    saldo: buscar(/LA SUMA DE\s*\$?\s*([\d.]+,\d{2})/i)
         || buscar(/SALDO\s*ACTUAL[^\d]{0,20}([\d.]+,\d{2})/i),
  };
}

function leerResumen(texto) {
  const em = rEmisor(texto);
  const movs = rMovs(texto, em.molde);
  const dec = rTotal(texto);
  const suma = movs.reduce((a, m) => a + m.monto - (m.bonif || 0), 0);
  return {
    ...em, ciclos: rCiclos(texto), movs, fin: rFinanciero(texto),
    control: { declarado: dec, sumado: Math.round(suma * 100) / 100,
               dif: dec ? Math.round((suma - dec) * 100) / 100 : null },
  };
}




/* ===================== DEUDAS ENTRE USUARIOS ===================== */
const ESTADOS = {
  pendiente:   { nombre: "Esperando respuesta", color: "ambar" },
  aceptada:    { nombre: "Aceptada",            color: "tinta" },
  rechazada:   { nombre: "Rechazada",           color: "rojo" },
  dice_pagada: { nombre: "Dice que pagó",       color: "ambar" },
  saldada:     { nombre: "Saldada",             color: "verde" },
};
const ABIERTAS = ["pendiente", "aceptada", "dice_pagada"];

// Buscar a alguien por su @usuario. El mail queda privado.
async function buscarUsuario(handle) {
  const h = String(handle || "").trim().replace(/^@/, "").toLowerCase();
  if (h.length < 2) return null;
  const { data, error } = await sb.from("perfiles")
    .select("id, usuario, nombre").ilike("usuario", h).limit(1);
  if (error || !data || !data.length) return null;
  return data[0];
}

async function traerDeudas(uid) {
  const { data, error } = await sb.from("deudas")
    .select("*").or(`acreedor.eq.${uid},deudor.eq.${uid}`)
    .order("creado", { ascending: false }).limit(400);
  if (error) throw error;
  return data || [];
}

// Neto por persona: positivo = te deben, negativo = debés
function netoPorPersona(deudas, uid, perfiles) {
  const m = {};
  (deudas || []).filter((d) => ABIERTAS.includes(d.estado)).forEach((d) => {
    const otro = d.acreedor === uid ? d.deudor : d.acreedor;
    const signo = d.acreedor === uid ? 1 : -1;
    if (!m[otro]) m[otro] = { id: otro, neto: 0, items: [],
      nombre: (perfiles && perfiles[otro]) || "alguien" };
    m[otro].neto += signo * (+d.monto || 0);
    m[otro].items.push(d);
  });
  return Object.values(m).sort((a, b) => Math.abs(b.neto) - Math.abs(a.neto));
}

// Lo que necesita atención mía: deudas que me cargaron y no respondí,
// o pagos que me avisaron y no confirmé.
function requierenAccion(deudas, uid) {
  return (deudas || []).filter((d) =>
    (d.deudor === uid && d.estado === "pendiente") ||
    (d.acreedor === uid && d.estado === "dice_pagada"));
}

/* ===================== COTIZACIONES EN VIVO ===================== */
// Dos APIs públicas gratuitas, sin clave:
//  · ArgentinaDatos (MIT) → tasas de plazo fijo de cada banco, reportadas al BCRA
//  · data912 → precios de acciones, CEDEARs y bonos del mercado argentino
const API_TASAS = "https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo";
const API_MERCADO = {
  accion: "https://data912.com/live/arg_stocks",
  cedear: "https://data912.com/live/arg_cedears",
  bono:   "https://data912.com/live/arg_bonds",
};

// Cache en el navegador: las cotizaciones no cambian tanto como para pedirlas a cada rato
function cacheLeer(clave, minutos) {
  try {
    const raw = localStorage.getItem("coti:" + clave);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() - d.t >= minutos * 60000) return null;
    return d.v;
  } catch (e) { return null; }
}
function cacheGuardar(clave, v) {
  try { localStorage.setItem("coti:" + clave, JSON.stringify({ t: Date.now(), v })); } catch (e) { /* lleno */ }
}

// UVA diaria del BCRA. Devuelve [{fecha, valor}] ordenado por fecha.
async function traerUva() {
  const cache = cacheLeer("uva", 360);
  if (cache) return cache;
  const r = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/uva");
  if (!r.ok) throw new Error("uva");
  const d = await r.json();
  const l = (Array.isArray(d) ? d : [])
    .filter((x) => x && /^\d{4}-\d{2}-\d{2}/.test(x.fecha) && +x.valor > 0)
    .map((x) => ({ fecha: x.fecha.slice(0, 10), valor: +x.valor }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .slice(-500);                    // con el último año y pico alcanza
  cacheGuardar("uva", l);
  return l;
}
// Elige la UVA "del día 10" más nueva publicada (el BCRA la anticipa unas semanas)
function uvaDelDia10(lista) {
  const d10 = (lista || []).filter((x) => x.fecha.slice(8, 10) === "10");
  const u = d10.length ? d10[d10.length - 1] : (lista || [])[(lista || []).length - 1];
  return u ? { mes: u.fecha.slice(0, 7), valor: Math.round(u.valor * 100) / 100, fecha: u.fecha } : null;
}
// Inflación mensual publicada por el INDEC, como fracción: { "2026-08": 0.019 }
async function traerInflacion() {
  const cache = cacheLeer("inflacion", 720);
  if (cache) return cache;
  const r = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion");
  if (!r.ok) throw new Error("inflacion");
  const d = await r.json();
  const m = {};
  (Array.isArray(d) ? d : []).forEach((x) => {
    if (x && /^\d{4}-\d{2}/.test(x.fecha) && isFinite(+x.valor)) m[x.fecha.slice(0, 7)] = +x.valor / 100;
  });
  cacheGuardar("inflacion", m);
  return m;
}

async function traerTasas() {
  const cache = cacheLeer("tasas", 720);          // 12 h: las tasas se mueven poco
  if (cache) return cache;
  const r = await fetch(API_TASAS);
  if (!r.ok) throw new Error("tasas");
  const d = await r.json();
  const lista = (Array.isArray(d) ? d : [])
    .filter((x) => x && x.entidad && (x.tnaClientes || x.tnaNoClientes))
    .map((x) => ({
      entidad: x.entidad,
      // La API devuelve la TNA en tanto por uno (0,32) o en porcentaje (32) según la fuente
      tna: normTna(x.tnaClientes || x.tnaNoClientes),
    }))
    .filter((x) => x.tna > 0 && x.tna < 300)
    .sort((a, b) => b.tna - a.tna);
  cacheGuardar("tasas", lista);
  return lista;
}
// Para buscar sin importar mayúsculas ni tildes
const normBusca = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const normTna = (v) => { const n = +v || 0; return n > 0 && n < 3 ? n * 100 : n; };

async function traerPrecios(tipo) {
  const url = API_MERCADO[tipo];
  if (!url) return {};
  const cache = cacheLeer("mkt:" + tipo, 30);     // 30 min
  if (cache) return cache;
  const r = await fetch(url);
  if (!r.ok) throw new Error("mercado");
  const d = await r.json();
  const mapa = {};
  (Array.isArray(d) ? d : []).forEach((x) => {
    const t = (x.symbol || x.ticker || "").toUpperCase();
    const p = +x.c || +x.close || +x.px_ask || +x.last || 0;
    if (t && p > 0) mapa[t] = p;
  });
  cacheGuardar("mkt:" + tipo, mapa);
  return mapa;
}

/* ===================== INVERSIONES ===================== */
const TIPOS_INV = [
  { id: "plazofijo", nombre: "Plazo fijo",  moneda: "ARS", rinde: true },
  { id: "remunerada", nombre: "Cuenta remunerada", moneda: "ARS", rinde: true },
  { id: "accion",    nombre: "Acción",      moneda: "ARS" },
  { id: "cedear",    nombre: "CEDEAR",      moneda: "ARS" },
  { id: "bono",      nombre: "Bono",        moneda: "ARS" },
  { id: "fci",       nombre: "Fondo común", moneda: "ARS" },
  { id: "cripto",    nombre: "Cripto",      moneda: "USD" },
];
// Los dólares NO son un tipo más: viven en cfg.reservasUsd, alimentados por las compras
// marcadas como ahorro. Si estuvieran también acá, el patrimonio los contaría dos veces.

// Papeles que se operan en el mercado argentino, para no tipear a mano
const PAPELES = {
  accion: ["GGAL", "YPFD", "PAMP", "BMA", "TXAR", "ALUA", "CEPU", "EDN", "LOMA", "SUPV",
           "TGSU2", "TGNO4", "CRES", "BBAR", "COME", "TRAN", "VALO", "MIRG", "IRSA", "BYMA",
           "CVH", "HARG", "METR", "AGRO", "CADO"],
  cedear: ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL", "NVDA", "META", "NFLX", "KO", "MELI",
           "DISN", "JNJ", "PG", "WMT", "XOM", "BABA", "SPY", "QQQ", "AMD", "PYPL", "SBUX",
           "V", "MA", "JPM", "BRKB", "PFE", "INTC", "GOLD", "VIST"],
  bono:   ["AL30", "AL35", "AL41", "GD30", "GD35", "GD38", "GD41", "GD46", "AE38",
           "TX26", "TX28", "TZX26", "TZX27", "BPOA7", "BPOB7", "BPOC7", "TO26", "PBA25"],
  cripto: ["BTC", "ETH", "USDT", "USDC", "DAI", "SOL", "BNB", "ADA", "DOGE", "XRP"],
};

// Interés simple devengado: el plazo fijo argentino no capitaliza dentro del plazo
function valorInversion(iv, tc) {
  if (!iv) return 0;
  const c = +iv.cantidad;
  const cant = isFinite(c) && c > 0 ? c : 0;
  if (iv.tipo === "plazofijo" || iv.tipo === "remunerada") {
    const capital = cant;
    const fechaOk = (f) => {
      if (!f) return null;
      const d = new Date(f + "T12:00:00");
      return isNaN(d.getTime()) ? null : d;
    };
    const desde = fechaOk(iv.fecha);
    const dias = desde ? Math.max(0, Math.floor((Date.now() - desde) / 86400000)) : 0;
    const vto = fechaOk(iv.vence);
    const tope = iv.tipo === "plazofijo" && vto && desde
      ? Math.max(0, Math.floor((vto - desde) / 86400000))
      : dias;
    const d = Math.min(dias, isFinite(tope) && tope > 0 ? tope : dias);
    const tna = isFinite(+iv.tna) ? +iv.tna : 0;
    const v = capital * (1 + (tna / 100) * ((isFinite(d) ? d : 0) / 365));
    return isFinite(v) ? v : 0;
  }
  const precio = +iv.precioActual || +iv.precioCompra || 0;
  const v = cant * precio * (iv.moneda === "USD" ? (+tc || 0) : 1);
  return isFinite(v) ? v : 0;
}

function resumenInversiones(lista, tc) {
  const l = lista || [];
  const total = l.reduce((a, x) => a + valorInversion(x, tc), 0);
  const porTipo = {};
  l.forEach((x) => {
    const t = (TIPOS_INV.find((y) => y.id === x.tipo) || {}).nombre || "Otros";
    porTipo[t] = (porTipo[t] || 0) + valorInversion(x, tc);
  });
  const invertido = l.reduce((a, x) => {
    const base = (+x.cantidad || 0) * (+x.precioCompra || 0);
    return a + (x.tipo === "plazofijo" || x.tipo === "remunerada"
      ? (+x.cantidad || 0)
      : (x.moneda === "USD" ? base * tc : base));
  }, 0);
  return { total, porTipo, invertido, resultado: total - invertido };
}

const BANCOS = [
  "Galicia", "Santander", "BBVA", "Nación", "Provincia", "Macro", "ICBC", "HSBC",
  "Credicoop", "Patagonia", "Supervielle", "Ciudad", "Hipotecario", "Comafi", "Itaú",
  "Brubank", "Uala", "Naranja X", "Mercado Pago", "Personal Pay", "Otro",
];
const MARCAS = ["Visa", "Mastercard", "Amex", "Cabal"];

// Adivinar la categoría por el texto ahorra un campo entero en la carga
// Los resúmenes traen basura del procesador: MERPAGO*, DLO*, códigos de referencia.
// Un diccionario resuelve casi todo sin IA: gratis, instantáneo y sin inventar nada.
const PREFIJOS = /^(MERPAGO|MERCADOPAGO|MP|DLO|PVS|CP|DEBIN|PEDIDOSYA|RAPIPAGO|TIENDANUBE|EBANX|DL)\s*[*.\-]\s*/i;

const COMERCIOS = {
  rappiargsas: "Rappi", rappi: "Rappi", pedidosya: "PedidosYa",
  meli: "Mercado Libre", mercadolibre: "Mercado Libre", ebanxsa: "Ebanx",
  fpatronal: "Federación Patronal", "fed patronal": "Federación Patronal", federa: "Federación Patronal",
  playstation: "PlayStation", "apple.com": "Apple", google: "Google",
  netflix: "Netflix", spotify: "Spotify", disney: "Disney+", hbo: "HBO Max",
  claro: "Claro", movistar: "Movistar", madacom: "Madacom", telepase: "Telepase",
  edelap: "Edelap", edenor: "Edenor", edesur: "Edesur", "bhn seguros": "Seguro BHN", bhn: "Seguro BHN",
  shell: "Shell", ypf: "YPF", axion: "Axion",
  disco: "Disco", coto: "Coto", carrefour: "Carrefour", jumbo: "Jumbo", "super juan": "Super Juan",
  nike: "Nike", adidasargenti: "Adidas", adidas: "Adidas", kevingston: "Kevingston",
  "las pepas": "Las Pepas", portsaid: "Portsaid", simplicity: "Simplicity",
  despegar: "Despegar", almundo: "Almundo", aerolineas: "Aerolíneas Argentinas",
  bidcom: "Bidcom", fravega: "Frávega", garbarino: "Garbarino", musimundo: "Musimundo",
  cinemalaplata: "Cine La Plata", cuspide: "Cúspide", buscalibreargenti: "Buscalibre",
  gadnic: "Gadnic", "seven electronics": "Seven Electronics",
  farmacia: "Farmacia", drugstorekapr: "Drugstore", kiosco: "Kiosco",
  alfisjeans: "Alfis Jeans", "get the look": "Get The Look", "casa tomada": "Casa Tomada",
  pigmento: "Perfumería Pigmento", perfumeria: "Perfumería", perfumsnow: "Perfum Snow",
  parfumerie: "Perfumería", opensports: "Open Sports", thebrandschoi: "The Brand's Choice",
  "las margaritas": "Las Margaritas", "home sweet": "Home Sweet", visaur: "Visaur",
  consumiblesds: "Consumibles", "shop gallery": "Shop Gallery", blossomfragancias: "Blossom",
  busplus: "BusPlus", tune: "Tune", kingofkings: "King of Kings",
  vegahernan: "Vega Hernán", gaona: "Gaona", florysol: "Florysol", pimpollo: "Pimpollo",
};

// "MERPAGO*FPATRONAL04351" -> "Federación Patronal"
function limpiarComercio(txt) {
  let t = String(txt || "").trim().replace(PREFIJOS, "").replace(/\s{2,}/g, " ").trim();

  const bajo = t.toLowerCase();
  for (const [clave, nombre] of Object.entries(COMERCIOS))
    if (bajo.includes(clave)) return nombre;

  // Solo lo que es CLARAMENTE un código: no queremos borrar el nombre del comercio.
  t = t.replace(/\s*[\/#]{1,2}\d{6,}.*$/, "");           // //4040486240026
  t = t.replace(/\s+\d{5,}\b/g, "");                      // " 368058701"
  t = t.replace(/\s*\([^)]*\)\s*$/, "");                  // "(USA,USD, )"
  t = t.replace(/\s+[A-Za-z]{2,}\d[A-Za-z0-9]{4,}\b/g, ""); // MVGMK6T7VUSD
  t = t.replace(/\s+(SRL|SA|SAS|S\.A\.?)[\s\-].*$/i, "");
  t = t.replace(/\d{2,}$/, "");                             // "LOOK233" -> "LOOK"
  t = t.replace(/^(WWW\.|HTTPS?:\/\/)/i, "").replace(/\.(COM\.AR|COM|AR)\b/i, "");
  t = t.replace(/[*\-\/.]+$/, "").replace(/\s{2,}/g, " ").trim();

  if (!t) return String(txt || "").trim();

  const SIGLAS = /^(sa|srl|sas|bhn|ypf|icbc|bna|usa|usd|ars)$/i;
  return t.toLowerCase().split(" ").filter(Boolean).map((p) =>
    SIGLAS.test(p) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)
  ).join(" ").trim();
}

const PISTAS = {
  "Alimentación": ["super", "disco", "coto", "carrefour", "jumbo", "chino", "verdu", "carnice",
    "panade", "almacen", "dietetica", "vea ", "super juan", "kiosco", "pastas", "granja"],
  "Gastronomía y salidas": ["rappi", "pedidosya", "pedidos ya", "delivery", "mcdonald", "burger",
    "pizza", "bar", "cerveza", "boliche", "resto", "cine", "teatro", "birra", "cafe", "heladeria",
    "parrilla", "sushi", "cinema"],
  "Transporte y nafta": ["uber", "cabify", "didi", "sube", "taxi", "remis", "telepase", "peaje",
    "estaciona", "shell", "ypf", "axion", "puma", "nafta", "combustible", "gnc", "cochera"],
  "Vivienda y servicios": ["edelap", "edenor", "edesur", "camuzzi", "metrogas", "absa", "aysa",
    "expensas", "alquiler", "abl", "arba", "municipal"],
  "Suscripciones": ["netflix", "spotify", "disney", "hbo", "max ", "apple", "google", "youtube",
    "prime", "claro", "personal", "movistar", "internet", "madacom", "playstation", "chatgpt",
    "openai", "icloud", "telecom", "flow"],
  "Salud": ["farmacia", "osde", "swiss", "medic", "dentista", "kinesio", "psico", "laboratorio",
    "optica", "drugstore"],
  "Indumentaria": ["nike", "adidas", "zara", "ropa", "zapatilla", "remera", "campera", "jeans",
    "kevingston", "pepas", "portsaid", "simplicity", "indumentaria", "calzado", "sport"],
  "Deporte": ["gimnasio", "gym", "basquet", "futbol", "padel", "tenis", "club", "natacion"],
  "Cuidado personal": ["perfumeria", "peluqueria", "barberia", "cosmetic", "fragancia", "perfum"],
  "Hogar y compras": ["easy", "sodimac", "ferrete", "mueble", "deco", "limpieza", "bazar",
    "mercadolibre", "mercado libre", "fravega", "garbarino", "musimundo", "bidcom", "electro"],
  "Viajes": ["vuelo", "aerolineas", "latam", "hotel", "airbnb", "pasaje", "despegar", "almundo",
    "turismo", "excursion"],
  "Préstamos": ["prestamo", "prendario", "hipotecar", "cuota del prestamo"],
  "Seguros": ["seguro", "patronal", "bhn", "sancor", "rivadavia", "poliza"],
  "Educación": ["curso", "facultad", "libro", "capacita", "ingles", "universidad", "cuspide",
    "buscalibre", "libreria"],
};
function adivinarCategoria(texto) {
  const t = (texto || "").toLowerCase();
  if (!t.trim()) return "Otros";
  for (const [cat, pistas] of Object.entries(PISTAS))
    if (pistas.some((p) => t.includes(p))) return cat;
  return "Otros";
}

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
// Un gasto recurrente en tarjeta se consume un mes y se PAGA al siguiente cierre.
// Sin esto, Netflix de septiembre aparecía en septiembre en vez de en el resumen
// que se paga en octubre, y el mes en curso mostraba tarjetas ya saldadas.
function mesConsumo(mv, mkPago, medios) {
  if (!mv.recurrente || !mv.medio || mv.medio === "efectivo") return mkPago;
  // Tomamos el 15 como día típico del débito automático
  for (let k = 0; k <= 2; k++) {
    const cand = sumaMes(mkPago, -k);
    if (mesDePago(cand + "-15", mv.medio, medios) === mkPago) return cand;
  }
  return sumaMes(mkPago, -1);
}

function montoEnMes(mv, mkPedido, tc, medios) {
  // Cobrás el 28 pero esa plata es del mes que viene: el ingreso se corre un mes
  // para quedar al lado de los gastos que va a pagar.
  const mk = mv.paraMes === "siguiente" ? sumaMes(mkPedido, -1) : mkPedido;
  // Un importe negativo no tiene sentido en este modelo y contaminaba los totales:
  // lo tratamos como cero en vez de dejar que reste.
  const num = (v) => {
    const n = typeof v === "number" && isFinite(v) ? v : parseFloat(v);
    return isFinite(n) && n > 0 ? n : 0;
  };
  const base = mv.tipo === "ahorro" ? num(mv.montoUsd) * (num(mv.tcCompra) || tc)
             : mv.moneda === "USD" ? num(mv.montoUsd) * tc
             : num(mv.monto);
  if (!base) return 0;
  if (mv.recurrente) {
    // Las reglas (meses, desde, hasta) se evalúan sobre el mes en que se CONSUME,
    // no sobre el mes en que se paga.
    const mc = medios ? mesConsumo(mv, mk, medios) : mk;
    if (mv.meses && mv.meses.length && !mv.meses.includes(+mc.slice(5, 7))) return 0;
    if (mv.desde && idxMes(mc) < idxMes(mv.desde)) return 0;
    if (mv.hasta && idxMes(mc) > idxMes(mv.hasta)) return 0;
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
  return distMes(mv.mesInicio, mv.paraMes === "siguiente" ? sumaMes(mk, -1) : mk) + 1;
}

// Deja todo el mes en cero: sirve para dar por saldado el mes en curso.
function ajustesEnCero(movs, mk, tc, medios) {
  const o = {};
  movs.forEach((mv) => { if (montoEnMes(mv, mk, tc, medios) > 0) o[mv.id] = 0; });
  return o;
}

// Un recurrente en un mes está ESTIMADO o CONFIRMADO.
// Confirmado = ya sabemos el número real, sea igual o distinto al estimado.
function estaConfirmado(cfg, mk, id) {
  return !!((cfg.confirmados || {})[mk] || {})[id];
}
// Los automáticos (suscripciones, seguros, servicios) se debitan solos y casi
// nunca cambian. Los variables (nafta, súper) son una apuesta hasta que pasan.
const esAuto = (mv) => mv.recurrente && mv.auto !== false;

// El mes en curso y los que ya pasaron se arman SOLO con lo que cargaste.
// Las bolsas estimadas (nafta, súper, gastos varios) valen de acá en adelante.
const mesCerradoOEnCurso = (mk) => idxMes(mk) <= idxMes(mesDeHoy());
// Una bolsa es un recurrente variable que ADEMÁS cargás a mano gasto por gasto.
// Si no lo cargás a mano (la psicología, los almuerzos), cuenta siempre: es real.
const esEstimacion = (mv) =>
  mv.recurrente && mv.tipo !== "ingreso" && mv.auto === false && mv.manual !== false;

// Los estimados VARIABLES de un mes (nafta, súper) con lo que ya les comieron
// los gastos reales que apuntan a ellos. Es lo que ofrecemos al cargar a mano.
// Reintegros del banco: "gastás X con la tarjeta Y y te devuelven Z%, con tope".
// El crédito entra en el resumen, así que baja lo que pagás de esa tarjeta.
// Si solo cargás el tope, se toma como un reintegro fijo.
function devolucionDe(mv, tc, medios, mk) {
  if (!mv || mv.tipo !== "gasto" || mv.pagadoPor === "otro") return 0;
  const pct = +mv.devPct || 0, tope = +mv.devTope || 0;
  if (pct <= 0 && tope <= 0) return 0;
  const aCaja = (mv.devDestino || "caja") !== "tarjeta";
  // A la caja te lo acreditan el mismo día; al resumen, recién en el siguiente.
  const cuando = mv.devMes || (aCaja ? "mismo" : "siguiente");
  const mo = sumaMes(mk, cuando === "mismo" ? 0 : -1);
  let bruto;
  if (mv.recurrente) {
    bruto = montoEnMes(mv, mo, tc, medios);
  } else {
    // Si cae en la caja, el reloj es el DÍA DE LA COMPRA. Si cae en el resumen,
    // es el mes en que se paga esa tarjeta: son dos momentos distintos.
    const ref = aCaja
      ? ((mv.fecha || mv.fechaCompra || "").slice(0, 7) || mv.mesInicio)
      : mv.mesInicio;
    if (!ref || !/^\d{4}-\d{2}$/.test(ref) || distMes(ref, mo) !== 0) return 0;
    // Se calcula sobre el TOTAL de la compra y se acredita una sola vez
    bruto = mv.moneda === "USD" ? (+mv.montoUsd || 0) * tc : (+mv.monto || 0);
  }
  if (!bruto || bruto <= 0) return 0;
  const d = pct > 0 ? Math.min(bruto * pct / 100, tope > 0 ? tope : Infinity) : tope;
  return isFinite(d) && d > 0 ? d : 0;
}

function estimadosDelMes(movs, cfg, medios, mk) {
  const aj = (cfg.ajustes && cfg.ajustes[mk]) || {};
  const consumido = {};
  (movs || []).forEach((mv) => {
    if (mv.recurrente || !mv.consume) return;
    const v = montoEnMes(mv, mk, cfg.tc, medios);
    if (v > 0) consumido[mv.consume] = (consumido[mv.consume] || 0) + v;
  });
  if (mesCerradoOEnCurso(mk)) return [];
  return (movs || [])
    .filter(esEstimacion)
    .map((mv) => {
      const tocado = Object.prototype.hasOwnProperty.call(aj, mv.id);
      const base = tocado ? aj[mv.id] : montoEnMes(mv, mk, cfg.tc, medios);
      const usado = consumido[mv.id] || 0;
      return { mv, base, usado, queda: Math.max(0, base - usado) };
    })
    .filter((x) => x.base > 0);
}

// Lo que un mes deja con cada persona (+ te deben, − les debés), con la misma
// lógica que la proyección. Se usa para arrastrar lo que no se saldó en meses
// que ya pasaron y no aparecen en la proyección.
function saldosPersonasMes(arr, mk, cfg, medios) {
  const aj = (cfg.ajustes && cfg.ajustes[mk]) || {};
  const apl = (cfg.aplicados && cfg.aplicados[mk]) || {};
  const conResumen = cfg.resumenes || {};
  const saldos = {};
  (arr || []).forEach((mv) => {
    if (!mv.persona || mv.tipo === "ingreso" || mv.tipo === "ahorro") return;
    if (mv.recurrente && mv.medio && mv.medio !== "efectivo" && conResumen[mv.medio + "|" + mk]) return;
    const base = montoEnMes(mv, mk, cfg.tc, medios);
    const tocado = Object.prototype.hasOwnProperty.call(aj, mv.id);
    if (esEstimacion(mv) && !tocado && mesCerradoOEnCurso(mk)) return;
    let m = tocado ? aj[mv.id] : base;
    if (mv.pagadoPor === "otro") {
      if (!m) return;
      const pct = mv.pct != null && isFinite(+mv.pct) ? Math.min(1, Math.max(0, +mv.pct)) : 1;
      saldos[mv.persona] = (saldos[mv.persona] || 0) - m * pct;
      return;
    }
    // Pagado de tu caja: la parte de la otra persona te la sigue debiendo
    if (!m && tocado && apl[mv.id]) m = base;
    const p = isFinite(+mv.pct) ? Math.min(1, Math.max(0, +mv.pct)) : 0;
    if (m > 0 && p > 0) saldos[mv.persona] = (saldos[mv.persona] || 0) + m * p;
  });
  return saldos;
}

// Lo que se liquidó con cada persona en un mes ("Ya me lo pasó" / "Ya se lo pasé").
// + = te lo pasaron, − = se lo pasaste.
function liquidadoPersonas(cfg, mk) {
  const aj = (cfg.ajustes && cfg.ajustes[mk]) || {};
  const r = {};
  Object.keys(aj).forEach((k) => { if (k.startsWith("per|")) r[k.slice(4)] = +aj[k] || 0; });
  return r;
}

// Lo que quedó sin saldar con cada persona desde que la app lleva la cuenta
// (cfg.personasDesde) hasta el mes anterior a "hasta".
function arrastrePersonas(arr, cfg, medios, hasta) {
  const ini = cfg.personasDesde;
  const r = {};
  if (!ini || !/^\d{4}-\d{2}$/.test(ini) || ini >= hasta) return r;
  for (let mk = ini, g = 0; mk < hasta && g < 240; mk = sumaMes(mk, 1), g++) {
    const s = saldosPersonasMes(arr, mk, cfg, medios);
    const l = liquidadoPersonas(cfg, mk);
    new Set([...Object.keys(s), ...Object.keys(l)]).forEach((p) => {
      r[p] = (r[p] || 0) + (s[p] || 0) - (l[p] || 0);
    });
  }
  Object.keys(r).forEach((p) => { if (Math.abs(r[p]) < 1) delete r[p]; });
  return r;
}

function proyectar(cfg, movs, medios, meses, extra) {
  const arr = extra ? [...movs, extra] : movs;
  // Meses de los que YA tenemos el resumen real de una tarjeta. Para esos, los
  // recurrentes de esa tarjeta dejan de estimar: manda el dato del resumen.
  const conResumen = cfg.resumenes || {};
  const desde = cfg.desdeMes || mesDeHoy();
  const filas = [];
  // Lo que quedó sin saldar con cada persona en meses que ya pasaron: entra en el
  // primer mes de la proyección. En los meses que vienen se supone que se salda
  // en el mismo mes.
  const arrastre = arrastrePersonas(arr, cfg, medios, desde);
  for (let i = 0; i < meses; i++) {
    const mk = sumaMes(desde, i);
    const infl = Math.pow(1 + (cfg.ajuste || 0), i);
    const porMedio = {};
    const items = [];
    const reint = [];
    const deudas = [];
    // Cuenta corriente con cada persona: + es a mi favor, − es lo que le debo.
    // Al final del mes se cruzan las dos puntas y sale UN solo movimiento.
    const saldos = {};
    let ingresos = 0, excepcional = 0, ahorro = 0, usdComprados = 0;

    const aj = (cfg.ajustes && cfg.ajustes[mk]) || {};
    const apl = (cfg.aplicados && cfg.aplicados[mk]) || {};
    // Gastos reales cargados a mano que se comen la estimación de un recurrente
    // variable. Los juntamos antes para poder descontárselos abajo.
    const consumido = {};
    arr.forEach((mv) => {
      if (mv.recurrente || !mv.consume) return;
      const v = montoEnMes(mv, mk, cfg.tc, medios);
      if (v > 0) consumido[mv.consume] = (consumido[mv.consume] || 0) + v;
    });
    arr.forEach((mv) => {
      // Un recurrente de tarjeta es una ESTIMACIÓN: si ya importamos el resumen
      // real de ese mes, se calla y deja hablar a los movimientos de verdad.
      if (mv.recurrente && mv.medio && mv.medio !== "efectivo" && conResumen[mv.medio + "|" + mk]) return;
      const base = montoEnMes(mv, mk, cfg.tc, medios);
      const tocado = Object.prototype.hasOwnProperty.call(aj, mv.id);
      // Una estimación no tiene nada que hacer en un mes que ya viviste
      if (esEstimacion(mv) && !tocado && mesCerradoOEnCurso(mk)) return;
      const confirmado = mv.recurrente ? estaConfirmado(cfg, mk, mv.id) : true;
      // Ajuste puntual: este mes vale otra cosa (0 = ya pagado o no aplica).
      let m = tocado ? aj[mv.id] : base;
      if (mv.recurrente) m *= infl;
      // Ya cargaste el gasto real: la estimación se corre para no contar dos veces.
      const usado = consumido[mv.id] || 0;
      if (usado > 0 && m > 0) m = Math.max(0, m - usado);
      if (!m) {
        // Lo pagaste de tu caja y era compartido: la parte de la otra persona
        // te la sigue debiendo aunque el gasto ya esté saldado.
        if (tocado && apl[mv.id] && mv.pagadoPor !== "otro" && mv.persona && base > 0
            && mv.tipo !== "ingreso" && mv.tipo !== "ahorro") {
          const pp = isFinite(+mv.pct) ? Math.min(1, Math.max(0, +mv.pct)) : 0;
          if (pp > 0) {
            saldos[mv.persona] = (saldos[mv.persona] || 0) + base * pp;
            reint.push({ persona: mv.persona, monto: base * pp, detalle: mv.detalle });
          }
        }
        // Lo dejamos visible para poder revertirlo o ver que quedó cubierto.
        if (usado > 0 && base > 0)
          items.push({ mv, monto: 0, base, usado, saldado: true, cubierto: true, cuota: nroCuota(mv, mk) });
        else if (tocado && base > 0)
          items.push({ mv, monto: 0, base, saldado: true, cuota: nroCuota(mv, mk) });
        return;
      }
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
        // Lo puso otra persona con su plata: a vos te toca solo tu parte.
        // No sale de la caja acá: entra a la cuenta corriente con esa persona
        // y recién al final del mes se transfiere el neto.
        // El porcentaje tiene que vivir entre 0 y 1: fuera de ahí generaba deudas negativas
        const pct = mv.pct != null && isFinite(+mv.pct) ? Math.min(1, Math.max(0, +mv.pct)) : 1;
        const mio = m * pct;
        items.push({ mv, monto: mio, cuota: nroCuota(mv, mk), deuda: true });
        if (mv.persona) {
          saldos[mv.persona] = (saldos[mv.persona] || 0) - mio;
          deudas.push({ persona: mv.persona, monto: mio, detalle: mv.detalle });
        } else {
          // Sin persona no hay a quién cruzarle nada: sale de la caja y listo.
          porMedio.efectivo = (porMedio.efectivo || 0) + mio;
        }
        if (mv.excepcional) excepcional += mio;
        return;
      }
      // Lo pusiste vos. Si la plata YA salió antes de cargarlo (soloDeuda), no vuelve
      // a descontarse: lo único vivo es lo que te tienen que devolver.
      if (!mv.soloDeuda) porMedio[mv.medio] = (porMedio[mv.medio] || 0) + m;
      const p = mv.persona && isFinite(+mv.pct) ? Math.min(1, Math.max(0, +mv.pct)) : 0;
      if (p > 0) {
        saldos[mv.persona] = (saldos[mv.persona] || 0) + m * p;
        reint.push({ persona: mv.persona, monto: m * p, detalle: mv.detalle });
      }
      items.push({ mv, monto: m, cuota: nroCuota(mv, mk),
                   soloDeuda: !!mv.soloDeuda, usado,
                   credito: p > 0 ? m * p : 0,
                   estimado: mv.recurrente && !confirmado,
                   auto: esAuto(mv),
                   desvio: mv.recurrente && confirmado && tocado ? m - base : 0 });
      if (mv.excepcional && !mv.soloDeuda) excepcional += m;
    });

    // Reintegros del banco: se acreditan en el resumen de su tarjeta
    const devPorMedio = {};
    let totalDev = 0, devCaja = 0;
    arr.forEach((mv) => {
      const d = devolucionDe(mv, cfg.tc, medios, mk);
      if (d <= 0) return;
      // El reintegro lleva su propia clave: marcarlo como cobrado no tiene que
      // tocar el gasto que lo generó.
      const devKey = "dev|" + mv.id;
      const tocadoDev = Object.prototype.hasOwnProperty.call(aj, devKey);
      const monto = tocadoDev ? aj[devKey] : d;
      const aCaja = (mv.devDestino || "caja") !== "tarjeta";
      const medioDev = aCaja ? null : (mv.medio || "efectivo");
      if (!monto) {
        items.push({ mv, monto: 0, base: d, devolucion: true, devKey, aCaja, medioDev, saldado: true });
        return;
      }
      totalDev += monto;
      // Lo normal es que el banco te lo acredite en la caja de ahorro: es plata
      // que entra. Solo si lo aclarás, baja el resumen de la tarjeta.
      if (!aCaja) {
        devPorMedio[medioDev] = (devPorMedio[medioDev] || 0) + monto;
      } else {
        devCaja += monto;
        ingresos += monto;
      }
      items.push({ mv, monto, devolucion: true, devKey, aCaja, medioDev });
    });

    // Se cruzan las dos puntas y queda UN número por persona.
    // Negativo = le transferís. Positivo = te transfiere.
    // A eso se le suma lo que viene sin saldar de antes (solo el primer mes) y se
    // le resta lo que ya se liquidó este mes. neto = lo que FALTA mover.
    const liq = liquidadoPersonas(cfg, mk);
    const arr0 = i === 0 ? arrastre : {};
    const netos = [...new Set([...Object.keys(saldos), ...Object.keys(arr0), ...Object.keys(liq)])]
      .map((persona) => {
        const mes = saldos[persona] || 0, vieneDe = arr0[persona] || 0, ya = liq[persona] || 0;
        return { persona, neto: Math.round(mes + vieneDe - ya), mes: Math.round(mes),
                 arrastre: Math.round(vieneDe), liquidado: Math.round(ya) };
      })
      .filter((x) => x.neto !== 0 || x.liquidado !== 0)
      .sort((a, b) => Math.abs(b.neto) - Math.abs(a.neto));
    netos.forEach((x) => {
      if (x.neto < 0) porMedio.efectivo = (porMedio.efectivo || 0) - x.neto;
    });

    Object.keys(porMedio).forEach((k) => {
      if (k !== "efectivo") porMedio[k] *= 1 + (cfg.sellos || 0);
    });
    // El reintegro es un crédito: no paga sellos, así que se resta después
    Object.keys(devPorMedio).forEach((k) => {
      porMedio[k] = (porMedio[k] || 0) - devPorMedio[k];
    });
    let tarjetas = 0;
    Object.keys(porMedio).forEach((k) => { if (k !== "efectivo") tarjetas += porMedio[k]; });
    const efvo = porMedio["efectivo"] || 0;
    const totalReint = netos.reduce((a, x) => a + Math.max(0, x.neto), 0);
    const totalDeudas = netos.reduce((a, x) => a + Math.max(0, -x.neto), 0);
    const totIng = ingresos + totalReint;
    const egresos = tarjetas + efvo;
    filas.push({
      mk, ingresos: totIng, egresos, tarjetas, efvo, reint, totalReint,
      deudas, netos, totalDeudas, totalDev, devCaja, devPorMedio, excepcional, ahorro, usdComprados,
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

/* ===================== ESCENARIOS (capa ficticia) ===================== */
// Un escenario NUNCA toca tus movimientos: toma la proyección real, le saca lo que
// reemplaza y le suma lo suyo. Todo vive en cfg.escenarios.

// Inflación mensual por tramos: cada tasa vale desde su mes hasta el próximo tramo.
const INFL_BASE = [
  { desde: "2026-07", tasa: 0.018 },   // jul y ago-26: supuesto, editalo
  { desde: "2026-09", tasa: 0.018 },
  { desde: "2026-10", tasa: 0.017 },
  { desde: "2026-11", tasa: 0.016 },
  { desde: "2026-12", tasa: 0.018 },
  { desde: "2027-01", tasa: 0.017 },
  { desde: "2027-02", tasa: 0.016 },
  { desde: "2027-03", tasa: 0.015 },
  { desde: "2028-01", tasa: 0.011 },
  { desde: "2029-01", tasa: 0.0085 },
  { desde: "2030-01", tasa: 0.0075 },
  { desde: "2031-01", tasa: 0.0065 },
];

// Arma las funciones de inflación, índice de precios y UVA para un juego de supuestos.
// base = mes de los "pesos de hoy" (índice 1). uva = { mes, valor } conocido.
// real = { "2026-08": 0.019, ... } inflación ya publicada: le gana a cualquier supuesto.
// ajuste = { mult, shockMes, shockPct }: para los casos optimista / pesimista.
function crearMacro(tramosIn, base, uvaAncla, real, ajuste) {
  const tramos = (tramosIn && tramosIn.length ? tramosIn : INFL_BASE)
    .filter((t) => t && /^\d{4}-\d{2}$/.test(t.desde))
    .slice().sort((a, b) => (a.desde < b.desde ? -1 : 1));
  const cInf = {}, cIdx = {}, cUva = {};
  const b = base || mesDeHoy();
  const aj = ajuste || {};
  const infl = (mk) => {
    if (cInf[mk] != null) return cInf[mk];
    if (real && real[mk] != null && isFinite(+real[mk])) return (cInf[mk] = +real[mk]);
    let t = tramos.length ? +tramos[0].tasa || 0 : 0;
    for (const x of tramos) { if (x.desde <= mk) t = +x.tasa || 0; else break; }
    // El caso solo mueve el futuro: lo que ya pasó no se reescribe
    if (mk > b && aj.mult != null && isFinite(+aj.mult)) t *= +aj.mult;
    if (aj.shockMes && mk === aj.shockMes) t += +aj.shockPct || 0;
    return (cInf[mk] = t);
  };
  // índice(b) = 1 · índice(m) = índice(m-1) × (1 + inflación de m)
  const idx = (mk) => {
    if (cIdx[mk] != null) return cIdx[mk];
    const d = distMes(b, mk);
    let v = 1;
    if (d > 0) for (let i = 1; i <= d; i++) v *= 1 + infl(sumaMes(b, i));
    if (d < 0) for (let i = 0; i > d; i--) v /= 1 + infl(sumaMes(b, i));
    return (cIdx[mk] = v);
  };
  // UVA(t) = UVA(t-1) × (1 + inflación de t-2)
  const ua = uvaAncla && uvaAncla.mes ? uvaAncla : { mes: b, valor: 1 };
  const uva = (mk) => {
    if (cUva[mk] != null) return cUva[mk];
    const d = distMes(ua.mes, mk);
    let v = +ua.valor || 1;
    if (d > 0) for (let i = 1; i <= d; i++) v *= 1 + infl(sumaMes(ua.mes, i - 2));
    if (d < 0) for (let i = 0; i > d; i--) v /= 1 + infl(sumaMes(ua.mes, i - 2));
    return (cUva[mk] = v);
  };
  return { infl, idx, uva, base: b };
}

// Préstamo en sistema francés, en UVA (o en pesos si uva === false), con IVA sobre intereses.
function cronogramaPrestamo(p, macro) {
  if (!p || !(+p.monto > 0) || !(+p.cuotas > 0)) return [];
  const n = Math.round(+p.cuotas);
  const r = (+p.tna || 0) / 12;
  const iva = p.iva != null ? +p.iva : 0.21;
  const enUva = p.uva !== false;
  const u = (mk) => (enUva ? macro.uva(mk) : 1);
  const u0 = u(p.desembolso || sumaMes(p.primera, -1));
  let saldo = +p.monto / u0;
  const pura = r > 0 ? (saldo * r) / (1 - Math.pow(1 + r, -n)) : saldo / n;
  const out = [];
  for (let k = 1; k <= n; k++) {
    const mk = sumaMes(p.primera, k - 1);
    const interes = saldo * r;
    const amort = Math.min(saldo, pura - interes);
    const ivaU = interes * iva;
    saldo = Math.max(0, saldo - amort);
    const uv = u(mk);
    out.push({
      k, mk, uva: uv,
      cuota: (amort + interes + ivaU) * uv,
      interes: interes * uv, iva: ivaU * uv, amort: amort * uv,
      saldoPost: saldo * uv,
    });
  }
  return out;
}

// Cuánto rinde un mes el instrumento donde está el fondo (multiplicador sobre el saldo).
function rendimientoMes(inst, macro, mk) {
  const t = (inst && inst.tipo) || "pfuva";
  const tna = inst && inst.tna != null ? +inst.tna : 0.01;
  if (t === "pfuva") return (macro.uva(mk) / macro.uva(sumaMes(mk, -1))) * (1 + tna / 12);
  if (t === "pf" || t === "fci") return 1 + tna / 12;
  if (t === "mep") return 1 + (inst && inst.dev != null ? +inst.dev : 0);
  return 1;   // "ninguno": el colchón queda quieto
}

// Valor de un ítem del escenario en un mes.
function valorItemEsc(it, mk, macro) {
  if (!it || !(+it.monto > 0)) return 0;
  if (it.desde && mk < it.desde) return 0;
  if (it.hasta && mk > it.hasta) return 0;
  if (it.meses && it.meses.length && !it.meses.includes(+mk.slice(5, 7))) return 0;
  const m = +it.monto;
  if (it.ajuste === "inflacion") return m * macro.idx(mk);
  if (it.ajuste === "periodico" && it.primerAjuste) {
    const cada = Math.max(1, +it.cada || 6);
    const d = distMes(it.primerAjuste, mk);
    if (d < 0) return m;
    const ult = sumaMes(it.primerAjuste, Math.floor(d / cada) * cada);
    return m * macro.idx(sumaMes(ult, -1));   // cubre la inflación hasta el mes anterior al ajuste
  }
  return m;
}

// Sueldo del escenario mes a mes. El neto es el de "hoy" (mes base). Cada ajuste cubre
// la inflación desde el último mes cubierto hasta "rezago" meses antes del mes del ajuste.
// Con rezago 3, el ajuste de marzo cubre hasta diciembre: ventanas parejas de 6 meses.
function sueldoEscenario(s, macro, desde, meses) {
  const out = {};
  if (!s || !(+s.neto > 0)) return out;
  let v = +s.neto;
  let cubierto = s.ultimoCubierto || sumaMes(macro.base, -2);
  const ajustes = (s.ajustes && s.ajustes.length ? s.ajustes : [3, 9]).map(Number);
  const fin = sumaMes(desde, meses - 1);
  for (let mk = sumaMes(macro.base, 1); mk <= fin; mk = sumaMes(mk, 1)) {
    if (ajustes.includes(+mk.slice(5, 7))) {
      const hasta = sumaMes(mk, -Math.max(1, +s.rezago || 3));
      let fac = 1;
      for (let j = sumaMes(cubierto, 1); j <= hasta; j = sumaMes(j, 1)) fac *= 1 + macro.infl(j);
      // cobertura 1 = empata la inflación; 0,85 = el sueldo pierde contra los precios
      const cob = s.cobertura != null && isFinite(+s.cobertura) ? +s.cobertura : 1;
      v *= 1 + (fac - 1) * cob;
      if (hasta > cubierto) cubierto = hasta;
    }
    if (s.meritoMes && mk === s.meritoMes && +s.meritoPct) v *= 1 + +s.meritoPct / 100;
    out[mk] = v;
  }
  return out;
}

const macroDeEscenario = (esc, base) =>
  crearMacro(esc && esc.inflacion, base || (esc && esc.base), esc && esc.uva,
             esc && esc.inflacionReal, esc && esc.ajusteMacro);

// ¿Y si sale mejor o peor? Dos casos editables que se aplican encima de tus supuestos.
const CASOS_DEF = {
  optimista: { nombre: "Optimista", inflMult: 0.7, cobertura: 1, shockMes: "", shockPct: 0,
               devMult: 0.7, tasaMult: 0.8 },
  pesimista: { nombre: "Pesimista", inflMult: 1.5, cobertura: 0.85, shockMes: "2027-11", shockPct: 0.06,
               devMult: 1.8, tasaMult: 1.3 },
};
const casosDe = (esc) => ({
  optimista: { ...CASOS_DEF.optimista, ...((esc && esc.casos && esc.casos.optimista) || {}) },
  pesimista: { ...CASOS_DEF.pesimista, ...((esc && esc.casos && esc.casos.pesimista) || {}) },
});
// Ajusta un instrumento según el caso: el dólar y las tasas acompañan (o no) a la inflación
function instrumentoEnCaso(inst, caso) {
  if (!inst || !caso) return inst;
  if (inst.tipo === "mep") return { ...inst, dev: (+inst.dev || 0) * (+caso.devMult || 1) };
  if (inst.tipo === "pf" || inst.tipo === "fci") return { ...inst, tna: (+inst.tna || 0) * (+caso.tasaMult || 1) };
  return inst;
}
function aplicarCaso(esc, caso) {
  if (!esc || !caso) return esc;
  const f = esc.fondo || {};
  return {
    ...esc,
    ajusteMacro: { mult: +caso.inflMult || 1, shockMes: caso.shockMes || "", shockPct: +caso.shockPct || 0 },
    sueldo: { ...(esc.sueldo || {}), cobertura: caso.cobertura != null ? +caso.cobertura : 1 },
    fondo: { ...f, instrumento: instrumentoEnCaso(f.instrumento || { tipo: "pfuva", tna: 0.01 }, caso) },
  };
}

// Métricas para comparar casos, todas en pesos de hoy
function metricasEscenario(res) {
  const fs = res.filas;
  const peor = fs.reduce((a, b) => (b.queda / b.ix < a.queda / a.ix ? b : a), fs[0]);
  const cuotaMax = fs.reduce((a, b) => (b.cuotaEsc / b.ix > a.cuotaEsc / a.ix ? b : a), fs[0]);
  const ult = fs[fs.length - 1];
  return {
    cancelado: res.cancelado,
    peorMes: peor.mk, peorQueda: peor.queda / peor.ix,
    enRojo: fs.filter((x) => x.queda < 0).length,
    cuotaMax: cuotaMax.cuotaEsc / cuotaMax.ix, cuotaMaxMes: cuotaMax.mk,
    ahorroFinal: ult.ahorro / ult.ix, intIvaHoy: res.intIvaHoy,
  };
}

// Tus gastos fijos reales (y los préstamos que se indexan, como el de ANSES) acompañan
// la inflación de a saltos: cada N meses, alineados con los meses en que ajusta tu sueldo.
function configFijos(esc, movs) {
  const f = esc.fijos || {};
  const modo = f.modo || (esc.fijosConInflacion === false ? "fijo" : "periodico");
  const cada = Math.max(1, Math.min(12, +f.cada || 3));
  const ancla = +(((esc.sueldo || {}).ajustes || [3])[0] || 3);
  // Cómo ajusta cada préstamo: lo que elegiste en este escenario manda; si no,
  // lo que dice el préstamo; si no, la lista vieja (o por el nombre, como ANSES).
  const reales = (movs || []).filter((m) => m.tipo === "gasto" && m.categoria === "Préstamos" && m.recurrente);
  const porEsc = f.ajustes || {};
  const tipoDe = {};
  reales.forEach((m) => {
    let t = porEsc[m.id];
    if (!t) t = m.ajustaPor;
    if (!t) t = Array.isArray(f.prestamos) ? (f.prestamos.includes(m.id) ? "inflacion" : "fija")
      : (/anses|personal/i.test(m.detalle || "") ? "inflacion" : "fija");
    tipoDe[m.id] = t;
  });
  const prestamos = reales.filter((m) => tipoDe[m.id] === "inflacion").map((m) => m.id);
  const hogar = reales.filter((m) => tipoDe[m.id] === "sueldo").map((m) => m.id);
  return { modo, cada, ancla, prestamos, hogar, tipoDe };
}
const mesesDeAjuste = (fc) =>
  MESN.map((n, i) => ((((i + 1 - fc.ancla) % fc.cada) + fc.cada) % fc.cada === 0 ? n : null)).filter(Boolean);
// Cuánto subieron tus fijos en un mes: la inflación acumulada hasta el mes anterior al último ajuste
function factorFijos(fc, mk, macro) {
  if (fc.modo !== "periodico") return 1;
  for (let d = 0; d < fc.cada; d++) {
    const m = sumaMes(mk, -d);
    if (m <= macro.base) return 1;
    if ((((+m.slice(5, 7) - fc.ancla) % fc.cada) + fc.cada) % fc.cada === 0) return macro.idx(sumaMes(m, -1));
  }
  return 1;
}

const esPrestamoOCuota = (mv) =>
  mv && mv.tipo === "gasto" &&
  (mv.categoria === "Préstamos" || (!mv.recurrente && (+mv.cuotas || 1) > 1));

// El corazón: la proyección de un escenario, mes a mes.
function proyectarEscenario(esc, cfg, movs, medios, opts) {
  const o = opts || {};
  const desde = esc.desde || sumaMes(mesDeHoy(), 1);
  const meses = Math.max(1, Math.min(120, +esc.meses || 60));
  const macro = macroDeEscenario(esc);
  const sellos = cfg.sellos || 0;

  // 1) Tu flujo real, sin lo que el escenario reemplaza
  const s = esc.sueldo || {};
  const fuera = new Set([...(esc.quitar || []), ...(s.activo !== false ? (s.quitar || []) : [])]);
  const base = o.base || proyectar({ ...cfg, desdeMes: desde, ajuste: 0, saldoHoy: 0, reservasUsd: 0 },
    (movs || []).filter((m) => !fuera.has(m.id)), medios, meses, null);

  // 2) Lo propio del escenario
  const sueldo = s.activo !== false ? sueldoEscenario(s, macro, desde, meses) : {};
  const crono = cronogramaPrestamo(esc.prestamo, macro);
  const cuotaDe = {}; crono.forEach((c) => { cuotaDe[c.mk] = c; });
  const f = esc.fondo || {};
  const p = esc.prestamo || {};
  const inst = f.instrumento || { tipo: "pfuva", tna: 0.01 };
  const penal = (k) => (k <= (+p.penalidadHasta || 0) ? +p.penalidad || 0 : 0);
  const autoCancel = o.sinCancelar ? false : p.autoCancelar !== false;

  const fc = configFijos(esc, movs);
  let fondo = +f.inicial || 0;
  let libreAc = +esc.inicial || 0;
  let cancelado = null;
  let intIvaHoy = 0, intIvaNom = 0;
  const filas = [];

  for (let i = 0; i < meses; i++) {
    const mk = sumaMes(desde, i);
    const r = base[i];
    const ix = macro.idx(mk);

    // Préstamos y cuotas reales (con sellos si son de tarjeta), y tus fijos reales
    let prest = 0, fijos = 0, prestAj = 0, prestSue = 0;
    r.items.forEach((it) => {
      if (it.ingreso || it.ahorro || it.devolucion || it.deuda || it.soloDeuda || !it.monto) return;
      const conSellos = it.monto * (it.mv.medio && it.mv.medio !== "efectivo" ? 1 + sellos : 1);
      if (esPrestamoOCuota(it.mv)) {
        prest += conSellos;
        if (fc.prestamos.includes(it.mv.id)) prestAj += conSellos;
        else if (fc.hogar.includes(it.mv.id)) prestSue += conSellos;
      } else if (it.mv.recurrente) {
        // Lo que te devuelve otra persona (Betty, etc.) sube igual, así que ajustamos solo tu parte
        fijos += conSellos - (it.credito || 0);
      }
    });
    const facFijos = factorFijos(fc, mk, macro);

    // Ingresos
    let entra = r.ingresos;
    const sue = sueldo[mk] || 0;
    const aguin = s.activo !== false && (s.mesesAguinaldo || [6, 12]).includes(+mk.slice(5, 7))
      ? sue * ((+s.aguinaldo || 0) + (+s.bono || 0)) : 0;
    entra += sue + aguin;
    const extras = (f.extras || []).filter((x) => x.mes === mk && +x.monto > 0)
      .reduce((a, x) => a + +x.monto * ix, 0);
    entra += extras;

    // Gastos: lo real que no es préstamo/cuota + ítems del escenario
    let gastos = r.egresos - prest;
    gastos += fijos * (facFijos - 1);
    prest += prestAj * (facFijos - 1);
    // HogAr: la cuota acompaña a los sueldos, mes a mes. Si el escenario no
    // simula tu sueldo, sigue a la inflación.
    if (prestSue) {
      // La cuota de hoy va con el sueldo de hoy: sube lo mismo que sube tu sueldo desde acá
      const s0 = s.activo !== false ? +s.neto || 0 : 0;
      const facSue = s0 > 0 && sueldo[mk] > 0 ? sueldo[mk] / s0 : ix;
      prest += prestSue * (facSue - 1);
    }
    let prestEsc = 0;
    const det = [];
    (esc.items || []).forEach((it) => {
      const v = valorItemEsc(it, mk, macro);
      if (!v) return;
      if (it.tipo === "ingreso") { entra += v; return; }
      if (it.clase === "prestamo") prestEsc += v; else gastos += v;
      det.push({ nombre: it.nombre, v });
    });
    prest += prestEsc;

    // Préstamo del escenario
    const c = cuotaDe[mk];
    const cuotaEsc = c && !cancelado ? c.cuota : 0;
    if (c && !cancelado) {
      intIvaNom += c.interes + c.iva;
      intIvaHoy += (c.interes + c.iva) / ix;
    }

    const queda = entra - gastos - prest - cuotaEsc;

    // Fondo: primero rinde lo que ya había, después entra lo de este mes
    let separa = 0;
    if (f.desde && mk >= f.desde) separa += (+f.aporte || 0) * (f.aporteSube === false ? 1 : ix);
    if (aguin && f.aguinaldoDesde && mk >= f.aguinaldoDesde) separa += aguin * (+f.pctAguinaldo || 0);
    separa += extras;
    fondo = fondo * rendimientoMes(inst, macro, mk) + separa;

    // Cancelación automática
    let cancelacion = 0;
    const colchon = (+p.colchon || 0) * ix;
    if (c && !cancelado && autoCancel && c.k >= (+p.cancelarDesde || 1) && c.saldoPost > 0) {
      const necesita = c.saldoPost * (1 + penal(c.k));
      if (fondo >= necesita + colchon) {
        cancelacion = necesita;
        fondo -= necesita;
        cancelado = { k: c.k, mk, monto: necesita, penalidad: c.saldoPost * penal(c.k),
                      colchon: fondo, colchonHoy: fondo / ix };
        intIvaHoy += (c.saldoPost * penal(c.k)) / ix;
        intIvaNom += c.saldoPost * penal(c.k);
      }
    }

    const libre = queda - separa;
    libreAc += libre;
    filas.push({
      mk, ix, entra, gastos, prest, cuotaEsc, queda, separa, libre,
      fondo, libreAc, ahorro: fondo + libreAc, cancelacion,
      cuotaK: c && (!cancelado || cancelado.mk === mk) ? c.k : null, saldoPrestamo: c && !cancelado ? c.saldoPost : (c && cancelado && cancelado.mk === mk ? 0 : null),
      sueldo: sue, aguinaldo: aguin, detalle: det,
    });
  }

  // Ahorro al cierre de cada año (o del último mes)
  const anual = [];
  filas.forEach((x, i) => {
    if (x.mk.slice(5) === "12" || i === filas.length - 1)
      anual.push({ anio: x.mk.slice(0, 4), mk: x.mk, ahorro: x.ahorro, ahorroHoy: x.ahorro / x.ix });
  });

  return { filas, cancelado, anual, intIvaHoy, intIvaNom, crono, macro, baseReal: base };
}

// Cuánta plata extra haría falta para cancelar en ciertas cuotas (sin cancelación automática)
function faltanteParaCancelar(esc, cfg, movs, medios, cuotas, baseReal) {
  const sin = proyectarEscenario(esc, cfg, movs, medios, { sinCancelar: true, base: baseReal });
  const p = esc.prestamo || {};
  return (cuotas || [15, 18, 24, 30, 36]).map((k) => {
    const c = sin.crono[k - 1];
    if (!c) return null;
    const fila = sin.filas.find((x) => x.mk === c.mk);
    if (!fila) return null;
    const pen = k <= (+p.penalidadHasta || 0) ? +p.penalidad || 0 : 0;
    const necesita = c.saldoPost * (1 + pen) + (+p.colchon || 0) * fila.ix;
    const falta = Math.max(0, necesita - fila.fondo);
    return { k, mk: c.mk, saldo: c.saldoPost, fondo: fila.fondo, necesita, falta, faltaHoy: falta / fila.ix };
  }).filter(Boolean);
}

// El escenario "Territory Titanium 2023", armado con tus supuestos.
// Busca tus movimientos por nombre para saber qué reemplazar.
function escenarioTerritory(movs) {
  const buscar = (re, id) => {
    const m = (movs || []).find((x) => x.id === id) ||
              (movs || []).find((x) => x.recurrente && re.test(x.detalle || ""));
    return m ? m.id : null;
  };
  const quitar = [
    buscar(/d[ií]a a d[ií]a/i, "tc_diaadia"), buscar(/^disco/i, "tc_disco"),
    buscar(/^shell/i, "tc_shell"), buscar(/^combustible/i, "tc_comb"),
    buscar(/almuerzos/i, "fx_almuerzos"), buscar(/^telepase/i, "tc_telepase"),
    buscar(/patronal \(resto\)/i, "tc_fedpat"),
  ].filter(Boolean);
  const sueldoQuitar = (movs || []).filter((m) => m.tipo === "ingreso" &&
    (m.id === "in_sueldo" || /sueldo|aguin|extra de dic/i.test(m.detalle || ""))).map((m) => m.id);
  const bolsa = (nombre, monto, modo, desde) =>
    ({ id: "b" + nombre.slice(0, 4).toLowerCase() + monto, tipo: "gasto", nombre, monto,
       desde, ajuste: "inflacion", bolsa: true, modo });
  return {
    id: "esc" + Date.now(),
    nombre: "Territory Titanium 2023",
    activo: true,
    base: "2026-09",
    desde: "2026-11",
    meses: 60,
    inicial: 0,
    inflacion: INFL_BASE.map((x) => ({ ...x })),
    uva: { mes: "2026-10", valor: 2150.5 },
    sueldo: {
      activo: true, neto: 3100000, ajustes: [3, 9], ultimoCubierto: "2026-06", rezago: 3,
      meritoPct: 0, meritoMes: "", aguinaldo: 0.516, bono: 0.452, mesesAguinaldo: [6, 12],
      quitar: sueldoQuitar,
    },
    prestamo: {
      nombre: "Prendario UVA Territory", monto: 18400000, tna: 0.20, cuotas: 60, iva: 0.21, uva: true,
      desembolso: "2026-10", primera: "2026-11",
      penalidad: 0.04, penalidadHasta: 14, cancelarDesde: 15, colchon: 1000000, autoCancelar: true,
    },
    quitar,
    items: [
      bolsa("Súper", 210000, "reinicia", "2026-11"),
      bolsa("Almuerzos y viandas", 100000, "reinicia", "2026-11"),
      bolsa("Salidas y juntadas", 108000, "reinicia", "2026-11"),
      bolsa("Nafta", 100000, "reinicia", "2026-11"),
      bolsa("Uber y Telepase", 40000, "reinicia", "2026-11"),
      bolsa("Farmacia y salud", 70000, "reinicia", "2026-11"),
      bolsa("Peluquería", 30000, "reinicia", "2026-11"),
      bolsa("Leña", 29000, "acumula", "2026-10"),
      bolsa("Otros / esporádicos", 40000, "reinicia", "2026-11"),
      bolsa("Ropa", 100000, "acumula", "2027-05"),
      { id: "fpresto", tipo: "gasto", nombre: "Federación Patronal (resto)", monto: 136918,
        desde: "2026-11", ajuste: "periodico", cada: 6, primerAjuste: "2027-04" },
    ],
    fondo: {
      inicial: 0, aporte: 200000, aporteSube: true, desde: "2027-03",
      pctAguinaldo: 0.5, aguinaldoDesde: "2027-06",
      instrumento: { tipo: "pfuva", tna: 0.01 },
      extras: [
        { id: "x1", nombre: "Plata de mi familia", monto: 0, mes: "2027-03" },
        { id: "x2", nombre: "Otro ingreso", monto: 0, mes: "2027-06" },
      ],
    },
  };
}

/* ===================== SIMULADOR DE INVERSIONES ===================== */
const INSTRUMENTOS = [
  { id: "pf",     nombre: "Plazo fijo",       campo: "tna", def: 0.28 },
  { id: "pfuva",  nombre: "Plazo fijo UVA",   campo: "tna", def: 0.01 },
  { id: "fci",    nombre: "FCI money market", campo: "tna", def: 0.25 },
  { id: "mep",    nombre: "Dólar MEP",        campo: "dev", def: 0.015 },
  { id: "cancelar", nombre: "Cancelar el préstamo antes" },
];

// Una simulación: arranca con "inicial" y suma "aporte" al final de cada mes.
function simularInstrumento(sim, inst, macro) {
  const desde = sim.desde || sumaMes(mesDeHoy(), 1);
  const n = Math.max(1, Math.min(120, +sim.meses || 12));
  let v = +sim.inicial || 0;
  let puesto = v, puestoHoy = v / macro.idx(sumaMes(desde, -1));
  const tc0 = +sim.tcMep || 0;
  let tc = tc0;
  const filas = [];
  for (let i = 0; i < n; i++) {
    const mk = sumaMes(desde, i);
    const ix = macro.idx(mk);
    v *= rendimientoMes(inst, macro, mk);
    if (inst.tipo === "mep") tc *= 1 + (+inst.dev || 0);
    const ap = (+sim.aporte || 0) * (sim.aporteSube ? ix : 1);
    v += ap; puesto += ap; puestoHoy += ap / ix;
    filas.push({ mk, valor: v, valorHoy: v / ix, puesto, puestoHoy,
                 ganancia: v - puesto, gananciaHoy: v / ix - puestoHoy,
                 usd: inst.tipo === "mep" && tc ? v / tc : null, tc });
  }
  return filas;
}

// "Cancelar antes": juntás la plata sin rendimiento y cancelás apenas alcanza.
// La ganancia es lo que te ahorrás en intereses + IVA (menos la penalidad), en pesos de hoy.
function simularCancelacion(sim, esc, macro) {
  if (!esc || !esc.prestamo) return null;
  const crono = cronogramaPrestamo(esc.prestamo, macro);
  const p = esc.prestamo;
  const desde = sim.desde || sumaMes(mesDeHoy(), 1);
  let pozo = +sim.inicial || 0;
  const n = Math.max(1, Math.min(120, +sim.meses || 12));
  for (let i = 0; i < n; i++) {
    const mk = sumaMes(desde, i);
    pozo += (+sim.aporte || 0) * (sim.aporteSube ? macro.idx(mk) : 1);
    const c = crono.find((x) => x.mk === mk);
    if (!c || c.saldoPost <= 0) continue;
    const pen = c.k <= (+p.penalidadHasta || 0) ? +p.penalidad || 0 : 0;
    if (pozo >= c.saldoPost * (1 + pen)) {
      const resto = crono.filter((x) => x.k > c.k);
      const ahorroHoy = resto.reduce((a, x) => a + (x.interes + x.iva) / macro.idx(x.mk), 0)
                      - (c.saldoPost * pen) / macro.idx(mk);
      return { k: c.k, mk, monto: c.saldoPost * (1 + pen), ahorroHoy, sobra: pozo - c.saldoPost * (1 + pen) };
    }
  }
  return { k: null, falta: true };
}

/* ===================== PLAN DE AHORRO CON LICITACIÓN (capa ficticia) ===================== */
// Un plan de ahorro (tipo Plan Óvalo) simulado encima de tu flujo. Igual que los escenarios,
// NUNCA toca tus movimientos: vive en cfg.planes. t = número de cuota; t = 1 es el mes "inicio".
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
                      "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function planVacio() {
  return {
    id: "plan" + Date.now(), nombre: "Plan Ford → Territory", activo: true,
    inicio: "2026-10",
    vm: 64137920, pctFin: 0.8, cuotasPlan: 120, admin: 0.121,
    vida: 58860, vidaModo: "saldo",
    admision: 38803, admisionCuotas: 99,
    cuotaFija: 448711, fijaHasta: 13,
    integracion: 12827584, cuotasPagas: 98,
    ipc: 0.02, autoSuba: 0.02, inflModo: "fija",
    mAdj: 1, oferta: 16250000, sobrante: "baja",
    cronosVenta: 19000000, cronosPatente: 2500000, cronosEntrega: "acto", cronosSuba: 0,
    mesesRetiro: 2, gastosRetiro: 3000000,
    seguroNuevo: 150000, seguroViejo: 136918, naftaExtra: 20000, patenteNueva: 0,
    tope: 700000,
    rinde: "inflacion", inicialModo: "auto", inicial: 0,
    escenarioId: "",
  };
}

// Tu plan real: Territory SEL 70/30 en 84 cuotas con entrega pactada en cuota 3 (VIEL),
// retirando la Trend Híbrida. Tres planes iguales que solo cambian cuánto sube el auto
// por mes después de las cuotas fijas (y el Cronos acompaña esa suba).
function planesTerritoryVIEL() {
  const base = {
    inicio: "2026-10",
    vm: 48861930, pctFin: 0.7, cuotasPlan: 84, admin: 0.121,       // 0,0833% + IVA sobre la pura
    vida: 20000, vidaModo: "saldo",
    admision: 29561, admisionCuotas: 60,                              // 0,05% + IVA, cuotas 2 a 61
    cuotaFija: 409000, fijaHasta: 12,                                 // $409k final, fija hasta la 12 (se mantiene post swap)
    integracion: 14658579, cuotasPagas: 84,                           // 30% complementaria
    ipc: 0.017, inflModo: "fija",
    mAdj: 3, oferta: 19544772, sobrante: "baja",                      // 40% en cuota 3 (swap VIEL)
    // El Cronos lo toma VIEL como el 40%: cuenta en el mismo mes del acto
    cronosVenta: 23000000, cronosPatente: 0, cronosEntrega: "acto",
    mesesRetiro: 1,                                                   // pedido en dic, retiro en ene
    gastosRetiro: 3300000,                                            // cambio SEL → Híbrida
    seguroNuevo: 191918, seguroViejo: 136918, naftaExtra: 0, patenteNueva: 0,
    tope: 700000, rinde: "inflacion", inicialModo: "auto", inicial: 0, escenarioId: "",
  };
  return [["baja", 0.012], ["media", 0.017], ["alta", 0.025]].map(([n, a], k) => ({
    ...base, id: "plan" + Date.now() + k,
    nombre: "Territory Híbrida · auto +" + (a * 100).toFixed(1).replace(".", ",") + "%/mes",
    autoSuba: a, cronosSuba: a,
    activo: n === "media",   // solo uno prendido para que Hoy no lo cuente tres veces
  }));
}

// Los tres casos de licitación que querés tener a mano
const PRESETS_PLAN = [
  { id: "A", mAdj: 1, oferta: 16250000 },
  { id: "B", mAdj: 4, oferta: 18000000 },
  { id: "C", mAdj: 10, oferta: 19000000 },
];
const nombrePreset = (p, pr) => "Gano en " + MESES_LARGOS[+sumaMes(p.inicio, pr.mAdj - 1).slice(5, 7) - 1];

// El escenario del que sale tu flujo sin el plan: el que elegiste, o el primero, o los
// supuestos por defecto. Sin su préstamo, y con la inflación del plan (así todo está en la misma moneda).
function escenarioBasePlan(p, cfg, movs) {
  const lista = cfg.escenarios || [];
  const e0 = lista.find((x) => x.id === p.escenarioId) || lista[0] || escenarioTerritory(movs);
  const e = { ...e0, prestamo: null, ajusteMacro: null };
  if (p.inflModo !== "escenario") {
    e.inflacion = [{ desde: "2000-01", tasa: +p.ipc || 0 }];
    // Lo ya publicado sigue valiendo para el pasado; del plan en adelante manda tu supuesto
    const real = {};
    Object.entries(e0.inflacionReal || {}).forEach(([mk, v]) => { if (mk < p.inicio) real[mk] = v; });
    e.inflacionReal = real;
  }
  return e;
}

// Índices del plan con t = 1 → 1. ipc: precios en general. auto: valor móvil del auto.
function indicesPlan(p, macro) {
  if (p.inflModo === "escenario" && macro) {
    const m0 = macro.idx(p.inicio);
    const f = (t) => macro.idx(sumaMes(p.inicio, t - 1)) / m0;
    return { ipc: f, auto: f };
  }
  const i = +p.ipc || 0, a = +p.autoSuba || 0;
  return { ipc: (t) => Math.pow(1 + i, t - 1), auto: (t) => Math.pow(1 + a, t - 1) };
}

// Las cuotas del plan y todo lo que mueve el escenario mes a mes (sin tu flujo).
function calcularPlan(p, ix) {
  const N = Math.max(1, Math.round(+p.cuotasPagas || 1));
  const C = Math.max(1, Math.round(+p.cuotasPlan || 120));
  const pura = ((+p.vm || 0) * (+p.pctFin || 0)) / C;
  const admin = pura * (+p.admin || 0);
  const fijaHasta = Math.max(1, Math.round(+p.fijaHasta || 13));
  const mAdj = Math.max(1, Math.min(N, Math.round(+p.mAdj || 1)));
  // Las cuotas que adelantás se reparten entre las que quedan después de la fija (o del acto)
  const libres = Math.max(0, N - Math.max(mAdj, fijaHasta));
  let E = pura > 0 ? Math.floor(((+p.oferta || 0) - (+p.integracion || 0)) / pura + 1e-9) : 0;
  E = Math.max(0, Math.min(E, libres));
  const acorta = p.sobrante === "acorta";
  const factor = !acorta && libres > 0 ? 1 - E / libres : 1;
  const ultima = acorta ? N - E : N;
  const tRet = mAdj + Math.max(0, Math.round(+p.mesesRetiro || 0));
  const tCron = p.cronosEntrega === "retiro" ? tRet : mAdj;
  const H = Math.max(ultima, tRet, tCron);
  const ofertaNom = ((+p.integracion || 0) + E * pura) * ix.auto(mAdj);
  const cronosVenta = (+p.cronosVenta || 0) * Math.pow(1 + (+p.cronosSuba || 0), tCron - 1);
  const cronosNeto = cronosVenta - (+p.cronosPatente || 0);
  const vida0 = +p.vida || 0, adm0 = +p.admision || 0, admN = +p.admisionCuotas || 0;

  const filas = [];
  for (let t = 1; t <= H; t++) {
    const ia = ix.auto(t), ii = ix.ipc(t);
    let cuota = 0, det = null;
    if (t <= ultima && t > 1) {
      if (t <= fijaHasta) cuota = +p.cuotaFija || 0;
      else {
        const fx = t > mAdj ? factor : 1;
        const pu = pura * ia * fx;
        const ad = admin * ia;
        let vi;
        if (p.vidaModo === "constante") vi = vida0 * ia;
        else {
          // El seguro de vida se calcula sobre lo que te falta pagar
          const rem = t < mAdj ? C - t + 1 : (ultima - t + 1) * fx;
          vi = (vida0 * ia * rem) / C;
        }
        const am = t <= 1 + admN ? adm0 * ia : 0;
        cuota = pu + ad + vi + am;
        det = { pura: pu, admin: ad, vida: vi, admision: am };
      }
    }
    const oferta = t === mAdj ? ofertaNom : 0;
    const cronos = t === tCron ? cronosNeto : 0;
    const retiro = t === tRet ? (+p.gastosRetiro || 0) * ii : 0;
    const seguroNuevo = t >= tRet ? (+p.seguroNuevo || 0) * ii : 0;
    const seguroViejo = t >= tCron ? (+p.seguroViejo || 0) * ii : 0;
    const nafta = t >= tRet ? (+p.naftaExtra || 0) * ii : 0;
    const patente = t >= tRet ? (+p.patenteNueva || 0) * ii : 0;
    const neto = -cuota - oferta + cronos - retiro - seguroNuevo + seguroViejo - nafta - patente;
    const cuotaSegHoy = (cuota + seguroNuevo) / ii;
    filas.push({
      t, mk: sumaMes(p.inicio, t - 1), ia, ii, cuota, det, oferta, cronos, retiro,
      seguroNuevo, seguroViejo, nafta, patente, neto, cuotaSegHoy,
      pasaTope: +p.tope > 0 && cuotaSegHoy > +p.tope + 0.5,
      nro: t <= ultima ? t : null, esActo: t === mAdj, esRetiro: t === tRet,
    });
  }
  return { filas, pura, admin, E, factor, ultima, mAdj, tRet, tCron, H, N,
           ofertaNom, cronosVenta, cronosNeto, fijaHasta };
}

// Tu flujo SIN el plan, mes a mes, desde el mes de la cuota 1.
// Mientras dure el horizonte de Hoy, sale de Hoy (lo que tenés cargado, tal cual lo ves ahí).
// Después, del motor de escenarios (sueldo con aumentos, aguinaldo, fijos y bolsas que
// ajustan), sin su préstamo. Devuelve también el saldo con el que arrancás.
function flujoBasePlan(p, cfg, movs, medios, esc, meses) {
  const hoy = cfg.desdeMes || mesDeHoy();
  const ini = p.inicio;
  const fin = sumaMes(ini, meses - 1);
  const desdeEsc = esc.desde || sumaMes(hoy, 1);
  const trasHoy = sumaMes(hoy, Math.max(1, +cfg.horizonte || 6));      // primer mes que Hoy no muestra
  const corte = desdeEsc > trasHoy ? desdeEsc : trasHoy;                 // primer mes del escenario
  const out = {};

  // 1) Lo de Hoy, y hasta el mes previo al plan para saber con cuánto arrancás
  const realDesde = ini < hoy ? ini : hoy;
  const topeReal = corte <= fin ? sumaMes(corte, -1) : fin;
  const realHasta = topeReal > sumaMes(ini, -1) ? topeReal : sumaMes(ini, -1);
  let saldoAuto = +cfg.saldoHoy || 0;
  if (realHasta >= realDesde) {
    const n = distMes(realDesde, realHasta) + 1;
    const r = proyectar({ ...cfg, desdeMes: realDesde }, movs, medios, n, null);
    r.forEach((f) => {
      if (f.mk >= ini && f.mk < corte) out[f.mk] = { v: f.resultado, de: "hoy" };
      if (ini > hoy && f.mk === sumaMes(ini, -1)) saldoAuto = f.saldo;
    });
  }

  // 2) El escenario base
  if (corte <= fin) {
    const n = Math.min(120, distMes(desdeEsc, fin) + 1);
    const res = proyectarEscenario({ ...esc, meses: n }, cfg, movs, medios);
    let ult = null;
    res.filas.forEach((f) => { if (f.mk >= ini && f.mk >= corte) { out[f.mk] = { v: f.queda, de: "esc" }; ult = f; } });
    // Si el plan pasa los 120 meses del motor, estiramos el último mes con la inflación
    if (ult) for (let mk = sumaMes(ult.mk, 1); mk <= fin; mk = sumaMes(mk, 1))
      out[mk] = { v: ult.queda * (res.macro.idx(mk) / ult.ix), de: "esc" };
  }
  return { porMes: out, saldoAuto, corte };
}

// Lo pesado (tu flujo sin el plan) aparte, para no recalcularlo cada vez que tocás un número del plan.
function basePlan(p, cfg, movs, medios, meses) {
  const esc = escenarioBasePlan(p, cfg, movs);
  const n = meses || Math.min(120, Math.max(1, Math.round(+p.cuotasPagas || 1)) +
                                   Math.max(0, Math.round(+p.mesesRetiro || 0)));
  return { esc, macro: macroDeEscenario(esc), meses: n, ...flujoBasePlan(p, cfg, movs, medios, esc, n) };
}

// Todo junto: el plan, tu flujo y los dos saldos (con y sin el plan).
function simularPlan(p, base) {
  const ix = indicesPlan(p, base.macro);
  const plan = calcularPlan(p, ix);
  const saldoIni = p.inicialModo === "manual" ? +p.inicial || 0 : base.saldoAuto;
  let sin = saldoIni, con = saldoIni;
  plan.filas.forEach((f) => {
    // Tu ahorro rinde lo mismo que la inflación (PF UVA) o se queda quieto
    const r = p.rinde === "nada" ? 1 : ix.ipc(f.t) / ix.ipc(f.t - 1);
    const b = (base.porMes[f.mk] || {}).v || 0;
    sin = sin * r + b;
    con = con * r + b + f.neto;
    f.base = b; f.deBase = (base.porMes[f.mk] || {}).de || "";
    f.saldoSin = sin; f.saldoCon = con;
  });

  // Resumen
  const F = plan.filas;
  const acto = F[plan.mAdj - 1], ret = F[plan.tRet - 1], ult = F[plan.ultima - 1];
  const mismoMes = plan.tCron === plan.mAdj;
  const saleAhorro = mismoMes ? Math.max(0, plan.ofertaNom - plan.cronosNeto) : plan.ofertaNom;
  const sobra = mismoMes ? Math.max(0, plan.cronosNeto - plan.ofertaNom) : 0;
  const hasta = F.slice(0, Math.max(plan.tRet, plan.tCron));
  const faltaEn = hasta.find((f) => f.saldoCon < 0) || null;
  const faltaActo = acto.saldoCon < 0 ? acto : null;
  // Si quedás en rojo, ¿cuándo volvés a positivo?
  const recupera = faltaEn ? F.slice(faltaEn.t).find((f) => f.saldoCon >= 0) || null : null;
  const despues = F.slice(plan.tRet - 1);
  const minCon = despues.reduce((a, f) => (f.saldoCon / f.ii < a.saldoCon / a.ii ? f : a), despues[0]);
  const maxCS = F.reduce((a, f) => (f.cuotaSegHoy > a.cuotaSegHoy ? f : a), F[0]);
  const totalCuotasHoy = F.reduce((a, f) => a + f.cuota / f.ii, 0);
  const ofertaHoy = plan.ofertaNom / acto.ii;
  const fin = F[F.length - 1];
  return {
    ...plan, esc: base.esc, ix, saldoIni,
    resumen: {
      acto, ret, ult, saleAhorro, sobra, mismoMes, faltaEn, faltaActo, recupera,
      colchon: ret.saldoCon, colchonHoy: ret.saldoCon / ret.ii,
      minCon, minConHoy: minCon.saldoCon / minCon.ii,
      maxCS, sobreTope: F.filter((f) => f.pasaTope),
      totalCuotasHoy, ofertaHoy, retiroHoy: +p.gastosRetiro || 0,
      totalHoy: totalCuotasHoy + ofertaHoy,
      fin, finSinHoy: fin.saldoSin / fin.ii, finConHoy: fin.saldoCon / fin.ii,
    },
  };
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
            background: T.papel, borderRadius: "22px 22px 0 0", padding: 22,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 -8px 40px -12px rgba(14,43,37,.3)" }}>
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

/* ===================== CARGA RÁPIDA ===================== */
// Un gasto en tres toques: monto, con qué lo pagaste, listo.
function Rapido({ medios, movs = [], cfg = {}, onGuardar, onDetallado, onImportar, onCerrar }) {
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [medio, setMedio] = useState(medios[0]?.id || "efectivo");
  const [cuotas, setCuotas] = useState(1);
  const [consume, setConsume] = useState("");

  const n = parseInt(monto || "0", 10);
  const tecla = (t) => {
    if (t === "b") return setMonto(monto.slice(0, -1));
    if (t === "000") return setMonto(monto.length < 8 ? monto + "000" : monto);
    if (monto.length < 10) setMonto((monto === "0" ? "" : monto) + t);
  };
  const guardar = () => {
    if (n <= 0) return;
    onGuardar({
      id: "m" + Date.now(), tipo: "gasto", detalle: detalle.trim() || "Gasto",
      monto: n, moneda: "ARS", medio, cuotas, fecha: hoyISO(),
      mesInicio: mesDePago(hoyISO(), medio, medios),
      categoria: adivinarCategoria(detalle), recurrente: false, pagadoPor: "yo",
      ...(cuotas === 1 && consume ? { consume } : {}),
    });
    onCerrar();
  };
  const cat = adivinarCategoria(detalle);
  const catNom = cat !== "Otros" ? cat : null;
  const mesPago = mesDePago(hoyISO(), medio, medios);
  // Estimados variables de ese mes que todavía tienen saldo sin usar
  const candidatos = useMemo(
    () => (cuotas === 1 ? estimadosDelMes(movs, cfg, medios, mesPago).filter((x) => x.queda > 0) : []),
    [movs, cfg, medios, mesPago, cuotas]
  );
  const elegido = candidatos.find((x) => x.mv.id === consume);

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 85,
                  display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between",
                    alignItems: "center" }}>
        <button onClick={onCerrar} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
        <span style={{ fontSize: 14.5, fontWeight: 620 }}>Nuevo gasto</span>
        <button onClick={onDetallado} style={{ fontSize: 13.5, color: T.ambar, fontWeight: 600 }}>
          Más opciones
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
                    padding: "0 20px", minHeight: 0 }}>
        <div className="plata" style={{ fontSize: 46, textAlign: "center", letterSpacing: "-0.04em",
              color: n > 0 ? T.tinta : T.tenue, fontVariantNumeric: "tabular-nums" }}>
          {n > 0 ? plata(n) : "$0"}
        </div>
        {cuotas > 1 && n > 0 && (
          <div style={{ textAlign: "center", fontSize: 13, color: T.suave, marginTop: 6 }}>
            {cuotas} cuotas de <b className="num">{plata(Math.round(n / cuotas))}</b>
          </div>
        )}

        <input value={detalle} onChange={(e) => setDetalle(e.target.value)}
          placeholder="¿En qué? (opcional)"
          style={{ marginTop: 18, textAlign: "center", fontSize: 16, background: "transparent",
                   border: "none", borderBottom: `1px solid ${T.linea}`, borderRadius: 0 }} />
        {catNom && detalle.trim() && (
          <div style={{ textAlign: "center", fontSize: 12, color: T.tenue, marginTop: 7 }}>
            lo guardo en {catNom}
          </div>
        )}

        <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto",
              marginTop: 18, paddingBottom: 3 }}>
          {medios.map((m) => (
            <button key={m.id} className={"chip sm" + (medio === m.id ? " on" : "")}
              onClick={() => setMedio(m.id)}>{m.corto || m.nombre}</button>
          ))}
        </div>

        {medio !== "efectivo" && (
          <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto",
                marginTop: 9, paddingBottom: 3 }}>
            {[1, 3, 6, 9, 12, 18].map((c) => (
              <button key={c} className={"chip sm" + (cuotas === c ? " on" : "")}
                onClick={() => setCuotas(c)}>{c === 1 ? "1 pago" : c + " cuotas"}</button>
            ))}
          </div>
        )}

        {n > 0 && candidatos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: T.suave, textAlign: "center", marginBottom: 8 }}>
              ¿Es alguno de tus gastos estimados de {etiqMesLargo(mesPago)}?
            </div>
            <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto",
                  paddingBottom: 3, justifyContent: candidatos.length < 3 ? "center" : "flex-start" }}>
              <button className={"chip sm" + (!consume ? " on" : "")}
                onClick={() => setConsume("")}>No, es aparte</button>
              {candidatos.map((x) => (
                <button key={x.mv.id} className={"chip sm" + (consume === x.mv.id ? " on" : "")}
                  onClick={() => setConsume(consume === x.mv.id ? "" : x.mv.id)}>
                  {x.mv.detalle} · quedan {corta(x.queda)}
                </button>
              ))}
            </div>
            {elegido && (
              <div style={{ fontSize: 12, color: T.suave, marginTop: 8, textAlign: "center",
                            lineHeight: 1.5 }}>
                {n >= elegido.queda
                  ? `Con esto queda cubierto: la estimación de ${elegido.mv.detalle} baja a cero.`
                  : `La estimación de ${elegido.mv.detalle} baja a ${plata(elegido.queda - n)}.`}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 12, color: T.suave, marginTop: 13, textAlign: "center" }}>
          {medio === "efectivo" ? "Sale de tu caja ahora"
            : `Lo pagás en ${etiqMesLargo(mesPago)}`}
        </div>
      </div>

      <div style={{ padding: "10px 12px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {["1","2","3","4","5","6","7","8","9","000","0","b"].map((t) => (
            <button key={t} onClick={() => tecla(t)}
              style={{ padding: "17px 0", fontSize: t === "b" ? 19 : 22, fontWeight: 500,
                       background: T.card, borderRadius: 13, border: `1px solid ${T.linea}` }}>
              {t === "b" ? "⌫" : t}
            </button>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 10, opacity: n > 0 ? 1 : 0.4 }} onClick={guardar}>
          Guardar
        </button>
        {onImportar && n === 0 && (
          <button onClick={onImportar}
            style={{ marginTop: 11, width: "100%", fontSize: 13.5, color: T.ambar, fontWeight: 600 }}>
            O importá el PDF de un resumen
          </button>
        )}
      </div>
    </div>
  );
}

/* ===================== IMPORTAR RESUMEN ===================== */
// pdf.js se carga desde CDN cuando hace falta: no engorda la app ni pide build especial.
async function cargarPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((ok, err) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = ok; s.onerror = () => err(new Error("No pude cargar el lector de PDF"));
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
}

// Reconstruye las líneas respetando la posición horizontal, como hace pdftotext -layout
async function textoDelPdf(file, pass) {
  const pdfjs = await cargarPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf, password: pass || undefined }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    const filas = {};
    c.items.forEach((it) => {
      const y = Math.round(it.transform[5]);
      const x = Math.round(it.transform[4] / 4.7);
      (filas[y] = filas[y] || []).push({ x, t: it.str });
    });
    Object.keys(filas).sort((a, b) => b - a).forEach((y) => {
      let l = "";
      filas[y].sort((a, b) => a.x - b.x).forEach((it) => {
        while (l.length < it.x) l += " ";
        l += it.t;
      });
      out += l + "\n";
    });
  }
  return out;
}

function ImportarResumen({ medios, movs, onImportar, onCerrar }) {
  const [etapa, setEtapa] = useState("elegir");   // elegir | leyendo | revisar
  const [error, setError] = useState("");
  const [pass, setPass] = useState("");
  const [pidePass, setPidePass] = useState(false);
  const [arch, setArch] = useState(null);
  const [res, setRes] = useState(null);
  const [sel, setSel] = useState({});
  const [medio, setMedio] = useState("");
  const [dudoso, setDudoso] = useState(false);

  const yaEsta = (m) => movs.some((x) =>
    x.detalleOrig === m.detalle && Math.round(x.montoCuota || 0) === Math.round(m.monto) && x.fechaCompra === m.fecha);
  const [reemplazar, setReemplazar] = useState(true);
  const [accion, setAccion] = useState({});   // id del gasto sin match -> "mover" | "borrar" | "dejar"

  // El resumen es la verdad de ese mes para esa tarjeta. Buscamos lo que ya
  // tenías cargado a mano en ese mes y tarjeta, y lo emparejamos con las líneas del
  // resumen para no contarlo dos veces (y no perder con quién lo compartiste).
  const mesRes = res && res.ciclos && res.ciclos.vto ? res.ciclos.vto.slice(0, 7) : null;
  const plan = useMemo(() => {
    const vacio = { match: {}, sinMatch: [] };
    if (!res || !medio || !mesRes) return vacio;
    const porCuota = (x) => x.moneda === "USD"
      ? (+x.montoUsd || 0) / Math.max(1, x.cuotas || 1)
      : (+x.montoCuota || (+x.monto || 0) / Math.max(1, x.cuotas || 1));
    const cands = movs.filter((x) => x.tipo === "gasto" && !x.recurrente && x.medio === medio
      && x.pagadoPor !== "otro" && x.mesInicio && distMes(x.mesInicio, mesRes) >= 0
      && distMes(x.mesInicio, mesRes) < Math.max(1, x.cuotas || 1));
    const dias = (a, b) => (a && b) ? Math.abs((new Date(a + "T12:00:00") - new Date(b + "T12:00:00")) / 86400000) : 99;
    const palabras = (t) => normBusca(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    // Todos los pares posibles con su puntaje; después se asignan de mejor a peor,
    // así un gasto que no cargaste no le "roba" la pareja a otro parecido.
    const pares = [];
    res.movs.forEach((m, i) => {
      if (yaEsta(m)) return;
      const usd = !!m.montoUsd, val = usd ? +m.montoUsd : +m.monto;
      const pa = palabras(m.detalle + " " + limpiarComercio(m.detalle));
      cands.forEach((x) => {
        if ((x.moneda === "USD") !== usd) return;
        const v = porCuota(x);
        const dif = Math.abs(v - val);
        const d = dias(x.fechaCompra || x.fecha, m.fecha);
        const nombre = palabras((x.detalleOrig || "") + " " + (x.detalle || "")).some((w) =>
          pa.some((q) => q.includes(w) || w.includes(q)));
        const exacto = dif <= (usd ? 0.01 : 1);
        const cerca = dif <= val * 0.005;
        // Importe distinto solo si el nombre coincide y la fecha es casi la misma
        const tolerable = nombre && d <= 3 && dif <= val * 0.05;
        if (!exacto && !cerca && !tolerable) return;
        if (d > 5 && !nombre) return;
        // Sin fecha cargada (gastos viejos en cuotas): alcanza con nombre + importe
        if (d > 45 && !(d === 99 && nombre && (exacto || cerca))) return;
        const p = (exacto ? 4 : cerca ? 2 : 0) + (d === 0 ? 4 : d <= 1 ? 3 : d <= 3 ? 2 : d <= 5 ? 1 : 0)
                + (nombre ? 2 : 0);
        pares.push({ i, x, p, d, dif });
      });
    });
    pares.sort((a, b) => b.p - a.p || a.d - b.d || a.dif - b.dif);
    const usados = new Set(), match = {};
    pares.forEach(({ i, x }) => {
      if (match[i] || usados.has(x.id)) return;
      match[i] = x; usados.add(x.id);
    });
    // Lo que cargaste para ese resumen pero el banco no trae
    const cierre = res.ciclos && res.ciclos.cierre;
    const sinMatch = cands.filter((x) => !usados.has(x.id) && !x.detalleOrig).map((x) => {
      const fx = x.fechaCompra || x.fecha;
      // Si es posterior al cierre, va al próximo resumen. Si es anterior, debería estar
      // en este: seguramente figura con otro importe.
      return { ...x, _dentro: !!(fx && cierre && fx <= cierre) };
    });
    return { match, sinMatch };
  }, [res, medio, movs, mesRes]);

  const procesar = async (file, clave) => {
    setEtapa("leyendo"); setError("");
    try {
      const txt = await textoDelPdf(file, clave);
      const r = leerResumen(txt);
      if (!r.movs.length) throw new Error("No encontré movimientos. ¿Es el resumen completo?");
      // Un banco puede tener varias tarjetas: hay que mirar banco Y marca, si no
      // un resumen de Mastercard cae en la Visa del mismo banco.
      // Ojo: no llamarla "clave", que es el parámetro con la contraseña del PDF
      const claveBanco = (r.banco || "").split(" ").pop().toLowerCase();   // "icbc", "nación", "provincia"
      const esMaster = (t) => /master|mc\b/i.test(t);
      const puntaje = (x) => {
        const n = ((x.nombre || "") + " " + (x.corto || "") + " " + (x.banco || "")).toLowerCase();
        let p = 0;
        if (claveBanco && claveBanco !== "desconocido" && n.includes(claveBanco)) p += 2;
        if (esMaster(n) === (r.marca === "Mastercard")) p += 3;       // la marca pesa más
        return p;
      };
      const candidatos = medios.filter((m) => m.id !== "efectivo");
      const mejor = candidatos.map((m) => ({ m, p: puntaje(m) })).sort((a, b) => b.p - a.p)[0];
      const auto = mejor && mejor.p >= 4 ? mejor.m : null;             // banco + marca, o nada
      setMedio(auto ? auto.id : "");
      setDudoso(!auto);
      const s = {};
      r.movs.forEach((m, i) => { s[i] = !yaEsta(m); });
      setAccion({});
      setRes(r); setSel(s); setEtapa("revisar"); setPidePass(false);
    } catch (e) {
      const msg = String(e && e.message);
      if (/password|contrase/i.test(msg)) { setPidePass(true); setEtapa("elegir"); setError("El PDF tiene contraseña. Suele ser tu DNI."); }
      else { setEtapa("elegir"); setError(msg || "No pude leer el archivo"); }
    }
  };

  const importar = () => {
    const mesPago = res.ciclos.vto ? res.ciclos.vto.slice(0, 7) : mesDeHoy();
    const cambios = [];   // { id, accion: "borrar" | "truncar" | "mover", cuotas? }
    const nuevos = res.movs.map((m, i) => [m, i]).filter(([, i]) => sel[i]).map(([m, i], k) => {
      // El resumen muestra el valor de UNA cuota; la app guarda el total y lo reparte.
      const restantes = Math.max(1, m.cuotas - m.cuota + 1);
      const viejo = reemplazar ? plan.match[i] : null;
      if (viejo) {
        // El viejo queda solo con los meses anteriores a este resumen
        const antes = distMes(viejo.mesInicio, mesPago);
        cambios.push(antes > 0 ? { id: viejo.id, accion: "truncar", cuotas: antes } : { id: viejo.id, accion: "borrar" });
      }
      const hereda = viejo ? {
        ...(viejo.persona ? { persona: viejo.persona, pct: viejo.pct } : {}),
        ...(viejo.categoria ? { categoria: viejo.categoria } : {}),
        ...(viejo.excepcional ? { excepcional: true } : {}),
        ...(viejo.soloDeuda ? { soloDeuda: true } : {}),
        ...(viejo.consume && restantes === 1 ? { consume: viejo.consume } : {}),
        ...(viejo.devPct || viejo.devTope ? { devPct: viejo.devPct, devTope: viejo.devTope,
                                               devMes: viejo.devMes, devDestino: viejo.devDestino } : {}),
        // Si le pusiste un nombre propio, lo respetamos
        ...(viejo.detalle && !viejo.detalleOrig ? { detalle: viejo.detalle } : {}),
      } : {};
      return {
        id: "imp" + Date.now() + "_" + k,
        tipo: "gasto",
        detalle: limpiarComercio(m.detalle),
        detalleOrig: m.detalle,
        fechaCompra: m.fecha,
        montoCuota: m.monto,
        monto: m.montoUsd ? 0 : Math.round(m.monto * restantes),
        montoUsd: m.montoUsd ? m.montoUsd * restantes : null,
        moneda: m.montoUsd ? "USD" : "ARS",
        medio, cuotas: restantes,
        mesInicio: mesPago,
        categoria: adivinarCategoria(limpiarComercio(m.detalle) + " " + m.detalle),
        recurrente: false, pagadoPor: "yo",
        // Bonificación del comercio sobre una compra en cuotas: reintegro único en este resumen
        ...(m.bonif ? { devTope: Math.round(m.bonif), devDestino: "tarjeta", devMes: "mismo" } : {}),
        ...hereda,
      };
    });
    if (reemplazar) plan.sinMatch.forEach((x) => {
      const a = accion[x.id] || (x._dentro ? "dejar" : "mover");
      if (a === "borrar") cambios.push({ id: x.id, accion: "borrar" });
      if (a === "mover") cambios.push({ id: x.id, accion: "mover", mes: sumaMes(mesPago, 1) });
    });
    // Si el resumen trae fechas de ciclo, las guardamos: se acaba tener que cargarlas a mano
    onImportar(nuevos, res.ciclos, medio, res.fin, cambios);
    onCerrar();
  };

  const marcados = Object.values(sel).filter(Boolean).length;
  const dif = res && res.control.dif;
  const cuadra = res && dif !== null && Math.abs(dif) < 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 88, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onCerrar} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
        <span style={{ fontSize: 15, fontWeight: 620 }}>Importar resumen</span>
        {etapa === "revisar"
          ? <button onClick={() => medio && marcados && importar()}
                    style={{ fontSize: 15, fontWeight: 620,
                    color: (marcados && medio) ? T.tinta : T.tenue }}>Importar</button>
          : <span style={{ width: 60 }} />}
      </div>

      <div style={{ padding: 16, paddingBottom: 40 }}>
        {etapa === "elegir" && (
          <>
            <div style={{ fontSize: 13.5, color: T.suave, lineHeight: 1.6, marginBottom: 16 }}>
              Subí el PDF del resumen que te manda el banco. Leo los consumos, las cuotas
              y las fechas de cierre. <b>El archivo no sale de tu teléfono.</b>
              <br /><br />
              Los gastos fijos que tengas cargados para esa tarjeta se usan para estimar los
              meses que todavía no tienen resumen. Cuando importás uno, ese mes pasa a usar
              los datos reales y la estimación se hace a un lado, así nada se cuenta dos veces.
            </div>
            {error && (
              <div className="aviso" style={{ background: T.rojoBg, color: T.rojo, marginBottom: 14 }}>{error}</div>
            )}
            {pidePass && (
              <>
                <label className="lbl">Contraseña del PDF</label>
                <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Suele ser tu DNI" />
                <button className="btn" style={{ marginTop: 12 }}
                  onClick={() => arch && procesar(arch, pass)}>Reintentar</button>
              </>
            )}
            <label className="btn" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
              Elegir el PDF
              <input type="file" accept="application/pdf" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files[0]; if (f) { setArch(f); procesar(f, pass); } }} />
            </label>
            <div style={{ fontSize: 12, color: T.tenue, marginTop: 14, lineHeight: 1.6 }}>
              Funciona con resúmenes Visa y Mastercard de bancos argentinos. Tiene que ser el PDF
              original, no una foto ni una captura.
            </div>
          </>
        )}

        {etapa === "leyendo" && (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.suave, fontSize: 14 }}>
            Leyendo el resumen…
          </div>
        )}

        {etapa === "revisar" && res && (
          <>
            <div className="card" style={{ padding: 15, marginBottom: 14 }}>
              <div style={{ fontSize: 14.5, fontWeight: 620 }}>{res.banco} · {res.marca}</div>
              {res.ciclos.cierre && (
                <div style={{ fontSize: 12.5, color: T.suave, marginTop: 5, lineHeight: 1.6 }}>
                  Cerró el {res.ciclos.cierre.split("-").reverse().slice(0, 2).join("/")}
                  {res.ciclos.vto && ` y vence el ${res.ciclos.vto.split("-").reverse().slice(0, 2).join("/")}`}
                  {res.ciclos.proxCierre && (
                    <><br />Próximo cierre {res.ciclos.proxCierre.split("-").reverse().slice(0, 2).join("/")}
                    {res.ciclos.proxVto && `, vence ${res.ciclos.proxVto.split("-").reverse().slice(0, 2).join("/")}`}
                    {" — los guardo así no los cargás a mano"}</>
                  )}
                </div>
              )}
              <div className="aviso" style={{ marginTop: 11, padding: "9px 11px", fontSize: 12.5,
                    background: cuadra ? T.verdeBg : T.ambarBg, color: cuadra ? T.verde : T.ambar }}>
                {cuadra
                  ? `Los ${res.movs.length} movimientos suman exactamente el total del resumen.`
                  : `Ojo: lo que leí difiere ${plata(Math.abs(dif || 0))} del total declarado. Revisá antes de importar.`}
              </div>
            </div>

            <label className="lbl">¿A qué tarjeta van?</label>
            {dudoso && (
              <div className="aviso" style={{ background: T.ambarBg, color: T.ambar, marginBottom: 9 }}>
                No pude identificar la tarjeta con seguridad. Elegila vos antes de importar.
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {medios.filter((m) => m.id !== "efectivo").map((m) => (
                <button key={m.id} className={"chip sm" + (medio === m.id ? " on" : "")}
                  onClick={() => setMedio(m.id)}>{m.corto || m.nombre}</button>
              ))}
            </div>

            {medio && mesRes && (Object.keys(plan.match).length > 0 || plan.sinMatch.length > 0) && (
              <div className="card" style={{ padding: 15, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 620 }}>
                    Reemplazar lo cargado en {etiqMesLargo(mesRes)}
                  </span>
                  <button className={"chip sm" + (reemplazar ? " on" : "")}
                    onClick={() => setReemplazar(!reemplazar)}>{reemplazar ? "Sí" : "No"}</button>
                </div>
                <div style={{ fontSize: 12.5, color: T.suave, marginTop: 6, lineHeight: 1.55 }}>
                  {reemplazar
                    ? "El resumen pasa a ser lo real de esta tarjeta en ese mes. Lo que cargaste a mano se reemplaza por la línea del banco, y se mantiene con quién lo compartiste, la categoría y el nombre que le pusiste."
                    : "Se agregan las líneas marcadas y no se toca nada de lo que ya cargaste. Ojo que puede quedar duplicado."}
                </div>
                {reemplazar && Object.keys(plan.match).length > 0 && (
                  <div style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.6 }}>
                    <b>{Object.keys(plan.match).length}</b> {Object.keys(plan.match).length === 1 ? "gasto cargado a mano coincide" : "gastos cargados a mano coinciden"} con el resumen
                    y {Object.keys(plan.match).length === 1 ? "se reemplaza" : "se reemplazan"} (los ves marcados abajo).
                  </div>
                )}
                {reemplazar && plan.sinMatch.length > 0 && (
                  <>
                    <div style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.55 }}>
                      <b>No los encontré en el resumen</b> ({plan.sinMatch.length}). ¿Qué hago con cada uno?
                    </div>
                    {plan.sinMatch.map((x) => (
                      <div key={x.id} style={{ borderTop: `1px solid ${T.linea}`, marginTop: 9, paddingTop: 9 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span>{x.detalle}{x.persona ? ` · con ${x.persona}` : ""}</span>
                          <span className="num">{x.moneda === "USD" ? `USD ${x.montoUsd}` : plata(x.montoCuota || (x.monto || 0) / Math.max(1, x.cuotas || 1))}</span>
                        </div>
                        {x._dentro && (
                          <div style={{ fontSize: 11.5, color: T.ambar, marginTop: 4, lineHeight: 1.45 }}>
                            Es de antes del cierre: si figura en el resumen con otro importe, borralo.
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                          {[["mover", "Al próximo resumen"], ["dejar", "Dejarlo"], ["borrar", "Borrarlo"]].map(([v, n]) => (
                            <button key={v} className={"chip sm" + ((accion[x.id] || (x._dentro ? "dejar" : "mover")) === v ? " on" : "")}
                              onClick={() => setAccion({ ...accion, [x.id]: v })}>{n}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                          marginBottom: 9 }}>
              <span style={{ fontSize: 14.5, fontWeight: 620 }}>{marcados} de {res.movs.length}</span>
              <button onClick={() => {
                const todos = marcados < res.movs.length;
                const s = {}; res.movs.forEach((_, i) => { s[i] = todos; }); setSel(s);
              }} style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}>
                {marcados < res.movs.length ? "Marcar todos" : "Desmarcar todos"}
              </button>
            </div>

            <div className="card" style={{ overflow: "hidden" }}>
              {res.movs.map((m, i) => {
                const rep = yaEsta(m);
                const rest = Math.max(1, m.cuotas - m.cuota + 1);
                return (
                  <button key={i} onClick={() => setSel({ ...sel, [i]: !sel[i] })}
                    style={{ width: "100%", textAlign: "left", padding: "11px 14px",
                             borderTop: i ? `1px solid ${T.linea}` : "none",
                             display: "flex", gap: 11, alignItems: "flex-start",
                             opacity: sel[i] ? 1 : 0.45 }}>
                    <span style={{ marginTop: 2, fontSize: 15, color: sel[i] ? T.verde : T.tenue }}>
                      {sel[i] ? "●" : "○"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 560 }}>
                        {limpiarComercio(m.detalle)}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: T.tenue, marginTop: 2 }}>
                        {m.fecha.split("-").reverse().join("/")}
                        {m.cuotas > 1 && ` · cuota ${m.cuota} de ${m.cuotas} · quedan ${rest}`}
                        {rep && " · ya lo tenés cargado"}
                        {!rep && reemplazar && plan.match[i] && (
                          <span style={{ color: T.verde }}>
                            {` · reemplaza "${plan.match[i].detalle}"`}{plan.match[i].persona ? ` (con ${plan.match[i].persona})` : ""}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="num" style={{ fontSize: 13.5, whiteSpace: "nowrap" }}>
                      {m.montoUsd ? `USD ${m.montoUsd}` : plata(m.monto)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== PANTALLA INVERTIDO ===================== */
function Invertido({ cfg, setCfg, tc }) {
  const lista = cfg.inversiones || [];
  const usd = +cfg.reservasUsd || 0;
  const valorUsd = usd * tc;
  const [editUsd, setEditUsd] = useState(false);
  const [borrUsd, setBorrUsd] = useState("");
  const [edit, setEdit] = useState(null);
  const [estado, setEstado] = useState("");
  const [tasas, setTasas] = useState(null);
  const base = resumenInversiones(lista, tc);
  const r = { ...base, total: base.total + valorUsd,
              porTipo: valorUsd > 0 ? { Dólares: valorUsd, ...base.porTipo } : base.porTipo };

  // Trae los precios de mercado y actualiza solo lo que tenga ticker
  const actualizarPrecios = async () => {
    const conTicker = lista.filter((x) => x.ticker && API_MERCADO[x.tipo]);
    if (!conTicker.length) { setEstado("No tenés papeles con ticker para actualizar"); return; }
    setEstado("Buscando precios…");
    try {
      const tipos = [...new Set(conTicker.map((x) => x.tipo))];
      const mapas = {};
      for (const t of tipos) mapas[t] = await traerPrecios(t);
      let n = 0;
      const nueva = lista.map((x) => {
        const p = x.ticker && mapas[x.tipo] ? mapas[x.tipo][x.ticker.toUpperCase()] : null;
        if (!p) return x;
        n++;
        return { ...x, precioActual: p, precioFecha: hoyISO() };
      });
      setCfg({ ...cfg, inversiones: nueva });
      setEstado(n ? `Actualicé ${n} ${n === 1 ? "papel" : "papeles"}` : "No encontré esos tickers");
    } catch (e) {
      setEstado("No pude conectarme. Probá más tarde o cargá el precio a mano.");
    }
  };

  const cargarTasas = async () => {
    if (tasas) return;
    try { setTasas(await traerTasas()); } catch (e) { setTasas([]); }
  };

  const vacio = { tipo: "plazofijo", nombre: "", ticker: "", cantidad: "", precioCompra: "",
                  precioActual: "", moneda: "ARS", tna: "", fecha: hoyISO(), vence: "" };
  const guardar = () => {
    const e = edit;
    const tipo = TIPOS_INV.find((t) => t.id === e.tipo) || {};
    const iv = { ...e, id: e.id || "iv" + Date.now(),
                 nombre: (e.ticker || e.nombre || tipo.nombre || "").trim(),
                 moneda: e.moneda || tipo.moneda || "ARS" };
    setCfg({ ...cfg, inversiones: lista.some((x) => x.id === iv.id)
      ? lista.map((x) => (x.id === iv.id ? iv : x)) : [...lista, iv] });
    setEdit(null);
  };
  const borrar = (id) => {
    if (!confirm("¿Borrar esta inversión?")) return;
    setCfg({ ...cfg, inversiones: lista.filter((x) => x.id !== id) });
    setEdit(null);
  };

  const esRenta = edit && (edit.tipo === "plazofijo" || edit.tipo === "remunerada");
  const papeles = edit ? (PAPELES[edit.tipo] || []) : [];

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div className="cima sube" style={{ padding: "19px 19px 17px" }}>
        <div style={{ fontSize: 13, color: "rgba(234,240,236,.62)" }}>Tenés invertido</div>
        <div className="plata hero" style={{ marginTop: 6, color: "#FFFFFF" }}>{plata(r.total)}</div>
        {r.invertido > 0 && (
          <div style={{ fontSize: 13, marginTop: 9,
                        color: r.resultado >= 0 ? "#7FD6A8" : "#F0A896" }}>
            {r.resultado >= 0 ? "Ganaste " : "Perdiste "}
            <b className="num">{plata(Math.abs(r.resultado))}</b>
            <span style={{ color: "rgba(234,240,236,.55)" }}>
              {" "}sobre {plata(r.invertido)} puestos
            </span>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: "13px 15px", marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Dólares</span>
          <span className="num plata" style={{ fontSize: 15 }}>{plata(valorUsd)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                      marginTop: 3 }}>
          <span style={{ fontSize: 12, color: T.suave }}>
            USD {usd.toLocaleString("es-AR")} · a {plata(tc)} cada uno
          </span>
          <button onClick={() => { setBorrUsd(String(usd)); setEditUsd(!editUsd); }}
            style={{ fontSize: 12.5, color: T.ambar, fontWeight: 600 }}>
            {editUsd ? "Cancelar" : "Declarar los que tengo"}
          </button>
        </div>

        {editUsd && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.linea}` }}>
            <div style={{ fontSize: 12.5, color: T.suave, lineHeight: 1.55, marginBottom: 10 }}>
              Poné el <b>total</b> de dólares que tenés hoy. Esto no toca tus pesos: es para
              cargar los que ya tenías antes de usar la app. Si querés comprar dólares ahora,
              hacelo desde el <b>+</b> como ahorro, así te descuenta los pesos.
            </div>
            <input className="num" inputMode="decimal" value={borrUsd}
              onChange={(e) => setBorrUsd(e.target.value.replace(/[^\d.,]/g, ""))}
              style={{ textAlign: "right" }} placeholder="Ej: 3000" />
            <div style={{ fontSize: 12, color: T.suave, marginTop: 7 }}>
              Serían {plata((parseFloat(String(borrUsd).replace(",", ".")) || 0) * tc)} a la
              cotización de hoy.
            </div>
            <button className="btn" style={{ marginTop: 12 }}
              onClick={() => {
                const n = parseFloat(String(borrUsd).replace(",", ".")) || 0;
                setCfg({ ...cfg, reservasUsd: Math.max(0, Math.round(n * 100) / 100) });
                setEditUsd(false);
              }}>
              Guardar
            </button>
          </div>
        )}
      </div>

      {!lista.length && !usd && !editUsd && (
        <div className="aviso" style={{ background: T.ambarBg, marginTop: 14 }}>
          <div style={{ fontSize: 14.5, fontWeight: 620, marginBottom: 5 }}>Sumá lo que tenés guardado</div>
          Plazos fijos, acciones, CEDEARs, bonos, cripto o fondos. No se conecta con ningún
          broker: cargás vos cuánto tenés y a qué precio.
          <div style={{ marginTop: 9, fontWeight: 600 }}>
            Importante: esto NO va incluido en tu efectivo.
          </div>
          Si tenés $500.000 en la cuenta y además $300.000 en un plazo fijo, poné $500.000 como
          efectivo y el plazo fijo acá. Si lo sumás en los dos lados, la app cree que tenés
          $800.000 disponibles y te va a mentir.
        </div>
      )}

      {(lista.length > 0 || usd > 0) && (
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 12, lineHeight: 1.55 }}>
          Nada de esto cuenta como efectivo disponible: son cosas que tenés guardadas, no plata
          en la cuenta.
        </div>
      )}

      {lista.map((iv) => {
        const v = valorInversion(iv, tc);
        const tipo = (TIPOS_INV.find((t) => t.id === iv.tipo) || {}).nombre;
        const puesto = iv.tipo === "plazofijo" || iv.tipo === "remunerada"
          ? +iv.cantidad || 0
          : (+iv.cantidad || 0) * (+iv.precioCompra || 0) * (iv.moneda === "USD" ? tc : 1);
        const dif = v - puesto;
        return (
          <button key={iv.id} className="card" onClick={() => setEdit({ ...vacio, ...iv })}
            style={{ width: "100%", textAlign: "left", padding: "13px 15px", marginTop: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{iv.nombre || tipo}</span>
              <span className="num plata" style={{ fontSize: 15 }}>{plata(v)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 12, color: T.suave }}>
                {tipo}
                {iv.cantidad && !esRentaTipo(iv.tipo) ? ` · ${iv.cantidad} ${iv.moneda === "USD" ? "u." : "nom."}` : ""}
                {iv.tna ? ` · ${iv.tna}% TNA` : ""}
                {iv.vence ? ` · vence ${iv.vence.split("-").reverse().slice(0, 2).join("/")}` : ""}
              </span>
              {puesto > 0 && Math.abs(dif) > 1 && (
                <span className="num" style={{ fontSize: 12, color: dif >= 0 ? T.verde : T.rojo }}>
                  {dif >= 0 ? "+" : ""}{corta(dif)}
                </span>
              )}
            </div>
          </button>
        );
      })}

      <button className="btn" style={{ marginTop: 14 }} onClick={() => setEdit({ ...vacio })}>
        Agregar una inversión
      </button>

      {lista.some((x) => x.ticker) && (
        <>
          <button className="btn ghost" style={{ marginTop: 10, fontSize: 14.5, fontWeight: 500 }}
            onClick={actualizarPrecios}>
            Actualizar precios del mercado
          </button>
          {estado && (
            <div style={{ fontSize: 12.5, color: T.suave, marginTop: 8, textAlign: "center" }}>
              {estado}
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 14, lineHeight: 1.6 }}>
        Los precios vienen de data912 y las tasas de ArgentinaDatos, las dos gratuitas y sin clave.
        Pueden estar demoradas respecto del mercado. Esto no es asesoramiento financiero:
        es un registro de lo que tenés.
      </div>

      {edit && (
        <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 80, overflowY: "auto" }}>
          <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                        padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setEdit(null)} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
            <span style={{ fontSize: 15, fontWeight: 620 }}>{edit.id ? "Editar" : "Nueva inversión"}</span>
            <button onClick={guardar} style={{ fontSize: 15, fontWeight: 620 }}>Guardar</button>
          </div>
          <div style={{ padding: 16, paddingBottom: 40 }}>
            <label className="lbl">¿Qué es?</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TIPOS_INV.map((t) => (
                <button key={t.id} className={"chip sm" + (edit.tipo === t.id ? " on" : "")}
                  onClick={() => setEdit({ ...edit, tipo: t.id, moneda: t.moneda, ticker: "" })}>
                  {t.nombre}
                </button>
              ))}
            </div>

            {papeles.length > 0 && (
              <>
                <label className="lbl" style={{ marginTop: 16 }}>¿Cuál?</label>
                <div className="scroll" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {papeles.map((p) => (
                    <button key={p} className={"chip sm" + (edit.ticker === p ? " on" : "")}
                      onClick={() => setEdit({ ...edit, ticker: p })}>{p}</button>
                  ))}
                </div>
                <input value={edit.ticker} onChange={(e) => setEdit({ ...edit, ticker: e.target.value.toUpperCase() })}
                  placeholder="O escribilo vos" style={{ marginTop: 9 }} />
              </>
            )}

            {esRenta ? (
              <>
                <label className="lbl" style={{ marginTop: 16 }}>Nombre (opcional)</label>
                <input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                  placeholder={edit.tipo === "plazofijo" ? "Plazo fijo Galicia" : "Cuenta remunerada"} />

                <label className="lbl" style={{ marginTop: 14 }}>¿Cuánto pusiste?</label>
                <input className="num" inputMode="decimal" value={edit.cantidad}
                  onChange={(e) => setEdit({ ...edit, cantidad: e.target.value.replace(/[^\d]/g, "") })}
                  style={{ textAlign: "right" }} />

                <label className="lbl" style={{ marginTop: 14 }}>TNA (%)</label>
                <input className="num" inputMode="decimal" value={edit.tna}
                  onChange={(e) => setEdit({ ...edit, tna: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="Ej: 32" style={{ textAlign: "right" }} />

                {!tasas && (
                  <button onClick={cargarTasas}
                    style={{ marginTop: 9, fontSize: 13, color: T.ambar, fontWeight: 600 }}>
                    Traer las tasas de los bancos
                  </button>
                )}
                {tasas && tasas.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: T.suave, marginTop: 11, marginBottom: 6 }}>
                      Tasas de hoy, según lo que cada banco le reporta al BCRA. Tocá una para usarla.
                    </div>
                    <div style={{ maxHeight: 190, overflowY: "auto",
                                  border: `1px solid ${T.linea}`, borderRadius: 12 }}>
                      {tasas.slice(0, 25).map((t, i) => (
                        <button key={t.entidad}
                          onClick={() => setEdit({ ...edit, tna: String(t.tna), nombre: edit.nombre || t.entidad })}
                          style={{ width: "100%", display: "flex", justifyContent: "space-between",
                                   padding: "10px 13px", textAlign: "left",
                                   background: String(t.tna) === String(edit.tna) ? T.verdeBg : "transparent",
                                   borderTop: i ? `1px solid ${T.linea}` : "none" }}>
                          <span style={{ fontSize: 13, minWidth: 0, overflow: "hidden",
                                         textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.entidad}</span>
                          <span className="num" style={{ fontSize: 13, fontWeight: 600, marginLeft: 10 }}>
                            {t.tna.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {tasas && !tasas.length && (
                  <div style={{ fontSize: 12.5, color: T.suave, marginTop: 9 }}>
                    No pude traer las tasas ahora. Cargala a mano.
                  </div>
                )}

                <label className="lbl" style={{ marginTop: 14 }}>¿Desde cuándo?</label>
                <input type="date" value={edit.fecha} onChange={(e) => setEdit({ ...edit, fecha: e.target.value })} />

                {edit.tipo === "plazofijo" && (
                  <>
                    <label className="lbl" style={{ marginTop: 14 }}>¿Cuándo vence?</label>
                    <input type="date" value={edit.vence} onChange={(e) => setEdit({ ...edit, vence: e.target.value })} />
                  </>
                )}
              </>
            ) : (
              <>
                {!papeles.length && (
                  <>
                    <label className="lbl" style={{ marginTop: 16 }}>Nombre</label>
                    <input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
                  </>
                )}
                <label className="lbl" style={{ marginTop: 16 }}>
                  {edit.tipo === "dolares" ? "¿Cuántos dólares?" : "¿Cuántos tenés?"}
                </label>
                <input className="num" inputMode="decimal" value={edit.cantidad}
                  onChange={(e) => setEdit({ ...edit, cantidad: e.target.value.replace(/[^\d.,]/g, "") })}
                  style={{ textAlign: "right" }} />

                <label className="lbl" style={{ marginTop: 14 }}>
                  Precio al que compraste {edit.moneda === "USD" ? "(USD)" : "($)"}
                </label>
                <input className="num" inputMode="decimal" value={edit.precioCompra}
                  onChange={(e) => setEdit({ ...edit, precioCompra: e.target.value.replace(/[^\d.,]/g, "") })}
                  style={{ textAlign: "right" }} />

                <label className="lbl" style={{ marginTop: 14 }}>
                  Precio de hoy {edit.moneda === "USD" ? "(USD)" : "($)"}
                </label>
                <input className="num" inputMode="decimal" value={edit.precioActual}
                  onChange={(e) => setEdit({ ...edit, precioActual: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="Si lo dejás vacío, uso el de compra" style={{ textAlign: "right" }} />

                <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                  {["ARS", "USD"].map((m) => (
                    <button key={m} className={"chip sm" + (edit.moneda === m ? " on" : "")}
                      onClick={() => setEdit({ ...edit, moneda: m })}>
                      {m === "ARS" ? "En pesos" : "En dólares"}
                    </button>
                  ))}
                </div>
              </>
            )}

            {edit.cantidad > 0 && (
              <div className="card" style={{ padding: 13, marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: T.suave }}>Vale hoy</span>
                  <span className="num plata">{plata(valorInversion({ ...edit }, tc))}</span>
                </div>
              </div>
            )}

            {edit.id && (
              <button className="btn peligro" style={{ marginTop: 22 }}
                onClick={() => borrar(edit.id)}>Borrar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const esRentaTipo = (t) => t === "plazofijo" || t === "remunerada";

/* ===================== ¿PAGO TODO O EL MÍNIMO? ===================== */
function Financiar({ medios, cfg, onCerrar }) {
  const conDatos = medios.filter((m) => m.id !== "efectivo" && m.tna);
  const [sel, setSel] = useState(conDatos[0] ? conDatos[0].id : "");
  const m = medios.find((x) => x.id === sel);

  // La mejor tasa que el usuario ya tiene cargada; si no hay, un valor conservador
  const inv = (cfg.inversiones || []).filter((x) => x.tna);
  const mejor = inv.length ? Math.max(...inv.map((x) => +x.tna || 0)) : 0;
  const [tasaInv, setTasaInv] = useState(String(mejor || 30));
  const [mercado, setMercado] = useState(null);
  const traerMejor = async () => {
    try {
      const t = await traerTasas();
      if (t.length) { setMercado(t[0]); setTasaInv(String(t[0].tna)); }
      else setMercado({ entidad: "", tna: 0 });
    } catch (e) { setMercado({ entidad: "", tna: 0 }); }
  };

  const saldo = m ? +m.saldo || 0 : 0;
  const minimo = m ? +m.pagoMinimo || 0 : 0;
  const financiable = Math.max(0, saldo - minimo);
  const tnaCard = m ? +m.tna || 0 : 0;

  // Costo real de financiar: interés + IVA 21% sobre ese interés
  const temCard = tnaCard / 12 / 100;
  const costoMes = financiable * temCard * 1.21;
  const temInv = (+tasaInv || 0) / 12 / 100;
  const ganaMes = financiable * temInv;
  const neto = costoMes - ganaMes;

  if (!conDatos.length) {
    return (
      <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 82, overflowY: "auto" }}>
        <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                      padding: "14px 16px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 620 }}>¿Pago todo o el mínimo?</span>
          <button onClick={onCerrar} style={{ fontSize: 15, fontWeight: 620 }}>Listo</button>
        </div>
        <div style={{ padding: 16 }}>
          <div className="aviso" style={{ background: T.ambarBg }}>
            Para calcular esto necesito la tasa de financiación y el pago mínimo de tu tarjeta.
            Los dos vienen en el PDF del resumen: importalo desde el botón + y los levanto solos.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 82, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 620 }}>¿Pago todo o el mínimo?</span>
        <button onClick={onCerrar} style={{ fontSize: 15, fontWeight: 620 }}>Listo</button>
      </div>

      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {conDatos.map((x) => (
            <button key={x.id} className={"chip sm" + (sel === x.id ? " on" : "")}
              onClick={() => setSel(x.id)}>{x.corto || x.nombre}</button>
          ))}
        </div>

        <div className="cima" style={{ padding: "19px 19px 17px" }}>
          <div style={{ fontSize: 13, color: "rgba(234,240,236,.62)" }}>
            {neto > 0 ? "Financiar te cuesta por mes" : "Te conviene financiar, por mes"}
          </div>
          <div className="plata hero" style={{ marginTop: 6, fontSize: 36,
                color: neto > 0 ? "#F0A896" : "#7FD6A8" }}>
            {plata(Math.abs(neto))}
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(234,240,236,.72)", marginTop: 10, lineHeight: 1.55 }}>
            {neto > 0
              ? `Pagá el resumen entero. Estirarlo te sale ${plata(Math.abs(neto))} más por mes de lo que ganás teniendo la plata invertida.`
              : `Con tu tasa de inversión conviene pagar el mínimo, pero es una diferencia chica: si te olvidás de pagar, se te da vuelta.`}
          </div>
        </div>

        <div className="card" style={{ padding: 15, marginTop: 14 }}>
          {[["Saldo del resumen", plata(saldo)],
            ["Pago mínimo", plata(minimo)],
            ["Quedaría financiado", plata(financiable)],
            ["Tasa de la tarjeta", tnaCard.toLocaleString("es-AR") + "% TNA"],
          ].map(([a, b]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between",
                                  fontSize: 13.5, marginTop: 6 }}>
              <span style={{ color: T.suave }}>{a}</span>
              <span className="num">{b}</span>
            </div>
          ))}
        </div>

        <label className="lbl" style={{ marginTop: 18 }}>¿A qué tasa podés poner la plata? (TNA)</label>
        <input className="num" inputMode="decimal" value={tasaInv}
          onChange={(e) => setTasaInv(e.target.value.replace(/[^\d.,]/g, ""))}
          style={{ textAlign: "right" }} />
        <div style={{ fontSize: 12, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
          {mercado && mercado.tna > 0
            ? `Puse ${mercado.tna.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%, la mejor del mercado hoy (${mercado.entidad}).`
            : mejor > 0
              ? `Puse ${mejor}%, la mejor tasa que tenés cargada en Invertido.`
              : "Poné la tasa de tu cuenta remunerada o plazo fijo."}
        </div>
        {!mercado && (
          <button onClick={traerMejor}
            style={{ marginTop: 9, fontSize: 13, color: T.ambar, fontWeight: 600 }}>
            Usar la mejor tasa de plazo fijo de hoy
          </button>
        )}
        {mercado && !mercado.tna && (
          <div style={{ fontSize: 12.5, color: T.suave, marginTop: 8 }}>
            No pude traer las tasas ahora.
          </div>
        )}

        <div className="card" style={{ padding: 15, marginTop: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 620, marginBottom: 9 }}>Cómo sale la cuenta</div>
          {[["Interés de la tarjeta, un mes", costoMes / 1.21],
            ["IVA sobre ese interés (21%)", costoMes - costoMes / 1.21],
            ["Lo que rendiría tu plata", -ganaMes]].map(([a, v]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between",
                                  fontSize: 13, marginTop: 5 }}>
              <span style={{ color: T.suave }}>{a}</span>
              <span className="num" style={{ color: v < 0 ? T.verde : T.tinta }}>{plata(v)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14,
                        marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.linea}`, fontWeight: 620 }}>
            <span>Diferencia</span>
            <span className="num" style={{ color: neto > 0 ? T.rojo : T.verde }}>{plata(neto)}</span>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 16, lineHeight: 1.6 }}>
          Cuenta simplificada de un mes, sin punitorios ni comisiones, y suponiendo que no
          gastás nada nuevo con esa tarjeta. Financiar dos meses seguidos suele salir bastante
          peor que el doble. No es asesoramiento financiero.
        </div>
      </div>
    </div>
  );
}

/* ===================== REPORTAR UN PROBLEMA ===================== */
// En un beta, el reporte tiene que costar 20 segundos o nadie lo manda.
function Reportar({ sesion, cfg, movs, medios, tab, onCerrar }) {
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("");

  const TIPOS = [
    ["roto", "Algo no funciona"],
    ["numero", "Un número está mal"],
    ["confuso", "No entendí algo"],
    ["idea", "Se me ocurrió algo"],
  ];

  // Contexto técnico automático: el usuario no tiene que explicarlo
  const contexto = () => ({
    version: APP_VERSION,
    pantalla: tab,
    movimientos: movs.length,
    medios: medios.length,
    inversiones: (cfg.inversiones || []).length,
    horizonte: cfg.horizonte,
    tieneSaldo: (cfg.saldoHoy || 0) !== 0,
    navegador: typeof navigator !== "undefined" ? navigator.userAgent : "",
    pantallaPx: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    cuando: new Date().toISOString(),
  });

  const enviar = async () => {
    if (!texto.trim()) return;
    setEstado("Enviando…");
    const cuerpo = {
      usuario: sesion && sesion.user ? sesion.user.id : null,
      tipo: tipo || "roto",
      texto: texto.trim(),
      contexto: contexto(),
    };
    try {
      const { error } = await sb.from("reportes").insert(cuerpo);
      if (error) throw error;
      setEstado("listo");
    } catch (e) {
      // Si la tabla no existe o no hay red, no perdemos el reporte
      try {
        await navigator.clipboard.writeText(
          `[${cuerpo.tipo}] ${cuerpo.texto}\n\n---\n${JSON.stringify(cuerpo.contexto, null, 1)}`
        );
        setEstado("copiado");
      } catch (e2) { setEstado("error"); }
    }
  };

  if (estado === "listo" || estado === "copiado") {
    return (
      <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 92,
                    display: "flex", flexDirection: "column", justifyContent: "center", padding: 28 }}>
        <div style={{ fontSize: 34, marginBottom: 14 }}>✓</div>
        <div style={{ fontSize: 21, fontWeight: 660, letterSpacing: "-0.02em", marginBottom: 10 }}>
          {estado === "listo" ? "Gracias, me llegó" : "Copiado al portapapeles"}
        </div>
        <div style={{ fontSize: 14, color: T.suave, lineHeight: 1.6 }}>
          {estado === "listo"
            ? "Lo voy a revisar. Si necesito más detalle te escribo."
            : "No pude enviarlo desde acá, pero quedó copiado con todo el detalle técnico. Pegámelo por WhatsApp."}
        </div>
        <button className="btn" style={{ marginTop: 26 }} onClick={onCerrar}>Volver</button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 92, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onCerrar} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
        <span style={{ fontSize: 15, fontWeight: 620 }}>Contame qué pasó</span>
        <button onClick={enviar}
          style={{ fontSize: 15, fontWeight: 620, color: texto.trim() ? T.tinta : T.tenue }}>
          Enviar
        </button>
      </div>

      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ fontSize: 13.5, color: T.suave, lineHeight: 1.6, marginBottom: 16 }}>
          Estoy probando la app con gente de confianza. Todo lo que me digas sirve,
          por chiquito que parezca.
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {TIPOS.map(([id, n]) => (
            <button key={id} onClick={() => setTipo(id)}
              style={{ padding: "13px 15px", textAlign: "left", borderRadius: 13,
                       border: `1px solid ${tipo === id ? T.tinta : T.linea}`,
                       background: tipo === id ? T.tinta : T.card,
                       color: tipo === id ? "#EAF0EC" : T.tinta,
                       fontSize: 14.5, fontWeight: tipo === id ? 620 : 500 }}>
              {n}
            </button>
          ))}
        </div>

        <label className="lbl" style={{ marginTop: 18 }}>Contame con tus palabras</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
          rows={5} placeholder="Ej: cargué un gasto con la Visa y me lo mandó a noviembre en vez de octubre"
          style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${T.linea}`,
                   fontSize: 15, fontFamily: "inherit", background: T.card, resize: "vertical" }} />

        <div style={{ fontSize: 12, color: T.suave, marginTop: 12, lineHeight: 1.6 }}>
          Va lo que escribas acá, más la pantalla en la que estabas, la versión de la app y
          cuántos movimientos tenés cargados.
          <b> La app no manda tus gastos, tus montos ni tu saldo</b>, así que si necesitás poner
          un número para explicarme, ponelo vos.
        </div>

        {estado === "error" && (
          <div className="aviso" style={{ background: T.rojoBg, color: T.rojo, marginTop: 14 }}>
            No pude enviarlo ni copiarlo. Mandámelo por WhatsApp.
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== COMPARTIR UN GASTO ===================== */
// Cargar un gasto y mandarle la mitad a alguien, por @usuario.
function Compartir({ sesion, medios, onListo, onCerrar }) {
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [medio, setMedio] = useState("efectivo");
  const [handle, setHandle] = useState("");
  const [encontrado, setEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [pct, setPct] = useState(0.5);
  const [estado, setEstado] = useState("");

  const n = parseInt(monto || "0", 10);
  const suMitad = Math.round(n * pct);

  const buscar = async () => {
    setBuscando(true); setEncontrado(null); setEstado("");
    const u = await buscarUsuario(handle);
    setBuscando(false);
    if (!u) { setEstado("No encontré a nadie con ese usuario"); return; }
    if (sesion && sesion.user && u.id === sesion.user.id) {
      setEstado("Ese sos vos"); return;
    }
    setEncontrado(u);
  };

  const guardar = async () => {
    if (!n || !encontrado) return;
    setEstado("Guardando…");
    try {
      const { error } = await sb.from("deudas").insert({
        acreedor: sesion.user.id, deudor: encontrado.id,
        detalle: detalle.trim() || "Gasto compartido",
        monto: suMitad, total: n, moneda: "ARS",
        fecha: hoyISO(), medio, cuotas: 1, estado: "pendiente",
      });
      if (error) throw error;
      // El gasto entero queda como movimiento mío; la parte de la otra persona
      // vuelve como deuda, así no se cuenta dos veces.
      onListo({
        id: "c" + Date.now(), tipo: "gasto",
        detalle: detalle.trim() || "Gasto compartido",
        monto: n, moneda: "ARS", medio, cuotas: 1, fecha: hoyISO(),
        mesInicio: mesDePago(hoyISO(), medio, medios),
        categoria: adivinarCategoria(detalle), recurrente: false, pagadoPor: "yo",
        persona: "@" + encontrado.usuario, pct: 1 - pct, personaId: encontrado.id,
      });
      onCerrar();
    } catch (e) {
      setEstado("No pude guardarlo. ¿Corriste el SQL de deudas en Supabase?");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.papel, zIndex: 86, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: T.card, borderBottom: `1px solid ${T.linea}`,
                    padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onCerrar} style={{ fontSize: 15, color: T.suave }}>Cancelar</button>
        <span style={{ fontSize: 15, fontWeight: 620 }}>Gasto compartido</span>
        <button onClick={guardar}
          style={{ fontSize: 15, fontWeight: 620, color: (n && encontrado) ? T.tinta : T.tenue }}>
          Guardar
        </button>
      </div>

      <div style={{ padding: 16, paddingBottom: 40 }}>
        <label className="lbl">¿Cuánto salió en total?</label>
        <input className="num" inputMode="numeric" value={monto}
          onChange={(e) => setMonto(e.target.value.replace(/[^\d]/g, ""))}
          style={{ textAlign: "right", fontSize: 22, fontWeight: 640 }} placeholder="0" />

        <label className="lbl" style={{ marginTop: 14 }}>¿En qué?</label>
        <input value={detalle} onChange={(e) => setDetalle(e.target.value)}
          placeholder="Súper, cena, nafta…" />

        <label className="lbl" style={{ marginTop: 14 }}>¿Cómo lo pagaste?</label>
        <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {medios.map((m) => (
            <button key={m.id} className={"chip sm" + (medio === m.id ? " on" : "")}
              onClick={() => setMedio(m.id)}>{m.corto || m.nombre}</button>
          ))}
        </div>

        <label className="lbl" style={{ marginTop: 18 }}>¿Con quién lo compartís?</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={handle} style={{ flex: 1 }}
            onChange={(e) => { setHandle(e.target.value.replace(/\s/g, "")); setEncontrado(null); }}
            placeholder="@usuario" autoCapitalize="none" autoCorrect="off" />
          <button onClick={buscar} className="chip" style={{ whiteSpace: "nowrap" }}>
            {buscando ? "..." : "Buscar"}
          </button>
        </div>

        {encontrado && (
          <div className="aviso" style={{ background: T.verdeBg, marginTop: 10 }}>
            <b>{encontrado.nombre || "@" + encontrado.usuario}</b> · @{encontrado.usuario}
          </div>
        )}
        {estado && !encontrado && (
          <div style={{ fontSize: 12.5, color: T.rojo, marginTop: 8 }}>{estado}</div>
        )}

        {n > 0 && (
          <>
            <label className="lbl" style={{ marginTop: 18 }}>¿Cómo lo dividen?</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[[0.5, "Mitad y mitad"], [0.3, "30% suyo"], [0.7, "70% suyo"], [1, "Todo suyo"]].map(([v, n2]) => (
                <button key={v} className={"chip sm" + (pct === v ? " on" : "")}
                  onClick={() => setPct(v)}>{n2}</button>
              ))}
            </div>
            <div className="card" style={{ padding: 14, marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: T.suave }}>Ponés vos</span>
                <span className="num">{plata(n)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5,
                            marginTop: 7, fontWeight: 620 }}>
                <span>Te queda debiendo</span>
                <span className="num" style={{ color: T.verde }}>{plata(suMitad)}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.suave, marginTop: 11, lineHeight: 1.55 }}>
              El gasto completo entra en tu flujo, y {encontrado ? "@" + encontrado.usuario : "la otra persona"} lo
              va a ver en su app para aceptarlo. Hasta que no lo salden, te lo voy a seguir recordando.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== PANTALLA PERSONAS (con deudas reales) ===================== */
function PersonasNube({ sesion, deudas, perfiles, onActualizar, onCompartir, cargando }) {
  const uid = sesion && sesion.user ? sesion.user.id : null;
  const [filtro, setFiltro] = useState("abiertas");
  const grupos = netoPorPersona(deudas, uid, perfiles);
  const meDeben = grupos.filter((g) => g.neto > 0).reduce((a, g) => a + g.neto, 0);
  const debo = grupos.filter((g) => g.neto < 0).reduce((a, g) => a - g.neto, 0);
  const accion = requierenAccion(deudas, uid);

  const cambiar = async (d, estado, extra) => {
    try {
      await sb.from("deudas").update({ estado, actualizado: new Date().toISOString(), ...(extra || {}) })
        .eq("id", d.id);
      onActualizar();
    } catch (e) { /* la pantalla se refresca igual */ }
  };

  const lista = (deudas || []).filter((d) =>
    filtro === "abiertas" ? ABIERTAS.includes(d.estado) : true);

  const nombreDe = (id) => perfiles[id] ? "@" + perfiles[id] : "alguien";

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div className="cima sube" style={{ padding: "19px 19px 17px" }}>
        <div style={{ fontSize: 13, color: "rgba(234,240,236,.62)" }}>
          {meDeben >= debo ? "Te deben" : "Debés"}
        </div>
        <div className="plata hero" style={{ marginTop: 6,
              color: meDeben >= debo ? "#7FD6A8" : "#F0A896" }}>
          {plata(Math.abs(meDeben - debo))}
        </div>
        <div style={{ fontSize: 13, color: "rgba(234,240,236,.65)", marginTop: 9 }}>
          Te deben <b className="num" style={{ color: "#fff" }}>{plata(meDeben)}</b>
          {"  ·  "}Debés <b className="num" style={{ color: "#fff" }}>{plata(debo)}</b>
        </div>
      </div>

      {accion.length > 0 && (
        <div className="aviso" style={{ background: T.ambarBg, marginTop: 13 }}>
          <b>Tenés {accion.length} {accion.length === 1 ? "cosa" : "cosas"} para responder.</b>
          {" "}Están marcadas abajo.
        </div>
      )}

      <button className="btn" style={{ marginTop: 13 }} onClick={onCompartir}>
        Compartir un gasto
      </button>

      {cargando && (
        <div style={{ fontSize: 13, color: T.suave, textAlign: "center", marginTop: 20 }}>
          Buscando…
        </div>
      )}

      {!cargando && !lista.length && (
        <div className="aviso" style={{ background: T.ambarBg, marginTop: 14 }}>
          <div style={{ fontSize: 14.5, fontWeight: 620, marginBottom: 5 }}>Todavía no hay nada</div>
          Cuando pongas plata por alguien —una cena, el súper, la nafta— cargalo acá con su
          @usuario. Le va a aparecer en su app para que lo acepte, y los dos van a ver la cuenta
          igual. Se salda cuando los dos están de acuerdo.
        </div>
      )}

      {grupos.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 15.5, fontWeight: 620, marginBottom: 9 }}>Por persona</div>
          <div className="card" style={{ overflow: "hidden" }}>
            {grupos.map((g, i) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between",
                    padding: "12px 15px", borderTop: i ? `1px solid ${T.linea}` : "none" }}>
                <span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 560 }}>
                    {nombreDe(g.id)}
                  </span>
                  <span style={{ display: "block", fontSize: 11.5, color: T.tenue, marginTop: 2 }}>
                    {g.items.length} {g.items.length === 1 ? "gasto" : "gastos"} sin saldar
                  </span>
                </span>
                <span className="num plata" style={{ fontSize: 15,
                      color: g.neto >= 0 ? T.verde : T.rojo }}>
                  {g.neto >= 0 ? "" : "−"}{plata(Math.abs(g.neto))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                        marginTop: 22, marginBottom: 9 }}>
            <span style={{ fontSize: 15.5, fontWeight: 620 }}>Detalle</span>
            <button onClick={() => setFiltro(filtro === "abiertas" ? "todas" : "abiertas")}
              style={{ fontSize: 13, color: T.ambar, fontWeight: 600 }}>
              {filtro === "abiertas" ? "Ver también las saldadas" : "Ver solo las abiertas"}
            </button>
          </div>

          {lista.map((d) => {
            const soyAcreedor = d.acreedor === uid;
            const otro = soyAcreedor ? d.deudor : d.acreedor;
            const est = ESTADOS[d.estado] || { nombre: d.estado, color: "tinta" };
            const col = { ambar: T.ambar, rojo: T.rojo, verde: T.verde, tinta: T.tinta }[est.color];
            const meToca = (!soyAcreedor && d.estado === "pendiente") ||
                           (soyAcreedor && d.estado === "dice_pagada");
            return (
              <div key={d.id} className="card"
                style={{ padding: 14, marginBottom: 9,
                         borderColor: meToca ? T.ambar : T.linea }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{d.detalle}</span>
                  <span className="num plata" style={{ fontSize: 15,
                        color: soyAcreedor ? T.verde : T.rojo }}>
                    {soyAcreedor ? "" : "−"}{plata(+d.monto)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.suave, marginTop: 3 }}>
                  {soyAcreedor ? `${nombreDe(otro)} te debe` : `Le debés a ${nombreDe(otro)}`}
                  {" · "}{String(d.fecha).split("-").reverse().slice(0, 2).join("/")}
                  {d.total ? ` · de ${plata(+d.total)} en total` : ""}
                </div>
                <div style={{ fontSize: 12, color: col, fontWeight: 600, marginTop: 5 }}>
                  {est.nombre}
                  {d.promesa ? ` · dice que paga el ${String(d.promesa).split("-").reverse().slice(0, 2).join("/")}` : ""}
                </div>

                {!soyAcreedor && d.estado === "pendiente" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                    <button className="chip sm" onClick={() => cambiar(d, "aceptada")}>Es correcto</button>
                    <button className="chip sm" onClick={() => cambiar(d, "rechazada")}>No es así</button>
                  </div>
                )}
                {!soyAcreedor && d.estado === "aceptada" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
                    <button className="chip sm" onClick={() => cambiar(d, "dice_pagada")}>Ya se lo pagué</button>
                    <button className="chip sm" onClick={() => {
                      const f = prompt("¿Qué día se lo vas a pagar? (AAAA-MM-DD)", hoyISO());
                      if (f) cambiar(d, "aceptada", { promesa: f });
                    }}>Le pago tal día</button>
                  </div>
                )}
                {soyAcreedor && d.estado === "dice_pagada" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                    <button className="chip sm" onClick={() => cambiar(d, "saldada")}>Sí, lo recibí</button>
                    <button className="chip sm" onClick={() => cambiar(d, "aceptada")}>Todavía no</button>
                  </div>
                )}
                {soyAcreedor && d.estado === "pendiente" && (
                  <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 9 }}>
                    Esperando que {nombreDe(otro)} lo acepte
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ===================== FORMULARIO DE MOVIMIENTO ===================== */
function FormMov({ inicial, medios, personas, onGuardar, onBorrar, onCerrar, tcRef = 1550, disponible = null,
                   movs = [], cfg = {} }) {
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
    soloDeuda: false,
    consume: "",
    devPct: "",
    devTope: "",
    devMes: "mismo",
    devDestino: "caja",
    manual: true,
    paraMes: "mismo",
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
    // Ya lo pagaste antes de cargarlo: no vuelve a salir plata de la caja.
    if (f.soloDeuda) return 0;
    const base = f.moneda === "USD" ? (+f.montoUsd || 0) * tcRef : +f.monto || 0;
    const mio = f.pagadoPor === "otro" ? base * ((+f.pct || 0) / 100) : base;
    return mio / n;
  })();
  const cae = f.recurrente ? null : mesDePago(f.fecha || hoyISO(), f.medio, medios);
  const noAlcanza = disponible != null && cae === mesDeHoy() && saleAhora > disponible;

  const esIngreso = f.tipo === "ingreso";
  const mesPago = useMemo(() => {
    if (f.recurrente) return null;
    if (f.mesInicio && !f.fecha) return f.mesInicio;
    // Un ingreso entra el día que lo cobrás: no tiene tarjeta ni ciclo
    if (f.tipo === "ingreso") return (f.fecha || hoyISO()).slice(0, 7);
    if (f.pagadoPor === "otro") return (f.fecha || hoyISO()).slice(0, 7);
    return mesDePago(f.fecha, f.medio, medios);
  }, [f.fecha, f.medio, f.recurrente, f.mesInicio, f.pagadoPor, f.tipo, medios]);

  // Estimados variables de ese mes que este gasto podría estar cubriendo
  const candidatos = useMemo(() => {
    if (f.recurrente || f.tipo !== "gasto" || !mesPago) return [];
    if (Math.max(1, +f.cuotas || 1) !== 1) return [];
    return estimadosDelMes(movs, cfg, medios, mesPago)
      .filter((x) => x.queda > 0 || x.mv.id === f.consume);
  }, [movs, cfg, medios, mesPago, f.recurrente, f.tipo, f.cuotas, f.consume]);

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
      if (f.auto === false) mv.auto = false;
      if (f.auto === false && f.manual === false) mv.manual = false;
      if (f.meses?.length) mv.meses = f.meses;
    } else {
      mv.cuotas = Math.max(1, +f.cuotas || 1);
      mv.mesInicio = mesPago;
      mv.fecha = f.fecha;
    }
    if (f.tipo === "ingreso" && f.paraMes === "siguiente") mv.paraMes = "siguiente";
    // Un ingreso siempre entra a tu caja, en un solo pago y sin repartir con nadie
    if (f.tipo === "ingreso") {
      mv.medio = "efectivo";
      if (!f.recurrente) mv.cuotas = 1;
    }
    if (f.persona && f.tipo !== "ingreso") { mv.persona = f.persona; mv.pct = (+f.pct || 0) / 100; }
    if (f.tipo === "gasto" && f.categoria) mv.categoria = f.categoria;
    // Cómo se ajusta la cuota de un préstamo (para proyectar en Simular)
    if (f.tipo === "gasto" && f.recurrente && f.categoria === "Préstamos" &&
        ["fija", "inflacion", "sueldo"].includes(f.ajustaPor)) mv.ajustaPor = f.ajustaPor;
    if (f.recurrente && +f.cuotasRestantes > 0)
      mv.hasta = sumaMes(mesDeHoy(), +f.cuotasRestantes - 1);
    if (f.pagadoPor === "otro") mv.pagadoPor = "otro";
    // Solo tiene sentido si lo pusiste vos y hay alguien que te lo devuelve
    if (f.soloDeuda && f.pagadoPor !== "otro" && f.persona) mv.soloDeuda = true;
    // Se imputa contra un estimado del mes: solo para compras en un pago
    if (!f.recurrente && f.consume && Math.max(1, +f.cuotas || 1) === 1) mv.consume = f.consume;
    // Reintegro del banco por una promo
    if (f.tipo === "gasto" && f.pagadoPor !== "otro" && (+f.devPct > 0 || +f.devTope > 0)) {
      if (+f.devPct > 0) mv.devPct = +f.devPct;
      if (+f.devTope > 0) mv.devTope = +f.devTope;
      mv.devMes = f.devMes === "siguiente" ? "siguiente" : "mismo";
      mv.devDestino = f.devDestino === "tarjeta" ? "tarjeta" : "caja";
    }
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
              onClick={() => {
                set("tipo", v);
                if (v === "ahorro") { set("moneda", "USD"); set("medio", "efectivo"); }
                if (v === "ingreso") { set("medio", "efectivo"); set("cuotas", 1); set("persona", "");
                                       set("pagadoPor", "yo"); set("consume", ""); }
              }}>
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
              <button className={"chip" + (f.pagadoPor === "otro" ? " on" : "")}
                onClick={() => { set("pagadoPor", "otro"); set("soloDeuda", false); }}>
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

        {f.pagadoPor === "yo" && !esIngreso && (
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

        {f.tipo === "ingreso" && (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>¿De qué mes es esta plata?</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button className={"chip sm" + ((f.paraMes || "mismo") === "mismo" ? " on" : "")}
                onClick={() => set("paraMes", "mismo")}>Del mes que la cobro</button>
              <button className={"chip sm" + (f.paraMes === "siguiente" ? " on" : "")}
                onClick={() => set("paraMes", "siguiente")}>Del mes siguiente</button>
            </div>
            <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.55 }}>
              {f.paraMes === "siguiente"
                ? "Cobrás a fin de mes y con eso pagás el mes que viene: la plata se muestra ahí, al lado de los gastos que cubre."
                : "La cobrás y la gastás en el mismo mes."}
            </div>
          </>
        )}

        <label className="lbl" style={{ marginTop: 18 }}>Frecuencia</label>
        <div style={{ display: "flex", gap: 7 }}>
          <button className={"chip" + (!f.recurrente ? " on" : "")} onClick={() => set("recurrente", false)}>
            {esIngreso ? "Una vez" : "Una compra"}
          </button>
          <button className={"chip" + (f.recurrente ? " on" : "")} onClick={() => set("recurrente", true)}>
            Todos los meses
          </button>
        </div>

        {f.recurrente && (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>¿Cómo se comporta?</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button className={"chip sm" + (f.auto !== false ? " on" : "")}
                onClick={() => set("auto", true)}>Siempre igual</button>
              <button className={"chip sm" + (f.auto === false ? " on" : "")}
                onClick={() => set("auto", false)}>Varía cada mes</button>
            </div>
            <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.55 }}>
              {esIngreso
                ? (f.auto === false
                    ? "Como horas extra o ventas: el monto cambia mes a mes. Cuando lo cobres, poné el importe real."
                    : "Como el sueldo o un alquiler que cobrás: entra todos los meses por el mismo monto.")
                : f.auto === false
                ? "Como la nafta o el súper: el monto cambia mes a mes, así que es una apuesta hasta que pasa."
                : "Como Netflix o un seguro: se debita solo y casi nunca cambia, así que lo vas a poder confirmar de a varios con un toque."}
            </div>

            {f.auto === false && !esIngreso && (
              <>
                <label className="lbl" style={{ marginTop: 16 }}>¿Cargás estos gastos a mano?</label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button className={"chip sm" + (f.manual !== false ? " on" : "")}
                    onClick={() => set("manual", true)}>Sí, los cargo uno por uno</button>
                  <button className={"chip sm" + (f.manual === false ? " on" : "")}
                    onClick={() => set("manual", false)}>No, dejá el estimado</button>
                </div>
                <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.55 }}>
                  {f.manual !== false
                    ? "Entonces en el mes en curso no aparece: manda lo que cargaste. Sirve solo para estimar los meses que vienen."
                    : "Entonces cuenta todos los meses, igual que un gasto fijo. Si algún mes no va, tocalo y ponelo en cero."}
                </div>
              </>
            )}
          </>
        )}

        {!f.recurrente ? (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>
              {esIngreso ? "¿Cuándo la cobrás?" : f.pagadoPor === "otro" ? "Cuándo empezás a pagarle" : "Fecha de la compra"}
            </label>
            <input type="date" value={f.fecha || hoyISO()} onChange={(e) => set("fecha", e.target.value)} />

            {esIngreso && mesPago && (
              <div style={{ marginTop: 14, padding: "11px 13px", background: T.verdeBg, borderRadius: 11,
                            fontSize: 13.5, lineHeight: 1.5 }}>
                Entra en tu caja en <b>{etiqMesLargo(mesPago)}</b>
                {f.paraMes === "siguiente" && <> y se usa para pagar <b>{etiqMesLargo(sumaMes(mesPago, 1))}</b></>}.
              </div>
            )}

            {!esIngreso && (<>
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
            </>)}
          </>
        ) : (
          <>
            <label className="lbl" style={{ marginTop: 16 }}>
              {esIngreso ? "¿Por cuántos meses más? (vacío = no termina)" : "¿Cuántas cuotas le quedan? (vacío = no termina)"}
            </label>
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
                {esIngreso ? "Así la app sabe hasta cuándo lo cobrás." : "Sirve para préstamos: así la app sabe cuándo dejás de pagarlo."}
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
            {f.recurrente && f.categoria === "Préstamos" && (
              <>
                <label className="lbl" style={{ marginTop: 16 }}>¿Cómo se ajusta la cuota?</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["fija", "Fija"], ["inflacion", "Con la inflación (UVA, ANSES)"], ["sueldo", "Con los sueldos (HogAr)"]].map(([v, n]) => (
                    <button key={v} className={"chip sm" + ((f.ajustaPor || "") === v ? " on" : "")}
                      onClick={() => set("ajustaPor", f.ajustaPor === v ? "" : v)}>{n}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
                  {f.ajustaPor === "sueldo"
                    ? "Procrear 2020/21: la cuota sube todos los meses con los salarios. En Simular sube lo mismo que tu sueldo."
                    : f.ajustaPor === "inflacion"
                    ? "En Simular sube con la inflación, cada vez que ajustan tus fijos."
                    : f.ajustaPor === "fija"
                    ? "La cuota no cambia."
                    : "Sirve para proyectar en Simular. Cada mes podés poner el importe real tocándolo en Hoy."}
                </div>
              </>
            )}
          </>
        )}

        {candidatos.length > 0 && (
          <>
            <label className="lbl" style={{ marginTop: 18 }}>
              ¿Cubre alguno de tus estimados de {etiqMesLargo(mesPago)}?
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className={"chip sm" + (!f.consume ? " on" : "")}
                onClick={() => set("consume", "")}>Ninguno</button>
              {candidatos.map((x) => (
                <button key={x.mv.id} className={"chip sm" + (f.consume === x.mv.id ? " on" : "")}
                  onClick={() => set("consume", f.consume === x.mv.id ? "" : x.mv.id)}>
                  {x.mv.detalle} · quedan {corta(x.queda)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
              {f.consume
                ? "Este importe se descuenta de la estimación de ese mes, así el gasto no se cuenta dos veces."
                : "Si esto es la nafta o el súper que ya tenés estimado, elegilo y la estimación se corre sola."}
            </div>
          </>
        )}

        {!esIngreso && (<>
        <label className="lbl" style={{ marginTop: 18 }}>
          {f.pagadoPor === "otro" ? "Se lo debo a" : "Lo comparto con"}
        </label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button className={"chip" + (!f.persona ? " on" : "")}
            onClick={() => { set("persona", ""); set("soloDeuda", false); }}>Nadie</button>
          {personas.map((p) => (
            <button key={p} className={"chip" + (f.persona === p ? " on" : "")} onClick={() => set("persona", p)}>{p}</button>
          ))}
        </div>
        <input
          value={f.persona} onChange={(e) => set("persona", e.target.value)}
          placeholder="o escribí otro nombre" style={{ marginTop: 9 }}
        />
        {f.persona && (() => {
          // Se puede pensar en porcentaje o en plata: van sincronizados.
          const totalMov = f.moneda === "USD" ? (+f.montoUsd || 0) * tcRef : (+f.monto || 0);
          const porCuota = totalMov / Math.max(1, f.recurrente ? 1 : (+f.cuotas || 1));
          const pctNum = Math.min(100, Math.max(0, +f.pct || 0));
          const montoParte = Math.round(totalMov * pctNum / 100);
          return (
            <>
              <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, color: T.suave }}>
                  {f.pagadoPor === "otro" ? "Me toca" : "Recupero"}
                </span>
                <input className="num" inputMode="numeric" value={f.pct}
                  onChange={(e) => set("pct", Math.min(100, +e.target.value.replace(/\D/g, "") || 0))}
                  style={{ width: 66, textAlign: "right", padding: "8px 10px" }} />
                <span style={{ fontSize: 13.5, color: T.suave }}>%</span>
                <span style={{ fontSize: 13.5, color: T.tenue }}>o</span>
                <input className="num" inputMode="numeric" value={montoParte || ""}
                  onChange={(e) => {
                    const v = +e.target.value.replace(/\D/g, "") || 0;
                    set("pct", totalMov > 0 ? Math.min(100, Math.round((v / totalMov) * 100)) : 0);
                  }}
                  placeholder="$" style={{ flex: 1, minWidth: 96, textAlign: "right", padding: "8px 10px" }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[50, 100, 30, 70].map((v) => (
                  <button key={v} className={"chip sm" + (pctNum === v ? " on" : "")}
                    onClick={() => set("pct", v)}>{v === 50 ? "Mitad" : v + "%"}</button>
                ))}
              </div>
              {totalMov > 0 && (
                <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
                  {f.pagadoPor === "otro" ? "Le devolvés " : "Te devuelven "}
                  <b className="num">{plata(montoParte)}</b>
                  {(+f.cuotas || 1) > 1 && !f.recurrente
                    ? `, o sea ${plata(Math.round(porCuota * pctNum / 100))} por cuota`
                    : ""}
                </div>
              )}
            </>
          );
        })()}
        </>)}

        {f.tipo === "gasto" && f.pagadoPor === "yo" && f.persona && (
          <>
            <button
              className={"chip" + (f.soloDeuda ? " on" : "")}
              onClick={() => set("soloDeuda", !f.soloDeuda)}
              style={{ marginTop: 18 }}
            >
              {f.soloDeuda ? "✓ " : ""}Esta plata ya salió
            </button>
            <div style={{ fontSize: 12.5, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
              Marcalo si ya pagaste y lo cargás solo para registrar lo que te tienen que
              devolver. No vuelve a descontarse de tu caja: entra únicamente a la cuenta
              con {f.persona}.
            </div>
          </>
        )}

        {f.tipo === "gasto" && f.pagadoPor !== "otro" && (() => {
          const bruto = f.moneda === "USD" ? (+f.montoUsd || 0) * tcRef : (+f.monto || 0);
          const pct = +f.devPct || 0, tope = +f.devTope || 0;
          const dev = pct > 0 ? Math.min(bruto * pct / 100, tope > 0 ? tope : Infinity) : tope;
          const hay = pct > 0 || tope > 0;
          const aCajaTop = (f.devDestino || "caja") !== "tarjeta";
          // A la caja entra el día de la compra; al resumen, en el mes que lo pagás
          const mesRef = aCajaTop ? (f.fecha || hoyISO()).slice(0, 7) : mesPago;
          const mesDev = mesRef ? (f.devMes === "siguiente" ? sumaMes(mesRef, 1) : mesRef) : null;
          return (
            <>
              <label className="lbl" style={{ marginTop: 18 }}>¿El banco te devuelve parte?</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <input className="num" inputMode="numeric" value={f.devPct}
                  onChange={(e) => set("devPct", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="0" style={{ width: 70, textAlign: "right", padding: "8px 10px" }} />
                <span style={{ fontSize: 13.5, color: T.suave }}>% con tope</span>
                <input className="num" inputMode="numeric" value={f.devTope}
                  onChange={(e) => set("devTope", e.target.value.replace(/\D/g, ""))}
                  placeholder="sin tope" style={{ flex: 1, minWidth: 110, textAlign: "right", padding: "8px 10px" }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[10, 20, 25, 30].map((v) => (
                  <button key={v} className={"chip sm" + (pct === v ? " on" : "")}
                    onClick={() => set("devPct", pct === v ? "" : String(v))}>{v}%</button>
                ))}
              </div>
              {hay && (() => {
                const aCaja = (f.devDestino || "caja") !== "tarjeta";
                const med = medios.find((x) => x.id === f.medio);
                return (
                  <>
                    <label className="lbl" style={{ marginTop: 14 }}>¿Dónde te lo acreditan?</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[["caja", "A mi caja de ahorro"], ["tarjeta", "Al resumen de la tarjeta"]].map(([v, n]) => (
                        <button key={v} className={"chip sm" + ((f.devDestino || "caja") === v ? " on" : "")}
                          onClick={() => { set("devDestino", v);
                                           set("devMes", v === "caja" ? "mismo" : "siguiente"); }}>{n}</button>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {(aCaja
                        ? [["mismo", "El mismo día"], ["siguiente", "Al mes siguiente"]]
                        : [["siguiente", "En el resumen siguiente"], ["mismo", "En este mismo resumen"]]
                      ).map(([v, n]) => (
                        <button key={v} className={"chip sm" + ((f.devMes || "siguiente") === v ? " on" : "")}
                          onClick={() => set("devMes", v)}>{n}</button>
                      ))}
                    </div>

                    <div style={{ marginTop: 10, padding: "11px 13px", background: T.verdeBg,
                                  borderRadius: 11, fontSize: 13, lineHeight: 1.55 }}>
                      Te acreditan <b className="num">{plata(Math.round(dev) || 0)}</b>
                      {mesDev ? <> en <b>{etiqMesLargo(mesDev)}</b></> : null}
                      {pct > 0 && tope > 0 && bruto * pct / 100 > tope ? " (llegaste al tope)" : ""}.
                      {aCaja
                        ? " Entra como plata disponible en tu caja, el día que gastaste."
                        : ` Baja lo que pagás de ${med ? med.nombre : "esa tarjeta"}, no entra como plata nueva.`}
                    </div>
                  </>
                );
              })()}
              <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
                Para un reintegro fijo, dejá el % vacío y poné el importe en el tope. El tope es
                por compra, no un acumulado mensual de la tarjeta.
              </div>
            </>
          );
        })()}

        <button
          className={"chip" + (f.excepcional ? " on" : "")}
          onClick={() => set("excepcional", !f.excepcional)}
          style={{ marginTop: 18 }}
        >
          {f.excepcional ? "✓ " : ""}{esIngreso ? "Ingreso extraordinario" : "Gasto excepcional"}
        </button>
        <div style={{ fontSize: 12.5, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
          {esIngreso
            ? "Marcalo si no se repite (un bono, una venta, un regalo). Sirve para no confundirlo con tu ingreso normal."
            : "Marcalo si no se repite (un viaje, algo puntual). Sirve para no confundirlo con tu base de gastos normales."}
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


/* ===================== LA CURVA DEL SALDO ===================== */
// Lo unico que el Excel mostraba bien y la app no: la forma de los proximos meses.
function Curva({ filas, onTocar }) {
  if (filas.length < 2) return null;
  const W = 320, H = 116, pl = 6, pr = 6, pt = 14, pb = 22;
  const vals = filas.map((f) => f.saldo);
  const egr = filas.map((f) => f.egresos || 0);
  const hi = Math.max(...vals, ...egr, 0), lo = Math.min(...vals, 0);
  const rango = hi - lo || 1;
  const x = (i) => pl + (i * (W - pl - pr)) / (filas.length - 1);
  const y = (v) => pt + ((hi - v) / rango) * (H - pt - pb);
  const y0 = y(0);
  const linea = filas.map((f, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(f.saldo).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(filas.length - 1).toFixed(1)},${y0.toFixed(1)} L${x(0).toFixed(1)},${y0.toFixed(1)} Z`;
  const hayRojo = vals.some((v) => v < 0);

  return (
    <div style={{ marginTop: 13 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}
           role="img" aria-label="Cómo evoluciona tu saldo mes a mes">
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.verde} stopOpacity="0.22" />
            <stop offset="100%" stopColor={T.verde} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="arriba"><rect x="0" y="0" width={W} height={y0} /></clipPath>
          <clipPath id="abajo"><rect x="0" y={y0} width={W} height={H - y0} /></clipPath>
        </defs>

        <path d={area} fill="url(#gv)" clipPath="url(#arriba)" />
        {hayRojo && <path d={area} fill={T.rojo} fillOpacity="0.13" clipPath="url(#abajo)" />}

        {/* la línea del cero: cruzarla es la noticia */}
        <line x1={pl} y1={y0} x2={W - pr} y2={y0} stroke={hayRojo ? T.rojo : T.eje}
              strokeWidth="1" strokeDasharray={hayRojo ? "none" : "3 3"} opacity={hayRojo ? 0.5 : 1} />

        <path d={linea} fill="none" stroke={T.verde} strokeWidth="2.2"
              strokeLinejoin="round" strokeLinecap="round" clipPath="url(#arriba)" />
        {hayRojo && <path d={linea} fill="none" stroke={T.rojo} strokeWidth="2.2"
              strokeLinejoin="round" strokeLinecap="round" clipPath="url(#abajo)" />}

        {/* Lo que sale cada mes, para leer la curva del saldo con contexto */}
        {egr.some((v) => v > 0) && (
          <path d={filas.map((f, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(f.egresos || 0).toFixed(1)}`).join(" ")}
                fill="none" stroke={T.rojo} strokeWidth="1.6" strokeDasharray="4 3"
                strokeLinejoin="round" strokeLinecap="round" opacity="0.75" />
        )}

        {filas.map((f, i) => (
          <g key={f.mk} onClick={() => onTocar && onTocar(f.mk)} style={{ cursor: "pointer" }}>
            <circle cx={x(i)} cy={y(f.saldo)} r="3.4" fill={T.card}
                    stroke={f.saldo < 0 ? T.rojo : T.verde} strokeWidth="2" />
            <rect x={x(i) - 14} y="0" width="28" height={H} fill="transparent" />
            {(i === 0 || i === filas.length - 1 ||
              (f.saldo === Math.min(...vals) && i > 1 && i < filas.length - 2)) && (
              <text x={Math.min(W - 26, Math.max(16, x(i)))} y={H - 6} fontSize="9.5"
                    fill={T.tenue} textAnchor="middle">{etiqMes(f.mk)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}


/* ===================== PRÓXIMOS VENCIMIENTOS ===================== */
function Vencimientos({ medios }) {
  const hoy = hoyISO();
  const prox = medios
    .filter((m) => m.id !== "efectivo")
    .map((m) => {
      const cs = (m.ciclos || []).slice().sort((a, b) => (a.vto < b.vto ? -1 : 1));
      let c = cs.find((x) => x.vto >= hoy);
      if (!c && cs.length) { let u = cs[cs.length - 1]; for (let i = 0; i < 24 && u.vto < hoy; i++) u = siguienteCiclo(u); c = u; }
      return c ? { m, c } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.c.vto < b.c.vto ? -1 : 1));
  if (!prox.length) return null;

  const dias = (iso) => Math.round((new Date(iso + "T12:00:00") - new Date(hoy + "T12:00:00")) / 86400000);

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 15.5, fontWeight: 620, marginBottom: 9 }}>Próximos vencimientos</div>
      <div className="card" style={{ overflow: "hidden" }}>
        {prox.map(({ m, c }, i) => {
          const d = dias(c.vto);
          const urgente = d <= 7;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 15px", borderTop: i ? `1px solid ${T.linea}` : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 560 }}>{m.nombre}</div>
                <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 2 }}>
                  {/* El ciclo puede estar todavía abierto: no digamos que cerró si no cerró */}
                  {c.cierre <= hoy ? "cerró el " : "cierra el "}
                  {c.cierre.split("-").reverse().slice(0, 2).join("/")}
                  {c.cierre > hoy ? " · todavía podés sumar compras" : ""}
                  {c.estimado ? " · fecha estimada" : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontSize: 14, fontWeight: 600,
                      color: urgente ? T.rojo : T.tinta }}>
                  {c.vto.split("-").reverse().slice(0, 2).join("/")}
                </div>
                <div style={{ fontSize: 11.5, color: urgente ? T.rojo : T.tenue, marginTop: 2 }}>
                  {d === 0 ? "vence hoy" : d === 1 ? "mañana" : `en ${d} días`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Hoy({ cfg, setCfg, filas, medios, movs, onAbrirAjustes, onAjustar, onLiquidar, coti, estadoCoti, onRefrescar, tcVivo,
               historial = [], cerradas = [], revisadas = {}, onRevisar,
               estimados = [], onAbrirMedios, onAbrirImportar,
               invertido = { total: 0, porTipo: {} }, onVerInvertido, onFinanciar,
               pendientesDeuda = 0, onVerPersonas, onConfirmarAuto, undo = null, onDeshacer,
               escenariosCard = null }) {
  const [editSaldo, setEditSaldo] = useState(false);
  const [abierta, setAbierta] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [valor, setValor] = useState("");
  const [verSaldados, setVerSaldados] = useState(null);
  // Liquidar con una persona: qué grupo tiene abierto el "parcial" y cuánto
  const [liqAbierta, setLiqAbierta] = useState(null);
  const [liqValor, setLiqValor] = useState("");
  const [agrupar, setAgrupar] = useState("medio");
  const [busca, setBusca] = useState("");
  const [tipoVer, setTipoVer] = useState("todo");   // todo | fijos | cuotas | consumos
  // Salta a una sección del resumen del mes (y vuelve al índice)
  const ir = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
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
            <div key={f.mk}
              className={"card nodo" + (!cerrado && f.saldo < 0 ? " rojo" : "") + (f.mk === mesAct ? " ahora" : "")}
              style={{ marginBottom: 9, overflow: "hidden",
                       borderColor: !cerrado && f.saldo < 0 ? "#E8C4BB" : T.linea,
                       opacity: cerrado ? 0.82 : 1 }}>
              <button onClick={() => setAbierta(open ? null : f.mk)} style={{ width: "100%", textAlign: "left", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 620 }}>
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
                {!cerrado && (f.ingresos > 0 || f.egresos > 0) && (() => {
                  // Trayectoria: qué tan alto queda el saldo de este mes respecto del mejor
                  const tope = Math.max(...filas.map((x) => Math.abs(x.saldo)), 1);
                  const pos = f.saldo >= 0;
                  const ancho = Math.min(100, (Math.abs(f.saldo) / tope) * 100);
                  return (
                    <div style={{ marginTop: 11 }}>
                      <div style={{ height: 3, background: T.papel, borderRadius: 3, overflow: "hidden" }}>
                        <div className="traza" style={{ width: `${ancho}%`,
                              background: pos ? T.verde : T.rojo, opacity: pos ? 0.55 : 0.85 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6,
                                    fontSize: 11.5, color: T.tenue }}>
                        <span>entra <span className="num">{corta(f.ingresos)}</span></span>
                        <span>sale <span className="num">{corta(f.egresos)}</span></span>
                      </div>
                    </div>
                  );
                })()}
              </button>

              {open && (
                <div style={{ borderTop: `1px solid ${T.linea}` }}>
                  {(f.ingresos || f.tarjetas || f.efvo) > 0 && (
                  <div style={{ padding: "13px 15px", fontSize: 13.5 }}>
                    {[["Ingresos", f.ingresos - f.totalReint - (f.devCaja || 0)],
                      ["Tarjetas", -f.tarjetas],
                      ["Efectivo y débito", -(f.efvo - f.totalDeudas - f.ahorro)],
                      ...(f.totalDev > 0 ? [["Reintegros del banco", f.totalDev]] : []),
                      ...(f.netos || []).filter((x) => x.neto).map((x) => [
                        (x.neto > 0 ? "Te devuelve " : "Le transferís a ") + x.persona, x.neto]),
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

                  {f.mk === mesAct && movs.some(esEstimacion) && (
                    <div style={{ padding: "0 15px 12px", fontSize: 12, color: T.suave,
                                  lineHeight: 1.5 }}>
                      Este mes va con lo real: solo lo que cargaste. Tus estimaciones
                      ({movs.filter(esEstimacion).map((m) => m.detalle).slice(0, 3).join(", ")}
                      {movs.filter(esEstimacion).length > 3
                        ? ` y ${movs.filter(esEstimacion).length - 3} más` : ""})
                      empiezan a contar en {etiqMesLargo(sumaMes(mesAct, 1))}.
                    </div>
                  )}

                  {(() => {
                    // Buscador: filtra por detalle, categoría, persona o tarjeta
                    const q = normBusca(busca);
                    // Filtro rápido por tipo: gastos fijos, cuotas o consumos en un pago
                    const esTipo = (i) => tipoVer === "todo" ||
                      (tipoVer === "fijos" && !!i.mv.recurrente && !i.ingreso) ||
                      (tipoVer === "cuotas" && !i.mv.recurrente && (i.mv.cuotas || 1) > 1) ||
                      (tipoVer === "consumos" && !i.mv.recurrente && (i.mv.cuotas || 1) === 1 && !i.ingreso);
                    const coincide = (i) => esTipo(i) && (!q || normBusca([i.mv.detalle, i.mv.categoria, i.mv.persona,
                      (medios.find((m) => m.id === i.mv.medio) || {}).nombre].join(" ")).includes(q));
                    const filtrando = !!q || tipoVer !== "todo";
                    const pendTodo = f.items.filter((i) => !i.saldado);
                    const pend = pendTodo.filter(coincide);
                    const sald = f.items.filter((i) => i.saldado).filter(coincide);
                    const verS = verSaldados === f.mk || filtrando;

                    const fila = (it, enPersona) => {
                      const { mv, monto, cuota, ingreso, saldado, base, estimado, desvio } = it;
                      // Dentro del grupo de una persona mostramos lo que TE devuelven, en verde
                      const aFavor = enPersona && !it.deuda && (it.credito || 0) > 0;
                      // it.ahorro / it.usd se usan mas abajo
                      const clave = f.mk + "|" + mv.id;
                      const abierto = editItem === clave;
                      const ajustado = !!(cfg.ajustes && cfg.ajustes[f.mk] &&
                        Object.prototype.hasOwnProperty.call(cfg.ajustes[f.mk], mv.id));
                      if (it.devolucion) {
                        const med = medios.find((x) => x.id === it.medioDev);
                        const donde = it.aCaja ? "a tu caja de ahorro" : (med ? "baja " + med.corto : "");
                        const cobrado = !!saldado;
                        return (
                          <button key={"dev" + mv.id}
                            onClick={() => onAjustar(f.mk, it.devKey, cobrado ? null : 0,
                              cobrado || !it.aCaja ? null : { usd: 0, pesos: -(monto || 0) })}
                            style={{ width: "100%", display: "flex", justifyContent: "space-between",
                                     alignItems: "center", gap: 10, padding: "8px 0", textAlign: "left" }}>
                            <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap", color: cobrado ? T.tenue : T.tinta }}>
                              {(mv.fechaCompra || mv.fecha) && (
                                <span className="num" style={{ color: T.tenue, fontSize: 11.5, marginRight: 7 }}>
                                  {(mv.fechaCompra || mv.fecha).slice(8, 10)}/{(mv.fechaCompra || mv.fecha).slice(5, 7)}
                                </span>
                              )}
                              {mv.detalle}
                              <span style={{ color: T.tenue, fontSize: 11.5 }}>
                                {"  "}{donde}
                                {mv.devPct ? ` · ${mv.devPct}%` : ""}
                              </span>
                            </span>
                            <span className="num" style={{ fontSize: 13, flexShrink: 0,
                                  color: cobrado ? T.tenue : T.verde }}>
                              {cobrado ? "acreditado" : "+" + corta(monto)}
                            </span>
                          </button>
                        );
                      }
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
                                  whiteSpace: "nowrap", color: saldado ? T.tenue : T.tinta,
                                  fontStyle: estimado && !saldado ? "italic" : "normal",
                                  opacity: estimado && !saldado ? 0.75 : 1 }}>
                              {(() => {
                                // La fecha en que compraste, para ubicar el consumo en el resumen
                                const fc = !mv.recurrente && (mv.fechaCompra || mv.fecha);
                                return fc && /^\d{4}-\d{2}-\d{2}/.test(fc) ? (
                                  <span className="num" style={{ color: T.tenue, fontSize: 11.5,
                                        fontStyle: "normal", marginRight: 7 }}>
                                    {fc.slice(8, 10)}/{fc.slice(5, 7)}
                                  </span>
                                ) : null;
                              })()}
                              {mv.detalle}{cuota && mv.cuotas > 1 ? ` ${cuota}/${mv.cuotas}` : ""}
                              {estimado && !saldado ? "  ~" : ""}
                              {ajustado && !saldado ? "  ✎" : ""}
                              {it.usado > 0 ? (
                                <span style={{ color: T.ambar, fontSize: 11.5 }}>
                                  {"  "}−{corta(it.usado)} ya cargado
                                </span>
                              ) : null}
                              {!estimado && desvio ? (
                                <span style={{ color: desvio > 0 ? T.rojo : T.verde, fontSize: 11.5 }}>
                                  {"  "}{desvio > 0 ? "+" : "−"}{corta(Math.abs(desvio))}
                                </span>
                              ) : null}
                            </span>
                            <span className="num" style={{ fontSize: 13, flexShrink: 0,
                                  color: saldado ? T.tenue : (ingreso || aFavor) ? T.verde
                                       : ajustado ? T.ambar : T.tinta }}>
                              {saldado ? (it.cubierto ? "cubierto" : ingreso ? "cobrado" : "pagado")
                                       : aFavor ? "+" + corta(it.credito)
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
                                {!saldado && mv.recurrente && (
                                  <button className="chip sm"
                                    onClick={() => { onAjustar(f.mk, mv.id, 0); setEditItem(null); }}>
                                    Este mes no va
                                  </button>
                                )}
                                {/* Una plata que sale de la caja hoy. En tarjeta no: eso lo
                                    pagás cuando vence el resumen, no de a un consumo. */}
                                {!saldado && (it.ahorro || ingreso || mv.medio === "efectivo") && (
                                  <button className="chip sm"
                                    onClick={() => {
                                      onAjustar(f.mk, mv.id, 0, {
                                        usd: it.ahorro ? (it.usd || 0) : 0,
                                        pesos: ingreso ? -(monto || 0) : (monto || 0),
                                      });
                                      setEditItem(null);
                                    }}>
                                    {it.ahorro ? "Ya la hice" : ingreso ? "Ya lo cobré" : "Ya lo pagué"}
                                  </button>
                                )}
                                {!saldado && estimado && (
                                  <button className="chip sm"
                                    onClick={() => { onConfirmarAuto && onConfirmarAuto(f.mk, [mv.id]);
                                                     setEditItem(null); }}>
                                    Es este monto
                                  </button>
                                )}
                                {!saldado && (
                                  <div style={{ width: "100%", fontSize: 12, color: T.suave,
                                                marginTop: 6, lineHeight: 1.5 }}>
                                    {it.ahorro
                                      ? `Al marcarla descuento ${plata(monto)} de tu caja y sumo U$S ${Math.round(it.usd)} a tus reservas.`
                                      : ingreso
                                      ? `Al marcarlo sumo ${plata(monto)} a tu caja.`
                                      : mv.medio === "efectivo"
                                      ? `Al marcarlo descuento ${plata(monto)} de tu caja.`
                                      : estimado
                                      ? "Poné el importe real y guardá, o confirmá el estimado si ya sabés que es ese. Se paga cuando vence el resumen."
                                      : "Este gasto se paga cuando vence el resumen de la tarjeta."}
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
                    // Primero los fijos (sin fecha), después los consumos del más nuevo al más viejo,
                    // igual que los muestra la app del banco.
                    const fechaDe = (i) => (!i.mv.recurrente && (i.mv.fechaCompra || i.mv.fecha)) || "";
                    const ordenar = (arr) => arr.slice().sort((a, b) => {
                      const fa = fechaDe(a), fb = fechaDe(b);
                      if (!fa && !fb) return 0;
                      if (!fa) return -1;
                      if (!fb) return 1;
                      return fa < fb ? 1 : fa > fb ? -1 : 0;
                    });
                    const meter = (titulo, sub, arrIn, color, totalFijo, persona, corto, per) => {
                      const arr = ordenar(arrIn);
                      // Buscando: solo las secciones que tienen algo que coincide
                      if (filtrando && !arr.length) return;
                      if (arr.length || totalFijo != null) grupos.push({ titulo, sub, arr, color, persona, per,
                        corto: corto || titulo,
                        total: totalFijo != null && !filtrando ? totalFijo : arr.reduce((a, b) => a + b.monto, 0) });
                    };
                    if (agrupar === "categoria") {
                      meter("Por cobrar", "", pend.filter((i) => i.ingreso), T.verde);
                      const gastos = pend.filter((i) => !i.ingreso && !i.devolucion);
                      const cats = [...new Set(gastos.map((i) => i.mv.categoria || "Sin categoría"))]
                        .sort((a, b) =>
                          gastos.filter((i) => (i.mv.categoria || "Sin categoría") === b).reduce((x, y) => x + y.monto, 0) -
                          gastos.filter((i) => (i.mv.categoria || "Sin categoría") === a).reduce((x, y) => x + y.monto, 0));
                      cats.forEach((c) => meter(c, "", gastos.filter((i) => (i.mv.categoria || "Sin categoría") === c)));
                    } else {
                      meter("Por cobrar", "", pend.filter((i) => i.ingreso), T.verde);
                      medios.filter((m) => m.id !== "efectivo").forEach((m) =>
                        meter(m.nombre, (() => {
                          // El día real del ciclo que se paga ESE mes, no el día genérico
                          const c = (m.ciclos || []).find((x) => x.vto && x.vto.slice(0, 7) === f.mk);
                          const dia = c ? "vence el " + (+c.vto.slice(8, 10)) : "vence el " + m.vto;
                          const real = (cfg.resumenes || {})[m.id + "|" + f.mk];
                          if (real) return dia + " · del resumen";
                          const sinConf = pend.filter((i) => i.mv.medio === m.id && i.estimado).length;
                          return dia + (sinConf ? ` · ${sinConf} sin confirmar` : " · todo confirmado");
                        })(),
                              pend.filter((i) => !i.ingreso && !i.deuda && !i.soloDeuda && !i.devolucion
                                                 && i.mv.medio === m.id), undefined, undefined, undefined, m.corto));
                      meter("Efectivo y débito", "",
                            pend.filter((i) => !i.ingreso && !i.deuda && !i.soloDeuda && !i.devolucion
                                               && !i.ahorro && i.mv.medio === "efectivo"),
                            undefined, undefined, undefined, "Efectivo");
                      meter("Compra de dólares", "no es gasto", pend.filter((i) => i.ahorro), T.ambar,
                            undefined, undefined, "Dólares");
                      // Lo que te acredita el banco por promos, ya descontado de cada resumen
                      if (f.totalDev > 0)
                        meter("Reintegros del banco", "promos y devoluciones",
                              pend.filter((i) => i.devolucion), T.verde, undefined, undefined, "Reintegros");
                      // Una sola línea por persona: las dos puntas ya están cruzadas.
                      (f.netos || []).forEach((x) => {
                        const arr = pend.filter((i) => i.mv.persona === x.persona
                          && (i.deuda || i.soloDeuda || (i.credito || 0) > 0));
                        const notas = [];
                        if (x.arrastre) notas.push("incluye " + corta(Math.abs(x.arrastre)) +
                          (x.arrastre > 0 ? " que te debía de antes" : " que le debías de antes"));
                        if (x.liquidado) notas.push((x.liquidado > 0 ? "ya te pasó " : "ya le pasaste ") + corta(Math.abs(x.liquidado)));
                        if (!x.neto) {
                          meter(x.persona + " · saldado", notas.join(" · "), arr, T.tenue, 0, x.persona, x.persona, x);
                          return;
                        }
                        meter(x.neto < 0 ? "Le transferís a " + x.persona : "Te devuelve " + x.persona,
                              notas.length ? notas.join(" · ")
                                : "neto, ya cruzado con lo que " + (x.neto < 0 ? "te debe" : "le debés"),
                              arr, x.neto < 0 ? T.tinta : T.verde, Math.abs(x.neto), x.persona, x.persona, x);
                      });
                    }

                    return (
                      <>
                        {pendTodo.length > 0 && (
                          <div id={"idx-" + f.mk} style={{ borderTop: `1px solid ${T.linea}`, padding: "10px 15px",
                                                          scrollMarginTop: 12 }}>
                            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                              <span style={{ fontSize: 11.5, color: T.tenue }}>Ver por</span>
                              {[["medio", "medio de pago"], ["categoria", "categoría"]].map(([v, n]) => (
                                <button key={v} className={"chip sm" + (agrupar === v ? " on" : "")}
                                  onClick={() => setAgrupar(v)}>{n}</button>
                              ))}
                            </div>
                            <div style={{ position: "relative", marginTop: 9 }}>
                              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar: Uber, nafta, Sol, Visa…"
                                style={{ paddingRight: 38 }} />
                              {busca && (
                                <button onClick={() => setBusca("")} aria-label="Borrar búsqueda"
                                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                                           fontSize: 17, color: T.tenue, padding: "4px 8px" }}>×</button>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                              {[["todo", "Todo"], ["fijos", "Fijos"], ["cuotas", "Cuotas"], ["consumos", "Consumos"]].map(([v, n]) => (
                                <button key={v} className={"chip sm" + (tipoVer === v ? " on" : "")}
                                  onClick={() => setTipoVer(v)}>{n}</button>
                              ))}
                            </div>
                            {filtrando && (
                              <div style={{ fontSize: 12, color: T.suave, marginTop: 7 }}>
                                {pend.length + sald.length === 0
                                  ? (q ? `Nada que coincida con "${busca.trim()}" en este mes.` : "No hay movimientos de ese tipo en este mes.")
                                  : `${pend.length + sald.length} ${pend.length + sald.length === 1 ? "movimiento" : "movimientos"} · ` +
                                    plata(pend.concat(sald).reduce((a, b) => a + (b.monto || 0), 0))}
                              </div>
                            )}
                            {grupos.length > 1 && (
                              <div style={{ display: "flex", gap: 6, marginTop: 9, overflowX: "auto",
                                            paddingBottom: 3, WebkitOverflowScrolling: "touch" }}>
                                {grupos.map((g, gi) => (
                                  <button key={g.titulo} className="chip sm" style={{ flexShrink: 0 }}
                                    onClick={() => ir("g-" + f.mk + "-" + gi)}>
                                    {g.corto} · {corta(g.total)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {!filtrando && pend.some((i) => i.estimado && i.auto) && (
                          <div style={{ borderTop: `1px solid ${T.linea}`, padding: "11px 15px" }}>
                            <button
                              onClick={() => onConfirmarAuto && onConfirmarAuto(f.mk,
                                pend.filter((i) => i.estimado && i.auto).map((i) => i.mv.id))}
                              className="chip sm" style={{ width: "100%", padding: "9px 0" }}>
                              Confirmar {pend.filter((i) => i.estimado && i.auto).length} gastos automáticos
                            </button>
                            <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 6, lineHeight: 1.5 }}>
                              Suscripciones, seguros y servicios. Si alguno cambió de precio, tocalo
                              antes y poné el importe real.
                            </div>
                          </div>
                        )}

                        {grupos.map((g, gi) => (
                          <div key={g.titulo} id={"g-" + f.mk + "-" + gi}
                            style={{ borderTop: `1px solid ${T.linea}`, padding: "11px 15px", scrollMarginTop: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between",
                                          alignItems: "baseline", marginBottom: 4, gap: 8 }}>
                              <span style={{ fontSize: 11.5, letterSpacing: ".03em", color: T.tenue,
                                             textTransform: "uppercase" }}>
                                {g.titulo}{g.sub ? " · " + g.sub : ""}
                              </span>
                              <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
                                <span className="num" style={{ fontSize: 13, fontWeight: 620,
                                      color: g.color || T.tinta }}>{plata(g.total)}</span>
                                {grupos.length > 2 && (
                                  <button onClick={() => ir("idx-" + f.mk)} aria-label="Volver al índice"
                                    style={{ fontSize: 12, color: T.tenue, padding: "0 2px" }}>↑</button>
                                )}
                              </span>
                            </div>
                            {g.arr.map((it) => fila(it, g.persona))}
                            {g.per && onLiquidar && f.mk === mesAct && !filtrando && (() => {
                              const x = g.per;
                              const clave = f.mk + "|" + x.persona;
                              const abierta = liqAbierta === clave;
                              const recibo = x.neto > 0;
                              const falta = Math.abs(x.neto);
                              // Guardamos lo liquidado en el mes, acumulado y con signo
                              const registrar = (monto) => {
                                const m = Math.min(Math.abs(monto), falta);
                                if (!m) return;
                                onLiquidar(f.mk, x.persona, (x.liquidado || 0) + (recibo ? m : -m));
                                setLiqAbierta(null); setLiqValor("");
                              };
                              return (
                                <div style={{ marginTop: 8 }}>
                                  {falta > 0 && (
                                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                      <button className="chip sm" onClick={() => registrar(falta)}>
                                        {recibo ? "Ya me lo pasó" : "Ya se lo pasé"} · {corta(falta)}
                                      </button>
                                      <button className={"chip sm" + (abierta ? " on" : "")}
                                        onClick={() => { setLiqAbierta(abierta ? null : clave); setLiqValor(""); }}>
                                        Una parte
                                      </button>
                                    </div>
                                  )}
                                  {abierta && falta > 0 && (
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                                      <input className="num" inputMode="numeric" value={liqValor} autoFocus
                                        placeholder={recibo ? "¿Cuánto te pasó?" : "¿Cuánto le pasaste?"}
                                        onChange={(e) => setLiqValor(e.target.value.replace(/[^\d]/g, ""))}
                                        style={{ textAlign: "right", padding: "9px 11px" }} />
                                      <button onClick={() => registrar(+liqValor || 0)}
                                        style={{ padding: "10px 15px", borderRadius: 9, background: T.tinta,
                                                 color: "#fff", fontSize: 13.5, fontWeight: 600, flexShrink: 0 }}>
                                        Guardar
                                      </button>
                                    </div>
                                  )}
                                  <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 7, lineHeight: 1.5 }}>
                                    {falta > 0
                                      ? (recibo ? `Al marcarlo sumo lo que te pasó a tu caja. ` : `Al marcarlo descuento lo que le pasaste de tu caja. `) +
                                        "Lo que no se salde este mes pasa al que viene."
                                      : "Está todo saldado este mes."}
                                    {x.liquidado ? (
                                      <button onClick={() => onLiquidar(f.mk, x.persona, null)}
                                        style={{ marginLeft: 6, fontSize: 11.5, color: T.ambar, fontWeight: 600 }}>
                                        Deshacer lo registrado
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })()}
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

                        {!pendTodo.length && !(f.netos || []).some((x) => x.neto) && (
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
  const saludo = (() => {
    const h = new Date().getHours();
    return h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  })();

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div style={{ fontSize: 21, fontWeight: 660, letterSpacing: "-0.02em", marginBottom: 13 }}>
        {saludo}{cfg.nombre ? `, ${cfg.nombre.split(" ")[0]}` : ""}
      </div>
      <div className="cima sube" style={{ padding: "20px 20px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: "rgba(234,240,236,.62)" }}>
            {pendiente > 0 ? "Te queda libre este mes"
             : pendiente < 0 ? "Vas a cerrar el mes con"
             : "Tenés disponible"}
          </span>
          <button onClick={() => setEditSaldo(!editSaldo)}
            style={{ fontSize: 13, color: "rgba(234,240,236,.62)", fontWeight: 560 }}>
            {editSaldo ? "Listo" : "Ajustar"}
          </button>
        </div>

        {editSaldo ? (
          <>
          <div style={{ fontSize: 12.5, color: "rgba(234,240,236,.7)", marginTop: 10,
                        lineHeight: 1.55 }}>
            Poné solo la plata que tenés <b>disponible ahora</b>: cuenta bancaria, billetera
            virtual y efectivo. No sumes lo que está en plazo fijo, dólares o acciones, eso va
            en Invierto.
          </div>
          <input
            className="num" inputMode="decimal" value={cfg.saldoHoy}
            onChange={(e) => setCfg({ ...cfg, saldoHoy: +e.target.value.replace(/[^\d-]/g, "") || 0 })}
            style={{ marginTop: 11, fontSize: 29, fontWeight: 660, textAlign: "right",
                     background: "rgba(255,255,255,.09)", border: "none", color: "#EAF0EC" }}
          />
          </>
        ) : (
          <div className="plata hero" style={{ marginTop: 6,
                color: cfg.saldoHoy - pendiente < 0 ? "#F0A896" : "#FFFFFF" }}>
            {plata(cfg.saldoHoy - pendiente)}
          </div>
        )}

        {(() => {
          const libre = cfg.saldoHoy - pendiente;
          const hoy = new Date(), hISO = hoyISO();
          const dc = cfg.diaCobro || 28;
          const prox = new Date(hoy.getFullYear(), hoy.getMonth(), dc, 12);
          if (prox <= hoy) prox.setMonth(prox.getMonth() + 1);
          const faltan = Math.max(1, Math.round((prox - hoy) / 86400000));
          const porDia = Math.max(0, Math.floor(libre / faltan));

          // Lo que ya gastaste hoy: el gancho para abrir la app todos los días
          const brutoHoy = movs
            .filter((m) => m.fecha === hISO && m.tipo === "gasto" && !m.recurrente)
            .reduce((a, m) => a + (+m.monto || 0) / Math.max(1, m.cuotas || 1), 0);
          // Si pusiste el contador a cero hoy, descontamos lo que ya había
          const base = cfg.ritmoBase && cfg.ritmoBase.fecha === hISO ? +cfg.ritmoBase.monto || 0 : 0;
          const gastadoHoy = Math.max(0, brutoHoy - base);
          const usado = porDia > 0 ? Math.min(100, (gastadoHoy / porDia) * 100) : 0;
          const pasado = porDia > 0 && gastadoHoy > porDia;

          if (libre < 0) return (
            <div style={{ fontSize: 13.5, color: "#F0A896", marginTop: 10, lineHeight: 1.5 }}>
              Te faltan {plata(-libre)} para cubrir lo que queda del mes.
            </div>
          );

          return (
            <div style={{ marginTop: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                            marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "rgba(234,240,236,.72)" }}>
                  Hoy gastaste <b className="num" style={{ color: "#fff" }}>{plata(gastadoHoy)}</b>
                </span>
                <span className="num" style={{ fontSize: 12.5, color: "rgba(234,240,236,.55)" }}>
                  de {plata(porDia)}
                </span>
              </div>
              <div className="ritmo">
                <i style={{ width: `${Math.max(2, usado)}%`,
                     background: pasado ? "#E88B72" : "#7FD6A8" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                            gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 12.5, color: "rgba(234,240,236,.62)", lineHeight: 1.5 }}>
                  {pasado
                    ? `Te pasaste ${plata(gastadoHoy - porDia)} de tu día. Compensalo mañana.`
                    : gastadoHoy > 0
                      ? `Te quedan ${plata(porDia - gastadoHoy)} para hoy · faltan ${faltan} días para cobrar`
                      : `${plata(porDia)} por día durante ${faltan} días, hasta que cobres`}
                </span>
                {brutoHoy > 0 && (
                  <button
                    onClick={() => setCfg({ ...cfg,
                      ritmoBase: base ? null : { fecha: hISO, monto: brutoHoy } })}
                    style={{ fontSize: 12, color: "rgba(234,240,236,.7)", fontWeight: 600,
                             whiteSpace: "nowrap", flexShrink: 0 }}>
                    {base ? "Deshacer" : "Poner en cero"}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {invertido.total > 0 && (
          <button onClick={onVerInvertido}
            style={{ width: "100%", textAlign: "left", marginTop: 15, paddingTop: 13,
                     borderTop: "1px solid rgba(234,240,236,.14)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12.5, color: "rgba(234,240,236,.62)" }}>Patrimonio total</span>
              <span className="num plata" style={{ fontSize: 17, color: "#EAF0EC" }}>
                {plata(cfg.saldoHoy + invertido.total)}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(234,240,236,.5)", marginTop: 4, lineHeight: 1.5 }}>
              {plata(cfg.saldoHoy)} en efectivo · {plata(invertido.total)} invertido
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 8, height: 5,
                          borderRadius: 99, overflow: "hidden" }}>
              {(() => {
                const tot = cfg.saldoHoy + invertido.total || 1;
                const cols = ["#7FD6A8", "#9FC7E8", "#E8C98B", "#C9A8E0", "#E8A89B"];
                const partes = [["Efectivo", cfg.saldoHoy],
                                ...Object.entries(invertido.porTipo)].filter(([, v]) => v > 0);
                return partes.map(([n, v], i) => (
                  <span key={n} title={n} style={{ width: `${(v / tot) * 100}%`,
                        background: cols[i % cols.length], borderRadius: 99 }} />
                ));
              })()}
            </div>
            <div style={{ fontSize: 11, color: "rgba(234,240,236,.45)", marginTop: 6 }}>
              {["Efectivo", ...Object.keys(invertido.porTipo)].slice(0, 4).join(" · ")}
            </div>
          </button>
        )}

        {pendiente !== 0 && !editSaldo && (
          <div style={{ marginTop: 15, paddingTop: 13,
                        borderTop: "1px solid rgba(234,240,236,.14)" }}>
            {[["En la cuenta hoy", cfg.saldoHoy],
              ...(gastoPend > 0 ? [["Falta pagar", -gastoPend]] : []),
              ...(gastoPend < 0 ? [["Falta que entre", -gastoPend]] : []),
              ...(ahorroMes > 0 ? [["Pasás a dólares", -ahorroMes]] : [])]
              .map(([n, v]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between",
                                      fontSize: 13, marginTop: 5 }}>
                  <span style={{ color: "rgba(234,240,236,.62)" }}>{n}</span>
                  <span className="num" style={{ color: "#EAF0EC" }}>{plata(v)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {undo && onDeshacer && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline",
                      gap: 8, marginTop: 9 }}>
          <span style={{ fontSize: 11.5, color: T.tenue }}>Acabás de cambiar {undo.que}</span>
          <button onClick={onDeshacer}
            style={{ fontSize: 12, color: T.ambar, fontWeight: 600 }}>Deshacer</button>
        </div>
      )}

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

      {pendientesDeuda > 0 && (
        <button onClick={onVerPersonas} className="aviso"
          style={{ width: "100%", textAlign: "left", marginTop: 12, background: T.ambarBg }}>
          <div style={{ fontSize: 13.5, fontWeight: 620, marginBottom: 4 }}>
            {pendientesDeuda === 1
              ? "Tenés un gasto compartido para responder"
              : `Tenés ${pendientesDeuda} gastos compartidos para responder`}
          </div>
          <div style={{ fontSize: 12.5, color: T.suave }}>
            Alguien cargó algo que compartieron, o te avisó que ya te pagó.
          </div>
        </button>
      )}

      {estimados.length > 0 && (
        <button onClick={onAbrirMedios} className="aviso"
          style={{ width: "100%", textAlign: "left", marginTop: 12, background: T.ambarBg }}>
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
        <div key={c.id} className="aviso" style={{ marginTop: 12, background: T.ambarBg }}>
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
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 19, fontWeight: 660, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Arranquemos por lo rápido
          </div>
          <div style={{ fontSize: 13.5, color: T.suave, lineHeight: 1.6, marginBottom: 14 }}>
            En dos minutos vas a ver cuánta plata te queda de verdad, mes a mes.
          </div>

          {[["1", "Subí el PDF de un resumen",
             "Cargo todos tus gastos, las cuotas y las fechas de tu tarjeta de una",
             onAbrirImportar, true],
            ["2", "Poné cuánta plata tenés hoy",
             "Lo que hay en la cuenta y en el bolsillo, nada más",
             () => setEditSaldo(true), false],
            ["3", "Cargá tu sueldo",
             "Con el + de abajo, como ingreso que se repite todos los meses",
             null, false],
          ].map(([n, tit, sub, accion, destacado]) => (
            <button key={n} onClick={accion || undefined}
              className="card"
              style={{ width: "100%", textAlign: "left", padding: "14px 15px", marginBottom: 9,
                       display: "flex", gap: 13, alignItems: "flex-start",
                       borderColor: destacado ? T.tinta : T.linea,
                       cursor: accion ? "pointer" : "default" }}>
              <span style={{ width: 24, height: 24, borderRadius: 99, flexShrink: 0,
                             background: destacado ? T.tinta : T.papel,
                             color: destacado ? "#EAF0EC" : T.suave,
                             display: "flex", alignItems: "center", justifyContent: "center",
                             fontSize: 12.5, fontWeight: 660, marginTop: 1 }}>{n}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 620 }}>{tit}</span>
                <span style={{ display: "block", fontSize: 12.5, color: T.suave,
                               marginTop: 3, lineHeight: 1.5 }}>{sub}</span>
              </span>
              {accion && <span style={{ fontSize: 18, color: T.tenue, marginTop: 2 }}>›</span>}
            </button>
          ))}

          <div style={{ fontSize: 12, color: T.tenue, marginTop: 12, lineHeight: 1.6,
                        textAlign: "center" }}>
            El resumen se lee en tu teléfono y no se sube a ningún lado.
          </div>
        </div>
      )}

      {escenariosCard}

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

      {cfg.horizonte > 1 && (
        <div className="card" style={{ padding: "15px 13px 9px", marginTop: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                        padding: "0 3px" }}>
            <span style={{ fontSize: 13, color: T.suave }}>
              Al cierre de {etiqMesLargo(fin.mk)}
            </span>
            <span className="plata num" style={{ fontSize: 21,
                  color: fin.saldo < 0 ? T.rojo : T.tinta }}>{plata(fin.saldo)}</span>
          </div>
          <Curva filas={filas} onTocar={(mk) => setAbierta(abierta === mk ? null : mk)} />
          <div style={{ display: "flex", gap: 14, padding: "0 3px 8px", fontSize: 11.5, color: T.tenue }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 13, height: 2.5, background: T.verde, borderRadius: 2 }} />
              lo que te queda
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 13, height: 0, borderTop: `2px dashed ${T.rojo}` }} />
              lo que sale
            </span>
          </div>
          <div style={{ fontSize: 12, color: T.suave, padding: "0 3px 6px", lineHeight: 1.5 }}>
            {(() => {
              const peor = filas.reduce((a, b) => (b.saldo < a.saldo ? b : a));
              if (peor.saldo < 0) return `Te vas abajo de cero en ${etiqMesLargo(peor.mk)}. Tocá el mes para ver por qué.`;
              const primero = filas[0].saldo;
              if (fin.saldo > primero * 1.25) return "Venís mejorando: cada mes te queda más.";
              if (fin.saldo < primero * 0.75) return `Vas para abajo. Lo más ajustado es ${etiqMesLargo(peor.mk)}.`;
              return "Te mantenés parejo en todo el período.";
            })()}
          </div>
        </div>
      )}

      <div className="eje" style={{ marginTop: 18 }}>
        {filas.map((f) => mesCard(f, false))}
      </div>

      <Vencimientos medios={medios} />

      {medios.some((m) => m.id !== "efectivo") && (
        <button onClick={onFinanciar} className="card"
          style={{ width: "100%", textAlign: "left", padding: "14px 15px", marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 620 }}>
                ¿Pago todo o el mínimo?
              </span>
              <span style={{ display: "block", fontSize: 12, color: T.suave, marginTop: 3 }}>
                Con la tasa de tu tarjeta y la de tu plata
              </span>
            </span>
            <span style={{ fontSize: 18, color: T.tenue }}>›</span>
          </div>
        </button>
      )}

      {historial.length > 0 && (
        <div style={{ marginTop: 18 }}>
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
              <div className="eje">{historial.slice().reverse().map((f) => mesCard(f, true))}</div>
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
      if (m.auto === false) p.push(m.manual === false ? "varía" : "estimado, desde el mes que viene");
      if (m.hasta) p.push(`hasta ${etiqMes(m.hasta)}`);
    }
    else if ((m.cuotas || 1) > 1) p.push(`${m.cuotas} cuotas desde ${etiqMes(m.mesInicio)}`);
    else p.push(etiqMes(m.mesInicio));
    if (m.persona) p.push(`${m.persona} ${Math.round(m.pct * 100)}%`);
    if (m.soloDeuda) p.push("ya salió de tu caja");
    if (m.paraMes === "siguiente") p.push("para el mes siguiente");
    if (m.devPct || m.devTope) p.push("reintegro " + (m.devPct ? m.devPct + "%" : plata(m.devTope))
      + (m.devDestino === "tarjeta" ? " a la tarjeta" : " a la caja"));
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

/* ===================== AJUSTES ===================== */
function Ajustes({ cfg, setCfg, medios, movs, onBorrarVarios, onReiniciar, onImportar, onAbrirMedios, onAbrirImportar, onCargarEjemplo, onReportar, onCerrar }) {
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

        <button className="btn ghost" style={{ marginBottom: 10, fontSize: 14.5, fontWeight: 500 }}
          onClick={onAbrirMedios}>
          Mis medios de pago ({medios.length})
        </button>
        <button className="btn ghost" style={{ marginBottom: 20, fontSize: 14.5, fontWeight: 500 }}
          onClick={onAbrirImportar}>
          Importar el PDF de un resumen
        </button>

        <button className="btn ghost" style={{ marginBottom: 20, fontSize: 14.5, fontWeight: 500,
              borderColor: T.ambar, color: T.ambar }}
          onClick={onReportar}>
          Reportar un problema o una idea
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
            if (confirm("¿Dejar la cuenta completamente vacía? Se borran todos tus movimientos y tarjetas. No se puede deshacer."))
              onReiniciar();
          }}
        >
          Vaciar la cuenta
        </button>

        {!movs.length && (
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (confirm("Voy a cargar un juego de datos de ejemplo para que veas cómo funciona. Después podés vaciarla."))
                onCargarEjemplo();
            }}
          >
            Cargar datos de ejemplo
          </button>
        )}
      </div>
    </div>
  );
}


/* ===================== ESCENARIOS: PIEZAS DE PANTALLA ===================== */
const DUENO = "jbblanco";   // las pantallas nuevas solo aparecen con este usuario

const pctTxt = (x, d = 2) =>
  ((+x || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: d }) + "%";
const plataR = (n) => plata(Math.round(+n || 0));

// Número editable. modo: "plata" (entero con miles) · "int" · "pct" (guarda fracción) · "dec"
function NumIn({ value, onChange, modo = "plata", style, placeholder }) {
  const fmt = (v) => {
    if (v == null || v === "" || !isFinite(+v)) return "";
    if (modo === "pct") return String(+(+v * 100).toFixed(4)).replace(".", ",");
    if (modo === "dec") return String(+v).replace(".", ",");
    if (modo === "int") return String(Math.round(+v));
    return Math.round(+v).toLocaleString("es-AR");
  };
  const [txt, setTxt] = useState(fmt(value));
  const [foco, setFoco] = useState(false);
  useEffect(() => { if (!foco) setTxt(fmt(value)); }, [value, foco, modo]);
  const parse = (t) => {
    let s = String(t || "").trim();
    if (modo === "plata" || modo === "int") s = s.replace(/[^\d-]/g, "");
    else s = s.replace(/[^\d.,-]/g, "").replace(",", ".");
    if (s === "" || s === "-" || s === ".") return null;
    const n = parseFloat(s);
    if (!isFinite(n)) return null;
    return modo === "pct" ? n / 100 : n;
  };
  return (
    <input className="num" inputMode={modo === "plata" || modo === "int" ? "numeric" : "decimal"}
      value={txt} placeholder={placeholder}
      onFocus={() => { setFoco(true); if (modo === "plata") setTxt(value ? String(Math.round(+value)) : ""); }}
      onBlur={() => setFoco(false)}
      onChange={(e) => { setTxt(e.target.value); const n = parse(e.target.value); onChange(n == null ? 0 : n); }}
      style={{ textAlign: "right", padding: "9px 11px", ...(style || {}) }} />
  );
}

function MesIn({ value, onChange, vacio }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="month" value={value || ""} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "8px 10px" }} />
      {vacio && value && (
        <button onClick={() => onChange("")} aria-label="Sacar la fecha"
          style={{ fontSize: 15, color: T.tenue, padding: "0 6px" }}>✕</button>
      )}
    </div>
  );
}

function Campo({ label, children, nota }) {
  return (
    <div style={{ marginTop: 12, minWidth: 0 }}>
      <label className="lbl">{label}</label>
      {children}
      {nota && <div style={{ fontSize: 11.5, color: T.suave, marginTop: 5, lineHeight: 1.5 }}>{nota}</div>}
    </div>
  );
}
const Dos = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, alignItems: "end" }}>{children}</div>
);

function Seccion({ titulo, sub, children, abierta = false }) {
  const [a, setA] = useState(abierta);
  return (
    <div className="card" style={{ marginTop: 10, overflow: "hidden" }}>
      <button onClick={() => setA(!a)}
        style={{ width: "100%", textAlign: "left", padding: "13px 15px", display: "flex",
                 justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 620 }}>{titulo}</span>
          {sub && <span style={{ display: "block", fontSize: 12, color: T.suave, marginTop: 2 }}>{sub}</span>}
        </span>
        <span style={{ color: T.tenue, fontSize: 18, flexShrink: 0 }}>{a ? "−" : "+"}</span>
      </button>
      {a && <div style={{ padding: "2px 15px 15px", borderTop: `1px solid ${T.linea}` }}>{children}</div>}
    </div>
  );
}

// El cartel que nunca te deja confundir un escenario con lo real
const Ficticio = ({ chico }) => (
  <span style={{ display: "inline-block", fontSize: chico ? 10 : 11, fontWeight: 700,
                 letterSpacing: ".06em", color: "#7A4E06", background: T.ambarBg,
                 border: "1px solid #E9C98A", borderRadius: 6,
                 padding: chico ? "2px 6px" : "3px 8px", whiteSpace: "nowrap" }}>
    ESCENARIO (ficticio)
  </span>
);

function escenarioVacio() {
  const hoy = mesDeHoy();
  return {
    id: "esc" + Date.now(), nombre: "Nuevo escenario", activo: true,
    base: hoy, desde: sumaMes(hoy, 1), meses: 60, inicial: 0,
    inflacion: INFL_BASE.map((x) => ({ ...x })),
    uva: { mes: "2026-10", valor: 2150.5 },
    sueldo: { activo: false, neto: 0, ajustes: [3, 9], ultimoCubierto: sumaMes(hoy, -3), rezago: 3,
              meritoPct: 0, meritoMes: "", aguinaldo: 0.5, bono: 0, mesesAguinaldo: [6, 12], quitar: [] },
    prestamo: null, quitar: [], items: [],
    fondo: { inicial: 0, aporte: 0, aporteSube: true, desde: "", pctAguinaldo: 0, aguinaldoDesde: "",
             instrumento: { tipo: "pfuva", tna: 0.01 }, extras: [] },
  };
}
const prestamoVacio = (esc) => ({
  nombre: "Préstamo", monto: 10000000, tna: 0.2, cuotas: 60, iva: 0.21, uva: true,
  desembolso: sumaMes(esc.desde, -1), primera: esc.desde,
  penalidad: 0.04, penalidadHasta: 14, cancelarDesde: 15, colchon: 1000000, autoCancelar: true,
});

const NOMBRE_INST = { pfuva: "PF UVA", pf: "Plazo fijo", fci: "FCI money market", mep: "Dólar MEP", ninguno: "No rinde" };

/* ---------- Tabla mes a mes ---------- */
function TablaEscenario({ filas, enHoy }) {
  const v = (x, f) => (enHoy ? x / f.ix : x);
  const cols = [
    ["Te entra", (f) => f.entra],
    ["Gastos", (f) => f.gastos],
    ["Préstamos y cuotas", (f) => f.prest],
    ["Cuota del préstamo", (f) => f.cuotaEsc],
    ["Te queda en el mes", (f) => f.queda, true],
    ["Separás para el fondo", (f) => f.separa],
    ["Te queda libre", (f) => f.libre],
    ["Fondo acumulado", (f) => f.fondo],
    ["Libre acumulado", (f) => f.libreAc],
  ];
  const th = { padding: "9px 10px", fontSize: 11, fontWeight: 600, color: T.suave, textAlign: "right",
               borderBottom: `1px solid ${T.linea}`, background: T.card, verticalAlign: "bottom",
               lineHeight: 1.3, minWidth: 96 };
  const pega = { position: "sticky", left: 0, zIndex: 1, textAlign: "left", minWidth: 70,
                 borderRight: `1px solid ${T.linea}` };
  return (
    <div className="card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: 10 }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...th, ...pega }}>Mes</th>
            {cols.map(([n, , fuerte]) => (
              <th key={n} style={{ ...th, color: fuerte ? T.tinta : T.suave }}>{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const fondoFila = f.cancelacion ? T.verdeBg : f.queda < 0 ? "#FDF3F1" : T.card;
            return (
              <tr key={f.mk}>
                <td style={{ padding: "8px 10px", borderBottom: `1px solid ${T.linea}`, background: fondoFila, ...pega }}>
                  <div style={{ fontWeight: 600 }}>{etiqMes(f.mk)}</div>
                  {f.cuotaK && <div style={{ fontSize: 10.5, color: T.tenue }}>cuota {f.cuotaK}</div>}
                  {f.cancelacion > 0 && <div style={{ fontSize: 10.5, color: T.verde, fontWeight: 700 }}>cancelás</div>}
                </td>
                {cols.map(([n, get, fuerte]) => {
                  const x = v(get(f), f);
                  return (
                    <td key={n} className="num"
                      style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap",
                               borderBottom: `1px solid ${T.linea}`, background: fondoFila,
                               fontWeight: fuerte ? 650 : 400,
                               color: fuerte ? (x < 0 ? T.rojo : T.tinta) : x < 0 ? T.rojo : T.tinta }}>
                      {Math.round(x) === 0 ? "—" : plataR(x)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Resultado de un escenario ---------- */
const NOMBRE_CASO = { optimista: "Optimista", base: "Base", pesimista: "Pesimista" };
const describirCaso = (c) => [
  `inflación ×${String(+c.inflMult || 1).replace(".", ",")}`,
  `el sueldo cubre ${Math.round((c.cobertura != null ? +c.cobertura : 1) * 100)}% de la inflación`,
  c.shockMes && +c.shockPct ? `salto de ${pctTxt(c.shockPct, 1)} en ${etiqMes(c.shockMes)}` : "",
].filter(Boolean).join(" · ");

function CasosCard({ resCasos, casos, caso, setCaso, conPrestamo }) {
  const m = {
    optimista: metricasEscenario(resCasos.optimista),
    base: metricasEscenario(resCasos.base),
    pesimista: metricasEscenario(resCasos.pesimista),
  };
  const orden = ["optimista", "base", "pesimista"];
  const fila = (label, get, color) => (
    <>
      <div style={{ gridColumn: "1 / -1", fontSize: 11, color: T.suave, marginTop: 9 }}>{label}</div>
      {orden.map((k) => {
        const [txt, sub, c] = get(m[k], k);
        return (
          <div key={k} className="num" style={{ textAlign: "center", fontSize: 13.5, fontWeight: 600,
                color: c || (caso === k ? T.tinta : T.suave) }}>
            {txt}
            {sub && <div style={{ fontSize: 10.5, fontWeight: 400, color: T.tenue }}>{sub}</div>}
          </div>
        );
      })}
    </>
  );
  return (
    <div className="card" style={{ padding: "13px 13px 14px", marginTop: 10 }}>
      <div style={{ fontSize: 13.5, fontWeight: 620 }}>¿Y si sale mejor o peor?</div>
      <div style={{ fontSize: 11.5, color: T.suave, marginTop: 3, lineHeight: 1.5 }}>
        Todo en pesos de hoy. Tocá un caso para ver toda la pantalla con ese caso.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6, marginTop: 10 }}>
        {orden.map((k) => (
          <button key={k} className={"chip sm" + (caso === k ? " on" : "")} onClick={() => setCaso(k)}
            style={{ padding: "7px 0", textAlign: "center" }}>{NOMBRE_CASO[k]}</button>
        ))}
        {conPrestamo && fila("Cancelás el préstamo", (x) => x.cancelado
          ? [`cuota ${x.cancelado.k}`, etiqMes(x.cancelado.mk)] : ["no llegás", "antes del final", T.rojo])}
        {conPrestamo && fila("Cuota más alta", (x) => [corta(x.cuotaMax), etiqMes(x.cuotaMaxMes)])}
        {fila("Mes más flaco (te queda)", (x) => [corta(x.peorQueda), etiqMes(x.peorMes), x.peorQueda < 0 ? T.rojo : null])}
        {fila("Meses en rojo", (x) => [String(x.enRojo), null, x.enRojo > 0 ? T.rojo : null])}
        {conPrestamo && fila("Intereses + IVA", (x) => [corta(x.intIvaHoy)])}
        {fila("Ahorro al final", (x) => [corta(x.ahorroFinal), null, x.ahorroFinal < 0 ? T.rojo : null])}
      </div>
      <div style={{ fontSize: 11, color: T.tenue, marginTop: 12, lineHeight: 1.5 }}>
        Optimista: {describirCaso(casos.optimista)}.<br />
        Pesimista: {describirCaso(casos.pesimista)}.<br />
        Los cambiás en Editar → Casos.
      </div>
    </div>
  );
}

function ResultadoEscenario({ esc, res, faltan, enHoy, setEnHoy, resCasos, casos, caso = "base", setCaso }) {
  const c = res.cancelado;
  const ultimo = res.filas[res.filas.length - 1];
  const p = esc.prestamo;
  return (
    <>
      {caso !== "base" && (
        <div className="aviso" style={{ background: caso === "pesimista" ? T.rojoBg : T.verdeBg, marginTop: 12,
              color: caso === "pesimista" ? T.rojo : T.verde }}>
          <b>Viendo el caso {NOMBRE_CASO[caso].toLowerCase()}:</b> {describirCaso(casos[caso])}.{" "}
          <button onClick={() => setCaso("base")} style={{ fontWeight: 700, textDecoration: "underline" }}>Volver al base</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {[[false, "Pesos de cada mes"], [true, "Pesos de hoy"]].map(([val, n]) => (
          <button key={n} className={"chip sm" + (enHoy === val ? " on" : "")}
            onClick={() => setEnHoy(val)}>{n}</button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
        {enHoy ? `Todo deflactado por tu inflación supuesta, a pesos de ${etiqMesLargo(esc.base || mesDeHoy())}.`
               : "Cada número en los pesos del mes en que pasa."}
      </div>

      <div className="cima" style={{ padding: "18px 18px 16px", marginTop: 12 }}>
        <div style={{ fontSize: 12.5, color: "rgba(234,240,236,.62)" }}>
          {p ? "Cancelás el préstamo" : "Ahorro total al final"}
        </div>
        {p ? (c ? (
          <>
            <div className="plata" style={{ fontSize: 30, color: "#fff", marginTop: 4, letterSpacing: "-0.03em" }}>
              Cuota {c.k} · {etiqMesLargo(c.mk)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(234,240,236,.75)", marginTop: 8, lineHeight: 1.55 }}>
              Pagás <b className="num" style={{ color: "#fff" }}>{plataR(enHoy ? c.monto / res.macro.idx(c.mk) : c.monto)}</b>
              {c.penalidad > 0 ? " (con penalidad)" : ""} y te quedan{" "}
              <b className="num" style={{ color: "#fff" }}>{plataR(enHoy ? c.colchonHoy : c.colchon)}</b> de colchón.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 17, color: "#fff", marginTop: 6, lineHeight: 1.45 }}>
            Con este fondo no llegás a cancelarlo antes. Lo pagás en {p.cuotas} cuotas.
          </div>
        )) : (
          <div className="plata" style={{ fontSize: 30, color: "#fff", marginTop: 4 }}>
            {plataR(enHoy ? ultimo.ahorro / ultimo.ix : ultimo.ahorro)}
          </div>
        )}
        {p && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12,
                        borderTop: "1px solid rgba(234,240,236,.14)", fontSize: 12.5 }}>
            <span style={{ color: "rgba(234,240,236,.62)" }}>Intereses + IVA pagados (pesos de hoy)</span>
            <span className="num" style={{ color: "#fff", fontWeight: 600 }}>{plataR(res.intIvaHoy)}</span>
          </div>
        )}
      </div>

      {resCasos && <CasosCard resCasos={resCasos} casos={casos} caso={caso} setCaso={setCaso} conPrestamo={!!p} />}

      <div className="card" style={{ padding: "12px 15px", marginTop: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620, marginBottom: 6 }}>Ahorro total a fin de cada año</div>
        <div style={{ fontSize: 11.5, color: T.suave, marginBottom: 6 }}>Fondo + libre acumulado.</div>
        {res.anual.map((a) => (
          <div key={a.mk} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span style={{ color: T.suave }}>{a.mk.slice(5) === "12" ? "Dic " + a.anio : etiqMesLargo(a.mk)}</span>
            <span className="num" style={{ color: a.ahorro < 0 ? T.rojo : T.tinta }}>
              {plataR(enHoy ? a.ahorroHoy : a.ahorro)}
            </span>
          </div>
        ))}
      </div>

      {p && faltan.length > 0 && (
        <div className="card" style={{ padding: "12px 15px", marginTop: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 620 }}>¿Cuánto te falta para cancelar antes?</div>
          <div style={{ fontSize: 11.5, color: T.suave, marginTop: 3, marginBottom: 6, lineHeight: 1.5 }}>
            Plata extra que tendría que haber en el fondo ese mes (saldo + penalidad + colchón), sin la cancelación automática.
          </div>
          {faltan.map((x) => (
            <div key={x.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                                    fontSize: 13, padding: "5px 0", borderTop: `1px solid ${T.linea}` }}>
              <span>Cuota {x.k} <span style={{ color: T.tenue, fontSize: 11.5 }}>· {etiqMes(x.mk)}</span></span>
              <span className="num" style={{ color: x.falta > 0 ? T.tinta : T.verde, fontWeight: 600 }}>
                {x.falta > 0 ? plataR(enHoy ? x.faltaHoy : x.falta) : "te alcanza"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 15, fontWeight: 620, marginTop: 20 }}>Mes a mes</div>
      <div style={{ fontSize: 11.5, color: T.suave, marginTop: 3 }}>Deslizá la tabla para ver todas las columnas.</div>
      <TablaEscenario filas={res.filas} enHoy={enHoy} />
    </>
  );
}

/* ---------- Comparar ---------- */
function CompararEscenario({ esc, res, cfg, movs, medios, otros, enHoy }) {
  const [contra, setContra] = useState("real");
  const b = useMemo(() => {
    if (contra === "real") {
      const r = proyectar({ ...cfg, desdeMes: res.filas[0].mk, ajuste: 0, saldoHoy: 0, reservasUsd: 0 },
                          movs, medios, res.filas.length, null);
      let ac = 0;
      return r.map((f, i) => { ac += f.resultado; return { mk: f.mk, queda: f.resultado, ahorro: ac, ix: res.filas[i].ix }; });
    }
    const e2 = otros.find((x) => x.id === contra);
    if (!e2) return null;
    const r2 = proyectarEscenario(e2, cfg, movs, medios);
    const porMes = {}; r2.filas.forEach((f) => { porMes[f.mk] = f; });
    return res.filas.map((f) => porMes[f.mk]
      ? { mk: f.mk, queda: porMes[f.mk].queda, ahorro: porMes[f.mk].ahorro, ix: f.ix }
      : { mk: f.mk, queda: 0, ahorro: 0, ix: f.ix, falta: true });
  }, [contra, esc, res, cfg, movs, medios, otros]);
  const v = (x, ix) => (enHoy ? x / ix : x);
  const nombreB = contra === "real" ? "Real" : (otros.find((x) => x.id === contra) || {}).nombre;
  const finA = res.filas[res.filas.length - 1];
  const finB = b && b[b.length - 1];

  return (
    <>
      <label className="lbl" style={{ marginTop: 14 }}>Comparar contra</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className={"chip sm" + (contra === "real" ? " on" : "")} onClick={() => setContra("real")}>Lo real</button>
        {otros.map((o) => (
          <button key={o.id} className={"chip sm" + (contra === o.id ? " on" : "")}
            onClick={() => setContra(o.id)}>{o.nombre}</button>
        ))}
      </div>
      {contra === "real" && (
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 7, lineHeight: 1.5 }}>
          "Lo real" es tu flujo tal cual lo tenés cargado: sin préstamo nuevo, sin bolsas y sin ajustar por inflación.
        </div>
      )}

      {b && finB && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
          {[[esc.nombre, finA.ahorro, finA.ix, true], [nombreB, finB.ahorro, finB.ix, false]].map(([n, a, ix, esA]) => (
            <div key={n + esA} className="card" style={{ padding: "12px 13px" }}>
              {esA ? <Ficticio chico /> : contra !== "real" ? <Ficticio chico /> :
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: T.verde }}>REAL</span>}
              <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>
              <div style={{ fontSize: 11, color: T.suave, marginTop: 2 }}>Ahorro a {etiqMes(finA.mk)}</div>
              <div className="num plata" style={{ fontSize: 17, marginTop: 4, color: a < 0 ? T.rojo : T.tinta }}>
                {corta(v(a, ix))}
              </div>
            </div>
          ))}
        </div>
      )}

      {b && (
        <div className="card" style={{ marginTop: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 1fr 1fr", gap: 6, padding: "9px 12px",
                        fontSize: 11, color: T.suave, fontWeight: 600, borderBottom: `1px solid ${T.linea}` }}>
            <span>Mes</span>
            <span style={{ textAlign: "right" }}>Escenario</span>
            <span style={{ textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreB}</span>
            <span style={{ textAlign: "right" }}>Diferencia</span>
          </div>
          <div style={{ fontSize: 10.5, color: T.tenue, padding: "6px 12px 2px" }}>Te queda en el mes</div>
          {res.filas.map((f, i) => {
            const x = b[i]; if (!x) return null;
            const d = v(f.queda, f.ix) - v(x.queda, x.ix);
            return (
              <div key={f.mk} className="num" style={{ display: "grid", gridTemplateColumns: "58px 1fr 1fr 1fr",
                    gap: 6, padding: "6px 12px", fontSize: 12, borderTop: i ? `1px solid ${T.linea}` : "none" }}>
                <span style={{ color: T.suave }}>{etiqMes(f.mk)}</span>
                <span style={{ textAlign: "right", color: f.queda < 0 ? T.rojo : T.tinta }}>{corta(v(f.queda, f.ix))}</span>
                <span style={{ textAlign: "right", color: x.queda < 0 ? T.rojo : T.tinta }}>{x.falta ? "—" : corta(v(x.queda, x.ix))}</span>
                <span style={{ textAlign: "right", color: d < 0 ? T.rojo : T.verde }}>{d > 0 ? "+" : ""}{corta(d)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------- Editor ---------- */
function EditorEscenario({ esc, onCambiar, movs, macroCfg, medios }) {
  const up = (patch) => onCambiar({ ...esc, ...patch });
  const s = esc.sueldo || {};
  const upS = (patch) => up({ sueldo: { ...s, ...patch } });
  const p = esc.prestamo;
  const upP = (patch) => up({ prestamo: { ...p, ...patch } });
  const f = esc.fondo || {};
  const upF = (patch) => up({ fondo: { ...f, ...patch } });
  const [itemAbierto, setItemAbierto] = useState(null);
  const [estApi, setEstApi] = useState("");
  const macro = useMemo(() => macroDeEscenario(esc), [esc.inflacion, esc.base, esc.uva, esc.inflacionReal]);
  const cs = casosDe(esc);
  const upCaso = (k, patch) => up({ casos: { ...(esc.casos || {}), [k]: { ...cs[k], ...patch } } });
  const real = esc.inflacionReal || {};
  const mesesReales = Object.keys(real).sort();

  const traerDatosOficiales = async () => {
    setEstApi("Buscando…");
    const partes = [];
    let nuevo = { ...esc };
    try {
      const u = uvaDelDia10(await traerUva());
      if (u) {
        nuevo.uva = { mes: u.mes, valor: u.valor };
        partes.push(`UVA del ${u.fecha.split("-").reverse().join("/")}: ${u.valor.toLocaleString("es-AR")}`);
      }
    } catch (e) { partes.push("no pude traer la UVA"); }
    try {
      const inf = await traerInflacion();
      // Solo los meses que le importan al escenario: desde un año antes del mes base
      const desde = sumaMes(esc.base || mesDeHoy(), -12);
      const r = {};
      Object.keys(inf).forEach((mk) => { if (mk >= desde) r[mk] = inf[mk]; });
      nuevo.inflacionReal = r;
      const ks = Object.keys(r).sort();
      if (ks.length) partes.push(`inflación publicada hasta ${etiqMesLargo(ks[ks.length - 1])}`);
    } catch (e) { partes.push("no pude traer la inflación"); }
    onCambiar(nuevo);
    setEstApi(partes.join(" · ") + ".");
  };
  const crono = useMemo(() => cronogramaPrestamo(p, macro), [p, macro]);
  const medioCorto = (id) => ((medios || []).find((m) => m.id === id) || {}).corto || "";

  const toggleEn = (lista, id) => (lista || []).includes(id) ? lista.filter((x) => x !== id) : [...(lista || []), id];
  const realesGasto = (movs || []).filter((m) => m.tipo === "gasto" && (m.recurrente || m.categoria === "Préstamos"));
  const realesIngreso = (movs || []).filter((m) => m.tipo === "ingreso");
  const montoReal = (m) => m.moneda === "USD" ? `USD ${m.montoUsd}` : plataR(m.monto);

  const updItem = (id, patch) => up({ items: (esc.items || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const descItem = (it) => [
    plataR(it.monto) + (it.tipo === "ingreso" ? " entra" : "") + "/mes",
    it.desde ? "desde " + etiqMes(it.desde) : "",
    it.hasta ? "hasta " + etiqMes(it.hasta) : "",
    it.bolsa ? (it.modo === "acumula" ? "bolsa, se acumula" : "bolsa, se reinicia") : "",
    it.ajuste === "inflacion" ? "sube con inflación" : it.ajuste === "periodico" ? `ajusta cada ${it.cada || 6} meses` : "fijo",
  ].filter(Boolean).join(" · ");

  return (
    <>
      <Seccion titulo="General" sub={`${etiqMes(esc.desde)} → ${etiqMes(sumaMes(esc.desde, (+esc.meses || 60) - 1))}`}>
        <Campo label="Nombre">
          <input value={esc.nombre} onChange={(e) => up({ nombre: e.target.value })} />
        </Campo>
        <Dos>
          <Campo label="Arranca en"><MesIn value={esc.desde} onChange={(v) => v && up({ desde: v })} /></Campo>
          <Campo label="Cuántos meses"><NumIn modo="int" value={esc.meses} onChange={(v) => up({ meses: Math.max(1, Math.min(120, v)) })} /></Campo>
        </Dos>
        <Dos>
          <Campo label="Pesos de hoy = pesos de"><MesIn value={esc.base} onChange={(v) => v && up({ base: v })} /></Campo>
          <Campo label="Plata libre al arrancar"><NumIn value={esc.inicial} onChange={(v) => up({ inicial: v })} /></Campo>
        </Dos>
        {(() => {
          const fc = configFijos(esc, movs);
          const upFi = (patch) => up({ fijos: { modo: fc.modo, cada: fc.cada, ...(esc.fijos || {}), ...patch } });
          const prestamosReales = (movs || []).filter((m) => m.tipo === "gasto" && m.categoria === "Préstamos" && m.recurrente);
          return (
            <>
              <Campo label="Tus gastos fijos reales (todo lo que no es cuota)">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className={"chip sm" + (fc.modo === "periodico" ? " on" : "")} onClick={() => upFi({ modo: "periodico" })}>Ajustan con la inflación</button>
                  <button className={"chip sm" + (fc.modo !== "periodico" ? " on" : "")} onClick={() => upFi({ modo: "fijo" })}>Quedan como están</button>
                </div>
              </Campo>
              {fc.modo === "periodico" && (
                <>
                  <Campo label="Cada cuántos meses"
                    nota={`Ajustan en ${mesesDeAjuste(fc).join(", ")}, alineados con tu sueldo. Cada ajuste recupera la inflación acumulada desde el anterior.`}>
                    <NumIn modo="int" value={fc.cada} onChange={(v) => upFi({ cada: Math.max(1, Math.min(12, v)) })} />
                  </Campo>
                </>
              )}
              {prestamosReales.length > 0 && (
                <Campo label="Tus préstamos: ¿cómo ajusta la cuota?"
                  nota={"Inflación: sube cuando ajustan tus fijos" + (fc.modo === "periodico" ? "" : " (hoy tus fijos quedan como están, así que no sube)") +
                        ". Sueldos (HogAr): sube lo mismo que tu sueldo."}>
                  {prestamosReales.map((m) => {
                    const t = fc.tipoDe[m.id] || "fija";
                    return (
                      <div key={m.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.linea}` }}>
                        <div style={{ fontSize: 13 }}>{m.detalle} <span className="num" style={{ color: T.tenue, fontSize: 11.5 }}>{plataR(m.monto)}</span></div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {[["fija", "Fija"], ["inflacion", "Inflación"], ["sueldo", "Sueldos (HogAr)"]].map(([v, n]) => (
                            <button key={v} className={"chip sm" + (t === v ? " on" : "")}
                              onClick={() => upFi({ ajustes: { ...((esc.fijos || {}).ajustes || {}), [m.id]: v } })}>{n}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </Campo>
              )}
            </>
          );
        })()}
      </Seccion>

      <Seccion titulo="Inflación y UVA" sub="Cada tasa vale desde su mes hasta el próximo tramo">
        {(esc.inflacion || []).map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 28px", gap: 8, marginTop: 8, alignItems: "center" }}>
            <MesIn value={t.desde} onChange={(v) => up({ inflacion: esc.inflacion.map((x, j) => j === i ? { ...x, desde: v } : x) })} />
            <NumIn modo="pct" value={t.tasa} onChange={(v) => up({ inflacion: esc.inflacion.map((x, j) => j === i ? { ...x, tasa: v } : x) })} />
            <button onClick={() => up({ inflacion: esc.inflacion.filter((_, j) => j !== i) })}
              aria-label="Borrar tramo" style={{ color: T.tenue, fontSize: 15 }}>✕</button>
          </div>
        ))}
        <button className="chip sm" style={{ marginTop: 10 }}
          onClick={() => up({ inflacion: [...(esc.inflacion || []), { desde: sumaMes(esc.desde, 12), tasa: 0.01 }] })}>
          + Agregar tramo
        </button>
        <Dos>
          <Campo label="UVA conocida: mes"><MesIn value={esc.uva && esc.uva.mes} onChange={(v) => up({ uva: { ...esc.uva, mes: v } })} /></Campo>
          <Campo label="Valor"><NumIn modo="dec" value={esc.uva && esc.uva.valor} onChange={(v) => up({ uva: { ...esc.uva, valor: v } })} /></Campo>
        </Dos>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
          La UVA de cada mes = la del mes anterior × (1 + inflación de 2 meses antes).
        </div>

        <button className="btn ghost" style={{ marginTop: 14, fontSize: 14, fontWeight: 600 }} onClick={traerDatosOficiales}>
          Traer UVA (BCRA) e inflación (INDEC)
        </button>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
          {estApi || "Toma la UVA del día 10 más nueva que publicó el BCRA y la inflación mensual ya publicada. Los meses publicados le ganan a tus supuestos; el resto sigue con tus tramos."}
        </div>
        {mesesReales.length > 0 && (
          <div style={{ marginTop: 10, padding: "10px 12px", background: T.papel, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Inflación publicada que se usa</span>
              <button onClick={() => up({ inflacionReal: {} })} style={{ fontSize: 12, color: T.rojo, fontWeight: 600 }}>Olvidarla</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
              {mesesReales.map((mk) => (
                <span key={mk} className="num" style={{ fontSize: 12 }}>
                  <span style={{ color: T.tenue }}>{etiqMes(mk)}</span> {pctTxt(real[mk], 1)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Casos optimista y pesimista" sub="Para ver qué pasa si sale mejor o peor">
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 10, lineHeight: 1.5 }}>
          Se aplican encima de tus supuestos, solo hacia adelante. El caso base es lo que cargaste arriba.
        </div>
        {["optimista", "pesimista"].map((k) => (
          <div key={k} style={{ borderTop: `1px solid ${T.linea}`, marginTop: 12, paddingTop: 4 }}>
            <div style={{ fontSize: 13.5, fontWeight: 620, marginTop: 8, color: k === "pesimista" ? T.rojo : T.verde }}>
              {NOMBRE_CASO[k]}
            </div>
            <Dos>
              <Campo label="Inflación × (1 = igual)"><NumIn modo="dec" value={cs[k].inflMult} onChange={(v) => upCaso(k, { inflMult: v })} /></Campo>
              <Campo label="El sueldo cubre (%)"><NumIn modo="pct" value={cs[k].cobertura} onChange={(v) => upCaso(k, { cobertura: v })} /></Campo>
            </Dos>
            <Dos>
              <Campo label="Salto de precios en"><MesIn vacio value={cs[k].shockMes} onChange={(v) => upCaso(k, { shockMes: v })} /></Campo>
              <Campo label="Salto (%)"><NumIn modo="pct" value={cs[k].shockPct} onChange={(v) => upCaso(k, { shockPct: v })} /></Campo>
            </Dos>
            <Dos>
              <Campo label="Devaluación MEP ×"><NumIn modo="dec" value={cs[k].devMult} onChange={(v) => upCaso(k, { devMult: v })} /></Campo>
              <Campo label="Tasas PF / FCI ×"><NumIn modo="dec" value={cs[k].tasaMult} onChange={(v) => upCaso(k, { tasaMult: v })} /></Campo>
            </Dos>
          </div>
        ))}
        <button onClick={() => up({ casos: undefined })}
          style={{ marginTop: 14, fontSize: 12.5, color: T.ambar, fontWeight: 600 }}>Volver a los valores por defecto</button>
      </Seccion>

      <Seccion titulo="Sueldo y aguinaldo" sub={s.activo !== false && +s.neto ? `${plataR(s.neto)} neto · ajusta en ${(s.ajustes || []).map((m) => MESN[m - 1]).join(" y ")}` : "Usa tus ingresos reales"}>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button className={"chip sm" + (s.activo !== false ? " on" : "")} onClick={() => upS({ activo: true })}>El escenario define el sueldo</button>
          <button className={"chip sm" + (s.activo === false ? " on" : "")} onClick={() => upS({ activo: false })}>Usar lo real</button>
        </div>
        {s.activo !== false && (
          <>
            <Dos>
              <Campo label="Neto de hoy"><NumIn value={s.neto} onChange={(v) => upS({ neto: v })} /></Campo>
              <Campo label="Último mes de inflación cubierto"><MesIn value={s.ultimoCubierto} onChange={(v) => upS({ ultimoCubierto: v })} /></Campo>
            </Dos>
            <Campo label="Meses en que ajusta">
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {MESN.map((n, i) => (
                  <button key={n} className={"chip sm" + ((s.ajustes || []).includes(i + 1) ? " on" : "")}
                    onClick={() => upS({ ajustes: toggleEn(s.ajustes, i + 1).sort((a, b) => a - b) })}>{n}</button>
                ))}
              </div>
            </Campo>
            <Campo label="Cada ajuste cubre la inflación hasta… meses antes"
              nota={`Con ${s.rezago || 3}, el ajuste de ${MESN[((s.ajustes || [3])[0] || 3) - 1]} cubre hasta ${MESN[(((((s.ajustes || [3])[0] || 3) - 1 - (s.rezago || 3)) % 12) + 12) % 12]}.`}>
              <NumIn modo="int" value={s.rezago || 3} onChange={(v) => upS({ rezago: Math.max(1, Math.min(6, v)) })} />
            </Campo>
            <Campo label="Cada ajuste cubre (% de la inflación)"
              nota="100% = el sueldo empata a los precios. Menos de 100%, perdés poder de compra.">
              <NumIn modo="pct" value={s.cobertura != null ? s.cobertura : 1} onChange={(v) => upS({ cobertura: v })} />
            </Campo>
            <Dos>
              <Campo label="Mérito (%)"><NumIn modo="dec" value={s.meritoPct} onChange={(v) => upS({ meritoPct: v })} /></Campo>
              <Campo label="Mes del mérito"><MesIn vacio value={s.meritoMes} onChange={(v) => upS({ meritoMes: v })} /></Campo>
            </Dos>
            <Dos>
              <Campo label="Aguinaldo (sueldos)"><NumIn modo="dec" value={s.aguinaldo} onChange={(v) => upS({ aguinaldo: v })} /></Campo>
              <Campo label="Bono (sueldos)"><NumIn modo="dec" value={s.bono} onChange={(v) => upS({ bono: v })} /></Campo>
            </Dos>
            <Campo label="Meses en que cobrás aguinaldo + bono">
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {MESN.map((n, i) => (
                  <button key={n} className={"chip sm" + ((s.mesesAguinaldo || []).includes(i + 1) ? " on" : "")}
                    onClick={() => upS({ mesesAguinaldo: toggleEn(s.mesesAguinaldo, i + 1).sort((a, b) => a - b) })}>{n}</button>
                ))}
              </div>
            </Campo>
            <Campo label="Ingresos reales que este sueldo reemplaza"
              nota="Los que marques no se cuentan en el escenario (siguen intactos en tu app).">
              {realesIngreso.map((m) => {
                const on = (s.quitar || []).includes(m.id);
                return (
                  <button key={m.id} onClick={() => upS({ quitar: toggleEn(s.quitar, m.id) })}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 10,
                             padding: "8px 0", borderTop: `1px solid ${T.linea}`, textAlign: "left" }}>
                    <span style={{ fontSize: 13, textDecoration: on ? "line-through" : "none", color: on ? T.tenue : T.tinta }}>
                      {m.detalle} <span className="num" style={{ color: T.tenue, fontSize: 11.5 }}>{montoReal(m)}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: on ? T.rojo : T.tenue, flexShrink: 0 }}>
                      {on ? "reemplazado" : "se cuenta"}
                    </span>
                  </button>
                );
              })}
            </Campo>
          </>
        )}
      </Seccion>

      <Seccion titulo="Préstamo" sub={p ? `${p.nombre} · ${plataR(p.monto)} · ${p.cuotas} cuotas` : "Sin préstamo"}>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button className={"chip sm" + (p ? " on" : "")} onClick={() => !p && up({ prestamo: prestamoVacio(esc) })}>Tiene préstamo</button>
          <button className={"chip sm" + (!p ? " on" : "")} onClick={() => p && confirm("¿Sacar el préstamo de este escenario?") && up({ prestamo: null })}>Sin préstamo</button>
        </div>
        {p && (
          <>
            <Campo label="Nombre"><input value={p.nombre || ""} onChange={(e) => upP({ nombre: e.target.value })} /></Campo>
            <Dos>
              <Campo label="Monto"><NumIn value={p.monto} onChange={(v) => upP({ monto: v })} /></Campo>
              <Campo label="Cuotas"><NumIn modo="int" value={p.cuotas} onChange={(v) => upP({ cuotas: Math.max(1, Math.min(120, v)) })} /></Campo>
            </Dos>
            <Dos>
              <Campo label="TNA (%)"><NumIn modo="pct" value={p.tna} onChange={(v) => upP({ tna: v })} /></Campo>
              <Campo label="IVA s/ intereses (%)"><NumIn modo="pct" value={p.iva} onChange={(v) => upP({ iva: v })} /></Campo>
            </Dos>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className={"chip sm" + (p.uva !== false ? " on" : "")} onClick={() => upP({ uva: true })}>En UVA</button>
              <button className={"chip sm" + (p.uva === false ? " on" : "")} onClick={() => upP({ uva: false })}>Tasa fija en pesos</button>
            </div>
            <Dos>
              <Campo label="Desembolso"><MesIn value={p.desembolso} onChange={(v) => upP({ desembolso: v })} /></Campo>
              <Campo label="Primera cuota"><MesIn value={p.primera} onChange={(v) => v && upP({ primera: v })} /></Campo>
            </Dos>
            <Dos>
              <Campo label="Penalidad (%)"><NumIn modo="pct" value={p.penalidad} onChange={(v) => upP({ penalidad: v })} /></Campo>
              <Campo label="…hasta la cuota"><NumIn modo="int" value={p.penalidadHasta} onChange={(v) => upP({ penalidadHasta: v })} /></Campo>
            </Dos>
            <Dos>
              <Campo label="Cancelás desde la cuota"><NumIn modo="int" value={p.cancelarDesde} onChange={(v) => upP({ cancelarDesde: Math.max(1, v) })} /></Campo>
              <Campo label="Colchón (pesos de hoy)"><NumIn value={p.colchon} onChange={(v) => upP({ colchon: v })} /></Campo>
            </Dos>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className={"chip sm" + (p.autoCancelar !== false ? " on" : "")} onClick={() => upP({ autoCancelar: true })}>Cancelar solo cuando alcance</button>
              <button className={"chip sm" + (p.autoCancelar === false ? " on" : "")} onClick={() => upP({ autoCancelar: false })}>No cancelar</button>
            </div>
            <div style={{ fontSize: 11.5, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
              Se cancela total el primer mes, desde la cuota {p.cancelarDesde || 1}, en que el fondo cubre el saldo
              {+p.penalidad ? " (más la penalidad si corresponde)" : ""} y te queda el colchón.
            </div>
            {crono.length > 0 && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: T.papel, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Cuotas de control</div>
                {[1, 12, 24].filter((k) => crono[k - 1]).map((k) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "2px 0" }}>
                    <span style={{ color: T.suave }}>Cuota {k} · {etiqMes(crono[k - 1].mk)}</span>
                    <span className="num">{plataR(crono[k - 1].cuota)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Seccion>

      <Seccion titulo="Qué sacás de lo real" sub={`${(esc.quitar || []).length} ítems reemplazados en este escenario`}>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 10, lineHeight: 1.5 }}>
          Tocá para sacarlos del escenario. En tu app real no cambia nada.
        </div>
        {realesGasto.map((m) => {
          const on = (esc.quitar || []).includes(m.id);
          return (
            <button key={m.id} onClick={() => up({ quitar: toggleEn(esc.quitar, m.id) })}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 10,
                       padding: "8px 0", borderTop: `1px solid ${T.linea}`, textAlign: "left", marginTop: 4 }}>
              <span style={{ fontSize: 13, minWidth: 0, textDecoration: on ? "line-through" : "none", color: on ? T.tenue : T.tinta }}>
                {m.detalle} <span className="num" style={{ color: T.tenue, fontSize: 11.5 }}>{montoReal(m)} · {medioCorto(m.medio)}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: on ? T.rojo : T.tenue, flexShrink: 0 }}>
                {on ? "sacado" : "queda"}
              </span>
            </button>
          );
        })}
      </Seccion>

      <Seccion titulo="Ítems del escenario" sub={`${(esc.items || []).length} bolsas, gastos o ingresos`}>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 10, lineHeight: 1.5 }}>
          Montos en pesos de hoy. "Se reinicia": lo que no gastás va al ahorro. "Se acumula": pasa al mes siguiente.
          En la proyección las dos cuentan como gasto todos los meses.
        </div>
        {(esc.items || []).map((it) => {
          const ab = itemAbierto === it.id;
          return (
            <div key={it.id} style={{ borderTop: `1px solid ${T.linea}`, marginTop: 6 }}>
              <button onClick={() => setItemAbierto(ab ? null : it.id)}
                style={{ width: "100%", textAlign: "left", padding: "9px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.nombre || "Sin nombre"}</span>
                  <span style={{ color: T.tenue }}>{ab ? "−" : "+"}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.suave, marginTop: 2 }}>{descItem(it)}</div>
              </button>
              {ab && (
                <div style={{ paddingBottom: 12 }}>
                  <Campo label="Nombre"><input value={it.nombre || ""} onChange={(e) => updItem(it.id, { nombre: e.target.value })} /></Campo>
                  <Campo label="Monto por mes (pesos de hoy)"><NumIn value={it.monto} onChange={(v) => updItem(it.id, { monto: v })} /></Campo>
                  <Campo label="Tipo">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[["gasto", "gasto", "Gasto"], ["gasto", "prestamo", "Préstamo o cuota"], ["ingreso", "", "Ingreso"]].map(([t, c, n]) => (
                        <button key={n} className={"chip sm" + (it.tipo === t && (it.clase || "") === (c === "gasto" ? "" : c) ? " on" : "")}
                          onClick={() => updItem(it.id, { tipo: t, clase: c === "prestamo" ? "prestamo" : "" })}>{n}</button>
                      ))}
                    </div>
                  </Campo>
                  <Dos>
                    <Campo label="Desde"><MesIn value={it.desde} onChange={(v) => updItem(it.id, { desde: v })} /></Campo>
                    <Campo label="Hasta (opcional)"><MesIn vacio value={it.hasta} onChange={(v) => updItem(it.id, { hasta: v })} /></Campo>
                  </Dos>
                  <Campo label="Cómo se ajusta">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[["inflacion", "Sube con la inflación"], ["periodico", "Cada N meses"], ["ninguno", "Fijo"]].map(([a, n]) => (
                        <button key={a} className={"chip sm" + ((it.ajuste || "ninguno") === a ? " on" : "")}
                          onClick={() => updItem(it.id, { ajuste: a, ...(a === "periodico" && !it.primerAjuste ? { cada: 6, primerAjuste: sumaMes(esc.desde, 5) } : {}) })}>{n}</button>
                      ))}
                    </div>
                  </Campo>
                  {it.ajuste === "periodico" && (
                    <Dos>
                      <Campo label="Cada cuántos meses"><NumIn modo="int" value={it.cada || 6} onChange={(v) => updItem(it.id, { cada: Math.max(1, v) })} /></Campo>
                      <Campo label="Primer ajuste"><MesIn value={it.primerAjuste} onChange={(v) => updItem(it.id, { primerAjuste: v })} /></Campo>
                    </Dos>
                  )}
                  {it.tipo === "gasto" && it.clase !== "prestamo" && (
                    <Campo label="¿Es una bolsa?">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[["", "No"], ["reinicia", "Se reinicia"], ["acumula", "Se acumula"]].map(([m, n]) => (
                          <button key={n} className={"chip sm" + ((it.bolsa ? it.modo : "") === m ? " on" : "")}
                            onClick={() => updItem(it.id, { bolsa: !!m, modo: m || undefined })}>{n}</button>
                        ))}
                      </div>
                    </Campo>
                  )}
                  <button onClick={() => { up({ items: esc.items.filter((x) => x.id !== it.id) }); setItemAbierto(null); }}
                    style={{ marginTop: 12, fontSize: 13, color: T.rojo, fontWeight: 600 }}>Borrar este ítem</button>
                </div>
              )}
            </div>
          );
        })}
        <button className="chip sm" style={{ marginTop: 10 }}
          onClick={() => {
            const nuevo = { id: "it" + Date.now(), tipo: "gasto", nombre: "Nuevo gasto", monto: 0,
                            desde: esc.desde, ajuste: "inflacion" };
            up({ items: [...(esc.items || []), nuevo] }); setItemAbierto(nuevo.id);
          }}>+ Agregar ítem</button>
      </Seccion>

      <Seccion titulo="Fondo auto / emergencia" sub={`${NOMBRE_INST[(f.instrumento || {}).tipo] || "PF UVA"} · ${+f.aporte ? plataR(f.aporte) + "/mes" : "sin aporte fijo"}`}>
        <Dos>
          <Campo label="Aporte por mes (pesos de hoy)"><NumIn value={f.aporte} onChange={(v) => upF({ aporte: v })} /></Campo>
          <Campo label="Desde"><MesIn vacio value={f.desde} onChange={(v) => upF({ desde: v })} /></Campo>
        </Dos>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button className={"chip sm" + (f.aporteSube !== false ? " on" : "")} onClick={() => upF({ aporteSube: true })}>Sube con la inflación</button>
          <button className={"chip sm" + (f.aporteSube === false ? " on" : "")} onClick={() => upF({ aporteSube: false })}>Fijo</button>
        </div>
        <Dos>
          <Campo label="% del aguinaldo + bono"><NumIn modo="pct" value={f.pctAguinaldo} onChange={(v) => upF({ pctAguinaldo: v })} /></Campo>
          <Campo label="Desde"><MesIn vacio value={f.aguinaldoDesde} onChange={(v) => upF({ aguinaldoDesde: v })} /></Campo>
        </Dos>
        <Campo label="Plata en el fondo al arrancar"><NumIn value={f.inicial} onChange={(v) => upF({ inicial: v })} /></Campo>
        <Campo label="Dónde rinde el fondo">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["pfuva", "pf", "fci", "mep", "ninguno"].map((t) => (
              <button key={t} className={"chip sm" + (((f.instrumento || {}).tipo || "pfuva") === t ? " on" : "")}
                onClick={() => upF({ instrumento: { ...(f.instrumento || {}), tipo: t,
                  ...(t === "mep" ? { dev: (f.instrumento || {}).dev != null ? f.instrumento.dev : 0.015 } : {}),
                  ...(t !== "mep" && t !== "ninguno" && (f.instrumento || {}).tna == null ? { tna: t === "pfuva" ? 0.01 : 0.28 } : {}) } })}>
                {NOMBRE_INST[t]}
              </button>
            ))}
          </div>
        </Campo>
        {((f.instrumento || {}).tipo || "pfuva") === "mep" ? (
          <Campo label="Devaluación mensual supuesta (%)"><NumIn modo="pct" value={(f.instrumento || {}).dev} onChange={(v) => upF({ instrumento: { ...f.instrumento, dev: v } })} /></Campo>
        ) : ((f.instrumento || {}).tipo || "pfuva") !== "ninguno" && (
          <Campo label={((f.instrumento || {}).tipo || "pfuva") === "pfuva" ? "TNA sobre UVA (%)" : "TNA (%)"}>
            <NumIn modo="pct" value={(f.instrumento || {}).tna} onChange={(v) => upF({ instrumento: { ...(f.instrumento || { tipo: "pfuva" }), tna: v } })} />
          </Campo>
        )}
        <Campo label="Ingresos extra (van enteros al fondo)" nota="Monto en pesos de hoy y el mes en que llegan.">
          {(f.extras || []).map((x, i) => (
            <div key={x.id || i} style={{ borderTop: `1px solid ${T.linea}`, paddingTop: 8, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={x.nombre || ""} onChange={(e) => upF({ extras: f.extras.map((y, j) => j === i ? { ...y, nombre: e.target.value } : y) })} />
                <button onClick={() => upF({ extras: f.extras.filter((_, j) => j !== i) })} aria-label="Borrar" style={{ color: T.tenue, fontSize: 15 }}>✕</button>
              </div>
              <Dos>
                <Campo label="Monto"><NumIn value={x.monto} onChange={(v) => upF({ extras: f.extras.map((y, j) => j === i ? { ...y, monto: v } : y) })} /></Campo>
                <Campo label="Mes"><MesIn value={x.mes} onChange={(v) => upF({ extras: f.extras.map((y, j) => j === i ? { ...y, mes: v } : y) })} /></Campo>
              </Dos>
            </div>
          ))}
          <button className="chip sm" style={{ marginTop: 10 }}
            onClick={() => upF({ extras: [...(f.extras || []), { id: "x" + Date.now(), nombre: "Otro ingreso", monto: 0, mes: esc.desde }] })}>
            + Agregar ingreso extra
          </button>
        </Campo>
      </Seccion>
    </>
  );
}

/* ---------- Pantalla de escenarios ---------- */
function Escenarios({ cfg, setCfg, movs, medios, abrirId, onAbierto }) {
  const lista = cfg.escenarios || [];
  const [sel, setSel] = useState(null);
  const [modo, setModo] = useState("ver");
  const [enHoy, setEnHoy] = useState(false);
  useEffect(() => {
    if (abrirId) { setSel(abrirId); setModo("ver"); if (onAbierto) onAbierto(); }
  }, [abrirId]);

  const guardar = (l) => setCfg({ ...cfg, escenarios: l });
  const esc = lista.find((x) => x.id === sel);

  const [caso, setCaso] = useState("base");
  const casos = useMemo(() => casosDe(esc), [esc]);
  // Base, optimista y pesimista comparten tu flujo real: se calcula una sola vez
  const resCasos = useMemo(() => {
    if (!esc) return null;
    const base = proyectarEscenario(esc, cfg, movs, medios);
    const o = { base: base.baseReal };
    return {
      base,
      optimista: proyectarEscenario(aplicarCaso(esc, casos.optimista), cfg, movs, medios, o),
      pesimista: proyectarEscenario(aplicarCaso(esc, casos.pesimista), cfg, movs, medios, o),
    };
  }, [esc, cfg, movs, medios, casos]);
  const resBase = resCasos && resCasos.base;
  const res = resCasos && resCasos[caso];
  const faltan = useMemo(() => {
    if (!esc || !esc.prestamo || !resBase) return [];
    const e = caso === "base" ? esc : aplicarCaso(esc, casos[caso]);
    return faltanteParaCancelar(e, cfg, movs, medios, null, resBase.baseReal);
  }, [esc, cfg, movs, medios, caso, casos, resBase]);

  if (esc && res) {
    return (
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <button onClick={() => setSel(null)} style={{ fontSize: 13.5, color: T.ambar, fontWeight: 600 }}>‹ Escenarios</button>
        <div style={{ marginTop: 10 }}><Ficticio /></div>
        <div style={{ fontSize: 21, fontWeight: 660, letterSpacing: "-0.02em", marginTop: 8 }}>{esc.nombre}</div>
        <div style={{ fontSize: 12.5, color: T.suave, marginTop: 3 }}>
          Tu flujo real + estos cambios · {etiqMes(esc.desde)} a {etiqMes(sumaMes(esc.desde, (+esc.meses || 60) - 1))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[["ver", "Resultado"], ["editar", "Editar"], ["comparar", "Comparar"]].map(([m, n]) => (
            <button key={m} className={"chip" + (modo === m ? " on" : "")} onClick={() => setModo(m)}>{n}</button>
          ))}
        </div>
        {modo === "ver" && (
          <ResultadoEscenario esc={esc} res={res} faltan={faltan} enHoy={enHoy} setEnHoy={setEnHoy}
            resCasos={resCasos} casos={casos} caso={caso} setCaso={setCaso} />
        )}
        {modo === "editar" && (
          <EditorEscenario esc={esc} movs={movs} medios={medios}
            onCambiar={(e) => guardar(lista.map((x) => (x.id === e.id ? e : x)))} />
        )}
        {modo === "comparar" && (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {[[false, "Pesos de cada mes"], [true, "Pesos de hoy"]].map(([val, n]) => (
                <button key={n} className={"chip sm" + (enHoy === val ? " on" : "")} onClick={() => setEnHoy(val)}>{n}</button>
              ))}
            </div>
            <CompararEscenario esc={esc} res={resBase} cfg={cfg} movs={movs} medios={medios} enHoy={enHoy}
              otros={lista.filter((x) => x.id !== esc.id)} />
          </>
        )}
      </div>
    );
  }

  const tieneTerritory = lista.some((x) => /territory/i.test(x.nombre || ""));
  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <div style={{ fontSize: 14, color: T.suave, lineHeight: 1.55 }}>
        Un escenario es tu flujo real más los cambios que quieras probar: un préstamo, otro sueldo,
        otros gastos. <b style={{ color: T.tinta }}>Nunca toca tus movimientos.</b>
      </div>

      {lista.map((e) => (
        <div key={e.id} className="card" style={{ padding: "13px 15px", marginTop: 10, opacity: e.activo === false ? 0.7 : 1 }}>
          <button onClick={() => { setSel(e.id); setModo("ver"); }} style={{ width: "100%", textAlign: "left" }}>
            <Ficticio chico />
            <div style={{ fontSize: 15, fontWeight: 620, marginTop: 6 }}>{e.nombre}</div>
            <div style={{ fontSize: 12, color: T.suave, marginTop: 2 }}>
              {etiqMes(e.desde)} → {etiqMes(sumaMes(e.desde, (+e.meses || 60) - 1))}
              {e.prestamo ? ` · préstamo ${corta(e.prestamo.monto)}` : ""}
              {e.activo === false ? " · desactivado" : " · activo"}
            </div>
          </button>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <button className="chip sm" onClick={() => guardar(lista.map((x) => x.id === e.id ? { ...x, activo: x.activo === false } : x))}>
              {e.activo === false ? "Activar" : "Desactivar"}
            </button>
            <button className="chip sm" onClick={() => {
              const n = prompt("Nuevo nombre", e.nombre);
              if (n && n.trim()) guardar(lista.map((x) => x.id === e.id ? { ...x, nombre: n.trim() } : x));
            }}>Renombrar</button>
            <button className="chip sm" onClick={() => {
              const copia = JSON.parse(JSON.stringify(e));
              copia.id = "esc" + Date.now(); copia.nombre = e.nombre + " (copia)";
              guardar([...lista, copia]);
            }}>Duplicar</button>
            <button className="chip sm" style={{ color: T.rojo }} onClick={() => {
              if (confirm(`¿Borrar el escenario "${e.nombre}"? Tus movimientos reales no se tocan.`))
                guardar(lista.filter((x) => x.id !== e.id));
            }}>Borrar</button>
          </div>
        </div>
      ))}

      {!tieneTerritory && (
        <button className="btn" style={{ marginTop: 14 }} onClick={() => {
          const e = escenarioTerritory(movs); guardar([...lista, e]); setSel(e.id); setModo("ver");
        }}>Cargar "Territory Titanium 2023"</button>
      )}
      <button className="btn ghost" style={{ marginTop: 10, fontSize: 14.5, fontWeight: 500 }} onClick={() => {
        const e = escenarioVacio(); guardar([...lista, e]); setSel(e.id); setModo("editar");
      }}>Nuevo escenario vacío</button>
    </div>
  );
}

/* ---------- Tarjeta en Hoy: los escenarios activos, encima de lo real ---------- */
function TarjetaEscenarios({ cfg, movs, medios, onVer }) {
  const activos = (cfg.escenarios || []).filter((e) => e.activo !== false);
  const datos = useMemo(() => activos.map((e) => {
    const r = proyectarEscenario(e, cfg, movs, medios);
    const real = proyectar({ ...cfg, desdeMes: e.desde, ajuste: 0, saldoHoy: 0, reservasUsd: 0 }, movs, medios, 3, null);
    return { e, r, real };
  }), [activos.map((e) => e.id).join(), cfg, movs, medios]);
  if (!datos.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      {datos.map(({ e, r, real }) => (
        <button key={e.id} onClick={() => onVer(e.id)} className="card"
          style={{ width: "100%", textAlign: "left", padding: "13px 15px", marginTop: 8,
                   borderStyle: "dashed", borderColor: "#E9C98A" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Ficticio chico />
            <span style={{ fontSize: 12.5, color: T.ambar, fontWeight: 600 }}>Ver ›</span>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 620, marginTop: 6 }}>{e.nombre}</div>
          <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr", gap: 6, fontSize: 11, color: T.tenue, marginTop: 8 }}>
            <span />
            <span style={{ textAlign: "right" }}>Escenario</span>
            <span style={{ textAlign: "right" }}>Real</span>
          </div>
          {r.filas.slice(0, 3).map((f, i) => (
            <div key={f.mk} className="num" style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr", gap: 6, fontSize: 12.5, padding: "3px 0" }}>
              <span style={{ color: T.suave }}>{etiqMes(f.mk)}</span>
              <span style={{ textAlign: "right", color: f.queda < 0 ? T.rojo : T.tinta }}>{corta(f.queda)}</span>
              <span style={{ textAlign: "right", color: real[i] && real[i].resultado < 0 ? T.rojo : T.suave }}>
                {real[i] ? corta(real[i].resultado) : "—"}
              </span>
            </div>
          ))}
          {r.cancelado && (
            <div style={{ fontSize: 12, color: T.suave, marginTop: 6 }}>
              Cancelás el préstamo en la cuota {r.cancelado.k} ({etiqMes(r.cancelado.mk)}).
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/* ===================== SIMULADOR DE INVERSIONES: PANTALLA ===================== */
const COLOR_INST = { pf: "#2a78d6", pfuva: "#eb6834", fci: "#1baf7a", mep: "#eda100" };
const ORDEN_INST = ["pf", "pfuva", "fci", "mep"];

// Líneas con crosshair: tocás o arrastrás y ves los valores de ese mes.
function GraficoLineas({ meses, series, referencia, aria }) {
  const [i, setI] = useState(null);
  const ref = useRef(null);
  const W = 340, H = 190, pl = 6, pr = 62, pt = 10, pb = 22;
  const todos = [...series.flatMap((s) => s.valores), ...(referencia ? referencia.valores : [])].filter(isFinite);
  const hi = Math.max(1, ...todos), lo = Math.min(0, ...todos);
  const n = meses.length;
  const x = (k) => pl + (n <= 1 ? 0 : (k * (W - pl - pr)) / (n - 1));
  const y = (v) => pt + ((hi - v) / (hi - lo || 1)) * (H - pt - pb);
  const linea = (vals) => vals.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  // Etiquetas al final de cada línea, corridas para que no se pisen
  const fin = series.map((s) => ({ s, yy: y(s.valores[n - 1]) })).sort((a, b) => a.yy - b.yy);
  for (let k = 1; k < fin.length; k++) if (fin[k].yy - fin[k - 1].yy < 12) fin[k].yy = fin[k - 1].yy + 12;

  const mover = (ev) => {
    const r = ref.current && ref.current.getBoundingClientRect();
    if (!r) return;
    const t = ev.touches ? ev.touches[0] : ev;
    const px = ((t.clientX - r.left) / r.width) * W;
    const k = Math.round(((px - pl) / (W - pl - pr)) * (n - 1));
    setI(Math.max(0, Math.min(n - 1, k)));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: T.suave, marginBottom: 6 }}>
        {series.map((s) => (
          <span key={s.nombre} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 2, background: s.color, borderRadius: 2 }} />{s.nombre}
          </span>
        ))}
        {referencia && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 0, borderTop: `2px dashed ${T.tenue}` }} />{referencia.nombre}
          </span>
        )}
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", touchAction: "pan-y" }}
        role="img" aria-label={aria || "Cuánto gana cada inversión, en pesos de hoy"}
        onMouseMove={mover} onTouchStart={mover} onTouchMove={mover} onMouseLeave={() => setI(null)}>
        <line x1={pl} x2={W - pr} y1={y(0)} y2={y(0)} stroke={T.eje} strokeWidth="1" />
        {referencia && <path d={linea(referencia.valores)} fill="none" stroke={T.tenue} strokeWidth="1.5" strokeDasharray="4 3" />}
        {series.map((s) => (
          <path key={s.nombre} d={linea(s.valores)} fill="none" stroke={s.color} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {fin.map(({ s, yy }) => (
          <text key={s.nombre} x={W - pr + 5} y={yy + 3.5} fontSize="9.5" fill={T.suave}>{s.corto || s.nombre}</text>
        ))}
        <text x={pl} y={H - 6} fontSize="9.5" fill={T.tenue}>{etiqMes(meses[0])}</text>
        <text x={W - pr} y={H - 6} fontSize="9.5" fill={T.tenue} textAnchor="end">{etiqMes(meses[n - 1])}</text>
        {i != null && (
          <>
            <line x1={x(i)} x2={x(i)} y1={pt} y2={H - pb} stroke={T.tinta} strokeWidth="1" opacity="0.35" />
            {series.map((s) => (
              <circle key={s.nombre} cx={x(i)} cy={y(s.valores[i])} r="4" fill={s.color} stroke={T.card} strokeWidth="2" />
            ))}
          </>
        )}
      </svg>
      <div style={{ minHeight: 44, marginTop: 6, fontSize: 12 }}>
        {i != null ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", alignItems: "baseline" }}>
            <span style={{ color: T.suave, fontWeight: 600 }}>{etiqMesLargo(meses[i])}</span>
            {series.map((s) => (
              <span key={s.nombre} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 2, background: s.color }} />
                <b className="num">{corta(s.valores[i])}</b>
                <span style={{ color: T.tenue }}>{s.corto || s.nombre}</span>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: T.tenue }}>Tocá el gráfico para ver cada mes.</span>
        )}
      </div>
    </div>
  );
}

function simVacia(escs, tc) {
  return {
    id: "sim" + Date.now(), nombre: "Nueva simulación",
    inicial: 1000000, aporte: 200000, aporteSube: true, meses: 24,
    desde: sumaMes(mesDeHoy(), 1), escenarioId: escs[0] ? escs[0].id : "",
    tna: { pf: 0.28, pfuva: 0.01, fci: 0.25 }, dev: 0.015, tcMep: Math.round(tc || 1500),
    elegido: "pfuva",
  };
}

function Inversiones({ cfg, setCfg }) {
  const sims = cfg.simulaciones || [];
  const escs = cfg.escenarios || [];
  const [sel, setSel] = useState(sims[0] ? sims[0].id : null);
  const [estadoTasa, setEstadoTasa] = useState("");
  const [enviado, setEnviado] = useState("");
  const sim = sims.find((s) => s.id === sel) || sims[0];
  const upd = (patch) => setCfg({ ...cfg, simulaciones: sims.map((x) => (x.id === sim.id ? { ...x, ...patch } : x)) });
  const esc = sim ? escs.find((e) => e.id === sim.escenarioId) : null;

  const [caso, setCaso] = useState("base");
  // Corre la simulación con un caso (base, optimista o pesimista)
  const correr = (k) => {
    const cs = casosDe(esc);
    const c = k === "base" ? null : cs[k];
    const escBase = esc || { inflacion: INFL_BASE, uva: { mes: "2026-10", valor: 2150.5 } };
    const e = c ? aplicarCaso(escBase, c) : escBase;
    const macro = macroDeEscenario(e, mesDeHoy());
    const porInst = {};
    ORDEN_INST.forEach((t) => {
      const inst0 = { tipo: t, tna: t === "mep" ? 0 : (sim.tna || {})[t], dev: sim.dev };
      porInst[t] = simularInstrumento({ ...sim, tcMep: sim.tcMep }, c ? instrumentoEnCaso(inst0, c) : inst0, macro);
    });
    const cancel = esc && esc.prestamo ? simularCancelacion(sim, e, macro) : null;
    return { porInst, cancel, macro };
  };
  const todos = useMemo(() => (sim
    ? { base: correr("base"), optimista: correr("optimista"), pesimista: correr("pesimista") }
    : null), [sim, esc]);
  const calc = todos && todos[caso];

  if (!sim) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 14, color: T.suave, lineHeight: 1.55 }}>
          Probá qué pasa con tu plata en plazo fijo, PF UVA, un money market o dólar MEP, y compará
          contra cancelar antes el préstamo de un escenario. Nada de esto toca tus datos reales.
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={() => {
          const s = simVacia(escs, cfg.tc); setCfg({ ...cfg, simulaciones: [...sims, s] }); setSel(s.id);
        }}>Nueva simulación</button>
      </div>
    );
  }

  const meses = calc.porInst.pf.map((f) => f.mk);
  const finales = ORDEN_INST.map((t) => ({ t, f: calc.porInst[t][calc.porInst[t].length - 1] }));
  const mejor = finales.reduce((a, b) => (b.f.gananciaHoy > a.f.gananciaHoy ? b : a));
  const filasEl = calc.porInst[sim.elegido] || calc.porInst.pfuva;

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>
        {sims.map((s) => (
          <button key={s.id} className={"chip sm" + (s.id === sim.id ? " on" : "")} onClick={() => setSel(s.id)}>{s.nombre}</button>
        ))}
        <button className="chip sm" onClick={() => {
          const s = simVacia(escs, cfg.tc); setCfg({ ...cfg, simulaciones: [...sims, s] }); setSel(s.id);
        }}>+ Nueva</button>
      </div>

      <div className="card" style={{ padding: "4px 15px 15px", marginTop: 10 }}>
        <Campo label="Nombre"><input value={sim.nombre} onChange={(e) => upd({ nombre: e.target.value })} /></Campo>
        <Dos>
          <Campo label="Monto inicial"><NumIn value={sim.inicial} onChange={(v) => upd({ inicial: v })} /></Campo>
          <Campo label="Aporte por mes"><NumIn value={sim.aporte} onChange={(v) => upd({ aporte: v })} /></Campo>
        </Dos>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button className={"chip sm" + (sim.aporteSube ? " on" : "")} onClick={() => upd({ aporteSube: true })}>Aporte sube con inflación</button>
          <button className={"chip sm" + (!sim.aporteSube ? " on" : "")} onClick={() => upd({ aporteSube: false })}>Aporte fijo</button>
        </div>
        <Dos>
          <Campo label="Plazo (meses)"><NumIn modo="int" value={sim.meses} onChange={(v) => upd({ meses: Math.max(1, Math.min(120, v)) })} /></Campo>
          <Campo label="Arranca en"><MesIn value={sim.desde} onChange={(v) => v && upd({ desde: v })} /></Campo>
        </Dos>
        <Campo label="Inflación y préstamo de" nota="De ese escenario sale la inflación supuesta (para la UVA y los pesos de hoy) y el préstamo a cancelar.">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {escs.length === 0 && <span style={{ fontSize: 12.5, color: T.suave }}>No tenés escenarios: uso la inflación por defecto.</span>}
            {escs.map((e) => (
              <button key={e.id} className={"chip sm" + (sim.escenarioId === e.id ? " on" : "")}
                onClick={() => upd({ escenarioId: e.id })}>{e.nombre}</button>
            ))}
          </div>
        </Campo>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 16 }}>Supuestos de cada instrumento</div>
        <Dos>
          <Campo label="Plazo fijo · TNA %"><NumIn modo="pct" value={(sim.tna || {}).pf} onChange={(v) => upd({ tna: { ...sim.tna, pf: v } })} /></Campo>
          <Campo label="PF UVA · TNA % s/ UVA"><NumIn modo="pct" value={(sim.tna || {}).pfuva} onChange={(v) => upd({ tna: { ...sim.tna, pfuva: v } })} /></Campo>
        </Dos>
        <Dos>
          <Campo label="Money market · TNA %"><NumIn modo="pct" value={(sim.tna || {}).fci} onChange={(v) => upd({ tna: { ...sim.tna, fci: v } })} /></Campo>
          <Campo label="MEP · devaluación/mes %"><NumIn modo="pct" value={sim.dev} onChange={(v) => upd({ dev: v })} /></Campo>
        </Dos>
        <Campo label="Dólar MEP inicial"><NumIn value={sim.tcMep} onChange={(v) => upd({ tcMep: v })} /></Campo>
        <button onClick={async () => {
          setEstadoTasa("Buscando…");
          try {
            const t = await traerTasas();
            if (t.length) { upd({ tna: { ...sim.tna, pf: t[0].tna / 100 } }); setEstadoTasa(`Puse ${t[0].tna.toLocaleString("es-AR", { maximumFractionDigits: 2 })}% (${t[0].entidad}).`); }
            else setEstadoTasa("No pude traer las tasas.");
          } catch (e) { setEstadoTasa("No pude traer las tasas."); }
        }} style={{ marginTop: 10, fontSize: 13, color: T.ambar, fontWeight: 600 }}>
          Usar la mejor tasa de plazo fijo de hoy
        </button>
        {estadoTasa && <div style={{ fontSize: 12, color: T.suave, marginTop: 5 }}>{estadoTasa}</div>}
        <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 10, lineHeight: 1.5 }}>
          Son supuestos tuyos, no cotizaciones. No es asesoramiento financiero.
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 620, marginTop: 20 }}>Cómo te va en {sim.meses} meses</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {["optimista", "base", "pesimista"].map((k) => (
          <button key={k} className={"chip sm" + (caso === k ? " on" : "")} onClick={() => setCaso(k)}>{NOMBRE_CASO[k]}</button>
        ))}
      </div>
      {caso !== "base" && (
        <div style={{ fontSize: 11.5, color: caso === "pesimista" ? T.rojo : T.verde, marginTop: 6, lineHeight: 1.5 }}>
          {describirCaso(casosDe(esc)[caso])}, devaluación ×{String(casosDe(esc)[caso].devMult).replace(".", ",")},
          tasas ×{String(casosDe(esc)[caso].tasaMult).replace(".", ",")}.
        </div>
      )}
      <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6 }}>Valores en pesos de hoy. Tocá uno para ver el detalle.</div>
      {finales.map(({ t, f }) => (
        <button key={t} onClick={() => upd({ elegido: t })} className="card"
          style={{ width: "100%", textAlign: "left", padding: "12px 14px", marginTop: 8,
                   borderColor: sim.elegido === t ? T.tinta : T.linea }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 600 }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: COLOR_INST[t] }} />
              {NOMBRE_INST[t]}{mejor.t === t ? <span style={{ fontSize: 11, color: T.verde }}>· el mejor</span> : null}
            </span>
            <span className="num plata" style={{ fontSize: 15 }}>{plataR(f.valorHoy)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.suave, marginTop: 4 }}>
            <span>{plataR(f.valor)} en pesos de {etiqMes(f.mk)}{t === "mep" && f.usd ? ` · USD ${Math.round(f.usd).toLocaleString("es-AR")}` : ""}</span>
            <span className="num" style={{ color: f.gananciaHoy < 0 ? T.rojo : T.verde, fontWeight: 600 }}>
              {f.gananciaHoy >= 0 ? "+" : ""}{corta(f.gananciaHoy)}
            </span>
          </div>
        </button>
      ))}
      {calc.cancel && (
        <div className="card" style={{ padding: "12px 14px", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Cancelar antes el préstamo</div>
          <div style={{ fontSize: 12.5, color: T.suave, marginTop: 4, lineHeight: 1.5 }}>
            {calc.cancel.k
              ? <>Juntando esta plata cancelás en la cuota <b>{calc.cancel.k}</b> ({etiqMes(calc.cancel.mk)}) y te ahorrás{" "}
                  <b className="num" style={{ color: T.verde }}>{plataR(calc.cancel.ahorroHoy)}</b> de intereses + IVA, en pesos de hoy.</>
              : <>Con esta plata no llegás a cancelar el préstamo de "{esc.nombre}" en {sim.meses} meses.</>}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "12px 13px", marginTop: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620 }}>¿Y si sale mejor o peor?</div>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 3, marginBottom: 8 }}>Ganancia al final, en pesos de hoy.</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) repeat(3, minmax(0,1fr))", gap: "6px 6px",
                      fontSize: 12, alignItems: "baseline" }}>
          <span />
          {["optimista", "base", "pesimista"].map((k) => (
            <span key={k} style={{ textAlign: "right", fontSize: 11, color: caso === k ? T.tinta : T.suave, fontWeight: 600 }}>{NOMBRE_CASO[k]}</span>
          ))}
          {ORDEN_INST.map((t) => (
            <React.Fragment key={t}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", whiteSpace: "nowrap" }}>
                <span style={{ width: 10, height: 2, background: COLOR_INST[t], flexShrink: 0 }} />
                {{ pf: "PF", pfuva: "PF UVA", fci: "FCI", mep: "MEP" }[t]}
              </span>
              {["optimista", "base", "pesimista"].map((k) => {
                const fs = todos[k].porInst[t]; const g = fs[fs.length - 1].gananciaHoy;
                return <span key={k} className="num" style={{ textAlign: "right", color: g < 0 ? T.rojo : T.tinta }}>{corta(g)}</span>;
              })}
            </React.Fragment>
          ))}
          {todos.base.cancel && (
            <>
              <span style={{ whiteSpace: "nowrap" }}>Cancelar antes</span>
              {["optimista", "base", "pesimista"].map((k) => {
                const c = todos[k].cancel;
                return <span key={k} className="num" style={{ textAlign: "right", color: c && c.k ? T.verde : T.tenue }}>
                  {c && c.k ? corta(c.ahorroHoy) : "no llega"}</span>;
              })}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "14px 13px 8px", marginTop: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620 }}>Cuánto ganás, en pesos de hoy</div>
        <div style={{ fontSize: 11.5, color: T.suave, margin: "3px 0 10px", lineHeight: 1.5 }}>
          Lo que vale tu plata menos lo que pusiste, sacándole la inflación. Abajo de cero, perdés contra la inflación.
        </div>
        <GraficoLineas meses={meses}
          series={ORDEN_INST.map((t) => ({ nombre: NOMBRE_INST[t], corto: { pf: "PF", pfuva: "PF UVA", fci: "FCI", mep: "MEP" }[t],
                                           color: COLOR_INST[t], valores: calc.porInst[t].map((f) => f.gananciaHoy) }))} />
      </div>

      {sim.elegido && (
        <>
          <div style={{ fontSize: 15, fontWeight: 620, marginTop: 20 }}>{NOMBRE_INST[sim.elegido]} mes a mes</div>
          <div className="card" style={{ marginTop: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr 1fr", gap: 6, padding: "9px 12px",
                          fontSize: 11, color: T.suave, fontWeight: 600, borderBottom: `1px solid ${T.linea}` }}>
              <span>Mes</span><span style={{ textAlign: "right" }}>Valor</span>
              <span style={{ textAlign: "right" }}>Pesos de hoy</span><span style={{ textAlign: "right" }}>Ganancia</span>
            </div>
            {filasEl.map((f, i) => (
              <div key={f.mk} className="num" style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr 1fr", gap: 6,
                    padding: "6px 12px", fontSize: 12, borderTop: i ? `1px solid ${T.linea}` : "none" }}>
                <span style={{ color: T.suave }}>{etiqMes(f.mk)}</span>
                <span style={{ textAlign: "right" }}>{corta(f.valor)}</span>
                <span style={{ textAlign: "right" }}>{corta(f.valorHoy)}</span>
                <span style={{ textAlign: "right", color: f.gananciaHoy < 0 ? T.rojo : T.verde }}>{corta(f.gananciaHoy)}</span>
              </div>
            ))}
          </div>

          {escs.length > 0 && (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 18 }}>
                Usar {NOMBRE_INST[sim.elegido]} para el fondo de un escenario
              </div>
              <div style={{ fontSize: 11.5, color: T.suave, marginTop: 3, lineHeight: 1.5 }}>
                El fondo del escenario pasa a rendir con este instrumento y esta tasa, en lugar de lo que tenía.
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {escs.map((e) => (
                  <button key={e.id} className="chip sm" onClick={() => {
                    const t = sim.elegido;
                    const inst = t === "mep" ? { tipo: "mep", dev: sim.dev } : { tipo: t, tna: (sim.tna || {})[t] };
                    setCfg({ ...cfg, escenarios: escs.map((x) => x.id === e.id
                      ? { ...x, fondo: { ...(x.fondo || {}), instrumento: inst } } : x) });
                    setEnviado(`Listo: el fondo de "${e.nombre}" ahora rinde con ${NOMBRE_INST[t]}.`);
                  }}>{e.nombre}</button>
                ))}
              </div>
              {enviado && <div style={{ fontSize: 12.5, color: T.verde, marginTop: 8 }}>{enviado}</div>}
            </>
          )}
        </>
      )}

      <button onClick={() => {
        if (!confirm(`¿Borrar "${sim.nombre}"?`)) return;
        const resto = sims.filter((x) => x.id !== sim.id);
        setCfg({ ...cfg, simulaciones: resto }); setSel(resto[0] ? resto[0].id : null);
      }} style={{ marginTop: 22, fontSize: 13, color: T.rojo, fontWeight: 600 }}>Borrar esta simulación</button>
    </div>
  );
}

/* ===================== PLAN DE AHORRO: PANTALLA ===================== */
const COLOR_SIN = "#2a78d6", COLOR_CON = "#eb6834";
// $16,25M: para montos grandes donde el redondeo de "corta" confunde
const millones = (n) => (n < 0 ? "-$" : "$") + (Math.abs(n) / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "M";

// Si solo cambió cfg.planes, devuelve el cfg anterior: así tu flujo no se recalcula
// cada vez que tocás un número del plan.
function useCfgSinPlanes(cfg) {
  const ref = useRef(null);
  const prev = ref.current;
  const igual = prev && Object.keys({ ...prev, ...cfg }).every((k) => k === "planes" || prev[k] === cfg[k]);
  if (!igual) ref.current = cfg;
  return ref.current;
}

function Tile({ titulo, valor, sub, color, ancho, children }) {
  return (
    <div className="card" style={{ padding: "12px 13px", gridColumn: ancho ? "1 / -1" : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: T.suave, lineHeight: 1.35 }}>{titulo}</div>
      <div className="num plata" style={{ fontSize: 18, marginTop: 5, color: color || T.tinta }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>}
      {children}
    </div>
  );
}

function Opciones({ valor, opciones, onCambiar }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opciones.map(([v, n]) => (
        <button key={String(v)} className={"chip sm" + (valor === v ? " on" : "")} onClick={() => onCambiar(v)}>{n}</button>
      ))}
    </div>
  );
}

/* ---------- Tabla mes a mes del plan ---------- */
function TablaPlan({ s, enHoy }) {
  const v = (x, f) => (enHoy ? x / f.ii : x);
  const cols = [
    ["Cuota del plan", (f) => f.cuota, "gasto"],
    ["Oferta / integración", (f) => f.oferta, "gasto"],
    ["Cronos (venta − patente)", (f) => f.cronos, "entra"],
    ["Gastos de retiro", (f) => f.retiro, "gasto"],
    ["Seguro Territory", (f) => f.seguroNuevo, "gasto"],
    ["Seguro Cronos que dejás de pagar", (f) => f.seguroViejo, "entra"],
    ["Nafta extra + patente", (f) => f.nafta + f.patente, "gasto"],
    ["Neto del plan", (f) => f.neto, "neto"],
    ["Cuota + seguro (pesos de hoy)", (f) => f.cuotaSegHoy, "tope"],
    ["Tu flujo del mes (sin plan)", (f) => f.base, "neto"],
    ["Saldo sin el plan", (f) => f.saldoSin, "saldo"],
    ["Saldo con el plan", (f) => f.saldoCon, "fuerte"],
  ];
  const th = { padding: "9px 10px", fontSize: 11, fontWeight: 600, color: T.suave, textAlign: "right",
               borderBottom: `1px solid ${T.linea}`, background: T.card, verticalAlign: "bottom",
               lineHeight: 1.3, minWidth: 98 };
  const pega = { position: "sticky", left: 0, zIndex: 1, textAlign: "left", minWidth: 74,
                 borderRight: `1px solid ${T.linea}` };
  const etiqueta = (txt, c, bg) => (
    <span style={{ display: "inline-block", fontSize: 9.5, fontWeight: 700, letterSpacing: ".04em", color: c,
                   background: bg, borderRadius: 5, padding: "1px 5px", marginTop: 3, marginRight: 3 }}>{txt}</span>
  );
  return (
    <div className="card" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: 10 }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...th, ...pega }}>Mes</th>
            {cols.map(([n, , k]) => (
              <th key={n} style={{ ...th, color: k === "fuerte" ? T.tinta : T.suave }}>{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.filas.map((f) => {
            const bg = f.pasaTope ? "#FDF3F1" : f.esActo ? T.ambarBg : f.esRetiro ? T.verdeBg : T.card;
            return (
              <tr key={f.mk}>
                <td style={{ padding: "8px 10px", borderBottom: `1px solid ${T.linea}`, background: bg, ...pega }}>
                  <div style={{ fontWeight: 600 }}>{etiqMes(f.mk)}</div>
                  <div style={{ fontSize: 10.5, color: T.tenue }}>{f.nro ? `cuota ${f.nro}` : "sin cuota"}</div>
                  {f.esActo && etiqueta("ACTO", "#7A4E06", "#F3DDAE")}
                  {f.esRetiro && etiqueta("RETIRO", T.verde, "#CFE6DA")}
                  {f.deBase === "hoy" && etiqueta("HOY", T.suave, T.papel)}
                </td>
                {cols.map(([n, get, k]) => {
                  const x = k === "tope" ? get(f) : v(get(f), f);
                  const cero = Math.round(x) === 0;
                  let color = T.tinta, peso = 400, txt = cero ? "—" : plataR(x);
                  if (k === "entra" && !cero) { color = T.verde; txt = "+" + plataR(x); }
                  if ((k === "neto" || k === "saldo" || k === "fuerte") && x < 0) color = T.rojo;
                  if (k === "neto" && x > 0 && !cero) txt = "+" + plataR(x);
                  if (k === "fuerte") peso = 650;
                  if (k === "tope" && f.pasaTope) { color = T.rojo; peso = 700; }
                  if (n === "Cuota del plan" && f.pasaTope) { color = T.rojo; peso = 650; }
                  return (
                    <td key={n} className="num"
                      style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap",
                               borderBottom: `1px solid ${T.linea}`, background: bg, fontWeight: peso, color }}>
                      {txt}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Editor de parámetros ---------- */
function EditorPlan({ plan, upd, s, escs, saldoAuto }) {
  const mesCuota = (t) => etiqMes(sumaMes(plan.inicio, t - 1));
  return (
    <>
      <Seccion titulo="El plan" sub={`Valor móvil ${millones(plan.vm)} · ${plan.cuotasPagas} cuotas · última ${mesCuota(s.ultima)}`}>
        <Campo label="Nombre"><input value={plan.nombre} onChange={(e) => upd({ nombre: e.target.value })} /></Campo>
        <Dos>
          <Campo label="Mes de la cuota 1"><MesIn value={plan.inicio} onChange={(v) => v && upd({ inicio: v })} /></Campo>
          <Campo label="Cuotas que pagás"><NumIn modo="int" value={plan.cuotasPagas} onChange={(v) => upd({ cuotasPagas: Math.max(1, Math.min(119, v)) })} /></Campo>
        </Dos>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 5, lineHeight: 1.5 }}>
          La cuota 1 está bonificada: $0. La última cae en {etiqMesLargo(sumaMes(plan.inicio, s.ultima - 1))}.
        </div>
        <Dos>
          <Campo label="Valor móvil hoy"><NumIn value={plan.vm} onChange={(v) => upd({ vm: v })} /></Campo>
          <Campo label="% financiado"><NumIn modo="pct" value={plan.pctFin} onChange={(v) => upd({ pctFin: v })} /></Campo>
        </Dos>
        <Dos>
          <Campo label="Cuotas del plan"><NumIn modo="int" value={plan.cuotasPlan} onChange={(v) => upd({ cuotasPlan: Math.max(1, v) })} /></Campo>
          <Campo label="Administrativos %"><NumIn modo="pct" value={plan.admin} onChange={(v) => upd({ admin: v })} /></Campo>
        </Dos>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 5 }}>
          Administrativos sobre la cuota pura. Pura hoy {plataR(s.pura)} · administrativos {plataR(s.admin)}
        </div>
        <Dos>
          <Campo label="Cuota fija"><NumIn value={plan.cuotaFija} onChange={(v) => upd({ cuotaFija: v })} /></Campo>
          <Campo label="Fija de la 2 hasta la"><NumIn modo="int" value={plan.fijaHasta} onChange={(v) => upd({ fijaHasta: Math.max(1, v) })} /></Campo>
        </Dos>
        <Campo label="Integración (20%) hoy"><NumIn value={plan.integracion} onChange={(v) => upd({ integracion: v })} /></Campo>
        <Campo label="Seguro de vida (por cuota, hoy)"><NumIn value={plan.vida} onChange={(v) => upd({ vida: v })} /></Campo>
        <div style={{ marginTop: 8 }}>
          <Opciones valor={plan.vidaModo} onCambiar={(v) => upd({ vidaModo: v })}
            opciones={[["saldo", "Baja con el saldo"], ["constante", "Constante"]]} />
        </div>
        <Campo label="Derecho de admisión (por cuota, hoy)"><NumIn value={plan.admision} onChange={(v) => upd({ admision: v })} /></Campo>
        <div style={{ marginTop: 8 }}>
          <Opciones valor={+plan.admisionCuotas} onCambiar={(v) => upd({ admisionCuotas: v })}
            opciones={[[99, "En 99 cuotas"], [12, "En 12 cuotas"]]} />
        </div>
      </Seccion>

      <Seccion titulo="Licitación" sub={`Acto en ${mesCuota(s.mAdj)} · oferta ${millones(plan.oferta)} de hoy`}>
        <Dos>
          <Campo label="Acto en la cuota n°"><NumIn modo="int" value={plan.mAdj} onChange={(v) => upd({ mAdj: Math.max(1, v) })} /></Campo>
          <Campo label="Oferta en $ de hoy"><NumIn value={plan.oferta} onChange={(v) => upd({ oferta: v })} /></Campo>
        </Dos>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 5, lineHeight: 1.5 }}>
          1 = {etiqMes(plan.inicio)}. El acto cae en {etiqMesLargo(sumaMes(plan.inicio, s.mAdj - 1))}. La oferta incluye la integración.
        </div>
        <Campo label="Lo que ofertás de más">
          <Opciones valor={plan.sobrante} onCambiar={(v) => upd({ sobrante: v })}
            opciones={[["baja", "Baja la cuota"], ["acorta", "Acorta el plan"]]} />
        </Campo>
        <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
          Adelantás <b style={{ color: T.tinta }}>{s.E} cuotas</b>
          {s.E > 0 ? (plan.sobrante === "acorta"
            ? <>: terminás en la cuota {s.ultima}.</>
            : <>: la cuota pura baja {pctTxt(1 - s.factor, 1)} (factor {s.factor.toLocaleString("es-AR", { maximumFractionDigits: 5 })}).</>) : "."}
        </div>
      </Seccion>

      <Seccion titulo="Cronos y retiro" sub={`Cronos neto ${millones(s.cronosNeto)} · retiro ${plan.mesesRetiro} meses después del acto`}>
        <Dos>
          <Campo label="Venta del Cronos"><NumIn value={plan.cronosVenta} onChange={(v) => upd({ cronosVenta: v })} /></Campo>
          <Campo label="Patente adeudada"><NumIn value={plan.cronosPatente} onChange={(v) => upd({ cronosPatente: v })} /></Campo>
        </Dos>
        <Dos>
          <Campo label="Suba Cronos % / mes"><NumIn modo="pct" value={plan.cronosSuba} onChange={(v) => upd({ cronosSuba: v })} /></Campo>
          <Campo label="Meses del acto al retiro"><NumIn modo="int" value={plan.mesesRetiro} onChange={(v) => upd({ mesesRetiro: Math.max(0, Math.min(12, v)) })} /></Campo>
        </Dos>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 5 }}>Suba 0 = lo vendés al precio de hoy aunque sea más adelante.</div>
        <Campo label="El Cronos se entrega en">
          <Opciones valor={plan.cronosEntrega} onCambiar={(v) => upd({ cronosEntrega: v })}
            opciones={[["acto", "El mes del acto"], ["retiro", "El mes del retiro"]]} />
        </Campo>
        <Campo label="Gastos de retiro en $ de hoy" nota="Se pagan el mes del retiro, ajustados por inflación.">
          <NumIn value={plan.gastosRetiro} onChange={(v) => upd({ gastosRetiro: v })} />
        </Campo>
      </Seccion>

      <Seccion titulo="Costos del auto nuevo" sub={`Seguro ${corta(plan.seguroNuevo)} · tope ${corta(plan.tope)} de hoy`}>
        <Dos>
          <Campo label="Seguro Territory / mes"><NumIn value={plan.seguroNuevo} onChange={(v) => upd({ seguroNuevo: v })} /></Campo>
          <Campo label="Seguro Cronos (dejás)"><NumIn value={plan.seguroViejo} onChange={(v) => upd({ seguroViejo: v })} /></Campo>
        </Dos>
        <Dos>
          <Campo label="Nafta extra / mes"><NumIn value={plan.naftaExtra} onChange={(v) => upd({ naftaExtra: v })} /></Campo>
          <Campo label="Patente Territory / mes"><NumIn value={plan.patenteNueva} onChange={(v) => upd({ patenteNueva: v })} /></Campo>
        </Dos>
        <Campo label="Tope de cuota + seguro (en $ de hoy)"><NumIn value={plan.tope} onChange={(v) => upd({ tope: v })} /></Campo>
        <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
          Todo en pesos de hoy: ajusta por inflación mes a mes. El seguro, la nafta y la patente de la Territory
          arrancan con el retiro; el seguro del Cronos se deja de pagar desde que lo entregás (se lo resto a tu flujo, no lo borro).
        </div>
      </Seccion>

      <Seccion titulo="Inflación y tu flujo" sub={plan.inflModo === "escenario" ? "Inflación del escenario base" : `Inflación ${pctTxt(plan.ipc, 2)} · auto ${pctTxt(plan.autoSuba, 2)} por mes`}>
        <Campo label="Inflación">
          <Opciones valor={plan.inflModo} onCambiar={(v) => upd({ inflModo: v })}
            opciones={[["fija", "Fija"], ["escenario", "La del escenario base"]]} />
        </Campo>
        {plan.inflModo === "escenario" ? (
          <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
            Usa los tramos de inflación del escenario base, y el valor del auto acompaña esa inflación.
          </div>
        ) : (
          <Dos>
            <Campo label="Inflación mensual"><NumIn modo="pct" value={plan.ipc} onChange={(v) => upd({ ipc: v })} /></Campo>
            <Campo label="Suba del auto mensual"><NumIn modo="pct" value={plan.autoSuba} onChange={(v) => upd({ autoSuba: v })} /></Campo>
          </Dos>
        )}
        <Campo label="Tu flujo sin el plan sale de"
          nota="Mientras dura el horizonte de Hoy uso lo que tenés cargado, tal cual lo ves ahí. Después, ese escenario: sueldo con aumentos, aguinaldo, gastos fijos y bolsas que ajustan; su préstamo no.">
          {escs.length ? (
            <Opciones valor={plan.escenarioId || escs[0].id} onCambiar={(v) => upd({ escenarioId: v })}
              opciones={escs.map((e) => [e.id, e.nombre])} />
          ) : (
            <div style={{ fontSize: 12.5, color: T.suave, lineHeight: 1.5 }}>
              No tenés escenarios guardados: uso tus supuestos por defecto (los de "Territory Titanium 2023", sin el préstamo).
            </div>
          )}
        </Campo>
        <Campo label="Tu ahorro">
          <Opciones valor={plan.rinde} onCambiar={(v) => upd({ rinde: v })}
            opciones={[["inflacion", "Rinde como la inflación (PF UVA)"], ["nada", "No rinde"]]} />
        </Campo>
        <Campo label="Ahorro con el que arrancás"
          nota={plan.inicialModo === "manual" ? null : `${plataR(saldoAuto)}: lo que proyecta Hoy a fin de ${etiqMesLargo(sumaMes(plan.inicio, -1))}.`}>
          <Opciones valor={plan.inicialModo} onCambiar={(v) => upd({ inicialModo: v })}
            opciones={[["auto", "El de Hoy"], ["manual", "Lo pongo yo"]]} />
          {plan.inicialModo === "manual" && (
            <div style={{ marginTop: 8 }}><NumIn value={plan.inicial} onChange={(v) => upd({ inicial: v })} /></div>
          )}
        </Campo>
      </Seccion>
    </>
  );
}

/* ---------- Pantalla ---------- */
function Planes({ cfg, setCfg, movs, medios, abrirId, onAbierto }) {
  const planes = cfg.planes || [];
  const escs = cfg.escenarios || [];
  const [sel, setSel] = useState(abrirId || (planes[0] ? planes[0].id : null));
  const [enHoy, setEnHoy] = useState(false);
  useEffect(() => { if (abrirId) { setSel(abrirId); if (onAbierto) onAbierto(); } }, [abrirId]);
  const plan = planes.find((x) => x.id === sel) || planes[0];
  const guardar = (l) => setCfg({ ...cfg, planes: l });
  const upd = (patch) => guardar(planes.map((x) => (x.id === plan.id ? { ...x, ...patch } : x)));
  const nuevo = () => { const p = planVacio(); guardar([...planes, p]); setSel(p.id); };
  const tieneVIEL = planes.some((x) => /^Territory Híbrida/.test(x.nombre || ""));
  const cargarVIEL = () => {
    const ps = planesTerritoryVIEL();
    // Si hay otro plan prendido, lo apagamos: el de la suba media pasa a verse en Hoy
    guardar([...planes.map((x) => ({ ...x, activo: false })), ...ps]); setSel(ps[1].id);
  };

  // Tu flujo sin el plan: lo pesado. Solo se recalcula si cambia algo que lo afecta.
  const cfgBase = useCfgSinPlanes(cfg);
  const kBase = plan ? [plan.id, plan.inicio, plan.escenarioId, plan.inflModo, plan.ipc, plan.cuotasPagas, plan.mesesRetiro].join("|") : "";
  const base = useMemo(() => (plan ? basePlan(plan, cfgBase, movs, medios) : null), [kBase, cfgBase, movs, medios]);
  const s = useMemo(() => (plan && base ? simularPlan(plan, base) : null), [plan, base]);

  if (!plan || !s) {
    return (
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ fontSize: 14, color: T.suave, lineHeight: 1.55 }}>
          Simulá un plan de ahorro con licitación encima de tu flujo: cuotas, oferta, venta del Cronos,
          retiro y lo que te cuesta el auto nuevo. <b style={{ color: T.tinta }}>Nunca toca tus movimientos.</b>
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={cargarVIEL}>Cargar mi Territory Híbrida (VIEL)</button>
        <div style={{ fontSize: 12, color: T.suave, marginTop: 8, lineHeight: 1.5 }}>
          Plan SEL 70/30 en 84 cuotas, entrega pactada en cuota 3 con el 40%, retiro en enero con el
          Cronos. Te crea tres versiones según cuánto sube el auto después de las 12 cuotas fijas.
        </div>
        <button className="chip sm" style={{ marginTop: 12 }} onClick={nuevo}>O crear uno vacío</button>
      </div>
    );
  }

  const r = s.resumen;
  const mesT = (t) => etiqMes(sumaMes(plan.inicio, t - 1));
  const esPreset = (pr) => +plan.mAdj === pr.mAdj && Math.round(+plan.oferta) === pr.oferta;
  const meses = s.filas.map((f) => f.mk);
  const nombreBase = (s.esc && s.esc.nombre) || "tus supuestos";
  const primerEsc = s.filas.find((f) => f.deBase === "esc");
  const deHoy = s.filas.filter((f) => f.deBase === "hoy");

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <div className="scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>
        {planes.map((x) => (
          <button key={x.id} className={"chip sm" + (x.id === plan.id ? " on" : "")} onClick={() => setSel(x.id)}>{x.nombre}</button>
        ))}
        {!tieneVIEL && <button className="chip sm" onClick={cargarVIEL}>+ Mi Territory (VIEL)</button>}
        <button className="chip sm" onClick={nuevo}>+ Nuevo</button>
      </div>

      <div style={{ marginTop: 14 }}><Ficticio /></div>
      <div style={{ fontSize: 21, fontWeight: 660, letterSpacing: "-0.02em", marginTop: 8 }}>{plan.nombre}</div>
      <div style={{ fontSize: 12.5, color: T.suave, marginTop: 3 }}>
        Cuota 1 en {etiqMes(plan.inicio)} · última en {mesT(s.ultima)} · {plan.activo === false ? "apagado" : "se ve en Hoy"}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <button className={"chip sm" + (plan.activo !== false ? " on" : "")} onClick={() => upd({ activo: plan.activo === false })}>
          {plan.activo === false ? "Prender" : "Prendido"}
        </button>
        <button className="chip sm" onClick={() => {
          const copia = JSON.parse(JSON.stringify(plan));
          copia.id = "plan" + Date.now(); copia.nombre = plan.nombre + " (copia)";
          guardar([...planes, copia]); setSel(copia.id);
        }}>Duplicar</button>
        <button className="chip sm" style={{ color: T.rojo }} onClick={() => {
          if (!confirm(`¿Borrar "${plan.nombre}"? Tus movimientos reales no se tocan.`)) return;
          const resto = planes.filter((x) => x.id !== plan.id);
          guardar(resto); setSel(resto[0] ? resto[0].id : null);
        }}>Borrar</button>
      </div>

      <label className="lbl" style={{ marginTop: 16 }}>Casos de licitación</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6 }}>
        {PRESETS_PLAN.map((pr) => (
          <button key={pr.id} className="card" onClick={() => upd({ mAdj: pr.mAdj, oferta: pr.oferta })}
            style={{ padding: "9px 8px", textAlign: "left", minWidth: 0,
                     background: esPreset(pr) ? T.tinta : T.card, color: esPreset(pr) ? "#fff" : T.tinta,
                     borderColor: esPreset(pr) ? T.tinta : T.linea }}>
            <div style={{ fontSize: 12.5, fontWeight: 650 }}>{pr.id} · {nombrePreset(plan, pr).replace("Gano en ", "")}</div>
            <div className="num" style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>oferta {millones(pr.oferta)}</div>
          </button>
        ))}
      </div>

      <div className="cima" style={{ padding: "18px 18px 16px", marginTop: 14 }}>
        <div style={{ fontSize: 12.5, color: "rgba(234,240,236,.62)" }}>Retirás la Territory en</div>
        <div className="plata" style={{ fontSize: 30, color: "#fff", marginTop: 4, letterSpacing: "-0.03em" }}>
          {etiqMesLargo(r.ret.mk)}
        </div>
        <div style={{ fontSize: 13, color: "rgba(234,240,236,.75)", marginTop: 6, lineHeight: 1.5 }}>
          Acto en {etiqMes(r.acto.mk)} (cuota {s.mAdj}) y retiro {plan.mesesRetiro} {+plan.mesesRetiro === 1 ? "mes" : "meses"} después.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 14,
                      paddingTop: 12, borderTop: "1px solid rgba(234,240,236,.14)", fontSize: 12.5 }}>
          <span style={{ color: "rgba(234,240,236,.62)" }}>Colchón después del retiro</span>
          <span className="num" style={{ color: r.colchon < 0 ? "#FFB4A6" : "#fff", fontWeight: 650, fontSize: 15 }}>
            {plataR(r.colchon)}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "rgba(234,240,236,.55)", textAlign: "right", marginTop: 2 }}>
          {plataR(r.colchonHoy)} de hoy · saldo a fin de {etiqMes(r.ret.mk)}
        </div>
      </div>

      {r.faltaEn && (
        <div className="aviso" style={{ background: T.rojoBg, color: T.rojo, marginTop: 10 }}>
          <b>No te alcanza {r.faltaActo ? "para la oferta" : "para el retiro"}:</b> en {etiqMesLargo(r.faltaEn.mk)} tu
          saldo con el plan queda en {plataR(r.faltaEn.saldoCon)}.
          {r.recupera ? ` Volvés a positivo en ${etiqMesLargo(r.recupera.mk)}.` : " No volvés a positivo en todo el plan."}
        </div>
      )}
      {!r.faltaEn && r.minCon.saldoCon < 0 && (
        <div className="aviso" style={{ background: T.rojoBg, color: T.rojo, marginTop: 10 }}>
          <b>Quedás en rojo:</b> en {etiqMesLargo(r.minCon.mk)} tu saldo con el plan llega a {plataR(r.minCon.saldoCon)} ({plataR(r.minConHoy)} de hoy).
        </div>
      )}
      {r.sobreTope.length > 0 && (
        <div className="aviso" style={{ background: T.rojoBg, color: T.rojo, marginTop: 10 }}>
          <b>Pasás tu tope en {r.sobreTope.length} {r.sobreTope.length === 1 ? "mes" : "meses"}:</b> la cuota + el seguro supera
          {" "}{plataR(plan.tope)} de hoy. El primero es {etiqMesLargo(r.sobreTope[0].mk)}, con {plataR(r.sobreTope[0].cuotaSegHoy)}.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, marginTop: 10 }}>
        <Tile ancho titulo={`Oferta contra Cronos · ${etiqMes(r.acto.mk)}`}
          valor={r.saleAhorro > 0 ? `Sale del ahorro ${plataR(r.saleAhorro)}` : `No toca tu ahorro`}
          color={r.faltaActo ? T.rojo : T.tinta}
          sub={<>
            Oferta {plataR(s.ofertaNom)}: integración {plataR(+plan.integracion * s.ix.auto(s.mAdj))} + {s.E} cuotas
            adelantadas {plataR(s.E * s.pura * s.ix.auto(s.mAdj))}.<br />
            Cronos neto {plataR(s.cronosNeto)} (venta {plataR(s.cronosVenta)} − patente {plataR(plan.cronosPatente)})
            {r.mismoMes ? "" : `, que entra en ${etiqMes(sumaMes(plan.inicio, s.tCron - 1))}`}.
            {r.sobra > 0 && <b style={{ color: T.verde }}> Te sobran {plataR(r.sobra)}.</b>}
          </>} />
        <Tile titulo="Gastos de retiro" valor={plataR(r.ret.retiro)}
          sub={`${plataR(r.retiroHoy)} de hoy · ${etiqMes(r.ret.mk)}`} />
        <Tile titulo="Cuota + seguro máxima (hoy)" valor={plataR(r.maxCS.cuotaSegHoy)}
          color={r.maxCS.pasaTope ? T.rojo : T.tinta}
          sub={`${etiqMes(r.maxCS.mk)} · tope ${corta(plan.tope)}`} />
        <Tile titulo="Total pagado (hoy)" valor={corta(r.totalHoy)}
          sub={`cuotas ${corta(r.totalCuotasHoy)} + oferta ${corta(r.ofertaHoy)} · más ${corta(r.retiroHoy)} de retiro · el auto hoy vale ${corta(plan.vm)}`} />
        <Tile titulo="Última cuota" valor={etiqMesLargo(r.ult.mk)}
          sub={`cuota ${s.ultima} · ${plataR(r.ult.cuota)} (${plataR(r.ult.cuota / r.ult.ii)} de hoy)`} />
        <Tile titulo={`Ahorro en ${etiqMes(r.fin.mk)} (hoy)`} valor={corta(r.finConHoy)}
          color={r.finConHoy < 0 ? T.rojo : T.tinta}
          sub={`sin el plan: ${corta(r.finSinHoy)}`} />
        <Tile titulo="Mes más flaco después del retiro" valor={corta(r.minConHoy)}
          color={r.minConHoy < 0 ? T.rojo : T.tinta}
          sub={`saldo con el plan en ${etiqMes(r.minCon.mk)}, en pesos de hoy`} />
      </div>

      <div className="card" style={{ padding: "14px 13px 8px", marginTop: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620 }}>Tu saldo, con y sin el plan</div>
        <div style={{ fontSize: 11.5, color: T.suave, margin: "3px 0 10px", lineHeight: 1.5 }}>
          En pesos de hoy. La distancia entre las dos líneas es lo que te cuesta el plan.
        </div>
        <GraficoLineas meses={meses} aria="Saldo con y sin el plan, en pesos de hoy"
          series={[
            { nombre: "Sin el plan", corto: "Sin plan", color: COLOR_SIN, valores: s.filas.map((f) => f.saldoSin / f.ii) },
            { nombre: "Con el plan", corto: "Con plan", color: COLOR_CON, valores: s.filas.map((f) => f.saldoCon / f.ii) },
          ]} />
      </div>

      <div className="card" style={{ padding: "14px 13px 8px", marginTop: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620 }}>Cuota + seguro contra tu tope</div>
        <div style={{ fontSize: 11.5, color: T.suave, margin: "3px 0 10px", lineHeight: 1.5 }}>
          En pesos de hoy. Si la línea pasa la punteada, te pasás del tope.
        </div>
        <GraficoLineas meses={meses} aria="Cuota más seguro contra el tope, en pesos de hoy"
          series={[{ nombre: "Cuota + seguro", corto: "Cuota+seg", color: COLOR_CON, valores: s.filas.map((f) => f.cuotaSegHoy) }]}
          referencia={{ nombre: `Tope ${corta(plan.tope)}`, valores: s.filas.map(() => +plan.tope || 0) }} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 620, marginTop: 20 }}>Supuestos</div>
      <EditorPlan plan={plan} upd={upd} s={s} escs={escs} saldoAuto={base.saldoAuto} />

      <div style={{ fontSize: 15, fontWeight: 620, marginTop: 22 }}>Mes a mes</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {[[false, "Pesos de cada mes"], [true, "Pesos de hoy"]].map(([val, n]) => (
          <button key={n} className={"chip sm" + (enHoy === val ? " on" : "")} onClick={() => setEnHoy(val)}>{n}</button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: T.suave, marginTop: 6, lineHeight: 1.5 }}>
        {enHoy ? `Todo deflactado por la inflación del plan, a pesos de ${etiqMesLargo(plan.inicio)}.` : "Cada número en los pesos del mes en que pasa."}
        {" "}Deslizá la tabla para ver todas las columnas.
      </div>
      <TablaPlan s={s} enHoy={enHoy} />
      <div style={{ fontSize: 11.5, color: T.tenue, marginTop: 10, lineHeight: 1.55 }}>
        Tu flujo sin el plan: {deHoy.length ? `${deHoy.length === 1 ? etiqMes(deHoy[0].mk) : `${etiqMes(deHoy[0].mk)} a ${etiqMes(deHoy[deHoy.length - 1].mk)}`} sale de Hoy (lo que tenés cargado, sin aumentos)` : ""}
        {deHoy.length && primerEsc ? "; " : ""}
        {primerEsc ? `desde ${etiqMes(primerEsc.mk)}, del escenario "${nombreBase}" sin su préstamo` : ""}.
        {" "}Arrancás con {plataR(s.saldoIni)}{plan.rinde === "nada" ? " y tu ahorro no rinde" : " y tu ahorro rinde como la inflación"}. Son supuestos tuyos, no es asesoramiento financiero.
      </div>
    </div>
  );
}

/* ---------- Tarjeta en Hoy: los planes prendidos ---------- */
// Tu saldo de Hoy, tal cual, más lo que movería el plan desde este mes.
function TarjetaPlanes({ cfg, movs, filas, onVer }) {
  const activos = (cfg.planes || []).filter((p) => p.activo !== false);
  if (!activos.length || !filas || !filas.length) return null;
  const desde = filas[0].mk;
  return (
    <div style={{ marginTop: 16 }}>
      {activos.map((p) => {
        const ix = indicesPlan(p, macroDeEscenario(escenarioBasePlan(p, cfg, movs)));
        const pl = calcularPlan(p, ix);
        const neto = {}; pl.filas.forEach((f) => { neto[f.mk] = f.neto; });
        let ac = 0;
        const conPlan = filas.map((f) => { ac += neto[f.mk] || 0; return { mk: f.mk, sin: f.saldo, con: f.saldo + ac }; });
        const ver = conPlan.filter((f) => f.mk >= p.inicio).slice(0, 3);
        const mkRet = sumaMes(p.inicio, pl.tRet - 1);
        const enRet = conPlan.find((f) => f.mk === mkRet);
        return (
          <button key={p.id} onClick={() => onVer(p.id)} className="card"
            style={{ width: "100%", textAlign: "left", padding: "13px 15px", marginTop: 8,
                     borderStyle: "dashed", borderColor: "#E9C98A" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Ficticio chico />
              <span style={{ fontSize: 12.5, color: T.ambar, fontWeight: 600 }}>Ver ›</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 620, marginTop: 6 }}>{p.nombre}</div>
            <div style={{ fontSize: 12, color: T.suave, marginTop: 2, lineHeight: 1.5 }}>
              Acto en {etiqMes(sumaMes(p.inicio, pl.mAdj - 1))} · retirás en {etiqMes(mkRet)}
              {enRet && <> · te quedan{" "}
                <b className="num" style={{ color: enRet.con < 0 ? T.rojo : T.tinta }}>{corta(enRet.con)}</b></>}
            </div>
            {ver.length > 0 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr", gap: 6, fontSize: 11, color: T.tenue, marginTop: 8 }}>
                  <span />
                  <span style={{ textAlign: "right" }}>Saldo con plan</span>
                  <span style={{ textAlign: "right" }}>Hoy</span>
                </div>
                {ver.map((f) => (
                  <div key={f.mk} className="num" style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr", gap: 6, fontSize: 12.5, padding: "3px 0" }}>
                    <span style={{ color: T.suave }}>{etiqMes(f.mk)}</span>
                    <span style={{ textAlign: "right", color: f.con < 0 ? T.rojo : T.tinta }}>{corta(f.con)}</span>
                    <span style={{ textAlign: "right", color: f.sin < 0 ? T.rojo : T.suave }}>{corta(f.sin)}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ fontSize: 12, color: T.suave, marginTop: 6 }}>Arranca en {etiqMesLargo(p.inicio)}.</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Simular con solapas ---------- */
function SimularWrap({ cfg, setCfg, cfgVista, movs, medios, esDueno, vista, setVista, abrirEsc, onAbierto,
                      abrirPlan, onPlanAbierto }) {
  if (!esDueno) return <Simular cfg={cfgVista} movs={movs} medios={medios} />;
  return (
    <>
      <div className="scroll" style={{ display: "flex", gap: 6, padding: "14px 16px 0", overflowX: "auto" }}>
        {[["compra", "Compra"], ["esc", "Escenarios"], ["plan", "Plan de ahorro"], ["inv", "Inversiones"]].map(([v, n]) => (
          <button key={v} className={"chip" + (vista === v ? " on" : "")} onClick={() => setVista(v)}>{n}</button>
        ))}
      </div>
      {vista === "compra" && <Simular cfg={cfgVista} movs={movs} medios={medios} />}
      {vista === "esc" && <Escenarios cfg={cfg} setCfg={setCfg} movs={movs} medios={medios} abrirId={abrirEsc} onAbierto={onAbierto} />}
      {vista === "plan" && <Planes cfg={cfg} setCfg={setCfg} movs={movs} medios={medios} abrirId={abrirPlan} onAbierto={onPlanAbierto} />}
      {vista === "inv" && <Inversiones cfg={cfg} setCfg={setCfg} />}
    </>
  );
}

/* ===================== SHELL ===================== */
// Icono + etiqueta chica: con 5 pestañas el texto solo ya no entra en un teléfono
const ICONOS = {
  hoy:  "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10",
  movs: "M4 7h16M4 12h16M4 17h10",
  inv:  "M4 17.5 9.5 12l3.5 3.5L20 8M20 8h-4.5M20 8v4.5",
  sim:  "M5 8h14M5 16h14M9 5.5v5M15 13.5v5",
  rep:  "M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5M16.5 15c2.5.3 4 1.8 4 4.5M15.5 10.5a2.6 2.6 0 0 0 0-5",
};
const TABS = [["hoy", "Hoy"], ["movs", "Movs"], ["inv", "Invierto"], ["sim", "Simular"], ["rep", "Personas"]];
const SEED_VERSION = 6;
const APP_VERSION = "beta 1.0";
const CFG_INI = { saldoHoy: 0, reservasUsd: 0, tcAuto: true, tcFuente: 'blue', tcLado: 'compra', tc: 1550, sellos: 0.012, ajuste: 0, horizonte: 6, diaCobro: 28, nombre: '', inversiones: [], resumenes: {}, confirmados: {}, ritmoBase: null, desdeMes: null, ajustes: {}, aplicados: {}, medios: null, revisadas: {}, escenarios: [], simulaciones: [], planes: [] };

export default function App() {
  const [sesion, setSesion] = useState(undefined);   // undefined = averiguando
  const [perfil, setPerfil] = useState(null);
  const [estado, setEstado] = useState("");
  const [verCuenta, setVerCuenta] = useState(false);
  const [tab, setTab] = useState("hoy");
  const [cfg, setCfgRaw] = useState(CFG_INI);
  const [movs, setMovs] = useState(SEED);
  const [cargando, setCargando] = useState(true);
  const [falloCarga, setFalloCarga] = useState(false);
  const vaciadoPedido = useRef(false);
  const soloLectura = useRef(true);   // hasta confirmar qué hay en la nube, no escribimos nada
  const [editando, setEditando] = useState(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const [verMedios, setVerMedios] = useState(false);
  const [verRapido, setVerRapido] = useState(false);
  const [verImportar, setVerImportar] = useState(false);
  const [verFinanciar, setVerFinanciar] = useState(false);
  const [verReporte, setVerReporte] = useState(false);
  const [verCompartir, setVerCompartir] = useState(false);
  const [undo, setUndo] = useState(null);
  const [simVista, setSimVista] = useState("compra");
  const [abrirEsc, setAbrirEsc] = useState(null);
  const [abrirPlan, setAbrirPlan] = useState(null);
  const [deudas, setDeudas] = useState([]);
  const [perfiles, setPerfiles] = useState({});
  const [cargandoDeudas, setCargandoDeudas] = useState(false);

  // Traemos las deudas al entrar y cada vez que vuelve el foco a la app
  const refrescarDeudas = React.useCallback(async () => {
    if (!sesion || !sesion.user) return;
    setCargandoDeudas(true);
    try {
      const d = await traerDeudas(sesion.user.id);
      setDeudas(d);
      const ids = [...new Set(d.flatMap((x) => [x.acreedor, x.deudor]))]
        .filter((x) => x && x !== sesion.user.id);
      if (ids.length) {
        const { data } = await sb.from("perfiles").select("id, usuario").in("id", ids);
        const m = {}; (data || []).forEach((p) => { m[p.id] = p.usuario; });
        setPerfiles(m);
      }
    } catch (e) { /* la tabla puede no existir todavía */ }
    setCargandoDeudas(false);
  }, [sesion]);

  useEffect(() => { refrescarDeudas(); }, [refrescarDeudas]);
  useEffect(() => {
    const f = () => { if (!document.hidden) refrescarDeudas(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [refrescarDeudas]);

  const pendientes = sesion && sesion.user ? requierenAccion(deudas, sesion.user.id).length : 0;
  // Escenarios e Inversiones son, por ahora, solo para el dueño de la app
  const esDueno = !!(perfil && perfil.usuario === DUENO);
  // Si la cuenta nunca definió medios, dependemos de si trae la semilla o arrancó vacía
  const medios = (cfg.medios && cfg.medios.length) ? cfg.medios
               : (movs.length ? MEDIOS_INI : MEDIOS_NUEVO);

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
      let leyoBien = false;   // ¿pudimos confirmar QUÉ hay en la nube?
      try {
        const { data, error } = await sb.from("datos").select("cfg, movs").eq("id", uid).maybeSingle();
        if (error) throw error;
        leyoBien = true;                       // la consulta anduvo: sabemos si hay datos o no
        if (data && data.movs && data.movs.length) { cfgN = data.cfg; movsN = data.movs; }
      } catch (e) {
        // No pudimos leer. NO es lo mismo que estar vacío: si asumiéramos eso,
        // el guardado automático borraría los datos reales.
        setFalloCarga(true);
        setCargando(false);
        return;
      }

      if (!movsN) {
        // Cuenta nueva: si habia datos en este navegador, se los llevamos a la nube.
        try {
          const raw = localStorage.getItem("flujo:v2");
          if (raw) { const d = JSON.parse(raw); if (d.movs && d.movs.length) { cfgN = d.cfg; movsN = d.movs; } }
        } catch (e) { /* nada guardado */ }
      }
      // Cuenta nueva de verdad: arranca vacia. La semilla es solo de quien la cargo.
      // Las tarjetas tampoco se heredan: son datos personales de otra persona.
      let nueva = false;
      if (!movsN) { movsN = []; nueva = true; }
      soloLectura.current = false;

      const mk = mesDeHoy();
      const c = { ...CFG_INI, ...(cfgN || {}), desdeMes: null,
                  ajustes: (cfgN && cfgN.ajustes) || {}, aplicados: (cfgN && cfgN.aplicados) || {} };
      if (nueva && !c.medios) c.medios = MEDIOS_NUEVO;

      // Limpieza: si quedo el efecto de un movimiento que ya no existe, lo revertimos.
      // Pasa si se borro el movimiento sin deshacer primero.
      const vivos = new Set(movsN.map((m) => m.id));
      // Las claves auxiliares (dev|xxx) cuelgan del movimiento xxx
      const raiz = (id) => String(id).replace(/^dev\|/, "");
      // Las liquidaciones con personas (per|Nombre) no cuelgan de ningún movimiento
      const vive = (id) => String(id).startsWith("per|") || vivos.has(raiz(id));
      let cajaFix = c.saldoHoy || 0, resFix = c.reservasUsd || 0, huerfanos = 0;
      const apLimpio = {};
      Object.keys(c.aplicados || {}).forEach((k) => {
        const mes = {};
        Object.keys(c.aplicados[k] || {}).forEach((id) => {
          if (vive(id)) mes[id] = c.aplicados[k][id];
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
        Object.keys(c.ajustes[k] || {}).forEach((id) => { if (vive(id)) mes[id] = c.ajustes[k][id]; });
        c.ajustes[k] = mes;
      });
      // Desde acá se arrastra lo que no se salda con cada persona
      if (!c.personasDesde) c.personasDesde = mk;
      if (!c.ajustesInit) {
        c.ajustes = { ...c.ajustes,
          [mk]: { ...ajustesEnCero(movsN.filter((m) => String(m.id).startsWith("s")), mk, c.tc),
                  ...(c.ajustes[mk] || {}) } };
        c.ajustesInit = true;
      }
      if (!vivo) return;
      setCfgRaw(c); setMovs(movsN);
      const tieneSemilla = movsN.length > 0 && movsN.some((m) => String(m.id).startsWith("s"));
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
    if (soloLectura.current) return;          // todavía no sabemos qué hay en la nube
    // Red de seguridad: escribir una lista vacía encima de datos existentes solo
    // puede pasar si el usuario lo pidió explícitamente (vaciar o borrar todo).
    if ((!m || !m.length) && !vaciadoPedido.current) {
      setEstado("error");
      return;
    }
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
                           [mk]: { ...ajustesEnCero(SEED, mk, cfg.tc, MEDIOS_INI), ...((cfg.ajustes || {})[mk] || {}) } } };
    if (!n.length) vaciadoPedido.current = true;
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

  // Foto del estado anterior. Una sola: alcanza para arrepentirse del último toque.
  const marcarUndo = (que) => setUndo({ cfg, movs, que });
  const deshacer = () => {
    if (!undo) return;
    if (!undo.movs.length) vaciadoPedido.current = true;
    setCfgRaw(undo.cfg); setMovs(undo.movs); persistir(undo.cfg, undo.movs);
    setUndo(null); setEditando(null);
  };

  const guardarMov = (mv) => {
    const existe = movs.some((x) => x.id === mv.id);
    marcarUndo((existe ? "la edición de " : "la carga de ") + (mv.detalle || "un movimiento"));
    setM(existe ? movs.map((x) => (x.id === mv.id ? mv : x)) : [mv, ...movs]);
    setEditando(null);
  };
  const borrarVarios = (idsBase) => {
    marcarUndo(idsBase.length === 1
      ? "el borrado de " + ((movs.find((x) => x.id === idsBase[0]) || {}).detalle || "un movimiento")
      : `el borrado de ${idsBase.length} movimientos`);
    // Al borrar un gasto se va también la marca de su reintegro
    const ids = [...idsBase, ...idsBase.map((x) => "dev|" + x)];
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
    const n = movs.filter((x) => !idsBase.includes(x.id));
    // Si no queda ningun movimiento, las tarjetas tampoco tienen por que sobrevivir
    if (!n.length && !cfg.medios) c.medios = MEDIOS_NUEVO;
    if (!n.length) vaciadoPedido.current = true;
    setCfgRaw(c); setMovs(n); persistir(c, n);
    setEditando(null);
  };
  const guardarMedios = (lista) => {
    // Nunca dejamos la app sin medios de pago
    const l = lista.length ? lista : MEDIOS_NUEVO;
    setCfg({ ...cfg, medios: l });
  };
  // Vaciar deja la cuenta como recién creada: sin movimientos, sin tarjetas, sin saldo.
  // NUNCA vuelve a cargar la semilla: esos son los datos de una persona, no un ejemplo.
  const reiniciar = () => {
    const c = { ...CFG_INI, tc: cfg.tc, horizonte: cfg.horizonte, diaCobro: cfg.diaCobro,
                nombre: cfg.nombre, medios: MEDIOS_NUEVO, ajustesInit: true };
    vaciadoPedido.current = true;
    setMovs([]); setCfgRaw(c); persistir(c, []); setVerAjustes(false);
  };
  // Para probar la app sin cargar nada a mano
  const cargarEjemplo = () => {
    const mk = mesDeHoy();
    const c = { ...CFG_INI, tc: cfg.tc, horizonte: cfg.horizonte, medios: MEDIOS_INI,
                ajustesInit: true, ajustes: { [mk]: ajustesEnCero(SEED, mk, cfg.tc, MEDIOS_INI) } };
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
  // Poner el importe real de un recurrente lo da por CONFIRMADO: ya no es estimación.
  const confirmar = (mk, id, si) => {
    const c = { ...(cfg.confirmados || {}) };
    c[mk] = { ...(c[mk] || {}) };
    if (si) c[mk][id] = true; else delete c[mk][id];
    return c;
  };
  const ajustar = (mk, id, monto, mover) => {
    const base = String(id).replace(/^dev\|/, "");
    const nom = (movs.find((x) => x.id === base) || {}).detalle || "un movimiento";
    marcarUndo("el cambio en " + nom);
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
             // Poner el importe real deja de ser una estimación
             confirmados: confirmar(mk, id, monto !== null),
             saldoHoy: Math.round(caja),
             reservasUsd: Math.max(0, Math.round(res * 100) / 100) });
  };

  // Registrar que una persona te pasó plata (+) o que se la pasaste vos (−).
  // total = lo liquidado ESE mes con esa persona, acumulado. null = deshacer.
  const liquidar = (mk, persona, total) => {
    const id = "per|" + persona;
    marcarUndo("lo registrado con " + persona);
    const a = { ...(cfg.ajustes || {}) };
    const delMes = { ...(a[mk] || {}) };
    const ap = { ...(cfg.aplicados || {}) };
    const apMes = { ...(ap[mk] || {}) };
    let caja = cfg.saldoHoy || 0;
    // Primero se revierte lo que ya estaba registrado, así nunca se cuenta dos veces
    if (apMes[id]) { caja += apMes[id].pesos; delete apMes[id]; }
    if (!total) delete delMes[id];
    else {
      delMes[id] = Math.round(total);
      // Te lo pasaron: entra a la caja. Se lo pasaste: sale.
      apMes[id] = { usd: 0, pesos: -Math.round(total) };
      caja += Math.round(total);
    }
    a[mk] = delMes; ap[mk] = apMes;
    setCfg({ ...cfg, ajustes: a, aplicados: ap, saldoHoy: Math.round(caja),
             personasDesde: cfg.personasDesde || mesDeHoy() });
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

  // Si no pudimos leer, mostramos un error. Mostrar una cuenta vacía sería peor:
  // el usuario cree que perdió todo y la app termina guardando ese vacío.
  if (falloCarga) return (
    <div className="bz" style={{ minHeight: "100vh", background: T.papel, padding: 26,
          display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 21, fontWeight: 660, letterSpacing: "-0.02em", marginBottom: 10 }}>
        No pude leer tus datos
      </div>
      <div style={{ fontSize: 14, color: T.suave, lineHeight: 1.6 }}>
        Hubo un problema al conectarme. <b>Tus datos están a salvo</b>: prefiero no mostrarte nada
        antes que mostrarte una cuenta vacía que no es la tuya.
      </div>
      <button className="btn" style={{ marginTop: 24 }}
        onClick={() => window.location.reload()}>Reintentar</button>
    </div>
  );

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
          onAbrirAjustes={() => setVerAjustes(true)} onAjustar={ajustar} onLiquidar={liquidar}
          coti={coti} estadoCoti={estadoCoti} onRefrescar={refrescar} tcVivo={tcVivo}
          historial={historial} cerradas={[]} estimados={estimados}
          invertido={(() => {
            const b = resumenInversiones(cfg.inversiones, cfgTC.tc);
            const usd = (+cfg.reservasUsd || 0) * cfgTC.tc;
            return { ...b, total: b.total + usd,
                     porTipo: usd > 0 ? { Dólares: usd, ...b.porTipo } : b.porTipo };
          })()}
          onVerInvertido={() => setTab("inv")}
          onAbrirImportar={() => setVerImportar(true)}
          onFinanciar={() => setVerFinanciar(true)}
          pendientesDeuda={pendientes}
          onVerPersonas={() => setTab("rep")}
          undo={undo} onDeshacer={deshacer}
          escenariosCard={esDueno && ((cfg.escenarios || []).some((e) => e.activo !== false) ||
                                      (cfg.planes || []).some((p) => p.activo !== false)) ? (
            <>
              <TarjetaEscenarios cfg={cfgTC} movs={movs} medios={medios}
                onVer={(id) => { setSimVista("esc"); setAbrirEsc(id); setTab("sim"); }} />
              <TarjetaPlanes cfg={cfgTC} movs={movs} filas={filas}
                onVer={(id) => { setSimVista("plan"); setAbrirPlan(id); setTab("sim"); }} />
            </>
          ) : null}
          onConfirmarAuto={(mk, ids) => {
            marcarUndo(ids.length === 1
              ? "la confirmación de " + ((movs.find((x) => x.id === ids[0]) || {}).detalle || "un gasto")
              : `la confirmación de ${ids.length} gastos`);
            const c = { ...(cfg.confirmados || {}) };
            c[mk] = { ...(c[mk] || {}) };
            ids.forEach((id) => { c[mk][id] = true; });
            setCfg({ ...cfg, confirmados: c });
          }}
          onAbrirMedios={() => setVerMedios(true)}
          revisadas={cfg.revisadas || {}}
          onRevisar={(clave) => setCfg({ ...cfg, revisadas: { ...(cfg.revisadas || {}), [clave]: true } })}
        />
      )}
      {tab === "movs" && <Movimientos movs={movs} medios={medios} cfg={cfgTC} onEditar={setEditando} onBorrarVarios={borrarVarios} />}
      {tab === "sim" && (
        <SimularWrap cfg={cfgTC} setCfg={setCfg} cfgVista={{ ...cfgTC, desdeMes: desde }}
          movs={movs} medios={medios} esDueno={esDueno}
          vista={simVista} setVista={setSimVista}
          abrirEsc={abrirEsc} onAbierto={() => setAbrirEsc(null)}
          abrirPlan={abrirPlan} onPlanAbierto={() => setAbrirPlan(null)} />
      )}
      {tab === "inv" && <Invertido cfg={cfg} setCfg={setCfg} tc={cfgTC.tc} />}
      {tab === "rep" && (
        <PersonasNube sesion={sesion} deudas={deudas} perfiles={perfiles}
          cargando={cargandoDeudas} onActualizar={refrescarDeudas}
          onCompartir={() => setVerCompartir(true)} />
      )}

      <button
        onClick={() => setVerRapido(true)}
        style={{
          position: "fixed", right: 18, bottom: 84, width: 54, height: 54, borderRadius: 27,
          background: T.tinta, color: "#fff", fontSize: 28, fontWeight: 300, zIndex: 20,
          boxShadow: "0 3px 14px rgba(18,49,43,.28)", lineHeight: 1,
        }}
        aria-label="Agregar movimiento"
      >+</button>

      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 470, margin: "0 auto",
        display: "grid", gridTemplateColumns: `repeat(${TABS.length},1fr)`, background: T.card,
        borderTop: `1px solid ${T.linea}`, zIndex: 30,
        backdropFilter: "saturate(1.2) blur(8px)",
        paddingBottom: "env(safe-area-inset-bottom, 6px)",
      }}>
        {TABS.map(([id, n]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              aria-label={n} aria-current={on ? "page" : undefined}
              style={{ padding: "9px 2px 8px", display: "flex", flexDirection: "column",
                       alignItems: "center", gap: 3, color: on ? T.tinta : T.tenue }}>
              <span style={{ position: "relative", lineHeight: 0 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth={on ? 2.1 : 1.7}
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ICONOS[id]} />
                </svg>
                {id === "rep" && pendientes > 0 && (
                  <span aria-label={`${pendientes} para responder`}
                    style={{ position: "absolute", top: -4, right: -7, minWidth: 15, height: 15,
                             padding: "0 4px", borderRadius: 99, background: T.rojo, color: "#fff",
                             fontSize: 9.5, fontWeight: 700, display: "flex",
                             alignItems: "center", justifyContent: "center" }}>
                    {pendientes}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: on ? 640 : 480, letterSpacing: "-0.01em",
                             whiteSpace: "nowrap" }}>{n}</span>
            </button>
          );
        })}
      </nav>

      {editando && (
        <FormMov
          inicial={editando} medios={medios} personas={personas}
          movs={movs} cfg={cfgTC} tcRef={cfgTC.tc}
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
      {verCompartir && (
        <Compartir sesion={sesion} medios={medios}
          onListo={(m) => { setMovs([...movs, m]); refrescarDeudas(); }}
          onCerrar={() => setVerCompartir(false)} />
      )}
      {verReporte && (
        <Reportar sesion={sesion} cfg={cfg} movs={movs} medios={medios} tab={tab}
          onCerrar={() => setVerReporte(false)} />
      )}
      {verFinanciar && (
        <Financiar medios={medios} cfg={cfg} onCerrar={() => setVerFinanciar(false)} />
      )}
      {verImportar && (
        <ImportarResumen
          medios={medios} movs={movs}
          onImportar={(nuevos, ciclos, medioId, fin, cambios = []) => {
            marcarUndo("la importación del resumen");
            // El resumen reemplaza lo cargado a mano en ese mes y tarjeta
            const porId = {};
            cambios.forEach((c) => { porId[c.id] = c; });
            const quedan = movs.flatMap((m) => {
              const c = porId[m.id];
              if (!c) return [m];
              if (c.accion === "borrar") return [];
              if (c.accion === "mover") return [{ ...m, mesInicio: c.mes }];
              if (c.accion === "truncar") {
                const n = Math.max(1, c.cuotas);
                const unit = m.moneda === "USD" ? null : (+m.montoCuota || (+m.monto || 0) / Math.max(1, m.cuotas || 1));
                const unitUsd = m.moneda === "USD" ? (+m.montoUsd || 0) / Math.max(1, m.cuotas || 1) : null;
                return [{ ...m, cuotas: n,
                          ...(unit != null ? { monto: Math.round(unit * n) } : {}),
                          ...(unitUsd != null ? { montoUsd: Math.round(unitUsd * n * 100) / 100 } : {}) }];
              }
              return [m];
            });
            setMovs([...quedan, ...nuevos]);
            // Ese mes ya no se estima: tenemos el resumen real
            if (medioId && ciclos && ciclos.vto) {
              setCfg({ ...cfg, resumenes: { ...(cfg.resumenes || {}),
                       [medioId + "|" + ciclos.vto.slice(0, 7)]: true } });
            }
            // El resumen trae las fechas del próximo ciclo: las guardamos como confirmadas
            if (medioId && ((ciclos && ciclos.proxCierre) || fin)) {
              const lista = medios.map((m) => {
                if (m.id !== medioId) return m;
                const cs = (m.ciclos || []).slice();
                [[ciclos.cierre, ciclos.vto], [ciclos.proxCierre, ciclos.proxVto]].forEach(([c, v]) => {
                  if (c && v && !cs.some((x) => x.cierre === c)) cs.push({ cierre: c, vto: v });
                });
                return { ...m, ciclos: cs,
                  tna: (fin && fin.tna) || m.tna, tem: (fin && fin.tem) || m.tem,
                  pagoMinimo: (fin && fin.pagoMinimo) || m.pagoMinimo,
                  saldo: (fin && fin.saldo) != null ? fin.saldo : m.saldo };
              });
              guardarMedios(lista);
            }
          }}
          onCerrar={() => setVerImportar(false)} />
      )}
      {verRapido && (
        <Rapido medios={medios} movs={movs} cfg={cfgTC}
          onGuardar={(m) => { marcarUndo("la carga de " + (m.detalle || "un gasto")); setM([...movs, m]); }}
          onDetallado={() => { setVerRapido(false); setEditando({}); }}
          onImportar={() => { setVerRapido(false); setVerImportar(true); }}
          onCerrar={() => setVerRapido(false)} />
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
          onCargarEjemplo={cargarEjemplo}
          onAbrirMedios={() => { setVerAjustes(false); setVerMedios(true); }}
          onAbrirImportar={() => { setVerAjustes(false); setVerImportar(true); }}
          onReportar={() => { setVerAjustes(false); setVerReporte(true); }}
          onCerrar={() => setVerAjustes(false)}
        />
      )}
    </div>
  );
}
