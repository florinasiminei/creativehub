const fs = require('fs');
const path = require('path');

try {
  const configFile = path.join('node_modules', 'eslint-config-next', 'index.js');
  const content = fs.readFileSync(configFile, 'utf-8');
  const patchRegex = /require\(['"]@rushstack\/eslint-patch\/modern-module-resolution['"]\);?/g;
  const newContent = content.replace(
    patchRegex,
    '// @rushstack/eslint-patch is not needed with ESLint v9'
  );
  fs.writeFileSync(configFile, newContent, 'utf-8');

  const rushstackFiles = [
    path.join('node_modules', '@rushstack', 'eslint-patch', 'modern-module-resolution.js'),
    path.join('node_modules', '@rushstack', 'eslint-patch', 'lib', 'modern-module-resolution.js'),
  ];
  for (const file of rushstackFiles) {
    if (fs.existsSync(file)) {
      fs.writeFileSync(file, 'module.exports = {};\\n', 'utf-8');
    }
  }

  console.log('postinstall: Patched eslint-config-next and @rushstack/eslint-patch for ESLint v9.');
} catch (error) {
  console.error('postinstall: Failed to patch eslint-config-next:', error);
}
