import { Bell, Github, LockKeyhole, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'

export const settingsNavigationItems = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: LockKeyhole },
] satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>
