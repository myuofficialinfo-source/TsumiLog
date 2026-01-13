// カードバトル用の型定義

// 特別なゲームID（隠しスキル用）
export const SPECIAL_GAME_IDS = {
  DEVELOPER_BUFF: 2507560,  // ツミナビ開発者のゲーム - 全能力2倍
} as const;

// レアリティ（所有率の逆数で決定）
// C(コモン), R(レア), SR(スーパーレア), UC(ウルトラレア)
export type Rarity = 'common' | 'rare' | 'superRare' | 'ultraRare';

// ジャンルスキル（Steam全26ジャンル対応）
export type GenreSkill =
  // === ゲーム用ジャンル（ID 1-37） ===
  | 'firstStrike'   // Action (1): 先制攻撃
  | 'defense'       // Strategy (2): 防御
  | 'absorb'        // RPG (3): 吸収
  | 'lucky'         // Casual (4): 幸運
  | 'speed'         // Racing (9): 加速
  | 'teamwork'      // Sports (18): 連携
  | 'ambush'        // Indie (23): 奇襲
  | 'explore'       // Adventure (25): 探索
  | 'buff'          // Simulation (28): バフ
  | 'party'         // Massively Multiplayer (29): パーティ
  | 'freebie'       // Free to Play (37): フリービー
  // === ユーザータグ系（公式IDなし） ===
  | 'fear'          // Horror: 恐怖
  | 'reflect'       // Puzzle: 反射
  // === ソフトウェア用ジャンル（ID 50-60） ===
  | 'calculate'     // Accounting (50): 計算
  | 'soundwave'     // Audio Production (52): 音波
  | 'design'        // Design & Illustration (53): デザイン
  | 'study'         // Education (54): 学習
  | 'retouch'       // Photo Editing (55): レタッチ
  | 'training'      // Software Training (56): トレーニング
  | 'produce'       // Video Production (58): プロデュース
  | 'publish'       // Web Publishing (59): パブリッシュ
  | 'develop'       // Game Development (60): 開発
  // === タグ/コンテンツ系（ID 70-84） ===
  | 'mature'        // Sexual Content (71): マチュア
  | 'expose'        // Nudity (72): エクスポーズ
  | 'brutal'        // Violent (73): ブルータル
  | 'gore'          // Gore (74): ゴア
  | 'docu'          // Documentary (81): ドキュメント
  | 'tutorial'      // Tutorial (84): チュートリアル
  // === 隠しスキル（特定ゲーム専用） ===
  | 'developerBuff';  // 開発者バフ（全能力2倍）- 表示されない

// ジャンルとスキルのマッピング（Steam全ジャンル対応）
export const GENRE_SKILL_MAP: Record<string, GenreSkill> = {
  // === ゲーム用ジャンル ===
  'Action': 'firstStrike',
  'Strategy': 'defense',
  'RPG': 'absorb',
  'Casual': 'lucky',
  'Racing': 'speed',
  'Sports': 'teamwork',
  'Indie': 'ambush',
  'Adventure': 'explore',
  'Simulation': 'buff',
  'Massively Multiplayer': 'party',
  'Free to Play': 'freebie',
  // === ユーザータグ系 ===
  'Horror': 'fear',
  'Puzzle': 'reflect',
  // === ソフトウェア用ジャンル ===
  'Accounting': 'calculate',
  'Animation & Modeling': 'design',  // animateは削除、designに統合
  'Audio Production': 'soundwave',
  'Design & Illustration': 'design',
  'Education': 'study',
  'Photo Editing': 'retouch',
  'Software Training': 'training',
  'Utilities': 'defense',  // utilityは削除、defenseに統合
  'Video Production': 'produce',
  'Web Publishing': 'publish',
  'Game Development': 'develop',
  // === タグ/コンテンツ系 ===
  'Early Access': 'ambush',  // earlybirdは削除、ambushに統合
  'Sexual Content': 'mature',
  'Nudity': 'expose',
  'Violent': 'brutal',
  'Gore': 'gore',
  'Documentary': 'docu',
  'Tutorial': 'tutorial',
  // === 日本語対応 ===
  'アクション': 'firstStrike',
  'ストラテジー': 'defense',
  'ロールプレイング': 'absorb',
  'カジュアル': 'lucky',
  'レース': 'speed',
  'スポーツ': 'teamwork',
  'インディー': 'ambush',
  'アドベンチャー': 'explore',
  'シミュレーション': 'buff',
  'MMO': 'party',
  '基本無料': 'freebie',
  'ホラー': 'fear',
  'パズル': 'reflect',
  '会計': 'calculate',
  'アニメーション': 'design',  // animateは削除、designに統合
  '音声制作': 'soundwave',
  'デザイン': 'design',
  '教育': 'study',
  '写真編集': 'retouch',
  'トレーニング': 'training',
  'ユーティリティ': 'defense',  // utilityは削除、defenseに統合
  '動画制作': 'produce',
  'Web': 'publish',
  'ゲーム開発': 'develop',
  '早期アクセス': 'ambush',  // earlybirdは削除、ambushに統合
  '性的コンテンツ': 'mature',
  '裸体': 'expose',
  '暴力': 'brutal',
  'ゴア': 'gore',
  'ドキュメンタリー': 'docu',
  'チュートリアル': 'tutorial',
};

// ===== タグ座標ベースのスキル計算システム =====

