const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');

if (!fs.existsSync(distPath)) {
  process.exit(1);
}

const publicPath = path.join(projectRoot, 'public');
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}

function copyFiles(sourceDir, targetDir) {
  const sourcePath = path.join(projectRoot, sourceDir);
  const targetPath = path.join(projectRoot, targetDir);

  if (!fs.existsSync(sourcePath)) {
    return;
  }

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  const files = fs.readdirSync(sourcePath);
  files.forEach((file) => {
    const sourceFile = path.join(sourcePath, file);
    const targetFile = path.join(targetPath, file);

    if (fs.statSync(sourceFile).isDirectory()) {
      copyFiles(path.join(sourceDir, file), path.join(targetDir, file));
    } else {
      fs.copyFileSync(sourceFile, targetFile);
    }
  });
}

copyFiles('dist/_expo/static', 'public/static');
copyFiles('dist', 'public');

const indexPath = path.join(distPath, 'index.html');
const publicIndexPath = path.join(publicPath, 'index.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, publicIndexPath);
}

const faviconPath = path.join(distPath, 'favicon.ico');
const publicFaviconPath = path.join(publicPath, 'favicon.ico');
if (fs.existsSync(faviconPath)) {
  fs.copyFileSync(faviconPath, publicFaviconPath);
}

// Check if we should start server (only in interactive mode)
const shouldServe =
  process.env.NODE_ENV !== 'production' && process.env.CI !== 'true';

if (shouldServe) {
  const serve = spawn('npx', ['serve', 'public', '-p', '8081'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });

  serve.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  serve.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
  });

  process.on('SIGINT', () => {
    console.log('\nStopping server...');
    serve.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nStopping server...');
    serve.kill('SIGTERM');
    process.exit(0);
  });

  console.log('Server started at http://localhost:8081');
} else {
  console.log('Build completed successfully!');
  console.log('Files are ready in public/ directory');
}
