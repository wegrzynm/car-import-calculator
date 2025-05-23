import { describe, it, expect } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import HomeView from '@/components/HomeView.vue';

describe('HomeView.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('displays main heading', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    expect(wrapper.find('h1').text()).toBe('Kalkulator Importu Pojazdów');
  });

  it('displays introduction heading', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    expect(wrapper.find('.section-title').text()).toBe('Twój Klucz do Importu Bez Niespodzianek');
  });

  it('contains calculator links', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
    const links = wrapper.findAllComponents(RouterLinkStub);

    const japanLink = links.find(link => link.props().to === '/import-japonia');
    expect(japanLink).toBeDefined();
    expect(japanLink?.text()).toContain('Kalkulator importu z Japonii');
    
    const usaLink = links.find(link => link.props().to === '/import-usa');
    expect(usaLink).toBeDefined();
    expect(usaLink?.text()).toContain('Kalkulator importu z USA');
  });
});
