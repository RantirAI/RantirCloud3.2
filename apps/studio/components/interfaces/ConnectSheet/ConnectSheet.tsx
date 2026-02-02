import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, cn } from 'ui'

interface ConnectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectTab?: string | null
}

export const ConnectSheet = ({ open, onOpenChange, connectTab }: ConnectSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="flex flex-col gap-0 p-0 space-y-0" tabIndex={undefined}>
        <SheetHeader className={cn('text-left border-b shrink-0 py-6 px-8')}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SheetTitle>Connect to your project</SheetTitle>
              <SheetDescription>Choose how you want to use Supabase</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Configuration Section */}
          <div className="space-y-6 border-b p-8 shrink-0"></div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
