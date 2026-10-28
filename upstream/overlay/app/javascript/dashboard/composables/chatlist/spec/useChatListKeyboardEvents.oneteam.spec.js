import { ref } from 'vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useChatListKeyboardEvents } from '../useChatListKeyboardEvents';

/*
 * OneTeam coverage for Alt+J / Alt+K moving through the conversation list.
 * The list is real DOM; each conversation records when it is clicked.
 */
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

const buildList = (count, active) => {
  const root = document.createElement('div');
  const list = document.createElement('div');
  list.className = 'conversations-list';
  root.appendChild(list);
  const clicked = [];
  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');
    item.className = i === active ? 'conversation active' : 'conversation';
    item.addEventListener('click', () => clicked.push(i));
    list.appendChild(item);
  }
  return { root, clicked };
};

const press = (root, key) => {
  useChatListKeyboardEvents(ref(root));
  const [[events]] = useKeyboardEvents.mock.calls.slice(-1);
  events[key].action();
};

describe('useChatListKeyboardEvents (OneTeam)', () => {
  it('moves to the previous and next conversation', () => {
    const { root, clicked } = buildList(3, 1);
    press(root, 'Alt+KeyJ');
    press(root, 'Alt+KeyK');
    expect(clicked).toEqual([0, 2]);
  });

  it('stays at the ends of the list', () => {
    const first = buildList(3, 0);
    press(first.root, 'Alt+KeyJ');
    expect(first.clicked).toEqual([0]);
    const last = buildList(3, 2);
    press(last.root, 'Alt+KeyK');
    expect(last.clicked).toEqual([2]);
  });

  it('opens the first conversation when none is active', () => {
    const { root, clicked } = buildList(2, -1);
    press(root, 'Alt+KeyK');
    expect(clicked).toEqual([0]);
  });

  it('does nothing on an empty list', () => {
    const { root, clicked } = buildList(0, -1);
    press(root, 'Alt+KeyK');
    press(root, 'Alt+KeyJ');
    expect(clicked).toEqual([]);
  });
});
