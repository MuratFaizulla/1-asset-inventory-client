// components/import/utils.ts

/** Добавляет id если его нет, удаляет если есть. Возвращает новый Set. */
export const toggleSet = (prev: Set<number>, id: number): Set<number> => {
  const next = new Set(prev)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}