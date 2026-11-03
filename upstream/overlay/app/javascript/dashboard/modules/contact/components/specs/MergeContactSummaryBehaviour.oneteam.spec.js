/**
 * OneTeam behaviour spec for the merge contacts summary.
 *
 * Covers hiding it until a parent contact is picked and naming both
 * contacts in the warnings.
 */
import { mount } from '@vue/test-utils';
import MergeContactSummary from '../MergeContactSummary.vue';

/**
 * Mounts the summary.
 *
 * @param {object} props Summary props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSummary = props =>
  mount(MergeContactSummary, {
    props,
    global: {
      mocks: { $t: (key, args) => `${key} ${JSON.stringify(args ?? {})}` },
      directives: {
        dompurifyHtml: (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });

describe('MergeContactSummary behaviour', () => {
  it('stays hidden without a parent contact', () => {
    expect(mountSummary({ primaryContactName: 'Ann' }).html()).toBe(
      '<!--v-if-->'
    );
  });

  it('names both contacts in the warnings', () => {
    const wrapper = mountSummary({
      primaryContactName: 'Ann',
      parentContactName: 'Bob',
    });
    const items = wrapper.findAll('li');
    expect(items[0].text()).toContain(
      'MERGE_CONTACTS.SUMMARY.DELETE_WARNING {"primaryContactName":"Ann"}'
    );
    expect(items[1].text()).toContain(
      'MERGE_CONTACTS.SUMMARY.ATTRIBUTE_WARNING {"primaryContactName":"Ann","parentContactName":"Bob"}'
    );
  });
});
