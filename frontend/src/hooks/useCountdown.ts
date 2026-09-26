import { useCallback, useEffect, useRef, useState } from 'react'

// Counts down once per second from `seconds` to 0 and then calls `onComplete`; `restart()` starts over
export function useCountdown(seconds: number, onComplete?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(seconds)
  const [run, setRun] = useState(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    let remaining = seconds
    const timer = setInterval(() => {
      remaining -= 1
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        onCompleteRef.current?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [seconds, run])

  const restart = useCallback(() => {
    setSecondsLeft(seconds)
    setRun((count) => count + 1)
  }, [seconds])

  return { secondsLeft, restart }
}
