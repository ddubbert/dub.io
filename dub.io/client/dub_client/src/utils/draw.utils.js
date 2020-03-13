const NODE_TYPES = require('../../../../NodeTypes');
const gameOptions = require('../../../../gameOptions');
const config = require('../../../../config');

const PLAYER_SIZE_FACTOR_ON_BOARD = 0.1;

let canvasSize = 1;
let canvasCenter = 0.5;
let playerBoardSize = 1;
let playerCTX = null;
let backgroundCTX = null;
let obstacleCTX = null;
let userId = '';
let offset = {
  x: 0,
  y: 0,
};
let zoomScaleFactor = 1;
let xIndices = [];
let yIndices = [];

let currentGrid = null;

let canvasScaling = 1;
const borderFactor = 0.05;
const nodeRadiusFactor = 1 - borderFactor / 2;
const scratchSize = 512;

const pulseMaxRadius = 0.2;
const pulseStep = pulseMaxRadius / (25 / (60 / gameOptions.FPS));
let currentPulseFactor = 0;

const rotationMaxAngle = 25;
const rotationStep = 1 / (11.5 / (60 / gameOptions.FPS));
let rotationDirection = 1;
let currentRotationFactor = 0;

let sounds = [];
let animationInterval = null;

let backgroundImage = null;

const getBackgroundImage = () => {
  if (backgroundImage) return backgroundImage;

  const scratch = document.createElement('canvas');
  scratch.width = canvasSize;
  scratch.height = canvasSize;

  const scratchCTX = scratch.getContext('2d');

  const lineDist = canvasSize / 100;
  const greaterDist = lineDist * 10;

  const data = `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg"> \
      <defs> \
          <pattern id="smallGrid" width="${lineDist}" height="${lineDist}" patternUnits="userSpaceOnUse"> \
              <path d="M ${lineDist} 0 L 0 0 0 ${lineDist}" fill="none" stroke="black" stroke-width="0.1" /> \
          </pattern> \
          <pattern id="grid" width="${greaterDist}" height="${greaterDist}" patternUnits="userSpaceOnUse"> \
              <rect width="${greaterDist}" height="${greaterDist}" fill="url(#smallGrid)" />
              <path d="M ${greaterDist} 0 L 0 0 0 ${greaterDist}" fill="none" stroke="black" stroke-width="0.5" /> \
          </pattern> \
      </defs> \
      <rect width="${canvasSize}" height="${canvasSize}" fill="url(#grid)" /> \
  </svg>`;

  const DOMURL = window.URL || window.webkitURL || window;

  const img = new Image();
  const svg = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = DOMURL.createObjectURL(svg);

  img.onload = () => {
    scratchCTX.save();
    scratchCTX.lineWidth = 5;
    scratch.strokeStyle = 'rgb(255,0,0)';
    scratchCTX.beginPath();
    scratchCTX.moveTo(0, 0);
    scratchCTX.lineTo(canvasSize, 0);
    scratchCTX.lineTo(canvasSize, canvasSize);
    scratchCTX.lineTo(0, canvasSize);
    scratchCTX.lineTo(0, 0);
    scratchCTX.stroke();
    scratchCTX.restore();
    scratchCTX.drawImage(img, 0, 0);
    DOMURL.revokeObjectURL(url);

    backgroundImage = scratch;
  };
  img.src = url;
  return scratch;
};
const drawBackground = () => {
  if (canvasSize > 1 && backgroundCTX) {
    backgroundCTX.drawImage(getBackgroundImage(), 0, 0, canvasSize, canvasSize);
  }
};

const translateBackground = () => {
  backgroundCTX.restore();
  backgroundCTX.save();
  backgroundCTX.translate(canvasCenter, canvasCenter);
  backgroundCTX.scale(zoomScaleFactor, zoomScaleFactor);
  backgroundCTX.translate(-(canvasCenter - offset.x), -(canvasCenter - offset.y));
};

