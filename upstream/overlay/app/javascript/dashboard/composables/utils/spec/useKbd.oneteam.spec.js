import { useKbd, getModifierKey } from '../useKbd';

/*
 * OneTeam coverage for keyboard shortcut labels, which differ between macOS
 * and other systems. The platform is set through navigator stubs.
 */
const setPlatform = ({ uaPlatform, platform = 'Win32' }) => {
  vi.stubGlobal('navigator', {
    platform,
    userAgentData: uaPlatform ? { platform: uaPlatform } : undefined,
  });
};

describe('useKbd (OneTeam)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses Mac symbols when the browser reports macOS', () => {
    setPlatform({ uaPlatform: 'macOS' });
    expect(useKbd(['$mod', 'alt', 'option', 'k']).value).toBe('⌘ ⌥ ⌥ K');
    expect(getModifierKey()).toBe('⌘');
  });

  it('falls back to navigator.platform for Macs and iPhones', () => {
    setPlatform({ platform: 'MacIntel' });
    expect(getModifierKey()).toBe('⌘');
    setPlatform({ platform: 'iPhone' });
    expect(getModifierKey()).toBe('⌘');
  });

  it('uses Ctrl and Alt elsewhere', () => {
    setPlatform({ uaPlatform: 'Windows' });
    expect(
      useKbd(['$mod', 'shift', 'alt', 'option', 'ctrl', 'cmd']).value
    ).toBe('CTRL ⇧ ALT ALT CTRL ⌘');
    setPlatform({ platform: 'Linux x86_64' });
    expect(useKbd(['enter', 'tab', 'esc']).value).toBe('↵ ⇥ ⎋');
    expect(getModifierKey()).toBe('Ctrl');
  });
});
