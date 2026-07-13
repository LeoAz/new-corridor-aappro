import * as React from "react"
import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface AutocompleteOption {
  value: string
  label: string
}

interface SimpleAutocompleteProps {
  options: AutocompleteOption[]
  value?: string
  onValueChange: (value: string) => void
  onLabelChange?: (label: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function SimpleAutocomplete({
  options,
  value,
  onValueChange,
  onLabelChange,
  placeholder = "Sélectionner...",
  emptyMessage = "Aucun résultat trouvé.",
  className,
  disabled = false,
}: SimpleAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  // Synchronize inputValue with current label if value changes externally
  React.useEffect(() => {
    if (value) {
      const selected = options.find((opt) => opt.value === value)
      if (selected) {
        setInputValue(selected.label)
      }
    } else {
        // If value is empty, we don't necessarily want to clear input if user is typing
    }
  }, [value, options])

  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options
    return options.filter((option) =>
      (option.label || "").toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [options, inputValue])

  const isExactMatch = React.useMemo(() => {
    return options.some(
      (option) => (option.label || "").toLowerCase() === (inputValue || "").toLowerCase()
    )
  }, [options, inputValue])

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open && (filteredOptions.length > 0 || (inputValue.length > 0 && !isExactMatch))} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full">
            <Input
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                onLabelChange?.(e.target.value)
                // If the user clears the input, we clear the ID
                if (!e.target.value) {
                    onValueChange("")
                }
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              disabled={disabled}
              autoComplete="off"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>
                {inputValue.length > 0 && !isExactMatch && (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      onValueChange("")
                      onLabelChange?.(inputValue)
                      setOpen(false)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer "{inputValue}"
                  </button>
                )}
                {inputValue.length > 0 && isExactMatch && emptyMessage}
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value)
                      onLabelChange?.(option.label)
                      setInputValue(option.label)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
