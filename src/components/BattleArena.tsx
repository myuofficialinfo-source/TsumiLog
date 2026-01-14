'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BattleCard from './BattleCard';
import {
  BattleCard as BattleCardType,
  Deck,
  BattleResult,
  SKILL_DESCRIPTIONS,
  GenreSkill,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Swords, Zap, Trophy, RotateCcw, Home, X, Play, FastForward, Volume2, VolumeX } from 'lucide-react';
import { BattleLogEntry } from '@/lib/battleEngine';
import { useBattleSounds } from '@/hooks/useBattleSounds';

interface ServerBattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerFinalHp: number;
  opponentFinalHp: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  battleDurationMs: number;
  logs: BattleLogEntry[];
  seed: number;
}

interface BattleArenaProps {
  playerDeck: Deck;
  opponentDeck: Deck;
  onBattleEnd: (result: BattleResult) => void;
  onRematch: () => void;
  onBackToLobby: () => void;
  steamId?: string;
  personaName?: string;
  avatarUrl?: string;
  opponentName?: string;
  opponentAvatarUrl?: string;
  opponentSteamId?: string;
  serverBattleResult: ServerBattleResult;
}

interface BattleCardState extends BattleCardType {
  currentTimer: number;
  maxTimer: number;
  isPlayer: boolean;
  position: 'front' | 'back';
  index: number;
  isActive?: boolean;
}

