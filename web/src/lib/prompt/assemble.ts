/**
 * Very simple prompt assembly: replace {{field_name}} placeholders in the base
 * prompt with user-provided values. If a field has no placeholder, it is
 * appended at the end in a structured way.
 */
export function assemblePrompt(
  basePrompt: string,
  values: Record<string, string>,
): string {
  let result = basePrompt;

  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    result = result.replace(placeholder, value.trim());
  }

  const remaining: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!value.trim()) continue;
    const hasPlaceholder = new RegExp(`{{\\s*${key}\\s*}}`, "i").test(basePrompt);
    if (!hasPlaceholder) {
      remaining.push(`${key}: ${value.trim()}`);
    }
  }

  if (remaining.length > 0) {
    result = `${result}\n\n${remaining.join("\n")}`;
  }

  return result.trim();
}
