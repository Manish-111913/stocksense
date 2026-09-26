import { useCallback, useState } from 'react'

// Validation messages keyed by field id; a field with no message renders no error
export function useFieldErrors<Field extends string>() {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})

  const setFieldError = useCallback((field: Field, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  const clearFieldError = useCallback((field: Field) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }, [])

  const clearAllErrors = useCallback(() => setErrors({}), [])

  return { errors, setFieldError, clearFieldError, clearAllErrors }
}
