<template>
  <v-row
    class="ma-0"
    ref="canvasDiv"
    align="center"
    justify="center"
    style="height: 100%; width: 100%;"
  >
    <v-col class="pa-0">
      <canvas
        ref="backgroundBoard"
        :width="canvasSize"
        :height="canvasSize"
        :style="`
          border: 1px solid black;
          position: absolute;
          z-index: 5;
          top: ${top};
          left: ${left};
          background-color: black;
        `"
      ></canvas>

      <canvas
        ref="obstacleBoard"
        :width="canvasSize"
        :height="canvasSize"
        :style="`
          border: 1px solid black;
          position: absolute;
          z-index: 10;
          top: ${top};
          left: ${left};
        `"
      ></canvas>

      <canvas
        ref="playerBoard"
        :width="canvasSize"
        :height="canvasSize"
        :style="`
          border: 1px solid black;
          position: absolute;
          z-index: 15;
          top: ${top};
          left: ${left};
        `"
      ></canvas>

      <svg
        ref="startPositionSVG"
        :width="canvasSize + 2"
        :height="canvasSize + 2"
        class="pa-0"
        :style="`
          position: absolute;
          z-index: 20;
          top: ${top};
          left: ${left};
          visibility: ${(startCanvasVisible) ? 'visible;' : 'hidden;'};
        `"
      >
        <circle
          :cx="1+ startPosition.x"
          :cy="1+ startPosition.y"
          :r="canvasSize / 50"
          stroke="black"
          stroke-width="3"
          fill="none"
          :style="`visibility: ${(startCanvasVisible && !gameOver) ? 'visible' : 'hidden'};`"
        />

        <circle
          :cx="1 + startPosition.x"
          :cy="1 + startPosition.y"
          :r="3"
          fill="black"
          :style="`visibility: ${(startCanvasVisible && !gameOver) ? 'visible' : 'hidden'};`"
        />

        <text
          :x="1 + startPosition.x"
          :y="1 + (startPosition.y - (canvasSize / 50) * 2 > 0)
            ? startPosition.y - (canvasSize / 50) * 2
            : startPosition.y + (canvasSize / 50) * 2 + 20"
          text-anchor="middle"
          font-size="20px"
          :style="`visibility: ${(startCanvasVisible && !gameOver) ? 'visible' : 'hidden'};`"
        >
          Start here!
        </text>

        <text
          :x="canvasSize / 2"
          :y="canvasSize / 2"
          text-anchor="middle"
          font-size="100px"
          :style="`visibility: ${(startCanvasVisible && gameOver) ? 'visible;' : 'hidden;'};`"
        >
          Game Over!
        </text>
      </svg>
    </v-col>
  </v-row>
</template>

<script>
import drawUtils from '../utils/draw.utils';
import gameOptions from '../../../../gameOptions';

export default {
  name: 'GameBoard',
  data() {
    return {
      canvasSize: 500,
      canvasScaling: 1,
      grid: null,
      top: '0px',
      left: '0px',
      startPosition: {
        x: 0,
        y: 0,
      },
      startCanvasVisible: true,
      gameOver: false,
    };
  },
  methods: {
    getMousePosition(canvas, event) {
      const rect = canvas.getBoundingClientRect();
      this.startPosition.x = event.clientX - rect.left;
      this.startPosition.y = event.clientY - rect.top;

      const resizeFactor = gameOptions.GRID_SIZE / this.canvasSize;
      this.$store.dispatch('newUserStartPosition', {
        x: this.startPosition.x * resizeFactor,
        y: this.startPosition.y * resizeFactor,
      });
    },
    setCanvasParameter() {
      const {
        width,
        height,
        top,
        left,
      } = this.$refs.canvasDiv.getBoundingClientRect();

      this.canvasSize = (width > height) ? height : width;
      this.startPosition.x = this.canvasSize / 2;
      this.startPosition.y = this.canvasSize / 2;

      const heightDiff = (height - this.canvasSize);
      this.top = `${top + heightDiff / 2}px`;
      this.left = `${left + width / 2 - this.canvasSize / 2}px`;

      drawUtils.setCanvasSize(this.canvasSize);
    },
  },
  created() {
  },
  mounted() {
    this.setCanvasParameter();
    drawUtils.setPlayerContext(this.$refs.playerBoard.getContext('2d', { alpha: false }));
    drawUtils.setBackgroundContext(this.$refs.backgroundBoard.getContext('2d', { alpha: false }));
    drawUtils.setObstacleContext(this.$refs.obstacleBoard.getContext('2d', { alpha: false }));
    drawUtils.startDrawing();

    this.$refs.startPositionSVG.addEventListener('mousedown', (e) => {
      this.getMousePosition(this.$refs.startPositionSVG, e);
    });

    window.addEventListener('resize', this.setCanvasParameter);

    this.$store.watch(
      (state, getters) => getters.userId,
      (newValue, oldValue) => {
        drawUtils.setUserId(newValue);
        this.startCanvasVisible = !newValue;
        this.gameOver = !!oldValue && !newValue;
        if (this.gameOver) {
          setTimeout(() => { this.gameOver = false; }, 3000);
        }
      },
    );

    this.$store.watch(
      (state, getters) => getters.musicOn,
      (newValue) => {
        if (newValue) drawUtils.startMusic();
        else drawUtils.stopMusic();
      },
    );
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

</style>
