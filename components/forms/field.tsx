import { cn } from "@/lib/utils";

// Form primitives sized for touch: every control is at least 44px tall (PRD §12).

export const controlClass =
  "h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none transition-colors " +
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 " +
  "disabled:opacity-50 aria-invalid:border-gap";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  warning,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  warning?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children}
      {hint && !error && !warning && <p className="text-xs text-muted-foreground">{hint}</p>}
      {warning && !error && <p className="text-xs font-medium text-warn">{warning}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-gap">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(controlClass, "h-auto min-h-24 py-2.5", props.className)} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return <select {...props} className={cn(controlClass, "appearance-auto", props.className)} />;
}

/** Radio group rendered as large tappable segments. */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border bg-muted p-1">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-medium has-checked:bg-card has-checked:text-brand has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/30"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            className="sr-only"
            {...(onChange
              ? { checked: value === o.value, onChange: () => onChange(o.value) }
              : { defaultChecked: defaultValue === o.value })}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Multi-select rendered as toggle chips (checkboxes under the hood). */
export function ChipChecks({
  name,
  options,
  defaultValues = [],
}: {
  name: string;
  options: readonly string[];
  defaultValues?: readonly string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o}
          className="flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 text-sm has-checked:border-brand has-checked:bg-info-soft has-checked:font-medium has-checked:text-brand has-focus-visible:ring-3 has-focus-visible:ring-ring/30"
        >
          <input type="checkbox" name={name} value={o} defaultChecked={defaultValues.includes(o)} className="sr-only" />
          {o}
        </label>
      ))}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-gap-soft px-3 py-2 text-sm font-medium text-gap">
      {message}
    </p>
  );
}
