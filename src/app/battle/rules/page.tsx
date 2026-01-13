'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Header, Footer } from '@/components/Layout';
import { Swords, Zap, Heart, Users, Star, Layers, Trophy } from 'lucide-react';

export default function RulesPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      <Header showBack backHref="/battle" />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--foreground)' }}>
          {language === 'ja' ? 'バトルルール' : 'Battle Rules'}
        </h1>

        {/* 基本ルール */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5" style={{ color: 'var(--pop-red)' }} />
            {language === 'ja' ? '基本ルール' : 'Basic Rules'}
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li>
              {language === 'ja'
                ? '10本のゲーム（前衛5本 + 後衛5本）でデッキを組む'
                : 'Build a deck of 10 games (5 front line + 5 back line)'}
            </li>
            <li>
              {language === 'ja'
                ? 'バトルはリアルタイムで進行し、各ゲームが自動で攻撃'
                : 'Battle progresses in real-time with auto-attacks'}
            </li>
            <li>
              {language === 'ja'
                ? 'チームHPが0になった方が負け'
                : 'The team whose HP reaches 0 loses'}
            </li>
          </ul>
        </section>

        {/* ステータス算出 */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: 'var(--pop-red)' }} />
            {language === 'ja' ? 'ステータス算出' : 'Stats Calculation'}
          </h2>

          {/* 攻撃力 */}
          <div className="mb-6">
            <h3 className="font-bold mb-3" style={{ color: 'var(--pop-red)' }}>
              {language === 'ja' ? '攻撃力（ATK）' : 'Attack (ATK)'}
            </h3>
            <p className="text-gray-700 mb-3">
              {language === 'ja'
                ? 'プレイ時間（0〜30分）に応じて算出。30分に近いほど高い攻撃力'
                : 'Based on playtime (0-30min). Closer to 30min = higher attack'}
            </p>
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <code>ATK = (プレイ時間 / 30) × 100 × レアリティ倍率</code>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-gray-600">
              <li>• C: ×1.0 / R: ×1.5 / SR: ×2.0 / UC: ×2.5</li>
              <li>• {language === 'ja' ? '30分以上は積みゲーではないためデッキにセットできない' : '30min+ is not backlog, so cannot be added to deck'}</li>
            </ul>
          </div>

          {/* HP */}
          <div>
            <h3 className="font-bold mb-3" style={{ color: 'var(--pop-blue)' }}>
              {language === 'ja' ? 'HP' : 'HP'}
            </h3>
            <p className="text-gray-700 mb-3">
              {language === 'ja'
                ? 'Steamレビューの好評率で決定'
                : 'Based on Steam review positive rate'}
            </p>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? '圧倒的に好評（95%+）' : 'Overwhelmingly Positive (95%+)'}</span>
                <span className="font-bold">950 HP</span>
              </div>
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? '非常に好評（80%+）' : 'Very Positive (80%+)'}</span>
                <span className="font-bold">800 HP</span>
              </div>
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? '好評（70%+）' : 'Positive (70%+)'}</span>
                <span className="font-bold">700 HP</span>
              </div>
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? 'やや好評（40%+）' : 'Mostly Positive (40%+)'}</span>
                <span className="font-bold">550 HP</span>
              </div>
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? '賛否両論（35%+）' : 'Mixed (35%+)'}</span>
                <span className="font-bold">400 HP</span>
              </div>
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? 'やや不評（20%+）' : 'Mostly Negative (20%+)'}</span>
                <span className="font-bold">300 HP</span>
              </div>
              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <span>{language === 'ja' ? '不評（20%未満）' : 'Negative (<20%)'}</span>
                <span className="font-bold">200 HP</span>
              </div>
            </div>
          </div>
        </section>

        {/* 前衛・後衛 */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" style={{ color: 'var(--pop-blue)' }} />
            {language === 'ja' ? '前衛・後衛システム' : 'Front/Back Line System'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,99,71,0.1)' }}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--pop-red)' }}>
                {language === 'ja' ? '前衛' : 'Front Line'}
              </h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>{language === 'ja' ? '攻撃力 +20%' : 'Attack +20%'}</li>
                <li>{language === 'ja' ? 'スキル効果 0.7倍' : 'Skill effects x0.7'}</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(100,149,237,0.1)' }}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--pop-blue)' }}>
                {language === 'ja' ? '後衛' : 'Back Line'}
              </h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>{language === 'ja' ? '攻撃力 -20%' : 'Attack -20%'}</li>
                <li>{language === 'ja' ? 'スキル効果 1.5倍' : 'Skill effects x1.5'}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* シナジー */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--pop-yellow)' }} />
            {language === 'ja' ? 'シナジーボーナス' : 'Synergy Bonuses'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ja'
              ? '同じ属性のゲームを3本以上揃えるとボーナス発動'
              : 'Bonuses activate when you have 3+ games with the same attribute'}
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="font-bold text-sm w-20">{language === 'ja' ? 'ジャンル' : 'Genre'}</span>
              <span className="text-gray-700">{language === 'ja' ? '攻撃力 +3%' : 'Attack +3%'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="font-bold text-sm w-20">{language === 'ja' ? '開発元' : 'Developer'}</span>
              <span className="text-gray-700">{language === 'ja' ? 'スキル効果 +3%' : 'Skill effects +3%'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="font-bold text-sm w-20">{language === 'ja' ? 'タグ' : 'Tag'}</span>
              <span className="text-gray-700">{language === 'ja' ? 'HP +3%' : 'HP +3%'}</span>
            </div>
          </div>
        </section>

        {/* 昇華システム */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: 'var(--pop-yellow)' }} />
            {language === 'ja' ? '昇華システム' : 'Sublimation System'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ja'
              ? '積みゲー（30分未満）を30分以上プレイすると「昇華」状態になり、デッキ全体にボーナス'
              : 'When you play a backlog game (under 30min) for 30+ minutes, it becomes "sublimated" and gives deck-wide bonuses'}
          </p>
          <ul className="space-y-2 text-gray-700">
            <li>
              {language === 'ja'
                ? 'レアリティに応じて攻撃力ボーナス（Common +5%, Rare +7%, SR +10%, UR +15%）'
                : 'Attack bonus by rarity (Common +5%, Rare +7%, SR +10%, UR +15%)'}
            </li>
            <li>
              {language === 'ja'
                ? '昇華数に上限なし - 積みゲーを消化するほど強くなる！'
                : 'No limit on sublimations - the more you clear your backlog, the stronger you get!'}
            </li>
            <li>
              {language === 'ja'
                ? 'トロコン達成でさらにボーナス追加（Common +6%, Rare +10%, SR +16%, UR +24%）'
                : 'Additional bonus for 100% achievements (Common +6%, Rare +10%, SR +16%, UR +24%)'}
            </li>
          </ul>
        </section>

        {/* スキル */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: 'var(--pop-green)' }} />
            {language === 'ja' ? 'スキル一覧（29種類）' : 'Skills (29 types)'}
          </h2>
          <p className="text-gray-700">
            {language === 'ja'
              ? 'スキルはゲームのタグから自動決定されます。'
              : 'Skills are automatically determined from game tags.'}
          </p>
        </section>

        {/* レアリティ */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: 'var(--pop-red)' }} />
            {language === 'ja' ? 'レアリティ' : 'Rarity'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ja'
              ? 'レアリティはSteamのレビュー数で決まり、攻撃力に影響する'
              : 'Rarity is determined by Steam review count and affects attack power'}
          </p>
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="w-12 font-bold text-center px-2 py-1 rounded text-white" style={{ backgroundColor: '#FF6B6B' }}>UC</span>
              <span className="text-gray-700 flex-1">{language === 'ja' ? '攻撃力×2.5' : 'ATK x2.5'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="w-12 font-bold text-center px-2 py-1 rounded" style={{ backgroundColor: '#FFD700', color: '#333' }}>SR</span>
              <span className="text-gray-700 flex-1">{language === 'ja' ? '攻撃力×2.0' : 'ATK x2.0'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="w-12 font-bold text-center px-2 py-1 rounded text-white" style={{ backgroundColor: '#3B82F6' }}>R</span>
              <span className="text-gray-700 flex-1">{language === 'ja' ? '攻撃力×1.5' : 'ATK x1.5'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="w-12 font-bold text-center px-2 py-1 rounded text-white" style={{ backgroundColor: '#9CA3AF' }}>C</span>
              <span className="text-gray-700 flex-1">{language === 'ja' ? '攻撃力×1.0' : 'ATK x1.0'}</span>
            </div>
          </div>
        </section>

        {/* ランクシステム */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: 'var(--pop-yellow)' }} />
            {language === 'ja' ? 'ランクシステム' : 'Rank System'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ja'
              ? 'バトルに勝利するとスコアが上昇し、ランクが上がります。'
              : 'Win battles to increase your score and rank up.'}
          </p>
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">🌱</span>
              <span className="font-bold w-40" style={{ color: '#9CA3AF' }}>{language === 'ja' ? '積みゲー入門生' : 'Beginner'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '0 スコア〜' : '0+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">🥉</span>
              <span className="font-bold w-40" style={{ color: '#CD7F32' }}>{language === 'ja' ? '積みゲー初心者' : 'Novice'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '100 スコア〜' : '100+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">🥈</span>
              <span className="font-bold w-40" style={{ color: '#C0C0C0' }}>{language === 'ja' ? '積みゲー消化中級者' : 'Intermediate'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '500 スコア〜' : '500+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">🥇</span>
              <span className="font-bold w-40" style={{ color: '#FFD700' }}>{language === 'ja' ? '積みゲー消化上級者' : 'Advanced'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '800 スコア〜' : '800+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">💎</span>
              <span className="font-bold w-40" style={{ color: '#7B8794' }}>{language === 'ja' ? '積みゲー消化熟練者' : 'Expert'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '1,200 スコア〜' : '1,200+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">💠</span>
              <span className="font-bold w-40" style={{ color: '#5DADE2' }}>{language === 'ja' ? '積みゲーの達人' : 'Master'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '2,000 スコア〜' : '2,000+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">👑</span>
              <span className="font-bold w-40" style={{ color: '#9B59B6' }}>{language === 'ja' ? '積みゲーマスター' : 'Grandmaster'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '4,000 スコア〜' : '4,000+ Score'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <span className="text-xl">🐲</span>
              <span className="font-bold w-40" style={{ color: '#FF6B6B' }}>{language === 'ja' ? '積みゲーゴッド' : 'God'}</span>
              <span className="text-gray-600 text-sm">{language === 'ja' ? '8,000 スコア〜' : '8,000+ Score'}</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
