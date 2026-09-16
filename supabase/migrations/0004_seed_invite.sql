-- Código de convite inicial para os 5 membros da família.
-- Gere um novo a qualquer momento com:
--   insert into public.invite_codes (code, note, max_uses) values ('NOVOCODIGO', 'motivo', 5);
insert into public.invite_codes (code, note, max_uses)
values ('FAMILIA2026', 'Convite inicial da família', 5)
on conflict (code) do nothing;
