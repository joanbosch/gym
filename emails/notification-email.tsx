import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "react-email"
import tailwindConfig from "./tailwind.config"

export interface NotificationEmailProps {
  preview: string
  title: string
  greeting: string
  message: string
  actionLabel: string
  actionUrl: string
}

export function NotificationEmail({ preview, title, greeting, message, actionLabel, actionUrl }: NotificationEmailProps) {
  return (
    <Html lang="es" dir="ltr">
      <Tailwind config={tailwindConfig}>
        <Head><title>{`${title} · Gym Joan`}</title></Head>
        <Body className="bg-canvas py-8 font-sans">
          <Preview>{preview}</Preview>
          <Container lang="es" dir="ltr" className="mx-auto rounded bg-surface p-7">
            <Section>
              <Text className="m-0 text-base font-bold text-brand">GYM JOAN</Text>
              <Heading as="h1" className="mb-4 mt-6 text-2xl font-bold text-ink">{title}</Heading>
              <Text className="mb-3 text-base leading-6 text-ink">{greeting}</Text>
              <Text className="mb-6 text-base leading-6 text-ink">{message}</Text>
              <Button href={actionUrl} className="box-border block rounded bg-brand px-5 py-3 text-center font-medium text-white no-underline">{actionLabel}</Button>
              <Hr className="my-7 border-solid border-gray-200" />
              <Text className="m-0 text-sm leading-5 text-muted">Este correo contiene la información mínima necesaria. Tus datos físicos y fotografías solo están disponibles dentro del área privada.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

NotificationEmail.PreviewProps = {
  preview: "Tienes una novedad en Gym Joan",
  title: "Tu plan ya está preparado",
  greeting: "Hola, Joan:",
  message: "Tu entrenador ha publicado una nueva revisión del plan.",
  actionLabel: "Consultar mi plan",
  actionUrl: "https://gym.joanbosch.dev/hoy",
} satisfies NotificationEmailProps

export default NotificationEmail
