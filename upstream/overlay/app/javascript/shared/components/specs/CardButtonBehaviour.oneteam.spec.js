/**
 * OneTeam behaviour spec for the widget card action button.
 *
 * Covers link actions (styled with the widget colour), postback actions
 * that notify the parent iframe, postbacks outside an iframe, and other
 * action types that do nothing when clicked.
 */
import { mount } from '@vue/test-utils';
import { IFrameHelper } from 'widget/helpers/utils';
import CardButton from '../CardButton.vue';

/**
 * Mounts the button with a fake store holding the widget colour.
 *
 * @param {object} action Card action passed as the prop.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountButton = action =>
  mount(CardButton, {
    props: { action },
    global: {
      mocks: { $store: { getters: { 'appConfig/getWidgetColor': '#000000' } } },
    },
  });

describe('CardButton behaviour', () => {
  it('renders link actions as an anchor in the widget colour', () => {
    const wrapper = mountButton({
      type: 'link',
      uri: 'https://x.test',
      text: 'Open',
    });
    const link = wrapper.get('a');
    expect(link.attributes('href')).toBe('https://x.test');
    expect(link.text()).toBe('Open');
    expect(link.attributes('style')).toContain('color');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('sends postbacks to the parent iframe', async () => {
    vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
    const send = vi
      .spyOn(IFrameHelper, 'sendMessage')
      .mockImplementation(() => {});
    const wrapper = mountButton({
      type: 'postback',
      payload: 'yes',
      text: 'Yes',
    });
    await wrapper.get('button').trigger('click');
    expect(send).toHaveBeenCalledWith({
      event: 'postback',
      data: { payload: 'yes' },
    });
  });

  it('ignores postbacks outside an iframe and other action types', async () => {
    vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(false);
    const send = vi
      .spyOn(IFrameHelper, 'sendMessage')
      .mockImplementation(() => {});
    await mountButton({ type: 'postback', payload: 'p', text: 'P' })
      .get('button')
      .trigger('click');
    await mountButton({ type: 'other', payload: 'o', text: 'O' })
      .get('button')
      .trigger('click');
    expect(send).not.toHaveBeenCalled();
  });

  it('defaults the action prop to an empty value', () => {
    expect(CardButton.props.action.default()).toBeUndefined();
  });
});