// 日本語タグ→英語タグ変換マップ（Steam全タグ網羅）
export const JA_TO_EN: Record<string, string> = {
  // === アクション・戦闘系 ===
  'アクション': 'Action',
  'アドベンチャー': 'Adventure',
  'アクションアドベンチャー': 'Action-Adventure',
  'アクションRPG': 'Action RPG',
  'アーケード': 'Arcade',
  'シューター': 'Shooter',
  'シューティング': 'Shooter',
  'FPS': 'FPS',
  'TPS': 'Third Person Shooter',
  'サードパーソン': 'Third Person',
  'サードパーソンシューター': 'Third Person Shooter',
  '一人称視点': 'First-Person',
  '三人称視点': 'Third Person',
  'ハクスラ': 'Hack and Slash',
  'ハックアンドスラッシュ': 'Hack and Slash',
  '格闘': 'Fighting',
  '格闘ゲーム': 'Fighting',
  'ベルトスクロール': 'Beat \'em up',
  'ベルトスクロールアクション': 'Beat \'em up',
  'ソウルライク': 'Souls-like',
  'ソウルズライク': 'Souls-like',
  '弾幕': 'Bullet Hell',
  '弾幕シューティング': 'Bullet Hell',
  'シュート・エム・アップ': 'Shoot \'Em Up',
  'スクロールシューター': 'Shoot \'Em Up',
  '縦スクロール': 'Shoot \'Em Up',
  '横スクロール': 'Side Scroller',
  'トップダウンシューター': 'Top-Down Shooter',
  'トップダウン': 'Top-Down',
  'ツインスティックシューター': 'Twin Stick Shooter',
  'アリーナシューター': 'Arena Shooter',
  'タクティカルシューター': 'Tactical Shooter',
  'ルートシューター': 'Looter Shooter',
  'ヒーローシューター': 'Hero Shooter',
  '銃撃戦': 'Gun Combat',
  '剣戟': 'Swordplay',
  '近接戦闘': 'Melee',
  '銃': 'Shooter',
  '暴力': 'Violent',
  '暴力的': 'Violent',
  'ゴア': 'Gore',
  '流血': 'Gore',
  '残酷': 'Gore',
  '成人向け': 'Mature',
  'アダルト': 'Adult',
  'NSFW': 'NSFW',
  '性的コンテンツ': 'Sexual Content',
  'ヌード': 'Nudity',

  // === ローグライク系 ===
  'ローグライク': 'Roguelike',
  'ローグライト': 'Roguelite',
  'ローグヴァニア': 'Roguevania',
  '伝統的ローグライク': 'Traditional Roguelike',
  'ローグライクデッキビルダー': 'Roguelike Deckbuilder',
  '高難易度': 'Difficult',
  '難しい': 'Difficult',
  '鬼畜': 'Difficult',
  'パーマデス': 'Permadeath',
  '永久死': 'Permadeath',
  'ダンジョン探索': 'Dungeon Crawler',
  'ダンジョンクローラー': 'Dungeon Crawler',
  'ダンジョン': 'Dungeon Crawler',
  'プロシージャル生成': 'Procedural Generation',
  '手続き生成': 'Procedural Generation',
  'ランダム生成': 'Procedural Generation',

  // === 戦略・タクティカル系 ===
  'ストラテジー': 'Strategy',
  '戦略': 'Strategy',
  'ターン制': 'Turn-Based',
  'ターンベース': 'Turn-Based',
  'ターン制ストラテジー': 'Turn-Based Strategy',
  'ターン制戦術': 'Turn-Based Tactics',
  'ターン制戦闘': 'Turn-Based Combat',
  'リアルタイムストラテジー': 'RTS',
  'リアルタイム戦略': 'RTS',
  'RTS': 'RTS',
  'リアルタイム戦術': 'Real Time Tactics',
  'タワーディフェンス': 'Tower Defense',
  'タワーディフェンス要素': 'Tower Defense',
  'カードゲーム': 'Card Game',
  'カードバトラー': 'Card Battler',
  'デッキ構築': 'Deckbuilding',
  'トレーディングカードゲーム': 'Trading Card Game',
  'コレクタブルカードゲーム': 'Collectible Card Game',
  'タクティカル': 'Tactical',
  '戦術': 'Tactical',
  'タクティカルRPG': 'Tactical RPG',
  '大戦略': 'Grand Strategy',
  'グランドストラテジー': 'Grand Strategy',
  '4X': '4X',
  '軍事': 'Military',
  '戦争': 'War',
  '戦争ゲーム': 'Wargame',
  'オートバトラー': 'Auto Battler',
  'オートチェス': 'Auto Battler',
  'MOBA': 'MOBA',

  // === RPG・ストーリー系 ===
  'RPG': 'RPG',
  'ロールプレイング': 'RPG',
  'JRPG': 'JRPG',
  'CRPG': 'CRPG',
  'ARPG': 'Action RPG',
  'MMORPG': 'MMORPG',
  'MMO': 'MMO',
  'MORPG': 'MMORPG',
  'オープンワールド': 'Open World',
  'サンドボックス': 'Sandbox',
  '箱庭': 'Sandbox',
  '探索': 'Exploration',
  '探検': 'Exploration',
  'パーティベースRPG': 'Party-Based RPG',
  'パーティ制': 'Party-Based RPG',
  'キャラクタークリエイター': 'Character Customization',
  'キャラメイク': 'Character Customization',
  'キャラクターカスタマイズ': 'Character Customization',
  'クラスベース': 'Class-Based',
  '物語性': 'Story Rich',
  'ストーリー重視': 'Story Rich',
  'ストーリーリッチ': 'Story Rich',
  '濃厚なストーリー': 'Story Rich',
  'ナラティブ': 'Narrative',
  'マルチエンディング': 'Choices Matter',
  '選択が重要': 'Choices Matter',
  '分岐': 'Choices Matter',
  'ビジュアルノベル': 'Visual Novel',
  'ノベルゲーム': 'Visual Novel',
  'インタラクティブフィクション': 'Interactive Fiction',
  'ポイント&クリック': 'Point & Click',
  'ポイントアンドクリック': 'Point & Click',
  '選択方式アドベンチャー': 'Choose Your Own Adventure',
  'ウォーキングシミュレーター': 'Walking Simulator',
  'ウォーキングシム': 'Walking Simulator',
  '会話': 'Conversation',
  '対話': 'Dialogue',

  // === ホラー・ダーク系 ===
  'ホラー': 'Horror',
  'サバイバルホラー': 'Survival Horror',
  '精神的恐怖': 'Psychological Horror',
  'サイコホラー': 'Psychological Horror',
  'サイコロジカルホラー': 'Psychological Horror',
  'コズミックホラー': 'Lovecraftian',
  'クトゥルフ': 'Lovecraftian',
  'ラヴクラフト的': 'Lovecraftian',
  'ダーク': 'Dark',
  '暗い': 'Dark',
  'ダークファンタジー': 'Dark Fantasy',
  'ダークコメディ': 'Dark Comedy',
  'ゴシック': 'Gothic',
  '雰囲気': 'Atmospheric',
  '雰囲気重視': 'Atmospheric',
  'ミステリー': 'Mystery',
  '探偵': 'Mystery',
  '謎解き': 'Mystery',
  'スリラー': 'Thriller',
  'サスペンス': 'Thriller',
  '超常現象': 'Supernatural',
  '怪談': 'Supernatural',

  // === カジュアル・パズル系 ===
  'カジュアル': 'Casual',
  'リラックス': 'Relaxing',
  'のんびり': 'Relaxing',
  '癒し': 'Relaxing',
  '居心地の良い': 'Cozy',
  'ほのぼの': 'Cozy',
  'コージー': 'Cozy',
  '心温まる': 'Wholesome',
  'かわいい': 'Cute',
  'キュート': 'Cute',
  '可愛い': 'Cute',
  'カラフル': 'Colorful',
  'パズル': 'Puzzle',
  'パズルプラットフォーマー': 'Puzzle Platformer',
  'ロジック': 'Logic',
  '論理': 'Logic',
  'マッチ3': 'Match 3',
  '隠しオブジェクト': 'Hidden Object',
  'プログラミング': 'Programming',
  'ハッキング': 'Hacking',
  'コーディング': 'Programming',
  '物理演算': 'Physics',
  '物理パズル': 'Physics',
  'プラットフォーマー': 'Platformer',
  'プラットフォームアクション': 'Platformer',
  '精密プラットフォーマー': 'Precision Platformer',
  'シネマティックプラットフォーマー': 'Cinematic Platformer',
  '3Dプラットフォーマー': '3D Platformer',
  '2Dプラットフォーマー': '2D Platformer',
  'メトロイドヴァニア': 'Metroidvania',
  'メトロイドバニア': 'Metroidvania',

  // === マルチプレイ系 ===
  'マルチプレイヤー': 'Multiplayer',
  'マルチプレイ': 'Multiplayer',
  'マルチ': 'Multiplayer',
  'シングルプレイヤー': 'Singleplayer',
  'シングルプレイ': 'Singleplayer',
  '一人用': 'Singleplayer',
  'オンライン協力プレイ': 'Online Co-Op',
  'オンラインCo-op': 'Online Co-Op',
  'オンラインマルチ': 'Online Multiplayer',
  'ローカル協力プレイ': 'Local Co-Op',
  'ローカルCo-op': 'Local Co-Op',
  'ローカルマルチ': 'Local Multiplayer',
  '協力プレイ': 'Co-op',
  'Co-op': 'Co-op',
  'コープ': 'Co-op',
  '分割画面': 'Split Screen',
  '画面分割': 'Split Screen',
  'PvP': 'PvP',
  'PvE': 'PvE',
  '対戦': 'Competitive',
  '競争': 'Competitive',
  'ランク戦': 'Competitive',
  'バトルロイヤル': 'Battle Royale',
  'バトロワ': 'Battle Royale',
  'チームベース': 'Team-Based',
  '大人数マルチプレイ': 'Massively Multiplayer',
  '非同期マルチプレイ': 'Asynchronous Multiplayer',
  '基本プレイ無料': 'Free to Play',
  '基本無料': 'Free to Play',
  'F2P': 'Free to Play',

  // === シミュレーション系 ===
  'シミュレーション': 'Simulation',
  'シム': 'Simulation',
  '建設': 'Building',
  '建築': 'Building',
  '街づくり': 'City Builder',
  '都市建設': 'City Builder',
  'シティビルダー': 'City Builder',
  '拠点建設': 'Base Building',
  'コロニーシム': 'Colony Sim',
  'マネジメント': 'Management',
  '経営': 'Management',
  '経営シミュレーション': 'Management',
  'タイクーン': 'Tycoon',
  '経済': 'Economy',
  'クラフト': 'Crafting',
  '製作': 'Crafting',
  '作成': 'Crafting',
  '農業': 'Farming Sim',
  '農業シミュレーション': 'Farming Sim',
  '農場': 'Farming Sim',
  'ライフシム': 'Life Sim',
  '生活シム': 'Life Sim',
  '恋愛シミュレーション': 'Dating Sim',
  '恋愛': 'Dating Sim',
  '乙女ゲーム': 'Otome',
  '乙女': 'Otome',
  'BL': 'Boys Love',
  '資源管理': 'Resource Management',
  '自動化': 'Automation',
  'オートメーション': 'Automation',
  '工場': 'Automation',
  '政治シミュレーション': 'Political Sim',
  '政治': 'Political',
  '医療': 'Medical Sim',
  '飛行': 'Flight',
  'フライトシム': 'Flight',

  // === サバイバル系 ===
  'サバイバル': 'Survival',
  'サバイバルクラフト': 'Survival',
  'オープンワールドサバイバルクラフト': 'Open World Survival Craft',
  '狩り': 'Hunting',
  'ハンティング': 'Hunting',
  '釣り': 'Fishing',
  'フィッシング': 'Fishing',
  '自然': 'Nature',
  '環境': 'Nature',

  // === スポーツ・レース系 ===
  'スポーツ': 'Sports',
  'レース': 'Racing',
  'レーシング': 'Racing',
  'ドライビング': 'Driving',
  '運転': 'Driving',
  'アーケードレース': 'Arcade Racing',
  'レースシム': 'Racing Sim',
  'オフロード': 'Offroad',
  '自転車': 'Cycling',
  'サイクリング': 'Cycling',
  'ゴルフ': 'Golf',
  'サッカー': 'Soccer',
  'フットボール': 'Football',
  'バスケットボール': 'Basketball',
  '野球': 'Baseball',
  'テニス': 'Tennis',
  'ボクシング': 'Boxing',
  '格闘技': 'Martial Arts',
  'レスリング': 'Wrestling',
  'スケートボード': 'Skateboarding',
  'スノーボード': 'Snowboarding',
  'スキー': 'Skiing',
  'eスポーツ': 'eSports',

  // === 音楽・リズム系 ===
  '音楽': 'Music',
  'リズム': 'Rhythm',
  'リズムゲーム': 'Rhythm',
  '音ゲー': 'Rhythm',
  'サウンドトラック': 'Soundtrack',

  // === 世界観・設定系 ===
  'ファンタジー': 'Fantasy',
  'ハイファンタジー': 'Fantasy',
  'SF': 'Sci-fi',
  'サイエンスフィクション': 'Sci-fi',
  '宇宙': 'Space',
  'スペース': 'Space',
  '宇宙船': 'Space',
  'サイバーパンク': 'Cyberpunk',
  'スチームパンク': 'Steampunk',
  'ディーゼルパンク': 'Dieselpunk',
  '終末世界': 'Post-apocalyptic',
  'ポストアポカリプス': 'Post-apocalyptic',
  '終末': 'Post-apocalyptic',
  'ディストピア': 'Dystopian',
  'ユートピア': 'Utopian',
  '歴史': 'Historical',
  '歴史的': 'Historical',
  '中世': 'Medieval',
  '西部劇': 'Western',
  'ウエスタン': 'Western',
  '海賊': 'Pirates',
  '忍者': 'Ninja',
  '侍': 'Samurai',
  '神話': 'Mythology',
  '神話的': 'Mythology',
  '北欧神話': 'Norse Mythology',
  'ギリシャ神話': 'Greek Mythology',
  'ヴァンパイア': 'Vampire',
  '吸血鬼': 'Vampire',
  'ゾンビ': 'Zombies',
  'エイリアン': 'Aliens',
  '宇宙人': 'Aliens',
  'ロボット': 'Robots',
  'メカ': 'Mechs',
  'ドラゴン': 'Dragons',
  '魔法': 'Magic',
  '錬金術': 'Alchemy',
  '軍用機': 'Military',
  '潜水艦': 'Submarine',
  '海軍': 'Naval',
  '海戦': 'Naval Combat',
  '航空': 'Aviation',
  '列車': 'Trains',
  '鉄道': 'Trains',
  '車両': 'Vehicular Combat',

  // === スタイル・グラフィック系 ===
  'インディー': 'Indie',
  'インディーズ': 'Indie',
  'インディーゲーム': 'Indie',
  'アニメ': 'Anime',
  'カートゥーン': 'Cartoon',
  'アニメ風': 'Anime',
  'ピクセルグラフィック': 'Pixel Graphics',
  'ピクセル': 'Pixel Graphics',
  'ドット絵': 'Pixel Graphics',
  'レトロ': 'Retro',
  'クラシック': 'Classic',
  'ミニマル': 'Minimalist',
  'ミニマリスト': 'Minimalist',
  '手描き': 'Hand-drawn',
  'スタイリッシュ': 'Stylized',
  '美しい': 'Beautiful',
  'フォトリアル': 'Photorealistic',
  'リアル': 'Realistic',
  'リアリスティック': 'Realistic',
  '実験的': 'Experimental',
  'アート': 'Artistic',
  '芸術的': 'Artistic',
  'サイケデリック': 'Psychedelic',
  '抽象的': 'Abstract',
  'モノクロ': 'Noir',
  'ノワール': 'Noir',
  '2D': '2D',
  '2.5D': '2.5D',
  '3D': '3D',
  'VR': 'VR',
  'バーチャルリアリティ': 'VR',
  'VR対応': 'VR',
  'VR専用': 'VR Only',

  // === ゲームプレイ要素 ===
  'アーリーアクセス': 'Early Access',
  '早期アクセス': 'Early Access',
  'ベータ': 'Early Access',
  'MOD対応': 'Moddable',
  'MOD': 'Moddable',
  'レベルエディター': 'Level Editor',
  'マップエディター': 'Level Editor',
  'ワークショップ': 'Steam Workshop',
  '実績': 'Achievements',
  'コントローラー対応': 'Controller',
  'キーボード': 'Keyboard',
  'タッチ': 'Touch',
  'トラックIR': 'TrackIR',
  'クラウドセーブ': 'Cloud Saves',
  'リーダーボード': 'Leaderboards',
  'ランキング': 'Leaderboards',
  'リプレイ': 'Replay Value',
  '繰り返し遊べる': 'Replay Value',
  'やり込み': 'Replay Value',
  '周回': 'Replay Value',
  'チュートリアル': 'Tutorial',
  '学習曲線': 'Tutorial',
  'ルート': 'Loot',
  'ハクスラ要素': 'Loot',
  '収集': 'Collectathon',
  'コレクション': 'Collectathon',
  'アンロック': 'Unlockables',
  'スキルツリー': 'Skill Tree',
  '成長': 'Character Development',
  'レベルアップ': 'Leveling',
  'インベントリ管理': 'Inventory Management',
  '時間管理': 'Time Management',
  '時間制限': 'Time Attack',
  'タイムアタック': 'Time Attack',
  'スコアアタック': 'Score Attack',
  'ボス戦': 'Boss Rush',
  'ボスラッシュ': 'Boss Rush',
  'ウェーブ': 'Waves',
  '防衛': 'Tower Defense',
  'クイックタイムイベント': 'Quick-Time Events',
  'QTE': 'Quick-Time Events',
  'ステルス': 'Stealth',
  '隠密': 'Stealth',
  'パルクール': 'Parkour',
  '壁走り': 'Parkour',
  'グラップリングフック': 'Grappling Hook',
  'アスレチック': 'Parkour',
  'キャラクターアクションゲーム': 'Character Action Game',
  'スペクタクルファイター': 'Spectacle fighter',
  'コンボ': 'Combo',
  'コンボ重視': 'Combo',
  '反射神経': 'Twitch',
  'クリッカー': 'Clicker',
  '放置': 'Idle',
  '放置ゲー': 'Idle',
  'インクリメンタル': 'Incremental',
  'ファストトラベル': 'Fast Travel',
  '移動': 'Movement',
  'フリーランニング': 'Free Running',

  // === 感情・雰囲気系 ===
  '感動的': 'Emotional',
  '泣ける': 'Emotional',
  'エモーショナル': 'Emotional',
  'ドラマ': 'Drama',
  'ドラマチック': 'Drama',
  '映画的': 'Cinematic',
  'シネマティック': 'Cinematic',
  '没入感': 'Immersive',
  'イマーシブ': 'Immersive Sim',
  'イマーシブシム': 'Immersive Sim',
  'テンポが速い': 'Fast-Paced',
  'スピード感': 'Fast-Paced',
  'アドレナリン': 'Fast-Paced',
  'スローペース': 'Slow-paced',
  'ゆっくり': 'Slow-paced',
  'コメディ': 'Comedy',
  'コメディー': 'Comedy',
  'ギャグ': 'Comedy',
  '風刺': 'Satire',
  'ブラックユーモア': 'Dark Humor',
  'ブラックコメディ': 'Dark Comedy',
  'パロディ': 'Parody',
  'ミーム': 'Memes',
  'ファミリーフレンドリー': 'Family Friendly',
  '全年齢': 'Family Friendly',
  '子供向け': 'Family Friendly',
  '教育': 'Education',
  '教育的': 'Educational',

  // === ジャンル混合・特殊 ===
  'ボードゲーム': 'Board Game',
  'ボドゲ': 'Board Game',
  'テーブルトップ': 'Tabletop',
  'TRPG': 'Tabletop RPG',
  'テーブルトップRPG': 'Tabletop RPG',
  'パーティーゲーム': 'Party Game',
  'パーティー': 'Party Game',
  'トリビア': 'Trivia',
  'クイズ': 'Trivia',
  'ワードゲーム': 'Word Game',
  '言葉遊び': 'Word Game',
  '子供': 'Kid-Friendly',
  '女性主人公': 'Female Protagonist',
  '男性主人公': 'Male Protagonist',
  '動物': 'Animals',
  '恐竜': 'Dinosaurs',
  '犬': 'Dogs',
  '猫': 'Cats',
  '馬': 'Horses',

  // === その他 ===
  'デモ': 'Demo',
  '体験版': 'Demo',
  'ソフトウェア': 'Software',
  'ツール': 'Utilities',
  'ユーティリティ': 'Utilities',
  '動画制作': 'Video Production',
  '写真編集': 'Photo Editing',
  'オーディオ制作': 'Audio Production',
  'ゲーム開発': 'Game Development',
  'デザイン': 'Design & Illustration',
  'アニメーション': 'Animation & Modeling',
  'ドキュメンタリー': 'Documentary',
  'エピソード': 'Episodic',
  'エピソード形式': 'Episodic',
  '短編': 'Short',
  'ショート': 'Short',
  '長編': 'Long',
  'サントラ': 'Soundtrack',
};

