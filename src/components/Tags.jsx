import { getDiscipline } from "../data/disciplines"

/** Discipline tags on cards and project pages. Print and book work has none. */
export function DisciplineTags({ ids = [], className = "" }) {
  if (!ids.length) return null
  return (
    <ul className={`tags ${className}`.trim()} aria-label="Disciplines">
      {ids.map((id) => <li key={id} className={`tag tag--${id}`}>{getDiscipline(id)?.label ?? id}</li>)}
    </ul>
  )
}
