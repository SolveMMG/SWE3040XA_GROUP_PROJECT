import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Welcome to RideConnect heading', () => {
  render(<App />);
  const heading = screen.getByText(/Welcome to RideConnect/i);
  expect(heading).toBeInTheDocument();
});
