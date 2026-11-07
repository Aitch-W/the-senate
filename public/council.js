const romanMembers = [
  {
    id: 'solon',
    name: '梭伦',
    en: 'SOLON',
    lens: '量入为出',
    mbti: 'ISTJ',
    color: '#5e746b',
    hair: '#d3c4a4',
    beard: true,
    style: 'roman',
    bias: -0.18,
    question: '扣除必要开支和应急储备后，这笔钱会影响你接下来的生活吗？',
    voice: '先留出生活和应急的余量，再谈这笔消费。'
  },
  {
    id: 'plato',
    name: '柏拉图',
    en: 'PLATO',
    lens: '追问真实',
    mbti: 'INFP',
    color: '#6f5f7a',
    hair: '#cfc6b5',
    beard: true,
    style: 'roman',
    bias: 0.02,
    question: '你想要的是它本身，还是它代表的某种形象？它真正解决的是什么？',
    voice: '先分清你想要的那个形象，与它真正能解决的问题。'
  },
  {
    id: 'caesar',
    name: '凯撒',
    en: 'CAESAR',
    lens: '行动价值',
    mbti: 'ENTJ',
    color: '#803e32',
    hair: '#514533',
    beard: false,
    hat: 'laurel',
    style: 'roman',
    bias: 0.12,
    question: '买下之后，你准备在什么时候、什么场景下第一次使用它？',
    voice: '明确第一次使用的场景，购买才会变成行动。'
  },
  {
    id: 'cicero',
    name: '西塞罗',
    en: 'CICERO',
    lens: '论证责任',
    mbti: 'ENFJ',
    color: '#7a5c3e',
    hair: '#c9bda6',
    beard: true,
    style: 'roman',
    bias: -0.04,
    question: '如果要对一个月后的自己解释这笔支出，你会怎么说？',
    voice: '试着向未来的自己解释这笔支出，理由是否站得住。'
  },
  {
    id: 'aristotle',
    name: '亚里士多德',
    en: 'ARISTOTLE',
    lens: '理性权衡',
    mbti: 'INTP',
    color: '#b59458',
    hair: '#8b806b',
    beard: true,
    style: 'roman',
    bias: -0.02,
    question: '你比较过哪些替代方案？已有的物品能否完成同样的事情？',
    voice: '把替代方案和已有物品放在一起比较，看增量价值。'
  },
  {
    id: 'cato',
    name: '加图',
    en: 'CATO',
    lens: '节制克己',
    mbti: 'ISTJ',
    color: '#4f5a63',
    hair: '#b7ab93',
    beard: true,
    style: 'roman',
    bias: -0.3,
    question: '如果没有人看见，也没有促销，你还会现在买吗？',
    voice: '克制不是否定快乐，而是先确认它是否真的必要。'
  },
  {
    id: 'epicurus',
    name: '伊壁鸠鲁',
    en: 'EPICURUS',
    lens: '长期幸福',
    mbti: 'ISFP',
    color: '#76806a',
    hair: '#d7cdb4',
    beard: true,
    style: 'roman',
    bias: 0.06,
    question: '拥有它之后，你会更轻松，还是多一份维护、分期或闲置的负担？',
    voice: '长期轻松的生活，比短暂的新鲜感更值得保留。'
  }
];

