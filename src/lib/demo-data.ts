import type { PlannedWorkout, ProgressPoint } from "@/types/domain"

const exerciseVideos: Record<string, string> = {
  "10000000-0000-4000-8000-000000000001": "https://www.youtube.com/watch?v=jY0Z6Im2gmU",
  "10000000-0000-4000-8000-000000000002": "https://www.youtube.com/watch?v=Fye7SqiYSg8",
  "10000000-0000-4000-8000-000000000003": "https://www.youtube.com/watch?v=Pkr1WW3p05A",
  "10000000-0000-4000-8000-000000000004": "https://www.youtube.com/watch?v=liO3LuRvC10",
  "10000000-0000-4000-8000-000000000005": "https://www.youtube.com/watch?v=bTqxQNOxhXE",
  "10000000-0000-4000-8000-000000000006": "https://www.youtube.com/watch?v=dT6Q3NHtSjw",
  "10000000-0000-4000-8000-000000000007": "https://www.youtube.com/watch?v=mPvlpDWIoDA",
  "10000000-0000-4000-8000-000000000008": "https://www.youtube.com/watch?v=gU-bdqfhu7Y",
  "10000000-0000-4000-8000-000000000009": "https://www.youtube.com/watch?v=AYJ8VDCS1mU",
  "10000000-0000-4000-8000-000000000010": "https://www.youtube.com/watch?v=9j_L1KgpK8Y",
  "10000000-0000-4000-8000-000000000011": "https://www.youtube.com/watch?v=IE3ZJezh-wc",
  "10000000-0000-4000-8000-000000000012": "https://www.youtube.com/watch?v=ETnhBWeWK74",
  "10000000-0000-4000-8000-000000000013": "https://www.youtube.com/watch?v=1BL4681pIz4",
  "10000000-0000-4000-8000-000000000014": "https://www.youtube.com/watch?v=bxn9FBrt4-A",
  "10000000-0000-4000-8000-000000000015": "https://www.youtube.com/watch?v=u-gR9oyOcT4",
  "10000000-0000-4000-8000-000000000016": "https://www.youtube.com/watch?v=GA9651iQJuM",
  "10000000-0000-4000-8000-000000000017": "https://www.youtube.com/watch?v=8hQ-mB5G0EE",
  "10000000-0000-4000-8000-000000000018": "https://www.youtube.com/watch?v=_U9gStEINYE",
  "10000000-0000-4000-8000-000000000019": "https://www.youtube.com/watch?v=x2YrPIlFDdo",
  "10000000-0000-4000-8000-000000000020": "https://www.youtube.com/watch?v=50-D8qzUMxg",
  "10000000-0000-4000-8000-000000000021": "https://www.youtube.com/watch?v=JsIUL2ZK1eM",
}

const exercise = (
  id: string,
  name: string,
  sets: number,
  repMin: number,
  repMax: number,
  targetRir: number,
  restSeconds: number,
  cue: string,
) => ({ id, name, sets, repMin, repMax, targetRir, restSeconds, cue, videoUrl: exerciseVideos[id] })

export const upperA: PlannedWorkout = {
  id: "upper-a",
  name: "Upper A",
  subtitle: "Base de fuerza del torso",
  week: 1,
  targetRir: "RIR 3",
  durationMinutes: 70,
  exercises: [
    exercise("10000000-0000-4000-8000-000000000001", "Press banca con mancuernas", 4, 8, 10, 3, 120, "Escápulas estables y pies firmes"),
    exercise("10000000-0000-4000-8000-000000000002", "Press inclinado con mancuernas", 3, 8, 12, 3, 90, "Banco a 20–35°"),
    exercise("10000000-0000-4000-8000-000000000003", "Remo a una mano", 4, 8, 12, 3, 90, "Codo hacia la cadera"),
    exercise("10000000-0000-4000-8000-000000000004", "Pullover con mancuerna", 2, 10, 15, 2, 75, "Costillas controladas"),
    exercise("10000000-0000-4000-8000-000000000005", "Press militar sentado", 3, 8, 10, 2, 90, "Abdomen activo"),
    exercise("10000000-0000-4000-8000-000000000006", "Elevación lateral", 3, 12, 20, 2, 60, "Sin impulso"),
    exercise("10000000-0000-4000-8000-000000000007", "Curl martillo", 2, 10, 15, 2, 60, "Codos quietos"),
    exercise("10000000-0000-4000-8000-000000000008", "Press francés", 2, 10, 15, 2, 60, "Control en la bajada"),
  ],
}

