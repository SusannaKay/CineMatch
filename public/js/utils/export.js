function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function itemLine(movie) {
  const type = movie.mediaType === 'tv' ? 'TV Show' : 'Movie';
  const year = movie.release_date?.substring(0, 4) || 'N/A';
  const tags = movie.tags?.length ? ` — 🏷 ${movie.tags.join(', ')}` : '';
  const watched = movie.watched ? ' ✅' : '';
  return `- **${movie.title}** (${year}) — ⭐ ${movie.vote_average} — ${type}${watched}${tags}`;
}

export function buildMarkdown(movies) {
  const lines = [
    '# My Watchlist — CineMatch',
    '',
    `${movies.length} title${movies.length === 1 ? '' : 's'} saved`,
    '',
    ...movies.map(itemLine),
  ];
  return lines.join('\n');
}

export async function exportAsMarkdown(movies) {
  const md = buildMarkdown(movies);
  try {
    await navigator.clipboard.writeText(md);
    return { ok: true, copied: true };
  } catch {
    downloadBlob(new Blob([md], { type: 'text/markdown' }), 'cinematch-watchlist.md');
    return { ok: true, copied: false };
  }
}

export function exportAsJSON(movies) {
  const json = JSON.stringify(movies, null, 2);
  downloadBlob(new Blob([json], { type: 'application/json' }), 'cinematch-watchlist.json');
  return { ok: true };
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function exportAsImage(movies, { limit = 12 } = {}) {
  const shown = movies.slice(0, limit);
  const extra = movies.length - shown.length;

  const width = 900;
  const rowHeight = 130;
  const headerHeight = 130;
  const footerHeight = extra > 0 ? 60 : 30;
  const height = headerHeight + shown.length * rowHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 34px Inter, sans-serif';
  ctx.fillText('🎬 My Watchlist', 40, 60);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 18px Inter, sans-serif';
  ctx.fillText(`CineMatch · ${movies.length} titles saved`, 40, 92);

  const images = await Promise.all(shown.map((m) => loadImage(m.poster_path)));

  shown.forEach((movie, i) => {
    const y = headerHeight + i * rowHeight;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(148,163,184,0.06)' : 'transparent';
    ctx.fillRect(20, y, width - 40, rowHeight - 10);

    const posterW = 78, posterH = 110;
    const img = images[i];
    roundedRect(ctx, 40, y + 10, posterW, posterH, 10);
    ctx.save();
    ctx.clip();
    if (img) ctx.drawImage(img, 40, y + 10, posterW, posterH);
    else { ctx.fillStyle = '#1e293b'; ctx.fillRect(40, y + 10, posterW, posterH); }
    ctx.restore();

    const textX = 140;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(movie.title.length > 38 ? `${movie.title.slice(0, 38)}…` : movie.title, textX, y + 42);

    const type = movie.mediaType === 'tv' ? 'TV Show' : 'Movie';
    const year = movie.release_date?.substring(0, 4) || 'N/A';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(`${type} · ${year}${movie.watched ? ' · Watched ✅' : ''}`, textX, y + 68);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(`⭐ ${movie.vote_average}`, textX, y + 94);

    if (movie.tags?.length) {
      ctx.fillStyle = '#e11d48';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillText(`🏷 ${movie.tags.join(', ')}`, textX + 90, y + 94);
    }
  });

  if (extra > 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(`+ ${extra} more titles not shown`, 40, height - 24);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve({ ok: false });
      downloadBlob(blob, 'cinematch-watchlist.png');
      resolve({ ok: true });
    }, 'image/png');
  }).catch(() => ({ ok: false }));
}
