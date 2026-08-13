import * as React from 'react';
import { cn } from '@/lib/utils';

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="field-group" className={cn('flex w-full flex-col gap-6', className)} {...props} />; }
function Field({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="field" className={cn('grid w-full items-center gap-2', className)} {...props} />; }
function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) { return <label data-slot="field-label" className={cn('text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50', className)} {...props} />; }
function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) { return <p data-slot="field-description" className={cn('text-muted-foreground text-sm leading-normal', className)} {...props} />; }
function FieldError({ className, ...props }: React.ComponentProps<'p'>) { return <p data-slot="field-error" role="alert" className={cn('text-destructive text-sm font-medium', className)} {...props} />; }
function FieldSeparator({ className, children, ...props }: React.ComponentProps<'div'>) { return <div data-slot="field-separator" className={cn('flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border', className)} {...props}>{children}</div>; }
export { FieldGroup, Field, FieldLabel, FieldDescription, FieldError, FieldSeparator };
