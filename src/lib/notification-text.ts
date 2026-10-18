export function notificationText(body: string): string {
  return body.replace(/^Abbey booking confirmed\n/, 'Your Abbey booking was approved.\n')
    .replace(/^Abbey booking rejected\n/, 'Your Abbey booking was rejected.\n')
    .replace(/^Abbey booking cancelled\n/, 'Your Abbey booking was cancelled.\n');
}
