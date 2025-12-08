if (process.env.npm_execpath && process.env.npm_execpath.includes('yarn')) {
  console.error('❌ Yarn is not allowed in this project. Please use npm.');
  process.exit(1);
}
