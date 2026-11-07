function subtractLocalMinutes(value: string, minutes: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return "";
  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]) - minutes,
    ),
  );
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

export function getDefaultEventWindows(values: {
  startsAtLocal: string;
  endsAtLocal: string;
  registrationOpensAtLocal: string;
  registrationClosesAtLocal: string;
  checkInOpensAtLocal: string;
  checkInClosesAtLocal: string;
}, nowLocal = "") {
  return {
    registrationOpensAtLocal: values.registrationOpensAtLocal || nowLocal,
    registrationClosesAtLocal:
      values.registrationClosesAtLocal || values.startsAtLocal,
    checkInOpensAtLocal:
      values.checkInOpensAtLocal ||
      subtractLocalMinutes(values.startsAtLocal, 60),
    checkInClosesAtLocal: values.checkInClosesAtLocal || values.endsAtLocal,
  };
}

const OPTIONAL_WINDOW_FIELDS = [
  "registrationOpensAtLocal",
  "registrationClosesAtLocal",
  "checkInOpensAtLocal",
  "checkInClosesAtLocal",
] as const;

/**
 * One error per field, and none on a field the organizer left blank. Those
 * fields are filled in from the schedule, so a problem with the schedule used to
 * surface on an optional field they never touched. It belongs on the schedule.
 */
export function presentEventErrors(
  fieldErrors: Record<string, string[] | undefined>,
  inputValues: Record<string, string>,
) {
  const errors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const first = messages?.[0];
    if (first) errors[field] = [first];
  }
  for (const field of OPTIONAL_WINDOW_FIELDS) {
    const message = errors[field]?.[0];
    if (!message || inputValues[field]) continue;
    delete errors[field];
    if (!errors.startsAtLocal && !errors.endsAtLocal) {
      errors.startsAtLocal = ["Check this time. It needs to be in the future."];
    }
  }
  return errors;
}
