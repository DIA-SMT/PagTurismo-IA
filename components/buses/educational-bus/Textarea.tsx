import type { TextareaHTMLAttributes } from 'react'
import styles from './form.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

export function Textarea({ hasError, className, ...props }: TextareaProps) {
  return <textarea aria-invalid={hasError || undefined} {...props} className={`${styles.textarea} ${hasError ? styles.controlError : ''} ${className || ''}`.trim()} />
}