// タグ座標データ（400+タグ）
export const TAG_COORDS: Record<string, { x: number; y: number }> = {
  // Combat / Action - 攻撃的・アクション系
  'Action': { x: 3, y: 2 },
  'Action-Adventure': { x: 2, y: 1 },
  'FPS': { x: 4, y: 3 },
  'Shooter': { x: 4, y: 2 },
  'Third Person': { x: 3, y: 1 },
  'Third Person Shooter': { x: 4, y: 2 },
  'Hack and Slash': { x: 4, y: 1 },
  'Fighting': { x: 4, y: 0 },
  'Beat \'em up': { x: 3, y: 0 },
  'Souls-like': { x: 3, y: -2 },
  'Action RPG': { x: 2, y: -1 },
  'Bullet Hell': { x: 3, y: 4 },
  'Shoot \'Em Up': { x: 3, y: 3 },
  'Top-Down Shooter': { x: 3, y: 2 },
  'Top-Down': { x: 1, y: 1 },
  'Twin Stick Shooter': { x: 3, y: 3 },
  'Arena Shooter': { x: 4, y: 3 },
  'Tactical Shooter': { x: 2, y: 1 },
  'Looter Shooter': { x: 3, y: 0 },
  'Hero Shooter': { x: 3, y: 2 },
  'Gore': { x: 4, y: -2 },
  'Violent': { x: 4, y: -1 },
  'Roguelike': { x: 2, y: 1 },
  'Roguelite': { x: 2, y: 2 },
  'Roguevania': { x: 2, y: 1 },
  'Traditional Roguelike': { x: 1, y: -1 },
  'Roguelike Deckbuilder': { x: 0, y: 0 },
  'Difficult': { x: 2, y: -1 },
  'Permadeath': { x: 3, y: -1 },
  'First-Person': { x: 2, y: 1 },
  'Melee': { x: 3, y: 0 },
  'Swordplay': { x: 3, y: 0 },
  'Dungeon Crawler': { x: 2, y: 0 },
  'Side Scroller': { x: 2, y: 2 },
  'Character Action Game': { x: 4, y: 1 },
  'Spectacle fighter': { x: 4, y: 1 },
  'Mature': { x: 3, y: -2 },
  'Adult': { x: 2, y: -2 },
  'NSFW': { x: 2, y: -2 },
  'Sexual Content': { x: 1, y: -2 },
  'Nudity': { x: 1, y: -2 },

  // Strategy / Tactical - 戦略・戦術系
  'Strategy': { x: -2, y: -2 },
  'Turn-Based': { x: -3, y: -3 },
  'Turn-Based Strategy': { x: -3, y: -2 },
  'Turn-Based Tactics': { x: -2, y: -2 },
  'Turn-Based Combat': { x: -2, y: -2 },
  'Real Time Tactics': { x: -1, y: 1 },
  'RTS': { x: -1, y: 2 },
  'Tower Defense': { x: -3, y: 0 },
  'Card Game': { x: -2, y: -1 },
  'Card Battler': { x: -1, y: -1 },
  'Deckbuilding': { x: -2, y: -1 },
  'Trading Card Game': { x: -2, y: -1 },
  'Collectible Card Game': { x: -2, y: -1 },
  'Tactical': { x: -2, y: -1 },
  'Tactical RPG': { x: -1, y: -2 },
  'Grand Strategy': { x: -3, y: -4 },
  '4X': { x: -2, y: -4 },
  'Stealth': { x: 1, y: 1 },
  'Military': { x: -1, y: -1 },
  'War': { x: 0, y: -1 },
  'Wargame': { x: -2, y: -2 },
  'Auto Battler': { x: -1, y: 0 },
  'MOBA': { x: 1, y: 2 },

  // Story / RPG - ストーリー・RPG系
  'RPG': { x: 0, y: -3 },
  'JRPG': { x: 1, y: -3 },
  'CRPG': { x: -1, y: -3 },
  'MMORPG': { x: 1, y: -2 },
  'MMO': { x: 0, y: -2 },
  'Party-Based RPG': { x: 0, y: -3 },
  'Adventure': { x: 0, y: -1 },
  'Story Rich': { x: -1, y: -2 },
  'Narrative': { x: -1, y: -2 },
  'Choices Matter': { x: -1, y: -3 },
  'Visual Novel': { x: -2, y: -2 },
  'Interactive Fiction': { x: -2, y: -3 },
  'Walking Simulator': { x: -1, y: -1 },
  'Exploration': { x: 0, y: 0 },
  'Open World': { x: 1, y: -1 },
  'Sandbox': { x: 1, y: 0 },
  'Singleplayer': { x: 0, y: -1 },
  'Sci-fi': { x: 1, y: 1 },
  'Fantasy': { x: 0, y: -2 },
  'Dark Fantasy': { x: 1, y: -2 },
  'Survival': { x: 1, y: -2 },
  'Open World Survival Craft': { x: 1, y: -1 },
  '3D': { x: 1, y: 0 },
  'Point & Click': { x: -1, y: -1 },
  'Choose Your Own Adventure': { x: -1, y: -2 },
  'Drama': { x: -1, y: -2 },
  'Emotional': { x: -1, y: -2 },
  'Conversation': { x: -2, y: -2 },
  'Dialogue': { x: -2, y: -2 },
  'Character Customization': { x: 0, y: -2 },
  'Space': { x: 1, y: 0 },
  'Cyberpunk': { x: 2, y: 0 },
  'Steampunk': { x: 1, y: -1 },
  'Post-apocalyptic': { x: 1, y: -2 },
  'Dystopian': { x: 0, y: -2 },
  'Historical': { x: -1, y: -2 },
  'Medieval': { x: 0, y: -2 },
  'Western': { x: 1, y: 0 },
  'Pirates': { x: 2, y: 1 },
  'Mythology': { x: 0, y: -2 },
  'Cinematic': { x: 0, y: -1 },
  'Immersive Sim': { x: 0, y: -1 },

  // Horror / Dark - ホラー・ダーク系
  'Horror': { x: -2, y: -1 },
  'Psychological Horror': { x: -3, y: -2 },
  'Survival Horror': { x: -2, y: -2 },
  'Lovecraftian': { x: -3, y: -3 },
  'Dark': { x: -1, y: -2 },
  'Gothic': { x: -2, y: -2 },
  'Atmospheric': { x: -1, y: -1 },
  'Mystery': { x: -2, y: -2 },
  'Thriller': { x: -1, y: 0 },
  'Supernatural': { x: -2, y: -1 },
  'Vampire': { x: -1, y: -1 },
  'Zombies': { x: 1, y: 0 },
  'Aliens': { x: 1, y: 0 },
  'Dark Comedy': { x: -1, y: 0 },
  'Dark Humor': { x: -1, y: 0 },
  'Noir': { x: -2, y: -1 },

  // Casual / Relaxing - カジュアル・リラックス系
  'Casual': { x: 0, y: 1 },
  'Relaxing': { x: -1, y: 0 },
  'Cozy': { x: -2, y: 0 },
  'Wholesome': { x: -2, y: 0 },
  'Cute': { x: -1, y: 1 },
  'Colorful': { x: 0, y: 1 },
  'Puzzle': { x: -1, y: -1 },
  'Puzzle Platformer': { x: 0, y: 0 },
  'Logic': { x: -2, y: -2 },
  'Match 3': { x: -1, y: 1 },
  'Hidden Object': { x: -2, y: -1 },
  'Programming': { x: -2, y: -2 },
  'Hacking': { x: 0, y: 0 },
  'Physics': { x: 0, y: 0 },
  'Platformer': { x: 2, y: 2 },
  'Precision Platformer': { x: 2, y: 2 },
  'Cinematic Platformer': { x: 1, y: 1 },
  '3D Platformer': { x: 2, y: 2 },
  '2D Platformer': { x: 2, y: 2 },
  'Metroidvania': { x: 2, y: 1 },
  'Indie': { x: 0, y: 0 },
  'Anime': { x: 0, y: 0 },
  'Cartoon': { x: -1, y: 1 },
  'Pixel Graphics': { x: 0, y: 1 },
  'Retro': { x: 1, y: 1 },
  'Classic': { x: 0, y: 0 },
  'Minimalist': { x: -1, y: 0 },
  'Hand-drawn': { x: -1, y: 0 },
  'Stylized': { x: 0, y: 0 },
  '2D': { x: 0, y: 1 },
  '2.5D': { x: 1, y: 1 },
  'Early Access': { x: 0, y: 2 },
  'Family Friendly': { x: -1, y: 1 },
  'Education': { x: -2, y: -1 },
  'Educational': { x: -2, y: -1 },
  'Comedy': { x: 0, y: 1 },
  'Satire': { x: -1, y: 0 },
  'Parody': { x: 0, y: 1 },
  'Memes': { x: 0, y: 2 },
  'Clicker': { x: -1, y: 1 },
  'Idle': { x: -2, y: 0 },
  'Incremental': { x: -2, y: 0 },

  // Multiplayer / Social - マルチプレイ・ソーシャル系
  'Multiplayer': { x: 1, y: 2 },
  'Online Multiplayer': { x: 1, y: 2 },
  'Co-op': { x: 0, y: 1 },
  'Online Co-Op': { x: 0, y: 2 },
  'Local Co-Op': { x: -1, y: 1 },
  'Local Multiplayer': { x: -1, y: 2 },
  'Split Screen': { x: -1, y: 1 },
  'PvP': { x: 3, y: 3 },
  'PvE': { x: 1, y: 1 },
  'Competitive': { x: 2, y: 3 },
  'Battle Royale': { x: 3, y: 4 },
  'Team-Based': { x: 1, y: 2 },
  'Massively Multiplayer': { x: 0, y: -1 },
  'Asynchronous Multiplayer': { x: 0, y: 0 },
  'Free to Play': { x: 0, y: 1 },
  'Party Game': { x: 0, y: 2 },
  'Board Game': { x: -1, y: -1 },
  'Tabletop': { x: -1, y: -1 },
  'Tabletop RPG': { x: -1, y: -2 },
  'Trivia': { x: -1, y: 1 },
  'Word Game': { x: -1, y: 0 },

  // Simulation / Building - シミュレーション・建設系
  'Simulation': { x: -1, y: -2 },
  'Building': { x: -2, y: -1 },
  'City Builder': { x: -3, y: -2 },
  'Base Building': { x: -2, y: -1 },
  'Colony Sim': { x: -2, y: -2 },
  'Management': { x: -2, y: -2 },
  'Tycoon': { x: -2, y: -2 },
  'Economy': { x: -2, y: -3 },
  'Crafting': { x: 0, y: -1 },
  'Farming Sim': { x: -2, y: -1 },
  'Life Sim': { x: -1, y: -1 },
  'Dating Sim': { x: -1, y: -1 },
  'Otome': { x: -1, y: -1 },
  'Boys Love': { x: -1, y: -1 },
  'Resource Management': { x: -2, y: -2 },
  'Automation': { x: -2, y: -2 },
  'Political Sim': { x: -3, y: -3 },
  'Political': { x: -2, y: -2 },
  'Medical Sim': { x: -2, y: -2 },
  'Flight': { x: 0, y: 2 },
  'Procedural Generation': { x: 1, y: 0 },
  'Hunting': { x: 1, y: 0 },
  'Fishing': { x: -1, y: 0 },
  'Nature': { x: -1, y: 0 },

  // Sports / Racing - スポーツ・レース系
  'Racing': { x: 2, y: 4 },
  'Racing Sim': { x: 1, y: 3 },
  'Arcade Racing': { x: 2, y: 4 },
  'Sports': { x: 2, y: 3 },
  'Driving': { x: 1, y: 3 },
  'Offroad': { x: 2, y: 3 },
  'Arcade': { x: 2, y: 2 },
  'Fast-Paced': { x: 3, y: 4 },
  'Soccer': { x: 2, y: 3 },
  'Football': { x: 2, y: 2 },
  'Basketball': { x: 2, y: 3 },
  'Baseball': { x: 1, y: 2 },
  'Tennis': { x: 2, y: 3 },
  'Golf': { x: 0, y: 1 },
  'Boxing': { x: 3, y: 2 },
  'Martial Arts': { x: 3, y: 1 },
  'Wrestling': { x: 3, y: 1 },
  'Cycling': { x: 1, y: 3 },
  'Skateboarding': { x: 2, y: 3 },
  'Snowboarding': { x: 2, y: 3 },
  'Skiing': { x: 2, y: 3 },
  'eSports': { x: 2, y: 3 },
  'Parkour': { x: 3, y: 4 },
  'Music': { x: 0, y: 2 },
  'Rhythm': { x: 1, y: 3 },
  'VR': { x: 1, y: 1 },
};

