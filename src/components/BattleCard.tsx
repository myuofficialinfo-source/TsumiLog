'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BattleCard as BattleCardType,
  RARITY_CONFIG,
  SKILL_DESCRIPTIONS,
  getGrowthStage,
} from '@/types/cardBattle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Swords, Shield, Heart, Sparkles } from 'lucide-react';

// Steam画像URL生成（フォールバック順序付き）
function getSteamImageUrls(appid: number, headerImage?: string): string[] {
  return [
    // 縦長カプセル画像（新形式）
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`,
    // ヘッダー画像（ほぼすべてのゲームに存在）
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
    // カードに保存されているヘッダー画像
    headerImage || '',
    // 代替ドメイン
    `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`,
  ].filter(Boolean);
}

interface BattleCardProps {
  card: BattleCardType;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showStats?: boolean;
}

export default function BattleCard({
  card,
  onClick,
  selected = false,
  disabled = false,
  size = 'medium',
  showStats = true,
}: BattleCardProps) {
  const { language } = useLanguage();
  const [imageIndex, setImageIndex] = useState(0);
  const imageUrls = useMemo(() => getSteamImageUrls(card.appid, card.headerImage), [card.appid, card.headerImage]);

  const rarityConfig = RARITY_CONFIG[card.rarity];
  const growthStage = getGrowthStage(card.playtimeMinutes);

  // サイズ設定（縦長カプセル画像用に調整）
  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-28 h-40',
    large: 'w-36 h-52',
  };

  const fontSizes = {
    small: 'text-[10px]',
    medium: 'text-xs',
    large: 'text-sm',
  };

  // レアリティによる光るエフェクト
  const glowStyle = useMemo(() => {
    const intensity = rarityConfig.glowIntensity;
    if (intensity === 0) return {};

    const glowSize = intensity * 8;
    const animationDuration = 3 - intensity * 0.5;

    return {
      boxShadow: `
        0 0 ${glowSize}px ${rarityConfig.glowColor},
        0 0 ${glowSize * 2}px ${rarityConfig.glowColor},
        inset 0 0 ${glowSize / 2}px ${rarityConfig.glowColor}
      `,
      animation: intensity >= 3 ? `pulse-glow ${animationDuration}s ease-in-out infinite` : undefined,
    };
  }, [rarityConfig]);

  // レジェンダリー用の虹色エフェクト
  const isLegendary = card.rarity === 'legendary';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
        ${sizeClasses[size]}
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105'}
        ${isLegendary ? 'legendary-card' : ''}
      `}
      style={{
        border: `3px solid ${rarityConfig.color}`,
        ...glowStyle,
      }}
    >
      {/* レジェンダリー虹色ボーダー */}
      {isLegendary && (
        <div className="absolute inset-0 rounded-xl pointer-events-none legendary-border" />
      )}

      {/* カード画像 */}
      <div className="relative w-full h-full">
        <Image
          src={imageUrls[imageIndex] || imageUrls[0]}
          alt={card.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 200px"
          unoptimized
          onError={() => {
            // 次のフォールバック画像に切り替え
            if (imageIndex < imageUrls.length - 1) {
              setImageIndex(prev => prev + 1);
            }
          }}
        />

        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* レアリティバッジ */}
        <div
          className={`absolute top-1 right-1 px-1.5 py-0.5 rounded ${fontSizes[size]} font-bold text-white`}
          style={{ backgroundColor: rarityConfig.color }}
        >
          {rarityConfig.label[language === 'ja' ? 'ja' : 'en']}
        </div>

        {/* 成長段階バッジ */}
        {growthStage !== 'normal' && (
          <div
            className={`absolute top-1 left-1 px-1.5 py-0.5 rounded ${fontSizes[size]} font-bold text-white`}
            style={{
              backgroundColor:
                growthStage === 'weak' ? '#9CA3AF' :
                growthStage === 'strong' ? '#22C55E' :
                '#EF4444',
            }}
          >
            {growthStage === 'weak' && (language === 'ja' ? '育成中' : 'Growing')}
            {growthStage === 'strong' && (language === 'ja' ? '強化済' : 'Maxed')}
            {growthStage === 'graduated' && (language === 'ja' ? '卒業' : 'Graduated')}
          </div>
        )}

        {/* カード情報 */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          {/* ゲーム名 */}
          <p className={`${fontSizes[size]} font-bold text-white truncate mb-1`}>
            {card.name}
          </p>

          {/* ステータス */}
          {showStats && (
            <div className="flex items-center gap-2">
              {/* HP */}
              <div className="flex items-center gap-0.5">
                <Heart className="w-3 h-3 text-red-400" />
                <span className={`${fontSizes[size]} text-white font-bold`}>
                  {card.hp}
                </span>
              </div>

              {/* 攻撃力 */}
              <div className="flex items-center gap-0.5">
                <Swords className="w-3 h-3 text-orange-400" />
                <span className={`${fontSizes[size]} text-white font-bold`}>
                  {card.attack}
                </span>
              </div>
            </div>
          )}

          {/* スキルアイコン */}
          {showStats && card.skills.length > 0 && (
            <div className="flex gap-1 mt-1">
              {card.skills.slice(0, 3).map((skill, index) => (
                <div
                  key={index}
                  className="px-1 py-0.5 bg-black/50 rounded text-[8px] text-white"
                  title={SKILL_DESCRIPTIONS[skill][language === 'ja' ? 'ja' : 'en']}
                >
                  {SKILL_DESCRIPTIONS[skill][language === 'ja' ? 'ja' : 'en'].split('（')[0]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 選択時のキラキラエフェクト */}
      {selected && (
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-2 left-2 w-4 h-4 text-yellow-300 animate-pulse" />
          <Sparkles className="absolute bottom-2 right-2 w-4 h-4 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      )}
    </div>
  );
}

// カードスロット（空のスロット表示用）
export function CardSlot({
  position,
  onClick,
  size = 'medium',
}: {
  position: 'front' | 'back';
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}) {
  const { language } = useLanguage();

  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-28 h-40',
    large: 'w-36 h-52',
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        border-3 border-dashed border-gray-400 rounded-xl
        flex flex-col items-center justify-center gap-1
        cursor-pointer hover:border-gray-600 hover:bg-gray-100/50
        transition-all duration-200
      `}
      style={{ backgroundColor: 'var(--background-secondary)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: position === 'front' ? 'var(--pop-red)' : 'var(--pop-blue)',
        }}
      >
        {position === 'front' ? (
          <Swords className="w-4 h-4 text-white" />
        ) : (
          <Shield className="w-4 h-4 text-white" />
        )}
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {position === 'front'
          ? (language === 'ja' ? '前衛' : 'Front')
          : (language === 'ja' ? '後衛' : 'Back')}
      </span>
    </div>
  );
}
