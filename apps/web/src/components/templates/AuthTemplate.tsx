import { Link } from '@tanstack/react-router'
import { LarmonyLogo } from '@/components/atoms/Logo'

interface AuthTemplateProps {
  children: React.ReactNode
  title: string
  description: string
}

export function AuthTemplate({ children, title, description }: AuthTemplateProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary/10 border-r border-border p-12">
        <Link to="/login">
          <LarmonyLogo variant="full" onDarkBg />
        </Link>

        <div className="space-y-4">
          <blockquote className="text-3xl font-medium leading-snug text-foreground">
            "Planejamento financeiro
            <br />
            em harmonia com o seu lar."
          </blockquote>
          <p className="text-muted-foreground text-base">
            Controle entradas, saídas, economias e contas a pagar — tudo em um só lugar,
            compartilhado com quem mora com você.
          </p>
        </div>

        <p className="text-muted-foreground/50 text-sm">
          © {new Date().getFullYear()} Larmony
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link to="/login" className="mb-8 lg:hidden">
          <LarmonyLogo variant="icon" size="md" />
        </Link>

        <div className="w-full max-w-md space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="mt-8 w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
