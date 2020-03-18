/* eslint-disable no-param-reassign */
const NODE_TYPES = require('../../../../NodeTypes');
const gameOptions = require('../../../../gameOptions');
const config = require('../../../../config');
const graphqlClient = require('./graphql.utils').default;
const subscriptions = require('./subscriptions');

let count = 0;
let renderCount = 0;
let currentGrid = {};
let start = new Date().getTime();

const client = graphqlClient(`${config.http}${config.host}:3000/graphql`, `${config.ws}${config.host}:3000/subscriptions`);

const PLAYER_RADIUS_SIZE_FACTOR_ON_BOARD = 0.1;

let canvasSize = 1;
let canvasCenter = 0.5;
let playerBoardSize = 1;
let playerCTX = null;
let backgroundCTX = null;
let obstacleCTX = null;
let userId = '';
const offset = {
  x: 0,
  y: 0,
};
let zoomScaleFactor = 1;
let xIndices = [];
let yIndices = [];

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
const BACKGROUND_SCALE = 4;
let backgroundScratchSize = 1;

let currentUserRadius = 0;
const currentUserPosition = {
  x: gameOptions.GRID_SIZE / 2,
  y: gameOptions.GRID_SIZE / 2,
};
let currentCellSize = 0;
let currentGridIndices = {
  x: 0,
  y: 0,
};
let amountCells = 0;

const createBackgroundImage = () => {
  const scratch = document.createElement('canvas');
  scratch.width = backgroundScratchSize;
  scratch.height = backgroundScratchSize;

  const scratchCTX = scratch.getContext('2d');

  const lineThicknes = backgroundScratchSize / 1000;
  const lineDist = lineThicknes * 10;
  const greaterDist = lineDist * 10;

  const data = `<svg width="${backgroundScratchSize}" height="${backgroundScratchSize}" style="background-color: white;" xmlns="http://www.w3.org/2000/svg"> \
      <defs> \
          <pattern id="smallGrid" width="${lineDist}" height="${lineDist}" patternUnits="userSpaceOnUse"> \
              <path d="M ${lineDist} 0 L 0 0 0 ${lineDist}" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="${lineThicknes / 5}" /> \
          </pattern> \
          <pattern id="grid" width="${greaterDist}" height="${greaterDist}" patternUnits="userSpaceOnUse"> \
              <rect width="${greaterDist}" height="${greaterDist}" fill="url(#smallGrid)" />
              <path d="M ${greaterDist} 0 L 0 0 0 ${greaterDist}" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="${lineThicknes / 2}" /> \
          </pattern> \
      </defs> \
      <rect width="${backgroundScratchSize}" height="${backgroundScratchSize}" fill="url(#grid)" /> \
  </svg>`;

  const DOMURL = window.URL || window.webkitURL || window;

  const img = new Image();
  const svg = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = DOMURL.createObjectURL(svg);

  img.onload = () => {
    scratchCTX.save();
    scratchCTX.drawImage(img, 0, 0, backgroundScratchSize, backgroundScratchSize);
    scratchCTX.restore();
    DOMURL.revokeObjectURL(url);
  };

  img.src = url;
  backgroundImage = scratch;
};

