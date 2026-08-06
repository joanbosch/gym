import { NotificationEmail, type NotificationEmailProps } from "../../../emails/notification-email"

type Payload = Record<string, unknown>

export function getEmailTemplate(template: string, payload: Payload): NotificationEmailProps {
  const name = typeof payload.name === "string" ? payload.name : ""
  const actionUrl = typeof payload.actionUrl === "string" ? payload.actionUrl : "https://gym.joanbosch.dev/hoy"
  const greeting = `Hola${name ? `, ${name}` : ""}:`
  const templates: Record<string, Omit<NotificationEmailProps, "greeting" | "actionUrl">> = {
    account_activation: { preview: "Activa tu acceso privado a Gym Joan", title: "Activa tu cuenta", message: "El administrador ha preparado tu acceso. Define tu contraseña desde el enlace seguro.", actionLabel: "Activar mi cuenta" },
    password_reset: { preview: "Restablece tu contraseña de Gym Joan", title: "Restablece tu contraseña", message: "Se ha solicitado una nueva contraseña. El enlace caduca en 30 minutos y solo puede utilizarse una vez.", actionLabel: "Crear nueva contraseña" },
    email_verification: { preview: "Verifica tu email de Gym Joan", title: "Verifica tu email", message: "Confirma que esta dirección de correo te pertenece para poder acceder de forma segura.", actionLabel: "Verificar mi email" },
    program_assigned: { preview: "Tu entrenador te ha asignado un plan", title: "Tu plan ya está preparado", message: "Ya puedes consultar el calendario, los objetivos y tu próxima sesión.", actionLabel: "Consultar mi plan" },
    program_revised: { preview: "Hay ajustes futuros en tu plan", title: "Tu plan se ha actualizado", message: "Tu entrenador ha publicado una revisión. Las sesiones ya realizadas conservan sus datos originales.", actionLabel: "Ver los cambios" },
    coach_comment: { preview: "Tienes un comentario de tu entrenador", title: "Nuevo comentario", message: "Tienes una observación nueva dentro de tu área privada.", actionLabel: "Leer el comentario" },
    weekly_reminder: { preview: "Tu revisión semanal está pendiente", title: "Cierra bien la semana", message: "Registra peso medio, cintura, sueño y sensaciones para tomar decisiones con datos.", actionLabel: "Completar el check-in" },
  }
  const selected = templates[template] ?? templates.coach_comment
  return { ...selected, greeting, actionUrl }
}

export { NotificationEmail }
