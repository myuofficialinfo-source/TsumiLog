'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Game {
  appid: number;
  name: string;
  headerImage: string;
  isBacklog: boolean;
}

interface BacklogTowerProps {
  games: Game[];
  backlogCount: number;
}

export default function BacklogTower({ games, backlogCount }: BacklogTowerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const backlogGames = games.filter(g => g.isBacklog);
    if (backlogGames.length === 0) return;

    let cleanup: (() => void) | undefined;

    // 画像を事前にロード
    const loadImages = async () => {
      const imageMap = new Map<number, HTMLImageElement>();

      await Promise.all(
        backlogGames.map((game) => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              imageMap.set(game.appid, img);
              resolve();
            };
            img.onerror = () => {
              resolve(); // エラーでも続行
            };
            img.src = game.headerImage;
          });
        })
      );

      return imageMap;
    };

    // 動的インポートと画像ロードを並行実行
    Promise.all([
      import('matter-js'),
      loadImages()
    ]).then(([MatterModule, imageMap]) => {
      if (!containerRef.current || !canvasRef.current) return;

      const Matter = MatterModule.default || MatterModule;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const width = container.clientWidth || 600;
      const height = 400;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const { Engine, World, Bodies, Runner, Body } = Matter;

      const engine = Engine.create();
      engine.gravity.y = 1;

      // カスタムレンダラーを使用
      const context = canvas.getContext('2d');
      if (!context) return;

      // 床と壁
      const ground = Bodies.rectangle(width / 2, height + 25, width, 50, {
        isStatic: true,
        label: 'ground',
      });
      const leftWall = Bodies.rectangle(-25, height / 2, 50, height, {
        isStatic: true,
        label: 'wall',
      });
      const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, {
        isStatic: true,
        label: 'wall',
      });

      World.add(engine.world, [ground, leftWall, rightWall]);

      // ゲームバナーのサイズ（Steamヘッダー画像は460x215）
      const boxWidth = 92;
      const boxHeight = 43;

      // ボディとゲームIDのマッピング
      const bodyGameMap = new Map<number, number>();

      let dropIndex = 0;
      const dropInterval = setInterval(() => {
        if (dropIndex >= backlogGames.length) {
          clearInterval(dropInterval);
          setTimeout(() => setIsComplete(true), 1000);
          return;
        }

        const game = backlogGames[dropIndex];
        // 真ん中から少しだけランダムにずらす
        const x = width / 2 + (Math.random() - 0.5) * 60;

        const box = Bodies.rectangle(x, -50, boxWidth, boxHeight, {
          restitution: 0.3,
          friction: 0.8,
          angle: (Math.random() - 0.5) * 0.5,
        });

        bodyGameMap.set(box.id, game.appid);
        World.add(engine.world, box);
        dropIndex++;
      }, 150);

      const runner = Runner.create();
      Runner.run(runner, engine);

      // カスタム描画ループ
      const render = () => {
        context.clearRect(0, 0, width, height);

        // すべてのボディを描画
        const bodies = engine.world.bodies;
        for (const body of bodies) {
          if (body.label === 'ground' || body.label === 'wall') continue;

          const gameId = bodyGameMap.get(body.id);
          const img = gameId ? imageMap.get(gameId) : null;

          context.save();
          context.translate(body.position.x, body.position.y);
          context.rotate(body.angle);

          if (img) {
            // 画像を描画
            context.drawImage(img, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            // 枠線
            context.strokeStyle = '#3D3D3D';
            context.lineWidth = 2;
            context.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          } else {
            // フォールバック：色付きボックス
            context.fillStyle = '#457B9D';
            context.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            context.strokeStyle = '#3D3D3D';
            context.lineWidth = 2;
            context.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          }

          context.restore();
        }

        requestAnimationFrame(render);
      };

      render();

      // クリックで跳ねる機能
      const handleClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // クリック位置にあるボディを取得
        const bodies = engine.world.bodies.filter(
          (b: { label: string }) => b.label !== 'ground' && b.label !== 'wall'
        );

        for (const body of bodies) {
          const dx = body.position.x - mouseX;
          const dy = body.position.y - mouseY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // ボディの近くをクリックしたら跳ねさせる
          if (distance < 60) {
            Body.applyForce(body, body.position, {
              x: (Math.random() - 0.5) * 0.3,
              y: -0.15 - Math.random() * 0.1,
            });
          }
        }
      };

      canvas.addEventListener('click', handleClick);

      cleanup = () => {
        clearInterval(dropInterval);
        canvas.removeEventListener('click', handleClick);
        Runner.stop(runner);
        World.clear(engine.world, false);
        Engine.clear(engine);
      };
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [games]);

  const backlogGames = games.filter(g => g.isBacklog);
  if (backlogGames.length === 0) return null;

  // エクスポート用キャンバスを生成（SNSシェア用に最適化）
  const createExportCanvas = () => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;

    // SNSシェア用に正方形に近いサイズで出力（最小幅600px）
    const minWidth = 600;
    const exportWidth = Math.max(canvas.width, minWidth);
    const scale = exportWidth / canvas.width;
    const scaledHeight = canvas.height * scale;

    // 新しいキャンバスを作成してタイトルとフッターを追加
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return null;

    const headerHeight = 80;
    const footerHeight = 60;
    exportCanvas.width = exportWidth;
    exportCanvas.height = scaledHeight + headerHeight + footerHeight;

    // 背景
    exportCtx.fillStyle = '#FDF6E3';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // ヘッダー背景（グラデーション風）
    exportCtx.fillStyle = '#3D3D3D';
    exportCtx.fillRect(0, 0, exportCanvas.width, headerHeight);

    // ヘッダーテキスト
    exportCtx.fillStyle = '#FFFFFF';
    exportCtx.font = 'bold 32px sans-serif';
    exportCtx.textAlign = 'center';
    exportCtx.fillText(
      language === 'ja' ? `🎮 積みゲータワー【${backlogCount}本】` : `🎮 Backlog Tower【${backlogCount} games】`,
      exportCanvas.width / 2,
      52
    );

    // タワー画像をスケーリングしてコピー
    exportCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, headerHeight, exportWidth, scaledHeight);

    // フッター背景
    exportCtx.fillStyle = '#3D3D3D';
    exportCtx.fillRect(0, headerHeight + scaledHeight, exportCanvas.width, footerHeight);

    // フッターテキスト
    exportCtx.fillStyle = '#FFFFFF';
    exportCtx.font = 'bold 20px sans-serif';
    exportCtx.fillText('ツミナビ tsumi-navi.vercel.app', exportCanvas.width / 2, headerHeight + scaledHeight + 38);

    return exportCanvas;
  };

  // 画像ダウンロード機能
  const downloadImage = async () => {
    const exportCanvas = createExportCanvas();
    if (!exportCanvas) return;

    // Web Share API対応チェック（主にモバイル）
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise<Blob | null>((resolve) => {
          exportCanvas.toBlob(resolve, 'image/png');
        });

        if (blob) {
          const file = new File([blob], `backlog-tower-${backlogCount}.png`, { type: 'image/png' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: language === 'ja' ? '積みゲータワー' : 'Backlog Tower',
            });
            return;
          }
        }
      } catch (err) {
        // ユーザーがキャンセルした場合は何もしない
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // PCの場合、または共有APIが使えない場合は従来のダウンロード
    // iOS Safariの場合はモーダルで画像を表示
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setModalImageUrl(exportCanvas.toDataURL('image/png'));
      setShowImageModal(true);
      return;
    }

    // その他のブラウザは従来のダウンロード
    const link = document.createElement('a');
    link.download = `backlog-tower-${backlogCount}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Xでシェア
  const shareToX = () => {
    const text = language === 'ja'
      ? `私の積みゲータワー【${backlogCount}本】\n\n#ツミナビ #Steam #積みゲー\nhttps://tsumi-navi.vercel.app`
      : `My Backlog Tower【${backlogCount} games】\n\n#TsumiNavi #Steam #Backlog\nhttps://tsumi-navi.vercel.app`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="pop-card p-6 mb-6 overflow-hidden">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          {language === 'ja' ? 'あなたの積みゲータワー' : 'Your Backlog Tower'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {language === 'ja' ? 'クリックすると跳ねます' : 'Click to bounce'}
        </p>
      </div>

      <div ref={containerRef} className="relative w-full" style={{ height: '400px' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />

        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="text-center px-6 py-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(255, 251, 240, 0.95)',
                border: '3px solid #3D3D3D',
                boxShadow: '4px 4px 0px #3D3D3D'
              }}
            >
              <p className="text-4xl font-black gradient-text">
                {backlogCount} {language === 'ja' ? '本' : 'games'}
              </p>
              <p className="text-lg font-bold text-gray-600 mt-1">
                {language === 'ja' ? '積みゲーが眠っています...' : 'waiting to be played...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* シェアボタン */}
      {isComplete && (
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={downloadImage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:scale-105"
            style={{
              backgroundColor: '#457B9D',
              color: 'white',
              border: '3px solid #3D3D3D',
              boxShadow: '3px 3px 0px #3D3D3D'
            }}
          >
            <Download size={18} />
            {language === 'ja' ? '画像を保存' : 'Save Image'}
          </button>
          <button
            onClick={shareToX}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:scale-105"
            style={{
              backgroundColor: '#000000',
              color: 'white',
              border: '3px solid #3D3D3D',
              boxShadow: '3px 3px 0px #3D3D3D'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {language === 'ja' ? 'Xでシェア' : 'Share on X'}
          </button>
        </div>
      )}

      {/* iOS Safari用の画像保存モーダル */}
      {showImageModal && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative bg-white rounded-xl p-4 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
            <p className="text-center font-bold mb-3 text-gray-700">
              {language === 'ja' ? '画像を長押しして保存してください' : 'Long press image to save'}
            </p>
            <img
              src={modalImageUrl}
              alt="Backlog Tower"
              className="w-full rounded-lg border-2 border-gray-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
