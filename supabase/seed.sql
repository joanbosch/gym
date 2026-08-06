insert into public.exercises (id, name, muscle_group, equipment, instructions, is_global)
select ('10000000-0000-4000-8000-' || lpad(row_number() over ()::text, 12, '0'))::uuid, seed.* from (values
('Press banca con mancuernas','Pecho','Mancuernas + banco','Escápulas estables; pies firmes',true),
('Press inclinado con mancuernas','Pecho','Mancuernas + banco','Banco 20–35°; no encoger hombros',true),
('Remo a una mano','Espalda','Mancuerna + banco','Codo hacia la cadera',true),
('Pullover con mancuerna','Espalda','Mancuerna + banco','Costillas controladas',true),
('Press militar sentado','Hombros','Mancuernas + banco','Glúteos y abdomen activos',true),
('Elevación lateral','Hombros','Mancuernas','Sin impulso; hombros bajos',true),
('Curl martillo','Bíceps','Mancuernas','Codos quietos',true),
('Press francés','Tríceps','Mancuerna','Brazo vertical; control abajo',true),
('Sentadilla goblet','Piernas','Mancuerna','Rodillas siguen la línea de los pies',true),
('Peso muerto rumano','Isquios','Mancuernas','Cadera atrás; espalda neutra',true),
('Búlgara','Piernas','Mancuernas + banco','Paso estable; controla la bajada',true),
('Hip thrust con mancuerna','Glúteos','Mancuerna + banco','Pausa 1 s arriba',true),
('Gemelo de pie','Gemelos','Mancuerna','Pausa arriba y estiramiento abajo',true),
('Dead bug','Core','Peso corporal','Zona lumbar estable',true),
('Apertura con mancuernas','Pecho','Mancuernas + banco','Recorrido cómodo; codos suaves',true),
('Remo inclinado con mancuernas','Espalda','Mancuernas','Tronco firme; tira con la espalda',true),
('Remo apoyado en banco','Espalda','Mancuernas + banco','Pausa corta arriba',true),
('Pájaros en banco inclinado','Hombro posterior','Mancuernas + banco','Deltoide posterior, no trapecio',true),
('Y-raise inclinado','Estabilidad escapular','Mancuernas + banco','Muy ligero; control escapular',true),
('Curl alterno','Bíceps','Mancuernas','Supina sin mover el hombro',true),
('Extensión de tríceps sobre cabeza','Tríceps','Mancuerna','Costillas abajo',true)
) as seed(name,muscle_group,equipment,instructions,is_global)
on conflict (owner_id,name) do update set instructions=excluded.instructions, active=true;

update public.exercises as exercise
set video_url = videos.video_url
from (values
  ('Press banca con mancuernas', 'https://www.youtube.com/watch?v=jY0Z6Im2gmU'),
  ('Press inclinado con mancuernas', 'https://www.youtube.com/watch?v=Fye7SqiYSg8'),
  ('Remo a una mano', 'https://www.youtube.com/watch?v=Pkr1WW3p05A'),
  ('Pullover con mancuerna', 'https://www.youtube.com/watch?v=liO3LuRvC10'),
  ('Press militar sentado', 'https://www.youtube.com/watch?v=bTqxQNOxhXE'),
  ('Elevación lateral', 'https://www.youtube.com/watch?v=dT6Q3NHtSjw'),
  ('Curl martillo', 'https://www.youtube.com/watch?v=mPvlpDWIoDA'),
  ('Press francés', 'https://www.youtube.com/watch?v=gU-bdqfhu7Y'),
  ('Sentadilla goblet', 'https://www.youtube.com/watch?v=AYJ8VDCS1mU'),
  ('Peso muerto rumano', 'https://www.youtube.com/watch?v=9j_L1KgpK8Y'),
  ('Búlgara', 'https://www.youtube.com/watch?v=IE3ZJezh-wc'),
  ('Hip thrust con mancuerna', 'https://www.youtube.com/watch?v=ETnhBWeWK74'),
  ('Gemelo de pie', 'https://www.youtube.com/watch?v=1BL4681pIz4'),
  ('Dead bug', 'https://www.youtube.com/watch?v=bxn9FBrt4-A'),
  ('Apertura con mancuernas', 'https://www.youtube.com/watch?v=u-gR9oyOcT4'),
  ('Remo inclinado con mancuernas', 'https://www.youtube.com/watch?v=GA9651iQJuM'),
  ('Remo apoyado en banco', 'https://www.youtube.com/watch?v=8hQ-mB5G0EE'),
  ('Pájaros en banco inclinado', 'https://www.youtube.com/watch?v=_U9gStEINYE'),
  ('Y-raise inclinado', 'https://www.youtube.com/watch?v=x2YrPIlFDdo'),
  ('Curl alterno', 'https://www.youtube.com/watch?v=50-D8qzUMxg'),
  ('Extensión de tríceps sobre cabeza', 'https://www.youtube.com/watch?v=JsIUL2ZK1eM')
) as videos(name, video_url)
where exercise.name = videos.name;

