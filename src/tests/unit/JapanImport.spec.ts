import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import JapanImport from '@/components/JapanImport.vue';
import { nextTick } from 'vue';

// Mock fetch globally
global.fetch = vi.fn();

function createFetchResponse(data: any, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(data) });
}

describe('JapanImport.vue', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Setup default successful mocks for JPY and EUR rates
    global.fetch
      .mockReturnValueOnce(createFetchResponse({ rates: [{ mid: 0.028 }] })) // JPY
      .mockReturnValueOnce(createFetchResponse({ rates: [{ mid: 4.3 }] }));  // EUR
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly and fetches initial rates', async () => {
    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    // Wait for onMounted and fetch calls to complete
    await nextTick(); // For initial setup
    await nextTick(); // For isLoading to turn false
    await nextTick(); // For rates to potentially update DOM
    
    expect(wrapper.exists()).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2); // JPY and EUR
    expect(global.fetch).toHaveBeenCalledWith('https://api.nbp.pl/api/exchangerates/rates/A/JPY/?format=json');
    expect(global.fetch).toHaveBeenCalledWith('https://api.nbp.pl/api/exchangerates/rates/A/EUR/?format=json');
  });

  it('displays main heading', async () => {
    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    await nextTick(); // Ensure component is mounted and stable
    expect(wrapper.find('h1').text()).toBe('Kalkulator Importu z Japonii');
  });

  it('displays initial currency rates info after successful fetch', async () => {
    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    // Wait for onMounted and fetch calls
    await nextTick(); // initial mount
    await nextTick(); // isLoading state change
    await nextTick(); // DOM update with rates

    const ratesBanner = wrapper.find('.rates-banner');
    expect(ratesBanner.exists()).toBe(true);
    expect(ratesBanner.text()).toContain('Aktualne kursy NBP: 1 JPY = 0.0280 PLN, 1 EUR = 4.3000 PLN');
  });
  
  it('displays error banner if rates fetch fails', async () => {
    global.fetch
      .mockReset() // Clear default mocks
      .mockReturnValueOnce(Promise.reject(new Error('JPY API Error')))
      .mockReturnValueOnce(Promise.reject(new Error('EUR API Error')));

    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    
    await nextTick();
    await nextTick();
    await nextTick();

    const errorBanner = wrapper.find('.error-banner');
    expect(errorBanner.exists()).toBe(true);
    expect(errorBanner.text()).toContain('Błąd pobierania kursów walut.');
  });


  it('contains price input field for JPY', async () => {
    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    await nextTick();
    const priceInput = wrapper.find('input[name="car-price-jpy"]');
    expect(priceInput.exists()).toBe(true);
    expect(priceInput.attributes('placeholder')).toBe('np. 1250000');
  });

  it('contains "Calculate" button', async () => {
    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    await nextTick();
    const calculateButton = wrapper.find('button.btn-primary');
    expect(calculateButton.exists()).toBe(true);
    expect(calculateButton.text()).toBe('Oblicz Pełne Koszty');
  });

  it('contains "Return to Home" button', async () => {
    const wrapper = mount(JapanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub, // Important for testing router-link
        },
      },
    });
    await nextTick();
    const backButton = wrapper.findComponent(RouterLinkStub);
    expect(backButton.exists()).toBe(true);
    expect(backButton.props().to).toBe('/');
    expect(backButton.text()).toContain('Powrót na stronę główną');
  });
});
