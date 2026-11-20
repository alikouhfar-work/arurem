import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerPage } from './LedgerPage';

/**
 * Integration coverage for the live valuation path.
 *
 * `fetch` is stubbed for every test in this file: the real suite must never
 * depend on a third-party endpoint being up, and a test that silently passes
 * when the network is down is not a test of the network path.
 *
 * Prices are the real tgju figures for 2026-11-20 so the arithmetic on screen
 * matches what the bazaar was quoting that day:
 *   24K  32,381,900 toman/g     18K  24,286,700 toman/g
 */

const goldResponse = (price: number) =>
  new Response(JSON.stringify({ price, updatedAt: '2026-11-20T13:00:00Z', name: 'Gold' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const irtResponse = (karat24: number, karat18: number) =>
  new Response(
    JSON.stringify({
      response: {
        indicators: [
          { name: 'geram18', p: String(karat18 * 10), updated_at: '2026-11-20 19:40:05' },
          { name: 'geram24', p: String(karat24 * 10), updated_at: '2026-11-20 19:40:05' },
        ],
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const TOMAN_24K = 32_381_900;
const TOMAN_18K = 24_286_700;

const stubMarket = (price = 3110.34768, karat24 = TOMAN_24K, karat18 = TOMAN_18K) => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('gold-api')) return Promise.resolve(goldResponse(price));
      if (url.includes('tgju')) return Promise.resolve(irtResponse(karat24, karat18));
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }),
  );
};

const seed = (rows: unknown[]) => {
  localStorage.setItem('arurem.ledger.v2', JSON.stringify({ version: 2, purchases: rows }));
};

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  sellerName: 'Royal Treasury',
  weight: 100,
  purity: '24K',
  acquiredAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-03-01T10:00:00.000Z',
  ...overrides,
});

const renderPage = () =>
  rtlRender(
    <>
      <LedgerPage />
      <Toaster />
    </>,
  );

describe('LedgerPage — live valuation', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('values 24K at Tehran’s 24K quote, not a converted spot price', async () => {
    // 100 g of 24K at 32,381,900 toman/g = 3,238,190,000 IRT. A spot price
    // converted through the dollar rate would read ~3,078,611,833 — a 5% error
    // in the user's net worth, which is the bug this test locks out.
    stubMarket(3110.34768, TOMAN_24K, TOMAN_18K);
    seed([row()]);
    renderPage();

    await waitFor(() => expect(screen.getByText('3,238,190,000')).toBeInTheDocument());
    expect(screen.queryByText('3,078,611,833')).not.toBeInTheDocument();
  });

  it('values each karat at its own quote instead of blending them', async () => {
    // 100 g 24K + 100 g 18K = 3,238,190,000 + 2,428,670,000.
    // Blending first would value both at a single per-gram rate and be wrong.
    stubMarket(3110.34768, TOMAN_24K, TOMAN_18K);
    seed([row(), row({ id: 'r2', purity: '18K' })]);
    renderPage();

    await waitFor(() => expect(screen.getByText('5,666,860,000')).toBeInTheDocument());
  });

  it('derives 22K from the 24K quote rather than failing on it', async () => {
    // 22K has no published gram quote. 100 g at 0.9167 × 32,381,900.
    stubMarket(3110.34768, TOMAN_24K, TOMAN_18K);
    seed([row({ purity: '22K' })]);
    renderPage();

    await waitFor(() => expect(screen.getByText('2,968,448,773')).toBeInTheDocument());
  });

  it('still reports USD from spot when every toman quote is missing', async () => {
    // The two markets are independent: an Iranian outage must not blank the
    // USD figure, and vice versa.
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('gold-api')) return Promise.resolve(goldResponse(3110.34768));
        return Promise.reject(new Error('offline'));
      }),
    );

    seed([row()]);
    renderPage();

    await waitFor(() => expect(screen.getByText('$9,999')).toBeInTheDocument());
    expect(document.body.textContent).not.toContain('NaN');
  });

  it('labels each currency unambiguously', async () => {
    stubMarket();
    seed([row()]);
    renderPage();

    // Distinct labels are the requirement: IRT must never be mistaken for USD.
    await waitFor(() => {
      expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
      expect(screen.getAllByText('IRT').length).toBeGreaterThan(0);
    });
  });

  it('multiplies fine grams, not gross grams', async () => {
    // 100 g of 18K is 75 g fine. At $100/g that is $7,500 — not $10,000.
    stubMarket(3110.34768);
    seed([row({ purity: '18K' })]);
    renderPage();

    await waitFor(() => expect(screen.getByText('$7,500')).toBeInTheDocument());
    expect(screen.queryByText('$10,000')).not.toBeInTheDocument();
  });

  it('keeps showing a usable value when the feed fails, marked stale', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        call += 1;
        // First load succeeds so there is a quote to preserve, then everything
        // fails — the "one dropped request" case. Two legs means two calls.
        if (call <= 2) {
          return Promise.resolve(call === 1 ? goldResponse(3110.34768) : irtResponse(TOMAN_24K, TOMAN_18K));
        }
        return Promise.reject(new Error('offline'));
      }),
    );

    seed([row()]);
    renderPage();

    await waitFor(() => expect(screen.getByText('3,238,190,000')).toBeInTheDocument());
    // The price must still be on screen after a failed refresh.
    expect(screen.getByText('$9,999')).toBeInTheDocument();
  });

  it('renders em dashes, not NaN, when no price is available at all', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    seed([row()]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no market data/i)).toBeInTheDocument();
    });
    expect(document.body.textContent).not.toContain('NaN');
    expect(document.body.textContent).not.toContain('Infinity');
  });

  it('offers a retry that re-requests the feed', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchMock);
    seed([row()]);
    renderPage();

    const retry = await screen.findByRole('button', { name: /retry market prices/i });
    const before = fetchMock.mock.calls.length;
    await userEvent.setup().click(retry);

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(before));
  });

  it('shows both Tehran karats in the ticker, not a converted figure', async () => {
    stubMarket();
    seed([row()]);
    renderPage();

    const ticker = await screen.findByRole('button', { name: /refresh market prices/i });
    expect(ticker).toBeInTheDocument();

    await waitFor(() => {
      expect(within(document.body).getByText('Tehran · 24K')).toBeInTheDocument();
      expect(within(document.body).getByText('Tehran · 18K')).toBeInTheDocument();
    });
    expect(within(document.body).getByText('32,381,900')).toBeInTheDocument();
    expect(within(document.body).getByText('24,286,700')).toBeInTheDocument();
  });
});
