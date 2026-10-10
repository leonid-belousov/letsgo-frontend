import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, ErrorState, TextField } from './ui';

describe('design system', () => {
  it('disables Button without firing click', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Pay
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps the required marker neutral and exposes errors accessibly', () => {
    render(<TextField label="Club name" requiredMark error="Required" />);
    expect(screen.getByLabelText(/Club name/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('ErrorState offers Retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
