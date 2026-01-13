'use client';

import { useRef, useCallback, useEffect } from 'react';

// バトル用サウンドファイルのパス
const SOUND_PATHS = {
  battleStart: '/sounds/battle/battle-start.mp3',
  battleBgm: '/sounds/battle/battle-bgm.mp3',
  victory: '/sounds/battle/victory.mp3',
  defeat: '/sounds/battle/defeat.mp3',
  hitDeal: '/sounds/battle/hit-deal.mp3',
} as const;

export type BattleSoundType = keyof typeof SOUND_PATHS;

export function useBattleSounds() {
  // Audio要素のref（BGMはループ再生用に別管理）
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const audioPoolRef = useRef<Map<BattleSoundType, HTMLAudioElement[]>>(new Map());
  const isMutedRef = useRef(false);
  const volumeRef = useRef(0.5); // デフォルト音量50%
  const bgmWasPlayingRef = useRef(false); // ミュート前にBGMが再生中だったか

  // オーディオプールを初期化（SEは複数同時再生対応）
  const getAudioFromPool = useCallback((type: BattleSoundType): HTMLAudioElement | null => {
    if (typeof window === 'undefined') return null;

    let pool = audioPoolRef.current.get(type);
    if (!pool) {
      pool = [];
      audioPoolRef.current.set(type, pool);
    }

    // 再生中でないオーディオを探す
    let audio = pool.find(a => a.paused || a.ended);

    if (!audio) {
      // プールに空きがなければ新規作成（最大5個まで）
      if (pool.length < 5) {
        audio = new Audio(SOUND_PATHS[type]);
        audio.volume = volumeRef.current;
        pool.push(audio);
      } else {
        // 最大数に達している場合は最初のを再利用
        audio = pool[0];
        audio.currentTime = 0;
      }
    }

    return audio || null;
  }, []);

  // SE再生（バトル開始、勝利、敗北、ヒット）
  const playSE = useCallback((type: Exclude<BattleSoundType, 'battleBgm'>) => {
    if (isMutedRef.current) return;

    const audio = getAudioFromPool(type);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volumeRef.current;
      audio.play().catch(() => {
        // ユーザー操作前の自動再生はブラウザによってブロックされる
      });
    }
  }, [getAudioFromPool]);

  // BGM開始（ループ再生）
  const playBGM = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isMutedRef.current) return;

    if (!bgmRef.current) {
      bgmRef.current = new Audio(SOUND_PATHS.battleBgm);
      bgmRef.current.loop = true;
      bgmRef.current.volume = volumeRef.current * 0.6; // BGMは少し小さめ
    }

    bgmRef.current.currentTime = 0;
    bgmRef.current.play().catch(() => {
      // ユーザー操作前の自動再生はブラウザによってブロックされる
    });
  }, []);

  // BGM停止（完全停止、位置もリセット）
  const stopBGM = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      bgmWasPlayingRef.current = false;
    }
  }, []);

  // BGM一時停止（位置は保持）
  const pauseBGM = useCallback(() => {
    if (bgmRef.current && !bgmRef.current.paused) {
      bgmRef.current.pause();
    }
  }, []);

  // BGM再開（現在位置から）
  const resumeBGM = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isMutedRef.current) return;

    if (bgmRef.current) {
      bgmRef.current.play().catch(() => {
        // ユーザー操作前の自動再生はブラウザによってブロックされる
      });
    }
  }, []);

  // BGMフェードアウト
  const fadeOutBGM = useCallback((durationMs: number = 1000) => {
    if (!bgmRef.current) return;

    const audio = bgmRef.current;
    const startVolume = audio.volume;
    const startTime = Date.now();

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      audio.volume = startVolume * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = startVolume; // 音量を元に戻す
      }
    };

    requestAnimationFrame(fade);
  }, []);

  // 音量設定
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    if (bgmRef.current) {
      bgmRef.current.volume = volumeRef.current * 0.6;
    }
  }, []);

  // ミュート切り替え
  const toggleMute = useCallback(() => {
    const wasPlaying = bgmRef.current && !bgmRef.current.paused;

    isMutedRef.current = !isMutedRef.current;

    if (isMutedRef.current) {
      // ミュートにする場合：BGMを一時停止（位置は保持）
      if (wasPlaying) {
        bgmWasPlayingRef.current = true;
        pauseBGM();
      }
    } else {
      // ミュート解除する場合：BGMが再生中だった場合は再開
      if (bgmWasPlayingRef.current) {
        resumeBGM();
      }
    }
    return isMutedRef.current;
  }, [pauseBGM, resumeBGM]);

  // ミュート状態取得
  const isMuted = useCallback(() => isMutedRef.current, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時にBGM停止
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      // オーディオプールをクリア
      audioPoolRef.current.clear();
    };
  }, []);

  return {
    playSE,
    playBGM,
    stopBGM,
    pauseBGM,
    resumeBGM,
    fadeOutBGM,
    setVolume,
    toggleMute,
    isMuted,
  };
}
