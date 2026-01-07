'use client';

import { useEffect, useRef, useState } from 'react';
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

  return (
    <div className="pop-card p-6 mb-6 overflow-hidden">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          {language === 'ja' ? 'あなたの積みゲータワー' : 'Your Backlog Tower'}
        </h2>
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

    </div>
  );
}
