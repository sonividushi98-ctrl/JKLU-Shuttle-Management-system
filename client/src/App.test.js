import { render, screen } from '@testing-library/react';
import App from './App';

describe('JKLU Campus Shuttle App', () => {
  test('renders JKLU Shuttle app header and brand title', () => {
    render(<App />);
    const headingElements = screen.getAllByText(/JKLU/i);
    expect(headingElements.length).toBeGreaterThan(0);
  });

  test('renders the 3 official campus stops in the hero and route', () => {
    render(<App />);
    expect(screen.getAllByText(/200 Feet Bypass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Elements Mall/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mansarovar Metro Station/i).length).toBeGreaterThan(0);
  });

  test('renders Live Bus GPS and segmented navigation controls', () => {
    render(<App />);
    expect(screen.getByText(/Live Bus GPS/i)).toBeInTheDocument();
    expect(screen.getByText(/Book Shuttle/i)).toBeInTheDocument();
    expect(screen.getByText(/My Passes/i)).toBeInTheDocument();
  });

  test('displays persistent student authentication badge or sign in', () => {
    render(<App />);
    const userOrLogin = screen.queryByText(/Aarav Sharma/i) || screen.queryByText(/Sign In/i);
    expect(userOrLogin).toBeInTheDocument();
  });
});
