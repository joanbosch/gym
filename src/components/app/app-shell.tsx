"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ActivityIcon,
  AppleIcon,
  BellIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  DumbbellIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  RulerIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import { logout } from "@/actions/auth"
import { ActiveWorkoutBanner } from "@/components/workout/active-workout-banner"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { ActiveWorkoutSession, AppRole, Profile } from "@/types/domain"

const athleteItems = [
  ["/hoy", "Hoy", LayoutDashboardIcon],
  ["/calendario", "Calendario", CalendarDaysIcon],
  ["/entrenamiento", "Entrenamiento", DumbbellIcon],
  ["/medidas", "Medidas", RulerIcon],
  ["/rendimiento", "KPIs", GaugeIcon],
  ["/progreso", "Progreso", ChartNoAxesCombinedIcon],
  ["/nutricion", "Nutrición", AppleIcon],
] as const

const mobileItems = athleteItems.filter(([href]) => href !== "/rendimiento" && href !== "/progreso")

const roleItems: Record<AppRole, typeof athleteItems | ReadonlyArray<readonly [string, string, typeof ActivityIcon]>> = {
  athlete: athleteItems,
  coach: [
    ["/hoy", "Resumen", LayoutDashboardIcon],
    ["/atletas", "Atletas", UsersIcon],
    ["/planes", "Programas", ClipboardListIcon],
    ["/progreso", "Analítica", ChartNoAxesCombinedIcon],
  ],
  admin: [
    ["/hoy", "Resumen", LayoutDashboardIcon],
    ["/entrenamiento", "Entrenamiento", DumbbellIcon],
    ["/medidas", "Medidas", RulerIcon],
    ["/rendimiento", "KPIs", GaugeIcon],
    ["/progreso", "Progreso", ChartNoAxesCombinedIcon],
    ["/nutricion", "Nutrición", AppleIcon],
    ["/administracion", "Administración", ShieldCheckIcon],
    ["/atletas", "Relaciones", UsersIcon],
    ["/planes", "Programas", ClipboardListIcon],
  ],
}

const roleLabel = { athlete: "Atleta", coach: "Entrenador", admin: "Administrador" }

export function AppShell({ profile, activeWorkout, children }: { profile: Profile; activeWorkout: ActiveWorkoutSession | null; children: React.ReactNode }) {
  const pathname = usePathname()
  const items = roleItems[profile.role]
  const initials = profile.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <DumbbellIcon aria-hidden="true" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-semibold">Gym Joan</p>
              <p className="truncate text-xs text-muted-foreground">Mejora medible</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(([href, label, Icon]) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={pathname === href} tooltip={label}>
                      <Link href={href}><Icon aria-hidden="true" /><span>{label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/notificaciones"} tooltip="Notificaciones">
                    <Link href="/notificaciones"><BellIcon aria-hidden="true" /><span>Notificaciones</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/seguridad"} tooltip="Seguridad">
                    <Link href="/seguridad"><ShieldCheckIcon aria-hidden="true" /><span>Seguridad</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{profile.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel[profile.role]}</p>
            </div>
            <form action={logout} className="group-data-[collapsible=icon]:hidden">
              <Button type="submit" variant="ghost" size="icon-sm" aria-label="Cerrar sesión"><LogOutIcon aria-hidden="true" /></Button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="truncate text-sm font-medium">Plan híbrido · 12 semanas</p>
            <Badge variant="secondary">Semana 1</Badge>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 pb-24 md:p-6 md:pb-8"><ActiveWorkoutBanner initialRemote={activeWorkout} />{children}</main>
        <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t bg-background md:hidden" aria-label="Navegación móvil">
          <div className="grid grid-cols-5">
            {mobileItems.map(([href, label, Icon]) => (
              <Link key={href} href={href} className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-xs text-muted-foreground aria-[current=page]:text-primary" aria-current={pathname === href ? "page" : undefined}>
                <Icon className="size-5" aria-hidden="true" /><span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </SidebarInset>
    </SidebarProvider>
  )
}
