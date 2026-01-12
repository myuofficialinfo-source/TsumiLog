'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Header, Footer } from '@/components/Layout';
import Link from 'next/link';
import { Swords, Zap, Heart, Users, Star, Layers } from 'lucide-react';

export default function RulesPage() {
  const { language } = useLanguage();

  const skills = [
    // 攻撃系 (ATK)
    { name: 'ambush', ja: '奇襲', desc: { ja: '25%で2倍ダメージ', en: '25% chance for 2x damage' }, type: 'ATK' },
    { name: 'training', ja: 'トレーニング', desc: { ja: '初撃2倍', en: 'First attack deals 2x damage' }, type: 'ATK' },
    { name: 'buff', ja: 'バフ', desc: { ja: '攻撃+15%', en: 'Attack +15%' }, type: 'ATK' },
    { name: 'brutal', ja: 'ブルータル', desc: { ja: '与ダメ+25%', en: 'Damage +25%' }, type: 'ATK' },
    { name: 'gore', ja: 'ゴア', desc: { ja: '敵HP低いほど火力UP', en: 'More damage as enemy HP decreases' }, type: 'ATK' },
    { name: 'mature', ja: 'マチュア', desc: { ja: '攻撃+20%/防御-10%', en: 'ATK +20% / DEF -10%' }, type: 'ATK' },
    { name: 'expose', ja: 'エクスポーズ', desc: { ja: '敵防御-20%', en: 'Enemy defense -20%' }, type: 'ATK' },
    // 速度系 (SPD)
    { name: 'firstStrike', ja: '先制', desc: { ja: '攻撃間隔-500ms', en: 'Attack interval -500ms' }, type: 'SPD' },
    { name: 'speed', ja: '加速', desc: { ja: '攻撃間隔-300ms', en: 'Attack interval -300ms' }, type: 'SPD' },
    { name: 'earlybird', ja: 'アーリーバード', desc: { ja: '攻撃間隔-800ms', en: 'Attack interval -800ms' }, type: 'SPD' },
    // 防御系 (DEF)
    { name: 'defense', ja: '防御', desc: { ja: '被ダメ-30%', en: 'Damage taken -30%' }, type: 'DEF' },
    { name: 'fear', ja: '恐怖', desc: { ja: '敵攻撃-20%', en: 'Enemy attack -20%' }, type: 'DEF' },
    { name: 'freebie', ja: 'フリービー', desc: { ja: '10%で攻撃回避', en: '10% dodge chance' }, type: 'DEF' },
    { name: 'tutorial', ja: 'チュートリアル', desc: { ja: '初回被ダメ無効', en: 'First hit blocked' }, type: 'DEF' },
    { name: 'retouch', ja: 'レタッチ', desc: { ja: 'HP20%以下で防御2倍', en: 'Defense x2 when HP below 20%' }, type: 'DEF' },
    { name: 'utility', ja: 'ユーティリティ', desc: { ja: '状態異常耐性', en: 'Status effect resistance' }, type: 'DEF' },
    { name: 'docu', ja: 'ドキュメント', desc: { ja: '敵スキル効果-20%', en: 'Enemy skill effects -20%' }, type: 'DEF' },
    // 回復系 (HEAL)
    { name: 'absorb', ja: '吸収', desc: { ja: '与ダメの30%回復', en: 'Heal 30% of damage dealt' }, type: 'HEAL' },
    { name: 'teamwork', ja: '連携', desc: { ja: '攻撃時味方HP回復', en: 'Heal allies on attack' }, type: 'HEAL' },
    { name: 'party', ja: 'パーティ', desc: { ja: '味方多いほど攻撃UP', en: 'Attack scales with ally count' }, type: 'HEAL' },
    { name: 'study', ja: '学習', desc: { ja: '戦闘中攻撃力UP', en: 'Attack increases during battle' }, type: 'HEAL' },
    // 特殊系 (SP)
    { name: 'lucky', ja: '幸運', desc: { ja: '20%で1.5倍ダメージ', en: '20% chance for 1.5x damage' }, type: 'SP' },
    { name: 'calculate', ja: '計算', desc: { ja: 'クリティカル率+10%', en: 'Crit rate +10%' }, type: 'SP' },
    { name: 'reflect', ja: '反射', desc: { ja: '被ダメの20%返し', en: 'Reflect 20% damage taken' }, type: 'SP' },
    { name: 'explore', ja: '探索', desc: { ja: '敵防御20%無視', en: 'Ignore 20% enemy defense' }, type: 'SP' },
    { name: 'soundwave', ja: '音波', desc: { ja: '全体攻撃50%', en: 'AOE attack at 50% power' }, type: 'SP' },
    { name: 'publish', ja: 'パブリッシュ', desc: { ja: '弱点+10%ダメージ', en: 'Weakness damage +10%' }, type: 'SP' },
    { name: 'develop', ja: '開発', desc: { ja: 'ランダムボーナス', en: 'Random bonus effect' }, type: 'SP' },
    { name: 'design', ja: 'デザイン', desc: { ja: 'スキル効果+10%', en: 'Skill effects +10%' }, type: 'SP' },
    { name: 'produce', ja: 'プロデュース', desc: { ja: '味方スキル率UP', en: 'Ally skill activation rate up' }, type: 'SP' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ATK': return '#ff6347';
      case 'SPD': return '#ffd700';
      case 'DEF': return '#6495ed';
      case 'HEAL': return '#8a2be2';
      case 'SP': return '#32cd32';
      default: return '#888';
    }
  };

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
                ? '10枚のカード（前衛5枚 + 後衛5枚）でデッキを組む'
                : 'Build a deck of 10 cards (5 front line + 5 back line)'}
            </li>
            <li>
              {language === 'ja'
                ? 'バトルはリアルタイムで進行し、各カードが自動で攻撃'
                : 'Battle progresses in real-time with auto-attacks'}
            </li>
            <li>
              {language === 'ja'
                ? 'チームHPが0になった方が負け'
                : 'The team whose HP reaches 0 loses'}
            </li>
          </ul>
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
              ? '同じ属性のカードを3枚以上揃えるとボーナス発動'
              : 'Bonuses activate when you have 3+ cards with the same attribute'}
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
                ? 'トロコン達成でさらにボーナス追加（Common +3%, Rare +5%, SR +8%, UR +12%）'
                : 'Additional bonus for 100% achievements (Common +3%, Rare +5%, SR +8%, UR +12%)'}
            </li>
            <li className="text-sm opacity-75">
              {language === 'ja'
                ? '※30分未満でトロコンしたゲームはボーナスが1/10（実績稼ぎゲー対策）'
                : '※Games with 100% achievements under 30min get 1/10 bonus (anti-farming measure)'}
            </li>
            <li className="text-sm opacity-75">
              {language === 'ja'
                ? '※レビュー100件以下のゲームはトロコンボーナスが半分（マイナーゲー対策）'
                : '※Games with less than 100 reviews get half trophy bonus (anti-obscure game farming)'}
            </li>
          </ul>
        </section>

        {/* スキル一覧 */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: 'var(--pop-green)' }} />
            {language === 'ja' ? 'スキル一覧（29種類）' : 'Skills (29 types)'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ja'
              ? 'スキルはゲームのSteamユーザータグから自動決定されます'
              : 'Skills are automatically determined from Steam user tags'}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#ff6347' }}>ATK</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#ffd700', color: '#333' }}>SPD</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#6495ed' }}>DEF</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#8a2be2' }}>HEAL</span>
            <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: '#32cd32' }}>SP</span>
          </div>

          <div className="grid gap-2">
            {skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                <span
                  className="w-16 text-center text-xs font-bold px-2 py-1 rounded text-white"
                  style={{ backgroundColor: getTypeColor(skill.type) }}
                >
                  {skill.type}
                </span>
                <span className="font-bold text-sm w-32">
                  {language === 'ja' ? skill.ja : skill.name}
                </span>
                <span className="text-gray-600 text-sm">
                  {language === 'ja' ? skill.desc.ja : skill.desc.en}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* レアリティ */}
        <section className="pop-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: 'var(--pop-red)' }} />
            {language === 'ja' ? 'レアリティ' : 'Rarity'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ja'
              ? 'レアリティはSteamのレビュー数で決まり、マイナーゲームほどレア。成長上限に影響'
              : 'Rarity is determined by Steam review count - more obscure games are rarer. Affects growth cap'}
          </p>
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-center" style={{ color: '#FF6B6B' }}>UC</span>
              <span className="text-gray-700">{language === 'ja' ? '500件未満（マイナー）- 成長2.5倍' : 'Under 500 reviews (obscure) - Growth x2.5'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-center" style={{ color: '#FFD700' }}>SR</span>
              <span className="text-gray-700">{language === 'ja' ? '500〜10,000件 - 成長2.0倍' : '500-10,000 reviews - Growth x2.0'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-center" style={{ color: '#3B82F6' }}>R</span>
              <span className="text-gray-700">{language === 'ja' ? '1万〜5万件 - 成長1.5倍' : '10K-50K reviews - Growth x1.5'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-center" style={{ color: '#9CA3AF' }}>C</span>
              <span className="text-gray-700">{language === 'ja' ? '5万件以上（有名）- 成長1.0倍' : '50K+ reviews (famous) - Growth x1.0'}</span>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/battle"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg pop-button text-white font-bold"
          >
            <Swords className="w-5 h-5" />
            {language === 'ja' ? 'バトルへ' : 'Go to Battle'}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
