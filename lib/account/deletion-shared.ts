export function getAccountDeletionConfirmation(email: string | null | undefined) {
  const normalizedEmail = email?.trim()
  return normalizedEmail ? `DELETE ${normalizedEmail}` : 'DELETE MY ACCOUNT'
}
