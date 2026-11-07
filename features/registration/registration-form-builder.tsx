"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useLeaveGuard } from "@/components/use-leave-guard";
import {
  IconArchive,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconPlus,
  IconRestore,
  IconTrash,
  IconEye,
  IconPencil,
} from "@tabler/icons-react";

import { saveRegistrationFormAction } from "@/app/(workspace)/events/[eventId]/(sections)/form/actions";
import { initialSaveRegistrationFormState } from "@/app/(workspace)/events/[eventId]/(sections)/form/form-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  parseRegistrationFieldAnswerType,
  registrationFieldAnswerTypeLabels,
  registrationFieldAnswerTypes,
  type RegistrationFieldAnswerType,
} from "@/features/registration/registration-form-schema";
import type { OrganizerRegistrationField } from "@/features/registration/server/registration-form";

const answerTypeItems = registrationFieldAnswerTypes.map((value) => ({
  value,
  label: registrationFieldAnswerTypeLabels[value],
}));

function serializeDefinition(fields: OrganizerRegistrationField[]) {
  return JSON.stringify(
    fields.map((field) => ({
      id: field.id,
      answerType: field.answerType,
      label: field.label,
      helpText: field.helpText,
      required: field.required,
      archived: field.archived,
      choices: field.choices,
    })),
  );
}

/** Every problem by question, in plain words, before anything reaches the server. */
function findProblems(fields: OrganizerRegistrationField[]) {
  const problems = new Map<string, string>();
  for (const field of fields) {
    if (field.archived) continue;
    const isChoice =
      field.answerType === "single_choice" ||
      field.answerType === "multiple_choice";
    const choices = field.choices
      .filter((choice) => !choice.archived)
      .map((choice) => choice.label.trim().toLowerCase());
    if (!field.label.trim()) {
      problems.set(field.id, "Write the question.");
    } else if (isChoice && choices.length === 0) {
      problems.set(field.id, "Add at least one choice.");
    } else if (isChoice && choices.some((choice) => !choice)) {
      problems.set(field.id, "Fill in every choice, or remove the empty ones.");
    } else if (isChoice && new Set(choices).size !== choices.length) {
      problems.set(field.id, "Two choices are the same. Make each one different.");
    }
  }
  return problems;
}

function newChoice() {
  return { id: crypto.randomUUID(), label: "", archived: false };
}

function newField(answerType: RegistrationFieldAnswerType): OrganizerRegistrationField {
  const isChoice = answerType === "single_choice" || answerType === "multiple_choice";
  return {
    id: crypto.randomUUID(),
    answerType,
    label: "",
    helpText: "",
    required: false,
    archived: false,
    responseCount: 0,
    choices: isChoice ? [newChoice(), newChoice()] : [],
  };
}