create or replace function public.seed_joan_program(seed_owner uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  p_id uuid; r_id uuid; week_id uuid; workout_id uuid; w integer; i integer; session jsonb; item jsonb;
  sessions jsonb := '[
    {"name":"Upper A","day":1,"duration":70,"kind":"strength","items":[["Press banca con mancuernas",4,8,10,3,120],["Press inclinado con mancuernas",3,8,12,3,90],["Remo a una mano",4,8,12,3,90],["Pullover con mancuerna",2,10,15,2,75],["Press militar sentado",3,8,10,2,90],["Elevación lateral",3,12,20,2,60],["Curl martillo",2,10,15,2,60],["Press francés",2,10,15,2,60]]},
    {"name":"Pádel o cardio moderado","day":2,"duration":75,"kind":"cardio","items":[]},
    {"name":"Lower","day":3,"duration":65,"kind":"strength","items":[["Sentadilla goblet",4,8,12,3,120],["Peso muerto rumano",4,8,12,3,120],["Búlgara",3,8,12,2,90],["Hip thrust con mancuerna",3,10,15,2,90],["Gemelo de pie",4,12,20,2,60],["Dead bug",3,8,12,3,45]]},
    {"name":"Z2 suave","day":4,"duration":55,"kind":"cardio","items":[]},
    {"name":"Upper B","day":5,"duration":75,"kind":"strength","items":[["Press inclinado con mancuernas",4,8,10,3,120],["Apertura con mancuernas",2,12,15,2,60],["Remo inclinado con mancuernas",4,8,12,3,120],["Remo apoyado en banco",3,10,15,2,75],["Elevación lateral",4,12,20,2,60],["Pájaros en banco inclinado",3,12,20,2,60],["Y-raise inclinado",2,12,15,3,45],["Curl alterno",3,10,15,2,60],["Extensión de tríceps sobre cabeza",3,10,15,2,60]]},
    {"name":"Cardio largo suave","day":6,"duration":70,"kind":"cardio","items":[]},
    {"name":"Descanso y control","day":7,"duration":15,"kind":"checkin","items":[]}
  ]'::jsonb;
begin
  if not exists(select 1 from public.profiles where id=seed_owner and role in ('coach','admin')) then raise exception 'seed owner must be a coach or admin'; end if;
  select id into p_id from public.programs where owner_id=seed_owner and name='Plan híbrido de fuerza y cardio';
  if p_id is not null then return p_id; end if;
  insert into public.programs(owner_id,name,description,duration_weeks,status) values(seed_owner,'Plan híbrido de fuerza y cardio','Más espalda, hombros y pecho superior; piernas fuertes sin comprometer el cardio.',12,'published') returning id into p_id;
  insert into public.program_revisions(program_id,revision_number,status,change_summary,published_at,created_by) values(p_id,1,'published','Versión inicial del documento de Joan',now(),seed_owner) returning id into r_id;
  for w in 1..12 loop
    insert into public.program_weeks(revision_id,week_number,name,focus,target_rir,is_deload) values(
      r_id,w,
      case when w in (4,8) then 'Descarga' when w=12 then 'Evaluación' when w<=4 then 'Base' when w<=8 then 'Construcción' else 'Consolidación' end,
      case when w in (4,8) then 'Reducir series y cardio un 20–30 %' when w=12 then 'AMRAP segura, fotos y medidas' when w in (3,7,11) then 'Cerrar rangos sin romper técnica' else 'Acumular repeticiones limpias' end,
      case when w in (4,8) then 'RIR 4' when w=12 then 'RIR 3' when w in (7,11) then 'RIR 1' when w in (6,10) then 'RIR 1–2' else 'RIR 2–3' end,
      w in (4,8)) returning id into week_id;
    for session in select value from jsonb_array_elements(sessions) loop
      insert into public.workout_templates(revision_id,week_id,name,description,kind,weekday,duration_minutes,sort_order) values(
        r_id,week_id,session->>'name',case when session->>'kind'='strength' then 'Sesión principal del plan' else 'Cardio compatible con recuperación' end,(session->>'kind')::public.session_kind,(session->>'day')::smallint,(session->>'duration')::smallint,(session->>'day')::smallint) returning id into workout_id;
      i := 0;
      for item in select value from jsonb_array_elements(session->'items') loop
        i := i + 1;
        insert into public.workout_exercises(workout_template_id,exercise_id,sort_order,sets,rep_min,rep_max,target_rir,rest_seconds,technical_cue)
        select workout_id,e.id,i,(item->>1)::smallint,(item->>2)::smallint,(item->>3)::smallint,(item->>4)::smallint,(item->>5)::smallint,e.instructions
        from public.exercises e where e.name=item->>0 and e.is_global limit 1;
      end loop;
    end loop;
  end loop;
  return p_id;
end $$;

do $$ declare owner_id uuid; begin
  select id into owner_id from public.profiles where role in ('coach','admin') order by created_at limit 1;
  if owner_id is not null then perform public.seed_joan_program(owner_id); end if;
end $$;
