import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import AmericanImport from '@/components/AmericanImport.vue';
import { nextTick } from 'vue';

// Mock fetch globally
global.fetch = vi.fn();

function createFetchResponse(data: any, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(data) });
}

describe('AmericanImport.vue', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Setup default successful mocks for USD and EUR rates
    global.fetch
      .mockReturnValueOnce(createFetchResponse({ rates: [{ mid: 4.05 }] })) // USD
      .mockReturnValueOnce(createFetchResponse({ rates: [{ mid: 4.35 }] }));  // EUR
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly and fetches initial rates', async () => {
    const wrapper = mount(AmericanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    // Wait for onMounted and fetch calls to complete
    await nextTick(); 
    await nextTick(); 
    await nextTick(); 
    
    expect(wrapper.exists()).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2); // USD and EUR
    expect(global.fetch).toHaveBeenCalledWith('https://api.nbp.pl/api/exchangerates/rates/A/USD/?format=json');
    expect(global.fetch).toHaveBeenCalledWith('https://api.nbp.pl/api/exchangerates/rates/A/EUR/?format=json');
  });

  it('displays main heading', async () => {
    const wrapper = mount(AmericanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    await nextTick();
    expect(wrapper.find('h1').text()).toBe('Kalkulator Importu z USA');
  });

  it('displays initial currency rates info after successful fetch', async () => {
    const wrapper = mount(AmericanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    await nextTick();
    await nextTick();
    await nextTick();

    const ratesBanner = wrapper.find('.rates-banner');
    expect(ratesBanner.exists()).toBe(true);
    expect(ratesBanner.text()).toContain('Aktualne kursy NBP: 1 USD = 4.0500 PLN, 1 EUR = 4.3500 PLN');
  });

  it('displays error banner if rates fetch fails', async () => {
    global.fetch
      .mockReset() 
      .mockReturnValueOnce(Promise.reject(new Error('USD API Error')))
      .mockReturnValueOnce(Promise.reject(new Error('EUR API Error')));

    const wrapper = mount(AmericanImport, {
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

  it('contains price input field for USD', async () => {
    const wrapper = mount(AmericanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    await nextTick();
    // Check for the input within the .input-with-symbol container
    const priceInputContainer = wrapper.find('.input-with-symbol');
    expect(priceInputContainer.exists()).toBe(true);
    expect(priceInputContainer.find('span.currency-symbol').text()).toBe('$');
    
    const priceInput = priceInputContainer.find('input[name="car-price-usd"]');
    expect(priceInput.exists()).toBe(true);
    expect(priceInput.attributes('placeholder')).toBe('np. 15000');
  });

  it('contains "Calculate" button', async () => {
    const wrapper = mount(AmericanImport, {
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
    const wrapper = mount(AmericanImport, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
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
