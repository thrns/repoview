-- New share links use a nine-character case-sensitive alphanumeric
-- capability. Historical eight-character codes (including '-' and '_') stay
-- valid so existing /s/<token> links and their redirected viewer URLs remain
-- usable.

alter table public.shares
  alter column share_code type varchar(9);

alter table public.shares
  drop constraint if exists shares_share_code_format;

create or replace function public.generate_share_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  random_byte integer;
  index_value integer;
begin
  for index_value in 1..9 loop
    loop
      random_byte := get_byte(gen_random_bytes(1), 0);
      exit when random_byte < 248;
    end loop;
    result := result || substr(alphabet, (random_byte % 62) + 1, 1);
  end loop;
  return result;
end;
$$;

alter table public.shares
  alter column share_code set default public.generate_share_code();

alter table public.shares
  add constraint shares_share_code_format
  check (
    share_code ~ '^[A-Za-z0-9]{9}$'
    or share_code ~ '^[A-Za-z0-9_-]{8}$'
  );

create unique index if not exists shares_share_code_idx on public.shares(share_code);