// スキル座標データ（29スキル）
export const SKILL_COORDS: Record<GenreSkill, { x: number; y: number }> = {
  // 右上エリア (攻撃+速度) - アクションゲーム向け
  ambush: { x: 1.1, y: 0.7 },
  training: { x: 0.7, y: 0.9 },
  firstStrike: { x: 1.3, y: 1.15 },

  // 右エリア (攻撃系) - シューター/格闘向け
  buff: { x: 1.3, y: 0.28 },
  brutal: { x: 1.2, y: -0.15 },
  gore: { x: 0.9, y: -0.4 },
  mature: { x: 0.6, y: -0.65 },

  // 上エリア (速度系) - スポーツ/レース向け
  speed: { x: 0.2, y: 0.85 },
  soundwave: { x: 0.4, y: 0.7 },

  // 中央上エリア - カジュアル向け
  tutorial: { x: -0.15, y: 0.4 },
  freebie: { x: -0.3, y: 0.18 },

  // 左エリア (防御系) - ストラテジー/シム向け
  defense: { x: -0.55, y: -0.18 },
  fear: { x: -0.38, y: -0.42 },
  docu: { x: -0.7, y: -0.55 },

  // 下エリア (耐久/回復系) - RPG/ストーリー向け
  retouch: { x: -0.08, y: -0.7 },
  party: { x: -0.6, y: -1.3 },
  study: { x: 0.4, y: -0.95 },
  absorb: { x: 0.45, y: -0.5 },
  teamwork: { x: 0.25, y: -0.28 },

  // 中央エリア (特殊系) - 汎用
  lucky: { x: 0.75, y: 0.48 },
  publish: { x: 0.95, y: 0.35 },
  develop: { x: 0.9, y: -0.02 },
  expose: { x: 0.75, y: -0.18 },
  explore: { x: 0.5, y: 0.1 },
  design: { x: 0.18, y: 0.25 },
  calculate: { x: -0.15, y: -0.22 },
  reflect: { x: 0.08, y: -0.48 },
  produce: { x: 0.02, y: 0.1 },

  // === 隠しスキル（座標計算で選ばれることはない） ===
  developerBuff: { x: 999, y: 999 },
};

