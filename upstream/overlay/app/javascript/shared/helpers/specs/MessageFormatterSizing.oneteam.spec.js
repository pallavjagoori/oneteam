/**
 * OneTeam spec for MessageFormatter's image sizing and empty table cells:
 * an image URL's cw_image_width wins over cw_image_height, and empty cells
 * get a non-breaking space so they keep their height.
 */
import MessageFormatter from '../MessageFormatter';

const render = text => new MessageFormatter(text).formattedMessage;

describe('MessageFormatter image sizing', () => {
  it('sizes an image by its width, keeping it inside its container', () => {
    expect(
      render(
        '![a](https://cdn.test/a.png?cw_image_width=320px&cw_image_height=10px)'
      )
    ).toContain('style="width: 320px; max-width: 100%; height: auto;"');
  });

  it('falls back to the height, and leaves other images alone', () => {
    expect(
      render('![a](https://cdn.test/a.png?cw_image_height=24px)')
    ).toContain('style="height: 24px;"');
    expect(render('![a](https://cdn.test/a.png)')).not.toContain('style=');
  });
});

describe('MessageFormatter tables', () => {
  it('fills empty header and body cells with a non-breaking space', () => {
    const html = render('| A |  |\n| --- | --- |\n|  | 2 |');
    expect(html).toContain('<th> </th>');
    expect(html).toContain('<td> </td>');
    expect(html).toContain('<td>2</td>');
  });
});
