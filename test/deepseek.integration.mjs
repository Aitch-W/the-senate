import http from 'node:http';

const mock = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/models') return res.end(JSON.stringify({data: [{id: 'deepseek-chat'}]}));
  if (req.url === '/chat/completions') {
    if (body.includes('完整质询记录')) {
      return res.end(JSON.stringify({choices: [{message: {content: JSON.stringify({ballots: [
        {roleId: 'solon', vote: '不买', opinion: 'AI 观点：你的回答还不够具体。'},
        {roleId: 'plato', vote: '暂缓', opinion: 'AI 观点：先分清想要与需要。'},
        {roleId: 'caesar', vote: '买', opinion: 'AI 观点：明天就把它用起来。'},
      ]})}}]}));
    }
    return res.end(JSON.stringify({choices: [{message: {content: JSON.stringify({questions: [
      {roleId: 'solon', question: 'AI 问题：这笔支出会打乱你的生活吗？'},
      {roleId: 'plato', question: 'AI 问题：你想要的是它本身吗？'},
      {roleId: 'caesar', question: 'AI 问题：你准备什么时候第一次用它？'},
    ]})}}]}));
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
const mockBase = `http://127.0.0.1:${mock.address().port}`;
const base = 'http://127.0.0.1:4180';
const post = async (p, b, t) => {
  const r = await fetch(base + p, {method: 'POST', headers: {'Content-Type': 'application/json', ...(t ? {Authorization: `Bearer ${t}`} : {})}, body: JSON.stringify(b)});
  return {status: r.status, data: await r.json()};
};
const created = await post('/api/rooms', {product: 'AI 测试商品', price: 999, cash: 5000, reason: '测试 DeepSeek 接入。', pack: 'roman', size: 3, seats: ['solon', 'plato', 'caesar']});
const room = created.data.room, owner = created.data.ownerToken;
const dev = {enabled: true, key: 'sk-mock-key', model: 'deepseek-chat', base: mockBase};
const started = await post(`/api/rooms/${room.id}/start`, {dev}, owner);
console.log('start', started.status, started.data.questionEngine, started.data.questions?.map(q => [q.ai, q.question]));
for (let i = 0; i < 3; i++) {
  const answer = await post(`/api/rooms/${room.id}/answer`, {index: i, answer: `回答 ${i}`}, owner);
  if (answer.status !== 200) console.log('answer fail', answer.status, answer.data);
}
const deliberate = await post(`/api/rooms/${room.id}/deliberate`, {dev}, owner);
console.log('deliberate', deliberate.status, deliberate.data.ballotEngine, deliberate.data.ballots?.map(b => [b.name, b.vote, b.source, b.opinion]));
console.log('final state', deliberate.data.state);
mock.close();
