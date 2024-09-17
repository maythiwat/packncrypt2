export const percentage = (max: number, val: number) => {
  return ((val / max) * 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const hrtimeToSeconds = (hrtime: [number, number]) => {
  return hrtime[0] + hrtime[1] / 1e9
}
