import { forwardRef, type ReactNode, useState, useRef, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'

// ─── Design System Components ────────────────────────────────────────

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-accent-blue text-white hover:bg-accent-blueHover active:bg-accent-blue/80 focus-visible:ring-accent-blue/50 shadow-sm',
      secondary: 'bg-border-default text-text-primary hover:bg-border-strong active:bg-border-subtle focus-visible:ring-border-strong/50 border border-border-subtle',
      ghost: 'text-text-secondary hover:bg-bg-tertiary active:bg-bg-elevated focus-visible:ring-border-default/50',
      danger: 'bg-accent-red text-white hover:bg-accent-redHover active:bg-accent-red/80 focus-visible:ring-accent-red/50 shadow-sm',
      success: 'bg-accent-green text-white hover:bg-accent-greenHover active:bg-accent-green/80 focus-visible:ring-accent-green/50 shadow-sm',
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-caption-sm gap-1.5',
      md: 'px-4 py-2 text-body-sm gap-2',
      lg: 'px-6 py-3 text-body gap-2.5',
    }

    const widthStyles = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : icon && iconPosition === 'left' ? (
          <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
        ) : null}
        <span className="truncate">{children}</span>
        {icon && iconPosition === 'right' && !loading && (
          <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = 'left',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${inputId}-error` : undefined
    const hintId = hint ? `${inputId}-hint` : undefined

    return (
      <div className="relative w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-medium text-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={twMerge(errorId, hintId)}
            className={twMerge(
              'w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-muted transition-all duration-fast',
              'hover:border-border-strong focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 focus:ring-offset-2 focus:ring-offset-bg-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'invalid:border-accent-red invalid:focus:border-accent-red invalid:focus:ring-accent-red/20',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={twMerge(errorId, hintId)}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-caption-sm text-accent-red flex items-center gap-1" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${inputId}-error` : undefined
    const hintId = hint ? `${inputId}-hint` : undefined

    return (
      <div className="relative w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-medium text-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={twMerge(errorId, hintId)}
          className={twMerge(
            'w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-muted transition-all duration-fast resize-none',
            'hover:border-border-strong focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 focus:ring-offset-2 focus:ring-offset-bg-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'invalid:border-accent-red invalid:focus:border-accent-red invalid:focus:ring-accent-red/20',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={twMerge(errorId, hintId)}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-caption-sm text-accent-red flex items-center gap-1" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Select
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      placeholder,
      options,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${inputId}-error` : undefined
    const hintId = hint ? `${inputId}-hint` : undefined

    return (
      <div className="relative w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-medium text-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={twMerge(errorId, hintId)}
            className={twMerge(
              'w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3.5 py-2.5 text-text-primary appearance-none transition-all duration-fast',
              'hover:border-border-strong focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 focus:ring-offset-2 focus:ring-offset-bg-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'invalid:border-accent-red invalid:focus:border-accent-red invalid:focus:ring-accent-red/20',
              'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={twMerge(errorId, hintId)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-caption-sm text-accent-red flex items-center gap-1" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-caption-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// Card
export interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
}

export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  border = true,
  onClick,
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }

  return (
    <div
      onClick={onClick}
      className={twMerge(
        'bg-bg-secondary rounded-xl transition-all duration-fast',
        border && 'border border-border-subtle',
        hover && 'hover:border-border-strong hover:shadow-card-hover',
        onClick && 'cursor-pointer',
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

// Badge
export interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-border-default text-text-secondary',
    success: 'bg-accent-green/20 text-accent-green border border-accent-green/30',
    warning: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30',
    error: 'bg-accent-red/20 text-accent-red border border-accent-red/30',
    info: 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-micro-mono',
    md: 'px-2.5 py-1 text-caption-sm',
  }

  return (
    <span
      className={twMerge(
        'inline-flex items-center font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        'whitespace-nowrap'
      )}
    >
      {children}
    </span>
  )
}

// Progress Bar
export interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  return (
    <div className={twMerge('w-full', className)}>
      <div className={twMerge('w-full bg-bg-tertiary rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan rounded-full transition-all duration-normal ease-out-expo"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-caption-sm text-text-muted font-mono">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  )
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

// Modal
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={twMerge(
          'relative w-full bg-bg-secondary rounded-2xl shadow-modal border border-border-subtle overflow-hidden animate-scale-in',
          sizeStyles[size]
        )}
        role="document"
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            {title && (
              <h2 id="modal-title" className="text-heading-md text-text-primary font-semibold">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// Tooltip
export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<number>()

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowStyles = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-accent-blue',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-accent-blue',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-accent-blue',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-accent-blue',
  }

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          className={twMerge(
            'absolute z-50 px-3 py-2 text-caption-sm text-text-primary bg-bg-elevated border border-border-default rounded-lg shadow-floating whitespace-nowrap',
            'animate-fade-in',
            positionStyles[position]
          )}
          role="tooltip"
        >
          {content}
          <div
            className={twMerge(
              'absolute w-0 h-0 border-2 border-transparent',
              'opacity-100'
            )}
            style={{
              borderTopColor: position === 'bottom' ? '#2f72e8' : 'transparent',
              borderBottomColor: position === 'top' ? '#2f72e8' : 'transparent',
              borderLeftColor: position === 'right' ? '#2f72e8' : 'transparent',
              borderRightColor: position === 'left' ? '#2f72e8' : 'transparent',
            }}
          />
        </div>
      )}
    </div>
  )
}

// Table
export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
  width?: string
}

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  rowClassName?: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  striped?: boolean
  hoverable?: boolean
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  rowClassName,
  onRowClick,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-secondary">
      {data.length === 0 ? (
        <div className="p-12 text-center text-text-muted">
          {emptyMessage}
        </div>
      ) : (
        <table className="w-full" role="table">
          <thead>
            <tr className="bg-bg-tertiary border-b border-border-subtle text-left text-caption-sm font-semibold text-text-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={twMerge(
                    'px-4 py-3 text-left font-semibold text-caption-sm text-text-secondary',
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row[keyField] as string}
                className={twMerge(
                  'border-b border-border-subtle/50 transition-colors',
                  striped && index % 2 === 1 && 'bg-bg-tertiary/50',
                  hoverable && 'hover:bg-bg-tertiary/50',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={twMerge('px-4 py-3 text-body-sm text-text-primary', col.className)}>
                    {col.render ? col.render(data[index]) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Empty State
export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center text-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-heading-sm text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-body-sm text-text-muted max-w-sm mx-auto mb-6">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Avatar
export interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away'
  className?: string
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
}: AvatarProps) {
  const sizeStyles = {
    xs: 'w-6 h-6 text-micro',
    sm: 'w-8 h-8 text-caption-sm',
    md: 'w-10 h-10 text-caption',
    lg: 'w-12 h-12 text-body',
    xl: 'w-16 h-16 text-heading-sm',
  }

  const statusStyles = {
    online: 'bg-accent-green',
    offline: 'bg-text-muted',
    busy: 'bg-accent-red',
    away: 'bg-accent-amber',
  }

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  }

  if (src) {
    return (
      <div className={twMerge('relative inline-block', className)}>
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={twMerge('rounded-full object-cover', sizeStyles[size])}
        />
        {status && (
          <span
            className={twMerge(
              'absolute bottom-0 right-0 rounded-full border-2 border-bg-primary',
              statusStyles[status],
              sizeStyles[status]
            )}
            aria-label={status}
          />
        )}
      </div>
    )
  }

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={twMerge(
        'inline-flex items-center justify-center rounded-full bg-accent-blue/20 text-accent-blue font-semibold select-none',
        sizeStyles[size],
        className
      )}
      aria-label={name}
    >
      {initials || '?'}
    </div>
  )
}

// Divider
export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Divider({ orientation = 'horizontal', className = '' }: DividerProps) {
  return orientation === 'horizontal' ? (
    <hr className={twMerge('border-border-subtle w-full', className)} aria-hidden="true" />
  ) : (
    <div className={twMerge('border-l border-border-subtle h-full', className)} aria-hidden="true" />
  )
}

// Tabs
export interface Tab {
  key: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
  variant?: 'line' | 'pills' | 'enclosed'
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, variant = 'line', className = '' }: TabsProps) {
  return (
    <div className={twMerge('flex gap-1', className)} role="tablist" aria-orientation="horizontal">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={`panel-${tab.key}`}
          id={`tab-${tab.key}`}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.key)}
          className={twMerge(
            'relative inline-flex items-center gap-2 px-3 py-2 text-caption-sm font-medium rounded-lg transition-all duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            activeTab === tab.key
              ? 'text-text-primary bg-bg-tertiary'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary',
            variant === 'pills' && 'px-4 py-1.5 rounded-lg',
            variant === 'enclosed' && 'border border-border-subtle',
          )}
        >
          {tab.icon && <span className="flex-shrink-0" aria-hidden="true">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// Dropdown
export interface DropdownItem {
  key: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
}

export interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={twMerge('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={twMerge(
            'absolute z-50 mt-1.5 min-w-[180px] bg-bg-elevated border border-border-subtle rounded-lg shadow-floating overflow-hidden animate-fade-in',
            'right-0'
          )}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.()
                  setOpen(false)
                }
              }}
              className={twMerge(
                'w-full flex items-center gap-2 px-3 py-2 text-body-sm text-text-primary transition-colors',
                'hover:bg-bg-tertiary focus-visible:outline-none focus-visible:bg-bg-tertiary',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                item.danger && 'text-accent-red hover:bg-accent-red/10',
                item.icon && 'pl-2'
              )}
            >
              {item.icon && <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}