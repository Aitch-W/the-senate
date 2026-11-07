// Achievements are derived from saved records, including existing history.
// Resolving a cooling-off decision must not erase an earned milestone.
export const achievementDefinitions = [
  {id:'first-council',name:'初入元老院',latin:'PRIMA ASSEMBLEA',symbol:'神殿',condition:'完成第一场议会，并作出最终决定。',target:1,unit:'场议会',metric:'councils'},
  {id:'inquiry',name:'问道者',latin:'ARS QVAERENDI',symbol:'羽笔与卷宗',condition:'在已完成的议会中，累计认真回答 7 个质询。',target:7,unit:'个回答',metric:'answers'},
  {id:'fellowship',name:'好友同席',latin:'VOX AMICORVM',symbol:'握手与银盾',condition:'与至少一位好友共同完成一场议会。',target:1,unit:'场好友议会',metric:'friendCouncils'},
  {id:'patience',name:'交给时间',latin:'TEMPVS DOCET',symbol:'沙漏',condition:'在一场议会中选择「暂缓」，开启一次冷静期。',target:1,unit:'次冷静决定',metric:'pauses'},
  {id:'restraint',name:'有所不为',latin:'ARS TEMPERANTIAE',symbol:'钱袋与橄榄枝',condition:'在听取议会意见后，至少一次决定「不买」。',target:1,unit:'次不买决定',metric:'declines'},
  {id:'bookkeeper',name:'账簿执笔人',latin:'CVRA RATIONVM',symbol:'账簿与金笔',condition:'累计留下 3 笔收支记录，预算调整与议会购买也计入。',target:3,unit:'笔收支',metric:'entries'},
  {id:'sevenfold',name:'七度深思',latin:'SEPTEM CONSILIA',symbol:'桂冠与明灯',condition:'累计完成 7 场议会，每场都作出自己的决定。',target:7,unit:'场议会',metric:'councils'}
];

const votes = new Set(['买','暂缓','不买']);
function unique(items) {
  const ids = new Set();
  return items.filter(item => {
    if (!item || typeof item !== 'object') return false;
    if (!item.id) return true;
    if (ids.has(item.id)) return false;
    ids.add(item.id);return true;
  });
}

export function evaluateAchievements(ledger = {}) {
  const history = unique(Array.isArray(ledger?.history) ? ledger.history : [])
    .filter(record => votes.has(record.decision?.vote));
  const entries = unique(Array.isArray(ledger?.entries) ? ledger.entries : [])
    .filter(entry => ['income','expense'].includes(entry.kind) && Number(entry.amount) > 0);
  const metrics = {
    councils:history.length,
    answers:history.reduce((sum,record) => sum + (Array.isArray(record.answers)
      ? record.answers.filter(answer => typeof answer?.answer === 'string' && answer.answer.trim()).length : 0),0),
    friendCouncils:history.filter(record => record.seats?.includes('friend') || record.ballots?.some(ballot => ballot.source === 'friend')).length,
    pauses:history.filter(record => record.decision.vote === '暂缓' || record.originalDecision?.vote === '暂缓').length,
    declines:history.filter(record => record.decision.vote === '不买').length,
    entries:entries.length
  };
  return achievementDefinitions.map(definition => {
    const total = metrics[definition.metric];
    return {...definition,icon:`/assets/achievements/${definition.id}.png`,total,
      progress:Math.min(total,definition.target),unlocked:total >= definition.target};
  });
}
