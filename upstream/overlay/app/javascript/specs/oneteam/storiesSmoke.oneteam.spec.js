/**
 * OneTeam render smoke tests for Chatwoot's Histoire stories.
 *
 * Stories are design-system demos that only run inside Histoire, which
 * provides the global Story and Variant wrappers. Here those wrappers are
 * replaced by components that simply render their slots, so each story's
 * template (its sample data and prop combinations) renders once with the
 * usual store, router and shallow children.
 */
import { defineSmokeSuite, loadStore } from './renderHarness';

/**
 * Stand-in for Histoire's Story: renders its variants and controls.
 */
const Story = {
  name: 'Story',
  template: '<section><slot /><slot name="controls" /></section>',
};

/**
 * Stand-in for Histoire's Variant: renders its demo and controls. The
 * default slot gets an empty state object, like Histoire's variant state.
 */
const Variant = {
  name: 'Variant',
  template:
    '<article><slot :state="{}" /><slot name="controls" :state="{}" /></article>',
};

defineSmokeSuite({
  title: 'Histoire stories render smoke',
  modules: import.meta.glob('../../**/*.story.vue'),
  loadStore,
  components: { Story, Variant },
  before: () => {
    window.chatwootConfig = { hostURL: 'https://app.example.test' };
  },
});