function AttendeeFieldPreview({
  field,
}: {
  field: OrganizerRegistrationField;
}) {
  const fieldName = `preview-${field.id}`;
  const descriptionId = field.helpText ? `${fieldName}-description` : undefined;
  const label = field.label || "Untitled question";

  if (field.answerType === "acknowledgment") {
    return (
      <Field orientation="horizontal">
        <Checkbox
          id={fieldName}
          name={fieldName}
          required={field.required}
          aria-describedby={descriptionId}
        />
        <FieldContent>
          <FieldLabel htmlFor={fieldName} className="font-normal">
            {label}{field.required ? <span aria-hidden="true"> *</span> : null}
          </FieldLabel>
          {field.helpText ? (
            <FieldDescription id={descriptionId}>{field.helpText}</FieldDescription>
          ) : null}
        </FieldContent>
      </Field>
    );
  }

  if (field.answerType === "single_choice") {
    return (
      <FieldSet>
        <FieldLegend variant="label">
          {label}{field.required ? <span aria-hidden="true"> *</span> : null}
        </FieldLegend>
        {field.helpText ? <FieldDescription>{field.helpText}</FieldDescription> : null}
        <RadioGroup name={fieldName} required={field.required}>
          {field.choices.filter((choice) => !choice.archived).map((choice) => (
            <Field key={choice.id} orientation="horizontal">
              <RadioGroupItem id={`preview-${choice.id}`} value={choice.id} />
              <FieldLabel htmlFor={`preview-${choice.id}`} className="font-normal">
                {choice.label || "Untitled choice"}
              </FieldLabel>
            </Field>
          ))}
        </RadioGroup>
      </FieldSet>
    );
  }

  if (field.answerType === "multiple_choice") {
    return (
      <FieldSet>
        <FieldLegend variant="label">
          {label}{field.required ? <span aria-hidden="true"> *</span> : null}
        </FieldLegend>
        {field.helpText ? <FieldDescription>{field.helpText}</FieldDescription> : null}
        <FieldGroup className="gap-3">
          {field.choices.filter((choice) => !choice.archived).map((choice) => (
            <Field key={choice.id} orientation="horizontal">
              <Checkbox
                id={`preview-${choice.id}`}
                name={fieldName}
                value={choice.id}
              />
              <FieldLabel htmlFor={`preview-${choice.id}`} className="font-normal">
                {choice.label || "Untitled choice"}
              </FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={fieldName}>
        {label}{field.required ? <span aria-hidden="true"> *</span> : null}
      </FieldLabel>
      {field.answerType === "long_text" ? (
        <Textarea
          id={fieldName}
          name={fieldName}
          required={field.required}
          aria-describedby={descriptionId}
          rows={4}
        />
      ) : (
        <Input
          id={fieldName}
          name={fieldName}
          required={field.required}
          aria-describedby={descriptionId}
        />
      )}
      {field.helpText ? (
        <FieldDescription id={descriptionId}>{field.helpText}</FieldDescription>
      ) : null}
    </Field>
  );
}

function RegistrationFormPreview({ fields }: { fields: OrganizerRegistrationField[] }) {
  const [status, setStatus] = useState("");
  const activeFields = fields.filter((field) => !field.archived);

  return (
    <aside className="lg:self-start" aria-labelledby="preview-heading">
      <div className="panel">
        <div className="border-b p-5 sm:p-6">
          <h2 id="preview-heading" className="text-lg font-headline">Guest preview</h2>
          <p className="mt-1 text-support text-muted-foreground">
            Try the form the way a guest will. Nothing is submitted.
          </p>
        </div>
        <form
          className="flex flex-col gap-6 p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const missingMultipleChoice = activeFields.find(
              (field) =>
                field.required &&
                field.answerType === "multiple_choice" &&
                new FormData(event.currentTarget).getAll(`preview-${field.id}`).length === 0,
            );
            if (missingMultipleChoice) {
              setStatus(`Choose at least one option for ${missingMultipleChoice.label || "the required question"}.`);
              event.currentTarget
                .querySelector<HTMLElement>(`[name="preview-${missingMultipleChoice.id}"]`)
                ?.focus();
              return;
            }
            setStatus("Looks good. A guest could submit this.");
          }}
          onInvalid={() => setStatus("Fill in the required fields to test the form.")}
        >
          <FieldGroup>
            <Field>
              {/* Same treatment as the attendee form this previews: the
                  `required` attribute carries the meaning, the glyph is
                  decoration. A preview that spells the asterisk into its label
                  text is not previewing what the attendee's screen reader
                  hears. */}
              <FieldLabel htmlFor="preview-name">
                Name
                <span aria-hidden="true"> *</span>
              </FieldLabel>
              <Input id="preview-name" name="name" autoComplete="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="preview-email">
                Email address
                <span aria-hidden="true"> *</span>
              </FieldLabel>
              <Input
                id="preview-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
              />
              <FieldDescription>
                A verification link and ticket will be sent here.
              </FieldDescription>
            </Field>
            {activeFields.map((field) => (
              <AttendeeFieldPreview key={field.id} field={field} />
            ))}
          </FieldGroup>
          <Button type="submit" variant="outline">Test the form</Button>
          <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
            {status}
          </p>
        </form>
      </div>
    </aside>
  );
}

function ChoiceEditor({
  field,
  onChange,
}: {
  field: OrganizerRegistrationField;
  onChange: (field: OrganizerRegistrationField) => void;
}) {
  return (
    <FieldSet className="rounded-xl bg-muted/50 p-4">
      <FieldLegend variant="label">Choices</FieldLegend>
      <FieldGroup className="gap-3">
        {field.choices.map((choice, index) => (
          <Field key={choice.id} orientation="horizontal" data-disabled={choice.archived}>
            <Input
              aria-label={`Choice ${index + 1}`}
              value={choice.label}
              disabled={choice.archived}
              placeholder={`Choice ${index + 1}`}
              maxLength={200}
              onChange={(event) => {
                const choices = field.choices.map((candidate) =>
                  candidate.id === choice.id
                    ? { ...candidate, label: event.target.value }
                    : candidate,
                );
                onChange({ ...field, choices });
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={choice.archived ? `Restore choice ${index + 1}` : `Archive choice ${index + 1}`}
              onClick={() => {
                const choices = field.choices.map((candidate) =>
                  candidate.id === choice.id
                    ? { ...candidate, archived: !candidate.archived }
                    : candidate,
                );
                onChange({ ...field, choices });
              }}
            >
              {choice.archived ? <IconRestore /> : <IconArchive />}
            </Button>
          </Field>
        ))}
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...field, choices: [...field.choices, newChoice()] })}
      >
        <IconPlus data-icon="inline-start" />
        Add choice
      </Button>
    </FieldSet>
  );
}