const drawBackground = () => {
  if (canvasSize > 1 && backgroundCTX && backgroundImage) {
    backgroundCTX.clearRect(0, 0, canvasSize, canvasSize);

    const backgroundCenter = backgroundScratchSize / 2;
    const dist = backgroundCenter / zoomScaleFactor;
    const oX = offset.x * BACKGROUND_SCALE;
    const oY = offset.y * BACKGROUND_SCALE;

    const startX = backgroundCenter - oX - dist;
    const startY = backgroundCenter - oY - dist;

    backgroundCTX.drawImage(
      backgroundImage,
      startX,
      startY,
      dist * 2,
      dist * 2,
      0,
      0,
      canvasSize,
      canvasSize,
    );
  }
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

let drawTimeout = null;
const setCanvasSize = (size) => {
  canvasSize = size;
  canvasCenter = size / 2;
  backgroundScratchSize = canvasSize * BACKGROUND_SCALE;
  playerBoardSize = canvasSize * PLAYER_RADIUS_SIZE_FACTOR_ON_BOARD;
  setCanvasScaling();

  clearTimeout(drawTimeout);
  drawTimeout = setTimeout(() => {
    createBackgroundImage();
  }, 50);

  drawBackground();
};

const setUserId = (id) => {
  userId = id;
  start = new Date().getTime();
  count = 0;
  renderCount = 0;
};

const setPlayerContext = (context) => {
  playerCTX = context;
  playerCTX.strokeStyle = 'rgb(0,0,0)';
};

const setBackgroundContext = (context) => {
  backgroundCTX = context;
  backgroundCTX.strokeStyle = 'rgb(0,0,0)';
  drawBackground();
};

const setObstacleContext = (context) => {
  obstacleCTX = context;
  obstacleCTX.strokeStyle = 'rgb(0,0,0)';
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
      context.arc(
        scratchSize / 2,
        scratchSize / 2,
        scratchSize / 2,
        0,
        2 * Math.PI,
        true,
      );
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
  const rotation = (node.type === NODE_TYPES.ITEM)
    ? currentRotationFactor * rotationMaxAngle
    : 0;

  return {
    x,
    y,
    radius,
    rotation,
  };
};

const drawImageCircle = (node, ctx) => {
  const {
    x,
    y,
    radius,
    rotation,
  } = getNodeParameter(node);

  ctx.save();
  ctx.lineWidth = radius * borderFactor;
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
  if (node.type !== NODE_TYPES.OBSTACLE) ctx.stroke();
  ctx.restore();
};

const drawColorCircle = (node, ctx) => {
  const {
    x,
    y,
    radius,
    rotation,
  } = getNodeParameter(node);

  ctx.save();
  ctx.lineWidth = radius * borderFactor;
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

const drawMasterGrid = (grid) => {
  grid.cols.forEach((col) => {
    col.rows.forEach((row) => {
      row.nodes.forEach((node) => {
        let ctx = playerCTX;
        if (node.type === NODE_TYPES.OBSTACLE) ctx = obstacleCTX;

        if (node.sprite) drawImageCircle(node, ctx);
        else drawColorCircle(node, ctx);
      });
    });
  });
};

const drawPlayerGrid = (grid) => {
  xIndices.forEach((xI) => {
    yIndices.forEach((yI) => {
      grid.cols[xI].rows[yI].nodes.forEach((node) => {
        let ctx = playerCTX;
        if (node.type === NODE_TYPES.OBSTACLE) ctx = obstacleCTX;

        if (node.sprite) drawImageCircle(node, ctx);
        else drawColorCircle(node, ctx);
      });
    });
  });
};

const prepareRendering = (grid) => {
  let user = null;
  if (userId) {
    const u = grid.playerNodes.filter((p) => p.id === userId);
    user = u.length > 0 ? u[0] : null;
  }

  if (user) {
    currentUserPosition.x = user.position.x;
    currentUserPosition.y = user.position.y;
    offset.x = canvasCenter - user.position.x * canvasScaling;
    offset.y = canvasCenter - user.position.y * canvasScaling;

    if (currentUserRadius !== user.radius
      || grid.cellSize !== currentCellSize
      || currentGridIndices.x !== user.gridIndices.x
      || currentGridIndices.y !== user.gridIndices.y) {
      currentUserRadius = user.radius;
      currentCellSize = grid.cellSize;
      currentGridIndices = user.gridIndices;

      zoomScaleFactor = playerBoardSize / (user.radius * canvasScaling);

      amountCells = Math.ceil(
        (canvasSize / 2 / zoomScaleFactor / canvasScaling) / grid.cellSize,
      ) + 1;

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
    }
  } else {
    offset.x = 0;
    offset.y = 0;

    zoomScaleFactor = 1;
    xIndices = [...Array(grid.cols.length).keys()];
    yIndices = [...Array(grid.cols[0].rows.length).keys()];
  }
};

const drawGrid = (grid) => {
  playerCTX.clearRect(0, 0, canvasSize, canvasSize);
  obstacleCTX.clearRect(0, 0, canvasSize, canvasSize);

  if (userId) drawPlayerGrid(grid);
  else drawMasterGrid(grid);
};

const draw = () => {
  try {
    prepareRendering(currentGrid);
    drawBackground();
    drawGrid(currentGrid);
    renderCount += 1;
  } catch (e) {
    console.error(e);
  }
  window.requestAnimationFrame(draw);
};

(async () => {
  await client.subscribe({
    query: subscriptions.GRID_SUBSCRIPTION,
  }).subscribe({
    next({ data }) {
      count += 1;
      currentGrid = data.renderUpdates;
    },
    error(err) { console.error('err', err); },
  });

  // setInterval(() => {
  //   draw();
  // }, 1000 / gameOptions.FPS);

  setInterval(() => {
    const diff = (new Date().getTime() - start);
    console.log('Sub: ', count / (diff / 1000));
    console.log('Render: ', renderCount / (diff / 1000));
    start = new Date().getTime();
    count = 0;
    renderCount = 0;
  }, 5000);
})();

const startDrawing = () => {
  window.requestAnimationFrame(draw);
};

module.exports = {
  startMusic,
  stopMusic,
  setCanvasSize,
  setPlayerContext,
  setBackgroundContext,
  setObstacleContext,
  setUserId,
  startDrawing,
};
