alter table public.exercises
  add column if not exists video_url text
  check (video_url is null or video_url ~ '^https://');

comment on column public.exercises.video_url is
  'Public technique demonstration URL shown to athletes.';

update public.exercises as exercise
set video_url = videos.video_url
from (values
  ('Press banca con mancuernas', 'https://www.youtube.com/watch?v=jY0Z6Im2gmU'),
  ('Press inclinado con mancuernas', 'https://www.youtube.com/watch?v=Fye7SqiYSg8'),
  ('Remo a una mano', 'https://www.youtube.com/watch?v=RmAK-WA1H4E'),
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
