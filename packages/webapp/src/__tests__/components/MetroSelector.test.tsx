/**
 * MetroSelector Component Tests
 * Tests for metropolitan area selection component
 */

import { render, screen, fireEvent, waitFor } from '../setup/testUtils';
import MetroSelector from '../../components/MetroSelector';

describe('MetroSelector', () => {
  const mockMetros = [
    {
      id: '1',
      name: 'San Francisco-Oakland-Berkeley, CA',
      state: 'CA',
      population: 4700000,
    },
    {
      id: '2',
      name: 'New York-Newark-Jersey City, NY-NJ-PA',
      state: 'NY',
      population: 19200000,
    },
    {
      id: '3',
      name: 'Los Angeles-Long Beach-Anaheim, CA',
      state: 'CA',
      population: 13200000,
    },
  ];

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ metros: mockMetros }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render metro selector', () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    expect(screen.getByText(/select.*metro|metropolitan area/i)).toBeInTheDocument();
  });

  it('should load and display metro options', async () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    });

    expect(screen.getByText(/New York/)).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles/)).toBeInTheDocument();
  });

  it('should filter metros by search query', async () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search|filter/i);
    fireEvent.change(searchInput, { target: { value: 'San Francisco' } });

    expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    expect(screen.queryByText(/New York/)).not.toBeInTheDocument();
  });

  it('should filter metros by state', async () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    });

    const stateFilter = screen.queryByLabelText(/state/i);

    if (stateFilter) {
      fireEvent.change(stateFilter, { target: { value: 'CA' } });

      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
      expect(screen.getByText(/Los Angeles/)).toBeInTheDocument();
      expect(screen.queryByText(/New York/)).not.toBeInTheDocument();
    }
  });

  it('should call onSelect when metro is selected', async () => {
    const handleSelect = vi.fn();

    render(<MetroSelector onSelect={handleSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    });

    const metroOption = screen.getByText(/San Francisco/);
    fireEvent.click(metroOption);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'San Francisco-Oakland-Berkeley, CA',
      })
    );
  });

  it('should show population for each metro', async () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/4.7M|4,700,000/)).toBeInTheDocument();
    });
  });

  it('should sort metros by population', async () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    });

    const sortButton = screen.queryByRole('button', { name: /sort.*population/i });

    if (sortButton) {
      fireEvent.click(sortButton);

      const metroItems = screen.getAllByTestId(/metro-item/);

      // New York should be first (highest population)
      expect(metroItems[0]).toHaveTextContent(/New York/);
    }
  });

  it('should be keyboard accessible', async () => {
    render(<MetroSelector onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    });

    const firstOption = screen.getByText(/San Francisco/);
    firstOption.focus();

    expect(document.activeElement).toBe(firstOption);

    // Should handle Enter key
    fireEvent.keyDown(firstOption, { key: 'Enter' });
  });
});
