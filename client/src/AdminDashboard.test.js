import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

jest.mock('./api/admin', () => ({
  adminErrorMessage: jest.fn(() => 'Admin request failed'),
  cancelSlot: jest.fn(),
  createSlot: jest.fn(),
  getDailyPassengers: jest.fn(() => Promise.resolve({ count: 0, passengers: [] })),
  getRoutes: jest.fn(() => Promise.resolve([])),
  getPassengers: jest.fn(),
  getSlotLoad: jest.fn(() => Promise.resolve({ slots: [] }))
}));

describe('Admin shuttle form', () => {
  test('defaults to Bus with 30 seats and Monday through Friday selected', async () => {
    render(<AdminDashboard onUnauthorized={jest.fn()} />);
    await waitFor(() => expect(screen.queryByText(/Loading shuttle load/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Add shuttle/i }));

    expect(screen.getByDisplayValue('Bus')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(30);
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach((day) => {
      expect(screen.getByLabelText(day)).toBeChecked();
    });
    expect(screen.getByLabelText('Sat')).not.toBeChecked();
    expect(screen.getByLabelText('Sun')).not.toBeChecked();
  });

  test('uses Travellor capacity by default but preserves an edited capacity', async () => {
    render(<AdminDashboard onUnauthorized={jest.fn()} />);
    await waitFor(() => expect(screen.queryByText(/Loading shuttle load/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Add shuttle/i }));
    const typeSelect = screen.getByDisplayValue('Bus');
    const seatInput = screen.getByRole('spinbutton');

    fireEvent.change(typeSelect, { target: { value: 'Travellor' } });
    expect(seatInput).toHaveValue(19);

    fireEvent.change(seatInput, { target: { value: '24' } });
    fireEvent.change(typeSelect, { target: { value: 'Bus' } });
    expect(seatInput).toHaveValue(24);
  });

  test('caps passenger report dates at the day after tomorrow', async () => {
    render(<AdminDashboard onUnauthorized={jest.fn()} />);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 2);
    const expectedMax = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;

    expect(await screen.findByLabelText('Date')).toHaveAttribute('max', expectedMax);
  });

});
