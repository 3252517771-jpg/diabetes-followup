import type { GlucoseCategory } from '../../types/glucose'

export const GLUCOSE_CATEGORY_OPTIONS: Array<{ label: string; value: GlucoseCategory }> = [
  { label: '空腹', value: 'fasting' },
  { label: '餐后', value: 'postprandial' },
  { label: '睡前', value: 'bedtime' },
  { label: '随机', value: 'random' },
]

export const GLUCOSE_CATEGORY_LABELS: Record<GlucoseCategory, string> = {
  fasting: '空腹',
  postprandial: '餐后',
  bedtime: '睡前',
  random: '随机',
}

export function getGlucoseCategoryLabel(category: GlucoseCategory | string) {
  return GLUCOSE_CATEGORY_LABELS[category as GlucoseCategory] ?? category
}

export function toGlucoseNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
