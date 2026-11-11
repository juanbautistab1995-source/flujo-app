-- Comprobantes (Mercado Pago / MODO): el atajo manda el texto leído de la captura, que es más largo que un gasto dictado.
-- Correr UNA vez en Supabase: SQL Editor → New query → pegar todo → Run.
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
  insert into bandeja(user_id, texto) values (uid, left(p_texto, 1500));
  return 'Anotado: ' || left(regexp_replace(p_texto, '\s+', ' ', 'g'), 80);
end;
$$;
revoke all on function public.anotar_por_atajo(text, text) from public;
grant execute on function public.anotar_por_atajo(text, text) to anon, authenticated;