const chineseMembers = [
  {
    id: 'sima',
    name: '司马光',
    en: 'SIMA GUANG',
    lens: '审慎守常',
    mbti: 'ISTJ',
    color: '#6b5b45',
    hair: '#2e2820',
    beard: true,
    style: 'chinese',
    hat: 'guan',
    bias: -0.16,
    question: '这笔支出会打乱你原本的生活秩序吗？三个月后回看，它仍值得吗？',
    voice: '以史为镜，先看这笔支出会不会打乱你原有的秩序。'
  },
  {
    id: 'mozi',
    name: '墨子',
    en: 'MOZI',
    lens: '实用节用',
    mbti: 'INTJ',
    color: '#4f5d4a',
    hair: '#2a241d',
    beard: true,
    style: 'chinese',
    bias: -0.24,
    question: '它能带来什么实际用处？这份用处是否对得起它的价格？',
    voice: '衡量它带来的实际用处，别为无用之物耗费。'
  },
  {
    id: 'zhuangzi',
    name: '庄子',
    en: 'ZHUANGZI',
    lens: '自在无待',
    mbti: 'INFP',
    color: '#7b6a4b',
    hair: '#2c261f',
    beard: true,
    style: 'chinese',
    bias: 0.1,
    question: '如果不再和任何人比较，你还会想要它吗？',
    voice: '如果不再与别人比较，你还会想要它吗？'
  },
  {
    id: 'kongzi',
    name: '孔子',
    en: 'CONFUCIUS',
    lens: '礼与分寸',
    mbti: 'ENFJ',
    color: '#7a4a38',
    hair: '#2e2820',
    beard: true,
    style: 'chinese',
    hat: 'guan',
    bias: -0.03,
    question: '以你现在的处境与分寸，买下它会让心安，还是让心不安？',
    voice: '合乎你的处境与分寸，才会让你心安。'
  },
  {
    id: 'hanfei',
    name: '韩非子',
    en: 'HAN FEIZI',
    lens: '利害核算',
    mbti: 'INTJ',
    color: '#3f4a52',
    hair: '#241f1a',
    beard: true,
    style: 'chinese',
    bias: -0.18,
    question: '把价格、替代方案和后续成本都算进去，这笔交易还划算吗？',
    voice: '把价格、替代方案和后续成本都算清，再做判断。'
  },
  {
    id: 'tao',
    name: '陶渊明',
    en: 'TAO YUANMING',
    lens: '简朴自足',
    mbti: 'INFP',
    color: '#6d7a5f',
    hair: '#2d2720',
    beard: false,
    style: 'chinese',
    bias: 0.12,
    question: '拥有它会让生活更简单，还是多一件需要照看的东西？',
    voice: '拥有更少，有时反而更自在；确认它是否真的让你轻松。'
  },
  {
    id: 'fanli',
    name: '范蠡',
    en: 'FAN LI',
    lens: '时机取舍',
    mbti: 'ENTJ',
    color: '#8a5a3a',
    hair: '#2b241c',
    beard: false,
    style: 'chinese',
    bias: 0.05,
    question: '现在是合适的时机吗？同样的钱，是否有更值得的用处？',
    voice: '看时机，也看机会成本；该舍时舍，该取时取。'
  }
];

export const packs = {
  roman: {
    id: 'roman',
    name: '古罗马元老院包',
    short: '古罗马',
    en: 'ROMAN SENATE',
    mark: 'SENATVS',
    crest: 'SPQR',
    tagline: '羊皮 · 油画',
    theme: 'roman',
    members: romanMembers
  },
  chinese: {
    id: 'chinese',
    name: '华夏诸子先贤包',
    short: '华夏',
    en: 'CHINESE SAGES',
    mark: '華夏諸子',
    crest: '子',
    tagline: '木简 · 古风',
    theme: 'chinese',
    members: chineseMembers
  }
};

export const lockedPacks = [
  { id: 'modern', name: '近现代思辨包', short: '近现代', crest: '新', tagline: '待解锁', theme: 'modern', locked: true, members: [] },
  { id: 'easter', name: '趣味名士彩蛋包', short: '彩蛋', crest: '趣', tagline: '待解锁', theme: 'easter', locked: true, members: [] }
];

export const packList = [packs.roman, packs.chinese, ...lockedPacks];
export const sizes = [3, 5, 7];
export const sizeLabels = { 3: '快速合议庭', 5: '常规议事会', 7: '完整元老院' };
export const getPack = (id) => packs[id] || packs.roman;
export const allMembers = [...packs.roman.members, ...packs.chinese.members];
export const council = packs.roman.members;
export const votes = ['买', '暂缓', '不买'];
