import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'

interface AuthTemplateProps {
  children: React.ReactNode
  title: string
  description: string
}

export function AuthTemplate({ children, title, description }: AuthTemplateProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <Link to="/login" className="flex items-center gap-2 text-primary-foreground">
          <Wallet className="size-6" />
          <span className="text-xl font-semibold">Home Finances</span>
        </Link>

        <div className="space-y-4">
          <blockquote className="text-3xl font-medium leading-snug">
            "Organize suas finanças,
            <br />
            alcance seus objetivos."
          </blockquote>
          <p className="text-primary-foreground/70 text-base">
            Controle entradas, saídas, economias e contas a pagar — tudo em um só lugar,
            compartilhado com quem mora com você.
          </p>
        </div>

        <p className="text-primary-foreground/50 text-sm">
          © {new Date().getFullYear()} Home Finances
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link to="/login" className="mb-8 flex items-center gap-2 text-foreground lg:hidden">
          <Wallet className="size-5" />
          <span className="text-lg font-semibold">Home Finances</span>
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
