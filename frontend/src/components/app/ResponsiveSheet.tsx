import type { ReactNode } from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type ResponsiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Gaveta de baixo no celular, janela no tablet/desktop. */
export function ResponsiveSheet({ open, onOpenChange, title, description, children, className }: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} repositionInputs={false}>
        <DrawerContent className="max-h-[94dvh]">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className={cn("overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]", className)}>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={cn("overflow-y-auto px-6 pb-6", className)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
