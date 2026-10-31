/**
 * OneTeam behaviour spec for the shared files list in the conversation
 * sidebar.
 *
 * Covers filtering out media and non-file attachments, newest-first
 * sorting, names, sizes and timestamps with their fallbacks, the peek
 * limit toggle, selecting rows by click and keyboard, jumping to the
 * message, and downloading (with the loading state and failures).
 */
import { mount, flushPromises } from '@vue/test-utils';
import { downloadFile } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import Files from '../Files.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: vi.fn(),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => value => `exact ${value}`,
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: value => `dyn ${value}`,
  shortTimestamp: value => `short ${value}`,
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :data-loading="String(!!isLoading)" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const pdf = {
  id: 1,
  file_type: 'file',
  data_url: '/f/report%20q3.pdf',
  file_size: 2048,
  extension: 'PDF',
  created_at: 30,
  message_id: 9,
};
const sheet = {
  id: 2,
  file_type: 'file',
  data_url: '/f/',
  extension: 'xlsx',
  created_at: 20,
};
const bare = { id: 3, file_type: 'file', data_url: '/f/notes' };
const image = { id: 4, file_type: 'image', data_url: '/f/a.png' };
const location = { id: 5, file_type: 'location', data_url: '/f/loc' };
const noUrl = { id: 6, file_type: 'file' };

const mountFiles = props =>
  mount(Files, {
    props: {
      attachments: [bare, image, sheet, location, pdf, noUrl],
      ...props,
    },
    global: {
      stubs: {
        NextButton,
        FileIcon: {
          props: ['fileType'],
          template: '<b :data-type="fileType" />',
        },
      },
      directives: { tooltip: {} },
    },
  });

const rows = wrapper => wrapper.findAll('li');
const rowButton = (row, icon) => row.find(`[data-icon="${icon}"]`);

describe('Shared files behaviour', () => {
  it('renders nothing without files', () => {
    expect(
      mount(Files, { props: { attachments: [image] } })
        .find('section')
        .exists()
    ).toBe(false);
    expect(mount(Files).find('section').exists()).toBe(false);
  });

  it('lists files newest first with names, sizes and timestamps', () => {
    const wrapper = mountFiles();
    expect(wrapper.find('h4').text()).toContain('3');
    expect(rows(wrapper)).toHaveLength(3);
    const [first, second, third] = rows(wrapper);
    expect(first.text()).toContain('report q3.pdf');
    expect(first.text()).toContain('2 KB');
    expect(first.text()).toContain('short dyn 30');
    expect(first.find('b').attributes('data-type')).toBe('pdf');
    expect(second.text()).toContain(
      'CONVERSATION_SIDEBAR.SHARED_FILES.UNTITLED_FILE'
    );
    expect(second.text()).toContain('XLSX');
    expect(third.text()).toContain('notes');
    expect(third.text()).toContain('—');
    expect(third.text()).not.toContain('·');
    expect(third.find('b').attributes('data-type')).toBe('');
    expect(rowButton(first, 'i-lucide-external-link').exists()).toBe(false);
    expect(wrapper.find('header button').exists()).toBe(false);
  });

  it('ignores attachments with an empty url', () => {
    const wrapper = mount(Files, {
      props: { attachments: [{ id: 7, file_type: 'file', data_url: '' }] },
    });
    expect(wrapper.find('section').exists()).toBe(false);
  });

  it('peeks at a few files and toggles the full list', async () => {
    const wrapper = mountFiles({ peekLimit: 2 });
    expect(rows(wrapper)).toHaveLength(2);
    const toggle = wrapper.find('header button');
    expect(toggle.text()).toBe('CONVERSATION_SIDEBAR.SHARED_FILES.VIEW_ALL');
    expect(toggle.attributes('data-icon')).toBe('i-lucide-chevron-right');
    await toggle.trigger('click');
    expect(rows(wrapper)).toHaveLength(3);
    expect(toggle.text()).toBe('CONVERSATION_SIDEBAR.SHARED_FILES.SHOW_LESS');
    expect(toggle.attributes('data-icon')).toBe('i-lucide-chevron-up');
    await toggle.trigger('click');
    expect(rows(wrapper)).toHaveLength(2);
  });

  it('hides the toggle when the files fit the peek limit', () => {
    const wrapper = mountFiles({ peekLimit: 5 });
    expect(rows(wrapper)).toHaveLength(3);
    expect(wrapper.find('header button').exists()).toBe(false);
  });

  it('selects a file by click, enter and space', async () => {
    const wrapper = mountFiles();
    const row = rows(wrapper)[0];
    await row.trigger('click');
    await row.trigger('keydown', { key: 'Enter' });
    await row.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('select')).toEqual([[pdf], [pdf], [pdf]]);
  });

  it('jumps to the message without selecting the row', async () => {
    const wrapper = mountFiles({ showJumpToMessage: true });
    const [first, second] = rows(wrapper);
    expect(rowButton(second, 'i-lucide-external-link').exists()).toBe(false);
    const jump = rowButton(first, 'i-lucide-external-link');
    await jump.trigger('click');
    await jump.trigger('keydown', { key: 'Enter' });
    await jump.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('jumpToMessage')).toEqual([[pdf]]);
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('downloads a file with a loading state', async () => {
    let finish;
    downloadFile.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const wrapper = mountFiles();
    const download = () => rowButton(rows(wrapper)[0], 'i-lucide-download');
    await download().trigger('keydown', { key: 'Enter' });
    await download().trigger('keydown', { key: ' ' });
    await download().trigger('click');
    expect(downloadFile).toHaveBeenCalledWith({
      url: '/f/report%20q3.pdf',
      type: 'file',
      extension: 'PDF',
    });
    expect(download().attributes('data-loading')).toBe('true');
    expect(wrapper.emitted('select')).toBeUndefined();
    finish();
    await flushPromises();
    expect(download().attributes('data-loading')).toBe('false');
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('alerts when a download fails', async () => {
    downloadFile.mockRejectedValue(new Error('offline'));
    const wrapper = mountFiles();
    await rowButton(rows(wrapper)[1], 'i-lucide-download').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION_SIDEBAR.SHARED_FILES.DOWNLOAD_ERROR'
    );
    expect(
      rowButton(rows(wrapper)[1], 'i-lucide-download').attributes(
        'data-loading'
      )
    ).toBe('false');
  });
});
