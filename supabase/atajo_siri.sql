-- Atajo de iPhone / Siri para anotar gastos.
-- Correr UNA vez en Supabase: SQL Editor → New query → pegar todo → Run.

-- 1) Bandeja: los textos que manda el atajo, hasta que la app los levanta
create table if not exists public.bandeja (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  creado timestamptz not null default now(),
  texto text not null
);
alter table public.bandeja enable row level security;
drop policy if exists "bandeja: leer lo mio" on public.bandeja;
drop policy if exists "bandeja: borrar lo mio" on public.bandeja;
create policy "bandeja: leer lo mio" on public.bandeja for select using (auth.uid() = user_id);
create policy "bandeja: borrar lo mio" on public.bandeja for delete using (auth.uid() = user_id);

-- 2) Claves personales del atajo (una por persona o por teléfono)
create table if not exists public.atajos (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  creado timestamptz not null default now()
);
alter table public.atajos enable row level security;
drop policy if exists "atajos: ver los mios" on public.atajos;
drop policy if exists "atajos: crear los mios" on public.atajos;
drop policy if exists "atajos: borrar los mios" on public.atajos;
create policy "atajos: ver los mios" on public.atajos for select using (auth.uid() = user_id);
create policy "atajos: crear los mios" on public.atajos for insert with check (auth.uid() = user_id);
create policy "atajos: borrar los mios" on public.atajos for delete using (auth.uid() = user_id);

-- 3) Lo que llama el atajo: valida la clave y deja el texto en la bandeja
create or replace function public.anotar_por_atajo(p_token text, p_texto text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  select user_id into uid from atajos where token = p_token;
  if uid is null then
    return 'No anoté nada: la clave del atajo no es válida.';
  end if;
  if p_texto is null or p_texto !~ '[0-9]' then
    return 'No anoté nada: falta el monto. Ejemplo: "café 4500 efectivo".';
  end if;
  insert into bandeja(user_id, texto) values (uid, left(p_texto, 300));
  return 'Anotado: ' || left(p_texto, 80);
end;
$$;
revoke all on function public.anotar_por_atajo(text, text) from public;
grant execute on function public.anotar_por_atajo(text, text) to anon, authenticated;
