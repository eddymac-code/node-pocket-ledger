import { db } from './index.js';

const result = await db.execute('SELECT NOW()');

console.log(result);

process.exit(0);