export default function BattleArena({
  playerDeck,
  opponentDeck,
  onRematch,
  onBackToLobby,
  steamId,
  personaName,
  avatarUrl,
  opponentName,
  opponentAvatarUrl,
  opponentSteamId,
  serverBattleResult,
}: BattleArenaProps) {
  const { language } = useLanguage();
  const { playSE, playBGM, stopBGM, fadeOutBGM, toggleMute, isMuted } = useBattleSounds();
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [battleState, setBattleState] = useState<'preparing' | 'fighting' | 'finished'>('preparing');
  const [showBattleStart, setShowBattleStart] = useState(true);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [battleStats, setBattleStats] = useState<{
    graduations: number;
    wins: number;
    score: number;
    rank: number | null;
    newGraduations: Array<{ appid: number; name: string }>;
  } | null>(null);
  const battleReportedRef = useRef(false);

  // リアルタイムバトル用state
  const [battleCards, setBattleCards] = useState<BattleCardState[]>([]);
  const [playerTotalHp, setPlayerTotalHp] = useState(0);
  const [playerMaxHp, setPlayerMaxHp] = useState(0);
  const [opponentTotalHp, setOpponentTotalHp] = useState(0);
  const [opponentMaxHp, setOpponentMaxHp] = useState(0);
  const [speed, setSpeed] = useState(1);

  // エフェクト用state
  const [currentAction, setCurrentAction] = useState<{
    attacker: string;
    attackerIndex: number;
    attackerPosition: 'front' | 'back';
    attackerIsPlayer: boolean;
    defender: string;
    damage: number;
    isCritical: boolean;
    isPlayerAttacking: boolean;
    skill?: GenreSkill;
  } | null>(null);
  // 複数のダメージ表示（スタッキング対応）
  const [damageDisplays, setDamageDisplays] = useState<Array<{
    target: 'player' | 'opponent';
    damage: number;
    isCritical: boolean;
    key: number;
    offsetX: number; // ランダムX位置オフセット（px）
    offsetY: number; // ランダムY位置オフセット（px）
  }>>([]);
  // 複数の火花エフェクト（ランダム位置で最後まで再生）
  const [hitEffects, setHitEffects] = useState<Array<{
    target: 'player' | 'opponent';
    key: number;
    x: number; // ランダムX位置（%）
    y: number; // ランダムY位置（%）
  }>>([]);
  // スキル発動表示（積み上げ式）
  const [skillDisplays, setSkillDisplays] = useState<Array<{
    skill: GenreSkill;
    isPlayerAttacking: boolean;
    key: number;
  }>>([]);

  // バトルログ
  const [battleLog, setBattleLog] = useState<string[]>([]);

  // HP用ref（リアルタイム更新用）
  const playerHpRef = useRef(0);
  const opponentHpRef = useRef(0);

  // シェイクアニメーション用ref
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const opponentContainerRef = useRef<HTMLDivElement>(null);

  // アニメーションフレーム用ref
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // バトル開始演出
  useEffect(() => {
    if (!showBattleStart) return;
    // バトル開始SE再生
    playSE('battleStart');
    // BGM開始（少し遅らせて）
    const bgmTimer = setTimeout(() => {
      playBGM();
    }, 500);
    const timer = setTimeout(() => setShowBattleStart(false), 2000);
    return () => {
      clearTimeout(timer);
      clearTimeout(bgmTimer);
    };
  }, [showBattleStart, playSE, playBGM]);

  // バトル終了時のBGMフェードアウト
  useEffect(() => {
    if (battleState !== 'finished' || !winner) return;
    // BGMフェードアウト
    fadeOutBGM(1000);
  }, [battleState, winner, fadeOutBGM]);

  // 結果ポップアップ表示時にSE再生
  useEffect(() => {
    if (!showResultPopup || !winner) return;
    // 結果SE再生
    if (winner === 'player') {
      playSE('victory');
    } else if (winner === 'opponent') {
      playSE('defeat');
    }
  }, [showResultPopup, winner, playSE]);

  // バトル終了時にローディングオーバーレイを表示し、APIコール
  useEffect(() => {
    if (battleState !== 'finished' || !winner || battleReportedRef.current) return;

    battleReportedRef.current = true;

    // すぐにローディングオーバーレイを表示
    setShowLoadingOverlay(true);

    // ダミーモードの場合はAPIコールせずにすぐポップアップ表示
    if (!steamId) {
      setTimeout(() => {
        setShowLoadingOverlay(false);
        setShowResultPopup(true);
      }, 500);
      return;
    }

    const reportBattle = async () => {
      try {
        const allCards = [...playerDeck.frontLine, ...playerDeck.backLine].filter(
          (c): c is BattleCardType => c !== null
        );
        const deckGames = allCards.map(c => ({ appid: c.appid, name: c.name }));

        await fetch('/api/game-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steamId, deckGames }),
        });

        const statsRes = await fetch(`/api/battle?steamId=${encodeURIComponent(steamId)}`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setBattleStats({
            graduations: data.graduations || 0,
            wins: data.wins || 0,
            score: data.score || 0,
            rank: data.rank,
            newGraduations: [],
          });
        }
      } catch (error) {
        console.error('Failed to report battle:', error);
      } finally {
        setShowLoadingOverlay(false);
        setShowResultPopup(true);
      }
    };

    reportBattle();
  }, [battleState, winner, steamId, playerDeck]);

  // バトル初期化（サーバーモード用：表示用カードのみ初期化）
  useEffect(() => {
    if (battleState !== 'preparing' || showBattleStart) return;

    const cards: BattleCardState[] = [];

    // プレイヤーカード初期化（表示用、サーバーからintervalは取得済み）
    playerDeck.frontLine.forEach((card, index) => {
      if (card) {
        cards.push({
          ...card,
          currentTimer: 0,
          maxTimer: 3000,
          isPlayer: true,
          position: 'front',
          index,
        });
      }
    });
    playerDeck.backLine.forEach((card, index) => {
      if (card) {
        cards.push({
          ...card,
          currentTimer: 0,
          maxTimer: 3000,
          isPlayer: true,
          position: 'back',
          index,
        });
      }
    });

    // 相手カード初期化
    opponentDeck.frontLine.forEach((card, index) => {
      if (card) {
        cards.push({
          ...card,
          currentTimer: 0,
          maxTimer: 3000,
          isPlayer: false,
          position: 'front',
          index,
        });
      }
    });
    opponentDeck.backLine.forEach((card, index) => {
      if (card) {
        cards.push({
          ...card,
          currentTimer: 0,
          maxTimer: 3000,
          isPlayer: false,
          position: 'back',
          index,
        });
      }
    });

    setBattleCards(cards);
    setBattleState('fighting');
  }, [battleState, playerDeck, opponentDeck, showBattleStart]);

  // サーバーモード：バトルログ再生用のstate
  const serverLogIndexRef = useRef(0);
  const serverLogsRef = useRef<BattleLogEntry[]>([]);
  const serverPlaybackStartTimeRef = useRef(0); // 再生開始時刻（performance.now()）
  const lastLogTimestampRef = useRef(0); // 最後に処理したログのtimestamp
  const lastLogRealTimeRef = useRef(0); // 最後にログを処理した実時刻（performance.now()）

  // 各カードの攻撃タイミングを事前計算（cardId -> timestamp[]）
  const cardAttackTimesRef = useRef<Map<string, number[]>>(new Map());

  // 各カードの最後の攻撃時間（cardId -> timestamp）- アクティブ表示用
  const cardLastAttackTimeRef = useRef<Map<string, number>>(new Map());
  // 現在のバトル時間（ref で管理してリアルタイム参照）
  const currentBattleTimeRef = useRef(0);

  useEffect(() => {
    if (!serverBattleResult || battleState !== 'fighting') return;

    // サーバーのバトルログを設定
    serverLogsRef.current = serverBattleResult.logs;
    serverLogIndexRef.current = 0;
    serverPlaybackStartTimeRef.current = performance.now();
    lastLogTimestampRef.current = 0;
    lastLogRealTimeRef.current = performance.now();

    // 各カードの攻撃タイミングを事前計算
    const attackTimes = new Map<string, number[]>();
    serverBattleResult.logs.forEach(log => {
      if (log.attackerId && (log.type === 'attack' || log.type === 'damage' || log.type === 'critical')) {
        const times = attackTimes.get(log.attackerId) || [];
        times.push(log.timestamp);
        attackTimes.set(log.attackerId, times);
      }
    });
    cardAttackTimesRef.current = attackTimes;

    // 最大HPを計算（サーバー結果から逆算）
    // サーバーから最初のログのHPを取得してセット
    const firstLog = serverBattleResult.logs.find(log => log.playerHp !== undefined);
    if (firstLog && firstLog.playerHp !== undefined && firstLog.opponentHp !== undefined) {
      // 最初の攻撃前のHP（ダメージを加算して復元）
      let initialPlayerHp = firstLog.playerHp;
      let initialOpponentHp = firstLog.opponentHp;

      // 最初のログがダメージログの場合、ダメージを加算
      if (firstLog.damage) {
        if (firstLog.attackerId?.startsWith('player')) {
          initialOpponentHp += firstLog.damage;
        } else {
          initialPlayerHp += firstLog.damage;
        }
      }

      // デッキからHPを計算する代わりに、サーバー結果を使用
      setPlayerMaxHp(initialPlayerHp);
      setOpponentMaxHp(initialOpponentHp);
      playerHpRef.current = initialPlayerHp;
      opponentHpRef.current = initialOpponentHp;
      setPlayerTotalHp(initialPlayerHp);
      setOpponentTotalHp(initialOpponentHp);
    }
  }, [serverBattleResult, battleState]);

  useEffect(() => {
    if (!serverBattleResult || battleState !== 'fighting') return;
    if (serverLogsRef.current.length === 0) return;

    let animFrameId: number;
    let isRunning = true;

    // ログを処理する関数（UIの更新のみ、時間管理は呼び出し元で）
    const processLog = (currentLog: BattleLogEntry) => {
      // ログに基づいてUIを更新（攻撃/ダメージ/クリティカルのいずれか）
      const isDamageLog = currentLog.type === 'attack' || currentLog.type === 'damage' || currentLog.type === 'critical';
      if (isDamageLog) {
        const isPlayerAttacking = currentLog.attackerId?.startsWith('player') ?? false;
        const targetSide: 'player' | 'opponent' = isPlayerAttacking ? 'opponent' : 'player';
        const isCritical = currentLog.type === 'critical';

        // 攻撃者のインデックスと位置を解析（例: "player_front_0" → { isPlayer: true, position: 'front', index: 0 }）
        let attackerPosition: 'front' | 'back' = 'front';
        let attackerIndex = 0;
        let attackerName = '';
        if (currentLog.attackerId) {
          const parts = currentLog.attackerId.split('_');
          if (parts.length >= 3) {
            attackerPosition = parts[1] as 'front' | 'back';
            attackerIndex = parseInt(parts[2], 10) || 0;
          }
          // 攻撃者のカード名を取得
          const attackerCard = battleCards.find(c =>
            c.isPlayer === isPlayerAttacking &&
            c.position === attackerPosition &&
            c.index === attackerIndex
          );
          attackerName = attackerCard?.name || '';
        }

        // カードの最後の攻撃時間を記録（アクティブ表示用）
        if (currentLog.attackerId) {
          cardLastAttackTimeRef.current.set(currentLog.attackerId, currentLog.timestamp);
        }

        // currentActionを設定してカードをアクティブ状態にする
        setCurrentAction({
          attacker: attackerName,
          attackerIndex,
          attackerPosition,
          attackerIsPlayer: isPlayerAttacking,
          defender: '',
          damage: currentLog.damage || 0,
          isCritical,
          isPlayerAttacking,
          skill: currentLog.skill,
        });

        // HP更新
        if (currentLog.playerHp !== undefined) {
          playerHpRef.current = currentLog.playerHp;
          setPlayerTotalHp(currentLog.playerHp);
        }
        if (currentLog.opponentHp !== undefined) {
          opponentHpRef.current = currentLog.opponentHp;
          setOpponentTotalHp(currentLog.opponentHp);
        }

        // ダメージ表示
        if (currentLog.damage && currentLog.damage > 0) {
          const damageKey = Date.now() + Math.random();
          const offsetX = (Math.random() - 0.5) * 150;
          const offsetY = (Math.random() - 0.5) * 80;
          setDamageDisplays(prev => [...prev, {
            target: targetSide,
            damage: currentLog.damage!,
            isCritical,
            key: damageKey,
            offsetX,
            offsetY,
          }]);

          // ヒットSE再生
          playSE('hitDeal');

          // ダメージ表示クリア
          setTimeout(() => {
            setDamageDisplays(prev => prev.filter(d => d.key !== damageKey));
          }, 2500 / speed);
        }

        // シェイクエフェクト（被ダメージ側が揺れる）
        triggerShake(targetSide);

        // 火花エフェクト
        const newEffectKey = Date.now() + Math.random();
        const randomX = Math.random() * 80 + 10;
        const randomY = Math.random() * 60 + 20;
        setHitEffects(prev => [...prev, {
          target: targetSide,
          key: newEffectKey,
          x: randomX,
          y: randomY,
        }]);
        setTimeout(() => {
          setHitEffects(prev => prev.filter(e => e.key !== newEffectKey));
        }, 600 / speed);

        // バトルログ追加
        // サーバーからのmessageがあればそれを使用、なければ生成
        const playerLabel = personaName || (language === 'ja' ? 'あなた' : 'You');
        const opponentLabel = opponentName || 'AI';
        const ownerLabel = isPlayerAttacking ? playerLabel : opponentLabel;
        const targetLabel = isPlayerAttacking ? opponentLabel : playerLabel;
        const skillText = currentLog.skill ? ` [${currentLog.skill}]` : '';
        const critText = isCritical ? ' CRIT!' : '';
        const logMessage = currentLog.message ||
          `${ownerLabel}の${attackerName}${skillText} → ${targetLabel} (-${currentLog.damage || 0}${critText})`;
        setBattleLog(prev => [logMessage, ...prev.slice(0, 9)]);
      }

      // スキル発動表示
      if (currentLog.skill) {
        const isPlayerAttacking = currentLog.attackerId?.startsWith('player') ?? false;
        const skillKey = Date.now() + Math.random();
        setSkillDisplays(prev => {
          const newDisplays = [...prev, {
            skill: currentLog.skill!,
            isPlayerAttacking,
            key: skillKey,
          }];
          return newDisplays.slice(-5);
        });
        setTimeout(() => {
          setSkillDisplays(prev => prev.filter(d => d.key !== skillKey));
        }, 3000 / speed);
      }
    };

    // メインループ：ゲージ更新とログ処理を統合
    const mainLoop = () => {
      if (!isRunning) return;

      const now = performance.now();
      const realTimeElapsed = now - lastLogRealTimeRef.current;
      const battleTimeElapsed = realTimeElapsed * speed;
      const currentBattleTime = lastLogTimestampRef.current + battleTimeElapsed;

      // 現在のバトル時間を ref に保存（isCardActive で使用）
      currentBattleTimeRef.current = currentBattleTime;

      // 処理すべきログがあるかチェック
      while (serverLogIndexRef.current < serverLogsRef.current.length) {
        const nextLog = serverLogsRef.current[serverLogIndexRef.current];
        if (nextLog.timestamp <= currentBattleTime) {
          // このログを処理
          processLog(nextLog);
          // 時間基準を更新（次のログとの相対時間計算用）
          lastLogTimestampRef.current = nextLog.timestamp;
          lastLogRealTimeRef.current = now;
          serverLogIndexRef.current++;
        } else {
          break;
        }
      }

      // 全ログ処理完了チェック
      if (serverLogIndexRef.current >= serverLogsRef.current.length) {
        // 少し待ってから終了（最後のエフェクトを見せる）
        setTimeout(() => {
          setWinner(serverBattleResult.winner);
          setBattleState('finished');
        }, 500);
        return;
      }

      // アクティブ判定の閾値（この時間内なら光らせる）
      const ACTIVE_DURATION = 400 / speed; // 速度に応じて調整

      // 各カードのゲージとアクティブ状態を計算
      setBattleCards(prev => prev.map(card => {
        const cardId = `${card.isPlayer ? 'player' : 'opponent'}_${card.position}_${card.index}`;
        const attackTimes = cardAttackTimesRef.current.get(cardId) || [];

        if (attackTimes.length === 0) {
          return { ...card, currentTimer: 0, isActive: false };
        }

        // 現在の再生時刻より前の最後の攻撃と、次の攻撃を見つける
        let lastAttackTime = 0;
        let nextAttackTime = attackTimes[0];

        for (let i = 0; i < attackTimes.length; i++) {
          if (attackTimes[i] <= currentBattleTime) {
            lastAttackTime = attackTimes[i];
            nextAttackTime = attackTimes[i + 1] ?? attackTimes[i] + card.maxTimer;
          } else {
            nextAttackTime = attackTimes[i];
            break;
          }
        }

        // 進捗率を計算
        const totalInterval = nextAttackTime - lastAttackTime;
        const elapsed = currentBattleTime - lastAttackTime;
        const progress = totalInterval > 0 ? Math.min(1, elapsed / totalInterval) : 0;

        // アクティブ状態の判定（最後の攻撃から一定時間内）
        const cardLastAttack = cardLastAttackTimeRef.current.get(cardId) || 0;
        const timeSinceLastAttack = currentBattleTime - cardLastAttack;
        const isActive = cardLastAttack > 0 && timeSinceLastAttack >= 0 && timeSinceLastAttack < ACTIVE_DURATION;

        return {
          ...card,
          currentTimer: card.maxTimer * progress,
          isActive,
        };
      }));

      animFrameId = requestAnimationFrame(mainLoop);
    };

    // 開始遅延（500ms / speed）後にメインループ開始
    const startTimeout = setTimeout(() => {
      animFrameId = requestAnimationFrame(mainLoop);
    }, 500 / speed);

    return () => {
      isRunning = false;
      clearTimeout(startTimeout);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [serverBattleResult, battleState, speed, language, opponentName, personaName]);

  // スキップ（サーバー結果をそのまま使用）
  const skipToEnd = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    playerHpRef.current = serverBattleResult.playerFinalHp;
    opponentHpRef.current = serverBattleResult.opponentFinalHp;
    setPlayerTotalHp(serverBattleResult.playerFinalHp);
    setOpponentTotalHp(serverBattleResult.opponentFinalHp);
    setWinner(serverBattleResult.winner);
    setCurrentAction(null);
    setDamageDisplays([]);
    setHitEffects([]);
    setSkillDisplays([]);
    setBattleState('finished');
  }, [serverBattleResult]);

  // カードのタイマー表示用
  const getCardTimerPercent = (card: BattleCardState) => {
    return Math.min(100, (card.currentTimer / card.maxTimer) * 100);
  };

  // シェイクアニメーションをトリガー（refを使って再マウントなしでリスタート）
  const triggerShake = useCallback((target: 'player' | 'opponent') => {
    const ref = target === 'player' ? playerContainerRef : opponentContainerRef;
    if (ref.current) {
      // アニメーションを一旦削除
      ref.current.style.animation = 'none';
      // リフロー強制（アニメーションリセットに必要）
      void ref.current.offsetWidth;
      // アニメーションを再適用
      ref.current.style.animation = `shake 0.5s ease-in-out`;
    }
  }, []);

  // コンポーネントアンマウント時にBGM停止
  useEffect(() => {
    return () => {
      stopBGM();
    };
  }, [stopBGM]);

  // 表示用カード取得
  const playerFrontCards = battleCards.filter(c => c.isPlayer && c.position === 'front');
  const playerBackCards = battleCards.filter(c => c.isPlayer && c.position === 'back');
  const opponentFrontCards = battleCards.filter(c => !c.isPlayer && c.position === 'front');
  const opponentBackCards = battleCards.filter(c => !c.isPlayer && c.position === 'back');


  // チームのHP残りがあるかどうか
  const isPlayerTeamAlive = playerTotalHp > 0;
  const isOpponentTeamAlive = opponentTotalHp > 0;

  return (
    <div className="space-y-4">
      {/* 速度コントロール & ミュートボタン */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 5].map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] font-bold transition-all ${
              speed === s ? 'bg-[#3D3D3D] text-white' : 'hover:bg-gray-100'
            }`}
            style={{ backgroundColor: speed === s ? '#3D3D3D' : 'var(--card-bg)' }}
          >
            {s === 1 ? <Play className="w-4 h-4" /> : <FastForward className="w-4 h-4" />}
            x{s}
          </button>
        ))}
        {/* ミュートボタン */}
        <button
          onClick={() => {
            const newMuted = toggleMute();
            setIsSoundMuted(newMuted);
          }}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-[#3D3D3D] font-bold transition-all hover:bg-gray-100`}
          style={{ backgroundColor: isSoundMuted ? '#3D3D3D' : 'var(--card-bg)', color: isSoundMuted ? 'white' : 'inherit' }}
          title={isSoundMuted ? (language === 'ja' ? 'サウンドON' : 'Sound ON') : (language === 'ja' ? 'ミュート' : 'Mute')}
        >
          {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#3D3D3D]">
          {battleState === 'preparing' && (language === 'ja' ? 'バトル準備中...' : 'Preparing Battle...')}
          {battleState === 'fighting' && (language === 'ja' ? 'バトル中!' : 'Battle!')}
          {battleState === 'finished' && (language === 'ja' ? 'バトル終了' : 'Battle End')}
        </h2>
      </div>

      {/* バトルフィールド */}
      <div className="pop-card p-4 lg:p-6 relative overflow-hidden">
        {/* PC版: 横並び（自分左、相手右）、スマホ: 縦並び（相手上、自分下） */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">

          {/* プレイヤー側（PC: 左、スマホ: 下なのでorderで調整） */}
          <div className="flex-1 space-y-2 order-2 lg:order-1 relative">
            {/* ダメージ表示（プレイヤー側・複数スタック） */}
            {damageDisplays.filter(d => d.target === 'player').map((damageDisplay) => (
              <div
                key={damageDisplay.key}
                className="absolute top-1/2 left-1/2 z-30 pointer-events-none"
                style={{
                  animation: 'damage-pop 2.5s ease-out forwards',
                  transform: `translate(calc(-50% + ${damageDisplay.offsetX}px), calc(-50% + ${damageDisplay.offsetY}px))`,
                }}
              >
                <span
                  className={`text-4xl lg:text-5xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}
                  style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.7)' }}
                >
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-2xl lg:text-3xl ml-2">CRIT!</span>}
                </span>
              </div>
            ))}

            {/* プレイヤーHPバー */}
            <div className="flex items-center gap-2 p-2 rounded-lg border-2" style={{ borderColor: 'var(--pop-green)', backgroundColor: 'rgba(42, 157, 143, 0.1)' }}>
              {/* アイコン */}
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--pop-green)' }} />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--pop-green)' }}>
                  {personaName?.charAt(0)?.toUpperCase() || 'P'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate" style={{ color: 'var(--pop-green)' }}>
                    {personaName || (language === 'ja' ? 'あなた' : 'You')}
                  </span>
                  <span className="text-xs font-bold ml-2" style={{ color: 'var(--pop-green)' }}>
                    {playerTotalHp} / {playerMaxHp}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-[#3D3D3D]">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${playerMaxHp > 0 ? (playerTotalHp / playerMaxHp) * 100 : 0}%`,
                      backgroundColor: 'var(--pop-green)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* プレイヤーカードエリア（シェイク対象） */}
            <div ref={playerContainerRef} className="space-y-2">
            {/* プレイヤー前衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '前衛' : 'Front'}</p>
              <div className="flex gap-1 justify-center relative flex-wrap">
                {playerFrontCards.map((card, index) => {
                  return (
                    <div
                      key={`player-front-${index}`}
                      className={`relative transition-transform duration-150 ${card.isActive ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isPlayerTeamAlive}
                      />
                      {isPlayerTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {card.isActive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
                {/* 火花エフェクト */}
                {hitEffects.filter(e => e.target === 'player').map(effect => (
                  <div key={effect.key} className="absolute pointer-events-none z-20" style={{ left: `${effect.x}%`, top: `${effect.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="spark-burst bg-red-500/80" />
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180);
                      const distance = 50 + Math.random() * 20;
                      return (
                        <div key={i} className="spark-particle" style={{ '--spark-x': `${Math.cos(angle) * distance}px`, '--spark-y': `${Math.sin(angle) * distance}px`, backgroundColor: i % 2 === 0 ? '#EF4444' : '#F97316', animationDelay: `${i * 0.02}s` } as React.CSSProperties} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* プレイヤー後衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '後衛' : 'Back'}</p>
              <div className="flex gap-1 justify-center flex-wrap">
                {playerBackCards.map((card, index) => {
                  return (
                    <div
                      key={`player-back-${index}`}
                      className={`relative transition-transform duration-150 ${card.isActive ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isPlayerTeamAlive}
                      />
                      {isPlayerTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {card.isActive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>

          {/* VS（中央）- スキル発動表示（積み上げ式） */}
          <div className="flex items-center justify-center order-1 lg:order-2 py-2 lg:py-0 lg:px-4 relative min-w-20">
            <span className="text-3xl lg:text-4xl font-black text-gray-300">VS</span>
            {/* スキル発動を積み上げ表示（下から上へ） */}
            {skillDisplays.length > 0 && (
              <div className="absolute inset-0 flex flex-col-reverse items-center justify-center pointer-events-none gap-1 overflow-visible">
                {skillDisplays.map((display, index) => (
                  <div
                    key={display.key}
                    className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg border-2 text-center whitespace-nowrap"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      borderColor: display.isPlayerAttacking ? 'var(--pop-green)' : 'var(--pop-red)',
                      boxShadow: display.isPlayerAttacking
                        ? '0 0 10px rgba(42, 157, 143, 0.5)'
                        : '0 0 10px rgba(230, 57, 70, 0.5)',
                      animation: 'bounce-in 0.2s ease-out',
                      opacity: 1 - (index * 0.15), // 古いものは少し薄く
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <Zap
                        className="w-3 h-3 lg:w-4 lg:h-4"
                        style={{ color: display.isPlayerAttacking ? 'var(--pop-green)' : 'var(--pop-red)' }}
                      />
                      <span className="text-white font-bold text-xs block">
                        {SKILL_DESCRIPTIONS[display.skill][language === 'ja' ? 'ja' : 'en'].split('（')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 相手側（PC: 右、スマホ: 上） */}
          <div className="flex-1 space-y-2 order-0 lg:order-3 relative">
            {/* ダメージ表示（相手側・複数スタック） */}
            {damageDisplays.filter(d => d.target === 'opponent').map((damageDisplay) => (
              <div
                key={damageDisplay.key}
                className="absolute top-1/2 left-1/2 z-30 pointer-events-none"
                style={{
                  animation: 'damage-pop 2.5s ease-out forwards',
                  transform: `translate(calc(-50% + ${damageDisplay.offsetX}px), calc(-50% + ${damageDisplay.offsetY}px))`,
                }}
              >
                <span
                  className={`text-4xl lg:text-5xl font-black drop-shadow-lg ${damageDisplay.isCritical ? 'text-yellow-400' : 'text-red-500'}`}
                  style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.7)' }}
                >
                  -{damageDisplay.damage}
                  {damageDisplay.isCritical && <span className="text-2xl lg:text-3xl ml-2">CRIT!</span>}
                </span>
              </div>
            ))}

            {/* 相手HPバー */}
            <div className="flex items-center gap-2 p-2 rounded-lg border-2" style={{ borderColor: 'var(--pop-red)', backgroundColor: 'rgba(230, 57, 70, 0.1)' }}>
              {/* アイコン */}
              {opponentAvatarUrl ? (
                <img src={opponentAvatarUrl} alt="" className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--pop-red)' }} />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--pop-red)' }}>
                  {opponentName?.charAt(0)?.toUpperCase() || 'AI'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate" style={{ color: 'var(--pop-red)' }}>
                    {opponentName || 'AI'}
                  </span>
                  <span className="text-xs font-bold ml-2" style={{ color: 'var(--pop-red)' }}>
                    {opponentTotalHp} / {opponentMaxHp}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-[#3D3D3D]">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${opponentMaxHp > 0 ? (opponentTotalHp / opponentMaxHp) * 100 : 0}%`,
                      backgroundColor: 'var(--pop-red)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 相手カードエリア（シェイク対象） */}
            <div ref={opponentContainerRef} className="space-y-2">
            {/* 相手前衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '前衛' : 'Front'}</p>
              <div className="flex gap-1 justify-center relative flex-wrap">
                {opponentFrontCards.map((card, index) => {
                  return (
                    <div
                      key={`opponent-front-${index}`}
                      className={`relative transition-transform duration-150 ${card.isActive ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isOpponentTeamAlive}
                      />
                      {isOpponentTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {card.isActive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(255, 165, 0, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
                {/* 火花エフェクト */}
                {hitEffects.filter(e => e.target === 'opponent').map(effect => (
                  <div key={effect.key} className="absolute pointer-events-none z-20" style={{ left: `${effect.x}%`, top: `${effect.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="spark-burst bg-orange-400/80" />
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180);
                      const distance = 50 + Math.random() * 20;
                      return (
                        <div key={i} className="spark-particle" style={{ '--spark-x': `${Math.cos(angle) * distance}px`, '--spark-y': `${Math.sin(angle) * distance}px`, backgroundColor: i % 2 === 0 ? '#F97316' : '#FBBF24', animationDelay: `${i * 0.02}s` } as React.CSSProperties} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 相手後衛 */}
            <div>
              <p className="text-xs text-center text-gray-400 mb-1">{language === 'ja' ? '後衛' : 'Back'}</p>
              <div className="flex gap-1 justify-center flex-wrap">
                {opponentBackCards.map((card, index) => {
                  return (
                    <div
                      key={`opponent-back-${index}`}
                      className={`relative transition-transform duration-150 ${card.isActive ? 'scale-105 z-10' : ''}`}
                    >
                      <BattleCard
                        card={card}
                        size="small"
                        showStats={false}
                        disabled={!isOpponentTeamAlive}
                      />
                      {isOpponentTeamAlive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden" style={{ border: '3px solid transparent' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-400/40 transition-all duration-75" style={{ height: `${getCardTimerPercent(card)}%` }} />
                        </div>
                      )}
                      {card.isActive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 20px 5px rgba(255, 165, 0, 0.7)', animation: 'pulse 0.3s ease-in-out infinite' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>
        </div>

      </div>

      {/* バトルログ */}
      <div className="pop-card p-4 max-h-32 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-600 mb-2">
          {language === 'ja' ? 'バトルログ' : 'Battle Log'}
        </h3>
        <div className="space-y-1 text-xs">
          {battleLog.map((log, index) => (
            <div key={index} className="text-gray-600">{log}</div>
          ))}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-center gap-4">
        {battleState === 'fighting' && (
          <button
            onClick={skipToEnd}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <Zap className="w-5 h-5" />
            {language === 'ja' ? 'スキップ' : 'Skip'}
          </button>
        )}
      </div>

      {/* バトル開始演出 */}
      {showBattleStart && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center" style={{ animation: 'bounce-in 0.5s ease-out' }}>
            <div
              className="text-6xl md:text-8xl font-black text-white"
              style={{
                textShadow: '0 0 20px var(--pop-red), 0 0 40px var(--pop-yellow), 0 0 60px var(--pop-red)',
                animation: 'pulse-glow 1s ease-in-out infinite',
              }}
            >
              {language === 'ja' ? 'バトル開始！' : 'Battle Start!'}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Swords className="w-12 h-12 text-white animate-bounce" />
              <Zap className="w-12 h-12 text-yellow-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
              <Swords className="w-12 h-12 text-white animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* ローディングオーバーレイ（バトル終了後、結果取得中） */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
            <p className="text-white text-lg font-bold">
              {language === 'ja' ? '結果を読み込み中...' : 'Loading results...'}
            </p>
          </div>
        </div>
      )}

      {/* 結果ポップアップ */}
      {showResultPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-hidden">
          {/* 紙吹雪エフェクト（勝利時のみ） */}
          {winner === 'player' && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-20px',
                    width: `${8 + Math.random() * 8}px`,
                    height: `${8 + Math.random() * 8}px`,
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
                    borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}
          <div
            className="pop-card p-8 max-w-md w-full mx-4 text-center relative z-10"
            style={{ animation: 'bounce-in 0.5s ease-out' }}
          >
            {/* 結果ラベル（大きく上に） */}
            <div className="mb-6">
              {winner === 'player' && (
                <h2 className="text-4xl font-black" style={{ color: 'var(--pop-green)' }}>
                  {language === 'ja' ? '勝利！' : 'Victory!'}
                </h2>
              )}
              {winner === 'opponent' && (
                <h2 className="text-4xl font-black" style={{ color: 'var(--pop-red)' }}>
                  {language === 'ja' ? '敗北...' : 'Defeat...'}
                </h2>
              )}
              {winner === 'draw' && (
                <h2 className="text-4xl font-black" style={{ color: 'var(--pop-yellow)' }}>
                  {language === 'ja' ? '引き分け' : 'Draw'}
                </h2>
              )}
            </div>

            {/* 戦績情報 */}
            {battleStats && (
              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--pop-green)' }}>
                      {battleStats.wins}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'ja' ? '勝利' : 'Wins'}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--pop-yellow)' }}>
                      #{battleStats.rank || '-'}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'ja' ? '順位' : 'Rank'}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--pop-purple)' }}>
                      {battleStats.score}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'ja' ? 'スコア' : 'Score'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Xでシェアボタン */}
              <button
                onClick={() => {
                  const resultParam = winner === 'player' ? 'win' : winner === 'opponent' ? 'lose' : 'draw';
                  const wins = battleStats?.wins || 0;
                  const rank = battleStats?.rank || '-';
                  const score = battleStats?.score || 0;

                  const shareText = language === 'ja'
                    ? `積みゲーで殴り合おう！積みゲーを消化すればするほど強くなる！\n\n#ツミナビ #積みゲーバトル`
                    : `Battle with your backlog! The more you play, the stronger you get!\n\n#TsumiNavi #BacklogBattle`;

                  // OG画像付きのシェアページURL
                  const shareUrl = `https://tsumi-navi.vercel.app/share/battle?result=${resultParam}&wins=${wins}&rank=${rank}&score=${score}&lang=${language}`;

                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                  window.open(twitterUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 font-bold w-full"
                style={{ backgroundColor: '#000', color: '#fff' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {language === 'ja' ? 'Xでシェア' : 'Share on X'}
              </button>

              <button
                onClick={() => {
                  setShowResultPopup(false);
                  onRematch();
                }}
                className="pop-button flex items-center justify-center gap-2 px-6 py-3 text-white font-bold w-full"
              >
                <RotateCcw className="w-5 h-5" />
                {language === 'ja' ? 'もう一度バトル' : 'Battle Again'}
              </button>
              <button
                onClick={onBackToLobby}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] hover:bg-gray-100 font-bold w-full"
                style={{ backgroundColor: 'var(--card-bg)' }}
              >
                <Home className="w-5 h-5" />
                {language === 'ja' ? 'ロビーに戻る' : 'Back to Lobby'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
