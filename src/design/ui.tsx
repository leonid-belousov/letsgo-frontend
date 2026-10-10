import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`lg-button lg-button--${variant} ${className}`} {...rest} />
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Renders the permanent neutral required marker (never turns red). */
  requiredMark?: boolean;
};

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, requiredMark, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="lg-field">
      <label className="lg-field__label" htmlFor={inputId}>
        {label}
        {requiredMark ? <span className="lg-field__required"> *</span> : null}
      </label>
      <input
        ref={ref}
        id={inputId}
        className="lg-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error ? (
        <span id={errorId} role="alert" className="lg-field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
});

export function Card({ children }: { children: ReactNode }) {
  return <div className="lg-card">{children}</div>;
}

export type BadgeTone = 'pitch-booked' | 'booking-pending' | 'community-pitch' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`lg-badge lg-badge--${tone}`}>{children}</span>;
}

export function Skeleton({ width = '100%' }: { width?: string }) {
  return <div className="lg-skeleton" style={{ width }} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="lg-state" role="status" aria-live="polite" aria-label={label}>
      <Skeleton width="60%" />
      <Skeleton width="80%" />
      <Skeleton width="40%" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="lg-state">
      <h2 className="lg-state__title">{title}</h2>
      {body ? <p className="lg-state__body">{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Couldn’t load this. Try again.',
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="lg-state" role="alert">
      <h2 className="lg-state__title">{title}</h2>
      {body ? <p className="lg-state__body">{body}</p> : null}
      {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}
