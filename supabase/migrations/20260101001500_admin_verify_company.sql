-- Admins verify or un-verify a company. The table stays read-only for everyone through the API; this function is the
-- only write path, it checks the role itself, and the note is required when verifying so every badge has a reason.
create function public.admin_set_company_verified(p_company uuid, p_verified boolean, p_note text default null)
returns public.companies
language plpgsql security definer set search_path = public as $$
declare
  c public.companies;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  if p_verified and (p_note is null or char_length(btrim(p_note)) < 5) then
    raise exception 'a note of at least 5 characters is required to verify' using errcode = '22023';
  end if;
  update public.companies
     set verified = p_verified,
         verified_at = case when p_verified then now() else null end,
         verification_note = case when p_verified then btrim(p_note) else null end
   where id = p_company
   returning * into c;
  if not found then
    raise exception 'company not found' using errcode = 'P0002';
  end if;
  return c;
end;
$$;
revoke all on function public.admin_set_company_verified(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_company_verified(uuid, boolean, text) to authenticated;
