/**
 * OneTeam behaviour spec for the article draft diff panel.
 *
 * Covers opening/closing the side panel, showing the title diff only
 * when the draft title differs, content blocks marked added/removed/
 * unchanged, empty blocks, table column widths (sized and default),
 * and turning solo video links into players (saved width, invalid
 * widths, non-video links and links with surrounding text).
 */
import { mount } from '@vue/test-utils';
import ArticleDiffPanel from '../ArticleDiffPanel.vue';

const env = vi.hoisted(() => ({}));

const Panel = {
  name: 'SidePanel',
  methods: { open: () => env.panel.open(), close: () => env.panel.close() },
  template: '<div><slot name="header" /><slot /></div>',
};

const mountPanel = article =>
  mount(ArticleDiffPanel, {
    props: article === undefined ? {} : { article },
    global: {
      stubs: { SidePanel: Panel },
      directives: {
        dompurifyHtml: {
          mounted: (el, { value }) => {
            el.innerHTML = value;
          },
          updated: (el, { value }) => {
            el.innerHTML = value;
          },
        },
      },
    },
  });

const blocks = wrapper => wrapper.findAll('.prose');

describe('ArticleDiffPanel behaviour', () => {
  beforeEach(() => {
    env.panel = { open: vi.fn(), close: vi.fn() };
  });

  it('opens and closes the side panel', () => {
    const wrapper = mountPanel();
    wrapper.vm.open();
    wrapper.vm.close();
    expect(env.panel.open).toHaveBeenCalled();
    expect(env.panel.close).toHaveBeenCalled();
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(blocks(wrapper)).toHaveLength(0);
  });

  it('shows title and content changes', () => {
    const wrapper = mountPanel({
      title: 'Old title',
      draftTitle: 'New title',
      content: 'Same para\n\nRemoved para',
      draftContent: 'Same para\n\nAdded para',
    });
    expect(wrapper.find('h1').html()).toMatch(/New|Old/);
    const classes = blocks(wrapper).map(b =>
      b
        .classes()
        .find(c => c.startsWith('border-n-') || c === 'border-transparent')
    );
    expect(classes).toContain('border-transparent');
    expect(classes).toContain('border-n-teal-9');
    expect(classes).toContain('border-n-ruby-9');
  });

  it('falls back to live values when there is no draft', () => {
    const wrapper = mountPanel({ title: 'Same', content: 'Body' });
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(blocks(wrapper)).toHaveLength(0);
    expect(mountPanel({ draftContent: 'Only draft' }).text()).toContain(
      'Only draft'
    );
    expect(mountPanel(null).find('h1').exists()).toBe(false);
  });

  it('applies saved table column widths', () => {
    const table =
      '| A | B |\n| --- | --- |\n| 1 | 2 |\n<!--cw-colwidths:120,0-->';
    const wrapper = mountPanel({ content: '', draftContent: table });
    const el = wrapper.find('table').element;
    expect([...el.querySelectorAll('col')].map(c => c.style.width)).toEqual([
      '120px',
      '50px',
    ]);
    expect(el.style.tableLayout).toBe('fixed');
    expect(el.style.width).toBe('170px');

    const noTable = mountPanel({
      content: '',
      draftContent: 'Text <!--cw-colwidths:10-->',
    });
    expect(noTable.find('col').exists()).toBe(false);
  });

  it('turns solo video links into players', () => {
    const content = [
      'https://cdn.example.com/a.mp4?cw_video_width=320px',
      'https://cdn.example.com/b.mp4?cw_video_width=5000px',
      'https://cdn.example.com/c.mp4',
      'https://example.com/page',
      'Watch https://cdn.example.com/d.mp4 now',
    ].join('\n\n');
    const wrapper = mountPanel({ content: '', draftContent: content });
    const videos = wrapper.findAll('video');
    expect(videos.map(v => v.attributes('width'))).toEqual([
      '320',
      '640',
      '640',
    ]);
    expect(videos[0].attributes('src')).toContain('a.mp4');
    expect(wrapper.findAll('a').map(a => a.attributes('href'))).toEqual(
      expect.arrayContaining(['https://example.com/page'])
    );
    expect(wrapper.text()).toContain('Watch');
  });

  it('ignores anchors without an href', () => {
    const wrapper = mountPanel({
      content: '',
      draftContent: '<p><a name="x">anchor</a></p>',
    });
    expect(wrapper.find('video').exists()).toBe(false);
  });
});