const createSounds = (srcArr) => {
  srcArr.forEach((src, i) => {
    sounds.push(document.createElement('audio'));
    sounds[i].src = src;
    sounds[i].setAttribute('preload', 'auto');
    sounds[i].setAttribute('controls', 'none');
    sounds[i].style.display = 'none';
    sounds[i].loop = true;
    document.body.appendChild(sounds[i]);
  });
};

const startMusic = () => {
  createSounds([
    `${config.http}${config.host}:8080/backgroundGoa.wav`,
    `${config.http}${config.host}:8080/mainGoa.wav`,
  ]);
  sounds.forEach((sound) => sound.play());

  currentPulseFactor = 1 - pulseStep;
  currentRotationFactor = 1 - rotationStep;

  animationInterval = setInterval(() => {
    currentPulseFactor += pulseStep;
    currentRotationFactor += rotationStep * rotationDirection;

    if (currentPulseFactor > pulseMaxRadius) currentPulseFactor = 0;
    if (currentRotationFactor >= 1) rotationDirection = -1;
    if (currentRotationFactor <= -1) rotationDirection = 1;
  }, 1000 / gameOptions.FPS);
};

const stopMusic = () => {
  sounds.forEach((sound) => {
    sound.pause();
    sound.parentNode.removeChild(sound);
  });
  sounds = [];
  clearInterval(animationInterval);
};

const images = {};

const setCanvasScaling = () => {
  canvasScaling = canvasSize / gameOptions.GRID_SIZE;
};

const setCanvasSize = (size) => {
  canvasSize = size;
  canvasCenter = size / 2;
  playerBoardSize = canvasSize * PLAYER_SIZE_FACTOR_ON_BOARD;
  setCanvasScaling();
  drawBackground();
};

const setUserId = (id) => {
  userId = id;
};

const setPlayerContext = (context) => {
  playerCTX = context;
};

const setBackgroundContext = (context) => {
  backgroundCTX = context;
  drawBackground();
};

const setObstacleContext = (context) => {
  obstacleCTX = context;
};

const setGrid = (grid) => {
  currentGrid = grid;
};

