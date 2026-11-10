# Bancame / Vueltito — guía para Claude

App personal de gastos y flujo de fondos de Bautista (La Plata, Argentina).
Deploy: Vercel (flujo-app-one.vercel.app). Datos y login: Supabase.
Idioma de la UI y de los mensajes: español rioplatense, informal y corto.

## Stack
- React, todo en `src/App.jsx` (un solo archivo grande).
- Supabase (`@supabase/supabase-js`): auth con mail + contraseña y una fila por usuario con `{ cfg, movs }`.
- Copia local en `localStorage` ("flujo:v2").
- Se usa desde un iPhone: todo tiene que andar bien en pantallas chicas y en Safari.

## Cómo piensa la app (no romper esto)
- **Período de caja por sueldo** (`cfg.diaCobro`, `cfg.mesPorSueldo`, `DIA_CORTE`, `periodoDe()`). Si cobrás el 28,
  noviembre va del 28/10 al 27/11: el sueldo del 28/10 paga noviembre. `mesDeHoy()` devuelve el período, no el mes calendario.
  En el período en curso el sueldo ya está cobrado (lo tiene `saldoHoy`), aunque se le haya corregido el monto ese mes.
- **Flujo de fondos por vencimiento.** Un gasto con tarjeta va al mes en que vence el resumen,
  que es cuando sale la plata. La compra puede ser de otro mes. `mesDePago()` decide eso con los ciclos de la tarjeta.
- **Ciclos de tarjeta** (`medio.ciclos = [{cierre, vto, estimado?}]`). Los reales vienen de los resúmenes.
  Los estimados se calculan con `siguienteCiclo()`. Siempre hay uno por fecha de cierre (`normalizarCiclos()`).
  Una tarjeta puede tener dos vencimientos en el mismo mes: es real y hay que avisarlo, no "corregirlo".
- **Resumen importado** (`cfg.resumenes["medio|YYYY-MM"] = true`). Ese mes, los recurrentes de esa tarjeta
  dejan de estimar y mandan los movimientos reales. Nunca contar dos veces.
- **Resúmenes vencidos del mes en curso se dan por pagados** (`tarjetasVencidasEnMes`, `cfg.autoPagado`).
  `cfg.saldoHoy` es el saldo real de la cuenta, que ya los tiene descontados.
- **Personas** (Sol, Betty, Fede…): los gastos compartidos generan cuenta corriente. Al final del mes queda un
  neto por persona, solo de ese mes: lo de meses anteriores no se arrastra (salvo `cfg.arrastrarPersonas`). Las claves `per|Nombre` en `cfg.aplicados` y `cfg.ajustes` no cuelgan de ningún movimiento: no limpiarlas.
- **Ajustes puntuales** (`cfg.ajustes[mes][id]`) y **aplicados** (`cfg.aplicados[mes][id]`): marcar algo como pagado
  o cobrado mueve la caja una sola vez y se puede revertir.
- **Préstamos** pueden ajustar por `fija`, `inflacion` o `sueldo` (`mv.ajustaPor`).
- **Anotador de gastos** (pestaña "Gastos", `cfg.anotador`): libreta del día a día por fecha de compra.
  Es independiente: no toca `movs` ni la proyección. La lista completa del flujo (Movimientos) se abre desde ahí.
- **Saldo vivo**: anotar un gasto en efectivo/débito baja `saldoHoy` en el momento (`restoCaja` guarda cuánto, para revertir).
  "Ajustar con el banco" pone el saldo real y la diferencia queda como "Gastos sin anotar" (`sinAnotar`).
- **Liquidar** (`liquidarAnotador`): pasa gastos del anotador a `movs` (efectivo como ya pagado: ajuste 0 + aplicado 0;
  tarjeta a su resumen; compartidos con persona). El gasto queda con `mov` y no se puede volver a liquidar ni editar desde el anotador.
- **Panel del sueldo** (`PanelSueldo` en Hoy): libre para gastar = saldo − falta pagar + falta cobrar, por día hasta el fin del período,
  con la regla de vencimientos.
- **Paquetes de cambios** (`aplicarCambiosPaquete`, Ajustes → "Aplicar un paquete de cambios"): JSON
  `{id, titulo, origen, cambios: [{op, …, motivo}]}` con ops editar/terminar/borrar/agregar/ciclo/resumen/ajuste/anotar.
  Cada cambio queda en `cfg.registro` y el id en `cfg.paquetes` (no se aplica dos veces). `anotar` suma un gasto al anotador
  sin duplicar (mismo id, o misma fecha + monto + nombre) y solo baja `saldoHoy` si la fecha es posterior a `cfg.ultimoAjuste`.
- **Importar resumen** (`aplicarResumenImportado`, `planGastosResumen`): sirve también para resúmenes viejos, ya vencidos y pagados
  (no cambian el saldo). Si ya hay un resumen más nuevo de esa tarjeta, no se pisan las fechas siguientes ni tasa/deuda.
  Las compras nuevas del ciclo (cuota 1, sin impuestos) se cruzan con Gastos: lo anotado queda vinculado (`mov`) y le pasa
  persona/categoría al movimiento; lo no anotado se suma a Gastos ya en el flujo. En Gastos, lo que está en el flujo muestra la categoría del movimiento.
- **Mercado Pago** (`api/mp.js`, función de Vercel, solo lectura): sugiere en Gastos los pagos hechos desde la cuenta.
  La clave va en Vercel (`MP_ACCESS_TOKEN`) y solo responde al dueño (`MP_OWNER_UID`); nunca en el código ni en el chat.
  `sugerenciasMP` no repite lo ya anotado ni lo descartado (`cfg.mpVistos`).
- **Meta de ahorro** (`cfg.meta`, `estadoMeta`): lee `reservasUsd` y las compras de dólares programadas (`tipo: "ahorro"`); no cambia la proyección.
- **Presupuestos** (`cfg.presupuestos = [{k: "cat:…" | "txt:…", monto}]`): topes por sueldo sobre lo anotado en Gastos (solo la parte propia).
- **Escenarios** (`cfg.escenarios`) son una capa ficticia: nunca tocan los movimientos reales.

## Reglas de trabajo
- Trabajar siempre en una rama y abrir PR. Nunca push directo a `main`: es la app que se usa todos los días.
- Antes de entregar: el build tiene que pasar y hay que probar el motor (`proyectar`) contra un backup real
  si hay uno disponible. Comparar los meses antes y después del cambio.
- Cambios de datos guardados: siempre con migración al cargar (la sección de limpieza del `useEffect` de carga),
  sin perder datos y sin tocar `saldoHoy` salvo para revertir efectos huérfanos.
- No meter datos personales en el código (montos, nombres, fechas de tarjetas de Bautista).
- Si se entrega un archivo, entregarlo completo y no fragmentos.

## Pendientes / ideas
- Pantalla para poner contraseña nueva desde "Me olvidé la contraseña" (manejar el evento `PASSWORD_RECOVERY`).
- Vista "por fecha de compra" en Movs (además de la de mes de pago).
- Separar `App.jsx` en módulos (motor / componentes) y sumar tests del motor.
- Evitar que Supabase pause el proyecto por inactividad.
