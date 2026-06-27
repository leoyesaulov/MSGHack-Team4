import { useEffect, useState } from 'react'

interface ToastMsg { id: number; text: string; type: 'success' | 'error' }

let _setToasts: React.Dispatch<React.SetStateAction<ToastMsg[]>> | null = null

export function toast(text: string, type: 'success' | 'error' = 'success') {
  const id = Date.now()
  _setToasts?.((prev) => [...prev, { id, text, type }])
  setTimeout(() => {
    _setToasts?.((prev) => prev.filter((t) => t.id !== id))
  }, 3500)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null } }, [])
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
      ))}
    </div>
  )
}
