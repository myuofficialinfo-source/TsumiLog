'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSearchParams } from 'next/navigation';

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

// テスト用ダミーデータを生成
function generateDummyGames(count: number): Game[] {
  const dummyGames: Game[] = [];
  // 実際に存在するSteamゲームのappidを使用（画像が表示される）
  const sampleAppIds = [
    730, 570, 440, 304930, 292030, 271590, 620, 227300, 49520,
    8930, 105600, 289070, 252490, 311210, 374320, 377160, 435150,
    582010, 632360, 892970, 1174180, 1245620, 1091500, 367520,
    550, 413150, 219740, 286160, 322330, 242760, 261640, 274170,
    285900, 294100, 289130, 230410, 236390, 245620, 250900, 255220,
    257350, 262060, 264710, 267360, 268500, 269950, 271640, 273110,
    274940, 275850
  ];

  for (let i = 0; i < count; i++) {
    const appid = sampleAppIds[i % sampleAppIds.length] + Math.floor(i / sampleAppIds.length) * 10000;
    dummyGames.push({
      appid,
      name: `Dummy Game ${i + 1}`,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${sampleAppIds[i % sampleAppIds.length]}/header.jpg`,
      isBacklog: true,
    });
  }
  return dummyGames;
}

export default function BacklogTower({ games, backlogCount }: BacklogTowerProps) {
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const { language } = useLanguage();

  // テスト用：URLパラメータ ?dummyBacklog=100 でダミーデータを使用
  const dummyCount = searchParams.get('dummyBacklog');
  const dummyCountNum = dummyCount ? parseInt(dummyCount, 10) : 0;

  // ダミーデータをメモ化して再生成を防ぐ
  const testGames = useMemo(() => {
    if (dummyCountNum > 0) {
      return generateDummyGames(dummyCountNum);
    }
    return null;
  }, [dummyCountNum]);

  const displayGames = testGames || games;
  const displayBacklogCount = testGames ? testGames.length : backlogCount;

  // 積みゲーリストのキー（変更検知用）
  const backlogKey = useMemo(() => {
    const backlogGames = displayGames.filter((g: Game) => g.isBacklog);
    return `${backlogGames.length}-${backlogGames[0]?.appid || 0}`;
  }, [displayGames]);

  // 初期化済みキーを保持（同じデータでの再実行を防ぐ）
  const initializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const backlogGames = displayGames.filter((g: Game) => g.isBacklog);
    if (backlogGames.length === 0) return;

    // 同じキーで既に初期化済みならスキップ
    if (initializedKeyRef.current === backlogKey) return;
    initializedKeyRef.current = backlogKey;

    let cleanup: (() => void) | undefined;
    let isCancelled = false;

    // 画像マップ（事前読み込み or 遅延読み込みで使用）
    const imageMap = new Map<number, HTMLImageElement>();
    const loadingImages = new Set<number>(); // 遅延読み込み用：読み込み中の画像を追跡

    // ゲームIDからゲーム情報を取得するマップ（遅延読み込み用）
    const gameById = new Map<number, Game>();
    backlogGames.forEach((game: Game) => gameById.set(game.appid, game));

    // 画像を遅延読み込み（1000本以上のとき描画時に呼び出される）
    const loadImageLazy = (appid: number) => {
      if (imageMap.has(appid) || loadingImages.has(appid)) return;
      const game = gameById.get(appid);
      if (!game) return;

      loadingImages.add(appid);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageMap.set(appid, img);
        loadingImages.delete(appid);
      };
      img.onerror = () => {
        loadingImages.delete(appid);
      };
      img.src = game.headerImage;
    };

    // 画像を事前にロード（1000本未満のとき使用）
    const loadImages = async () => {
      await Promise.all(
        backlogGames.map((game: Game) => {
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
    };

    // 1000本以上は遅延読み込み、それ未満は事前読み込み
    const useLazyLoading = backlogGames.length >= 1000;

    // 動的インポート（と事前読み込み）
    const initPromise = useLazyLoading
      ? import('matter-js')
      : Promise.all([import('matter-js'), loadImages()]).then(([m]) => m);

    initPromise.then((MatterModule) => {
      if (isCancelled) return;
      if (!containerRef.current || !canvasRef.current) return;

      const Matter = MatterModule.default || MatterModule;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const width = container.clientWidth || 600;

      // 積みゲー数に応じてサイズとキャンバス高さを調整
      const gameCount = backlogGames.length;

      // スマホ対応: 画面幅に応じてボックスサイズを調整
      // PC(600px以上): 92x43, スマホ(600px未満): 幅に応じて縮小
      const isSmallScreen = width < 500;
      const boxWidth = isSmallScreen ? Math.max(60, Math.floor(width / 5) - 5) : 92;
      const boxHeight = isSmallScreen ? Math.floor(boxWidth * 0.47) : 43;

      // 横に並ぶ数
      const boxesPerRow = Math.floor(width / (boxWidth + 5));
      // 必要な段数
      const rows = Math.ceil(gameCount / boxesPerRow);
      // 物理エンジンで積み上がると圧縮されるので、0.3倍程度で計算
      const estimatedHeight = rows * boxHeight * 0.3;
      // 最低高さをスマホでは小さく
      const minHeight = isSmallScreen ? 300 : 400;
      // 最大ゲーム数での高さ計算（1000本以上は固定）
      const maxRows = Math.ceil(999 / boxesPerRow);
      const maxHeight = maxRows * boxHeight * 0.3 + 50;
      const height = gameCount >= 1000 ? maxHeight : Math.max(minHeight, estimatedHeight + 50);

      // コンテナの高さを更新
      setContainerHeight(height);

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const { Engine, World, Bodies, Runner, Body } = Matter;

      const engine = Engine.create();
      // 1000本以上は重力を2倍にして落下を速く
      engine.gravity.y = gameCount >= 1000 ? 2 : 1;

      // カスタムレンダラーを使用
      const context = canvas.getContext('2d');
      if (!context) return;

      // 床と壁
      const ground = Bodies.rectangle(width / 2, height + 25, width, 50, {
        isStatic: true,
        label: 'ground',
      });
      const leftWall = Bodies.rectangle(-25, height / 2, 50, height * 2, {
        isStatic: true,
        label: 'wall',
      });
      const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height * 2, {
        isStatic: true,
        label: 'wall',
      });

      World.add(engine.world, [ground, leftWall, rightWall]);

      // ボディとゲームIDのマッピング
      const bodyGameMap = new Map<number, number>();

      // 積みゲー数に応じて落下間隔を調整（多いほど早く）
      // また、一度に複数個落とすかどうかも調整
      let dropIntervalMs = 150;
      let dropsPerInterval = 1; // 一度に落とす数

      if (gameCount >= 1000) {
        dropIntervalMs = 5; // 1000本以上：超最高速
        dropsPerInterval = 10; // 10個ずつ落とす
      } else if (gameCount >= 500) {
        dropIntervalMs = 15; // 500〜999本：超高速
        dropsPerInterval = 3; // 3個ずつ落とす
      } else if (gameCount >= 300) {
        dropIntervalMs = 20; // 300〜499本：かなり高速
        dropsPerInterval = 2; // 2個ずつ落とす
      } else if (gameCount >= 200) {
        dropIntervalMs = 30; // 200〜299本：高速
      } else if (gameCount >= 100) {
        dropIntervalMs = 60; // 100〜199本：やや高速
      } else if (gameCount >= 50) {
        dropIntervalMs = 100; // 50〜99本：少し早く
      }

      let dropIndex = 0;
      const dropInterval = setInterval(() => {
        if (dropIndex >= backlogGames.length) {
          clearInterval(dropInterval);
          setTimeout(() => setIsComplete(true), 1000);
          return;
        }

        // 一度に複数個落とす
        for (let i = 0; i < dropsPerInterval && dropIndex < backlogGames.length; i++) {
          const game = backlogGames[dropIndex];
          // 真ん中から少しだけランダムにずらす（幅が変わるので調整）
          const randomOffset = Math.min(width * 0.3, 100);
          const x = width / 2 + (Math.random() - 0.5) * randomOffset;

          const box = Bodies.rectangle(x, -50, boxWidth, boxHeight, {
            restitution: 0.3,
            friction: 0.8,
            angle: (Math.random() - 0.5) * 0.5,
          });

          bodyGameMap.set(box.id, game.appid);
          World.add(engine.world, box);
          dropIndex++;
        }
      }, dropIntervalMs);

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
          // 遅延読み込みモードのとき、画像がなければ読み込み開始
          if (gameId && useLazyLoading && !imageMap.has(gameId)) {
            loadImageLazy(gameId);
          }
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

      // クリックで跳ねる機能（ボックスサイズに応じて力を調整）
      // 基準サイズ(92x43)に対する比率で力をスケーリング
      const forceScale = (boxWidth * boxHeight) / (92 * 43);
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

          // ボディの近くをクリックしたら跳ねさせる（当たり判定もサイズに応じて調整）
          const hitRadius = Math.max(30, boxWidth);
          if (distance < hitRadius) {
            Body.applyForce(body, body.position, {
              x: (Math.random() - 0.5) * 0.3 * forceScale,
              y: (-0.15 - Math.random() * 0.1) * forceScale,
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
      isCancelled = true;
      if (cleanup) cleanup();
      // クリーンアップ時にキーをリセットして、再マウント時に再初期化できるようにする
      initializedKeyRef.current = null;
    };
  }, [backlogKey, displayGames]);

  const backlogGamesForRender = displayGames.filter((g: Game) => g.isBacklog);
  if (backlogGamesForRender.length === 0) return null;

  // エクスポート用キャンバスを生成
  const createExportCanvas = () => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;

    // 最小幅600pxに拡大（スマホ対応）
    const minWidth = 600;
    const exportWidth = Math.max(canvas.width, minWidth);
    const scale = exportWidth / canvas.width;
    const scaledHeight = canvas.height * scale;

    // 新しいキャンバスを作成してタイトルとフッターを追加
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return null;

    const headerHeight = 60;
    const footerHeight = 50;
    exportCanvas.width = exportWidth;
    exportCanvas.height = scaledHeight + headerHeight + footerHeight;

    // 背景
    exportCtx.fillStyle = '#FDF6E3';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // ヘッダー
    exportCtx.fillStyle = '#3D3D3D';
    exportCtx.font = 'bold 24px sans-serif';
    exportCtx.textAlign = 'center';
    exportCtx.fillText(
      language === 'ja' ? `積みゲータワー【${displayBacklogCount}本】` : `Backlog Tower【${displayBacklogCount} games】`,
      exportCanvas.width / 2,
      40
    );

    // タワー画像をスケーリングしてコピー
    exportCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, headerHeight, exportWidth, scaledHeight);

    // フッター
    exportCtx.fillStyle = '#666666';
    exportCtx.font = '16px sans-serif';
    exportCtx.fillText('ツミナビ tsumi-navi.vercel.app', exportCanvas.width / 2, headerHeight + scaledHeight + 30);

    return exportCanvas;
  };

  // 画像ダウンロード機能
  const downloadImage = async () => {
    const exportCanvas = createExportCanvas();
    if (!exportCanvas) return;

    // モバイル判定（タッチデバイスかつ画面幅が小さい）
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // モバイルのみWeb Share APIを使用
    if (isMobile && navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise<Blob | null>((resolve) => {
          exportCanvas.toBlob(resolve, 'image/png');
        });

        if (blob) {
          const file = new File([blob], `backlog-tower-${displayBacklogCount}.png`, { type: 'image/png' });

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
        // その他のエラーは従来のダウンロードにフォールバック
      }
    }

    // iOS Safariの場合はモーダルで画像を表示（Share API失敗時のフォールバック）
    if (isIOS) {
      setModalImageUrl(exportCanvas.toDataURL('image/png'));
      setShowImageModal(true);
      return;
    }

    // PCおよびその他のブラウザは直接ダウンロード
    const link = document.createElement('a');
    link.download = `backlog-tower-${displayBacklogCount}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Xでシェア
  const shareToX = () => {
    const text = language === 'ja'
      ? `私の積みゲータワー【${displayBacklogCount}本】\n\n#ツミナビ #Steam #積みゲー\nhttps://tsumi-navi.vercel.app`
      : `My Backlog Tower【${displayBacklogCount} games】\n\n#TsumiNavi #Steam #Backlog\nhttps://tsumi-navi.vercel.app`;

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

      <div ref={containerRef} className="relative w-full" style={{ height: `${containerHeight}px` }}>
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
                {displayBacklogCount} {language === 'ja' ? '本' : 'games'}
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