// タグを正規化（日本語→英語変換）
export function normalizeTag(tag: string): string {
  return JA_TO_EN[tag] || tag;
}

// タグリストから座標ベースでスキルを計算
export function calculateSkillFromTags(tags: string[]): GenreSkill | null {
  if (tags.length === 0) return null;

  // タグ座標の平均を計算
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (const tag of tags) {
    const normalizedTag = normalizeTag(tag);
    const coord = TAG_COORDS[normalizedTag];
    if (coord) {
      totalX += coord.x;
      totalY += coord.y;
      count++;
    }
  }

  if (count === 0) return null;

  const avgX = totalX / count;
  const avgY = totalY / count;

  // 最も近いスキルを探す
  let nearestSkill: GenreSkill | null = null;
  let nearestDist = Infinity;

  for (const [skillName, coord] of Object.entries(SKILL_COORDS)) {
    const dist = Math.sqrt(Math.pow(coord.x - avgX, 2) + Math.pow(coord.y - avgY, 2));
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestSkill = skillName as GenreSkill;
    }
  }

  return nearestSkill;
}

// スキル効果の説明（全29スキル）
export const SKILL_DESCRIPTIONS: Record<GenreSkill, { ja: string; en: string }> = {
  // === ゲーム用 ===
  firstStrike: { ja: '先制攻撃（インターバル-500ms）', en: 'First Strike (Interval -500ms)' },
  defense: { ja: '防御（被ダメ-30%）', en: 'Defense (DMG taken -30%)' },
  absorb: { ja: '吸収（与ダメの30%回復）', en: 'Absorb (Heal 30% of damage)' },
  lucky: { ja: '幸運（20%でダメージ1.5倍）', en: 'Lucky (20% chance 1.5x DMG)' },
  speed: { ja: '加速（インターバル-300ms）', en: 'Speed (Interval -300ms)' },
  teamwork: { ja: '連携（攻撃時味方HP+5%回復）', en: 'Teamwork (Heal ally 5% on attack)' },
  ambush: { ja: '奇襲（25%で2倍ダメージ）', en: 'Ambush (25% chance 2x DMG)' },
  explore: { ja: '探索（敵防御無視20%）', en: 'Explore (Ignore 20% DEF)' },
  buff: { ja: 'バフ（自攻撃+15%）', en: 'Buff (Self ATK +15%)' },
  party: { ja: 'パーティ（味方多いほど攻撃UP）', en: 'Party (ATK+ per ally)' },
  freebie: { ja: 'フリービー（被ダメ時10%で無効化）', en: 'Freebie (10% dodge)' },
  // === タグ系 ===
  fear: { ja: '恐怖（敵攻撃-20%）', en: 'Fear (Enemy ATK -20%)' },
  reflect: { ja: '反射（被ダメの20%返し）', en: 'Reflect (Return 20% DMG)' },
  // === ソフトウェア用 ===
  calculate: { ja: '計算（クリティカル率+10%）', en: 'Calculate (Crit +10%)' },
  soundwave: { ja: '音波（全体攻撃、威力50%）', en: 'Soundwave (AoE 50% DMG)' },
  design: { ja: 'デザイン（スキル効果+10%）', en: 'Design (Skill effect +10%)' },
  study: { ja: '学習（戦闘中攻撃力徐々にUP）', en: 'Study (ATK grows in battle)' },
  retouch: { ja: 'レタッチ（HP20%以下で防御2倍）', en: 'Retouch (2x DEF when HP<20%)' },
  training: { ja: 'トレーニング（最初の攻撃2倍）', en: 'Training (First attack 2x)' },
  produce: { ja: 'プロデュース（味方スキル発動率UP）', en: 'Produce (Ally skill rate +)' },
  publish: { ja: 'パブリッシュ（敵情報公開、弱点+10%）', en: 'Publish (Expose weakness +10%)' },
  develop: { ja: '開発（ランダムスキル追加発動）', en: 'Develop (Random bonus skill)' },
  // === コンテンツ系 ===
  mature: { ja: 'マチュア（攻撃+20%、防御-10%）', en: 'Mature (ATK+20%, DEF-10%)' },
  expose: { ja: 'エクスポーズ（敵防御-20%）', en: 'Expose (Enemy DEF -20%)' },
  brutal: { ja: 'ブルータル（与ダメ+25%、被ダメ+15%）', en: 'Brutal (DMG+25%, taken+15%)' },
  gore: { ja: 'ゴア（敵HP低いほどダメージUP）', en: 'Gore (More DMG vs low HP)' },
  docu: { ja: 'ドキュメント（被ダメ-10%）', en: 'Document (DMG taken -10%)' },
  tutorial: { ja: 'チュートリアル（初回被ダメ無効）', en: 'Tutorial (Block first hit)' },
  // === 隠しスキル（表示されない） ===
  developerBuff: { ja: '???', en: '???' },
};

