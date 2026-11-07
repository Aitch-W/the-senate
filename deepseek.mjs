// DeepSeek adapter for the Senate demo. Keys are accepted per request and never stored.
import {getPack, votes} from './public/council.js';

const DEFAULT_BASE = 'https://api.deepseek.com';
const MODELS = new Set(['deepseek-chat', 'deepseek-reasoner']);

export function normalizeBase(input) {
  let base = String(input || DEFAULT_BASE).trim().replace(/\s+/g, '');
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
  base = base.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
  return base || DEFAULT_BASE;
}

export function redact(value) {
  return String(value?.message || value || '未知错误')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
    .slice(0, 320);
}

function cleanKey(value) {
  const key = String(value || '').trim();
  if (!key || key.length > 300) throw Error('请填写有效的 DeepSeek API Key');
  return key;
}

function cleanModel(value) {
  const model = String(value || 'deepseek-chat').trim();
  return MODELS.has(model) ? model : 'deepseek-chat';
}

async function requestJson(url, options, timeout = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetch(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!response.ok) {
    const message = data?.error?.message || data?.message || text.slice(0, 180) || `HTTP ${response.status}`;
    throw Error(`DeepSeek ${response.status}: ${redact(message)}`);
  }
  return data;
}

export async function testKey({key, model, base} = {}) {
  const token = cleanKey(key);
  const url = normalizeBase(base) + '/models';
  const data = await requestJson(url, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
  }, 20000);
  const models = (Array.isArray(data?.data) ? data.data : [])
    .map(item => item?.id)
    .filter(Boolean)
    .slice(0, 24);
  return {ok: true, models, model: cleanModel(model)};
}

async function chat({key, model, base, messages, maxTokens = 1800, temperature = 0.78}) {
  const token = cleanKey(key);
  const chosen = cleanModel(model);
  const body = {model: chosen, messages, max_tokens: maxTokens};
  if (chosen !== 'deepseek-reasoner') {
    body.temperature = temperature;
    body.response_format = {type: 'json_object'};
  }
  const url = normalizeBase(base) + '/chat/completions';
  const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json'};
  let data;
  try {
    data = await requestJson(url, {method: 'POST', headers, body: JSON.stringify(body)});
  } catch (error) {
    // Some proxies reject json_object; retry once without it.
    if (body.response_format && /response_format|json_object|json mode/i.test(String(error.message))) {
      delete body.response_format;
      data = await requestJson(url, {method: 'POST', headers, body: JSON.stringify(body)});
    } else throw error;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw Error('DeepSeek 没有返回内容');
  return content;
}

function parseObject(content) {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw Error('DeepSeek 返回格式不是 JSON');
  let data;
  try { data = JSON.parse(content.slice(start, end + 1)); }
  catch { throw Error('DeepSeek 返回的 JSON 无法解析'); }
  if (!data || typeof data !== 'object') throw Error('DeepSeek 返回内容为空');
  return data;
}

function listFrom(value, key) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([roleId, item]) => {
      if (typeof item === 'string') return {roleId, question: item, opinion: item};
      return {roleId, ...(item && typeof item === 'object' ? item : {})};
    });
  }
  return [];
}

function sagesFor(room) {
  const pack = getPack(room.pack);
  return room.seats
    .map((id, seat) => {
      if (id === 'friend') return null;
      const sage = pack.members.find(member => member.id === id);
      return sage ? {...sage, seat} : null;
    })
    .filter(Boolean);
}

