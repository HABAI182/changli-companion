import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function PositionPresets({ native, fail }: { native: boolean; fail: (e: unknown) => void }) {
  const [slots, setSlots] = useState([1, 2, 3].map(slot => ({ slot, saved: false })));
  const [busy, setBusy] = useState(false);
  const refresh = async () => setSlots(await invoke('list_pet_positions'));
  useEffect(() => {
    if (native) void refresh().catch(fail);
  }, [native]);
  const act = async (slot: number, save: boolean) => {
    setBusy(true);
    try {
      await invoke(save ? 'save_pet_position' : 'restore_pet_position', { slot });
      await refresh();
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };
  return <div className="position-presets" aria-label="常用位置">
    <div className="position-heading"><strong>常用位置</strong><small>回到位置时保留当前大小</small></div>
    {slots.map(({ slot, saved }) => <div className="position-row" key={slot}>
      <span>位置 {slot}<small>{saved ? '已保存' : '未保存'}</small></span>
      <button type="button" disabled={!native || busy} aria-label={`保存位置${slot}`} onClick={() => void act(slot, true)}>保存</button>
      <button type="button" disabled={!native || busy || !saved} aria-label={`回到位置${slot}`} onClick={() => void act(slot, false)}>回到这里</button>
    </div>)}
  </div>;
}
