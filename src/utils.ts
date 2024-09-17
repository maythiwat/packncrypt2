export const percentage = (max: number, val: number) => {
  return ((val / max) * 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