function safeText(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function generateQuestions({key, model, base, room}) {
  const sages = sagesFor(room);
  if (!sages.length) throw Error('没有可生成质询的先贤席位');
  const sageLines = sages.map(sage =>
    `- ${sage.id}｜${sage.name}｜${sage.lens}｜${sage.mbti}｜口吻：${sage.voice}`
  ).join('\n');
  const messages = [
    {
      role: 'system',
      content: '你是《The Senate · 元老院消费决策议会》的中文编剧。你熟悉古罗马与华夏先贤的思想，也擅长把抽象的消费犹豫变成具体、尖锐的追问。你的输出必须是严格 json，不要 markdown，不要解释。',
    },
    {
      role: 'user',
      content: `用户正在考虑购买：
商品：${room.product}
价格：${room.price} 元
可用闲钱：${room.cash} 元
购买理由：${room.reason}
角色包：${room.packName || getPack(room.pack).name}
议会规模：${room.size} 席

请为下列每位入席先贤各写一个针对这次购买的质询：
${sageLines}

要求：
1. 每个问题必须结合商品、价格、闲钱或购买理由中的至少一个具体信息，追问使用场景、替代方案、长期代价、真实动机或机会成本。
2. 保持该先贤的身份、价值取向和口吻；不要写成通用理财建议。
3. 每个问题只问一件事，1–2 句，不超过 80 个汉字；不要给建议，不要替用户回答，不要出现“作为 AI”或括号标记。
4. 只输出 JSON，结构为：
{"questions":[{"roleId":"先贤 id","question":"问题"}]}
5. 必须覆盖上面列出的每一个 roleId，每个 roleId 只出现一次。`,
    },
  ];
  const content = await chat({key, model, base, messages, maxTokens: 1600});
  const data = parseObject(content);
  const raw = listFrom(data.questions ?? data, 'questions');
  const allowed = new Map(sages.map(sage => [sage.id, sage]));
  const seen = new Set();
  const questions = [];
  for (const item of raw) {
    const roleId = safeText(item?.roleId ?? item?.id, 40);
    const question = safeText(item?.question, 220);
    if (!allowed.has(roleId) || !question || seen.has(roleId)) continue;
    seen.add(roleId);
    questions.push({roleId, question});
  }
  if (!questions.length) throw Error('DeepSeek 没有返回有效的先贤质询');
  return questions;
}

export async function generateBallots({key, model, base, room}) {
  const sages = sagesFor(room);
  if (!sages.length) throw Error('没有可生成表态的先贤席位');
  const transcript = room.answers.map((item, index) =>
    `${index + 1}. ${item.name}：${item.question}\n   用户回答：${safeText(item.answer, 500)}`
  ).join('\n');
  const sageLines = sages.map(sage =>
    `- ${sage.id}｜${sage.name}｜${sage.lens}｜${sage.mbti}｜口吻：${sage.voice}`
  ).join('\n');
  const messages = [
    {
      role: 'system',
      content: '你是《The Senate · 元老院消费决策议会》的中文编剧。先贤要基于完整问答独立表态，观点应具体、有性格、彼此不同。输出必须是严格 json，不要 markdown，不要解释。',
    },
    {
      role: 'user',
      content: `商品：${room.product}
价格：${room.price} 元
可用闲钱：${room.cash} 元
购买理由：${room.reason}
角色包：${room.packName || getPack(room.pack).name}

完整质询记录：
${transcript}

请为下列每位先贤给出独立表态：
${sageLines}

要求：
1. vote 只能是「买」「暂缓」「不买」三个值之一。
2. opinion 用该先贤的口吻写 2–3 句，必须引用或回应至少一条用户回答；不要复述问题；不要给通用理财建议；不要出现“作为 AI”。
3. opinion 不超过 120 个汉字，不要在 opinion 里追加【买】之类的标记。
4. 只输出 JSON，结构为：
{"ballots":[{"roleId":"先贤 id","vote":"买","opinion":"观点"}]}
5. 必须覆盖每一个 roleId，每个 roleId 只出现一次。`,
    },
  ];
  const content = await chat({key, model, base, messages, maxTokens: 2200});
  const data = parseObject(content);
  const raw = listFrom(data.ballots ?? data, 'ballots');
  const allowed = new Map(sages.map(sage => [sage.id, sage]));
  const seen = new Set();
  const ballots = [];
  for (const item of raw) {
    const roleId = safeText(item?.roleId ?? item?.id, 40);
    const vote = safeText(item?.vote, 10);
    const opinion = safeText(item?.opinion, 300).replace(/【(买|暂缓|不买)】\s*$/g, '').trim();
    if (!allowed.has(roleId) || !votes.includes(vote) || !opinion || seen.has(roleId)) continue;
    seen.add(roleId);
    ballots.push({roleId, vote, opinion});
  }
  if (!ballots.length) throw Error('DeepSeek 没有返回有效的先贤表态');
  return ballots;
}
