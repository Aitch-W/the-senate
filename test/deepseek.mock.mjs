import http from 'node:http';
import {testKey, generateQuestions, generateBallots} from '../deepseek.mjs';

const room = {
  pack: 'roman', packName: '古罗马元老院包', size: 3,
  seats: ['solon', 'plato', 'caesar'],
  product: '降噪耳机', price: 1799, cash: 6000, reason: '每天通勤使用。',
  answers: [
    {name: '梭伦', question: '这笔钱会影响生活吗？', answer: '不会，预算充足。'},
    {name: '柏拉图', question: '你想要的是它本身吗？', answer: '我需要安静。'},
    {name: '凯撒', question: '什么时候第一次用？', answer: '明天通勤。'},
  ],
};
let requests = 0;
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  requests++;
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/models') return res.end(JSON.stringify({data: [{id: 'deepseek-chat'}, {id: 'deepseek-reasoner'}]}));
  if (req.url === '/chat/completions') {
    const prompt = String(body);
    if (prompt.includes('完整质询记录')) {
      return res.end(JSON.stringify({choices: [{message: {content: JSON.stringify({ballots: room.seats.map((id, i) => ({roleId: id, vote: i === 0 ? '不买' : '暂缓', opinion: `测试观点 ${i}`}))})}}]}));
    }
    return res.end(JSON.stringify({choices: [{message: {content: JSON.stringify({questions: room.seats.map((id, i) => ({roleId: id, question: `测试问题 ${i}？`}))})}}]}));
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
console.log('test', await testKey({key: 'sk-mock-key', model: 'deepseek-chat', base}));
console.log('questions', await generateQuestions({key: 'sk-mock-key', model: 'deepseek-chat', base, room}));
console.log('ballots', await generateBallots({key: 'sk-mock-key', model: 'deepseek-chat', base, room}));
console.log('requests', requests);
server.close();