export const lower: PlannedWorkout = {
  id: "lower",
  name: "Lower",
  subtitle: "Piernas fuertes sin interferir con el cardio",
  week: 1,
  targetRir: "RIR 3",
  durationMinutes: 65,
  exercises: [
    exercise("10000000-0000-4000-8000-000000000009", "Sentadilla goblet", 4, 8, 12, 3, 120, "Rodillas siguen la línea de los pies"),
    exercise("10000000-0000-4000-8000-000000000010", "Peso muerto rumano", 4, 8, 12, 3, 120, "Cadera atrás y espalda neutra"),
    exercise("10000000-0000-4000-8000-000000000011", "Búlgara", 3, 8, 12, 2, 90, "Controla la bajada"),
    exercise("10000000-0000-4000-8000-000000000012", "Hip thrust con mancuerna", 3, 10, 15, 2, 90, "Pausa un segundo arriba"),
    exercise("10000000-0000-4000-8000-000000000013", "Gemelo de pie", 4, 12, 20, 2, 60, "Pausa arriba y estira abajo"),
    exercise("10000000-0000-4000-8000-000000000014", "Dead bug", 3, 8, 12, 3, 45, "Zona lumbar estable"),
  ],
}

export const upperB: PlannedWorkout = {
  id: "upper-b",
  name: "Upper B",
  subtitle: "Espalda, hombro y pecho superior",
  week: 1,
  targetRir: "RIR 3",
  durationMinutes: 75,
  exercises: [
    exercise("10000000-0000-4000-8000-000000000002", "Press inclinado con mancuernas", 4, 8, 10, 3, 120, "Prioridad pecho superior"),
    exercise("10000000-0000-4000-8000-000000000015", "Apertura con mancuernas", 2, 12, 15, 2, 60, "Recorrido cómodo"),
    exercise("10000000-0000-4000-8000-000000000016", "Remo inclinado con mancuernas", 4, 8, 12, 3, 120, "Tronco firme"),
    exercise("10000000-0000-4000-8000-000000000017", "Remo apoyado en banco", 3, 10, 15, 2, 75, "Pausa arriba"),
    exercise("10000000-0000-4000-8000-000000000006", "Elevación lateral", 4, 12, 20, 2, 60, "Tensión continua"),
    exercise("10000000-0000-4000-8000-000000000018", "Pájaros en banco inclinado", 3, 12, 20, 2, 60, "Evita tirar con el trapecio"),
    exercise("10000000-0000-4000-8000-000000000019", "Y-raise inclinado", 2, 12, 15, 3, 45, "Muy ligero"),
    exercise("10000000-0000-4000-8000-000000000020", "Curl alterno", 3, 10, 15, 2, 60, "No muevas el hombro"),
    exercise("10000000-0000-4000-8000-000000000021", "Extensión de tríceps sobre cabeza", 3, 10, 15, 2, 60, "Costillas abajo"),
  ],
}

export const workouts = [upperA, lower, upperB]

export const weeklySchedule = [
  { day: "Lun", title: "Upper A", kind: "Fuerza", done: true },
  { day: "Mar", title: "Pádel", kind: "Cardio", done: true },
  { day: "Mié", title: "Lower", kind: "Fuerza", done: false },
  { day: "Jue", title: "Z2 suave", kind: "Cardio", done: false },
  { day: "Vie", title: "Upper B", kind: "Fuerza", done: false },
  { day: "Sáb", title: "Largo suave", kind: "Cardio", done: false },
  { day: "Dom", title: "Control", kind: "Check-in", done: false },
]

export const progressData: ProgressPoint[] = [
  { label: "S0", weight: 76.2, waist: 86, volume: 0 },
  { label: "S2", weight: 75.8, waist: 85.3, volume: 8120 },
  { label: "S4", weight: 75.4, waist: 84.7, volume: 8460 },
  { label: "S6", weight: 75.1, waist: 84.1, volume: 9010 },
  { label: "S8", weight: 74.9, waist: 83.8, volume: 9250 },
]

export const progression = [
  [1, "Entrada", "RIR 3", "Mitad-baja del rango"],
  [2, "Acumular", "RIR 2–3", "+1 rep por serie"],
  [3, "Cerrar rango", "RIR 2", "Completar el rango"],
  [4, "Descarga", "RIR 4", "60 % de las series"],
  [5, "Reentrada", "RIR 2", "Carga de semana 3"],
  [6, "Construcción", "RIR 1–2", "+1 rep por serie"],
  [7, "Sobrecarga", "RIR 1", "Cerrar rango o subir"],
  [8, "Descarga", "RIR 4", "60–65 % de las series"],
  [9, "Reentrada", "RIR 2", "Carga de semana 7"],
  [10, "Intensificar", "RIR 1–2", "+1 rep por serie"],
  [11, "Pico", "RIR 1", "Mejor marca técnica"],
  [12, "Evaluar", "RIR 3", "AMRAP segura y medidas"],
] as const
