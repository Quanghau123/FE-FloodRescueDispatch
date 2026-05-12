import { useEffect } from 'react'

export type ToastState = { title: string; message?: string } | null

export function Toast(props: { value: ToastState; onClear: () => void }) {
  useEffect(() => {
    if (!props.value) return
    const t = window.setTimeout(() => props.onClear(), 5000)
    return () => window.clearTimeout(t)
  }, [props.value, props.onClear])

  if (!props.value) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toastTitle">{props.value.title}</div>
      {props.value.message ? <div className="toastBody">{props.value.message}</div> : null}
    </div>
  )
}
