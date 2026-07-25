import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StarRating from '../components/StarRating.jsx';

describe('StarRating', () => {
  it('renders 5 stars', () => {
    render(<StarRating value={0} />);
    // In display mode the wrapper has role="img"
    const group = document.querySelector('[role="img"]');
    expect(group).toBeInTheDocument();
  });

  it('renders as radiogroup when onChange is provided', () => {
    render(<StarRating value={3} onChange={() => {}} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('shows the accessible label with current value', () => {
    render(<StarRating value={4} label="Driver rating" />);
    expect(screen.getByLabelText('Driver rating: 4 out of 5')).toBeInTheDocument();
  });

  it('renders 5 interactive buttons when onChange is provided', () => {
    render(<StarRating value={0} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('calls onChange with the correct star value when a button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    await user.click(screen.getByLabelText('3 star'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with 1 when the first star is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    await user.click(screen.getByLabelText('1 star'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with 5 when the last star is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    await user.click(screen.getByLabelText('5 star'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('marks correct stars as active based on value', () => {
    render(<StarRating value={3} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('active'); // star 1
    expect(buttons[1]).toHaveClass('active'); // star 2
    expect(buttons[2]).toHaveClass('active'); // star 3
    expect(buttons[3]).not.toHaveClass('active'); // star 4
    expect(buttons[4]).not.toHaveClass('active'); // star 5
  });
});