function FieldEditor({
  field,
  index,
  total,
  eventHasResponses,
  persisted,
  problem,
  onChange,
  onMove,
  onRemove,
}: {
  field: OrganizerRegistrationField;
  index: number;
  total: number;
  eventHasResponses: boolean;
  persisted: boolean;
  problem?: string;
  onChange: (field: OrganizerRegistrationField) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  const isChoice = field.answerType === "single_choice" || field.answerType === "multiple_choice";

  return (
    <section className="panel" aria-labelledby={`field-${field.id}-heading`}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 id={`field-${field.id}-heading`} className="truncate text-sm font-medium">
            {field.label || `Question ${index + 1}`}
          </h3>
          {field.responseCount > 0 ? (
            <p className="text-xs text-muted-foreground">Guests have answered, so the answer type is locked</p>
          ) : null}
        </div>
        <div className="-mr-2 flex items-center">
          <Button id={`field-${field.id}-up`} type="button" variant="ghost" size="icon-sm" title="Move up" aria-label="Move question up" disabled={index === 0} onClick={() => onMove(-1)}>
            <IconArrowUp />
          </Button>
          <Button id={`field-${field.id}-down`} type="button" variant="ghost" size="icon-sm" title="Move down" aria-label="Move question down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <IconArrowDown />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" title={field.archived ? "Bring back" : "Hide from guests, keep answers"} aria-label={field.archived ? "Restore question" : "Hide question from guests"} onClick={() => onChange({ ...field, archived: !field.archived })}>
            {field.archived ? <IconRestore /> : <IconArchive />}
          </Button>
          {field.responseCount === 0 ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="ghost" size="icon-sm" title="Delete" aria-label="Delete question" />
                }
              >
                <IconTrash />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {field.label || "This question"} is removed from the form
                    when you save.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction variant="destructive-solid" onClick={onRemove}>
                    Delete question
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <FieldGroup className="p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`field-${field.id}-label`}>Question label</FieldLabel>
            <Input
              id={`field-${field.id}-label`}
              value={field.label}
              placeholder="What do you want to ask?"
              maxLength={200}
              disabled={field.archived}
              aria-invalid={Boolean(problem)}
              onChange={(event) => onChange({ ...field, label: event.target.value })}
            />
            {problem ? (
              <p role="alert" className="text-sm text-destructive-text">
                {problem}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={`field-${field.id}-type`}>Answer type</FieldLabel>
            <Select
              items={answerTypeItems}
              value={field.answerType}
              disabled={field.archived || field.responseCount > 0}
              onValueChange={(value) => {
                if (!value) return;
                const answerType = parseRegistrationFieldAnswerType(value);
                const nextIsChoice = answerType === "single_choice" || answerType === "multiple_choice";
                onChange({
                  ...field,
                  answerType,
                  choices: nextIsChoice
                    ? field.choices.length > 0
                      ? field.choices
                      : [newChoice(), newChoice()]
                    : [],
                });
              }}
            >
              <SelectTrigger id={`field-${field.id}-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {answerTypeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`field-${field.id}-help`}>Help text</FieldLabel>
          <Input
            id={`field-${field.id}-help`}
            value={field.helpText}
            placeholder="Optional guidance shown below the question"
            maxLength={500}
            disabled={field.archived}
            onChange={(event) => onChange({ ...field, helpText: event.target.value })}
          />
        </Field>
        <Field orientation="horizontal" data-disabled={field.archived || (eventHasResponses && !persisted)}>
          <Checkbox
            id={`field-${field.id}-required`}
            checked={field.required}
            disabled={field.archived || (eventHasResponses && !persisted)}
            onCheckedChange={(checked) => onChange({ ...field, required: checked === true })}
          />
          <FieldContent>
            <FieldLabel htmlFor={`field-${field.id}-required`} className="font-normal">Required</FieldLabel>
            {eventHasResponses && !persisted ? (
              <FieldDescription>Questions added after guests have registered must stay optional.</FieldDescription>
            ) : null}
          </FieldContent>
        </Field>
        {isChoice ? <ChoiceEditor field={field} onChange={onChange} /> : null}
      </FieldGroup>
    </section>
  );
}

export function RegistrationFormBuilder({
  eventId,
  initialFields,
}: {
  eventId: string;
  initialFields: OrganizerRegistrationField[];
}) {
  const [fields, setFields] = useState(initialFields);
  const focusNext = useRef<string | null>(null);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const mobileToolbar = useRef<HTMLDivElement>(null);

  function switchMobileView() {
    setMobileView(mobileView === "edit" ? "preview" : "edit");
    requestAnimationFrame(() => mobileToolbar.current?.scrollIntoView({ block: "start" }));
  }
  const [savedDefinition, setSavedDefinition] = useState(() =>
    serializeDefinition(initialFields),
  );
  const [state, formAction, isPending] = useActionState(
    async (
      previous: Awaited<ReturnType<typeof saveRegistrationFormAction>>,
      formData: FormData,
    ) => {
      const result = await saveRegistrationFormAction(eventId, previous, formData);
      if (result.status === "success") {
        setSavedDefinition(String(formData.get("definition")));
      }
      return result;
    },
    initialSaveRegistrationFormState,
  );
  const eventHasResponses = initialFields.some((field) => field.responseCount > 0);
  const persistedFieldIds = new Set(initialFields.map((field) => field.id));

  function updateField(nextField: OrganizerRegistrationField) {
    setFields((current) => current.map((field) => field.id === nextField.id ? nextField : field));
  }

  function moveField(index: number, offset: -1 | 1) {
    const moved = fields[index];
    const target = index + offset;
    if (moved) {
      const stillMovable = target > 0 && target < fields.length - 1;
      const direction = offset < 0 ? "up" : "down";
      const opposite = offset < 0 ? "down" : "up";
      focusNext.current = `field-${moved.id}-${stillMovable ? direction : opposite}`;
    }
    setFields((current) => {
      const target = index + offset;
      const currentField = current[index];
      const targetField = current[target];
      if (currentField === undefined || targetField === undefined) return current;
      const next = [...current];
      next[index] = targetField;
      next[target] = currentField;
      return next;
    });
  }

  const definition = serializeDefinition(fields);
  const dirty = definition !== savedDefinition;
  const problems = findProblems(fields);
  const [showProblems, setShowProblems] = useState(false);

  // Questions live only in this page until saved, so leaving would lose them.
  useLeaveGuard(dirty && !isPending);

  // Adding, moving, and deleting change what is on screen, and a removed button
  // takes keyboard focus with it. Each one says where focus should land next.
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  }, [fields]);

  const saveLabel = isPending ? "Saving…" : dirty ? "Save form" : "Saved";
  const saveIcon = isPending ? (
    <Spinner data-icon="inline-start" />
  ) : dirty ? null : (
    <IconCheck data-icon="inline-start" />
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <div ref={mobileToolbar} className="sticky top-12 z-10 -mx-4 flex scroll-mt-12 items-center justify-between gap-3 border-b bg-background px-4 py-2.5 sm:-mx-6 sm:px-6 lg:hidden">
        <Button type="button" variant="outline" aria-controls="registration-form-editor registration-form-preview" aria-expanded={mobileView === "preview"} onClick={switchMobileView}>
          {mobileView === "edit" ? <IconEye data-icon="inline-start" /> : <IconPencil data-icon="inline-start" />}
          {mobileView === "edit" ? "Preview form" : "Edit questions"}
        </Button>
        <Button type="submit" form="registration-form-editor" disabled={isPending || !dirty} onClick={() => setMobileView("edit")}>
          {saveIcon}
          {saveLabel}
        </Button>
      </div>
      <form
        id="registration-form-editor"
        action={formAction}
        onSubmit={(event) => {
          const first = [...problems.keys()][0];
          if (!first) return;
          event.preventDefault();
          setShowProblems(true);
          setMobileView("edit");
          document.getElementById(`field-${first}-label`)?.focus();
        }}
        className={cn("min-w-0 flex-col gap-5 lg:flex", mobileView === "edit" ? "flex" : "hidden")}>
        <input type="hidden" name="definition" value={definition} />
        {state.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Form not saved</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <p className="text-support text-muted-foreground">
          Every guest gives their name and email. Add anything else you need
          below.
        </p>

        {fields.map((field, index) => (
          <FieldEditor
            key={field.id}
            field={field}
            index={index}
            total={fields.length}
            eventHasResponses={eventHasResponses}
            persisted={persistedFieldIds.has(field.id)}
            problem={showProblems ? problems.get(field.id) : undefined}
            onChange={updateField}
            onMove={(offset) => moveField(index, offset)}
            onRemove={() => {
              focusNext.current = "add-question";
              setFields((current) => current.filter((candidate) => candidate.id !== field.id));
            }}
          />
        ))}

        <div>
          <Button
            id="add-question"
            type="button"
            variant="outline"
            className="max-sm:w-full"
            onClick={() => {
              const added = newField("short_text");
              focusNext.current = `field-${added.id}-label`;
              setFields((current) => [...current, added]);
            }}
          >
            <IconPlus data-icon="inline-start" />
            Add question
          </Button>
        </div>

        <div className="hidden items-center justify-end border-t py-4 lg:flex">
          <Button type="submit" size="lg" disabled={isPending || !dirty}>
            {saveIcon}
            {saveLabel}
          </Button>
        </div>
      </form>

      <div id="registration-form-preview" className={cn("min-w-0 lg:sticky lg:top-22 lg:block", mobileView === "preview" ? "block" : "hidden")}>
        <RegistrationFormPreview fields={fields} />
      </div>
    </div>
  );
}
