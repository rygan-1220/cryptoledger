import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Navbar from '../../components/Navbar.vue';

// Stub vue-router's useRouter/useRoute which Navbar likely uses
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/dashboard' }),
}));

describe('Navbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders', () => {
    const wrapper = mount(Navbar, {
      global: {
        stubs: {
          // Stub the router-link component since we don't have a router
          'router-link': {
            template: '<a><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });
});
