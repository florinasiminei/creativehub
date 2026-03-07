insert into public.facilities (name)
select v.name
from (
  values
    ('Child friendly'),
    ('Gradina'),
    ('Vedere la munte'),
    ('Zona de relaxare')
) as v(name)
where not exists (
  select 1
  from public.facilities f
  where lower(f.name) = lower(v.name)
);
