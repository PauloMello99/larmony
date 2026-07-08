"use client"

import * as React from "react"
import { Input } from "@/shared/components/ui/input"
import { formatCentsToBRL, parseBRLInputToCents } from "@/shared/lib/currency"

interface CurrencyInputProps {
  /** Valor em centavos. */
  value: number
  onChange: (cents: number) => void
  id?: string
  className?: string
}

/** Input mascarado de moeda (BRL): dígitos digitados viram centavos direto. */
export function CurrencyInput({ value, onChange, id, className }: CurrencyInputProps) {
  return (
    <Input
      id={id}
      className={className}
      inputMode="numeric"
      value={value ? formatCentsToBRL(value) : ""}
      placeholder={formatCentsToBRL(0)}
      onChange={(e) => onChange(parseBRLInputToCents(e.target.value))}
    />
  )
}
