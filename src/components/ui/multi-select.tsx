'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  id,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selected = options.filter((o) => value.includes(o.value))

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  function removeOne(v: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle(v)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal',
            value.length === 0 && 'text-muted-foreground',
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-1">
            {selected.length === 0 ? (
              <span>{placeholder ?? '선택'}</span>
            ) : (
              selected.map((o) => (
                <Badge key={o.value} variant="secondary" className="gap-1 pr-1">
                  {o.label}
                  <span
                    role="button"
                    aria-label={`${o.label} 제거`}
                    className="hover:text-destructive ml-0.5 cursor-pointer"
                    onClick={(e) => removeOne(o.value, e)}
                  >
                    <X className="size-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
        <div className="max-h-64 overflow-auto">
          {options.length === 0 ? (
            <div className="text-muted-foreground px-2 py-3 text-sm">옵션 없음</div>
          ) : (
            options.map((o) => {
              const isOn = value.includes(o.value)
              return (
                <label
                  key={o.value}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={isOn}
                    onCheckedChange={() => toggle(o.value)}
                  />
                  <span className="flex-1">{o.label}</span>
                  {isOn && <Check className="size-3.5 opacity-60" />}
                </label>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