// レアリティ設定
export const RARITY_CONFIG: Record<Rarity, {
  label: { ja: string; en: string };
  growthCap: number;  // 成長上限倍率
  color: string;
  glowColor: string;
  glowIntensity: number;
}> = {
  common: {
    label: { ja: 'C', en: 'C' },
    growthCap: 1.0,
    color: '#9CA3AF',  // グレー
    glowColor: 'rgba(156, 163, 175, 0.5)',
    glowIntensity: 0,
  },
  rare: {
    label: { ja: 'R', en: 'R' },
    growthCap: 1.5,
    color: '#3B82F6',  // 青
    glowColor: 'rgba(59, 130, 246, 0.7)',
    glowIntensity: 1,
  },
  superRare: {
    label: { ja: 'SR', en: 'SR' },
    growthCap: 2.0,
    color: '#FFD700',  // 金
    glowColor: 'rgba(255, 215, 0, 0.8)',
    glowIntensity: 2,
  },
  ultraRare: {
    label: { ja: 'UC', en: 'UC' },
    growthCap: 2.5,
    color: '#FF6B6B',  // 虹色（ベースカラー）
    glowColor: 'rgba(255, 107, 107, 0.9)',
    glowIntensity: 3,
  },
};

// バトルカード
export interface BattleCard {
  appid: number;
  name: string;
  headerImage: string;

  // ステータス
  hp: number;           // レビュースコア × 10
  maxHp: number;
  attack: number;       // プレイ時間で算出（0〜30分）

  // メタ情報
  rarity: Rarity;
  genres: string[];
  skills: GenreSkill[];

  // 開発元・パブリッシャー（シナジー用）
  developer?: string;
  publisher?: string;
  series?: string;      // シリーズ名（タイトルから推測）
  tags?: string[];      // Steamタグ

  // プレイ情報
  playtimeMinutes: number;

  // レビュー数（表示用）
  reviewCount?: number;
}

// シナジータイプ
export type SynergyType = 'genre' | 'developer' | 'series' | 'tag';

// シナジーボーナス
export interface SynergyBonus {
  type: SynergyType;
  name: string;
  count: number;
  effect: {
    attackBonus?: number;  // 攻撃力ボーナス（%）
    hpBonus?: number;      // HPボーナス（%）
    skillBonus?: number;   // スキル効果ボーナス（%）
    specialEffect?: string;
  };
}

// デッキ
export interface Deck {
  frontLine: (BattleCard | null)[];  // 前衛5枚
  backLine: (BattleCard | null)[];   // 後衛5枚
  synergies: SynergyBonus[];
}

// バトル結果
export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerDeck: Deck;
  opponentDeck: Deck;
  battleLog: BattleLogEntry[];
  totalDamageDealt: number;
  totalDamageReceived: number;
}

// バトルログエントリ
export interface BattleLogEntry {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  skill?: GenreSkill;
  isCritical?: boolean;
  isReflected?: boolean;
  healAmount?: number;
}

// 積みゲー判定（30分未満 = 積みゲー）
export const BACKLOG_THRESHOLD_MINUTES = 30;

// 積みゲーかどうかを判定
export function isBacklogGame(playtimeMinutes: number): boolean {
  return playtimeMinutes < BACKLOG_THRESHOLD_MINUTES;
}

// 攻撃力計算（プレイ時間0〜30分で算出、30分が最大）
// 攻撃力 = (プレイ時間 / 30) × 100 × レアリティ倍率
export function calculateAttack(
  playtimeMinutes: number,
  rarity: Rarity
): number {
  // 30分以上は積みゲーではないので0
  if (playtimeMinutes >= BACKLOG_THRESHOLD_MINUTES) return 0;

  const rarityCap = RARITY_CONFIG[rarity].growthCap;
  // プレイ時間に応じて0〜100の攻撃力、それにレアリティ倍率をかける
  const baseAttack = (playtimeMinutes / BACKLOG_THRESHOLD_MINUTES) * 100;

  return Math.floor(baseAttack * rarityCap);
}

// Steam評価ラベルに基づくHP設定
// 高評価率 → HP値のマッピング
export function calculateHP(positiveRate: number | null | undefined): number {
  // レビューなし or 取得できない場合
  if (positiveRate === null || positiveRate === undefined) {
    return 200;
  }

  // 評価ラベルに基づくHP
  if (positiveRate >= 95) return 950;      // 圧倒的に好評
  if (positiveRate >= 80) return 800;      // 非常に好評
  if (positiveRate >= 70) return 700;      // 好評
  if (positiveRate >= 40) return 550;      // やや好評
  if (positiveRate >= 35) return 400;      // 賛否両論
  if (positiveRate >= 20) return 300;      // やや不評
  return 200;                               // 不評
}

// 昇華ボーナス設定（30分以上プレイしたゲームがデッキ全体にバフ、上限なし）
export const SUBLIMATION_BONUS: Record<Rarity, number> = {
  common: 5,       // +5%
  rare: 7,         // +7%
  superRare: 10,   // +10%
  ultraRare: 15,   // +15%
};

// トロコンボーナス設定（実績100%達成でさらにバフ）
export const TROPHY_BONUS: Record<Rarity, number> = {
  common: 6,       // +6%
  rare: 10,        // +10%
  superRare: 16,   // +16%
  ultraRare: 24,   // +24%
};

// 30分未満トロコンのボーナス減衰率（実績稼ぎゲー対策）
// 30分未満でトロコンしたゲームは昇華+トロコンボーナスが1/10になる
export const QUICK_TROPHY_PENALTY = 0.1;

// レビュー100件以下のトロコンボーナス減衰率（マイナーゲー実績稼ぎ対策）
// 30分以上でもレビュー100件以下のゲームはトロコンボーナスが半分
export const LOW_REVIEW_TROPHY_PENALTY = 0.5;

// レビュー数の閾値（これ以下だとトロコンボーナス減衰）
export const LOW_REVIEW_THRESHOLD = 100;

// 昇華済みゲームの情報
export interface SublimatedGame {
  appid: number;
  name: string;
  rarity: Rarity;
  playtimeMinutes: number;
  isCompleted: boolean;  // トロコン済みかどうか
  reviewCount?: number;  // レビュー数（トロコンボーナス減衰判定用）
}

