'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-[46px] w-full items-center rounded-md border border-(--pf-border-strong) bg-(--pf-surface-strong) px-3 py-2.5 text-base font-mono text-[color:var(--pf-foreground)] placeholder:text-[color:var(--pf-foreground-muted)] focus:border-(--pf-border-strong) focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-[0_8px_22px_color-mix(in_oklab,#000_14%,transparent)]',
      className
    )}
    {...props}
  >
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 mr-2 shrink-0" />
    </SelectPrimitive.Icon>
    <div className="flex-1 min-w-0 text-left">{children}</div>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
      'relative z-110 min-w-32 overflow-hidden rounded-md border border-(--pf-border-strong) bg-(--pf-surface-strong) text-[color:var(--pf-foreground)] shadow-[0_18px_46px_color-mix(in_oklab,#000_20%,transparent),0_0_0_1px_color-mix(in_oklab,var(--pf-border-strong)_60%,transparent)]',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1 max-h-72 overflow-y-auto',
          position === 'popper' && 'h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-base font-semibold font-mono text-[color:var(--pf-foreground-muted)]', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w/full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-base font-mono outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 focus:bg-[color-mix(in_oklab,var(--pf-foreground)_16%,var(--pf-surface-strong))] focus:text-[color:var(--pf-foreground)] hover:bg-[color-mix(in_oklab,var(--pf-foreground)_10%,var(--pf-surface-strong))]',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[color-mix(in_oklab,var(--pf-foreground)_12%,transparent)]', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator }
