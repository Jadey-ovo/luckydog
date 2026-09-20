import type { Participant } from '../types';

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

export function downloadWinnerPoster(winners: Participant[], timestamp: number) {
  const columns = winners.length === 1 ? 1 : winners.length <= 6 ? 2 : winners.length <= 12 ? 3 : winners.length <= 24 ? 4 : 5;
  const rows = Math.ceil(winners.length / columns);
  const canvasHeight = Math.max(1000, 520 + rows * 68);
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = canvasHeight;
  const context = canvas.getContext('2d');
  if (!context) return;

  const gradient = context.createLinearGradient(0, 0, 1600, canvasHeight);
  gradient.addColorStop(0, '#fffaf0');
  gradient.addColorStop(1, '#f4ead8');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(151, 111, 62, .22)';
  context.lineWidth = 2;
  roundedRect(context, 48, 48, 1504, canvasHeight - 96, 34);
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = '#9b6b38';
  context.font = '600 22px Georgia, serif';
  context.letterSpacing = '7px';
  context.fillText('LUCKYDOG · CONGRATULATIONS', 800, 135);
  context.letterSpacing = '0px';
  context.fillStyle = '#272119';
  context.font = '700 76px "Songti SC", "STSong", Georgia, serif';
  context.fillText('幸运名单', 800, 240);
  context.fillStyle = '#806f5b';
  context.font = '28px "Songti SC", "STSong", serif';
  context.fillText('这一刻，好运有了名字', 800, 295);

  const gap = 22;
  const availableWidth = 1320;
  const availableHeight = canvasHeight - 500;
  const cardWidth = (availableWidth - gap * (columns - 1)) / columns;
  const cardHeight = Math.max(46, Math.min(132, (availableHeight - gap * (rows - 1)) / rows));
  const gridHeight = rows * cardHeight + (rows - 1) * gap;
  const startY = 350 + Math.max(0, (availableHeight - gridHeight) / 2);

  winners.forEach((winner, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = 140 + column * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);
    context.fillStyle = 'rgba(255, 255, 255, .74)';
    roundedRect(context, x, y, cardWidth, cardHeight, 24);
    context.fill();
    context.strokeStyle = 'rgba(151, 111, 62, .16)';
    context.stroke();
    context.textAlign = 'left';
    context.fillStyle = '#ae7b42';
    context.font = '600 20px Georgia, serif';
    context.fillText(String(index + 1).padStart(2, '0'), x + 32, y + cardHeight / 2 + 8);
    context.fillStyle = '#272119';
    context.font = `${winners.length > 24 ? 22 : winners.length > 12 ? 27 : winners.length > 9 ? 34 : 43}px "Songti SC", "STSong", serif`;
    const displayedName = winner.name.length > 16 ? `${winner.name.slice(0, 15)}…` : winner.name;
    context.fillText(displayedName, x + 90, y + cardHeight / 2 + 14);
  });

  context.textAlign = 'center';
  context.fillStyle = '#9a8975';
  context.font = '21px "Songti SC", "STSong", serif';
  const date = new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
  context.fillText(`揭晓于 ${date}  ·  Luckydog 本地抽奖`, 800, canvasHeight - 100);

  const link = document.createElement('a');
  link.download = `Luckydog-幸运名单-${new Date(timestamp).toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
