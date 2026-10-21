/** Browser code is emitted as a string; no build step or external assets are required. */
export class PreviewScript {
  render(): string {
    return String.raw`
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const collapsed = new Set();
  let state = null;
  let scale = 1;
  let autoFit = true;
  let objectUrl = null;

  const resize = () => {
    if (!state || !state.svg) return;
    const stage = byId('stage');
    if (autoFit) scale = Math.min(1, (stage.clientWidth - 64) / state.width, (stage.clientHeight - 64) / state.height);
    scale = Math.max(.01, Math.min(4, scale));
    byId('sheet').style.width = (state.width * scale) + 'px';
    byId('sheet').style.height = (state.height * scale) + 'px';
    byId('zoom').textContent = Math.round(scale * 100) + '%';
  };

  const drawTree = (nodes, parent) => {
    const ul = document.createElement('ul');
    for (const node of nodes) {
      const li = document.createElement('li');
      let line;
      if (node.children.length) {
        const details = document.createElement('details');
        details.open = !collapsed.has(node.id);
        details.addEventListener('toggle', () => {
          if (details.open) collapsed.delete(node.id);
          else collapsed.add(node.id);
        });
        line = document.createElement('summary');
        details.append(line);
        drawTree(node.children, details);
        li.append(details);
      } else {
        line = document.createElement('span');
        line.className = 'leaf';
        li.append(line);
      }
      line.title = node.summary;
      const kind = document.createElement('span');
      kind.className = 'kind';
      kind.textContent = node.tag;
      line.append(kind, document.createTextNode(node.id));
      ul.append(li);
    }
    parent.append(ul);
  };

  const example = (next) => {
    const ids = new Set();
    const visit = (nodes) => nodes.forEach((node) => { ids.add(node.id); visit(node.children); });
    visit(next.tree);
    if (ids.has('node2') && ids.has('process-label')) {
      return 'move node2 0 60\nset process-label text "下一步"\nundo\nredo';
    }
    let serial = 1;
    while (ids.has('r' + serial)) serial += 1;
    const id = 'r' + serial;
    return (next.width ? '' : 'init 800 600\n') + 'create rect ' + id + ' 40 60 160 80 #4a90d9\nmove ' + id + ' 20 0\nundo\nredo';
  };

  const update = (next) => {
    const sizeChanged = !state || next.width !== state.width || next.height !== state.height;
    state = next;
    byId('document-name').textContent = next.path ? next.path.split(/[\\/]/).pop() : '未命名画布';
    byId('file-path').textContent = next.path ? '默认保存路径：' + next.path : '工作副本 · 输入 save "文件.svg" 建立保存路径';
    byId('saved-state').textContent = !next.svg && !next.error ? '等待文档' : next.dirty ? '尚未保存' : '已保存快照';
    byId('saved-state').classList.toggle('saved', !!next.svg && !next.dirty);
    byId('dimensions').textContent = next.width ? next.width + ' × ' + next.height + ' px' : '—';
    byId('count').textContent = next.count + ' 个元素';
    const tree = byId('tree');
    tree.replaceChildren();
    if (next.tree.length) drawTree(next.tree, tree);
    else tree.textContent = next.width ? '空画布' : '等待文档…';
    byId('save-command').disabled = !next.svg;
    byId('sheet').hidden = !next.svg;
    byId('empty').hidden = !!next.svg;
    byId('empty').classList.toggle('error', !!next.error);
    byId('empty').textContent = next.error ? '无法预览：' + next.error : '在终端输入 init 800 600，再创建图形。';
    if (next.svg) {
      const previous = objectUrl;
      objectUrl = URL.createObjectURL(new Blob([next.svg], { type: 'image/svg+xml;charset=utf-8' }));
      byId('drawing').src = objectUrl;
      if (previous) URL.revokeObjectURL(previous);
      if (sizeChanged) autoFit = true;
      resize();
    } else if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      byId('drawing').removeAttribute('src');
    }
    byId('example').textContent = example(next);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      byId('toast').textContent = '已复制。回到终端执行。';
    } catch { byId('toast').textContent = '请手动复制：' + text; }
  };
  byId('copy').onclick = () => copy(byId('example').textContent);
  byId('save-command').onclick = () => copy(state && state.path ? 'save' : 'save "我的图.svg"');
  byId('fit').onclick = () => { autoFit = true; resize(); };
  byId('zoom-in').onclick = () => { autoFit = false; scale *= 1.25; resize(); };
  byId('zoom-out').onclick = () => { autoFit = false; scale /= 1.25; resize(); };
  byId('background').onclick = () => {
    const active = byId('stage').classList.toggle('checker');
    byId('background').setAttribute('aria-pressed', String(active));
  };
  window.addEventListener('resize', resize);

  let events;
  const connect = () => {
    events = new EventSource('/events');
    events.onmessage = (event) => update(JSON.parse(event.data));
    events.onopen = () => {
      byId('connection').classList.remove('off');
      byId('connection-text').textContent = '已连接终端 · 自动同步';
    };
    events.onerror = () => {
      byId('connection').classList.add('off');
      byId('connection-text').textContent = '连接已断开，请检查终端是否仍在运行';
    };
  };
  connect();
  window.addEventListener('pagehide', () => { events.close(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) connect(); });
})();`;
  }
}
