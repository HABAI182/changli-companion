import { describe, it, expect } from 'vitest';
import { browserVirtualKey, keyRegion, model, resource, validateModel } from '../src/model';
import {
  canRenderLayers,
  layerManifest,
  missingLayers,
  validateLayerManifest,
} from '../src/renderer/layered/layerManifest';
import { chooseConfiguredRenderer, chooseRenderer } from '../src/renderer/RendererHost';
import { CharacterMachine } from '../src/domain';
describe('模型输入配置', () => {
  it('左右键区由 model.json 决定', () => {
    for (const code of ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyA','KeyS','KeyD','KeyF','KeyG',
      'KeyZ','KeyX','KeyC','KeyV','KeyB','Digit1','Digit5','Tab','CapsLock','ShiftLeft','F1','F5'])
      expect(keyRegion(browserVirtualKey(code)), code).toBe('keyboard_left');
    for (const code of ['KeyY','KeyU','KeyI','KeyO','KeyP','KeyH','KeyJ','KeyK','KeyL',
      'KeyN','KeyM','Digit6','Digit0','Minus','Semicolon','Slash','Enter','Backspace',
      'ShiftRight','F6','F12','ArrowLeft','Numpad1'])
      expect(keyRegion(browserVirtualKey(code)), code).toBe('keyboard_right');
  });
  it('四个基础状态可以立即切换并恢复 idle', () => {
    const m = new CharacterMachine(0);
    m.signal('keyboard_left', 2000);
    expect(m.pose).toBe('keyboard_left');
    m.signal('keyboard_right', 2001);
    expect(m.pose).toBe('keyboard_right');
    m.signal('left', 2002);
    expect(m.pose).toBe('mouse');
    m.tick(2500);
    expect(m.pose).toBe('idle');
  });
  it('模型至少提供八个表情槽和两个独立动画槽，缺失素材不伪装为已接入', () => {
    expect(model.expressions.length).toBeGreaterThanOrEqual(8);
    expect(model.animations.length).toBeGreaterThanOrEqual(2);
    expect(model.expressions.every((e) => e.asset === null)).toBe(true);
    expect(model.animations.filter((a) => a.id !== 'phoenix').every((a) => a.status === 'awaiting-art')).toBe(true);
    expect(model.animations.find((a) => a.id === 'phoenix')?.status).toBe('technical-placeholder');
  });
  it('资源路径不可跳出模型目录或访问网络', () => {
    expect(resource('assets/test.png')).toBe('/models/changli/assets/test.png');
    expect(() => resource('../secret')).toThrow();
    expect(() => resource('https://example.com/a.png')).toThrow();
  });
  it('v2 配置含 25 个隔离动作槽与 5 个播放器定义', () => {
    expect(validateModel(model)).toBe(true);
    expect(model.shortcuts).toHaveLength(25);
    expect(model.shortcuts.filter((s) => s.enabled)).toHaveLength(8);
    expect(model.animations).toHaveLength(5);
    expect(validateModel({ ...model, shortcuts: model.shortcuts.slice(1) })).toBe(false);
  });
  it('正式分层缺素材时稳定回退为原造型预览', () => {
    expect(validateLayerManifest(layerManifest)).toBe(true);
    expect(missingLayers(layerManifest).length).toBeGreaterThan(0);
    expect(canRenderLayers(layerManifest)).toBe(false);
    expect(chooseRenderer('live2d', false, canRenderLayers(layerManifest))).toBe('sprite');
    expect(chooseRenderer('layered', false, true)).toBe('layered');
    expect(chooseConfiguredRenderer('auto', 'live/Changli.model3.json', false)).toBe('live2d');
    expect(chooseConfiguredRenderer('layered2d', 'live/Changli.model3.json', false)).toBe('sprite');
    expect(chooseConfiguredRenderer('live2d', null, true)).toBe('layered');
  });
});
