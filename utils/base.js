exports.isExpired = (timestamp) => {
  const expiry = new Date(timestamp).getTime()
  const now = new Date().getTime()

  if (expiry < now / 1000) return true
  return false
}