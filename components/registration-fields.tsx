import { Field, Input, Select, Switch, Textarea } from "@/components/ui";
import type { FormField } from "@/lib/db/schema";

/** The questions a guest answers. Also drawn, inert, as the form builder's live preview. */
export function RegistrationFields({
  fields,
  values = {},
  errors = {},
}: {
  fields: FormField[];
  values?: Record<string, string>;
  errors?: Record<string, string>;
}) {
  return (
    <>
      <Field label="Full name" error={errors.name}>
        <Input name="name" defaultValue={values.name} autoComplete="name" required maxLength={120} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Email" hint="Your ticket will be sent here." error={errors.email}>
        <Input name="email" type="email" defaultValue={values.email} autoComplete="email" required aria-invalid={!!errors.email} />
      </Field>
      {fields.map((field) => {
        const name = `q_${field.id}`;
        const error = errors[field.id];
        const label = (
          <>
            {field.label || "Untitled question"}
            {!field.required && <span className="font-normal text-muted"> (optional)</span>}
          </>
        );
        if (field.type === "checkbox") {
          return (
            <div key={field.id} className="grid gap-1.5">
              <label className="flex items-center justify-between gap-4 rounded-xl border border-line-strong px-3.5 py-3 text-sm font-semibold">
                <span>{label}</span>
                <Switch name={name} value="yes" defaultChecked={Boolean(values[name])} required={field.required} />
              </label>
              {error && <span className="text-sm text-danger">{error}</span>}
            </div>
          );
        }
        return (
          <Field key={field.id} label={label} error={error}>
            {field.type === "textarea" ? (
              <Textarea name={name} defaultValue={values[name]} required={field.required} maxLength={2000} rows={3} aria-invalid={!!error} />
            ) : field.type === "select" ? (
              <Select name={name} defaultValue={values[name] ?? ""} required={field.required} aria-invalid={!!error}>
                <option value="" disabled={field.required}>
                  Choose…
                </option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            ) : (
              <Input name={name} defaultValue={values[name]} required={field.required} maxLength={2000} aria-invalid={!!error} />
            )}
          </Field>
        );
      })}
    </>
  );
}