const getCorrectImage = (node) => {
  if (!images[node.sprite]) {
    images[node.sprite] = document.createElement('canvas');
    images[node.sprite].width = scratchSize;
    images[node.sprite].height = scratchSize;

    const img = new Image();
    img.addEventListener('load', function load() {
      const context = images[node.sprite].getContext('2d');
      context.globalCompositeOperation = 'source-over';
      context.drawImage(this, 0, 0, scratchSize, scratchSize);

      context.fillStyle = '#fff';
      context.globalCompositeOperation = 'destination-in';
      context.beginPath();
      context.arc(scratchSize / 2, scratchSize / 2, scratchSize / 2, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }, true);

    img.src = node.sprite;
  }
  return images[node.sprite];
};

const getNodeParameter = (node) => {
  const xOnCanvas = node.position.x * canvasScaling;
  const yOnCanvas = node.position.y * canvasScaling;
  const radiusOnCanvas = node.radius * canvasScaling;
  const pulse = (node.type === NODE_TYPES.PLAYER) ? 1 + currentPulseFactor : 1;

  const x = (((xOnCanvas) + offset.x) - canvasCenter) * zoomScaleFactor + canvasCenter;
  const y = (((yOnCanvas) + offset.y) - canvasCenter) * zoomScaleFactor + canvasCenter;
  const radius = radiusOnCanvas * zoomScaleFactor * pulse;
  const rotation = (node.type === NODE_TYPES.FOOD) ? currentRotationFactor * rotationMaxAngle : 0;

  return {
    x,
    y,
    radius,
    rotation,
  };
};

const drawImageCircle = (node, context) => {
  const ctx = context;
  const {
    x,
    y,
    radius,
    rotation,
  } = getNodeParameter(node);

  ctx.save();
  ctx.lineWidth = radius * borderFactor;
  ctx.strokeStyle = 'rgb(0,0,0)';
  ctx.fillStyle = node.color;
  ctx.translate(x, y);
  ctx.rotate(rotation / 100);
  ctx.beginPath();
  ctx.arc(
    0,
    0,
    radius * nodeRadiusFactor,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  const image = getCorrectImage(node);

  ctx.drawImage(
    image,
    0 - radius,
    0 - radius,
    radius * 2,
    radius * 2,
  );
  ctx.stroke();
  ctx.restore();
};

const drawColorCircle = (node, context) => {
  const ctx = context;
  const {
    x,
    y,
    radius,
    rotation,
  } = getNodeParameter(node);

  ctx.save();
  ctx.lineWidth = radius * borderFactor;
  ctx.strokeStyle = 'rgb(0,0,0)';
  ctx.fillStyle = node.color;
  ctx.translate(x, y);
  ctx.rotate(rotation / 100);
  ctx.beginPath();
  ctx.arc(
    0,
    0,
    radius * nodeRadiusFactor,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const drawMasterGrid = () => {
  drawBackground();

  currentGrid.cols.forEach((col) => {
    col.rows.forEach((row) => {
      row.nodes.forEach((node) => {
        let ctx = playerCTX;
        if (node.type === NODE_TYPES.OBSTACLE) ctx = obstacleCTX;

        if (node.sprite) drawImageCircle(node, ctx);
        else drawColorCircle(node, ctx);
      });
    });
  });

  translateBackground();
};

const drawPlayerGrid = () => {
  drawBackground();

  xIndices.forEach((xI) => {
    yIndices.forEach((yI) => {
      currentGrid.cols[xI].rows[yI].nodes.forEach((node) => {
        let ctx = playerCTX;
        if (node.type === NODE_TYPES.OBSTACLE) ctx = obstacleCTX;

        if (node.sprite) drawImageCircle(node, ctx);
        else drawColorCircle(node, ctx);
      });
    });
  });

  translateBackground();
};

const prepareRendering = (grid) => {
  backgroundCTX.clearRect(0, 0, canvasSize, canvasSize);
  playerCTX.clearRect(0, 0, canvasSize, canvasSize);
  obstacleCTX.clearRect(0, 0, canvasSize, canvasSize);

  let user = null;
  if (userId) {
    const u = grid.playerNodes.filter((p) => p.id === userId);
    user = u.length > 0 ? u[0] : null;
  }

  if (user) {
    offset = {
      x: canvasCenter - user.position.x * canvasScaling,
      y: canvasCenter - user.position.y * canvasScaling,
    };

    zoomScaleFactor = playerBoardSize / (user.radius * canvasScaling);

    const outerRadius = canvasCenter;
    const amountCells = Math.ceil(
      outerRadius / (grid.cellSize * canvasScaling),
    );

    xIndices = [...Array(amountCells).keys()].reduce((acc, index) => {
      if (index === 0) return acc;
      const indices = [];
      if (user.gridIndices.x - index >= 0) indices.push(user.gridIndices.x - index);
      if (user.gridIndices.x + index <= grid.cols.length - 1) {
        indices.push(user.gridIndices.x + index);
      }
      return [...acc, ...indices];
    }, [user.gridIndices.x]);

    yIndices = [...Array(amountCells).keys()].reduce((acc, index) => {
      if (index === 0) return acc;
      const indices = [];
      if (user.gridIndices.y - index >= 0) indices.push(user.gridIndices.y - index);
      if (user.gridIndices.y + index <= grid.cols[0].rows.length - 1) {
        indices.push(user.gridIndices.y + index);
      }
      return [...acc, ...indices];
    }, [user.gridIndices.y]);
  } else {
    offset = {
      x: 0,
      y: 0,
    };

    zoomScaleFactor = 1;
    xIndices = [...Array(grid.cols.length).keys()];
    yIndices = [...Array(grid.cols[0].rows.length).keys()];
  }
};

const drawGrid = (grid) => {
  prepareRendering(grid);
  if (userId) drawPlayerGrid();
  else drawMasterGrid();
};

const drawGameBoard = () => {
  if (currentGrid) drawGrid({ ...currentGrid });
};

setInterval(() => {
  drawGameBoard();
}, 1000 / gameOptions.FPS);

module.exports = {
  setGrid,
  startMusic,
  stopMusic,
  setCanvasSize,
  setPlayerContext,
  setBackgroundContext,
  setObstacleContext,
  setUserId,
};
