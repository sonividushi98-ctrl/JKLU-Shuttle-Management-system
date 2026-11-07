import { render, screen } from '@testing-library/react';
import App from './App';

test('renders JKLU Shuttle app header', () => {
  render(<App />);
  const headingElements = screen.getAllByText(/JKLU/i);
  expect(headingElements.length).toBeGreaterThan(0);
});