// 昇華バフの計算結果
export interface SublimationBuffResult {
  totalBonus: number;           // 合計バフ％
  sublimationBonus: number;     // 昇華ボーナス％
  trophyBonus: number;          // トロコンボーナス％
  sublimatedCount: number;      // 昇華済みゲーム数
  completedCount: number;       // トロコン済みゲーム数
  breakdown: {
    rarity: Rarity;
    sublimationCount: number;
    trophyCount: number;
    bonus: number;
  }[];
}

// 昇華バフを計算
export function calculateSublimationBuff(
  sublimatedGames: SublimatedGame[]
): SublimationBuffResult {
  let sublimationBonus = 0;
  let trophyBonus = 0;
  let completedCount = 0;

  const breakdownMap: Record<Rarity, { sublimationCount: number; trophyCount: number; bonus: number }> = {
    common: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
    rare: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
    superRare: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
    ultraRare: { sublimationCount: 0, trophyCount: 0, bonus: 0 },
  };

  for (const game of sublimatedGames) {
    // 30分未満でトロコンしたゲームはペナルティ（実績稼ぎゲー対策）
    const isQuickTrophy = game.isCompleted && game.playtimeMinutes < BACKLOG_THRESHOLD_MINUTES;
    const penaltyMultiplier = isQuickTrophy ? QUICK_TROPHY_PENALTY : 1;

    // 昇華ボーナス（30分未満トロコンは1/10）
    const subBonus = SUBLIMATION_BONUS[game.rarity] * penaltyMultiplier;
    sublimationBonus += subBonus;
    breakdownMap[game.rarity].sublimationCount++;
    breakdownMap[game.rarity].bonus += subBonus;

    // トロコンボーナス
    if (game.isCompleted) {
      let trophyMultiplier = 1;

      if (isQuickTrophy) {
        // 30分未満トロコンは一律1/10（レビュー数関係なし）
        trophyMultiplier = QUICK_TROPHY_PENALTY;
      } else {
        // 30分以上の場合のみレビュー数をチェック
        // レビュー100件以下のゲームはトロコンボーナス半分（マイナーゲー対策）
        const isLowReview = game.reviewCount !== undefined && game.reviewCount < LOW_REVIEW_THRESHOLD;
        trophyMultiplier = isLowReview ? LOW_REVIEW_TROPHY_PENALTY : 1;
      }

      const tropBonus = TROPHY_BONUS[game.rarity] * trophyMultiplier;
      trophyBonus += tropBonus;
      completedCount++;
      breakdownMap[game.rarity].trophyCount++;
      breakdownMap[game.rarity].bonus += tropBonus;
    }
  }

  const breakdown = (['common', 'rare', 'superRare', 'ultraRare'] as Rarity[]).map(rarity => ({
    rarity,
    sublimationCount: breakdownMap[rarity].sublimationCount,
    trophyCount: breakdownMap[rarity].trophyCount,
    bonus: breakdownMap[rarity].bonus,
  }));

  return {
    totalBonus: sublimationBonus + trophyBonus,
    sublimationBonus,
    trophyBonus,
    sublimatedCount: sublimatedGames.length,
    completedCount,
    breakdown,
  };
}

// レビュー数からレアリティを計算
// 超マイナー・超メジャー = コモン、中堅マイナー = レア
// 10-500件の隠れた良作がUC（ウルトラレア）
export function calculateRarityFromReviews(reviewCount: number): Rarity {
  // レビュー10件以下または1万件以上 → C（みんな持ってる or ゲーム未満）
  if (reviewCount <= 10 || reviewCount >= 10000) return 'common';
  // 1000〜1万件 → R（人気作）
  if (reviewCount >= 1000) return 'rare';
  // 500〜1000件 → SR（中堅タイトル）
  if (reviewCount >= 500) return 'superRare';
  // 10〜500件 → UC（掘り出し物・隠れた名作）
  return 'ultraRare';
}

// ===== 防衛デッキ関連の型（非同期PVP用） =====

// 防衛デッキカード（DBに完全なカード情報を保存）
export interface DefenseDeckCard {
  appid: number;
  name: string;
  headerImage: string;
  hp: number;
  maxHp: number;
  attack: number;
  rarity: string;
  genres: string[];
  skills: string[];
  developer?: string;
  publisher?: string;
  tags?: string[];
  playtimeMinutes: number;
  reviewCount?: number;
}

// 対戦相手情報
export interface OpponentInfo {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  frontLine: DefenseDeckCard[];
  backLine: DefenseDeckCard[];
}

// 防衛デッキカードをバトルカードに変換
export function convertDefenseDeckToCards(defenseDeckCards: DefenseDeckCard[]): BattleCard[] {
  return defenseDeckCards.map(card => ({
    appid: card.appid,
    name: card.name,
    headerImage: card.headerImage,
    hp: card.hp,
    maxHp: card.maxHp,
    attack: card.attack,
    rarity: card.rarity as Rarity,
    genres: card.genres,
    skills: card.skills as GenreSkill[],
    developer: card.developer,
    publisher: card.publisher,
    tags: card.tags,
    playtimeMinutes: card.playtimeMinutes,
    reviewCount: card.reviewCount,
  }));
}

// ===== エネミー（CPU対戦）用データ =====

// 実際のSteamゲームデータ（エネミーデッキ用）
// ランク別に異なる強さのゲームを用意
export const ENEMY_GAME_POOL: {
  appid: number;
  name: string;
  genres: string[];
  positiveRate: number;   // HP決定用
  reviewCount: number;    // レアリティ決定用
  playtimeMinutes: number; // 攻撃力決定用（0-29の範囲）
}[] = [
  // === Tier 1: 初心者向け（低HP、低攻撃力、コモン中心） ===
  { appid: 730, name: 'Counter-Strike 2', genres: ['Action'], positiveRate: 85, reviewCount: 8000000, playtimeMinutes: 5 },
  { appid: 570, name: 'Dota 2', genres: ['Strategy'], positiveRate: 80, reviewCount: 2000000, playtimeMinutes: 8 },
  { appid: 440, name: 'Team Fortress 2', genres: ['Action'], positiveRate: 92, reviewCount: 1000000, playtimeMinutes: 6 },
  { appid: 578080, name: 'PUBG: BATTLEGROUNDS', genres: ['Action'], positiveRate: 55, reviewCount: 2500000, playtimeMinutes: 4 },
  { appid: 1172470, name: 'Apex Legends', genres: ['Action'], positiveRate: 78, reviewCount: 500000, playtimeMinutes: 7 },
  { appid: 252490, name: 'Rust', genres: ['Action', 'Indie'], positiveRate: 85, reviewCount: 600000, playtimeMinutes: 10 },
  { appid: 271590, name: 'Grand Theft Auto V', genres: ['Action'], positiveRate: 85, reviewCount: 1500000, playtimeMinutes: 9 },
  { appid: 1085660, name: 'Destiny 2', genres: ['Action'], positiveRate: 75, reviewCount: 400000, playtimeMinutes: 5 },

  // === Tier 2: 中級者向け（中HP、中攻撃力、レア混在） ===
  { appid: 292030, name: 'The Witcher 3: Wild Hunt', genres: ['RPG'], positiveRate: 95, reviewCount: 700000, playtimeMinutes: 15 },
  { appid: 1245620, name: 'ELDEN RING', genres: ['RPG', 'Action'], positiveRate: 92, reviewCount: 600000, playtimeMinutes: 18 },
  { appid: 1091500, name: 'Cyberpunk 2077', genres: ['RPG', 'Action'], positiveRate: 85, reviewCount: 800000, playtimeMinutes: 16 },
  { appid: 814380, name: 'Sekiro: Shadows Die Twice', genres: ['Action'], positiveRate: 95, reviewCount: 80000, playtimeMinutes: 20 },
  { appid: 374320, name: 'DARK SOULS III', genres: ['RPG', 'Action'], positiveRate: 94, reviewCount: 150000, playtimeMinutes: 17 },
  { appid: 582010, name: 'Monster Hunter: World', genres: ['Action', 'RPG'], positiveRate: 88, reviewCount: 120000, playtimeMinutes: 19 },
  { appid: 1174180, name: 'Red Dead Redemption 2', genres: ['Action'], positiveRate: 90, reviewCount: 500000, playtimeMinutes: 14 },
  { appid: 413150, name: 'Stardew Valley', genres: ['Simulation', 'RPG', 'Indie'], positiveRate: 97, reviewCount: 400000, playtimeMinutes: 12 },

  // === Tier 3: 上級者向け（高HP、高攻撃力、SR中心） ===
  { appid: 105600, name: 'Terraria', genres: ['Action', 'Indie'], positiveRate: 97, reviewCount: 900000, playtimeMinutes: 22 },
  { appid: 367520, name: 'Hollow Knight', genres: ['Action', 'Indie'], positiveRate: 96, reviewCount: 150000, playtimeMinutes: 24 },
  { appid: 1145360, name: 'Hades', genres: ['Action', 'RPG', 'Indie'], positiveRate: 97, reviewCount: 180000, playtimeMinutes: 23 },
  { appid: 250900, name: 'The Binding of Isaac: Rebirth', genres: ['Action', 'Indie'], positiveRate: 97, reviewCount: 100000, playtimeMinutes: 25 },
  { appid: 391540, name: 'Undertale', genres: ['RPG', 'Indie'], positiveRate: 96, reviewCount: 200000, playtimeMinutes: 21 },
  { appid: 620, name: 'Portal 2', genres: ['Puzzle', 'Action'], positiveRate: 99, reviewCount: 400000, playtimeMinutes: 20 },
  { appid: 268500, name: 'XCOM 2', genres: ['Strategy'], positiveRate: 87, reviewCount: 70000, playtimeMinutes: 26 },
  { appid: 236390, name: 'War Thunder', genres: ['Action', 'Simulation'], positiveRate: 70, reviewCount: 400000, playtimeMinutes: 22 },

  // === Tier 4: エキスパート向け（最高HP、最高攻撃力、UC中心） ===
  { appid: 524220, name: 'NieR:Automata', genres: ['RPG', 'Action'], positiveRate: 94, reviewCount: 80000, playtimeMinutes: 27 },
  { appid: 427520, name: 'Factorio', genres: ['Strategy', 'Simulation', 'Indie'], positiveRate: 97, reviewCount: 150000, playtimeMinutes: 28 },
  { appid: 294100, name: 'RimWorld', genres: ['Strategy', 'Simulation', 'Indie'], positiveRate: 98, reviewCount: 130000, playtimeMinutes: 29 },
  { appid: 1817070, name: 'Marvels Spider-Man Remastered', genres: ['Action'], positiveRate: 93, reviewCount: 60000, playtimeMinutes: 26 },
  { appid: 1938010, name: 'Raft', genres: ['Simulation', 'Indie'], positiveRate: 91, reviewCount: 40000, playtimeMinutes: 25 },
  { appid: 1817190, name: 'Marvels Spider-Man: Miles Morales', genres: ['Action'], positiveRate: 94, reviewCount: 30000, playtimeMinutes: 27 },
  { appid: 892970, name: 'Valheim', genres: ['Action', 'Indie'], positiveRate: 95, reviewCount: 350000, playtimeMinutes: 28 },
  { appid: 1063730, name: 'New World', genres: ['Action', 'RPG'], positiveRate: 68, reviewCount: 200000, playtimeMinutes: 24 },
];

