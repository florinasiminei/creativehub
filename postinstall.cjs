const fs = require('fs');
const path = require('path');

try {
  const file = path.join('node_modules', 'eslint-config-next', 'index.js');
  const content = fs.readFileSync(file, 'utf-8');
  const newContent = content.replace(
    'require("@rushstack/eslint-patch/modern-module-resolution");',
    '// @rushstack/eslint-patch is not needed with ESLint v9'
  );
  fs.writeFileSync(file, newContent, 'utf-8');
  console.log('postinstall: Patched eslint-config-next to remove @rushstack/eslint-patch.');
} catch (error) {
  console.error('postinstall: Failed to patch eslint-config-next:', error);
}
