import z from "zod";

type FieldErrors = { [key: string]: string };

export function validateForm<T, S, E>(
  formData: FormData,
  zodSchema: z.Schema<T>,
  successFn: (data: T) => S,
  errorFn: (errors: FieldErrors) => E,
) {
  const result = zodSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    const errors: FieldErrors = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors[path] = issue.message;
    });
    return errorFn(errors);
  }

  return successFn(result.data);
}

/* As written in the course

export function validateForm<T>(
  formData: FormData,
  zodSchema: z.Schema<T>,
  successFn: (data: T) => unknown,
  errorFn: (errors: FieldErrors) => unknown,
) {
  const result = zodSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    const errors: FieldErrors = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors[path] = issue.message;
    });
    return errorFn(errors);
  }

  return successFn(result.data);
}

*/