// ランクティア定義（エネミー強度調整用）
export const ENEMY_RANK_CONFIG = {
  rookie:   { tierWeights: [0.7, 0.25, 0.05, 0], playtimeMultiplier: 0.3, hpMultiplier: 0.4 },   // Tier1中心、大幅に弱く
  bronze:   { tierWeights: [0.5, 0.35, 0.12, 0.03], playtimeMultiplier: 0.5, hpMultiplier: 0.6 },
  silver:   { tierWeights: [0.3, 0.4, 0.22, 0.08], playtimeMultiplier: 0.7, hpMultiplier: 0.75 },
  gold:     { tierWeights: [0.15, 0.35, 0.35, 0.15], playtimeMultiplier: 0.8, hpMultiplier: 0.85 },
  platinum: { tierWeights: [0.08, 0.25, 0.4, 0.27], playtimeMultiplier: 0.9, hpMultiplier: 0.9 },
  diamond:  { tierWeights: [0.03, 0.15, 0.4, 0.42], playtimeMultiplier: 0.95, hpMultiplier: 0.95 },
  master:   { tierWeights: [0, 0.1, 0.35, 0.55], playtimeMultiplier: 1.0, hpMultiplier: 1.0 },
  legend:   { tierWeights: [0, 0.05, 0.3, 0.65], playtimeMultiplier: 1.0, hpMultiplier: 1.0 },
} as const;

export type EnemyRank = keyof typeof ENEMY_RANK_CONFIG;

// ランク情報（名称・必要スコア・アイコン）
export const RANK_INFO: Record<EnemyRank, { ja: string; en: string; icon: string; minScore: number }> = {
  rookie:   { ja: '積みゲー入門生', en: 'Backlog Beginner', icon: '🌱', minScore: 0 },
  bronze:   { ja: '積みゲー初心者', en: 'Backlog Novice', icon: '🥉', minScore: 100 },
  silver:   { ja: '積みゲー消化中級者', en: 'Backlog Intermediate', icon: '🥈', minScore: 500 },
  gold:     { ja: '積みゲー消化上級者', en: 'Backlog Advanced', icon: '🥇', minScore: 800 },
  platinum: { ja: '積みゲー消化熟練者', en: 'Backlog Expert', icon: '💎', minScore: 1200 },
  diamond:  { ja: '積みゲーの達人', en: 'Backlog Master', icon: '💠', minScore: 2000 },
  master:   { ja: '積みゲーマスター', en: 'Backlog Grandmaster', icon: '👑', minScore: 4000 },
  legend:   { ja: '積みゲーゴッド', en: 'Backlog God', icon: '🐲', minScore: 8000 },
};

// スコアからエネミーランクを取得
export function getEnemyRankFromScore(score: number): EnemyRank {
  if (score >= 8000) return 'legend';
  if (score >= 4000) return 'master';
  if (score >= 2000) return 'diamond';
  if (score >= 1200) return 'platinum';
  if (score >= 800) return 'gold';
  if (score >= 500) return 'silver';
  if (score >= 100) return 'bronze';
  return 'rookie';
}

// エネミーデッキを生成（ランクに応じた強さ）
export function generateEnemyDeck(playerScore: number): { deck: Deck; enemyName: string } {
  const rank = getEnemyRankFromScore(playerScore);
  const config = ENEMY_RANK_CONFIG[rank];

  // ティア別にゲームを分類
  const tiers = [
    ENEMY_GAME_POOL.slice(0, 8),   // Tier 1
    ENEMY_GAME_POOL.slice(8, 16),  // Tier 2
    ENEMY_GAME_POOL.slice(16, 24), // Tier 3
    ENEMY_GAME_POOL.slice(24, 32), // Tier 4
  ];

  // 重みに基づいてゲームを選択
  const selectedGames: typeof ENEMY_GAME_POOL = [];
  for (let i = 0; i < 10; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let tierIndex = 0;

    for (let t = 0; t < 4; t++) {
      cumulative += config.tierWeights[t];
      if (rand < cumulative) {
        tierIndex = t;
        break;
      }
    }

    // 選択されたティアからランダムにゲームを選択（重複回避）
    const tierGames = tiers[tierIndex].filter(g =>
      !selectedGames.some(sg => sg.appid === g.appid)
    );
    if (tierGames.length > 0) {
      const game = tierGames[Math.floor(Math.random() * tierGames.length)];
      selectedGames.push(game);
    } else {
      // ティアのゲームが全て使用済みなら別ティアから選択
      const allAvailable = ENEMY_GAME_POOL.filter(g =>
        !selectedGames.some(sg => sg.appid === g.appid)
      );
      if (allAvailable.length > 0) {
        selectedGames.push(allAvailable[Math.floor(Math.random() * allAvailable.length)]);
      }
    }
  }

  // ゲームをバトルカードに変換
  const cards: BattleCard[] = selectedGames.map(game => {
    const rarity = calculateRarityFromReviews(game.reviewCount);
    const adjustedPlaytime = Math.floor(game.playtimeMinutes * config.playtimeMultiplier);
    const genres = game.genres;
    // 座標ベースでスキルを計算
    const calculatedSkill = calculateSkillFromTags(genres);
    const skills: GenreSkill[] = calculatedSkill ? [calculatedSkill] : [];

    const baseHp = calculateHP(game.positiveRate);
    const adjustedHp = Math.floor(baseHp * config.hpMultiplier);

    return {
      appid: game.appid,
      name: game.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      hp: adjustedHp,
      maxHp: adjustedHp,
      attack: calculateAttack(adjustedPlaytime, rarity),
      rarity,
      genres,
      skills: [...new Set(skills)],
      playtimeMinutes: adjustedPlaytime,
      reviewCount: game.reviewCount,
    };
  });

  // 攻撃力順でソートして前衛・後衛に配置
  cards.sort((a, b) => b.attack - a.attack);

  const frontLine: (BattleCard | null)[] = cards.slice(0, 5);
  const backLine: (BattleCard | null)[] = cards.slice(5, 10);

  while (frontLine.length < 5) frontLine.push(null);
  while (backLine.length < 5) backLine.push(null);

  // エネミー名をランクに応じて設定（RANK_INFOを使用）
  const rankInfo = RANK_INFO[rank];

  return {
    deck: { frontLine, backLine, synergies: [] },
    enemyName: rankInfo.ja, // 日本語名を使用（言語対応は呼び出し側で）
  };
}
