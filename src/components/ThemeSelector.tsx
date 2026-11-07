import { useTheme } from '../theme/theme'
import type { ThemePreference } from '../theme/theme'

export default function ThemeSelector() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="theme-selector">
      <label htmlFor="theme-preference">Tema</label>
      <select
        id="theme-preference"
        value={preference}
        onChange={(event) => setPreference(event.target.value as ThemePreference)}
      >
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Sistema</option>
      </select>
    </div>
  )
}
