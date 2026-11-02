import { cs } from '../i18n/cs';
import { ClientResponseError } from './pb';

const MESSAGE_BY_CODE: Record<string, string> = {
  validation_required: cs.validation.required,
  validation_is_email: cs.validation.email,
  validation_invalid_email: cs.validation.email,
  validation_not_unique: cs.validation.unique,
  validation_invalid_format: cs.validation.format,
  validation_length_out_of_range: cs.validation.length,
  validation_length_too_short: cs.validation.length,
  validation_length_too_long: cs.validation.length,
  validation_min_text_constraint: cs.validation.length,
  validation_max_text_constraint: cs.validation.length,
  validation_values_mismatch: cs.validation.passwordMismatch,
  validation_file_size_limit: cs.validation.fileSize,
  validation_invalid_mime_type: cs.validation.fileType,
};

export type FieldErrors = Record<string, string>;

/** Translates the field errors of a PocketBase response. */
export function fieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {};
  const data = error.response?.data as Record<string, { code?: string }> | undefined;
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([field, item]) => [field, MESSAGE_BY_CODE[item?.code ?? ''] ?? cs.validation.generic]),
  );
}
