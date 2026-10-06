(function (global) {
  'use strict';
  const VERSION = 1, STEPS = 16, ROWS = 9, MAX_PLANTS = 48;
  const TIMBRES = Object.freeze(['bell', 'reed', 'pluck']);
  const PITCHES = Object.freeze([
    { name: '高音咪', label: 'E5', midi: 76 }, { name: '高音哆', label: 'C5', midi: 72 },
    { name: '啦', label: 'A4', midi: 69 }, { name: '嗦', label: 'G4', midi: 67 },
    { name: '咪', label: 'E4', midi: 64 }, { name: '哆', label: 'C4', midi: 60 },
    { name: '低音啦', label: 'A3', midi: 57 }, { name: '低音嗦', label: 'G3', midi: 55 },
    { name: '低音咪', label: 'E3', midi: 52 }
  ].map(Object.freeze));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function cell(value) {
    if (!value || !integer(value.step, 0, STEPS - 1) || !integer(value.row, 0, ROWS - 1)) throw new Error('音符位置超出了花园。');
    return { step: value.step, row: value.row };
  }
  function validateGarden(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== VERSION) throw new Error('这不是听风花园的存档，或存档版本不受支持。');
    if (!finite(value.tempo) || value.tempo < 48 || value.tempo > 144) throw new Error('速度应为每分钟 48～144 拍。');
    if (!finite(value.volume) || value.volume < 0 || value.volume > 1) throw new Error('音量应为 0～1。');
    if (!Array.isArray(value.plants) || value.plants.length > MAX_PLANTS) throw new Error('花园最多容纳 48 株植物。');
    const ids = new Set(), positions = new Set();
    const plants = value.plants.map(plant => {
      const position = cell(plant);
      if (!integer(plant.id, 1, 1000000) || ids.has(plant.id)) throw new Error('植物编号无效或重复。');
      if (!TIMBRES.includes(plant.timbre)) throw new Error('存档包含未知音色。');
      const key = `${plant.step}:${plant.row}:${plant.timbre}`;
      if (positions.has(key)) throw new Error('存档包含重复植物。');
      ids.add(plant.id); positions.add(key);
      return { id: plant.id, ...position, timbre: plant.timbre };
    });
    const minimumId = Math.max(0, ...ids) + 1;
    if (minimumId > 1000000) throw new Error('植物编号已超出可用范围。');
    return { version: VERSION, tempo: value.tempo, volume: value.volume, plants,
      nextId: integer(value.nextId, minimumId, 1000000) ? value.nextId : minimumId };
  }
  function createGarden() {
    const melody = [5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 3, 1, 2, 3, 4, 5];
    const plants = melody.map((row, step) => ({ id: step + 1, step, row, timbre: step % 4 === 3 ? 'pluck' : 'bell' }));
    [0, 4, 8, 12].forEach((step, i) => plants.push({ id: 17 + i, step, row: i % 2 ? 8 : 7, timbre: 'reed' }));
    return { version: VERSION, tempo: 88, volume: .65, plants, nextId: 21 };
  }
  function addPlant(garden, value) {
    const position = cell(value);
    if (!TIMBRES.includes(value.timbre)) throw new Error('请选择风铃、芦笛或拨弦。');
    if (garden.plants.some(p => p.step === position.step && p.row === position.row && p.timbre === value.timbre)) return garden;
    if (garden.plants.length >= MAX_PLANTS) throw new Error('花园满了。先移除一株，再种植。');
    if (!integer(garden.nextId, 1, 999999)) throw new Error('植物编号已用完。请重新建立花园。');
    return { ...garden, plants: [...garden.plants, { id: garden.nextId, ...position, timbre: value.timbre }], nextId: garden.nextId + 1 };
  }
  function movePlant(garden, id, value) {
    const position = cell(value), current = garden.plants.find(p => p.id === id);
    if (!current) return garden;
    if (current.step === position.step && current.row === position.row) return garden;
    if (garden.plants.some(p => p.id !== id && p.step === position.step && p.row === position.row && p.timbre === current.timbre)) return garden;
    return { ...garden, plants: garden.plants.map(p => p.id === id ? { ...p, ...position } : p) };
  }
  function removePlant(garden, id) {
    if (!garden.plants.some(p => p.id === id)) return garden;
    return { ...garden, plants: garden.plants.filter(p => p.id !== id) };
  }
  function eventsAtStep(garden, step) {
    if (!integer(step, 0, STEPS - 1)) throw new Error('节拍位置无效。');
    return garden.plants.filter(p => p.step === step).sort((a, b) => a.id - b.id);
  }
  function stepDuration(tempo) {
    if (!finite(tempo) || tempo < 48 || tempo > 144) throw new Error('速度应为每分钟 48～144 拍。');
    return 60 / tempo / 2;
  }
  function coordinateToCell({ x, y, width, height }) {
    if (![x, y, width, height].every(finite) || width <= 0 || height <= 0) throw new Error('花园坐标无效。');
    return { step: clamp(Math.floor(x / width * STEPS), 0, STEPS - 1), row: clamp(Math.floor(y / height * ROWS), 0, ROWS - 1) };
  }
  function frequencyForRow(row) {
    if (!integer(row, 0, ROWS - 1)) throw new Error('音高无效。');
    return 440 * 2 ** ((PITCHES[row].midi - 69) / 12);
  }
  function serializeGarden(garden) { return JSON.stringify(validateGarden(garden), null, 2); }
  function parseGarden(text) {
    if (typeof text !== 'string' || text.length > 50000) throw new Error('存档文件过大或不是文字。');
    let value;
    try { value = JSON.parse(text); } catch { throw new Error('存档不是有效的 JSON 文件。'); }
    return validateGarden(value);
  }
  global.WindGardenCore = Object.freeze({ VERSION, STEPS, ROWS, MAX_PLANTS, TIMBRES, PITCHES, clamp,
    createGarden, validateGarden, addPlant, movePlant, removePlant, eventsAtStep, stepDuration,
    coordinateToCell, frequencyForRow, serializeGarden, parseGarden });
})(globalThis);
