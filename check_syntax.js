const fs = require('fs');
const html = fs.readFileSync('/workspace/.arc/designs/TEST-REAL-PROJECT-STORY-021-design.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((s, i) => {
  try {
    new Function(s);
    console.log('script', i, 'OK, length', s.length);
  } catch (e) {
    console.log('script', i, 'ERROR:', e.message);
  }
});
