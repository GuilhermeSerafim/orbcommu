"use client"

import type { ComponentProps } from "react"
import { Dialog as Primitive } from "radix-ui"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export const Dialog = Primitive.Root
export const DialogTrigger = Primitive.Trigger
export const DialogTitle = Primitive.Title
export const DialogDescription = Primitive.Description

export function DialogContent({ className, children, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Overlay className="fixed inset-0 z-50 bg-black/45" />
    <Primitive.Content className={cn(
      "fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-5 text-foreground shadow-lg sm:p-6",
      className,
    )} {...props}>
      {children}
      <Primitive.Close asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="absolute top-2 right-2 size-11">
          <X aria-hidden="true" />
        </Button>
      </Primitive.Close>
    </Primitive.Content>
  </Primitive.Portal>
}
