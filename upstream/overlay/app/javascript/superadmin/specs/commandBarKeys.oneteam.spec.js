/**
 * OneTeam spec for the super admin command bar paths the upstream spec
 * leaves out: ArrowUp, Tab and other keys, hovering an item, and clicks on
 * the backdrop, a dialog opener or the list.
 */
import { initializeCommandBar } from '../commandBar';

const BAR = `
  <dialog data-command-bar open>
    <input data-command-input>
    <div role="group" data-command-group="Go to">
      <div role="option" data-command-item data-name="accounts"><a href="/a">Accounts</a></div>
      <div role="option" data-command-item data-name="users"><a href="/u">Users</a></div>
      <div role="option" data-command-item data-command-method="post" data-name="reset">
        <button type="button">Reset cache</button>
      </div>
      <div role="option" data-command-item data-name="delete-dialog">
        <button type="button" data-dialog-open="confirm">Delete</button>
      </div>
    </div>
  </dialog>`;

HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
Element.prototype.scrollIntoView = vi.fn();

describe('command bar keys and pointer', () => {
  let bar;
  // The selected item takes the id the input points at, so name items another way.
  const selected = () =>
    bar.querySelector('[aria-selected="true"]')?.dataset.name;
  const press = key => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    bar.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    document.body.innerHTML = BAR;
    bar = document.querySelector('[data-command-bar]');
    initializeCommandBar();
  });

  it('wraps ArrowUp from the first item to the last', () => {
    expect(selected()).toBe('accounts');
    press('ArrowUp');
    expect(selected()).toBe('delete-dialog');
    press('ArrowUp');
    expect(selected()).toBe('reset');
  });

  it('swallows Tab but lets other keys through', () => {
    expect(press('Tab').defaultPrevented).toBe(true);
    expect(press('a').defaultPrevented).toBe(false);
    expect(selected()).toBe('accounts');
  });

  it('selects a safe item on hover, never one that changes data', () => {
    bar
      .querySelector('[data-name="users"] a')
      .dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(selected()).toBe('users');
    bar
      .querySelector('[data-name="reset"] button')
      .dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(selected()).toBe('users');
    bar.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(selected()).toBe('users');
  });

  it('closes on the backdrop or a dialog opener, else keeps the input focused', () => {
    const input = bar.querySelector('input');
    bar
      .querySelector('[data-name="users"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.activeElement).toBe(input);
    expect(bar.open).toBe(true);
    bar
      .querySelector('[data-dialog-open]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(bar.open).toBe(false);
    bar.showModal();
    bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(bar.open).toBe(false);
  });
});
